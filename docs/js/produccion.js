import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
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
   DRAG & DROP
===================================================== */

colElements.forEach((col, index) => {
  new Sortable(col, {
    group: "produccion",
    animation: 200,
    ghostClass: "drag-ghost",
    onEnd: async (evt) => {
      const taskId = evt.item.dataset.id;
      const newColumnIndex = index;

      const taskRef = doc(db, "productionTasks", taskId);
      const snap = await getDoc(taskRef);
      if (!snap.exists()) return;

      await updateDoc(taskRef, {
        etapaIndex: newColumnIndex,
        etapaActual: columnas[newColumnIndex]
      });
    }
  });
});

/* =====================================================
   MODAL NUEVA TAREA
===================================================== */

const btnNuevaTarea = document.getElementById("btnNuevaTarea");
const modalNuevaTarea = document.getElementById("modalNuevaTarea");
const ntProducto = document.getElementById("ntProducto");
const ntCliente = document.getElementById("ntCliente");
const ntGuardar = document.getElementById("ntGuardar");
const ntCerrar = document.getElementById("ntCerrar");
const ntTareas = document.getElementById("ntTareas");

btnNuevaTarea.onclick = () => {
  modalNuevaTarea.classList.remove("hidden");
};

ntCerrar.onclick = () => {
  modalNuevaTarea.classList.add("hidden");
};

/* =====================================================
   LISTENER TIEMPO REAL
===================================================== */

onSnapshot(collection(db, "productionTasks"), (snapshot) => {
  colElements.forEach(col => col.innerHTML = "");
  snapshot.forEach(docSnap => {
    renderCard(docSnap.id, docSnap.data());
  });
});

/* =====================================================
   RENDER CARD
===================================================== */

function renderCard(id, task) {

  const etapaIndex = task.etapaIndex ?? 0;
  if (!colElements[etapaIndex]) return;

  const etapa = task.etapas[etapaIndex];
  const card = document.createElement("div");
  card.className = "card-prod";
  card.dataset.id = id;

  const progreso = calcularProgreso(task);

  if (etapaIndex === 3) {
    card.innerHTML = `
    <div class="card-header">
      <h3>${task.productoNombre}</h3>
      <div class="card-actions">
        <button class="btn-duplicate" onclick="duplicarTarea('${id}')">📄</button>
        <button class="btn-delete" onclick="eliminarTarea('${id}')">🗑</button>
      </div>
    </div>
      <div class="cliente">${task.cliente || ""}</div>
      <div class="finalizado-box">
        <label class="check-final">
          <input type="checkbox" data-final="${id}">
          <span>Marcar como entregado</span>
        </label>
      </div>
    `;
    colElements[etapaIndex].appendChild(card);
    return;
  }

  card.innerHTML = `
    <div class="card-header">
      <h3>${task.productoNombre}</h3>
      <button class="btn-delete" onclick="eliminarTarea('${id}')">🗑</button>
    </div>

    <div class="cliente">${task.cliente || ""}</div>
    <div class="progreso-badge">${progreso}% completado</div>

    <div class="checklist">
      ${etapa.checklist.map((item, i) => `
        <div class="check-item">
          <input type="checkbox"
            ${item.done ? "checked" : ""}
            data-task="${id}"
            data-check="${i}">
          <span>${item.nombre}</span>
        </div>
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
  if (!taskId) return;

  const checkIndex = parseInt(e.target.dataset.check);

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;

  const task = snap.data();
  const etapaActual = task.etapas[task.etapaIndex];

  etapaActual.checklist[checkIndex].done = e.target.checked;

  const todosCompletos = etapaActual.checklist.every(i => i.done);
  let nuevoIndex = task.etapaIndex;

  if (todosCompletos && task.etapaIndex < task.etapas.length - 1) {
    nuevoIndex = task.etapaIndex + 1;
  }

  await updateDoc(taskRef, {
    etapas: task.etapas,
    etapaIndex: nuevoIndex,
    etapaActual: task.etapas[nuevoIndex].nombre
  });
});

/* =====================================================
   FINALIZAR
===================================================== */

document.addEventListener("change", async (e) => {
  if (!e.target.matches("input[data-final]")) return;

  const taskId = e.target.dataset.final;

  if (!confirm("¿Marcar como entregado y quitar del tablero?")) {
    e.target.checked = false;
    return;
  }

  await deleteDoc(doc(db, "productionTasks", taskId));
});

