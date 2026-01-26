import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

  for (let i = 0; i < primerDia; i++) {
    calendario.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasMes; dia++) {
    const divDia = document.createElement("div");
    divDia.className = "dia";

    const numero = document.createElement("div");
    numero.className = "dia-numero";
    numero.innerText = dia;
    divDia.appendChild(numero);

    const fechaStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    pedidosCache
      .filter(p => p.fecha?.slice(0, 10) === fechaStr)
      .forEach(p => {
        const pedido = document.createElement("div");
        pedido.className = `pedido pedido-${p.estado.toLowerCase()}`;
        pedido.innerText = `${p.clienteNombre} – $${p.total}`;

        // 🔥 ABRIR MODAL (NO NAVEGAR)
        pedido.onclick = () => abrirModalPedido(p);

        divDia.appendChild(pedido);
      });

    calendario.appendChild(divDia);
  }
}

/* ===============================
   MODAL (reutiliza lógica de pedidos)
================================ */
function abrirModalPedido(p) {
  // reutilizamos el modal existente en pedidos.html
  // si no existe, lo creamos dinámicamente
  let modal = document.getElementById("pedidoModal");

  if (!modal) {
    alert("El modal de pedidos no está disponible.");
    return;
  }

  window.verPedido(p.id); // 🔥 llama a la misma función global
}

/* ===============================
   NAV MES
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
  renderCalendario();
})();
