import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

onSnapshot(collection(db, "productionTasks"), (snapshot) => {

  colElements.forEach(col => col.innerHTML = "");

  snapshot.forEach(docSnap => {
    const task = docSnap.data();
    renderCard(docSnap.id, task);
  });

});

function renderCard(id, task) {

  const etapaIndex = task.etapaIndex ?? 0;
  const etapa = task.etapas[etapaIndex];

  const card = document.createElement("div");
  card.className = "card-prod";

  const progreso = calcularProgreso(task);

  card.innerHTML = `
    <h3>${task.productoNombre}</h3>
    <div><strong>${task.cliente}</strong></div>
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

document.addEventListener("change", async (e) => {

  if (!e.target.matches("input[type=checkbox]")) return;

  const taskId = e.target.dataset.task;
  const checkIndex = parseInt(e.target.dataset.check);

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);
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

window.moverEtapa = async function(taskId, direccion) {

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);
  const task = snap.data();

  const nuevoIndex = task.etapaIndex + direccion;

  if (nuevoIndex < 0 || nuevoIndex > 3) return;

  task.etapaIndex = nuevoIndex;
  task.etapaActual = columnas[nuevoIndex];

  await updateDoc(taskRef, {
    etapaIndex: task.etapaIndex,
    etapaActual: task.etapaActual
  });

};
