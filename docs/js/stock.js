import { db } from "./firebase.js";
import {
  collection, getDocs, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tabla = document.getElementById("stockLista");

async function cargarStock() {
  tabla.innerHTML = "";

  const insumosSnap = await getDocs(collection(db, "insumos"));
  const stockSnap = await getDocs(collection(db, "stock"));

  const insumos = {};
  insumosSnap.forEach((d) => {
    insumos[d.id] = d.data();
  });

  stockSnap.forEach((d) => {
    const stock = d.data();
    const ins = insumos[stock.insumoId];
    if (!ins) return;

    const color =
      stock.stockActual < stock.stockMinimo ? "red" :
      stock.stockActual <= stock.stockMinimo + 3 ? "orange" :
      "green";

    tabla.innerHTML += `
      <tr style="color:${color}">
        <td>${ins.nombre}</td>
        <td>${stock.stockActual}</td>
        <td>${stock.stockMinimo}</td>
        <td>
          <button onclick="sumar('${d.id}', ${stock.stockActual})">+1</button>
          <button onclick="restar('${d.id}', ${stock.stockActual})">-1</button>
        </td>
      </tr>
    `;
  });
}

window.sumar = async function(id, actual) {
  await updateDoc(doc(db, "stock", id), {
    stockActual: actual + 1
  });
  cargarStock();
};

window.restar = async function(id, actual) {
  if (actual === 0) return;
  await updateDoc(doc(db, "stock", id), {
    stockActual: actual - 1
  });
  cargarStock();
};

cargarStock();
