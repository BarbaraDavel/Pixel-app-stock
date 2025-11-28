import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const grid = document.getElementById("productosLista");
const btnGuardar = document.getElementById("guardarProd");
const inputNombre = document.getElementById("prodNombre");
const inputPrecio = document.getElementById("prodPrecio");

// Venta UI
const ventaVacia = document.getElementById("ventaVacia");
const ventaTabla = document.getElementById("ventaTabla");
const ventaItemsBody = document.getElementById("ventaItems");
const ventaResumen = document.getElementById("ventaResumen");
const ventaTotalSpan = document.getElementById("ventaTotal");
const btnCancelarVenta = document.getElementById("btnCancelarVenta");
const btnFinalizarVenta = document.getElementById("btnFinalizarVenta");

// Modal venta
const modal = document.getElementById("ventaModal");
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const selectMetodoPago = document.getElementById("metodoPago");
const inputNotaVenta = document.getElementById("notaVenta");
const btnVentaCancelar = document.getElementById("ventaCancelar");
const btnVentaConfirmar = document.getElementById("ventaConfirmar");

// Cache
let productosCache = {};
let ventaItems = [];

// =================================
//  POPUP PIXEL (global)
// =================================
function mostrarPopup(msg = "Listo ✔️") {
  const popup = document.getElementById("popupPixel");
  const texto = document.getElementById("popupText");

  texto.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 1500);
}

// =================================
//  Cargar productos
// =================================
async function cargarProductos() {
  grid.innerHTML = "";
  productosCache = {};

  const snap = await getDocs(collection(db, "productos"));

  snap.forEach((d) => {
    const p = d.data();
    productosCache[d.id] = p;

    grid.innerHTML += `
      <div class="producto-card" id="prod-${d.id}">
        
        <!-- Vista normal -->
        <div class="producto-view">
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">$${p.precio}</div>
          <div class="producto-botones">
            <button class="btn btn-outline" onclick="editarProducto('${d.id}')">✏️ Editar</button>
            <button class="btn btn-danger" onclick="eliminarProducto('${d.id}')">✕</button>
          </div>
        </div>

        <!-- Vista de edición -->
        <div class="producto-edit hidden">
          <input id="edit-nombre-${d.id}" class="input-pixel" value="${p.nombre}">
          <input id="edit-precio-${d.id}" class="input-pixel" type="number" value="${p.precio}">
          <div class="producto-edit-botones">
            <button class="btn btn-primary" onclick="guardarEdicion('${d.id}')">💾 Guardar</button>
            <button class="btn btn-outline" onclick="cancelarEdicion('${d.id}')">Cancelar</button>
          </div>
        </div>

        <!-- Botón vender -->
        <button class="btn btn-primary vender-btn" onclick="agregarAVenta('${d.id}')">
          💸 Vender
        </button>

      </div>
    `;
  });
}

// =================================
//  EDITAR PRODUCTO
// =================================
window.editarProducto = function (id) {
  const card = document.getElementById(`prod-${id}`);
  card.querySelector(".producto-view").classList.add("hidden");
  card.querySelector(".producto-edit").classList.remove("hidden");
  card.querySelector(".vender-btn").classList.add("hidden");
};

window.cancelarEdicion = function (id) {
  const card = document.getElementById(`prod-${id}`);
  card.querySelector(".producto-view").classList.remove("hidden");
  card.querySelector(".producto-edit").classList.add("hidden");
  card.querySelector(".vender-btn").classList.remove("hidden");
};

window.guardarEdicion = async function (id) {
  const nombre = document.getElementById(`edit-nombre-${id}`).value.trim();
  const precio = Number(document.getElementById(`edit-precio-${id}`).value);

  if (!nombre) {
    mostrarPopup("Nombre inválido ❌");
    return;
  }

  await updateDoc(doc(db, "productos", id), { nombre, precio });

  mostrarPopup("Producto actualizado ✔️");
  cargarProductos();
};

window.eliminarProducto = async function (id) {
  if (!confirm("¿Eliminar este producto?")) return;

  await deleteDoc(doc(db, "productos", id));
  mostrarPopup("Producto eliminado 🗑️");

  cargarProductos();
};

