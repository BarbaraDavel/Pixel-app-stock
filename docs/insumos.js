// insumos.js
import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const form = document.getElementById("formInsumo");
const lista = document.getElementById("listaInsumos");

// 📌 AGREGAR INSUMO
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const precio = Number(document.getElementById("precio").value);
    const cantidad = Number(document.getElementById("cantidad").value);

    await addDoc(collection(db, "insumos"), {
        nombre,
        precio,
        cantidad
    });

    form.reset();
    cargarInsumos();
});

// 📌 LEER INSUMOS
async function cargarInsumos() {
    lista.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "insumos"));

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.nombre} — $${data.precio} — ${data.cantidad} unidades`;
        lista.appendChild(li);
    });
}

// cargar al abrir la página
cargarInsumos();
