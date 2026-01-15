// js/pedidos.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =====================================================
   DOM
===================================================== */
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

// Datos pedido
const inputFecha   = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota    = document.getElementById("pedidoNota");
const inputPagado  = document.getElementById("pedidoPagado");

// Lista
const listaPedidosBody = document.getElementById("listaPedidos");
const filtroEstado   = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

/* =====================================================
   ESTADO
===================================================== */
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;

/* =====================================================
   HELPERS
===================================================== */
function esEstadoFinal(e) {
  return e === "LISTO" || e === "ENTREGADO";
}

function debeDescontarStock(p) {
  return !p.stockDescontado && (p.pagado || esEstadoFinal(p.estado));
}

function prioridadPedido(p) {
  if (p.estado !== "ENTREGADO" && !p.pagado) return 1;
  if (p.estado !== "ENTREGADO" && p.pagado)  return 2;
  if (p.estado === "ENTREGADO" && !p.pagado) return 3;
  return 4;
}

/* =====================================================
   CLIENTES
===================================================== */
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = {
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
  if (!inputClienteRed.value) inputClienteRed.value = c.red;
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* =====================================================
   PRODUCTOS
===================================================== */
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  productos.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `
      <option value="${p.id}">
        ${p.nombre} — $${Number(p.precio || 0)}
      </option>
    `;
  });
}

/* =====================================================
   ITEMS DEL PEDIDO
===================================================== */
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
      </tr>`;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

btnAgregar.addEventListener("click", e => {
  e.preventDefault();

  const prod = productos.find(p => p.id === selProducto.value);
  const cant = Number(inputCantidad.value);

  if (!prod || cant <= 0) return alert("Producto o cantidad inválida");

  itemsPedido.push({
    productoId: prod.id,
    nombre: prod.nombre,
    precio: Number(prod.precio || 0),
    cantidad: cant,
    subtotal: cant * Number(prod.precio || 0)
  });

  renderPedido();
});

/* =====================================================
   FORM
===================================================== */
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

  pedidoEditandoId = null;
  btnGuardar.textContent = "Guardar pedido";
}

btnLimpiar.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   GUARDAR / EDITAR PEDIDO
===================================================== */
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length)
    return alert("Faltan datos");

  const nombreCliente = inputClienteNombre.value.trim();

  if (!clientesPorNombre[nombreCliente]) {
    await addDoc(collection(db, "clientes"), {
      nombre: nombreCliente,
      telefono: inputClienteTelefono.value || "",
      instagram: inputClienteRed.value || "",
      createdAt: serverTimestamp()
    });
  }

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const pedidoData = {
    clienteNombre: nombreCliente,
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: fechaIso,
    estado: selectEstado.value,
    nota: inputNota.value,
    pagado: inputPagado.checked,
    total,
    items: itemsPedido
  };

  if (pedidoEditandoId) {
    await updateDoc(doc(db, "pedidos", pedidoEditandoId), pedidoData);
    alert("Pedido actualizado ✔");
  } else {
    pedidoData.fechaServer = serverTimestamp();
    pedidoData.stockDescontado = false;

    const ref = await addDoc(collection(db, "pedidos"), pedidoData);

    if (debeDescontarStock({ ...pedidoData, id: ref.id })) {
      await updateDoc(doc(db, "pedidos", ref.id), { stockDescontado: true });
    }

    alert("Pedido guardado ✔");
  }

  limpiarFormulario();
  cargarClientes();
  cargarPedidos();
});

/* =====================================================
   LISTA PEDIDOS
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => {
    const pa = prioridadPedido(a);
    const pb = prioridadPedido(b);
    if (pa !== pb) return pa - pb;
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  renderLista();
}

function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p => (!est || p.estado === est) &&
      (!txt || p.clienteNombre.toLowerCase().includes(txt)))
    .forEach(p => {
      listaPedidosBody.innerHTML += `
        <tr>
          <td>${p.clienteNombre}</td>
          <td>${new Date(p.fecha).toLocaleDateString()}</td>
          <td>${p.estado}</td>
          <td>${p.pagado ? "✔" : "✖"}</td>
          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>`;
    });
}

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

/* =====================================================
   EDITAR / BORRAR
===================================================== */
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  inputClienteNombre.value = p.clienteNombre;
  inputClienteTelefono.value = p.clienteTelefono || "";
  inputClienteRed.value = p.clienteRed || "";
  inputFecha.value = p.fecha.slice(0, 10);
  selectEstado.value = p.estado;
  inputNota.value = p.nota || "";
  inputPagado.checked = p.pagado;

  itemsPedido = p.items.map(i => ({ ...i }));
  renderPedido();

  btnGuardar.textContent = "Guardar cambios";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

/* =====================================================
   INIT
===================================================== */
(async function init(){
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
