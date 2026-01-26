// js/calendario.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const calendarioEl = document.getElementById("calendario");
const mesActualEl = document.getElementById("mesActual");
const btnPrev = document.getElementById("prevMes");
const btnNext = document.getElementById("nextMes");

let fechaActual = new Date();
let pedidosCache = [];

/* ===============================
   COLORES POR ESTADO
================================ */
function claseEstado(estado) {
  switch (estado) {
    case "PENDIENTE": return "pedido pendiente";
    case "PROCESO": return "pedido proceso";
    case "LISTO": return "pedido listo";
    case "ENTREGADO": return "pedido entregado";
    default: return "pedido";
  }
}

/* ===============================
   CARGAR PEDIDOS DESDE FIRESTORE
================================ */
async function cargarPedidos() {
  pedidosCache = [];

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => {
    pedidosCache.push({
      id: d.id,
      ...d.data()
    });
  });

  renderCalendario();
}

/* ===============================
   RENDER CALENDARIO
================================ */
function renderCalendario() {
  calendarioEl.innerHTML = "";

  const mes = fechaActual.getMonth();
  const año = fechaActual.getFullYear();

  mesActualEl.textContent = fechaActual.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric"
  });

  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes = new Date(año, mes + 1, 0).getDate();

  // Espacios vacíos al inicio
  for (let i = 0; i < primerDia; i++) {
    calendarioEl.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasMes; dia++) {
    const diaEl = document.createElement("div");
    diaEl.className = "dia";

    const nro = document.createElement("div");
    nro.className = "dia-numero";
    nro.textContent = dia;
    diaEl.appendChild(nro);

    const fechaStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    pedidosCache
      .filter(p => p.fecha?.startsWith(fechaStr))
      .forEach(p => {
        const pedidoEl = document.createElement("div");
        pedidoEl.className = claseEstado(p.estado);
        pedidoEl.textContent = `${p.clienteNombre} – $${p.total}`;

        pedidoEl.onclick = () => abrirPedido(p.id);

        diaEl.appendChild(pedidoEl);
      });

    calendarioEl.appendChild(diaEl);
  }
}

/* ===============================
   ABRIR PEDIDO
================================ */
function abrirPedido(pedidoId) {
  // opción A: ir a pedidos.html y abrir modal
  localStorage.setItem("pedidoAbrir", pedidoId);
  window.location.href = "pedidos.html";
}

/* ===============================
   NAVEGACIÓN MESES
================================ */
btnPrev.onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() - 1);
  renderCalendario();
};

btnNext.onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() + 1);
  renderCalendario();
};

/* ===============================
   INIT
================================ */
cargarPedidos();
