import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const grid = document.getElementById("productosLista");
const btnGuardar = document.getElementById("guardarProd");
const inputNombre = document.getElementById("prodNombre");
const inputPrecio = document.getElementById("prodPrecio");

// Venta actual UI
const ventaVacia = document.getElementById("ventaVacia");
const ventaTabla = document.getElementById("ventaTabla");
const ventaItemsBody = document.getElementById("ventaItems");
const ventaResumen = document.getElementById("ventaResumen");
const ventaTotalSpan = document.getElementById("ventaTotal");
const btnCancelarVenta = document.getElementById("btnCancelarVenta");
const btnFinalizarVenta = document.getElementById("btnFinalizarVenta");

// Modal venta
const modalVenta = document.getElementById("ventaModal");
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const selectMetodoPago = document.getElementById("metodoPago");
const inputNotaVenta = document.getElementById("notaVenta");
const btnVentaCancelar = document.getElementById("ventaCancelar");
const btnVentaConfirmar = document.getElementById("ventaConfirmar");

// Modal editar producto
const modalEditar = document.getElementById("editarProductoModal");
const editNombre = document.getElementById("editNombre");
const editPrecio = document.getElementById("editPrecio");
const recetaDetalle = document.getElementById("recetaProductoDetalle");
const costoBox = document.getElementById("costoProduccionBox");
const btnCancelarEdicion = document.getElementById("cancelarEdicion");
const btnGuardarEdicion = document.getElementById("guardarEdicion");

let productoEditandoId = null;

// Popup Pixel
function popup(msg) {
  const box = document.getElementById("popupPixel");
  const txt = document.getElementById("popupText");

  txt.textContent = msg;
  box.classList.remove("hidden");

  setTimeout(() => box.classList.add("hidden"), 2000);
}

// Cache
let productosCache = {};
let ventaItems = [];

// ==============================
// Cargar productos
// ==============================
async function cargarProductos() {
  grid.innerHTML = "";
  productosCache = {};

  const snap = await getDocs(collection(db, "productos"));

  snap.forEach((d) => {
    const p = d.data();
    productosCache[d.id] = p;

    grid.innerHTML += `
      <div class="producto-card">
        <div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">$${p.precio}</div>
        </div>

        <div class="producto-actions">
          <button class="btn btn-outline" onclick="editarProducto('${d.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${d.id}')">✕</button>
          <button class="btn btn-primary" onclick="agregarAVenta('${d.id}')">💸 Vender</button>
        </div>
      </div>
    `;
  });
}

// =============================================================
// FUNCIONES: Cargar Receta + Cargar Costos de Producción
// =============================================================
async function cargarRecetaYCostos(productoId) {
  recetaDetalle.innerHTML = "Cargando...";
  costoBox.innerHTML = "Calculando...";

  const recetasSnap = await getDocs(
    query(collection(db, "recetas"), where("productoId", "==", productoId))
  );

  const insumosSnap = await getDocs(collection(db, "insumos"));

  // Map insumos
  const insumosMap = {};
  insumosSnap.forEach((i) => (insumosMap[i.id] = i.data()));

  let recetaLista = [];
  recetasSnap.forEach((r) => recetaLista.push(r.data()));

  if (recetaLista.length === 0) {
    recetaDetalle.innerHTML = `<p class="hint">Este producto no tiene recetas asignadas.</p>`;
    costoBox.innerHTML = `<p class="hint">No se puede calcular costo.</p>`;
    return;
  }

  // Mostrar receta
  let htmlReceta = "";
  let costoTotal = 0;

  recetaLista.forEach((r) => {
    const ins = insumosMap[r.insumoId];
    if (!ins) return;

    const costoUnitario = Number(ins.costoUnitario) || 0;
    const usado = Number(r.cantidadUsada) || 0;
    const subtotal = costoUnitario * usado;

    costoTotal += subtotal;

    htmlReceta += `<p>• ${usado}× ${ins.nombre} — $${subtotal}</p>`;
  });

  recetaDetalle.innerHTML = htmlReceta;

  costoBox.innerHTML = `
    <strong>Total producir 1 unidad:</strong> $${costoTotal}
  `;
}

// =========================================
// EDITAR PRODUCTO
// =========================================
window.editarProducto = function (id) {
  const p = productosCache[id];
  if (!p) return;

  productoEditandoId = id;

  editNombre.value = p.nombre;
  editPrecio.value = p.precio;

  modalEditar.classList.remove("hidden");

  // cargar recetas + costos
  cargarRecetaYCostos(id);
};

