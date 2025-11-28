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

// =============================
//   CARGAR LISTA DE INSUMOS
// =============================
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
        <td class="td-actions">
          <button class="btn-edit" onclick="editar('${d.id}')">
            ✏️ Editar
          </button>
          <button class="btn-delete" onclick="eliminar('${d.id}')">
            🗑️ Eliminar
          </button>
        </td>
      </tr>
    `;



  });
}

// =============================
//   EDITAR INSUMO
// =============================
window.editar = async function (id) {
  editId = id;
  const ref = doc(db, "insumos", id);
  const snap = await getDoc(ref);
  const ins = snap.data();

  inputNombre.value = ins.nombre ?? "";
  inputCosto.value = ins.costoUnitario ?? 0;
  inputPaquete.value = ins.cantidadPaquete ?? 0;

  mostrarPopup("Editando insumo…");
};

// =============================
//   ELIMINAR INSUMO + STOCK
// =============================
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
  mostrarPopup("Insumo eliminado 🗑️");
};

// =============================
//   GUARDAR / EDITAR INSUMO
// =============================
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const costo = Number(inputCosto.value) || 0;
  const paquete = Number(inputPaquete.value) || 0;

  if (!nombre) {
    alert("El insumo necesita nombre");
    return;
  }

  if (!editId) {
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      nombre,
      actual: paquete,
      minimo: 5
    });

    mostrarPopup("Insumo agregado ✔️");
  } else {
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoUnitario: costo,
      cantidadPaquete: paquete
    });

    mostrarPopup("Insumo actualizado ✔️");
    editId = null;
  }

  inputNombre.value = "";
  inputCosto.value = "";
  inputPaquete.value = "";

  cargarInsumos();
};

// =============================
//   POPUP
// =============================
function mostrarPopup(msg = "Guardado") {
  const popup = document.getElementById("popupPixel");
  const texto = document.getElementById("popupText");

  texto.textContent = msg;
  popup.classList.remove("hidden");

  setTimeout(() => {
    popup.classList.add("hidden");
  }, 1500);
}

cargarInsumos();
