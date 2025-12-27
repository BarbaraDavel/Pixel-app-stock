// js/costos.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ============================================================
   DOM
============================================================ */
const tbody = document.getElementById("lineasCostos");
const btnAgregar = document.getElementById("btnAgregarLinea");
const costoTotalEl = document.getElementById("costoTotal");
const btnGuardarReceta = document.getElementById("btnGuardarReceta");
const nombreProductoInput = document.getElementById("nombreProducto");

/* ============================================================
   STATE
============================================================ */
let insumos = {};
let lineas = [];

/* ============================================================
   HELPERS
============================================================ */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Devuelve el costo unitario REAL del insumo.
 * Soporta datos nuevos y viejos sin romper nada.
 */
function getCostoUnitarioReal(ins) {
  const cantidadPaquete = toNumber(ins.cantidadPaquete);
  const costoPaquete = toNumber(ins.costoPaquete);
  const costoUnitarioGuardado = toNumber(ins.costoUnitario);

  // Caso nuevo correcto
  if (costoPaquete > 0 && cantidadPaquete > 0) {
    return costoPaquete / cantidadPaquete;
  }

  // Caso viejo: costoUnitario era el pack
  if (cantidadPaquete > 0 && costoUnitarioGuardado > 0) {
    return costoUnitarioGuardado / cantidadPaquete;
  }

  // Caso unitario real
  return costoUnitarioGuardado;
}

/* ============================================================
   CARGAR INSUMOS
============================================================ */
async function cargarInsumos() {
  insumos = {};
  const snap = await getDocs(collection(db, "insumos"));
  snap.forEach(d => (insumos[d.id] = d.data()));
}

/* ============================================================
   AGREGAR LÍNEA
============================================================ */
btnAgregar.onclick = () => {
  const ids = Object.keys(insumos);
  if (!ids.length) {
    alert("No hay insumos cargados.");
    return;
  }

  lineas.push({ insumoId: ids[0], cantidad: 1 });
  render();
};

/* ============================================================
   RENDER
============================================================ */
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

    // Hint informativo
    let hint = `Unit: $${unit.toFixed(2)}`;
    if (ins.costoPaquete && ins.cantidadPaquete) {
      hint = `Unit: $${unit.toFixed(2)} (pack: $${ins.costoPaquete} / ${ins.cantidadPaquete})`;
    }

    tbody.innerHTML += `
      <tr>
        <td>
          <select data-i="${index}" class="selInsumo">
            ${Object.keys(insumos)
              .map(id =>
                `<option value="${id}" ${id === l.insumoId ? "selected" : ""}>
                  ${insumos[id].nombre}
                </option>`
              )
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

/* ============================================================
   EVENTS
============================================================ */
function bindEvents() {
  document.querySelectorAll(".selInsumo").forEach(sel => {
    sel.onchange = e => {
      lineas[e.target.dataset.i].insumoId = e.target.value;
      render();
    };
  });

  document.querySelectorAll(".inpCantidad").forEach(inp => {
    inp.oninput = e => {
      lineas[e.target.dataset.i].cantidad = toNumber(e.target.value);
      render();
    };
  });
}

/* ============================================================
   ELIMINAR LÍNEA
============================================================ */
window.eliminarLinea = (i) => {
  lineas.splice(i, 1);
  render();
};

/* ============================================================
   GUARDAR RECETA BORRADOR
============================================================ */
btnGuardarReceta.onclick = async () => {
  const nombre = nombreProductoInput.value.trim();

  if (!nombre) {
    alert("Poné un nombre para la receta");
    return;
  }

  if (!lineas.length) {
    alert("Agregá al menos un insumo");
    return;
  }

  const items = lineas.map(l => {
    const ins = insumos[l.insumoId];
    const unit = getCostoUnitarioReal(ins);
    const subtotal = l.cantidad * unit;

    return {
      insumoId: l.insumoId,
      nombre: ins.nombre,
      cantidad: l.cantidad,
      costoUnit: unit,
      subtotal
    };
  });

  const costoTotal = items.reduce((a, i) => a + i.subtotal, 0);

  await addDoc(collection(db, "recetas_borrador"), {
    nombre,
    items,
    costoTotal,
    creadaEn: serverTimestamp()
  });

  alert("Receta guardada ✔️");

  nombreProductoInput.value = "";
  lineas = [];
  render();
};


/* ============================================================
   INIT
============================================================ */
(async function init() {
  await cargarInsumos();
  render();
})();

const COSTOS_BASE_PIXEL = [
  { nombre: "Tinta y electricidad", costo: 200 },
  { nombre: "Tiempo y diseño", costo: 200 }
];
