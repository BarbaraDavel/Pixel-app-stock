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

/* ============================================================
   ELEMENTOS DEL DOM
============================================================ */

const grid = document.getElementById("productosLista");
const btnGuardar = document.getElementById("guardarProd");
const inputNombre = document.getElementById("prodNombre");
const inputPrecio = document.getElementById("prodPrecio");

// Modal ver producto
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

// Cache
let productosCache = {};
let productoEditandoId = null;

/* ============================================================
   POPUP PIXEL
============================================================ */
function popup(msg) {
  const box = document.getElementById("popupPixel");
  const txt = document.getElementById("popupText");
  txt.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 2000);
}

/* ============================================================
   CARGAR PRODUCTOS (AHORA MUESTRA RECETAS + BOTÓN VER)
============================================================ */
async function cargarProductos() {
  grid.innerHTML = "";
  productosCache = {};

  const productosSnap = await getDocs(collection(db, "productos"));
  const recetasSnap = await getDocs(collection(db, "recetas"));

  // Agrupamos recetas por producto
  const recetasPorProducto = {};
  recetasSnap.forEach(r => {
    const data = r.data();
    if (!recetasPorProducto[data.productoId]) recetasPorProducto[data.productoId] = [];
    recetasPorProducto[data.productoId].push(data);
  });

  productosSnap.forEach((d) => {
    const p = d.data();
    productosCache[d.id] = p;

    const recetas = recetasPorProducto[d.id] || [];
    const recetasTxt = recetas.length > 0
      ? `${recetas.length} insumos`
      : "Sin receta";

    grid.innerHTML += `
      <div class="producto-card">
        <div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">$${p.precio}</div>
          <div class="producto-receta hint">Receta: ${recetasTxt}</div>
        </div>

        <div class="producto-actions">
          <button class="btn" onclick="verProducto('${d.id}')">👁 Ver</button>
          <button class="btn btn-outline" onclick="editarProducto('${d.id}')">Editar</button>
          <button class="btn btn-delete-pp" onclick="eliminarProducto('${d.id}')">✕</button>
        </div>
      </div>
    `;
  });
}

/* ============================================================
   FUNCIÓN VER PRODUCTO (NUEVO MODAL)
============================================================ */

window.verProducto = async function (id) {
  const p = productosCache[id];
  if (!p) return;

  verNombre.textContent = p.nombre;
  verPrecio.textContent = "$" + p.precio;

  // cargar recetas y calcular costos
  verReceta.innerHTML = "Cargando...";
  verCosto.textContent = "";
  verGanancia.textContent = "";

  const recetasSnap = await getDocs(
    query(collection(db, "recetas"), where("productoId", "==", id))
  );
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach(i => insumosMap[i.id] = i.data());

  let html = "";
  let costoTotal = 0;

  recetasSnap.forEach((r) => {
    const rec = r.data();
    const ins = insumosMap[rec.insumoId];
    if (!ins) return;

    const usado = Number(rec.cantidadUsada);
    const costo = usado * (Number(ins.costoUnitario) || 0);

    costoTotal += costo;

    html += `<p>• ${usado}× ${ins.nombre} — $${costo}</p>`;
  });

  verReceta.innerHTML = html || `<p class="hint">Sin receta asignada.</p>`;
  verCosto.textContent = "Costo unitario: $" + costoTotal;
  verGanancia.textContent = "Ganancia estimada: $" + (p.precio - costoTotal);

  modalVer.classList.remove("hidden");
};

verCerrar.onclick = () => modalVer.classList.add("hidden");
modalVer.addEventListener("click", e => { if (e.target === modalVer) modalVer.classList.add("hidden") });

/* ============================================================
   EDITAR PRODUCTO
============================================================ */
window.editarProducto = function (id) {
  const p = productosCache[id];
  if (!p) return;

  productoEditandoId = id;
  editNombre.value = p.nombre;
  editPrecio.value = p.precio;

  modalEditar.classList.remove("hidden");
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

/* ============================================================
   CALCULAR RECETAS Y COSTOS EN MODO EDICIÓN
============================================================ */
async function cargarRecetaYCostos(productoId) {
  recetaDetalle.innerHTML = "Cargando...";
  costoBox.innerHTML = "Calculando...";
  gananciaBox.innerHTML = "";

  const recetasSnap = await getDocs(
    query(collection(db, "recetas"), where("productoId", "==", productoId))
  );
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach(i => insumosMap[i.id] = i.data());

  let html = "";
  let costoTotal = 0;

  recetasSnap.forEach((r) => {
    const data = r.data();
    const ins = insumosMap[data.insumoId];
    if (!ins) return;

    const usado = Number(data.cantidadUsada);
    const subtotal = usado * (Number(ins.costoUnitario) || 0);
    costoTotal += subtotal;

    html += `<p>• ${usado}× ${ins.nombre} — $${subtotal}</p>`;
  });

  recetaDetalle.innerHTML = html || `<p class="hint">Sin receta.</p>`;
  costoBox.innerHTML = `<strong>$${costoTotal}</strong>`;

  gananciaBox.innerHTML = `
    <strong>$${(editPrecio.value - costoTotal)}</strong> (por unidad)
  `;
}

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
  const precio = Number(inputPrecio.value);

  if (!nombre) return alert("Ingresá el nombre");

  await addDoc(collection(db, "productos"), { nombre, precio });

  popup("Producto agregado ✔");
  inputNombre.value = "";
  inputPrecio.value = "";
  cargarProductos();
};

/* ============================================================
   INICIO
============================================================ */
cargarProductos();
