// js/recetas_borrador.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const grid = document.getElementById("listaRecetas");

/* ============================================================
   CARGAR RECETAS
============================================================ */
async function cargarRecetas() {
  grid.innerHTML = "";

  const snap = await getDocs(collection(db, "recetas_borrador"));

  if (snap.empty) {
    grid.innerHTML = `
      <div class="card">
        <p class="hint">Todavía no guardaste ninguna receta.</p>
      </div>
    `;
    return;
  }

  snap.forEach(d => {
    const r = d.data();

    grid.innerHTML += `
      <div class="producto-card">
        <div>
          <div class="producto-nombre">${r.nombre}</div>
          <div class="producto-precio">Costo: $${(r.costoTotal || 0).toFixed(2)}</div>
          <div class="hint">${r.items?.length || 0} insumos</div>
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
   VER RECETA (alert simple por ahora)
============================================================ */
window.verReceta = async function (id) {
  const snap = await getDocs(collection(db, "recetas_borrador"));
  const receta = snap.docs.find(d => d.id === id)?.data();
  if (!receta) return;

  let txt = `🧾 ${receta.nombre}\n\n`;

  receta.items.forEach(i => {
    txt += `• ${i.cantidad} × ${i.insumoId} → $${i.subtotal.toFixed(2)}\n`;
  });

  txt += `\nTOTAL: $${receta.costoTotal.toFixed(2)}`;

  alert(txt);
};

/* ============================================================
   ELIMINAR RECETA
============================================================ */
window.eliminarReceta = async function (id) {
  if (!confirm("¿Eliminar esta receta?")) return;

  await deleteDoc(doc(db, "recetas_borrador", id));
  cargarRecetas();
};

/* ============================================================
   INIT
============================================================ */
cargarRecetas();
