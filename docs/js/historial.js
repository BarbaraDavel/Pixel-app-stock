import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaVentas");
const totalAcumulado = document.getElementById("totalAcumulado");

async function cargarVentas() {
  lista.innerHTML = "";
  let totalGlobal = 0;

  const snap = await getDocs(collection(db, "ventas"));

  snap.forEach((d) => {
    const v = d.data();

    // Compatibilidad con ventas viejas simples
    let total = 0;
    let detalle = "";

    if (v.items && Array.isArray(v.items) && v.items.length > 0) {
      total = v.total ?? v.items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
      detalle = v.items
        .map((it) => `${it.cantidad}× ${it.nombre}`)
        .join(", ");
    } else {
      // forma vieja: nombre + precio
      total = Number(v.precio) || 0;
      detalle = v.nombre || "(sin detalle)";
    }

    totalGlobal += total;

    const cliente = v.clienteNombre || "—";
    const pago = v.metodoPago || "—";
    const fecha = v.fecha
      ? new Date(v.fecha).toLocaleString("es-AR")
      : "—";

    lista.innerHTML += `
      <tr>
        <td>${cliente}</td>
        <td>${detalle}</td>
        <td>$${total}</td>
        <td>${pago}</td>
        <td>${fecha}</td>
      </tr>
    `;
  });

  totalAcumulado.textContent = `$${totalGlobal}`;
}

cargarVentas();
