import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tbody = document.getElementById("stockLista");

// Modal
const modal = document.getElementById("stockModal");
const modalNombre = document.getElementById("modalNombre");
const modalStockActual = document.getElementById("modalStockActual");
const modalStockMinimo = document.getElementById("modalStockMinimo");
const btnModalCancelar = document.getElementById("modalCancelar");
const btnModalGuardar = document.getElementById("modalGuardar");

let stockCache = {};
let insumosMap = {};
let seleccionado = null;

// =========================
// CARGAR STOCK
// =========================
async function cargarStock() {
  tbody.innerHTML = "";
  stockCache = {};

  // Traer insumos
  const insSnap = await getDocs(collection(db, "insumos"));
  insumosMap = {};
  insSnap.forEach(i => insumosMap[i.id] = i.data());

  // Traer stock
  const stockSnap = await getDocs(collection(db, "stock"));
  stockSnap.forEach((d) => {
    const s = d.data();
    stockCache[d.id] = { id: d.id, ...s };

    const ins = insumosMap[s.insumoId];
    const nombre = ins?.nombre || "(sin nombre)";

    const actual = s.stockActual ?? 0;
    const minimo = s.stockMinimo ?? 0;

    let color = "stock-ok";
    if (actual <= minimo) color = "stock-low";
    else if (actual - minimo <= 3) color = "stock-warning";

    tbody.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td class="${color}">${actual}</td>
        <td>${minimo}</td>
        <td>
          <button onclick="abrirModal('${d.id}')" class="btn btn-sm">Editar</button>
        </td>
      </tr>
    `;
  });
}

// =========================
// MODAL
// =========================
window.abrirModal = function (id) {
  seleccionado = id;
  const item = stockCache[id];

  const ins = insumosMap[item.insumoId];
  modalNombre.textContent = ins?.nombre || "(sin nombre)";

  modalStockActual.value = item.stockActual ?? 0;
  modalStockMinimo.value = item.stockMinimo ?? 0;

  modal.classList.remove("hidden");
};

btnModalCancelar.onclick = () => modal.classList.add("hidden");

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =========================
// GUARDAR CAMBIOS
// =========================
btnModalGuardar.onclick = async () => {
  if (!seleccionado) return;

  const item = stockCache[seleccionado];

  const nuevoActual = Number(modalStockActual.value);
  const nuevoMinimo = Number(modalStockMinimo.value);

  const diferencia = nuevoActual - (item.stockActual ?? 0);

  await updateDoc(doc(db, "stock", seleccionado), {
    stockActual: nuevoActual,
    stockMinimo: nuevoMinimo
  });

  // Si hubo aumento → registrar compra automática
  if (diferencia > 0) {
    await addDoc(collection(db, "movimientos_stock"), {
      tipo: "COMPRA",
      insumoId: item.insumoId,
      cantidad: diferencia,
      costoUnit: 0,
      costoTotal: 0,
      fecha: new Date().toISOString(),
      nota: "Actualización desde módulo Stock"
    });
  }

  modal.classList.add("hidden");
  cargarStock();
};

// =========================
cargarStock();
