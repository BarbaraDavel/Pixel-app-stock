import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// UI refs
const selProducto = document.getElementById("recetaProducto");
const selInsumo = document.getElementById("recetaInsumo");
const inputCantidad = document.getElementById("recetaCantidad");
const btnGuardar = document.getElementById("guardarReceta");
const lista = document.getElementById("listaRecetas");

// para popup
function popup(msg) {
  const box = document.getElementById("popupPixel");
  const txt = document.getElementById("popupText");

  txt.textContent = msg;
  box.classList.remove("hidden");

  setTimeout(() => box.classList.add("hidden"), 2000);
}

let productos = {};
let insumos = {};
let recetas = [];

// =============================
// Cargar productos e insumos
// =============================
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

// =============================
// Cargar recetas
// =============================
async function cargarRecetas() {
  lista.innerHTML = "";
  recetas = [];

  const snap = await getDocs(collection(db, "recetas"));
  snap.forEach(r => {
    const data = r.data();
    recetas.push({ id: r.id, ...data });

    lista.innerHTML += `
      <tr>
        <td>${productos[data.productoId]?.nombre || "-"}</td>
        <td>${insumos[data.insumoId]?.nombre || "-"}</td>
        <td>${data.cantidadUsada}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="eliminarReceta('${r.id}')">✕</button>
        </td>
      </tr>
    `;
  });
}

window.eliminarReceta = async function(id) {
  await deleteDoc(doc(db, "recetas", id));
  popup("Receta eliminada 💔");
  cargarRecetas();
};

// =============================
// Guardar receta
// =============================
btnGuardar.onclick = async () => {
  const prodId = selProducto.value;
  const insId = selInsumo.value;
  const cant = Number(inputCantidad.value);

  if (!prodId || !insId || !cant) {
    alert("Completá todos los campos");
    return;
  }

  await addDoc(collection(db, "recetas"), {
    productoId: prodId,
    insumoId: insId,
    cantidadUsada: cant
  });

  popup("Receta agregada ✨");

  inputCantidad.value = "";
  cargarRecetas();
};

// =============================
cargarSelects();
cargarRecetas();
