import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tabla = document.getElementById("stockLista");

// elementos del modal
const modal = document.getElementById("stockModal");
const modalNombre = document.getElementById("modalNombre");
const modalStockActual = document.getElementById("modalStockActual");
const modalStockMinimo = document.getElementById("modalStockMinimo");
const btnModalGuardar = document.getElementById("modalGuardar");
const btnModalCancelar = document.getElementById("modalCancelar");

let modalStockId = null;
const stockCache = {}; // idStock -> { nombre, stockActual, stockMinimo }

async function cargarStock() {
  tabla.innerHTML = "";

  const insumosSnap = await getDocs(collection(db, "insumos"));
  const stockSnap = await getDocs(collection(db, "stock"));

  const insumos = {};
  insumosSnap.forEach((d) => {
    insumos[d.id] = d.data();
  });

  stockCache.clear;
  for (const d of stockSnap.docs) {
    const stock = d.data();
    const ins = insumos[stock.insumoId];
    if (!ins) continue;

    const actual = stock.stockActual ?? 0;
    const minimo = stock.stockMinimo ?? 5;

    let clase = "stock-ok";
    if (actual < minimo) clase = "stock-low";
    else if (actual <= minimo + 3) clase = "stock-warning";

    stockCache[d.id] = {
      nombre: ins.nombre,
      stockActual: actual,
      stockMinimo: minimo
    };

    tabla.innerHTML += `
      <tr class="${clase}">
        <td>${ins.nombre}</td>
        <td>${actual}</td>
        <td>${minimo}</td>
        <td>
          <button class="btn btn-sm" onclick="sumar('${d.id}', ${actual})">+1</button>
          <button class="btn btn-sm" onclick="restar('${d.id}', ${actual})">-1</button>
          <button class="btn btn-sm btn-outline" onclick="abrirModal('${d.id}')">Editar</button>
        </td>
      </tr>
    `;
  }
}

window.sumar = async function (id, actual) {
  await updateDoc(doc(db, "stock", id), {
    stockActual: actual + 1
  });
  cargarStock();
};

window.restar = async function (id, actual) {
  if (actual === 0) return;
  await updateDoc(doc(db, "stock", id), {
    stockActual: actual - 1
  });
  cargarStock();
};

window.abrirModal = function (id) {
  const data = stockCache[id];
  if (!data) return;

  modalStockId = id;
  modalNombre.textContent = data.nombre;
  modalStockActual.value = data.stockActual;
  modalStockMinimo.value = data.stockMinimo;

  modal.classList.remove("hidden");
};

function cerrarModal() {
  modal.classList.add("hidden");
  modalStockId = null;
}

btnModalCancelar.addEventListener("click", cerrarModal);

btnModalGuardar.addEventListener("click", async () => {
  if (!modalStockId) return;

  const nuevoActual = Number(modalStockActual.value) || 0;
  const nuevoMinimo = Number(modalStockMinimo.value) || 0;

  await updateDoc(doc(db, "stock", modalStockId), {
    stockActual: nuevoActual,
    stockMinimo: nuevoMinimo
  });

  cerrarModal();
  cargarStock();
});

// cerrar modal clickeando afuera
modal.addEventListener("click", (e) => {
  if (e.target === modal) cerrarModal();
});

cargarStock();
