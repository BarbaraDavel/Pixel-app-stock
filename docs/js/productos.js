// js/productos.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ============================================================
   DOM
============================================================ */
const grid = document.getElementById("productosLista");
const btnGuardar = document.getElementById("guardarProd");
const inputNombre = document.getElementById("prodNombre");
const inputPrecio = document.getElementById("prodPrecio");
const inputBuscar = document.getElementById("buscarProducto");

// Modal ver
const modalVer = document.getElementById("verProductoModal");
const verNombre = document.getElementById("verNombre");
const verPrecio = document.getElementById("verPrecio");
const verReceta = document.getElementById("verReceta");
const verCosto = document.getElementById("verCosto");
const verGanancia = document.getElementById("verGanancia");
const verCerrar = document.getElementById("cerrarVerModal");

// Modal editar
const modalEditar = document.getElementById("editarProductoModal");
const editNombre = document.getElementById("editNombre");
const editPrecio = document.getElementById("editPrecio");
const recetaDetalle = document.getElementById("recetaProductoDetalle");
const costoBox = document.getElementById("costoProduccionBox");
const gananciaBox = document.getElementById("gananciaBox");
const btnCancelarEdicion = document.getElementById("cancelarEdicion");
const btnGuardarEdicion = document.getElementById("guardarEdicion");

/* ============================================================
   STATE
============================================================ */
let productosCache = {};
let productosArray = [];
let productoEditandoId = null;

/* ============================================================
   HELPERS
============================================================ */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  return `$${toNumber(n).toFixed(2)}`;
}

function ordenarProductosAZ(arr) {
  return arr.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );
}

function getCostoUnitarioInsumo(ins) {
  const cu = toNumber(ins?.costoUnitario);
  if (cu > 0) return cu;

  const pack = toNumber(ins?.costoPaquete ?? 0);
  const qty = toNumber(ins?.cantidadPaquete ?? 0);
  if (pack > 0 && qty > 0) return pack / qty;

  return 0;
}

/* ============================================================
   POPUP
============================================================ */
function popup(msg) {
  const box = document.getElementById("popupPixel");
  const txt = document.getElementById("popupText");
  txt.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 2000);
}

/* ============================================================
   CARGAR PRODUCTOS
============================================================ */
async function cargarProductos() {
  grid.innerHTML = "";
  productosCache = {};
  productosArray = [];

  const productosSnap = await getDocs(collection(db, "productos"));
  const recetasSnap = await getDocs(collection(db, "recetas"));

  const recetasMap = {};
  recetasSnap.forEach(r => recetasMap[r.id] = r.data());

  productosSnap.forEach(d => {
    const p = d.data();
    productosCache[d.id] = p;

    productosArray.push({
      id: d.id,
      ...p,
      receta: recetasMap[d.id]
    });
  });

  ordenarProductosAZ(productosArray);
  renderProductos(productosArray);
}

/* ============================================================
   RENDER LISTADO
============================================================ */
function renderProductos(arr) {
  grid.innerHTML = "";

  arr.forEach(p => {
    grid.innerHTML += `
      <div class="producto-item" onclick="verProducto('${p.id}')">
        <span class="producto-nombre">${p.nombre}</span>
        <span class="producto-precio">${money(p.precio)}</span>

        <button
          class="btn-icon editar"
          title="Editar"
          onclick="event.stopPropagation(); editarProducto('${p.id}')"
        >✏️</button>
      </div>
    `;
  });
}

/* ============================================================
   BUSCADOR
============================================================ */
if (inputBuscar) {
  inputBuscar.addEventListener("input", () => {
    const q = inputBuscar.value.toLowerCase().trim();

    if (!q) {
      ordenarProductosAZ(productosArray);
      renderProductos(productosArray);
      return;
    }

    const filtrados = productosArray.filter(p =>
      p.nombre.toLowerCase().includes(q)
    );

    ordenarProductosAZ(filtrados);
    renderProductos(filtrados);
  });
}

