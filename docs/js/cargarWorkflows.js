import { db } from "./firebase.js";
import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =====================================================
   WORKFLOWS
===================================================== */

const workflows = {

  etiqueta_escolar: {
    etapas: [
      {
        nombre: "Preparación",
        checklist: [
          { nombre: "Diseñar plancha", obligatorio: true },
          { nombre: "Imprimir plancha", obligatorio: true },
          { nombre: "Plastificar", obligatorio: true },
          { nombre: "Cortar etiquetas", obligatorio: true }
        ]
      },
      {
        nombre: "Armado",
        checklist: [
          { nombre: "Separar por nombre", obligatorio: true },
          { nombre: "Controlar cantidad", obligatorio: true }
        ]
      },
      {
        nombre: "Empaquetado",
        checklist: [
          { nombre: "Armar bolsita", obligatorio: true },
          { nombre: "Colocar etiqueta final", obligatorio: false }
        ]
      },
      {
        nombre: "Listo",
        checklist: []
      }
    ]
  }

};

/* =====================================================
   CARGA
===================================================== */

async function cargar() {

  for (const key in workflows) {
    await setDoc(doc(db, "productWorkflows", key), workflows[key]);
    console.log("Workflow cargado:", key);
  }

  alert("Workflows cargados correctamente 🚀");
}

cargar();
