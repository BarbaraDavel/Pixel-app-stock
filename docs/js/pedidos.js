import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaPedidos");
const btnGuardar = document.getElementById("pedidoGuardar");

const inputCliente = document.getElementById("pedidoCliente");
const inputDetalle = document.getElementById("pedidoDetalle");
const inputFecha = document.getElementById("pedidoFecha");
const inputEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");

// Modal refs
const modal = document.getElementById("pedidoModal");
const modalCliente = document.getElementById("modalCliente");
const modalDetalle = document.getElementById("modalDetalle");
const modalFecha = document.getElementById("modalFecha");
const modalEstado = document.getElementById("modalEstado");
const modalNota = document.getElementById("modalNota");
const modalGuardar = document.getElementById("modalGuardar");
const modalCerrar = document.getElementById("modalCerrar");

let pedidosCache = {};
let editId = null;

// ===============================
// Cargar pedidos
// ===============================
async function cargarPedidos() {
  lista.innerHTML = "";
  pedidosCache = {};

  const snap = await getDocs(collection(db, "pedidos"));

  snap.forEach((d) => {
    const p = d.data();
    pedidosCache[d.id] = p;

    lista.innerHTML += `
      <tr>
        <td>${p.cliente}</td>
        <td>${p.detalle}</td>
        <td>${p.fecha || "-"}</td>
        <td>${estadoBadge(p.estado)}</td>
        <td>
          <button class="btn-pp btn-edit-pp" onclick="editarPedido('${d.id}')">✏️ Editar</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarPedido('${d.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `;
  });
}

// Badge del estado
function estadoBadge(e) {
  switch (e) {
    case "PENDIENTE": return "🟥 Pendiente";
    case "PROCESO": return "🟨 En proceso";
    case "LISTO": return "🟪 Listo";
    case "ENTREGADO": return "🟩 Entregado";
    default: return e;
  }
}

// ===============================
// Guardar nuevo pedido
// ===============================
btnGuardar.onclick = async () => {
  const cliente = inputCliente.value.trim();
  const detalle = inputDetalle.value.trim();
  const fecha = inputFecha.value;
  const estado = inputEstado.value;
  const nota = inputNota.value.trim();

  if (!cliente || !detalle) {
    alert("Completá cliente y detalle.");
    return;
  }

  await addDoc(collection(db, "pedidos"), {
    cliente,
    detalle,
    fecha,
    estado,
    nota
  });

  inputCliente.value = "";
  inputDetalle.value = "";
  inputFecha.value = "";
  inputEstado.value = "PENDIENTE";
  inputNota.value = "";

  cargarPedidos();
};

// ===============================
// Editar pedido
// ===============================
window.editarPedido = (id) => {
  editId = id;
  const p = pedidosCache[id];

  modalCliente.value = p.cliente;
  modalDetalle.value = p.detalle;
  modalFecha.value = p.fecha;
  modalEstado.value = p.estado;
  modalNota.value = p.nota || "";

  modal.classList.remove("hidden");
};

modalGuardar.onclick = async () => {
  if (!editId) return;

  await updateDoc(doc(db, "pedidos", editId), {
    cliente: modalCliente.value.trim(),
    detalle: modalDetalle.value.trim(),
    fecha: modalFecha.value,
    estado: modalEstado.value,
    nota: modalNota.value.trim()
  });

  modal.classList.add("hidden");
  cargarPedidos();
};

// ===============================
// Eliminar
// ===============================
window.eliminarPedido = async (id) => {
  if (!confirm("¿Eliminar pedido?")) return;

  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

modalCerrar.onclick = () => modal.classList.add("hidden");
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// ===============================
cargarPedidos();
