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

/* ===================== DOM ===================== */
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed = document.getElementById("clienteRed");
const datalistClientes = document.getElementById("clientesDatalist");

const selProducto = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems = document.getElementById("pedidoItems");
const spanTotal = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

const inputFecha = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");
const inputPagado = document.getElementById("pedidoPagado");

const listaPedidosBody = document.getElementById("listaPedidos");
const filtroEstado = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

const totalPendienteEl = document.getElementById("totalPendiente");
const totalActivosEl = document.getElementById("totalActivos");
const totalCobradoEl = document.getElementById("totalCobrado");

/* ===================== ESTADO ===================== */
let productos = [];
let clientesPorNombre = {};
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;

/* ===================== HELPERS ===================== */
function prioridadPedido(p) {
  if (p.estado !== "ENTREGADO" && !p.pagado) return 1;
  if (p.estado !== "ENTREGADO" && p.pagado) return 2;
  if (p.estado === "ENTREGADO" && !p.pagado) return 3;
  return 4;
}

/* ===================== CLIENTES ===================== */
async function cargarClientes() {
  clientesPorNombre = {};
  datalistClientes.innerHTML = "";
  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = c;
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

/* ===================== PRODUCTOS ===================== */
async function cargarProductos() {
  productos = [];
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  selProducto.innerHTML = `<option value="">Elegí un producto</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `<option value="${p.id}">${p.nombre} — $${p.precio}</option>`;
  });
}

/* ===================== ITEMS ===================== */
function renderPedido() {
  let total = 0;
  tbodyItems.innerHTML = "";
  itemsPedido.forEach((i, idx) => {
    total += i.subtotal;
    tbodyItems.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>$${i.precio}</td>
        <td>${i.cantidad}</td>
        <td>$${i.subtotal}</td>
        <td><button onclick="eliminarItem(${idx})">✖</button></td>
      </tr>`;
  });
  spanTotal.textContent = total;
}

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

btnAgregar.onclick = e => {
  e.preventDefault();
  const prod = productos.find(p => p.id === selProducto.value);
  const cant = Number(inputCantidad.value);
  if (!prod || cant <= 0) return;
  itemsPedido.push({
    productoId: prod.id,
    nombre: prod.nombre,
    precio: prod.precio,
    cantidad: cant,
    subtotal: cant * prod.precio
  });
  renderPedido();
};

/* ===================== GUARDAR / EDITAR ===================== */
btnGuardar.onclick = async e => {
  e.preventDefault();
  if (!itemsPedido.length) return;

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const data = {
    clienteNombre: inputClienteNombre.value,
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: inputFecha.value || new Date().toISOString(),
    estado: selectEstado.value,
    nota: inputNota.value,
    pagado: inputPagado.checked,
    total,
    items: itemsPedido
  };

  if (pedidoEditandoId) {
    const p = pedidosCache.find(x => x.id === pedidoEditandoId);
    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      ...data,
      historial: [...(p.historial || []), { fecha: new Date().toISOString(), accion: "EDITADO" }]
    });
  } else {
    await addDoc(collection(db, "pedidos"), {
      ...data,
      fechaServer: serverTimestamp(),
      historial: [{ fecha: new Date().toISOString(), accion: "CREADO" }]
    });
  }

  pedidoEditandoId = null;
  itemsPedido = [];
  renderPedido();
  cargarPedidos();
};

/* ===================== LISTA ===================== */
async function cargarPedidos() {
  pedidosCache = [];
  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));
  pedidosCache.sort((a, b) => prioridadPedido(a) - prioridadPedido(b));
  renderLista();
  renderResumen();
}

function renderResumen() {
  let pendiente = 0, activos = 0, cobrado = 0;
  const now = new Date();
  pedidosCache.forEach(p => {
    if (!p.pagado) pendiente += p.total;
    if (p.estado !== "ENTREGADO") activos++;
    if (p.pagado) {
      const f = new Date(p.fecha);
      if (f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear()) {
        cobrado += p.total;
      }
    }
  });
  totalPendienteEl.textContent = pendiente;
  totalActivosEl.textContent = activos;
  totalCobradoEl.textContent = cobrado;
}

function renderLista() {
  listaPedidosBody.innerHTML = "";
  pedidosCache
    .filter(p =>
      (!filtroEstado.value || p.estado === filtroEstado.value) &&
      (!filtroBusqueda.value || p.clienteNombre.toLowerCase().includes(filtroBusqueda.value.toLowerCase()))
    )
    .forEach(p => {
      listaPedidosBody.innerHTML += `
        <tr>
          <td>${p.clienteNombre}</td>
          <td>${new Date(p.fecha).toLocaleDateString()}</td>
          <td>${p.estado}</td>
          <td>${p.pagado ? "✔" : "✖"}</td>
          <td>$${p.total}</td>
          <td>
            <button onclick="editarPedido('${p.id}')">✏️</button>
            <button onclick="marcarPagado('${p.id}')">💰</button>
            <button onclick="marcarEntregado('${p.id}')">📦</button>
            <button onclick="verHistorial('${p.id}')">🧾</button>
            <button onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>`;
    });
}

window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  pedidoEditandoId = id;
  inputClienteNombre.value = p.clienteNombre;
  inputClienteTelefono.value = p.clienteTelefono;
  inputClienteRed.value = p.clienteRed;
  inputFecha.value = p.fecha.slice(0, 10);
  selectEstado.value = p.estado;
  inputNota.value = p.nota;
  inputPagado.checked = p.pagado;
  itemsPedido = [...p.items];
  renderPedido();
};

window.marcarPagado = async id => {
  const p = pedidosCache.find(x => x.id === id);
  await updateDoc(doc(db, "pedidos", id), {
    pagado: true,
    historial: [...(p.historial || []), { fecha: new Date().toISOString(), accion: "PAGADO" }]
  });
  cargarPedidos();
};

window.marcarEntregado = async id => {
  const p = pedidosCache.find(x => x.id === id);
  await updateDoc(doc(db, "pedidos", id), {
    estado: "ENTREGADO",
    historial: [...(p.historial || []), { fecha: new Date().toISOString(), accion: "ENTREGADO" }]
  });
  cargarPedidos();
};

window.verHistorial = id => {
  const p = pedidosCache.find(x => x.id === id);
  alert((p.historial || []).map(h => `${new Date(h.fecha).toLocaleString()} – ${h.accion}`).join("\n"));
};

window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
})();
