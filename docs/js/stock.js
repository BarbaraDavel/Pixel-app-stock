import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tabla = document.getElementById("stockLista");

// modal
const modal = document.getElementById("stockModal");
const modalNombre = document.getElementById("modalNombre");
const modalStockActual = document.getElementById("modalStockActual");
const modalStockMinimo = document.getElementById("modalStockMinimo");
const btnModalGuardar = document.getElementById("modalGuardar");
const btnModalCancelar = document.getElementById("modalCancelar");

let modalStockId = null;
let stockCache = {};

async function cargarStock() {
  tabla.innerHTML = "";
  stockCache = {};

  const insSnap = await getDocs(collection(db, "insumos"));
  const stockSnap = await getDocs(collection(db, "stock"));

  const insumos = {};
  insSnap.forEach((d) => insumos[d.id] = d.data());

  stockSnap.forEach((d) => {
    const st = d.data();
    const ins = insumos[st.insumoId];
    if (!ins) return;

    const actual = st.stockActual ?? 0;
    const minimo = st.stockMinimo ?? 5;

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
  });
}

window.sumar = async (id, actual) => {
  await updateDoc(doc(db, "stock", id), { stockActual: actual + 1 });
  cargarStock();
};

window.restar = async (id, actual) => {
  if (actual === 0) return;
  await updateDoc(doc(db, "stock", id), { stockActual: actual - 1 });
  cargarStock();
};

window.abrirModal = (id) => {
  const data = stockCache[id];
  modalStockId = id;

  modalNombre.textContent = data.nombre;
  modalStockActual.value = data.stockActual;
  modalStockMinimo.value = data.stockMinimo;

  modal.classList.remove("hidden");
};

btnModalCancelar.onclick = () => modal.classList.add("hidden");

btnModalGuardar.onclick = async () => {
  await updateDoc(doc(db, "stock", modalStockId), {
    stockActual: Number(modalStockActual.value),
    stockMinimo: Number(modalStockMinimo.value)
  });

  modal.classList.add("hidden");
  cargarStock();
};

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

cargarStock();
