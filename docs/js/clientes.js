import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("clientesLista");

// Modal
const modal = document.getElementById("clienteModal");
const modalTitulo = document.getElementById("clienteModalTitulo");
const modalMovs = document.getElementById("clienteMovimientos");
const modalTotal = document.getElementById("clienteModalTotal");
const modalCerrar = document.getElementById("clienteModalCerrar");

let ventasCache = [];

// =========================
// CARGAR CLIENTES
// =========================
async function cargarClientes() {
  lista.innerHTML = "";
  ventasCache = [];

  const snap = await getDocs(collection(db, "ventas"));

  snap.forEach(d => ventasCache.push({ id: d.id, ...d.data() }));

  // Agrupar por cliente
  const clientesMap = {};

  ventasCache.forEach(v => {
    if (!clientesMap[v.clienteNombre]) {
      clientesMap[v.clienteNombre] = {
        telefono: v.clienteTelefono || "—",
        total: 0,
        ultima: null,
        movimientos: []
      };
    }

    const c = clientesMap[v.clienteNombre];

    c.total += v.total;
    c.movimientos.push(v);

    if (!c.ultima || new Date(v.fecha) > new Date(c.ultima)) {
      c.ultima = v.fecha;
    }
  });

  // Mostrar tabla
  Object.entries(clientesMap).forEach(([nombre, data]) => {
    lista.innerHTML += `
      <tr>
        <td>${nombre}</td>
        <td>${data.telefono}</td>
        <td>$${data.total}</td>
        <td>${data.ultima ? new Date(data.ultima).toLocaleString() : "—"}</td>
        <td>
          <button class="btn-pp btn-edit-pp" onclick="verDetalleCliente('${nombre}')">
            👁️ Ver
          </button>
        </td>
      </tr>
    `;
  });
}

// =========================
// MODAL DETALLE CLIENTE
// =========================
window.verDetalleCliente = function(nombre) {
  const datos = ventasCache.filter(v => v.clienteNombre === nombre);

  modalTitulo.textContent = `Compras de ${nombre}`;
  modalMovs.innerHTML = "";
  let total = 0;

  datos.forEach(v => {
    modalMovs.innerHTML += `
      <div style="margin-bottom:0.8rem;">
        <strong>${new Date(v.fecha).toLocaleString()}</strong><br>
        ${v.items.map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`).join("<br>")}
        <br><strong>Total:</strong> $${v.total}
      </div>
    `;
    total += v.total;
  });

  modalTotal.textContent = `Total gastado: $${total}`;

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =========================
cargarClientes();
