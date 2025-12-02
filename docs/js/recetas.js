// js/recetas.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const selProducto = document.getElementById("recetaProducto");
const selInsumo   = document.getElementById("recetaInsumo");
const inputCantidad = document.getElementById("recetaCantidad");
const btnGuardar  = document.getElementById("guardarReceta");
const lista       = document.getElementById("listaRecetas");

function popup(msg) {
  const box = document.getElementById("popupPixel");
  const txt = document.getElementById("popupText");
  if (!box || !txt) {
    alert(msg);
    return;
  }
  txt.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 1600);
}

let productos = {}; // idProducto -> data
let insumos   = {}; // idInsumo   -> data
let recetas   = []; // cache de recetas

// ============================
// Cargar selects (productos / insumos)
// ============================
async function cargarSelects() {
  selProducto.innerHTML = "";
  selInsumo.innerHTML = "";

  // Productos
  const snapProd = await getDocs(collection(db, "productos"));
  snapProd.forEach(p => {
    const data = p.data();
    productos[p.id] = data;
    selProducto.innerHTML += `<option value="${p.id}">${data.nombre}</option>`;
  });

  // Insumos
  const snapIns = await getDocs(collection(db, "insumos"));
  snapIns.forEach(i => {
    const data = i.data();
    insumos[i.id] = data;
    selInsumo.innerHTML += `<option value="${i.id}">${data.nombre}</option>`;
  });
}

// ============================
// Cargar recetas
// ============================
async function cargarRecetas() {
  lista.innerHTML = "";
  recetas = [];

  const snap = await getDocs(collection(db, "recetas"));

  snap.forEach(r => {
    recetas.push({ id: r.id, ...r.data() });
  });

  // Ordenar por producto
  recetas.sort((a, b) => {
    const pa = productos[a.productoId]?.nombre || "";
    const pb = productos[b.productoId]?.nombre || "";
    return pa.localeCompare(pb);
  });

  renderRecetas();
}

function renderRecetas() {
  lista.innerHTML = "";

  recetas.forEach(r => {
    const prod = productos[r.productoId]?.nombre || "-";
    const ins  = insumos[r.insumoId]?.nombre   || "-";

    lista.innerHTML += `
      <tr>
        <td>${prod}</td>
        <td>${ins}</td>
        <td>${r.cantidadUsada}</td>
        <td>
          <button class="boton-eliminar" onclick="eliminarReceta('${r.id}')">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });
}

window.eliminarReceta = async function (id) {
  await deleteDoc(doc(db, "recetas", id));
  popup("Receta eliminada 💔");
  cargarRecetas();
};

// ============================
// Guardar receta
// ============================
btnGuardar.onclick = async () => {
  const prodId = selProducto.value;
  const insId  = selInsumo.value;
  const cant   = Number(inputCantidad.value);

  if (!prodId || !insId || !cant || cant <= 0) {
    alert("Completá todos los campos con una cantidad válida.");
    return;
  }

  await addDoc(collection(db, "recetas"), {
    productoId: prodId,
    insumoId: insId,
    cantidadUsada: cant
  });

  popup("Receta agregada ✨");

  inputCantidad.value = "";
  await cargarRecetas();
};

// ============================
// INIT
// ============================
(async function init() {
  await cargarSelects();
  await cargarRecetas();
})();
