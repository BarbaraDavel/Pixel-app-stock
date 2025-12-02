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

const inputNombre = document.getElementById("clienteNombre");
const inputApodo = document.getElementById("clienteApodo");
const inputWhatsapp = document.getElementById("clienteTelefono");
const inputInstagram = document.getElementById("clienteRed");
const inputNota = document.getElementById("clienteNota");

const btnGuardar = document.getElementById("clienteGuardar");
const tablaBody = document.getElementById("clientesLista");

/* === ELEMENTOS DEL MODAL DE EDICIÓN === */

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
        <td>${c.telefono || "—"}</td>
        <td>${c.red || "—"}</td>
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
  const telefono = inputWhatsapp.value.trim();
  const red = inputInstagram.value.trim();
  const nota = inputNota.value.trim();

  if (!nombre) return alert("El nombre del cliente es obligatorio.");

  const docData = { nombre, apodo, telefono, red, nota };

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
  editWhatsapp.value = c.telefono || "";
  editInstagram.value = c.red || "";
  editNota.value = c.nota || "";

  modalEdit.classList.remove("hidden");
};

/* =========================================================
   GUARDAR EDICIÓN
========================================================= */

editGuardar.addEventListener("click", async () => {
  if (!clienteEditandoId) return;

  try {
    await updateDoc(doc(db, "clientes", clienteEditandoId), {
      nombre: editNombre.value.trim(),
      apodo: editApodo.value.trim(),
      telefono: editWhatsapp.value.trim(),
      red: editInstagram.value.trim(),
      nota: editNota.value.trim()
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
   CERRAR MODAL
========================================================= */

if (editCerrar) {
  editCerrar.addEventListener("click", () => {
    modalEdit.classList.add("hidden");
    clienteEditandoId = null;
  });
}

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
