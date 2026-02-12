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

// Productos
const selProducto   = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");

// 🔥 Item personalizado
const btnItemPersonalizado = document.getElementById("btnItemPersonalizado");
const itemPersonalizadoBox = document.getElementById("itemPersonalizadoBox");
const inputItemPersNombre  = document.getElementById("itemPersonalizadoNombre");
const inputItemPersPrecio  = document.getElementById("itemPersonalizadoPrecio");
const inputItemPersCant    = document.getElementById("itemPersonalizadoCantidad");
const btnAgregarItemPers   = document.getElementById("agregarItemPersonalizadoBtn");

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

const resumenActivosEl  = document.getElementById("resumenActivos");
const resumenNoPagadoEl = document.getElementById("resumenNoPagado");

// Modal
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
  "PENDIENTE": 1,
  "PROCESO": 2,
  "LISTO": 3,
  "ENTREGADO": 4
};

/* =====================================================
   ITEM PERSONALIZADO
===================================================== */

btnItemPersonalizado?.addEventListener("click", () => {
  itemPersonalizadoBox.style.display =
    itemPersonalizadoBox.style.display === "none" ? "block" : "none";
});

btnAgregarItemPers?.addEventListener("click", (e) => {
  e.preventDefault();

  const nombre = inputItemPersNombre.value.trim();
  const precio = Number(inputItemPersPrecio.value);
  const cantidad = Number(inputItemPersCant.value);

  if (!nombre || precio < 0 || cantidad <= 0) {
    alert("Datos inválidos");
    return;
  }

  itemsPedido.push({
    productoId: null,
    nombre,
    precio,
    cantidad,
    subtotal: precio * cantidad,
    personalizado: true
  });

  inputItemPersNombre.value = "";
  inputItemPersPrecio.value = "";
  inputItemPersCant.value = 1;
  itemPersonalizadoBox.style.display = "none";

  renderPedido();
});

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
      </option>`;
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
        <td>${i.personalizado ? "📝 " : ""}${i.nombre}</td>
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
    subtotal: cant * Number(prod.precio || 0),
    personalizado: false
  });

  renderPedido();
});

/* =====================================================
   GUARDAR PEDIDO
===================================================== */

btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length)
    return alert("Faltan datos");

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);

  const baseData = {
    clienteNombre: inputClienteNombre.value.trim(),
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: inputFecha.value
      ? new Date(inputFecha.value + "T00:00:00").toISOString()
      : new Date().toISOString(),
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
      historial: [
        ...(p.historial || []),
        {
          fecha: new Date().toISOString(),
          accion: "EDITADO"
        }
      ]
    });

    alert("Pedido actualizado ✔");
  } else {
    await addDoc(collection(db, "pedidos"), {
      ...baseData,
      fechaServer: serverTimestamp(),
      stockDescontado: false,
      historial: [{
        fecha: new Date().toISOString(),
        accion: "CREADO"
      }]
    });

    alert("Pedido guardado ✔");
  }

  limpiarFormulario();
  cargarPedidos();
});

/* =====================================================
   LIMPIAR
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
}

/* =====================================================
   INIT
===================================================== */

(async function init(){
  await cargarClientes();
  await cargarProductos();
})();
