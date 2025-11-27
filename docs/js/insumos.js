import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaInsumos");
const btnGuardar = document.getElementById("guardarInsumo");

const inputNombre = document.getElementById("nombreInsumo");
const inputCosto = document.getElementById("costoInsumo");
const inputPaquete = document.getElementById("cantidadPaquete");

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
          <button class="btn btn-sm" onclick="editar('${d.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminar('${d.id}')">✕</button>
        </td>
      </tr>
    `;
  });
}

window.editar = async function (id) {
  editId = id;
  const ref = doc(db, "insumos", id);
  const snap = await getDoc(ref);
  const ins = snap.data();

  inputNombre.value = ins.nombre ?? "";
  inputCosto.value = ins.costoUnitario ?? 0;
  inputPaquete.value = ins.cantidadPaquete ?? 0;
};

window.eliminar = async function (id) {
  if (!confirm("¿Eliminar insumo y su stock asociado?")) return;

  await deleteDoc(doc(db, "insumos", id));

  // borrar stock asociado
  const stockSnap = await getDocs(collection(db, "stock"));
  for (const s of stockSnap.docs) {
    if (s.data().insumoId === id) {
      await deleteDoc(doc(db, "stock", s.id));
    }
  }

  cargarInsumos();
};

btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const costo = Number(inputCosto.value) || 0;
  const paquete = Number(inputPaquete.value) || 0;

  if (!nombre) {
    alert("El insumo necesita nombre");
    return;
  }

  if (!editId) {
    // nuevo insumo
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    // stock inicial = cantidad del paquete (lo que elegiste)
    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      stockActual: paquete,
      stockMinimo: 5
    });
  } else {
    // editar insumo (no tocamos stock aquí)
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });
    editId = null;
  }

  inputNombre.value = "";
  inputCosto.value = "";
  inputPaquete.value = "";

  cargarInsumos();
};

cargarInsumos();