// =================================
//  AGREGAR A VENTA
// =================================
window.agregarAVenta = function (id) {
  const prod = productosCache[id];
  if (!prod) return;

  const existente = ventaItems.find((i) => i.productoId === id);
  if (existente) existente.cantidad += 1;
  else ventaItems.push({ productoId: id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 });

  renderVenta();
};

// =================================
//  Render venta
// =================================
function renderVenta() {
  if (ventaItems.length === 0) {
    ventaVacia.classList.remove("hidden");
    ventaTabla.classList.add("hidden");
    ventaResumen.classList.add("hidden");
    return;
  }

  ventaVacia.classList.add("hidden");
  ventaTabla.classList.remove("hidden");
  ventaResumen.classList.remove("hidden");

  ventaItemsBody.innerHTML = "";
  let total = 0;

  ventaItems.forEach((item, index) => {
    const subtotal = item.cantidad * item.precio;
    total += subtotal;

    ventaItemsBody.innerHTML += `
      <tr>
        <td>${item.nombre}</td>
        <td>
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, -1)">-</button>
          ${item.cantidad}
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, 1)">+</button>
        </td>
        <td>$${item.precio}</td>
        <td>$${subtotal}</td>
        <td><button class="btn btn-sm btn-danger" onclick="quitarItem(${index})">✕</button></td>
      </tr>
    `;
  });

  ventaTotalSpan.textContent = `$${total}`;
}

window.cambiarCantidad = function (index, delta) {
  const item = ventaItems[index];
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) ventaItems.splice(index, 1);

  renderVenta();
};

window.quitarItem = function (index) {
  ventaItems.splice(index, 1);
  renderVenta();
};

// =================================
//  Finalizar venta
// =================================
btnCancelarVenta.onclick = () => {
  if (!confirm("¿Cancelar venta actual?")) return;
  ventaItems = [];
  renderVenta();
};

btnFinalizarVenta.onclick = () => {
  if (ventaItems.length === 0) {
    mostrarPopup("Venta vacía ❌");
    return;
  }
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  selectMetodoPago.value = "Efectivo";
  inputNotaVenta.value = "";
  modal.classList.remove("hidden");
};

btnVentaCancelar.onclick = () => modal.classList.add("hidden");

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =================================
//  Confirmar venta
// =================================
btnVentaConfirmar.onclick = async () => {
  if (ventaItems.length === 0) return;

  const clienteNombre = inputClienteNombre.value.trim() || "Sin nombre";
  const clienteTelefono = inputClienteTelefono.value.trim() || "";
  const metodoPago = selectMetodoPago.value;
  const nota = inputNotaVenta.value.trim();

  let total = 0;
  const items = ventaItems.map((i) => {
    const subtotal = i.cantidad * i.precio;
    total += subtotal;
    return {
      productoId: i.productoId,
      nombre: i.nombre,
      precioUnitario: i.precio,
      cantidad: i.cantidad,
      subtotal
    };
  });

  const ventaRef = await addDoc(collection(db, "ventas"), {
    tipo: "VENTA",
    clienteNombre,
    clienteTelefono,
    metodoPago,
    nota,
    fecha: new Date().toISOString(),
    total,
    items
  });

  await addDoc(collection(db, "movimientos_stock"), {
    tipo: "VENTA",
    ventaId: ventaRef.id,
    clienteNombre,
    total,
    metodoPago,
    fecha: new Date().toISOString(),
    nota: nota || "Venta desde Productos"
  });

  ventaItems = [];
  renderVenta();
  modal.classList.add("hidden");
  mostrarPopup("Venta registrada ✔️");
};

// =================================
//  Agregar nuevo producto
// =================================
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const precio = Number(inputPrecio.value);

  if (!nombre || precio <= 0) {
    mostrarPopup("Datos inválidos ❌");
    return;
  }

  await addDoc(collection(db, "productos"), { nombre, precio });

  inputNombre.value = "";
  inputPrecio.value = "";

  mostrarPopup("Producto agregado ✔️");

  cargarProductos();
};

cargarProductos();
renderVenta();
