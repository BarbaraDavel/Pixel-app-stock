import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =====================================================
   COLUMNAS
===================================================== */

const columnas = [
  "Preparación",
  "Armado",
  "Empaquetado",
  "Listo"
];

const colElements = [
  document.getElementById("col-0"),
  document.getElementById("col-1"),
  document.getElementById("col-2"),
  document.getElementById("col-3")
];

/* =====================================================
   MODAL NUEVA TAREA
===================================================== */

const btnNuevaTarea = document.getElementById("btnNuevaTarea");
const modalNuevaTarea = document.getElementById("modalNuevaTarea");
const ntProducto = document.getElementById("ntProducto");
const ntCliente = document.getElementById("ntCliente");
const ntTipo = document.getElementById("ntTipo");
const ntGuardar = document.getElementById("ntGuardar");
const ntCerrar = document.getElementById("ntCerrar");

/* =====================================================
   LISTENER EN TIEMPO REAL
===================================================== */

onSnapshot(collection(db, "productionTasks"), (snapshot) => {

  colElements.forEach(col => col.innerHTML = "");

  snapshot.forEach(docSnap => {
    const task = docSnap.data();
    renderCard(docSnap.id, task);
  });

});

/* =====================================================
   RENDER CARD
===================================================== */

function renderCard(id, task) {

  const etapaIndex = task.etapaIndex ?? 0;
  const etapa = task.etapas[etapaIndex];

  if (!colElements[etapaIndex]) return;

  const card = document.createElement("div");
  card.className = "card-prod";

  const progreso = calcularProgreso(task);

  card.innerHTML = `
    <h3>${task.productoNombre}</h3>
    <div class="cliente">${task.cliente}</div>
    <div class="progreso">Progreso total: ${progreso}%</div>

    <div class="checklist">
      ${etapa.checklist.map((item, i) => `
        <label>
          <input type="checkbox"
            ${item.done ? "checked" : ""}
            data-task="${id}"
            data-check="${i}">
          ${item.nombre}
        </label>
      `).join("")}
    </div>

    <div class="buttons-prod">
      <button onclick="moverEtapa('${id}', -1)">◀</button>
      <button onclick="moverEtapa('${id}', 1)">▶</button>
    </div>
  `;

  colElements[etapaIndex].appendChild(card);
}

/* =====================================================
   PROGRESO
===================================================== */

function calcularProgreso(task) {
  let total = 0;
  let done = 0;

  task.etapas.forEach(e => {
    e.checklist.forEach(c => {
      total++;
      if (c.done) done++;
    });
  });

  if (total === 0) return 0;

  return Math.round((done / total) * 100);
}

/* =====================================================
   CHECKLIST
===================================================== */

document.addEventListener("change", async (e) => {

  if (!e.target.matches("input[type=checkbox]")) return;

  const taskId = e.target.dataset.task;
  const checkIndex = parseInt(e.target.dataset.check);

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);

  if (!snap.exists()) return;

  const task = snap.data();
  const etapaActual = task.etapas[task.etapaIndex];

  etapaActual.checklist[checkIndex].done = e.target.checked;

  const obligatoriosCompletos = etapaActual.checklist
    .filter(i => i.obligatorio)
    .every(i => i.done);

  if (obligatoriosCompletos &&
      task.etapaIndex < task.etapas.length - 1) {

    task.etapaIndex++;
    task.etapaActual = task.etapas[task.etapaIndex].nombre;
  }

  await updateDoc(taskRef, {
    etapas: task.etapas,
    etapaIndex: task.etapaIndex,
    etapaActual: task.etapaActual
  });

});

/* =====================================================
   MOVER ETAPA MANUAL
===================================================== */

window.moverEtapa = async function(taskId, direccion) {

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);

  if (!snap.exists()) return;

  const task = snap.data();
  const nuevoIndex = task.etapaIndex + direccion;

  if (nuevoIndex < 0 || nuevoIndex >= columnas.length) return;

  task.etapaIndex = nuevoIndex;
  task.etapaActual = columnas[nuevoIndex];

  await updateDoc(taskRef, {
    etapaIndex: task.etapaIndex,
    etapaActual: task.etapaActual
  });

};

/* =====================================================
   MODAL FUNCIONALIDAD
===================================================== */

btnNuevaTarea.onclick = () => {
  modalNuevaTarea.classList.remove("hidden");
};

ntCerrar.onclick = () => {
  modalNuevaTarea.classList.add("hidden");
};

/* =====================================================
   CARGAR TIPOS DESDE productWorkflows
===================================================== */

async function cargarTiposProduccion() {
  ntTipo.innerHTML = "";
  const snap = await getDocs(collection(db, "productWorkflows"));

  snap.forEach(d => {
    ntTipo.innerHTML += `
      <option value="${d.id}">${d.id}</option>
    `;
  });
}

cargarTiposProduccion();

/* =====================================================
   CREAR TAREA MANUAL
===================================================== */

ntGuardar.onclick = async () => {

  if (!ntProducto.value || !ntTipo.value) {
    alert("Faltan datos");
    return;
  }

  const workflowRef = doc(db, "productWorkflows", ntTipo.value);
  const snap = await getDoc(workflowRef);

  if (!snap.exists()) {
    alert("Workflow no encontrado");
    return;
  }

  const workflow = snap.data();

  const etapasClonadas = workflow.etapas.map(etapa => ({
    nombre: etapa.nombre,
    checklist: etapa.checklist.map(c => ({
      nombre: c.nombre,
      obligatorio: c.obligatorio,
      done: false
    }))
  }));

  await addDoc(collection(db, "productionTasks"), {
    pedidoId: null,
    cliente: ntCliente.value || "",
    productoNombre: ntProducto.value,
    tipoProduccion: ntTipo.value,
    etapaIndex: 0,
    etapaActual: etapasClonadas[0].nombre,
    etapas: etapasClonadas,
    fechaCreacion: serverTimestamp()
  });

  ntProducto.value = "";
  ntCliente.value = "";
  modalNuevaTarea.classList.add("hidden");
};
