import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("movLista");
const totalComprasSpan = document.getElementById("totalCompras");

// Modal
const modal = document.getElementById("ventaDetalleModal");
const modalTitulo = document.getElementById("modalVentaTitulo");
const modalFecha = document.getElementById("modalFecha");
const modalTelefono = document.getElementById("modalTelefono");
const modalPago = document.getElementById("modalPago");
const modalNota = document.getElementById("modalNota");
const modalItems = document.getElementById("modalItems");
const modalTotal = document.getElementById("modalTotal");
const modalCerrar = document.getElementById("modalCerrar");

let insumosCache = {};
let movimientosCache = [];

// =============================
// CARGAR INSUMOS
// =============================
async function cargarInsumos() {
  const snap = await getDocs(collection(db, "insumos"));

  snap.forEach((d) => {
    insumosCache[d.id] = d.data();
  });
}

// =============================
// CARGAR MOVIMIENTOS
// =============================
async function cargarMovimientos() {
  movimientosCache = [];
  const snap = await getDocs(collection(db, "movimientos_stock"));
  lista.innerHTML = "";
  let totalCompras = 0;

  snap.forEach((d) => movimientosCache.push({ id: d.id, ...d.data() }));

  movimientosCache.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  movimientosCache.forEach((m) => {
    let detalle = "—";

    if (m.tipo === "VENTA") {
      detalle = `Venta a ${m.clienteNombre}`;
    } else {
      detalle = insumosCache[m.insumoId]?.nombre || `(Insumo ${m.insumoId})`;
    }

    let costo = m.costoTotal ? `$${m.costoTotal}` : "—";

    if (m.tipo === "COMPRA" && m.costoTotal) {
      totalCompras += Number(m.costoTotal);
    }

    lista.innerHTML += `
      <tr>
        <td>${m.tipo}</td>
        <td>${detalle}</td>
        <td>${m.cantidad || "—"}</td>
        <td>${costo}</td>
        <td>${new Date(m.fecha).toLocaleString()}</td>
        <td>${m.nota || "—"}</td>
        <td>
          ${
            m.ventaId
              ? `<button class="btn-insumo" onclick="verVenta('${m.ventaId}')">Ver</button>`
              : "—"
          }
        </td>
      </tr>
    `;
  });

  totalComprasSpan.textContent = totalCompras;
}

// =============================
// VER VENTA
// =============================
window.verVenta = async function (id) {
  const ref = doc(db, "ventas", id);
  const d = await getDoc(ref);

  if (!d.exists()) return alert("Venta no encontrada.");

  const v = d.data();

  modalTitulo.textContent = `Venta a ${v.clienteNombre}`;
  modalFecha.textContent = new Date(v.fecha).toLocaleString();
  modalTelefono.textContent = v.clienteTelefono || "—";
  modalPago.textContent = v.metodoPago;
  modalNota.textContent = v.nota || "—";
  modalTotal.textContent = `$${v.total}`;

  modalItems.innerHTML = "";
  v.items.forEach((i) => {
    modalItems.innerHTML += `<p>${i.cantidad}× ${i.nombre} — $${i.subtotal}</p>`;
  });

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =============================
// INICIO
// =============================
(async () => {
  await cargarInsumos();
  await cargarMovimientos();
})();
