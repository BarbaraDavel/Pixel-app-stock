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
const inputCosto    = document.getElementById("costoInsumo");
const inputPaquete  = document.getElementById("cantidadPaquete");

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
    const costo   = Number(ins.costoUnitario ?? 0);
    const paquete = Number(ins.cantidadPaquete ?? 0);

    lista.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td>$${costo}</td>
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
  inputCosto.value   = ins.costoUnitario ?? 0;
  inputPaquete.value = ins.cantidadPaquete ?? 0;

  mostrarPopup("Editando insumo…");
};

// =============================
//   ELIMINAR INSUMO + STOCK
// =============================
window.eliminarInsumo = async function (id) {
  if (!confirm("¿Eliminar insumo y su stock asociado?")) return;

  // Borrar insumo
  await deleteDoc(doc(db, "insumos", id));

  // Borrar stock asociado
  const stockSnap = await getDocs(collection(db, "stock"));
  for (const s of stockSnap.docs) {
    const data = s.data();
    if (data.insumoId === id) {
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
  const nombre  = inputNombre.value.trim();
  const costo   = Number(inputCosto.value) || 0;
  const paquete = Number(inputPaquete.value) || 0;

  if (!nombre) {
    alert("El insumo necesita nombre");
    return;
  }

  if (!editId) {
    // NUEVO INSUMO
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    // Crear registro en STOCK asociado (para que aparezca en módulo Stock)
    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      stockActual: paquete,
      stockMinimo: 5
    });

    mostrarPopup("Insumo agregado ✔️");
  } else {
    // EDITAR INSUMO
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    mostrarPopup("Insumo actualizado");
    editId = null;
  }

  // Limpiar form
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

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 1500);
}

// =============================
//   INICIO
// =============================
cargarInsumos();
