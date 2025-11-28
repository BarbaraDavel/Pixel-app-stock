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

/* ============================
       TOAST PIXEL
============================ */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2200);
}

/* ============================
       CARGAR INSUMOS
============================ */
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
          <button class="btn btn-sm btn-outline" onclick="editar('${d.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminar('${d.id}')">✕</button>
        </td>
      </tr>
    `;
  });
}

/* ============================
       EDITAR
============================ */
window.editar = async function (id) {
  editId = id;
  const ref = doc(db, "insumos", id);
  const snap = await getDoc(ref);
  const ins = snap.data();

  inputNombre.value = ins.nombre ?? "";
  inputCosto.value = ins.costoUnitario ?? 0;
  inputPaquete.value = ins.cantidadPaquete ?? 0;

  showToast("Editando insumo…");
};

/* ============================
       ELIMINAR
============================ */
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
  showToast("Insumo eliminado 💔");
};

/* ============================
       GUARDAR (nuevo/editar)
============================ */
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const costo = Number(inputCosto.value) || 0;
  const paquete = Number(inputPaquete.value) || 0;

  if (!nombre) {
    showToast("El insumo necesita nombre");
    return;
  }

  if (!editId) {
    // nuevo insumo
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    // stock inicial consistente con productos.js y stock.js
    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      nombre,
      actual: paquete,
      minimo: 5
    });

    showToast("Insumo agregado 💖");
  } else {
    // editar insumo
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    editId = null;
    showToast("Insumo actualizado ✨");
  }

  inputNombre.value = "";
  inputCosto.value = "";
  inputPaquete.value = "";

  cargarInsumos();
};

cargarInsumos();
