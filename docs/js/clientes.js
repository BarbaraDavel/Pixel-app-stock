import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =========================================================
   DOM ELEMENTS
========================================================= */

const inputNombre = document.getElementById("clienteNombreInput");
const inputApodo = document.getElementById("clienteApodoInput");
const inputWhatsapp = document.getElementById("clienteWhatsappInput");
const inputInstagram = document.getElementById("clienteInstagramInput");
const inputNota = document.getElementById("clienteNotaInput");

const btnGuardar = document.getElementById("guardarClienteBtn");
const tablaBody = document.getElementById("listaClientes");

const modalEdit = document.getElementById("editarClienteModal");
const editNombre = document.getElementById("editNombre");
const editApodo = document.getElementById("editApodo");
const editWhatsapp = document.getElementById("editWhatsapp");
const editInstagram = document.getElementById("editInstagram");
const editNota = document.getElementById("editNota");
const editGuardar = document.getElementById("editGuardar");
const editCerrar = document.getElementById("editCerrar");

/* =========================================================
   STATE
========================================================= */

let clientes = [];
let clienteEditandoId = null;

/* =========================================================
   CARGAR CLIENTES
========================================================= */

async function cargarClientes() {
  clientes = [];
  tablaBody.innerHTML = "";

  const snap = await getDocs(collection(db, "clientes"));

  snap.forEach(d => clientes.push({ id: d.id, ...d.data() }));

  // Ordenar por nombre
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));

  renderLista();
}

/* =========================================================
   RENDER LISTA
========================================================= */

function renderLista() {
  tablaBody.innerHTML = "";

  clientes.forEach(c => {
    tablaBody.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.apodo || "—"}</td>
        <td>${c.whatsapp || "—"}</td>
        <td>${c.instagram || "—"}</td>
        <td>${c.nota || "—"}</td>

        <td>
          <button class="btn-pp" onclick="editarCliente('${c.id}')">✏️</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarCliente('${c.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });
}

/* =========================================================
   GUARDAR CLIENTE NUEVO
========================================================= */

btnGuardar.addEventListener("click", async () => {
  const nombre = inputNombre.value.trim();
  const apodo = inputApodo.value.trim();
  const whatsapp = inputWhatsapp.value.trim();
  const instagram = inputInstagram.value.trim();
  const nota = inputNota.value.trim();

  if (!nombre) return alert("El nombre del cliente es obligatorio.");

  const docData = {
    nombre,
    apodo,
    whatsapp,
    instagram,
    nota
  };

  try {
    await addDoc(collection(db, "clientes"), docData);

    alert("Cliente guardado ✔");
    limpiarFormulario();
    cargarClientes();
  } catch (err) {
    console.error(err);
    alert("Error al guardar el cliente.");
  }
});

/* =========================================================
   LIMPIAR FORMULARIO
========================================================= */

function limpiarFormulario() {
  inputNombre.value = "";
  inputApodo.value = "";
  inputWhatsapp.value = "";
  inputInstagram.value = "";
  inputNota.value = "";
}

/* =========================================================
   EDITAR CLIENTE
========================================================= */

window.editarCliente = id => {
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  clienteEditandoId = id;

  editNombre.value = c.nombre;
  editApodo.value = c.apodo || "";
  editWhatsapp.value = c.whatsapp || "";
  editInstagram.value = c.instagram || "";
  editNota.value = c.nota || "";

  modalEdit.classList.remove("hidden");
};

editCerrar.addEventListener("click", () => {
  modalEdit.classList.add("hidden");
  clienteEditandoId = null;
});

/* =========================================================
   GUARDAR EDICIÓN
========================================================= */

editGuardar.addEventListener("click", async () => {
  if (!clienteEditandoId) return;

  const nuevoNombre = editNombre.value.trim();
  const nuevoApodo = editApodo.value.trim();
  const nuevoWhatsapp = editWhatsapp.value.trim();
  const nuevoInstagram = editInstagram.value.trim();
  const nuevaNota = editNota.value.trim();

  if (!nuevoNombre) return alert("El nombre no puede estar vacío.");

  try {
    await updateDoc(doc(db, "clientes", clienteEditandoId), {
      nombre: nuevoNombre,
      apodo: nuevoApodo,
      whatsapp: nuevoWhatsapp,
      instagram: nuevoInstagram,
      nota: nuevaNota
    });

    alert("Cliente actualizado ✔");
    modalEdit.classList.add("hidden");
    clienteEditandoId = null;
    cargarClientes();
  } catch (err) {
    console.error(err);
    alert("Error al actualizar cliente.");
  }
});

/* =========================================================
   ELIMINAR CLIENTE
========================================================= */

window.eliminarCliente = async id => {
  if (!confirm("¿Eliminar cliente? Esta acción no se puede deshacer.")) return;

  try {
    await deleteDoc(doc(db, "clientes", id));

    alert("Cliente eliminado ✔");
    cargarClientes();
  } catch (err) {
    console.error(err);
    alert("Error al eliminar cliente.");
  }
};

/* =========================================================
   INIT
========================================================= */

(async function init() {
  await cargarClientes();
})();
