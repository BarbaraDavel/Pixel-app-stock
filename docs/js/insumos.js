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

/* ============================================================
   DOM
============================================================ */
const lista = document.getElementById("listaInsumos");
const btnGuardar = document.getElementById("guardarInsumo");

const inputNombre = document.getElementById("nombreInsumo");
const inputCostoPaquete = document.getElementById("costoInsumo");
const inputCantidadPaquete = document.getElementById("cantidadPaquete");
const inputBuscar = document.getElementById("buscarInsumo");

let editId = null;

/* ============================================================
   STATE
============================================================ */
let insumosCache = [];
let nombreDuplicado = false;

/* ============================================================
   HELPERS
============================================================ */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function calcCostoUnitario(costoPaquete, cantidadPaquete) {
  if (!cantidadPaquete || cantidadPaquete <= 0) return 0;
  return costoPaquete / cantidadPaquete;
}

function normalizar(txt = "") {
  return txt.toLowerCase().trim().replace(/\s+/g, " ");
}

/* ============================================================
   CARGAR INSUMOS
============================================================ */
async function cargarInsumos() {
  lista.innerHTML = "";

  const snap = await getDocs(collection(db, "insumos"));
  insumosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderLista(insumosCache);
}

/* ============================================================
   RENDER LISTA
============================================================ */
function renderLista(arr) {
  lista.innerHTML = "";

  const ordenados = [...arr].sort((a, b) =>
    (a.nombre || "").localeCompare(b.nombre || "")
  );

  ordenados.forEach(ins => {
    const costoPaquete = toNumber(ins.costoPaquete ?? 0);
    const cantidadPaquete = toNumber(ins.cantidadPaquete ?? 0);
    const costoUnitario =
      toNumber(ins.costoUnitario) ||
      calcCostoUnitario(costoPaquete, cantidadPaquete);

    lista.innerHTML += `
      <tr>
        <td>${ins.nombre || "(sin nombre)"}</td>
        <td>
          <div><strong>Pack:</strong> $${costoPaquete}</div>
          <div class="hint"><strong>Unit:</strong> $${costoUnitario.toFixed(2)}</div>
        </td>
        <td>${cantidadPaquete}</td>
        <td>
          <button class="btn-pp btn-edit-pp" onclick="editarInsumo('${ins.id}')">✏️ Editar</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarInsumo('${ins.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `;
  });
}

/* ============================================================
   BUSCADOR
============================================================ */
inputBuscar?.addEventListener("input", () => {
  const q = normalizar(inputBuscar.value);
  if (!q) return renderLista(insumosCache);

  const filtrados = insumosCache.filter(i =>
    normalizar(i.nombre).includes(q)
  );

  renderLista(filtrados);
});

/* ============================================================
   AVISO DE DUPLICADO (FASE 1 ⭐)
============================================================ */
inputNombre.addEventListener("input", () => {
  const valor = normalizar(inputNombre.value);
  nombreDuplicado = false;

  if (!valor) {
    inputNombre.setCustomValidity("");
    return;
  }

  const encontrado = insumosCache.find(ins =>
    normalizar(ins.nombre) === valor && ins.id !== editId
  );

  if (encontrado) {
    nombreDuplicado = true;
    inputNombre.setCustomValidity("Este insumo ya existe");
  } else {
    inputNombre.setCustomValidity("");
  }
});

/* ============================================================
   EDITAR INSUMO
============================================================ */
window.editarInsumo = async function (id) {
  editId = id;

  const snap = await getDoc(doc(db, "insumos", id));
  if (!snap.exists()) return;

  const ins = snap.data();

  inputNombre.value = ins.nombre ?? "";
  inputCostoPaquete.value = toNumber(ins.costoPaquete ?? 0);
  inputCantidadPaquete.value = toNumber(ins.cantidadPaquete ?? 0);

  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => inputNombre.focus(), 300);

  mostrarPopup("Editando insumo ✏️");
};

/* ============================================================
   ELIMINAR INSUMO
============================================================ */
window.eliminarInsumo = async function (id) {
  if (!confirm("¿Eliminar insumo y su stock asociado?")) return;

  await deleteDoc(doc(db, "insumos", id));

  const stockSnap = await getDocs(collection(db, "stock"));
  for (const s of stockSnap.docs) {
    if (s.data().insumoId === id) {
      await deleteDoc(doc(db, "stock", s.id));
    }
  }

  cargarInsumos();
  mostrarPopup("Insumo eliminado 🗑️");
};

/* ============================================================
   GUARDAR / EDITAR
============================================================ */
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const costoPaquete = toNumber(inputCostoPaquete.value);
  const cantidadPaquete = toNumber(inputCantidadPaquete.value);

  if (!nombre) return alert("El insumo necesita nombre");
  if (nombreDuplicado) return alert("Este insumo ya existe");
  if (!cantidadPaquete || cantidadPaquete <= 0)
    return alert("La cantidad debe ser mayor a 0");

  const costoUnitario = calcCostoUnitario(costoPaquete, cantidadPaquete);

  if (!editId) {
    const ref = await addDoc(collection(db, "insumos"), {
      nombre,
      costoPaquete,
      cantidadPaquete,
      costoUnitario
    });

    await addDoc(collection(db, "stock"), {
      insumoId: ref.id,
      stockActual: cantidadPaquete,
      stockMinimo: 5
    });

    mostrarPopup("Insumo agregado ✔️");
  } else {
    await updateDoc(doc(db, "insumos", editId), {
      nombre,
      costoPaquete,
      cantidadPaquete,
      costoUnitario
    });

    mostrarPopup("Insumo actualizado ✔️");
    editId = null;
  }

  inputNombre.value = "";
  inputCostoPaquete.value = "";
  inputCantidadPaquete.value = "";

  cargarInsumos();
};

/* ============================================================
   POPUP
============================================================ */
function mostrarPopup(msg = "Guardado") {
  const popup = document.getElementById("popupPixel");
  const texto = document.getElementById("popupText");
  if (!popup || !texto) return;

  texto.textContent = msg;
  popup.classList.remove("hidden");
  setTimeout(() => popup.classList.add("hidden"), 1500);
}

/* ============================================================
   INIT
============================================================ */
cargarInsumos();
