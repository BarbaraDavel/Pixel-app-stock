import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tbody = document.getElementById("clientesLista");

// modal
const modal = document.getElementById("clienteModal");
const modalTitulo = document.getElementById("clienteModalTitulo");
const modalBody = document.getElementById("clienteModalBody");
const modalCerrar = document.getElementById("clienteModalCerrar");

let clientesMapa = {}; // key -> { nombre, telefono, total, compras, ultimaFecha, ventas: [] }

async function cargarClientes() {
  clientesMapa = {};
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "ventas"));

  snap.forEach(d => {
    const v = d.data();
    const nombre = (v.clienteNombre || "Sin nombre").trim();
    const tel = (v.clienteTelefono || "").trim();
    const key = `${nombre}||${tel}`;

    let total = 0;
    if (v.items && Array.isArray(v.items) && v.items.length > 0) {
      total = v.total ?? v.items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
    } else {
      total = Number(v.precio) || 0;
    }

    const fecha = v.fecha ? new Date(v.fecha) : null;

    if (!clientesMapa[key]) {
      clientesMapa[key] = {
        nombre,
        telefono: tel,
        totalGastado: 0,
        compras: 0,
        ultimaFecha: null,
        ventas: []
      };
    }

    const c = clientesMapa[key];
    c.totalGastado += total;
    c.compras += 1;
    c.ventas.push(v);

    if (fecha) {
      if (!c.ultimaFecha || fecha > c.ultimaFecha) {
        c.ultimaFecha = fecha;
      }
    }
  });

  Object.values(clientesMapa).forEach((c, idx) => {
    const fechaTexto = c.ultimaFecha
      ? c.ultimaFecha.toLocaleString("es-AR")
      : "—";

    tbody.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.telefono || "—"}</td>
        <td>${c.compras}</td>
        <td>$${c.totalGastado}</td>
        <td>${fechaTexto}</td>
        <td><button class="btn btn-sm btn-outline" onclick="verCliente('${idx}')">Ver</button></td>
      </tr>
    `;
  });
}

window.verCliente = function(indexStr) {
  const index = Number(indexStr);
  const lista = Object.values(clientesMapa);
  const c = lista[index];
  if (!c) return;

  modalTitulo.textContent = `Compras de ${c.nombre}`;
  modalBody.innerHTML = "";

  c.ventas.forEach(v => {
    const fechaTxt = v.fecha ? new Date(v.fecha).toLocaleString("es-AR") : "—";
    let total = 0;
    let detalle = "";

    if (v.items && Array.isArray(v.items) && v.items.length > 0) {
      total = v.total ?? v.items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
      detalle = v.items.map(it => `${it.cantidad}× ${it.nombre}`).join(", ");
    } else {
      total = Number(v.precio) || 0;
      detalle = v.nombre || "(sin detalle)";
    }

    const medio = v.metodoPago || "—";
    const nota = v.nota ? `<br><em>Nota: ${v.nota}</em>` : "";

    modalBody.innerHTML += `
      <p>
        <strong>${fechaTxt}</strong><br>
        ${detalle}<br>
        Total: $${total} · Pago: ${medio}
        ${nota}
      </p>
      <hr style="margin:0.4rem 0; border:none; border-top:1px solid #eee;">
    `;
  });

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

cargarClientes();
