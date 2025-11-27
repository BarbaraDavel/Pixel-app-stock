import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, updateDoc, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaInsumos");
const btnGuardar = document.getElementById("guardarInsumo");
let editId = null;

async function cargarInsumos() {
  lista.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "insumos"));

  querySnapshot.forEach((d) => {
    const ins = d.data();

    // VALIDACIONES
    const nombre = ins.nombre || "(sin nombre)";
    const costo = ins.costoUnitario ?? 0;
    const stock = ins.stock ?? 0;
    const minimo = ins.stockMinimo ?? 5;

    lista.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td>$${costo}</td>
        <td>${stock}</td>
        <td>${minimo}</td>
        <td>
          <button onclick="editarInsumo('${d.id}')">Editar</button>
          <button onclick="descontar('${d.id}', ${stock})">Usar 1</button>
          <button onclick="sumar('${d.id}', ${stock})">+1</button>
          <button onclick="eliminar('${d.id}')">❌</button>
        </td>
      </tr>
    `;
  });
}

window.editarInsumo = async function(id) {
  editId = id;
  const ref = doc(db, "insumos", id);
  const snap = await getDocs(collection(db, "insumos"));
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

window.eliminar = async function(id) {
  if (confirm("¿Eliminar insumo?")) {
    await deleteDoc(doc(db, "insumos", id));
    cargarInsumos();
  }
};

btnGuardar.onclick = async () => {
  const nombre = document.getElementById("insumoNombre").value;
  const costo = Number(document.getElementById("insumoCosto").value) || 0;
  const stock = Number(document.getElementById("insumoStock").value) || 0;
  const minimo = Number(document.getElementById("insumoMin").value) || 5;

  if (!editId) {
    // NUEVO DOCUMENTO
    await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      stock,
      stockMinimo: minimo
    });
  } else {
    // EDITAR
    await updateDoc(doc(db, "insumos", editId), {
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