/* =====================================================
   MOVER ETAPA
===================================================== */

window.moverEtapa = async function(taskId, direccion) {

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;

  const task = snap.data();
  const nuevoIndex = task.etapaIndex + direccion;

  if (nuevoIndex < 0 || nuevoIndex >= columnas.length) return;

  await updateDoc(taskRef, {
    etapaIndex: nuevoIndex,
    etapaActual: columnas[nuevoIndex]
  });
};

/* =====================================================
   ELIMINAR
===================================================== */

window.eliminarTarea = async function(id) {
  if (!confirm("¿Eliminar esta tarea de producción?")) return;
  await deleteDoc(doc(db, "productionTasks", id));
};

/* =====================================================
   DUPLICAR TAREA
===================================================== */

window.duplicarTarea = async function(id) {

  const ref = doc(db, "productionTasks", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  // 🔄 Resetear progreso
  const etapasReset = data.etapas.map(e => ({
    nombre: e.nombre,
    checklist: e.checklist.map(c => ({
      nombre: c.nombre,
      obligatorio: c.obligatorio,
      done: false
    }))
  }));

  await addDoc(collection(db, "productionTasks"), {
    cliente: data.cliente, // si querés que lo deje vacío → ""
    productoNombre: data.productoNombre + " (copia)",
    etapaIndex: 0,
    etapaActual: etapasReset[0].nombre,
    etapas: etapasReset,
    fechaCreacion: serverTimestamp()
  });

};

/* =====================================================
   CREAR TAREA
===================================================== */

ntGuardar.onclick = async () => {

  if (!ntProducto.value.trim()) {
    alert("Falta el nombre del producto");
    return;
  }

  const seleccionadas = document.querySelectorAll("#ntTareas input:checked");

  if (seleccionadas.length === 0) {
    alert("Seleccioná al menos una tarea");
    return;
  }

  const etapasMap = {};

  seleccionadas.forEach(input => {
    const etapa = input.dataset.etapa;
    const nombre = input.nextElementSibling.textContent.trim();

    if (!etapasMap[etapa]) {
      etapasMap[etapa] = [];
    }

    etapasMap[etapa].push({
      nombre,
      obligatorio: true,
      done: false
    });
  });

  const etapasFinales = columnas
    .filter(e => etapasMap[e])
    .map(e => ({
      nombre: e,
      checklist: etapasMap[e]
    }));

  await addDoc(collection(db, "productionTasks"), {
    cliente: ntCliente.value.trim() || "",
    productoNombre: ntProducto.value.trim(),
    etapaIndex: 0,
    etapaActual: etapasFinales[0].nombre,
    etapas: etapasFinales,
    fechaCreacion: serverTimestamp()
  });

  /* 🔥 LIMPIEZA COMPLETA */

  ntProducto.value = "";
  ntCliente.value = "";

  document
    .querySelectorAll("#ntTareas input[type=checkbox]")
    .forEach(cb => cb.checked = false);

  modalNuevaTarea.classList.add("hidden");
};


/* =====================================================
   CARGAR TEMPLATES EN ORDEN CORRECTO
===================================================== */

async function cargarTemplatesProduccion() {

  ntTareas.innerHTML = "";

  const snap = await getDocs(collection(db, "productionTemplates"));
  const agrupadas = {};

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (!agrupadas[data.etapa]) {
      agrupadas[data.etapa] = [];
    }
    agrupadas[data.etapa].push({
      id: docSnap.id,
      nombre: data.nombre
    });
  });

  columnas.forEach(etapa => {

    if (!agrupadas[etapa]) return;

    const bloque = document.createElement("details");
    bloque.className = "etapa-bloque";

    bloque.innerHTML = `
      <summary class="etapa-summary">${etapa}</summary>
      <div class="etapa-contenido"></div>
    `;

    const contenido = bloque.querySelector(".etapa-contenido");

    agrupadas[etapa].forEach(t => {
      contenido.innerHTML += `
        <label class="check-template">
          <input type="checkbox" value="${t.id}" data-etapa="${etapa}">
          <span>${t.nombre}</span>
        </label>
      `;
    });

    ntTareas.appendChild(bloque);
  });
}

cargarTemplatesProduccion();