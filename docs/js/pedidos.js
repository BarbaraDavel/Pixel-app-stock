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

// 🔍 Producto buscador
const inputProductoBuscar  = document.getElementById("productoBuscar");
const productoResultados  = document.getElementById("productoResultados");

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

// Resumen
const resumenActivosEl  = document.getElementById("resumenActivos");
const resumenNoPagadoEl = document.getElementById("resumenNoPagado");

/* =====================================================
   ESTADO
===================================================== */
let clientesPorNombre = {};
let productos = [];
let productoSeleccionado = null;
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;

/* =====================================================
   CLIENTES
===================================================== */
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = c;
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

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
}

/* 🔍 BUSCADOR PRODUCTOS */
inputProductoBuscar.addEventListener("input", () => {
  const texto = inputProductoBuscar.value.toLowerCase();
  productoResultados.innerHTML = "";

  if (!texto) {
    productoResultados.classList.add("hidden");
    return;
  }

  productos
    .filter(p => p.nombre.toLowerCase().includes(texto))
    .forEach(p => {
      const div = document.createElement("div");
      div.textContent = `${p.nombre} — $${p.precio}`;
      div.onclick = () => {
        productoSeleccionado = p;
        inputProductoBuscar.value = p.nombre;
        productoResultados.classList.add("hidden");
      };
      productoResultados.appendChild(div);
    });

  productoResultados.classList.remove("hidden");
});

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

  if (!productoSeleccionado) {
    alert("Elegí un producto");
    return;
  }

  const cant = Number(inputCantidad.value);
  if (cant <= 0) return;

  itemsPedido.push({
    productoId: productoSeleccionado.id,
    nombre: productoSeleccionado.nombre,
    precio: Number(productoSeleccionado.precio || 0),
    cantidad: cant,
    subtotal: cant * Number(productoSeleccionado.precio || 0)
  });

  productoSeleccionado = null;
  inputProductoBuscar.value = "";
  renderPedido();
});

/* =====================================================
   FORM
===================================================== */
function limpiarFormulario() {
  itemsPedido = [];
  renderPedido();
  inputProductoBuscar.value = "";
  inputCantidad.value = 1;
  productoSeleccionado = null;
}

btnLimpiar.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   INIT
===================================================== */
(async function init(){
  await cargarClientes();
  await cargarProductos();
  renderPedido();
})();
