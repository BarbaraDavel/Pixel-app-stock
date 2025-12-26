// js/insumos.js
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

// =============================
//   DOM
// =============================
const lista       = document.getElementById("listaInsumos");
const btnGuardar  = document.getElementById("guardarInsumo");

const inputNombre   = document.getElementById("nombreInsumo");
const inputCosto    = document.getElementById("costoInsumo");       // COSTO DEL PAQUETE
const inputPaquete  = document.getElementById("cantidadPaquete");   // UNIDADES DEL PAQUETE

let editId = null;

// =============================
//   CARGAR LISTA DE INSUMOS
// =============================
async function cargarInsumos() {
  lista.innerHTML = "";

  const snap = await getDocs(collection(db, "insumos"));

  snap.forEach((d) => {
    const ins = d.data();

    const nombre  = ins.nombre ?? "(sin nombre)";
    const costoU  = Number(ins.costoUnitario ?? 0);
    const costoP  = Number(ins.costoPaquete ?? 0);
    const paquete = Number(ins.cantidadPaquete ?? 0);

    lista.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td>
          $${costoU.toFixed(2)}
          <div class="hint">Pack: $${costoP} / ${paquete} u.</div>
        </td>
        <td>${paquete}</td>
        <td>
          <button class="btn-pp btn-edit-pp" onclick="editarInsumo('${d.id}')">✏️ Editar</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarInsumo('${d.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `;
  });
}

// =============================
//   EDITAR INSUMO
// =============================
window.editarInsumo = async function (id) {
  editId = id;

  const ref  = doc(db, "insumos", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const ins = snap.data();

  inputNombre.value  = ins.nombre ?? "";
  inputCosto.value   = ins.costoPaquete ?? ins.costoUnitario ?? 0;
  inputPaquete.value = ins.cantidadPaquete ?? 1;

  mostrarPopup("Editando insumo…");
};

// =============================
//   ELIMINAR INSUMO + STOCK
// =============================
window.eliminarInsumo = async function (id) {
  if (!confirm("¿Eliminar insumo y su stock asociado?")) return;

  await deleteDoc(doc(db, "insumos", id));

  const stockSnap = await getDocs(collection(db, "stock"));
  for (const s of stockSnap.docs) {
    if (s.data().insumoId === id) {
      await deleteDoc(doc(db, "stock", s.id));
    }
  }

  await cargarInsumos();
  mostrarPopup("Insumo eliminado 🗑️");
};

// =============================
//   GUARDAR / EDITAR INSUMO
// =============================
btnGuardar.onclick = async () => {
  const nombre         = inputNombre.value.trim();
  const costoPaquete   = Number(inputCosto.value) || 0;
  const cantidadPack   = Number(inputPaquete.value) || 1;
  const costoUnitario  = cantidadPack > 0 ? costoPaquete / cantidadPack : costoPaquete;

  if (!nombre) {
    alert("El insumo necesita nombre");
    return;
  }

  const data = {
    nombre,
    costoPaquete,
    cantidadPaquete: cantidadPack,
    costoUnitario
  };

  if (!editId) {
    const ref = await addDoc(collection(db, "insumos"), data);

    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      stockActual: cantidadPack,
      stockMinimo: 5
    });

    mostrarPopup("Insumo agregado ✔️");
  } else {
    await updateDoc(doc(db, "insumos", editId), data);
    mostrarPopup("Insumo actualizado");
    editId = null;
  }

  inputNombre.value  = "";
  inputCosto.value   = "";
  inputPaquete.value = "";

  cargarInsumos();
};

// =============================
//   POPUP PIXEL
// =============================
function mostrarPopup(msg = "Guardado") {
  const popup = document.getElementById("popupPixel");
  const texto = document.getElementById("popupText");

  if (!popup || !texto) return;

  texto.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => popup.classList.add("hidden"), 1500);
}

// =============================
//   INICIO
// =============================
cargarInsumos();
