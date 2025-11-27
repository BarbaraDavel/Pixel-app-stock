import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaInsumos");
const btnGuardar = document.getElementById("guardarInsumo");

let editId = null; // si estás editando, sino null

async function cargarInsumos() {
  lista.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "insumos"));
  querySnapshot.forEach((d) => {
    const ins = d.data();
    lista.innerHTML += `
      <tr>
        <td>${ins.nombre}</td>
        <td>$${ins.costoUnitario}</td>
        <td>${ins.stock}</td>
        <td>${ins.stockMinimo}</td>
        <td>
          <button onclick="editarInsumo('${d.id}', '${ins.nombre}', ${ins.costoUnitario}, ${ins.stock}, ${ins.stockMinimo})">Editar</button>
          <button onclick="descontar('${d.id}', ${ins.stock})">Usar 1</button>
          <button onclick="sumar('${d.id}', ${ins.stock})">+1</button>
        </td>
      </tr>
    `;
  });
}

window.editarInsumo = function(id, n, c, s, m) {
  editId = id;
  document.getElementById("insumoNombre").value = n;
  document.getElementById("insumoCosto").value = c;
  document.getElementById("insumoStock").value = s;
  document.getElementById("insumoMin").value = m;
};

window.descontar = async function(id, stock) {
  const ref = doc(db, "insumos", id);
  await updateDoc(ref, { stock: stock - 1 });
  cargarInsumos();
};

window.sumar = async function(id, stock) {
  const ref = doc(db, "insumos", id);
  await updateDoc(ref, { stock: stock + 1 });
  cargarInsumos();
};

btnGuardar.onclick = async () => {
  const nombre = document.getElementById("insumoNombre").value;
  const costo = Number(document.getElementById("insumoCosto").value);
  const stock = Number(document.getElementById("insumoStock").value);
  const minimo = Number(document.getElementById("insumoMin").value) || 5;

  if (!editId) {
    await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      stock,
      stockMinimo: minimo
    });
  } else {
    const ref = doc(db, "insumos", editId);
    await updateDoc(ref, {
      nombre,
      costoUnitario: costo,
      stock,
      stockMinimo: minimo
    });
    editId = null;
  }

  cargarInsumos();
};

cargarInsumos();
