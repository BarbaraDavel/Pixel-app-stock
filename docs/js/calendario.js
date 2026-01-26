// js/calendario.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ===============================
   ESTADO
================================ */
let fechaActual = new Date();
let pedidosCache = [];

/* ===============================
   CARGAR PEDIDOS
================================ */
async function cargarPedidos() {
  pedidosCache = [];

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => {
    pedidosCache.push({ id: d.id, ...d.data() });
  });
}

/* ===============================
   RENDER CALENDARIO
================================ */
function renderCalendario() {
  const calendario = document.getElementById("calendario");
  calendario.innerHTML = "";

  const mes = fechaActual.getMonth();
  const año = fechaActual.getFullYear();

  document.getElementById("mesActual").innerText =
    fechaActual.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric"
    });

  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes = new Date(año, mes + 1, 0).getDate();

  // espacios vacíos inicio
  for (let i = 0; i < primerDia; i++) {
    calendario.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasMes; dia++) {
    const divDia = document.createElement("div");
    divDia.className = "dia";

    const numero = document.createElement("div");
    numero.className = "dia-numero";
    numero.textContent = dia;
    divDia.appendChild(numero);

    const fechaStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    pedidosCache
      .filter(p =>
        p.estado !== "ENTREGADO" &&                 // 🚫 ocultar entregados
        p.fecha?.slice(0, 10) === fechaStr
      )
      .forEach(p => {
        const pedido = document.createElement("div");
        pedido.className = `pedido pedido-${p.estado.toLowerCase()}`;
        pedido.textContent = `${p.clienteNombre} – $${p.total}`;

        pedido.onclick = () => abrirModalCalendario(p);

        divDia.appendChild(pedido);
      });

    calendario.appendChild(divDia);
  }
}

/* ===============================
   MODAL DEL CALENDARIO
================================ */
function abrirModalCalendario(p) {
  document.getElementById("calTitulo").textContent =
    `Pedido de ${p.clienteNombre}`;

  document.getElementById("calCliente").textContent =
    `Cliente: ${p.clienteNombre}`;

  document.getElementById("calEstado").textContent =
    `Estado: ${p.estado}`;

  document.getElementById("calFecha").textContent =
    `Fecha: ${new Date(p.fecha).toLocaleDateString()}`;

  document.getElementById("calItems").innerHTML = p.items
    .map(i => `• ${i.cantidad}× ${i.nombre} ($${i.subtotal})`)
    .join("<br>");

  document.getElementById("calNota").textContent = p.nota || "";
  document.getElementById("calTotal").textContent = `Total: $${p.total}`;

  document.getElementById("modalCalendario").classList.remove("hidden");
}

document.getElementById("calCerrar").onclick = () => {
  document.getElementById("modalCalendario").classList.add("hidden");
};

/* ===============================
   ALERTA ENTREGAS MAÑANA
================================ */
function alertasEntregasManiana() {
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  const mananaStr = manana.toISOString().slice(0, 10);

  const pedidosManiana = pedidosCache.filter(p =>
    p.estado !== "ENTREGADO" &&
    p.fecha?.slice(0, 10) === mananaStr
  );

  if (pedidosManiana.length > 0) {
    const nombres = pedidosManiana
      .map(p => `• ${p.clienteNombre}`)
      .join("\n");

    alert(
      `🔔 Mañana tenés ${pedidosManiana.length} entrega(s):\n\n${nombres}`
    );
  }
}

/* ===============================
   NAVEGACIÓN DE MESES
================================ */
document.getElementById("prevMes").onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() - 1);
  renderCalendario();
};

document.getElementById("nextMes").onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() + 1);
  renderCalendario();
};

/* ===============================
   INIT
================================ */
(async function init() {
  await cargarPedidos();
  alertasEntregasManiana(); // 🔔
  renderCalendario();
})();
