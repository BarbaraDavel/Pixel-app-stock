// app.js — Funciones generales de Pixel Stock

import {
  db,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "../firebase.js";


// =================== INSUMOS =======================

const form = document.getElementById("formInsumo");
const lista = document.getElementById("listaInsumos");

// ---- AGREGAR INSUMO ----
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const precio = Number(document.getElementById("precio").value);
    const cantidad = Number(document.getElementById("cantidad").value);

    await addDoc(collection(db, "insumos"), {
      nombre,
      precio,
      cantidad
    });

    alert("Insumo agregado!");
    form.reset();
    cargarInsumos();
  });
}

// ---- LISTAR INSUMOS ----
async function cargarInsumos() {
  if (!lista) return;

  lista.innerHTML = "Cargando...";

  const querySnapshot = await getDocs(collection(db, "insumos"));
  lista.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${data.nombre}</strong><br>
      Precio: ${data.precio} – Cantidad: ${data.cantidad}<br>
      <button data-id="${docSnap.id}" class="btn-delete">🗑 Eliminar</button>
    `;

    lista.appendChild(li);
  });

  // Evento eliminar
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await deleteDoc(doc(db, "insumos", id));
      cargarInsumos();
    });
  });
}


// Ejecutar si estamos en la página de insumos
if (window.location.pathname.includes("insumos")) {
  cargarInsumos();
}
