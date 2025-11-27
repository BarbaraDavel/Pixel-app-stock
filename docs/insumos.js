import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Referencia a la colección "insumos"
const insumosCol = collection(db, "insumos");

// ------- AGREGAR INSUMO -------
const form = document.getElementById("formInsumo");
const lista = document.getElementById("listaInsumos");

// Guardar en Firestore al enviar formulario
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const precio = Number(document.getElementById("precio").value);
  const cantidad = Number(document.getElementById("cantidad").value);

  try {
    await addDoc(insumosCol, {
      nombre,
      precio,
      cantidad
    });
    alert("🦊 Insumo agregado correctamente!");
    form.reset();
    cargarInsumos();
  } catch (error) {
    console.error("Error agregando insumo:", error);
    alert("Error guardando en Firebase");
  }
});

// ------- LISTAR INSUMOS -------
async function cargarInsumos() {
  lista.innerHTML = ""; // Limpia la lista

  const snapshot = await getDocs(insumosCol);

  snapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");

    li.textContent = `${data.nombre} — $${data.precio} — ${data.cantidad} unidades`;
    lista.appendChild(li);
  });
}

// Cargar al entrar a la página
cargarInsumos();
