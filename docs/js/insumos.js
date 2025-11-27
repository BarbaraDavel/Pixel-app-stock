import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaInsumos");
const btnGuardar = document.getElementById("guardarInsumo");

let editId = null;

async function cargarInsumos() {
  lista.innerHTML = "";
  const snap = await getDocs(collection(db, "insumos"));

  snap.forEach((d) => {
    const ins = d.data();
    const nombre = ins.nombre ?? "(sin nombre)";
    const costo = ins.costoUnitario ?? 0;
    const paquete = ins.cantidadPaquete ?? 0;

    lista.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td>$${costo}</td>
        <td>${paquete}</td>
        <td>
          <button onclick="editar('${d.id}')">Editar</button>
          <button onclick="eliminar('${d.id}')">❌</button>
        </td>
      </tr>
    `;
  });
}

window.editar = async function(id) {
  editId = id;
  const ref = doc(db, "insumos", id);
  const snap = await getDocs(collection(db, "insumos"));
};

window.eliminar = async function(id) {
  if (!confirm("¿Eliminar insumo y su stock asociado?")) return;

  await deleteDoc(doc(db, "insumos", id));

  // borrar stock asociado
  const stockSnap = await getDocs(collection(db, "stock"));
  stockSnap.forEach(async (d) => {
    if (d.data().insumoId === id) {
      await deleteDoc(doc(db, "stock", d.id));
    }
  });

  cargarInsumos();
};

btnGuardar.onclick = async () => {
  const nombre = document.getElementById("nombreInsumo").value;
  const costo = Number(document.getElementById("costoInsumo").value) || 0;
  const paquete = Number(document.getElementById("cantidadPaquete").value) || 0;

  if (!nombre) {
    alert("El insumo necesita nombre");
    return;
  }

  if (!editId) {
    // crear insumo
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    // crear stock automático
    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      stockActual: 0,
      stockMinimo: 5
    });

  } else {
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });
    editId = null;
  }

  cargarInsumos();
};

cargarInsumos();
