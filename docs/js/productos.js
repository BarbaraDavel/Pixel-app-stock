import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
  addDoc as addVenta
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaProductos");
const btn = document.getElementById("guardarProd");

async function cargarProductos() {
  lista.innerHTML = "";
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach((d) => {
    const p = d.data();
    lista.innerHTML += `
      <tr>
        <td>${p.nombre}</td>
        <td>$${p.precio}</td>
        <td><button onclick="vender('${p.nombre}', ${p.precio})">Vender</button></td>
      </tr>
    `;
  });
}

window.vender = async function(nombre, precio) {
  await addDoc(collection(db, "ventas"), {
    nombre,
    precio,
    fecha: new Date().toISOString()
  });
  alert("Venta registrada");
};

btn.onclick = async () => {
  const nombre = document.getElementById("prodNombre").value;
  const precio = Number(document.getElementById("prodPrecio").value);

  await addDoc(collection(db, "productos"), { nombre, precio });
  cargarProductos();
};

cargarProductos();
