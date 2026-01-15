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
const inputClienteNombre   = document.getElementById("clienteNombre");
const inputClienteApodo    = document.getElementById("clienteApodo");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed      = document.getElementById("clienteRed");
const datalistClientes     = document.getElementById("clientesDatalist");

const selProducto   = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems    = document.getElementById("pedidoItems");
const spanTotal     = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

const inputFecha   = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota    = document.getElementById("pedidoNota");
const inputPagado  = document.getElementById("pedidoPagado");

const listaPedidosBody = document.getElementById("listaPedidos");
const filtroEstado   = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

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
    selProducto.innerHTML += `<option value="${p.id}">${p.nombre} — $${p.precio}</option>`;
  });
}

/* =====================================================
   ITEMS
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
    precio: prod.precio,
    cantidad: cant,
    subtotal: prod.precio * cant
  });

  renderPedido();
};

/* =====================================================
   GUARDAR
===================================================== */
btnGuardar.onclick = async e => {
  e.preventDefault();

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const pagadoMonto = inputPagado.checked ? total : 0;

  const data = {
    clienteNombre: inputClienteNombre.value.trim(),
    clienteApodo: inputClienteApodo?.value || "",
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: inputFecha.value
      ? new Date(inputFecha.value + "T00:00:00").toISOString()
      : new Date().toISOString(),
    estado: selectEstado.value,
    nota: inputNota.value,
    total,
    pagadoMonto,
    pagado: pagadoMonto >= total,
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

  limpiarFormulario();
  cargarPedidos();
};

function limpiarFormulario() {
  itemsPedido = [];
  renderPedido();
  pedidoEditandoId = null;
  inputPagado.checked = false;
}

/* =====================================================
   LISTA
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
}

function renderLista() {
  listaPedidosBody.innerHTML = "";

  pedidosCache.forEach(p => {
    const pagadoTxt = p.pagado
      ? `<span class="badge badge-pagado">Pagado</span>`
      : `<span class="badge badge-senia">Seña $${p.pagadoMonto || 0} / $${p.total}</span>`;

    listaPedidosBody.innerHTML += `
      <tr>
        <td onclick="verPedido('${p.id}')" style="cursor:pointer">${p.clienteNombre}</td>
        <td>${new Date(p.fecha).toLocaleDateString()}</td>
        <td>${p.estado}</td>
        <td onclick="registrarPago('${p.id}')" style="cursor:pointer">${pagadoTxt}</td>
        <td>$${p.total}</td>
        <td>
          <button onclick="editarPedido('${p.id}')">✏️</button>
          <button onclick="borrarPedido('${p.id}')">🗑️</button>
        </td>
      </tr>`;
  });
}

/* =====================================================
   PAGOS PARCIALES
===================================================== */
window.registrarPago = async id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const monto = Number(prompt("Monto recibido:", ""));
  if (!monto || monto <= 0) return;

  const nuevoMonto = (p.pagadoMonto || 0) + monto;
  const pagado = nuevoMonto >= p.total;

  await updateDoc(doc(db, "pedidos", id), {
    pagadoMonto: nuevoMonto,
    pagado,
    historial: [...(p.historial || []), {
      fecha: new Date().toISOString(),
      accion: "PAGO_PARCIAL",
      monto
    }]
  });

  cargarPedidos();
};

/* =====================================================
   MODAL + WHATS
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  pedidoModalActual = p;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalEstado.textContent = p.estado;
  modalItems.innerHTML = p.items.map(i => `• ${i.cantidad} x ${i.nombre}`).join("<br>");
  modalTotal.textContent = `
    Total: $${p.total}<br>
    Pagado: $${p.pagadoMonto || 0}<br>
    Saldo: $${p.total - (p.pagadoMonto || 0)}
  `;

  modalHistorial.innerHTML = (p.historial || [])
    .map(h => `• ${new Date(h.fecha).toLocaleString()} – ${h.accion}`)
    .join("<br>");

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

/* =====================================================
   BORRAR / EDITAR
===================================================== */
window.borrarPedido = async id => {
  if (confirm("¿Eliminar pedido?")) {
    await deleteDoc(doc(db, "pedidos", id));
    cargarPedidos();
  }
};

window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
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
};

/* =====================================================
   INIT
===================================================== */
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
})();
