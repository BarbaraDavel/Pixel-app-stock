import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

async function cargarWorkflows() {

  const workflows = {

    anillado_grande: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Imprimir interiores", obligatorio: true },
            { nombre: "Imprimir tapas", obligatorio: true },
            { nombre: "Cortar cartón", obligatorio: true },
            { nombre: "Medir anillo", obligatorio: false }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Forrar tapas", obligatorio: true },
            { nombre: "Perforar hojas", obligatorio: true },
            { nombre: "Elegir anillo", obligatorio: true },
            { nombre: "Elegir elástico", obligatorio: false },
            { nombre: "Colocar ojalillos", obligatorio: false },
            { nombre: "Anillar", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true },
            { nombre: "Etiqueta final", obligatorio: false }
          ]
        }
      ]
    },

    abrochado: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Imprimir interiores", obligatorio: true },
            { nombre: "Imprimir tapa", obligatorio: true }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Doblar hojas", obligatorio: true },
            { nombre: "Abrochar", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true }
          ]
        }
      ]
    },

    carpeta: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Cortar cartón", obligatorio: true },
            { nombre: "Forrar", obligatorio: true }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Colocar mecanismo", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true }
          ]
        }
      ]
    },

    impreso_simple: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Diseñar archivo", obligatorio: false },
            { nombre: "Imprimir", obligatorio: true }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Cortar", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true }
          ]
        }
      ]
    },

    marcapaginas: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Imprimir", obligatorio: true },
            { nombre: "Plastificar", obligatorio: true }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Colocar imán", obligatorio: false },
            { nombre: "Cortar", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true }
          ]
        }
      ]
    },

    polaroid: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Imprimir", obligatorio: true }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Cortar", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true }
          ]
        }
      ]
    },

    stickers: {
      etapas: [
        {
          nombre: "Preparación",
          checklist: [
            { nombre: "Diseñar archivo", obligatorio: false },
            { nombre: "Imprimir", obligatorio: true }
          ]
        },
        {
          nombre: "Armado",
          checklist: [
            { nombre: "Troquelar / cortar", obligatorio: true }
          ]
        },
        {
          nombre: "Empaquetado",
          checklist: [
            { nombre: "Empaquetar", obligatorio: true }
          ]
        }
      ]
    }

  };

  for (const key in workflows) {
    await setDoc(doc(db, "productWorkflows", key), workflows[key]);
    console.log(`Workflow ${key} cargado`);
  }

  console.log("Todos los workflows fueron cargados correctamente 🚀");
}

cargarWorkflows();
