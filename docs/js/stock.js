import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
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

    let color = "stock-ok";
    if (s.actual <= s.minimo) color = "stock-low";
    else if (s.actual - s.minimo <= 3) color = "stock-warning";

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

  const item = stockCache[seleccionado];

  const nuevoActual = Number(modalStockActual.value);
  const nuevoMinimo = Number(modalStockMinimo.value);

  // Calcular diferencia de stock para registrar compra automática
  const diferencia = nuevoActual - item.actual;

  // Actualizar stock en Firestore
  await updateDoc(doc(db, "stock", seleccionado), {
    actual: nuevoActual,
    minimo: nuevoMinimo
  });

  // Si aumentó → registrar COMPRA automáticamente en movimientos_stock
  if (diferencia > 0) {
    await addDoc(collection(db, "movimientos_stock"), {
      tipo: "COMPRA",
      insumoId: seleccionado,
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

cargarStock();
