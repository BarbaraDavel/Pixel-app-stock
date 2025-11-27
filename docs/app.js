import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

console.log("Firebase cargado correctamente ✔️");

// ========= AGREGAR INSUMO =========
const form = document.getElementById("formInsumo");
const lista = document.getElementById("listaInsumos");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const precio = Number(document.getElementById("precio").value);
    const cantidad = Number(document.getElementById("cantidad").value);

    try {
      await addDoc(collection(db, "insumos"), {
        nombre,
        precio,
        cantidad
      });

      alert("Insumo agregado correctamente ✔️");
      form.reset();
      cargarInsumos();

    } catch (err) {
      console.error("❌ Error al guardar:", err);
    }
  });
}

// ========= CARGAR INSUMOS =========
async function cargarInsumos() {
  lista.innerHTML = "";

  const snap = await getDocs(collection(db, "insumos"));

  snap.forEach((doc) => {
    const d = doc.data();
    const li = document.createElement("li");
    li.textContent = `${d.nombre} — $${d.precio} — ${d.cantidad} unidades`;
    lista.appendChild(li);
  });
}

cargarInsumos();
