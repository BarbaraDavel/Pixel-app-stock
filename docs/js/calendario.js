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

  // Huecos antes del día 1
  for (let i = 0; i < primerDia; i++) {
    calendario.appendChild(document.createElement("div"));
  }

  // Días
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

        // 🔥 CLICK → ABRE MODAL
        pedido.onclick = () => {
          if (window.verPedidoDesdeCalendario) {
            window.verPedidoDesdeCalendario(p.id);
          } else {
            alert("El módulo de pedidos aún no está listo.");
          }
        };

        divDia.appendChild(pedido);
      });

    calendario.appendChild(divDia);
  }
}

/* ===============================
   NAVEGACIÓN DE MES
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
   PUENTE CON PEDIDOS.JS
   (NO TOCA SU LÓGICA)
================================ */
window.verPedidoDesdeCalendario = function (pedidoId) {
  // Esperamos a que pedidos.js esté cargado
  if (typeof window.verPedido === "function") {
    window.verPedido(pedidoId);
  } else {
    // retry corto por si carga después
    setTimeout(() => {
      if (typeof window.verPedido === "function") {
        window.verPedido(pedidoId);
      } else {
        alert("No se pudo abrir el pedido.");
      }
    }, 300);
  }
};

/* ===============================
   INIT
================================ */
(async function init() {
  await cargarPedidos();
  renderCalendario();
})();
