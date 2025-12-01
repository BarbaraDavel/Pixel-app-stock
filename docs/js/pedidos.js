import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =========================
// DOM
// =========================

// Cliente
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed = document.getElementById("clienteRed");
const datalistClientes = document.getElementById("clientesDatalist");

// Productos e items
const selProducto = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems = document.getElementById("pedidoItems");
const spanTotal = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// Datos del pedido
const inputFecha = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");

// Lista de pedidos
const listaPedidosBody = document.getElementById("listaPedidos");

// Modal
const modal = document.getElementById("pedidoModal");
const modalTitulo = document.getElementById("modalTitulo");
const modalCliente = document.getElementById("modalCliente");
const modalEstado = document.getElementById("modalEstado");
const modalFecha = document.getElementById("modalFecha");
const modalItems = document.getElementById("modalItems");
const modalNota = document.getElementById("modalNota");
const modalTotal = document.getElementById("modalTotal");
const modalCerrar = document.getElementById("modalCerrar");

// =========================
// ESTADO
// =========================
let clientesPorNombre = {}; // nombre -> { id, telefono, red, nota }
let productos = [];         // lista de productos
let itemsPedido = [];       // items del pedido actual
let pedidosCache = [];      // pedidos cargados para la lista

// =========================
// CARGAR CLIENTES PARA AUTOCOMPLETAR
// =========================
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = {
      id: d.id,
      telefono: c.telefono || "",
      red: c.red || "",
      nota: c.nota || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

// Cuando el nombre del cliente coincide con uno guardado, autocompletamos datos
function syncClienteDesdeNombre() {
  const nombre = inputClienteNombre.value.trim();
  const c = clientesPorNombre[nombre];
  if (c) {
    if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
    if (!inputClienteRed.value) inputClienteRed.value = c.red;
  }
}
inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

// =========================
// CARGAR PRODUCTOS
// =========================
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando productos...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => {
    productos.push({ id: d.id, ...d.data() });
  });

  if (!productos.length) {
    selProducto.innerHTML = `<option value="">No hay productos cargados</option>`;
    return;
  }

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    const precioUnit = Number(p.precio || 0);
    selProducto.innerHTML += `
      <option value="${p.id}">${p.nombre} — $${precioUnit}</option>
    `;
  });
}

// =========================
// RENDER ITEMS DEL PEDIDO
// =========================
function renderPedido() {
  tbodyItems.innerHTML = "";
  let total = 0;

  itemsPedido.forEach((item, idx) => {
    total += item.subtotal;
    tbodyItems.innerHTML += `
      <tr>
        <td>${item.nombre}</td>
        <td>$${item.precio}</td>
        <td>${item.cantidad}</td>
        <td>$${item.subtotal}</td>
        <td>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>
    `;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = function (idx) {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

// =========================
// AGREGAR ÍTEM
// =========================
btnAgregar.addEventListener("click", e => {
  e.preventDefault();

  const prodId = selProducto.value;
  const cant = Number(inputCantidad.value || "0");

  if (!prodId) {
    alert("Elegí un producto primero.");
    return;
  }
  if (!cant || cant <= 0) {
    alert("La cantidad debe ser al menos 1.");
    return;
  }

  const prod = productos.find(p => p.id === prodId);
  if (!prod) {
    alert("No se encontró el producto seleccionado.");
    return;
  }

  const precioUnit = Number(prod.precio || 0);
  const subtotal = precioUnit * cant;

  itemsPedido.push({
    productoId: prod.id,
    nombre: prod.nombre,
    precio: precioUnit,
    cantidad: cant,
    subtotal
  });

  renderPedido();
});

// =========================
// LIMPIAR PEDIDO
// =========================
btnLimpiar.addEventListener("click", e => {
  e.preventDefault();
  itemsPedido = [];
  renderPedido();
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputNota.value = "";
  inputCantidad.value = 1;
  selProducto.value = "";
  inputFecha.value = "";
  selectEstado.value = "PENDIENTE";
});

// =========================
// GUARDAR PEDIDO EN FIRESTORE
// =========================
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  const nombre = inputClienteNombre.value.trim();
  const telefono = inputClienteTelefono.value.trim();
  const red = inputClienteRed.value.trim();
  const nota = inputNota.value.trim();
  const estado = selectEstado.value;
  const fechaInput = inputFecha.value;

  if (!nombre) {
    alert("Poné el nombre del cliente.");
    return;
  }
  if (!itemsPedido.length) {
    alert("Agregá al menos un producto al pedido.");
    return;
  }

  const total = itemsPedido.reduce((acc, i) => acc + i.subtotal, 0);

  const clienteInfo = clientesPorNombre[nombre] || null;

  const fechaIso = fechaInput
    ? new Date(fechaInput + "T00:00:00").toISOString()
    : new Date().toISOString();

  const pedidoDoc = {
    clienteId: clienteInfo ? clienteInfo.id : null,
    clienteNombre: nombre,
    clienteTelefono: telefono || (clienteInfo ? clienteInfo.telefono : ""),
    clienteRed: red || (clienteInfo ? clienteInfo.red : ""),
    fecha: fechaIso,
    fechaServer: serverTimestamp(),
    estado,
    nota,
    total,
    items: itemsPedido
  };

  try {
    await addDoc(collection(db, "pedidos"), pedidoDoc);
    alert("✅ Pedido guardado.");

    // limpiar formulario actual
    itemsPedido = [];
    renderPedido();
    inputClienteNombre.value = "";
    inputClienteTelefono.value = "";
    inputClienteRed.value = "";
    inputNota.value = "";
    inputCantidad.value = 1;
    selProducto.value = "";
    inputFecha.value = "";
    selectEstado.value = "PENDIENTE";

    // recargar lista
    cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al guardar el pedido. Revisá la consola.");
  }
});

// =========================
// CARGAR LISTA DE PEDIDOS
// =========================
async function cargarPedidos() {
  listaPedidosBody.innerHTML = "";
  pedidosCache = [];

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => {
    pedidosCache.push({ id: d.id, ...d.data() });
  });

  // ordenar por fecha (más nuevo primero)
  pedidosCache.sort((a, b) => {
    const da = a.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da;
  });

  pedidosCache.forEach(p => {
    const fechaTexto = p.fecha ? new Date(p.fecha).toLocaleDateString() : "—";
    listaPedidosBody.innerHTML += `
      <tr>
        <td>${p.clienteNombre}</td>
        <td>${fechaTexto}</td>
        <td>${p.estado || "—"}</td>
        <td>$${p.total || 0}</td>
        <td>
          <button class="btn-pp btn-edit-pp" onclick="verPedido('${p.id}')">👁️ Ver</button>
        </td>
      </tr>
    `;
  });
}

// =========================
// MODAL VER PEDIDO (para captura)
// =========================
window.verPedido = function (id) {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre} — Tel: ${p.clienteTelefono || "—"} — Contacto: ${p.clienteRed || "—"}`;
  modalEstado.textContent = `Estado: ${p.estado || "—"}`;
  modalFecha.textContent = p.fecha
    ? `Fecha: ${new Date(p.fecha).toLocaleString()}`
    : "Fecha: —";

  modalItems.innerHTML = p.items && p.items.length
    ? p.items
        .map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
        .join("<br>")
    : "<em>Sin items</em>";

  modalNota.textContent = p.nota ? `Nota: ${p.nota}` : "";
  modalTotal.textContent = `Total: $${p.total || 0}`;

  modal.classList.remove("hidden");
};

modalCerrar.addEventListener("click", () => {
  modal.classList.add("hidden");
});

modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =========================
// INICIO
// =========================
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
