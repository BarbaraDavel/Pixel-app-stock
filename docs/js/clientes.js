import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tbody = document.getElementById("clientesLista");

const modal = document.getElementById("clienteModal");
const modalTitulo = document.getElementById("clienteModalTitulo");
const modalBody = document.getElementById("clienteModalBody");
const modalCerrar = document.getElementById("clienteModalCerrar");

let clientesMapa = {};

async function cargarClientes() {
  clientesMapa = {};
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "ventas"));

  snap.forEach(d => {
    const v = d.data();

    const nombre = (v.clienteNombre || "Sin nombre").trim();
    const tel = (v.clienteTelefono || "").trim();
    const key = `${nombre}||${tel}`;

    const total = v.total ?? 0;
    const fecha = v.fecha ? new Date(v.fecha) : null;

    if (!clientesMapa[key]) {
      clientesMapa[key] = {
        nombre,
        telefono: tel || "—",
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

    if (fecha && (!c.ultimaFecha || fecha > c.ultimaFecha)) {
      c.ultimaFecha = fecha;
    }
  });

  Object.values(clientesMapa).forEach((c, idx) => {
    tbody.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.telefono}</td>
        <td>${c.compras}</td>
        <td>$${c.totalGastado}</td>
        <td>${c.ultimaFecha ? c.ultimaFecha.toLocaleString("es-AR") : "—"}</td>
        <td><button onclick="verCliente('${idx}')" class="btn btn-sm btn-outline">Ver</button></td>
      </tr>
    `;
  });
}

window.verCliente = (indexStr) => {
  const index = Number(indexStr);
  const lista = Object.values(clientesMapa);
  const c = lista[index];

  modalTitulo.textContent = `Compras de ${c.nombre}`;
  modalBody.innerHTML = "";

  c.ventas.forEach(v => {
    const fecha = v.fecha ? new Date(v.fecha).toLocaleString("es-AR") : "—";

    const items = v.items?.map(i =>
      `${i.cantidad}× ${i.nombre} — $${i.subtotal}`
