import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  addDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const grid = document.getElementById("listaRecetas");

// MODAL
const modal = document.getElementById("modalReceta");
const modalTitulo = document.getElementById("modalTitulo");
const modalInsumos = document.getElementById("modalInsumos");
const modalTotal = document.getElementById("modalTotal");
const modalFicha = document.getElementById("modalFicha");

const btnCerrar = document.getElementById("btnCerrarModal");
const btnEditar = document.getElementById("btnEditarReceta");
const btnConvertir = document.getElementById("btnConvertirProducto");

let recetaActualId = null;
let recetaActual = null;

/* ============================================================
   CARGAR RECETAS
============================================================ */
async function cargarRecetas() {
  grid.innerHTML = "";
  const snap = await getDocs(collection(db, "recetas_borrador"));

  if (snap.empty) {
    grid.innerHTML = `<div class="card"><p class="hint">No hay recetas guardadas.</p></div>`;
    return;
  }

  snap.forEach(d => {
    const r = d.data();

    grid.innerHTML += `
      <div class="producto-card">
        <div>
          <div class="producto-nombre">${r.nombre}</div>
          <div class="producto-precio">Costo: $${r.costoTotal.toFixed(2)}</div>
          <div class="hint">${r.items.length} insumos</div>
        </div>

        <div class="producto-actions">
          <button class="btn" onclick="verReceta('${d.id}')">👁 Ver</button>
          <button class="btn btn-delete-pp" onclick="eliminarReceta('${d.id}')">✕</button>
        </div>
      </div>
    `;
  });
}

/* ============================================================
   VER RECETA → MODAL
============================================================ */
window.verReceta = async function (id) {
  const snap = await getDoc(doc(db, "recetas_borrador", id));
  if (!snap.exists()) return;

  recetaActualId = id;
  recetaActual = snap.data();

  modalTitulo.textContent = recetaActual.nombre;
  modalTotal.textContent = recetaActual.costoTotal.toFixed(2);

  // INSUMOS
  recetaActual.items.forEach(i => {

  // COSTO BASE
  if (i.tipo === "base") {
    modalInsumos.innerHTML += `
      <p>
        ⚡ <strong>${i.nombre}</strong><br>
        <span class="hint">
          Costo fijo: $${i.subtotal.toFixed(2)}
        </span>
      </p>
    `;
    return;
  }

  // INSUMO NORMAL
  modalInsumos.innerHTML += `
    <p>
      • ${i.cantidad} × ${i.nombre}<br>
      <span class="hint">
        Unit: $${i.costoUnit.toFixed(2)} — Subtotal: $${i.subtotal.toFixed(2)}
      </span>
    </p>
  `;
});


  // FICHA
  const f = recetaActual.ficha || {};
  modalFicha.innerHTML = `
    ${f.materiales ? `<p><strong>Materiales:</strong> ${f.materiales}</p>` : ""}
    ${f.impresion ? `<p><strong>Impresión:</strong> ${f.impresion}</p>` : ""}
    ${f.corte ? `<p><strong>Corte:</strong> ${f.corte}</p>` : ""}
    ${f.notas ? `<p><strong>Notas:</strong> ${f.notas}</p>` : ""}
  ` || `<p class="hint">Sin ficha técnica</p>`;

  modal.classList.remove("hidden");
};

/* ============================================================
   CERRAR MODAL
============================================================ */
btnCerrar.onclick = () => modal.classList.add("hidden");

/* ============================================================
   ELIMINAR RECETA
============================================================ */
window.eliminarReceta = async function (id) {
  if (!confirm("¿Eliminar esta receta?")) return;
  await deleteDoc(doc(db, "recetas_borrador", id));
  cargarRecetas();
};

/* ============================================================
   EDITAR RECETA → vuelve a costos.html
============================================================ */
btnEditar.onclick = () => {
  localStorage.setItem("recetaEnEdicion", JSON.stringify({
    id: recetaActualId,
    data: recetaActual
  }));
  window.location.href = "costos.html";
};

/* ============================================================
   CONVERTIR EN PRODUCTO
============================================================ */
btnConvertir.onclick = async () => {
  const precio = prompt("Precio de venta del producto:");
  if (!precio) return;

  // Crear producto
  const prodRef = await addDoc(collection(db, "productos"), {
    nombre: recetaActual.nombre,
    precio: Number(precio)
  });

  // Crear receta real
  await setDoc(doc(db, "recetas", prodRef.id), {
    productoId: prodRef.id,
    items: recetaActual.items,
    ficha: recetaActual.ficha || {},
    costoUnitario: recetaActual.costoTotal
  });

  // Borrar borrador
  await deleteDoc(doc(db, "recetas_borrador", recetaActualId));

  modal.classList.add("hidden");
  cargarRecetas();

  alert("Producto creado correctamente ✔");
};

/* ============================================================
   INIT
============================================================ */
cargarRecetas();
