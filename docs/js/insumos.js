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
// DOM
// =============================
const lista = document.getElementById("listaInsumos");
const btnGuardar = document.getElementById("guardarInsumo");

const inputNombre = document.getElementById("nombreInsumo");
const inputCostoPaquete = document.getElementById("costoInsumo");      // ahora: costo del paquete
const inputCantidadPaquete = document.getElementById("cantidadPaquete"); // unidades que trae el pack

let editId = null;

// =============================
// HELPERS
// =============================
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function calcCostoUnitario(costoPaquete, cantidadPaquete) {
  if (!cantidadPaquete || cantidadPaquete <= 0) return 0;
  return costoPaquete / cantidadPaquete;
}

// =============================
// CARGAR LISTA DE INSUMOS
// =============================
async function cargarInsumos() {
  lista.innerHTML = "";

  const snap = await getDocs(collection(db, "insumos"));

  snap.forEach((d) => {
    const ins = d.data();

    const nombre = ins.nombre ?? "(sin nombre)";
    const cantidadPaquete = toNumber(ins.cantidadPaquete ?? 0);

    // Compat: si todavía no existe costoPaquete, caemos al viejo campo
    const costoPaquete = toNumber(ins.costoPaquete ?? ins.costoUnitario ?? 0);
    const costoUnitario =
      toNumber(ins.costoUnitario) ||
      calcCostoUnitario(costoPaquete, cantidadPaquete);

    lista.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td>
          <div><strong>Pack:</strong> $${costoPaquete}</div>
          <div class="hint"><strong>Unit:</strong> $${costoUnitario.toFixed(2)}</div>
        </td>
        <td>${cantidadPaquete}</td>
        <td>
          <button class="btn-pp btn-edit-pp" onclick="editarInsumo('${d.id}')">✏️ Editar</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarInsumo('${d.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `;
  });
}

// =============================
// EDITAR INSUMO
// =============================
window.editarInsumo = async function (id) {
  editId = id;

  const ref = doc(db, "insumos", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const ins = snap.data();

  inputNombre.value = ins.nombre ?? "";

  // Compat: si antes guardabas costoUnitario como “pack”, lo mostramos igual
  const costoPaquete = toNumber(ins.costoPaquete ?? ins.costoUnitario ?? 0);
  inputCostoPaquete.value = costoPaquete;

  inputCantidadPaquete.value = toNumber(ins.cantidadPaquete ?? 0);

  mostrarPopup("Editando insumo…");
};

// =============================
// ELIMINAR INSUMO + STOCK
// =============================
window.eliminarInsumo = async function (id) {
  if (!confirm("¿Eliminar insumo y su stock asociado?")) return;

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
// GUARDAR / EDITAR INSUMO
// =============================
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();

  const costoPaquete = toNumber(inputCostoPaquete.value);
  const cantidadPaquete = toNumber(inputCantidadPaquete.value);

  if (!nombre) {
    alert("El insumo necesita nombre");
    return;
  }
  if (!cantidadPaquete || cantidadPaquete <= 0) {
    alert("La cantidad por paquete debe ser mayor a 0");
    return;
  }

  const costoUnitario = calcCostoUnitario(costoPaquete, cantidadPaquete);

  if (!editId) {
    // NUEVO INSUMO
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoPaquete,
      cantidadPaquete,
      costoUnitario
    });

    // Stock inicial = unidades del paquete (podés cambiarlo luego)
    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      stockActual: cantidadPaquete,
      stockMinimo: 5
    });

    mostrarPopup("Insumo agregado ✔️");
  } else {
    // EDITAR INSUMO
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoPaquete,
      cantidadPaquete,
      costoUnitario
    });

    mostrarPopup("Insumo actualizado ✔️");
    editId = null;
  }

  // Limpiar form
  inputNombre.value = "";
  inputCostoPaquete.value = "";
  inputCantidadPaquete.value = "";

  cargarInsumos();
};

// =============================
// POPUP PIXEL
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
// INICIO
// =============================
cargarInsumos();
