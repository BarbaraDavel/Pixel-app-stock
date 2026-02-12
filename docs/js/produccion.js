import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
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

// Escuchar cambios en tiempo real
onSnapshot(collection(db, "productionTasks"), (snapshot) => {

  // Limpiar columnas
  colElements.forEach(col => col.innerHTML = "");

  snapshot.forEach(docSnap => {
    const task = docSnap.data();
    renderCard(docSnap.id, task);
  });

});

function renderCard(id, task) {

  const etapaIndex = task.etapaIndex;
  const etapa = task.etapas[etapaIndex];

  const card = document.createElement("div");
  card.className = "card";

  const progresoTotal = calcularProgresoTotal(task);

  card.innerHTML = `
    <h3>${task.productoNombre}</h3>
    <p><strong>${task.cliente}</strong></p>
    <p>Progreso: ${progresoTotal}%</p>
    <div class="checklist">
      ${etapa.checklist.map((item, i) => `
        <label>
          <input type="checkbox" 
            ${item.done ? "checked" : ""} 
            data-task="${id}" 
            data-check="${i}">
          ${item.nombre}
        </label><br>
      `).join("")}
    </div>
    <div class="buttons">
      <button onclick="moverEtapa('${id}', -1)">◀</button>
      <button onclick="moverEtapa('${id}', 1)">▶</button>
    </div>
  `;

  colElements[etapaIndex].appendChild(card);
}

function calcularProgresoTotal(task) {
  let total = 0;
  let completados = 0;

  task.etapas.forEach(etapa => {
    etapa.checklist.forEach(item => {
      total++;
      if (item.done) completados++;
    });
  });

  return Math.round((completados / total) * 100);
}

// Check automático
document.addEventListener("change", async (e) => {

  if (!e.target.matches("input[type=checkbox]")) return;

  const taskId = e.target.dataset.task;
  const checkIndex = parseInt(e.target.dataset.check);

  const taskRef = doc(db, "productionTasks", taskId);
  const snapshot = await taskRef.get(); // ⚠️ esto lo ajustamos abajo

});
import { getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

document.addEventListener("change", async (e) => {

  if (!e.target.matches("input[type=checkbox]")) return;

  const taskId = e.target.dataset.task;
  const checkIndex = parseInt(e.target.dataset.check);

  const taskRef = doc(db, "productionTasks", taskId);
  const snapshot = await getDoc(taskRef);
  const task = snapshot.data();

  const etapaActual = task.etapas[task.etapaIndex];

  etapaActual.checklist[checkIndex].done = e.target.checked;

  // Verificar obligatorios
  const todosObligatorios = etapaActual.checklist
    .filter(item => item.obligatorio)
    .every(item => item.done);

  if (todosObligatorios && task.etapaIndex < task.etapas.length - 1) {
    task.etapaIndex += 1;
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
  const snapshot = await getDoc(taskRef);
  const task = snapshot.data();

  const nuevoIndex = task.etapaIndex + direccion;

  if (nuevoIndex < 0 || nuevoIndex >= columnas.length) return;

  task.etapaIndex = nuevoIndex;
  task.etapaActual = columnas[nuevoIndex];

  await updateDoc(taskRef, {
    etapaIndex: task.etapaIndex,
    etapaActual: task.etapaActual
  });

};
