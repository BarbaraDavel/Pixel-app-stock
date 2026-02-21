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
  const etapa = task.etapas[etapaIndex];
  if (!colElements[etapaIndex]) return;

  const card = document.createElement("div");
  card.className = "card-prod";
  card.dataset.id = id;

  const progreso = calcularProgreso(task);

  // 🔥 SI ESTÁ EN "LISTO"
  if (etapaIndex === 3) {

    card.innerHTML = `
      <div class="card-header">
        <h3>${task.productoNombre}</h3>
        <button class="btn-delete" onclick="eliminarTarea('${id}')">🗑</button>
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

  // 🔹 ETAPAS NORMALES
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
  const checkIndex = parseInt(e.target.dataset.check);

  const taskRef = doc(db, "productionTasks", taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;

  const task = snap.data();
  const etapaActual = task.etapas[task.etapaIndex];

  etapaActual.checklist[checkIndex].done = e.target.checked;

  // 🔥 SOLO AVANZA SI TODOS ESTÁN COMPLETOS
  const todosCompletos = etapaActual.checklist.every(i => i.done);

  let nuevoIndex = task.etapaIndex;

  if (todosCompletos &&
      task.etapaIndex < task.etapas.length - 1) {

    nuevoIndex = task.etapaIndex + 1;
  }

  await updateDoc(taskRef, {
    etapas: task.etapas,
    etapaIndex: nuevoIndex,
    etapaActual: task.etapas[nuevoIndex].nombre
  });

});

// 🔥 FINALIZAR Y ELIMINAR DESDE "LISTO"
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
   MOVER ETAPA MANUAL
===================================================== */

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

  await updateDoc(taskRef, {
    etapaIndex: nuevoIndex,
    etapaActual: columnas[nuevoIndex]
  });

};

/* =====================================================
   ELIMINAR TAREA
===================================================== */

window.eliminarTarea = async function(id) {

  const confirmar = confirm("¿Eliminar esta tarea de producción?");
  if (!confirmar) return;

  await deleteDoc(doc(db, "productionTasks", id));
};

/* =====================================================
   CREAR TAREA
===================================================== */

ntGuardar.onclick = async () => {

  if (!ntProducto.value) {
  alert("Falta el nombre del producto");
  return;
}

  const workflowRef = doc(db, "productWorkflows", ntTipo.value);
  const snap = await getDoc(workflowRef);

  if (!snap.exists()) {
    alert("Workflow no encontrado");
    return;
  }

  const workflow = snap.data();

  const seleccionadas = document.querySelectorAll("#ntTareas input:checked");

const etapasMap = {};

seleccionadas.forEach(input => {
  const etapa = input.dataset.etapa;
  const nombre = input.parentElement.textContent.trim();

  if (!etapasMap[etapa]) {
    etapasMap[etapa] = [];
  }

  etapasMap[etapa].push({
    nombre: nombre,
    obligatorio: true,
    done: false
  });
});

const etapasFinales = Object.keys(etapasMap).map(nombreEtapa => ({
  nombre: nombreEtapa,
  checklist: etapasMap[nombreEtapa]
}));

await addDoc(collection(db, "productionTasks"), {
  cliente: ntCliente.value || "",
  productoNombre: ntProducto.value,
  etapaIndex: 0,
  etapaActual: etapasFinales[0]?.nombre || "Preparación",
  etapas: etapasFinales,
  fechaCreacion: serverTimestamp()
});

  ntProducto.value = "";
  ntCliente.value = "";
  modalNuevaTarea.classList.add("hidden");
};
const ntTareas = document.getElementById("ntTareas");

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

  Object.keys(agrupadas).forEach(etapa => {

    const bloque = document.createElement("div");
    bloque.innerHTML = `<h4>${etapa}</h4>`;

    agrupadas[etapa].forEach(t => {
      bloque.innerHTML += `
        <label class="check-template">
          <input type="checkbox" value="${t.id}" data-etapa="${etapa}">
          ${t.nombre}
        </label>
      `;
    });

    ntTareas.appendChild(bloque);
  });
}

cargarTemplatesProduccion();
/* =====================================================
   SCRIPT TEMPORAL - CREAR TEMPLATES BASE
   ⚠️ Ejecutar una vez y luego borrar
===================================================== */

async function crearTemplatesBase() {

  const tareasBase = [

    // PREPARACIÓN
    { nombre: "Diseñar archivo", etapa: "Preparación" },
    { nombre: "Preparar plancha", etapa: "Preparación" },
    { nombre: "Armar PDF final", etapa: "Preparación" },
    { nombre: "Configurar impresión", etapa: "Preparación" },
    { nombre: "Imprimir interiores", etapa: "Preparación" },
    { nombre: "Imprimir tapa", etapa: "Preparación" },
    { nombre: "Elegir Anillo", etapa: "Preparación" },
    { nombre: "Elegir elástico", etapa: "Preparación" },
    { nombre: "Elegir ojalillos", etapa: "Preparación" },
    
    // ARMADO
    
    { nombre: "Cortar hojas", etapa: "Armado" },
    { nombre: "Abrochar / Anillar", etapa: "Armado" },
    { nombre: "Plastificar", etapa: "Armado" },

    // EMPAQUETADO
    { nombre: "Revisar calidad", etapa: "Empaquetado" },
    { nombre: "Envolver producto", etapa: "Empaquetado" },
    { nombre: "Colocar tag", etapa: "Empaquetado" },
    { nombre: "Colocar sticker", etapa: "Empaquetado" },
    { nombre: "Colocar elástico", etapa: "Empaquetado" },

  ];

  for (const tarea of tareasBase) {
    await addDoc(collection(db, "productionTemplates"), tarea);
  }

  console.log("✅ Templates base creados correctamente");
}

// 🔥 DESCOMENTAR SOLO UNA VEZ
 crearTemplatesBase();