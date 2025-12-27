// js/pedidos.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ============================================================
   DOM
============================================================ */

// Cliente
const inputClienteNombre   = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed      = document.getElementById("clienteRed");
const datalistClientes     = document.getElementById("clientesDatalist");

// Productos / items
const selProducto   = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems    = document.getElementById("pedidoItems");
const spanTotal     = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// Datos generales
const inputFecha   = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota    = document.getElementById("pedidoNota");
const inputPagado  = document.getElementById("pedidoPagado");

// Lista pedidos
const listaPedidosBody = document.getElementById("listaPedidos");

// Filtros
const filtroEstado   = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

// Modal ver
const modal        = document.getElementById("pedidoModal");
const modalTitulo  = document.getElementById("modalTitulo");
const modalCliente = document.getElementById("modalCliente");
const modalEstado  = document.getElementById("modalEstado");
const modalFecha   = document.getElementById("modalFecha");
const modalItems   = document.getElementById("modalItems");
const modalNota    = document.getElementById("modalNota");
const modalTotal   = document.getElementById("modalTotal");
const modalCerrar  = document.getElementById("modalCerrar");

// Modal editar
const modalEdit   = document.getElementById("editarPedidoModal");
const editEstado  = document.getElementById("editEstado");
const editNota    = document.getElementById("editNota");
const editFecha   = document.getElementById("editFecha");
const editPagado  = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar  = document.getElementById("editCerrar");

/* ============================================================
   ESTADO
============================================================ */
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoModalActual = null;

/* ============================================================
   HELPERS
============================================================ */
function esEstadoFinal(estado) {
  return estado === "LISTO" || estado === "ENTREGADO";
}

function debeDescontarStock(p) {
  return !p.stockDescontado && (p.pagado || esEstadoFinal(p.estado));
}

/* ============================================================
   COSTO REAL DESDE RECETA
============================================================ */
async function calcularCostoUnitarioProducto(productoId) {
  const snap = await getDoc(doc(db, "recetas", productoId));
  if (!snap.exists()) return 0;

  const receta = snap.data();
  if (!receta.items || !receta.items.length) return 0;

  let costo = 0;
  receta.items.forEach(i => {
    costo += Number(i.subtotal || 0);
  });

  return costo;
}

/* ============================================================
   CARGAR CLIENTES
============================================================ */
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = {
      id: d.id,
      apodo: c.apodo || "",
      telefono: c.whatsapp || c.telefono || "",
      red: c.instagram || c.red || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const c = clientesPorNombre[inputClienteNombre.value.trim()];
  if (!c) return;
  if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
  if (!inputClienteRed.value)      inputClienteRed.value      = c.red;
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* ============================================================
   CARGAR PRODUCTOS
============================================================ */
async function cargarProductos() {
  productos = [];
  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => {
    const p = d.data();
    productos.push({ id: d.id, ...p });
    selProducto.innerHTML += `
      <option value="${d.id}">
        ${p.nombre} — $${Number(p.precio || 0)}
      </option>
    `;
  });
}

/* ============================================================
   RENDER ITEMS PEDIDO
============================================================ */
function renderPedido() {
  tbodyItems.innerHTML = "";
  let total = 0;

  itemsPedido.forEach((i, idx) => {
    total += i.subtotal;

    tbodyItems.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>$${i.precio}</td>
        <td>${i.cantidad}</td>
        <td>$${i.subtotal}</td>
        <td>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>
    `;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = i => {
  itemsPedido.splice(i, 1);
  renderPedido();
};

/* ============================================================
   AGREGAR ITEM
============================================================ */
btnAgregar.addEventListener("click", async e => {
  e.preventDefault();

  const id   = selProducto.value;
  const cant = Number(inputCantidad.value);

  if (!id) return alert("Elegí un producto.");
  if (!cant || cant <= 0) return alert("Cantidad inválida.");

  const prod = productos.find(p => p.id === id);
  if (!prod) return alert("Producto no encontrado.");

  const precio = Number(prod.precio || 0);
  const costoUnitario = await calcularCostoUnitarioProducto(id);
  const costoTotal = costoUnitario * cant;

  itemsPedido.push({
    productoId: id,
    nombre: prod.nombre,
    precio,
    cantidad: cant,
    subtotal: precio * cant,
    costoUnitario,
    costoTotal,
    ganancia: precio * cant - costoTotal
  });

  renderPedido();
});

/* ============================================================
   LIMPIAR FORM
============================================================ */
function limpiarFormulario() {
  itemsPedido = [];
  renderPedido();
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputNota.value = "";
  inputCantidad.value = 1;
  selProducto.value = "";
  inputFecha.value = "";
  inputPagado.checked = false;
  selectEstado.value = "PENDIENTE";
}

btnLimpiar.onclick = e => {
  e.preventDefault();
  limpiarFormulario();
};

/* ============================================================
   GUARDAR PEDIDO
============================================================ */
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  const nombre = inputClienteNombre.value.trim();
  if (!nombre) return alert("Nombre del cliente requerido.");
  if (!itemsPedido.length) return alert("Agregá productos.");

  const cliente = clientesPorNombre[nombre] || {};
  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);

  const pedido = {
    clienteId: cliente.id || null,
    clienteNombre: nombre,
    clienteApodo: cliente.apodo || "",
    clienteTelefono: inputClienteTelefono.value || cliente.telefono || "",
    clienteRed: inputClienteRed.value || cliente.red || "",
    fecha: inputFecha.value
      ? new Date(inputFecha.value + "T00:00:00").toISOString()
      : new Date().toISOString(),
    fechaServer: serverTimestamp(),
    estado: selectEstado.value,
    nota: inputNota.value.trim(),
    pagado: inputPagado.checked,
    total,
    stockDescontado: false,
    items: itemsPedido
  };

  await addDoc(collection(db, "pedidos"), pedido);
  alert("Pedido guardado ✔");
  limpiarFormulario();
  cargarPedidos();
});

/* ============================================================
   LISTAR PEDIDOS
============================================================ */
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  renderLista();
}

function renderLista() {
  listaPedidosBody.innerHTML = "";

  pedidosCache.forEach(p => {
    listaPedidosBody.innerHTML += `
      <tr>
        <td>${p.clienteNombre}</td>
        <td>${new Date(p.fecha).toLocaleDateString()}</td>
        <td>${p.estado}</td>
        <td>${p.pagado ? "✔" : "✖"}</td>
        <td>$${p.total}</td>
        <td>
          <button class="btn-pp" onclick="verPedido('${p.id}')">👁️</button>
          <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });
}

/* ============================================================
   VER PEDIDO
============================================================ */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Contacto: ${p.clienteTelefono || "—"}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalItems.innerHTML = p.items.map(i =>
    `${i.cantidad}× ${i.nombre} — $${i.subtotal}`
  ).join("<br>");
  modalNota.textContent = p.nota || "";
  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

/* ============================================================
   BORRAR PEDIDO
============================================================ */
window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

/* ============================================================
   INIT
============================================================ */
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
