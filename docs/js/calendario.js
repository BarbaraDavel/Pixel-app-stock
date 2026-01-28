import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let fechaActual = new Date();
let pedidosCache = [];

/* ===============================
   UTIL – FECHA LOCAL ISO (AR)
================================ */
function fechaLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
   AVISO VISUAL HOY + MAÑANA
================================ */
function renderAvisoManiana() {
  const contenedor = document.getElementById("avisoManiana");
  if (!contenedor) return;

  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  const hoyStr = fechaLocalISO(hoy);
  const mananaStr = fechaLocalISO(manana);

  const pedidosHoy = pedidosCache.filter(p =>
    p.estado !== "ENTREGADO" &&
    p.fecha?.slice(0, 10) === hoyStr
  );

  const pedidosManiana = pedidosCache.filter(p =>
    p.estado !== "ENTREGADO" &&
    p.fecha?.slice(0, 10) === mananaStr
  );

  if (pedidosHoy.length === 0 && pedidosManiana.length === 0) {
    contenedor.classList.add("hidden");
    return;
  }

  contenedor.classList.remove("hidden");

  let html = "";

  if (pedidosHoy.length > 0) {
    html += `🔔 <strong>Hoy tenés ${pedidosHoy.length} entrega${pedidosHoy.length === 1 ? "" : "s"}</strong><br>`;
  }

  if (pedidosManiana.length > 0) {
    html += `🔔 <strong>Mañana tenés ${pedidosManiana.length} entrega${pedidosManiana.length === 1 ? "" : "s"}</strong>`;
  }

  contenedor.innerHTML = html;
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

  const hoyStr = fechaLocalISO(new Date());

  for (let dia = 1; dia <= diasMes; dia++) {
    const divDia = document.createElement("div");
    divDia.className = "dia";

    const fechaStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    if (fechaStr === hoyStr) {
      divDia.classList.add("dia-hoy");
    }

    const numero = document.createElement("div");
    numero.className = "dia-numero";
    numero.textContent = dia;
    divDia.appendChild(numero);

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
    `Fecha: ${new Date(p.fecha).toLocaleDateString("es-AR")}`;

  document.getElementById("calItems").innerHTML = p.items
    .map(i => `• ${i.cantidad} × ${i.nombre}`)
    .join("<br>");

  document.getElementById("calNota").textContent =
    p.nota || "—";

  document.getElementById("calTotal").textContent =
    `Total: $${p.total}`;

  document.getElementById("modalCalendario")
    .classList.remove("hidden");
}

document.getElementById("calCerrar").onclick = () => {
  document.getElementById("modalCalendario")
    .classList.add("hidden");
};

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
  renderAvisoManiana();
  renderCalendario();
})();
