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
const inputClienteApodo    = document.getElementById("clienteApodo");
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
const filtroEstado     = document.getElementById("filtroEstado");
const filtroBusqueda   = document.getElementById("filtroBusqueda");

// Resumen
const resumenActivosEl  = document.getElementById("resumenActivos");
const resumenNoPagadoEl = document.getElementById("resumenNoPagado");

// Modal ver
const modal        = document.getElementById("pedidoModal");
const modalTitulo  = document.getElementById("modalTitulo");
const modalCliente = document.getElementById("modalCliente");
const modalEstado  = document.getElementById("modalEstado");
const modalFecha   = document.getElementById("modalFecha");
const modalItems   = document.getElementById("modalItems");
const modalNota    = document.getElementById("modalNota");
const modalTotal   = document.getElementById("modalTotal");
const modalWhats   = document.getElementById("modalWhatsApp");
const modalCerrar  = document.getElementById("modalCerrar");
const modalHistorial = document.getElementById("modalHistorial");

/* =====================================================
   ESTADO
===================================================== */
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoModalActual = null;

const ordenEstados = {
  PENDIENTE: 1,
  PROCESO: 2,
  LISTO: 3,
  ENTREGADO: 4
};

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
      red: c.instagram || c.red || "",
      apodo: c.apodo || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const c = clientesPorNombre[inputClienteNombre.value.trim()];
  if (!c) return;

  if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
  if (!inputClienteRed.value) inputClienteRed.value = c.red;
  if (inputClienteApodo && c.apodo && !inputClienteApodo.value) {
    inputClienteApodo.value = c.apodo;
  }
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* =====================================================
   PRODUCTOS
===================================================== */
async function cargarProductos() {
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
      </option>`;
  });
}

/* =====================================================
   ITEMS PEDIDO
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
    precio: Number(prod.precio || 0),
    cantidad: cant,
    subtotal: cant * Number(prod.precio || 0)
  });

  renderPedido();
};

/* =====================================================
   FORM
===================================================== */
function limpiarFormulario() {
  itemsPedido = [];
  renderPedido();
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputClienteApodo.value = "";
  inputNota.value = "";
  inputCantidad.value = 1;
  selProducto.value = "";
  inputFecha.value = "";
  inputPagado.checked = false;
  selectEstado.value = "PENDIENTE";
  pedidoEditandoId = null;
  btnGuardar.textContent = "Guardar pedido";
}

btnLimpiar.onclick = e => {
  e.preventDefault();
  limpiarFormulario();
};

/* =====================================================
   GUARDAR / EDITAR
===================================================== */
btnGuardar.onclick = async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length) {
    alert("Faltan datos");
    return;
  }

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const baseData = {
    clienteNombre: inputClienteNombre.value.trim(),
    clienteApodo: inputClienteApodo?.value?.trim() || "",
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
    const p = pedidosCache.find(x => x.id === pedidoEditandoId);
    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      ...baseData,
      historial: [...(p.historial || []), {
        fecha: new Date().toISOString(),
        accion: "EDITADO"
      }]
    });
  } else {
    await addDoc(collection(db, "pedidos"), {
      ...baseData,
      fechaServer: serverTimestamp(),
      historial: [{
        fecha: new Date().toISOString(),
        accion: "CREADO"
      }]
    });
  }

  limpiarFormulario();
  cargarPedidos();
};

/* =====================================================
   LISTA + RESUMEN
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => {
    if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
    return (ordenEstados[a.estado] || 99) - (ordenEstados[b.estado] || 99);
  });

  renderLista();
  renderResumenSimple();
}

function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p =>
      (!est || p.estado === est) &&
      (!txt || p.clienteNombre.toLowerCase().includes(txt))
    )
    .forEach(p => {
      listaPedidosBody.innerHTML += `
        <tr>
          <td onclick="verPedido('${p.id}')" style="cursor:pointer">${p.clienteNombre}</td>
          <td>${new Date(p.fecha).toLocaleDateString()}</td>
          <td>${p.estado}</td>
          <td>${p.pagado ? "Pagado" : "No pagado"}</td>
          <td>$${p.total}</td>
          <td>
            <button onclick="editarPedido('${p.id}')">✏️</button>
            <button onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>`;
    });
}

filtroEstado.onchange = renderLista;
filtroBusqueda.oninput = renderLista;

/* =====================================================
   RESUMEN
===================================================== */
function renderResumenSimple() {
  let activos = 0;
  let noPagado = 0;

  pedidosCache.forEach(p => {
    if (p.estado !== "ENTREGADO") activos++;
    if (!p.pagado) noPagado += Number(p.total || 0);
  });

  if (resumenActivosEl) resumenActivosEl.textContent = activos;
  if (resumenNoPagadoEl) resumenNoPagadoEl.textContent = `$${noPagado}`;
}

/* =====================================================
   MODAL
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;
  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalEstado.textContent = p.estado;
  modalFecha.textContent = new Date(p.fecha).toLocaleString();
  modalItems.innerHTML = p.items.map(i => `• ${i.cantidad}× ${i.nombre}`).join("<br>");
  modalTotal.textContent = `Total: $${p.total}`;
  modalHistorial.innerHTML = (p.historial || [])
    .map(h => `• ${new Date(h.fecha).toLocaleString()} – ${traducirAccion(h.accion)}`)
    .join("<br>");

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

/* =====================================================
   BORRAR / EDITAR
===================================================== */
window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  pedidoEditandoId = id;

  inputClienteNombre.value = p.clienteNombre;
  inputClienteTelefono.value = p.clienteTelefono || "";
  inputClienteRed.value = p.clienteRed || "";
  inputClienteApodo.value = p.clienteApodo || "";
  inputFecha.value = p.fecha.slice(0, 10);
  selectEstado.value = p.estado;
  inputNota.value = p.nota || "";
  inputPagado.checked = p.pagado;

  itemsPedido = p.items.map(i => ({ ...i }));
  renderPedido();
};

/* =====================================================
   INIT
===================================================== */
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
})();
