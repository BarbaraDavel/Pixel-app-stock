// ================================================
//   RECETAS.JS – SISTEMA CON FICHA TÉCNICA
// ================================================
import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ==========================
//   ELEMENTOS DEL DOM
// ==========================
const selProducto = document.getElementById("recetaProducto");
const selInsumo = document.getElementById("recetaInsumo");
const inputCantidad = document.getElementById("recetaCantidad");
const btnGuardar = document.getElementById("guardarReceta");
const lista = document.getElementById("listaRecetas");

// ---------- Modal ----------
const modal = document.getElementById("modalReceta");
const modalTitulo = document.getElementById("modalRecetaTitulo");
const modalItems = document.getElementById("modalRecetaItems");
const btnAgregarInsumo = document.getElementById("btnAgregarInsumo");
const btnGuardarReceta = document.getElementById("btnGuardarReceta");
const btnCerrarReceta = document.getElementById("btnCerrarReceta");

// ---------- Ficha técnica ----------
const inputMateriales = document.getElementById("recetaMateriales");
const inputImpresion  = document.getElementById("recetaImpresion");
const inputCorte      = document.getElementById("recetaCorte");
const inputNotas      = document.getElementById("recetaNotas");

// ==========================
//   VARIABLES GLOBALES
// ==========================
let productos = {};
let insumos = {};
let recetas = {};
let recetaEditandoId = null;

// =================================================
//   POPUP
// =================================================
function popup(msg) {
  console.log(msg);
}

// =================================================
//   CARGAR PRODUCTOS E INSUMOS
// =================================================
async function cargarSelects() {
  selProducto.innerHTML = "";
  selInsumo.innerHTML = "";

  const snapProd = await getDocs(collection(db, "productos"));
  snapProd.forEach(p => {
    productos[p.id] = p.data();
    selProducto.innerHTML += `<option value="${p.id}">${p.data().nombre}</option>`;
  });

  const snapIns = await getDocs(collection(db, "insumos"));
  snapIns.forEach(i => {
    insumos[i.id] = i.data();
    selInsumo.innerHTML += `<option value="${i.id}">${i.data().nombre}</option>`;
  });
}

// =================================================
//   AGREGAR INSUMO A RECETA
// =================================================
btnGuardar.addEventListener("click", async () => {
  const productoId = selProducto.value;
  const insumoId = selInsumo.value;
  const cantidad = Number(inputCantidad.value);

  if (!productoId || !insumoId || !cantidad || cantidad <= 0) {
    alert("Completá todos los campos correctamente.");
    return;
  }

  const recetaRef = doc(db, "recetas", productoId);
  const recetaSnap = await getDoc(recetaRef);

  let datos = { productoId, items: [], ficha: {} };

  if (recetaSnap.exists()) {
    datos = recetaSnap.data();
  }

  datos.items.push({ insumoId, cantidad });

  await setDoc(recetaRef, datos);
  popup("Receta agregada ✔");
  inputCantidad.value = "";
  cargarRecetas();
});

// =================================================
//   CARGAR RECETAS
// =================================================
async function cargarRecetas() {
  lista.innerHTML = "";
  recetas = {};

  const snap = await getDocs(collection(db, "recetas"));
  snap.forEach(r => recetas[r.id] = r.data());

  renderRecetas();
}

function renderRecetas() {
  lista.innerHTML = "";

  Object.keys(recetas).forEach(productoId => {
    const receta = recetas[productoId];
    const nombreProd = productos[productoId]?.nombre || "(producto eliminado)";
    const cantItems = receta.items?.length || 0;

    lista.innerHTML += `
      <tr>
        <td>${nombreProd}</td>
        <td>${cantItems} insumos</td>
        <td>
          <button class="btn btn-primary" onclick="editarReceta('${productoId}')">Ver / Editar</button>
          <button class="btn btn-outline" onclick="eliminarReceta('${productoId}')">Eliminar</button>
        </td>
      </tr>
    `;
  });
}

// =================================================
//   ELIMINAR RECETA
// =================================================
window.eliminarReceta = async (productoId) => {
  if (!confirm("¿Eliminar toda la receta?")) return;
  await deleteDoc(doc(db, "recetas", productoId));
  popup("Receta eliminada ✔");
  cargarRecetas();
};

// =================================================
//   EDITAR RECETA
// =================================================
window.editarReceta = (productoId) => {
  recetaEditandoId = productoId;
  const receta = recetas[productoId];

  modalTitulo.textContent = "Editar receta – " + (productos[productoId]?.nombre || "");

  renderModalItems(receta.items || []);

  const ficha = receta.ficha || {};
  inputMateriales.value = ficha.materiales || "";
  inputImpresion.value  = ficha.impresion || "";
  inputCorte.value      = ficha.corte || "";
  inputNotas.value      = ficha.notas || "";

  modal.classList.remove("hidden");
};

// =================================================
//   RENDER MODAL INSUMOS
// =================================================
function renderModalItems(items) {
  modalItems.innerHTML = "";

  items.forEach((item, index) => {
    modalItems.innerHTML += `
      <tr>
        <td>
          <select data-index="${index}" class="selInsumoModal input-pixel">
            ${Object.keys(insumos).map(id =>
              `<option value="${id}" ${id === item.insumoId ? "selected" : ""}>
                ${insumos[id].nombre}
              </option>`
            ).join("")}
          </select>
        </td>
        <td>
          <input type="number" min="1" data-index="${index}"
            class="cantInsumoModal input-pixel" value="${item.cantidad}">
        </td>
        <td>
          <button class="btn btn-outline" onclick="eliminarLineaReceta(${index})">✖</button>
        </td>
      </tr>
    `;
  });
}

// =================================================
//   AGREGAR / ELIMINAR LINEA
// =================================================
btnAgregarInsumo.addEventListener("click", () => {
  recetas[recetaEditandoId].items.push({
    insumoId: Object.keys(insumos)[0],
    cantidad: 1
  });
  renderModalItems(recetas[recetaEditandoId].items);
});

window.eliminarLineaReceta = (index) => {
  recetas[recetaEditandoId].items.splice(index, 1);
  renderModalItems(recetas[recetaEditandoId].items);
};

// =================================================
//   GUARDAR MODAL
// =================================================
btnGuardarReceta.addEventListener("click", async () => {
  const items = recetas[recetaEditandoId].items;

  document.querySelectorAll(".selInsumoModal").forEach(sel => {
    const i = Number(sel.dataset.index);
    items[i].insumoId = sel.value;
  });

  document.querySelectorAll(".cantInsumoModal").forEach(inp => {
    const i = Number(inp.dataset.index);
    items[i].cantidad = Number(inp.value);
  });

  const ficha = {
    materiales: inputMateriales.value.trim(),
    impresion:  inputImpresion.value.trim(),
    corte:      inputCorte.value.trim(),
    notas:      inputNotas.value.trim()
  };

  await updateDoc(doc(db, "recetas", recetaEditandoId), { items, ficha });

  popup("Receta actualizada ✔");
  modal.classList.add("hidden");
  cargarRecetas();
});

// =================================================
//   CERRAR MODAL
// =================================================
btnCerrarReceta.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// =================================================
//   INIT
// =================================================
(async function init() {
  await cargarSelects();
  await cargarRecetas();
})();
