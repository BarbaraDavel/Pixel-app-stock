import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("clientesLista");

const inputNombre   = document.getElementById("clienteNombre");
const inputApodo    = document.getElementById("clienteApodo");
const inputTelefono = document.getElementById("clienteTelefono");
const inputRed      = document.getElementById("clienteRed");
const inputNota     = document.getElementById("clienteNota");
const btnGuardar    = document.getElementById("clienteGuardar");
const lblModo       = document.getElementById("clienteModo");

let clientes = {};
let editandoId = null;

// =========================
// CARGAR CLIENTES
// =========================
async function cargarClientes() {
  lista.innerHTML = "";
  clientes = {};

  const snap = await getDocs(collection(db, "clientes"));

  snap.forEach(d => {
    clientes[d.id] = d.data();
  });

  Object.entries(clientes).forEach(([id, c]) => {
    lista.innerHTML += `
      <tr>
        <td>${c.nombre || "—"}</td>
        <td>${c.apodo || "—"}</td>
        <td>${c.telefono || "—"}</td>
        <td>${c.red || "—"}</td>
        <td>${c.nota || "—"}</td>
        <td>
          <button class="btn-pp" onclick="editarCliente('${id}')">✏️</button>
          <button class="btn-pp btn-danger" onclick="borrarCliente('${id}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  lblModo.textContent = editandoId ? "Editando cliente..." : "";
}

// =========================
// GUARDAR / ACTUALIZAR
// =========================
btnGuardar.onclick = async () => {
  const nombre   = inputNombre.value.trim();
  const apodo    = inputApodo.value.trim();
  const telefono = inputTelefono.value.trim();
  const red      = inputRed.value.trim();
  const nota     = inputNota.value.trim();

  if (!nombre) {
    alert("Falta el nombre del cliente.");
    return;
  }

  const payload = { nombre, apodo, telefono, red, nota };

  try {
    if (editandoId) {
      await updateDoc(doc(db, "clientes", editandoId), payload);
    } else {
      await addDoc(collection(db, "clientes"), payload);
    }
  } catch (e) {
    console.error(e);
    alert("Error guardando cliente. Ver consola.");
    return;
  }

  // limpiar
  inputNombre.value   = "";
  inputApodo.value    = "";
  inputTelefono.value = "";
  inputRed.value      = "";
  inputNota.value     = "";
  editandoId = null;
  lblModo.textContent = "";

  cargarClientes();
};

// =========================
// EDITAR
// =========================
window.editarCliente = (id) => {
  const c = clientes[id];
  if (!c) return;

  editandoId = id;
  inputNombre.value   = c.nombre   || "";
  inputApodo.value    = c.apodo    || "";
  inputTelefono.value = c.telefono || "";
  inputRed.value      = c.red      || "";
  inputNota.value     = c.nota     || "";
  lblModo.textContent = "Editando cliente...";
};

// =========================
// BORRAR
// =========================
window.borrarCliente = async (id) => {
  if (!confirm("¿Eliminar cliente?")) return;

  await deleteDoc(doc(db, "clientes", id));

  if (editandoId === id) {
    editandoId = null;
    inputNombre.value   = "";
    inputApodo.value    = "";
    inputTelefono.value = "";
    inputRed.value      = "";
    inputNota.value     = "";
    lblModo.textContent = "";
  }

  cargarClientes();
};

// =========================
cargarClientes();