/* ============================================================
   VER PRODUCTO
============================================================ */
window.verProducto = async function (id) {
  const p = productosCache[id];
  if (!p) return;

  verNombre.textContent = p.nombre;
  verPrecio.textContent = money(p.precio);
  verReceta.innerHTML = "Cargando...";
  verCosto.textContent = "";
  verGanancia.textContent = "";

  const recetaSnap = await getDoc(doc(db, "recetas", id));
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach(i => insumosMap[i.id] = i.data());

  let costoTotal = 0;
  let html = "";

  if (recetaSnap.exists()) {
    recetaSnap.data().items?.forEach(item => {
      const ins = insumosMap[item.insumoId];
      if (!ins) return;

      const usado = toNumber(item.cantidad);
      const unit = getCostoUnitarioInsumo(ins);
      const subtotal = usado * unit;

      costoTotal += subtotal;

      html += `
        <p>• ${usado}× ${ins.nombre} — ${money(subtotal)}</p>
        <p class="hint" style="margin-top:-6px;">Unit: ${money(unit)}</p>
      `;
    });
  }

  verReceta.innerHTML = html || `<p class="hint">Sin receta asignada.</p>`;
  verCosto.textContent = `Costo unitario: ${money(costoTotal)}`;
    const precioVenta = toNumber(p.precio);
  verGanancia.textContent =
    `Ganancia estimada: ${money(precioVenta - costoTotal)}`;


  modalVer.classList.remove("hidden");
};

verCerrar.onclick = () => modalVer.classList.add("hidden");
modalVer.addEventListener("click", e => {
  if (e.target === modalVer) modalVer.classList.add("hidden");
});

/* ============================================================
   EDITAR PRODUCTO
============================================================ */
window.editarProducto = async function (id) {
  const p = productosCache[id];
  if (!p) return;

  productoEditandoId = id;
  editNombre.value = p.nombre;
  editPrecio.value = p.precio;

  modalEditar.classList.remove("hidden");
  await cargarRecetaYCostos(id);
};

btnCancelarEdicion.onclick = () => {
  modalEditar.classList.add("hidden");
  productoEditandoId = null;
};

/* ============================================================
   COSTOS EN EDICIÓN
============================================================ */
async function cargarRecetaYCostos(productoId) {
  recetaDetalle.innerHTML = "Cargando...";
  costoBox.textContent = "";
  gananciaBox.textContent = "";

  const recetaSnap = await getDoc(doc(db, "recetas", productoId));
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach(i => insumosMap[i.id] = i.data());

  let costoTotal = 0;
  let html = "";

  if (recetaSnap.exists()) {
    recetaSnap.data().items?.forEach(item => {
      const ins = insumosMap[item.insumoId];
      if (!ins) return;

      const usado = toNumber(item.cantidad);
      const unit = getCostoUnitarioInsumo(ins);
      const subtotal = usado * unit;

      costoTotal += subtotal;
      html += `<p>• ${usado}× ${ins.nombre} — ${money(subtotal)}</p>`;
    });
  }

  recetaDetalle.innerHTML = html || `<p class="hint">Sin receta.</p>`;
  costoBox.innerHTML = `<strong>${money(costoTotal)}</strong>`;
    const precioVenta = toNumber(editPrecio.value);
  gananciaBox.innerHTML =
    `<strong>${money(precioVenta - costoTotal)}</strong>`;

}

/* ============================================================
   GUARDAR EDICIÓN
============================================================ */
btnGuardarEdicion.onclick = async () => {
  if (!productoEditandoId) return;

  await updateDoc(doc(db, "productos", productoEditandoId), {
    nombre: editNombre.value.trim(),
    precio: toNumber(editPrecio.value)
  });

  popup("Producto actualizado ✔");
  modalEditar.classList.add("hidden");
  productoEditandoId = null;
  cargarProductos();
};

/* ============================================================
   AGREGAR PRODUCTO
============================================================ */
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const precio = toNumber(inputPrecio.value);

  if (!nombre) return alert("Ingresá un nombre");

  await addDoc(collection(db, "productos"), { nombre, precio });

  popup("Producto agregado ✔");
  inputNombre.value = "";
  inputPrecio.value = "";

  cargarProductos();
};

/* ============================================================
   INIT
============================================================ */
cargarProductos();
