import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =====================================================
   ESTADO
===================================================== */
let fechaActual = new Date();
let pedidosCache = [];
let pedidoModalActual = null;

/* =====================================================
   DOM
===================================================== */
const btnGoogleCalendar = document.getElementById("calGoogleCalendar");
const btnQuitarCalendar = document.getElementById("calQuitarCalendar");

/* =====================================================
   UTIL – FECHA LOCAL ISO (AR)
===================================================== */
function fechaLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =====================================================
   CARGAR PEDIDOS
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => {
    pedidosCache.push({ id: d.id, ...d.data() });
  });
}

/* =====================================================
   AVISO VISUAL HOY + MAÑANA
===================================================== */
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

  if (!pedidosHoy.length && !pedidosManiana.length) {
    contenedor.classList.add("hidden");
    return;
  }

  contenedor.classList.remove("hidden");

  let html = "";
  if (pedidosHoy.length) {
    html += `🔔 <strong>Hoy tenés ${pedidosHoy.length} entrega${pedidosHoy.length === 1 ? "" : "s"}</strong><br>`;
  }
  if (pedidosManiana.length) {
    html += `🔔 <strong>Mañana tenés ${pedidosManiana.length} entrega${pedidosManiana.length === 1 ? "" : "s"}</strong>`;
  }

  contenedor.innerHTML = html;
}

/* =====================================================
   RENDER CALENDARIO
===================================================== */
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
    if (fechaStr === hoyStr) divDia.classList.add("dia-hoy");

    const numero = document.createElement("div");
    numero.className = "dia-numero";
    numero.textContent = dia;
    divDia.appendChild(numero);

    pedidosCache
      .filter(p => p.estado !== "ENTREGADO" && p.fecha?.slice(0, 10) === fechaStr)
      .forEach(p => {
        const pedido = document.createElement("div");
        pedido.className = `pedido pedido-${p.estado.toLowerCase()}`;

        const marcado = pedidoYaEnCalendar(p.id) ? " 📅" : "";
        pedido.textContent = `${p.clienteNombre} – $${p.total}${marcado}`;
        pedido.onclick = () => abrirModal(p);

        divDia.appendChild(pedido);
      });

    calendario.appendChild(divDia);
  }
}

/* =====================================================
   MODAL
===================================================== */
function abrirModal(p) {
  pedidoModalActual = p;

  document.getElementById("calTitulo").textContent =
    `Pedido de ${p.clienteNombre}`;

  document.getElementById("calEstado").textContent =
    `Estado: ${p.estado}`;

  document.getElementById("calFecha").textContent =
    `Fecha: ${new Date(p.fecha).toLocaleDateString("es-AR")}`;

  document.getElementById("calItems").innerHTML =
    p.items.map(i => `• ${i.cantidad} × ${i.nombre}`).join("<br>");

  document.getElementById("calNota").textContent =
    p.nota || "—";

  document.getElementById("calTotal").textContent =
    `Total: $${p.total}`;

  if (btnGoogleCalendar && btnQuitarCalendar) {
    if (p.estado === "LISTO") {
      btnGoogleCalendar.style.display = "inline-flex";
      btnQuitarCalendar.style.display = "none";

      if (pedidoYaEnCalendar(p.id)) {
        btnGoogleCalendar.textContent = "📅 Ya agregado";
        btnGoogleCalendar.disabled = true;

        btnQuitarCalendar.style.display = "inline-flex";
        btnQuitarCalendar.onclick = () => quitarDeCalendar(p.id);
      } else {
        btnGoogleCalendar.textContent = "📅 Google Calendar";
        btnGoogleCalendar.disabled = false;
        btnGoogleCalendar.onclick = () => abrirEnGoogleCalendar(p);
      }
    } else {
      btnGoogleCalendar.style.display = "none";
      btnQuitarCalendar.style.display = "none";
    }
  }

  document.getElementById("modalCalendario")
    .classList.remove("hidden");
}

document.getElementById("calCerrar").onclick = () => {
  document.getElementById("modalCalendario")
    .classList.add("hidden");
};

/* =====================================================
   NAVEGACIÓN MESES
===================================================== */
document.getElementById("prevMes").onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() - 1);
  renderCalendario();
};

document.getElementById("nextMes").onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() + 1);
  renderCalendario();
};

/* =====================================================
   GOOGLE CALENDAR
===================================================== */
function abrirEnGoogleCalendar(p) {
  if (!p || !p.fecha) return;

  const fecha = new Date(p.fecha);
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");

  const fechaGCal = `${yyyy}${mm}${dd}/${yyyy}${mm}${dd}`;

  const titulo = `Pedido Pixel – ${p.clienteNombre}`;
  const detalles = `
Cliente: ${p.clienteNombre}
Estado: ${p.estado}
Total: $${p.total}
${p.nota ? `Nota: ${p.nota}` : ""}
  `.trim();

  const url =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(titulo)}` +
    `&dates=${fechaGCal}` +
    `&details=${encodeURIComponent(detalles)}`;

  window.open(url, "_blank");

  setTimeout(() => {
    if (confirm("¿Agregaste este pedido a Google Calendar?")) {
      marcarPedidoEnCalendar(p.id);
      renderCalendario();
      abrirModal(p);
    }
  }, 800);
}

function quitarDeCalendar(id) {
  if (!confirm("¿Quitar este pedido del calendario?")) return;

  const data = JSON.parse(
    localStorage.getItem("pixel_calendar_pedidos") || "[]"
  ).filter(x => x !== id);

  localStorage.setItem(
    "pixel_calendar_pedidos",
    JSON.stringify(data)
  );

  renderCalendario();
  if (pedidoModalActual) abrirModal(pedidoModalActual);
}

function pedidoYaEnCalendar(id) {
  const data = JSON.parse(
    localStorage.getItem("pixel_calendar_pedidos") || "[]"
  );
  return data.includes(id);
}

function marcarPedidoEnCalendar(id) {
  const data = JSON.parse(
    localStorage.getItem("pixel_calendar_pedidos") || "[]"
  );
  if (!data.includes(id)) {
    data.push(id);
    localStorage.setItem(
      "pixel_calendar_pedidos",
      JSON.stringify(data)
    );
  }
}

/* =====================================================
   INIT
===================================================== */
(async function init() {
  await cargarPedidos();
  renderAvisoManiana();
  renderCalendario();
})();
