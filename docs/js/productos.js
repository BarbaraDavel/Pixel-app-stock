import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("productosLista");
const btn = document.getElementById("guardarProd");
const inputNombre = document.getElementById("prodNombre");
const inputPrecio = document.getElementById("prodPrecio");

async function cargarProductos() {
  lista.innerHTML = "";

  const snap = await getDocs(collection(db, "productos"));

  snap.forEach((d) => {
    const p = d.data();

    lista.innerHTML += `
      <div class="producto-card">
        <div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">$${p.precio}</div>
        </div>

        <button class="btn btn-primary" onclick="vender('${p.nombre}', ${p.precio})">
          💸 Vender
        </button>
      </div>
    `;
  });
}

window.vender = async function (nombre, precio) {
  await addDoc(collection(db, "ventas"), {
    nombre,
    precio,
    fecha: new Date().toISOString()
  });

  alert("Venta registrada 💖");
};

btn.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const precio = Number(inputPrecio.value) || 0;

  if (!nombre) {
    alert("Ingresá un nombre");
    return;
  }

  await addDoc(collection(db, "productos"), { nombre, precio });

  inputNombre.value = "";
  inputPrecio.value = "";

  cargarProductos();
};

cargarProductos();
