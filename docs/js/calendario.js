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
   AVISO VISUAL MAÑANA
================================ */
function renderAvisoManiana() {
  const contenedor = document.getElementById("avisoManiana");
  if (!contenedor) return;

  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  const mananaStr = manana.toISOString().slice(0, 10);

  const pedidosManiana = pedidosCache.filter(p =>
    p.estado !== "ENTREGADO" &&
    p.fecha?.slice(0, 10) === mananaStr
  );

  if (pedidosManiana.length === 0) {
    contenedor.classList.add("hidden");
    return;
  }

  contenedor.classList.remove("hidden");
  contenedor.innerHTML = `
    🔔 <strong>Mañana tenés ${pedidosManiana.length} entrega(s)</strong>
  `;
}

/* ===============================
   RENDER CALENDARIO
================================ */
function renderCalendario() {
  const calendario = document.getElementById("calendario");
  calendario.innerHTML = "";

  const mes = fechaActual.getMonth();
  const año = fechaActual.getFullYear();

  document.getElementById("mesActual").textContent =
    fechaActual.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric"
    });

  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes = new Date(año, mes + 1, 0).getDate();

  for (let i = 0; i < primerDia; i++) {
    calendario.appendChild(document.createElement("div"));
  }

  const hoy = new Date();

  for (let dia = 1; dia <= diasMes; dia++) {
    const divDia = document.createElement("div");
    divDia.className = "dia";

    // 🔥 HOY BIEN MARCADO
    if (
      dia === hoy.getDate() &&
      mes === hoy.getMonth() &&
      año === hoy.getFullYear()
    ) {
      divDia.classList.add("dia-hoy");
    }

    const numero = document.createElement("div");
    numero.className = "dia-numero";
    numero.textContent = dia;
    divDia.appendChild(numero);

    const fechaStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    pedidosCache
      .filter(p =>
        p.estado !== "ENTREGADO" &&
        p.fecha?.slice(0, 10) === fechaStr
      )
      .forEach(p => {
        const pedido = document.createElement("div");
        pedido.className = `pedido pedido-${p.estado.toLowerCase()}`;
        pedido.textContent = `${p.clienteNombre} – $${p.total}`;
        pedido.onclick = () => abrirModal(p);
        divDia.appendChild(pedido);
      });

    calendario.appendChild(divDia);
  }
}

/* ===============================
   MODAL
================================ */
function abrirModal(p) {
  document.getElementById("calTitulo").textContent =
    `Pedido de ${p.clienteNombre}`;
  document.getElementById("calEstado").textContent =
    `Estado: ${p.estado}`;
  document.getElementById("calFecha").textContent =
    `Fecha: ${new Date(p.fecha).toLocaleDateString()}`;
  document.getElementById("calItems").innerHTML = p.items
    .map(i => `• ${i.cantidad}× ${i.nombre}`)
    .join("<br>");
  document.getElementById("calNota").textContent = p.nota || "";
  document.getElementById("calTotal").textContent = `Total: $${p.total}`;

  document.getElementById("modalCalendario")
    .classList.remove("hidden");
}

document.getElementById("calCerrar").onclick = () => {
  document.getElementById("modalCalendario")
    .classList.add("hidden");
};

/* ===============================
   NAV MESES
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
  renderAvisoManiana();
  renderCalendario();
})();