btnCancelarEdicion.onclick = () => {
  modalEditar.classList.add("hidden");
  productoEditandoId = null;
};

btnGuardarEdicion.onclick = async () => {
  if (!productoEditandoId) return;

  await updateDoc(doc(db, "productos", productoEditandoId), {
    nombre: editNombre.value.trim(),
    precio: Number(editPrecio.value)
  });

  popup("Producto actualizado ✨");

  modalEditar.classList.add("hidden");
  productoEditandoId = null;

  cargarProductos();
};

// =========================================
// ELIMINAR PRODUCTO
// =========================================
window.eliminarProducto = async function (id) {
  if (!confirm("¿Eliminar este producto?")) return;

  await deleteDoc(doc(db, "productos", id));

  popup("Producto eliminado 🗑️");

  cargarProductos();
};

// =========================================
// AGREGAR PRODUCTO
// =========================================
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const precio = Number(inputPrecio.value);

  if (!nombre) return alert("Ingresá un nombre");

  await addDoc(collection(db, "productos"), { nombre, precio });

  popup("Producto agregado 💖");

  inputNombre.value = "";
  inputPrecio.value = "";

  cargarProductos();
};

// =========================================
// AGREGAR A VENTA
// =========================================
window.agregarAVenta = function (id) {
  const p = productosCache[id];
  if (!p) return;

  const existe = ventaItems.find((i) => i.productoId === id);

  if (existe) existe.cantidad++;
  else
    ventaItems.push({
      productoId: id,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: 1
    });

  renderVenta();
};

// =========================================
// RENDER VENTA
// =========================================
function renderVenta() {
  if (ventaItems.length === 0) {
    ventaVacia.classList.remove("hidden");
    ventaTabla.classList.add("hidden");
    ventaResumen.classList.add("hidden");
    ventaTotalSpan.textContent = "$0";
    return;
  }

  ventaVacia.classList.add("hidden");
  ventaTabla.classList.remove("hidden");
  ventaResumen.classList.remove("hidden");

  ventaItemsBody.innerHTML = "";
  let total = 0;

  ventaItems.forEach((i, index) => {
    const sub = i.precio * i.cantidad;
    total += sub;

    ventaItemsBody.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, -1)">-</button>
          ${i.cantidad}
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, 1)">+</button>
        </td>
        <td>$${i.precio}</td>
        <td>$${sub}</td>
        <td><button class="btn btn-danger btn-sm" onclick="quitarItem(${index})">✕</button></td>
      </tr>
    `;
  });

  ventaTotalSpan.textContent = `$${total}`;
}

window.cambiarCantidad = function (i, d) {
  ventaItems[i].cantidad += d;
  if (ventaItems[i].cantidad <= 0) ventaItems.splice(i, 1);
  renderVenta();
};

window.quitarItem = function (i) {
  ventaItems.splice(i, 1);
  renderVenta();
};

// =========================================
// FINALIZAR VENTA
// =========================================
btnCancelarVenta.onclick = () => {
  if (!confirm("¿Cancelar venta actual?")) return;
  ventaItems = [];
  renderVenta();
};

btnFinalizarVenta.onclick = () => {
  if (ventaItems.length === 0) return alert("No hay productos.");
  modalVenta.classList.remove("hidden");

  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  selectMetodoPago.value = "Efectivo";
  inputNotaVenta.value = "";
};

btnVentaCancelar.onclick = () => modalVenta.classList.add("hidden");

modalVenta.addEventListener("click", (e) => {
  if (e.target === modalVenta) modalVenta.classList.add("hidden");
});

// =========================================
// GUARDAR VENTA
// =========================================
btnVentaConfirmar.onclick = async () => {
  if (ventaItems.length === 0) return;

  const cliente = inputClienteNombre.value.trim() || "Sin nombre";
  const tel = inputClienteTelefono.value.trim();
  const metodo = selectMetodoPago.value;
  const nota = inputNotaVenta.value.trim();

  let total = ventaItems.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const ventaRef = await addDoc(collection(db, "ventas"), {
    tipo: "VENTA",
    clienteNombre: cliente,
    clienteTelefono: tel,
    metodoPago: metodo,
    nota,
    fecha: new Date().toISOString(),
    total,
    items: ventaItems
  });

  popup("Venta registrada 💖");

  ventaItems = [];
  renderVenta();
  modalVenta.classList.add("hidden");
};

// ==================================================
cargarProductos();
renderVenta();
