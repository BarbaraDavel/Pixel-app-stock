import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =========================
// REFERENCIAS DOM
// =========================
const selProducto = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTel = document.getElementById("clienteTelefono");

const tbodyItems = document.getElementById("pedidoItems");
const spanTotal = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// =========================
// ESTADO EN MEMORIA
// =========================
let productos = [];      // viene de Firestore (productos)
let itemsPedido = [];    // ítems del pedido actual

// =========================
// CARGAR PRODUCTOS
// =========================
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando productos...</option>`;

  const snap = await getDocs(collection(db, "productos"));
  productos = [];

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
    const etiqueta = `${p.nombre} — $${precioUnit}`;
    selProducto.innerHTML += `
      <option value="${p.id}">${etiqueta}</option>
    `;
  });
}

// =========================
// RENDER DEL PEDIDO
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

// Hacemos la función global para el onclick del botón
window.eliminarItem = function (idx) {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

// =========================
// AGREGAR ÍTEM AL PEDIDO
// =========================
btnAgregar.addEventListener("click", e => {
  e.preventDefault();

  const prodId = selProducto.value;
  const cant = Number(inputCantidad.value || "0");

  if (!prodId) {
    alert("Elegí un producto primero 😊");
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
});

// =========================
// GUARDAR PEDIDO (colección "pedidos")
// =========================
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  const nombre = inputClienteNombre.value.trim();
  const tel = inputClienteTel.value.trim();

  if (!nombre) {
    alert("Poné el nombre del cliente 😉");
    return;
  }

  if (!itemsPedido.length) {
    alert("Agregá al menos un producto al pedido.");
    return;
  }

  const total = itemsPedido.reduce((acc, i) => acc + i.subtotal, 0);

  const pedidoDoc = {
    clienteNombre: nombre,
    clienteTelefono: tel || "—",
    fechaCreacion: new Date().toISOString(),
    fechaServer: serverTimestamp(),
    estado: "PENDIENTE",          // después podríamos manejar Confirmado / Cancelado
    total,
    items: itemsPedido
  };

  try {
    await addDoc(collection(db, "pedidos"), pedidoDoc);
    alert("✅ Pedido guardado (presupuesto listo).");

    // limpiar todo para el siguiente
    itemsPedido = [];
    renderPedido();
    inputClienteNombre.value = "";
    inputClienteTel.value = "";
    inputCantidad.value = 1;
    selProducto.value = "";
  } catch (err) {
    console.error(err);
    alert("Error al guardar el pedido. Revisá la consola.");
  }
});

// =========================
// INICIO
// =========================
cargarProductos();
renderPedido();
