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

let productosCache = {};
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

function getCostoUnitarioInsumo(ins) {
  const cu = toNumber(ins?.costoUnitario);
  if (cu > 0) return cu;

  const pack = toNumber(ins?.costoPaquete ?? ins?.costoUnitario ?? 0);
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
   CARGAR PRODUCTOS (LISTADO COMPACTO)
============================================================ */
async function cargarProductos() {
  grid.innerHTML = "";
  productosCache = {};

  const productosSnap = await getDocs(collection(db, "productos"));
  const recetasSnap = await getDocs(collection(db, "recetas"));

  const recetasMap = {};
  recetasSnap.forEach(r => {
    recetasMap[r.id] = r.data(); // r.id === productoId
  });

  productosSnap.forEach(d => {
    const p = d.data();
    productosCache[d.id] = p;

    const receta = recetasMap[d.id];
    const recetaTxt = receta?.items?.length
      ? `${receta.items.length} insumos`
      : "Sin receta";

    grid.innerHTML += `
      <div class="producto-panel">
        <div class="pp-header">
          <div class="pp-nombre">${p.nombre}</div>
        </div>

        <div class="pp-body">
          <div class="pp-line">
            <span class="label">Costo</span>
            <span class="value muted">calculado</span>
          </div>

          <div class="pp-line">
            <span class="label">Venta</span>
            <span class="value">${money(p.precio)}</span>
          </div>

          <div class="pp-line ganancia">
            <span class="label">Ganancia</span>
            <span class="value">ver detalle</span>
          </div>

          <div class="pp-line hint">
            🧾 Receta: ${recetaTxt}
          </div>
        </div>

        <div class="pp-actions">
          <button class="btn btn-sm" onclick="verProducto('${d.id}')">Ver detalle</button>
          <button class="btn btn-outline btn-sm" onclick="editarProducto('${d.id}')">Editar</button>
        </div>
      </div>
    `;

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
  verCosto.innerHTML = "";
  verGanancia.innerHTML = "";

  const recetaSnap = await getDoc(doc(db, "recetas", id));
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach(i => (insumosMap[i.id] = i.data()));

  let html = "";
  let costoTotal = 0;

  if (recetaSnap.exists()) {
    const receta = recetaSnap.data();

    receta.items?.forEach(item => {
      const ins = insumosMap[item.insumoId];
      if (!ins) return;

      const usado = toNumber(item.cantidad);
      const costoUnit = getCostoUnitarioInsumo(ins);
      const costo = usado * costoUnit;

      costoTotal += costo;

      html += `<p>• ${usado}× ${ins.nombre} — ${money(costo)}</p>`;
      html += `<p class="hint" style="margin-top:-6px;">
        Unit: ${money(costoUnit)}
      </p>`;
    });
  }

  verReceta.innerHTML = html || `<p class="hint">Sin receta asignada.</p>`;
  verCosto.textContent = `Costo unitario: ${money(costoTotal)}`;
  verGanancia.textContent = `Ganancia estimada: ${money(toNumber(p.precio) - costoTotal)}`;

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
  costoBox.innerHTML = "";
  gananciaBox.innerHTML = "";

  const recetaSnap = await getDoc(doc(db, "recetas", productoId));
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach(i => (insumosMap[i.id] = i.data()));

  let html = "";
  let costoTotal = 0;

  if (recetaSnap.exists()) {
    const receta = recetaSnap.data();

    receta.items?.forEach(item => {
      const ins = insumosMap[item.insumoId];
      if (!ins) return;

      const usado = toNumber(item.cantidad);
      const costoUnit = getCostoUnitarioInsumo(ins);
      const subtotal = usado * costoUnit;

      costoTotal += subtotal;
      html += `<p>• ${usado}× ${ins.nombre} — ${money(subtotal)}</p>`;
    });
  }

  recetaDetalle.innerHTML = html || `<p class="hint">Sin receta.</p>`;
  costoBox.innerHTML = `<strong>${money(costoTotal)}</strong>`;

  const precio = toNumber(editPrecio.value);
  gananciaBox.innerHTML = `<strong>${money(precio - costoTotal)}</strong>`;
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
   ELIMINAR PRODUCTO
============================================================ */
window.eliminarProducto = async function (id) {
  if (!confirm("¿Eliminar producto?")) return;

  await deleteDoc(doc(db, "productos", id));
  popup("Producto eliminado 🗑️");
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
