import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tbody = document.getElementById("lineasCostos");
const btnAgregar = document.getElementById("btnAgregarLinea");
const costoTotalEl = document.getElementById("costoTotal");

let insumos = {};
let lineas = [];

// =======================
// Helpers
// =======================
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Devuelve el costo unitario REAL, aunque el insumo venga con datos viejos.
 *
 * Soporta 3 casos:
 * 1) Nuevo: { costoPaquete, cantidadPaquete } => costoPaquete / cantidadPaquete
 * 2) Viejo: { costoUnitario (pero era pack), cantidadPaquete } => costoUnitario / cantidadPaquete
 * 3) Unitario real: { costoUnitario } sin cantidadPaquete => costoUnitario
 */
function getCostoUnitarioReal(ins) {
  const cantidadPaquete = toNumber(ins.cantidadPaquete);
  const costoPaquete = toNumber(ins.costoPaquete);

  // Caso nuevo: costoPaquete y cantidadPaquete
  if (costoPaquete > 0 && cantidadPaquete > 0) {
    return costoPaquete / cantidadPaquete;
  }

  // Caso viejo: costoUnitario era pack y hay cantidadPaquete
  const costoUnitarioGuardado = toNumber(ins.costoUnitario);
  if (cantidadPaquete > 0 && costoUnitarioGuardado > 0) {
    // si no hay costoPaquete, interpretamos costoUnitario como pack
    return costoUnitarioGuardado / cantidadPaquete;
  }

  // Caso unitario real (sin pack)
  return costoUnitarioGuardado;
}

// =======================
// Cargar insumos
// =======================
async function cargarInsumos() {
  insumos = {};
  const snap = await getDocs(collection(db, "insumos"));
  snap.forEach(d => (insumos[d.id] = d.data()));
}

// =======================
// Agregar línea
// =======================
btnAgregar.onclick = () => {
  const ids = Object.keys(insumos);
  if (!ids.length) {
    alert("No hay insumos cargados.");
    return;
  }

  const id = ids[0];
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

    const unit = getCostoUnitarioReal(ins);
    const cant = toNumber(l.cantidad);
    const subtotal = cant * unit;
    total += subtotal;

    const cantidadPaquete = toNumber(ins.cantidadPaquete);
    const costoPaquete = toNumber(ins.costoPaquete);
    const costoUnitarioGuardado = toNumber(ins.costoUnitario);

    // Texto de ayuda (solo para que vos veas qué está usando)
    let hint = "";
    if (costoPaquete > 0 && cantidadPaquete > 0) {
      hint = `Unit: $${unit.toFixed(2)} (pack: $${costoPaquete.toFixed(2)} / ${cantidadPaquete})`;
    } else if (cantidadPaquete > 0 && costoUnitarioGuardado > 0) {
      hint = `Unit: $${unit.toFixed(2)} (compat: $${costoUnitarioGuardado.toFixed(2)} / ${cantidadPaquete})`;
    } else {
      hint = `Unit: $${unit.toFixed(2)}`;
    }

    tbody.innerHTML += `
      <tr>
        <td>
          <select data-i="${index}" class="selInsumo">
            ${Object.keys(insumos)
              .map(id => {
                const selected = id === l.insumoId ? "selected" : "";
                return `<option value="${id}" ${selected}>${insumos[id].nombre}</option>`;
              })
              .join("")}
          </select>
          <div class="hint" style="margin-top:6px;">${hint}</div>
        </td>
        <td>
          <input type="number" min="0" step="0.01"
                 data-i="${index}" class="inpCantidad"
                 value="${cant}">
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
