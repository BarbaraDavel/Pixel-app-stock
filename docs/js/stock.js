import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
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
let seleccionado = null;

async function cargarStock() {
  tbody.innerHTML = "";
  stockCache = {};

  const snap = await getDocs(collection(db, "stock"));

  snap.forEach((d) => {
    const s = d.data();
    stockCache[d.id] = s;

    let color = "green";
    if (s.actual <= s.minimo) color = "red";
    else if (s.actual - s.minimo <= 3) color = "orange";

    tbody.innerHTML += `
      <tr>
        <td>${s.nombre}</td>
        <td class="${color}">${s.actual}</td>
        <td>${s.minimo}</td>
        <td>
          <button onclick="abrirModal('${d.id}')" class="btn btn-sm">Editar</button>
        </td>
      </tr>
    `;
  });
}

window.abrirModal = function (id) {
  seleccionado = id;
  const item = stockCache[id];

  modalNombre.textContent = item.nombre;
  modalStockActual.value = item.actual;
  modalStockMinimo.value = item.minimo;

  modal.classList.remove("hidden");
};

btnModalCancelar.onclick = () => modal.classList.add("hidden");

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

btnModalGuardar.onclick = async () => {
  if (!seleccionado) return;

  await updateDoc(doc(db, "stock", seleccionado), {
    actual: Number(modalStockActual.value),
    minimo: Number(modalStockMinimo.value)
  });

  modal.classList.add("hidden");
  cargarStock();
};

cargarStock();
