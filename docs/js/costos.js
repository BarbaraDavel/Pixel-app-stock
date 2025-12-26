import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tbody = document.getElementById("lineasCostos");
const btnAgregar = document.getElementById("btnAgregarLinea");
const costoTotalEl = document.getElementById("costoTotal");

let insumos = {};
let lineas = [];

// =======================
// Cargar insumos
// =======================
async function cargarInsumos() {
  const snap = await getDocs(collection(db, "insumos"));
  snap.forEach(d => insumos[d.id] = d.data());
}

// =======================
// Agregar línea
// =======================
btnAgregar.onclick = () => {
  const id = Object.keys(insumos)[0];
  lineas.push({ insumoId: id, cantidad: 1 });
  render();
};

// =======================
// Render
// =======================
function render() {
  tbody.innerHTML = "";
  let total = 0;

  lineas.forEach((l, index) => {
    const ins = insumos[l.insumoId];
    if (!ins) return;

    const costoUnit = Number(ins.costoUnitario) || 0;
    const subtotal = l.cantidad * costoUnit;
    total += subtotal;

    tbody.innerHTML += `
      <tr>
        <td>
          <select data-i="${index}" class="selInsumo">
            ${Object.keys(insumos).map(id =>
              `<option value="${id}" ${id === l.insumoId ? "selected" : ""}>
                ${insumos[id].nombre}
              </option>`
            ).join("")}
          </select>
        </td>
        <td>
          <input type="number" min="0.01" step="0.01"
                 data-i="${index}" class="inpCantidad"
                 value="${l.cantidad}">
        </td>
        <td>$${subtotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-outline" onclick="eliminarLinea(${index})">✖</button>
        </td>
      </tr>
    `;
  });

  costoTotalEl.textContent = total.toFixed(2);

  bindEvents();
}

// =======================
// Eventos inputs
// =======================
function bindEvents() {
  document.querySelectorAll(".selInsumo").forEach(sel => {
    sel.onchange = e => {
      lineas[e.target.dataset.i].insumoId = e.target.value;
      render();
    };
  });

  document.querySelectorAll(".inpCantidad").forEach(inp => {
    inp.oninput = e => {
      lineas[e.target.dataset.i].cantidad = Number(e.target.value);
      render();
    };
  });
}

// =======================
// Eliminar línea
// =======================
window.eliminarLinea = (i) => {
  lineas.splice(i, 1);
  render();
};

// =======================
// Init
// =======================
(async function init() {
  await cargarInsumos();
  render();
})();
