document.addEventListener("DOMContentLoaded", () => {
  // ===== MENÚ HAMBURGUESA =====
  const burger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");

  if (burger && navLinks) {
    burger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  // Cerrar menú si se toca un link (en mobile)
  if (navLinks) {
    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        navLinks.classList.remove("open");
      });
    });
  }

  // ===== BOTTOM NAV ACTIVO =====
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".bottom-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href && href.endsWith(path)) {
      link.classList.add("active");
    }
  });

  // ===== SERVICE WORKER (PWA) =====
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW error", err));
  }
});
// ===============================
// HOME - RESUMEN PEDIDOS
// ===============================
import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

async function cargarResumenHome() {
  const elActivos = document.getElementById("homePedidosActivos");
  const elNoPagado = document.getElementById("homeNoPagado");

  // Si no estamos en el home, no hace nada
  if (!elActivos || !elNoPagado) return;

  let activos = 0;
  let noPagado = 0;

  try {
    const snap = await getDocs(collection(db, "pedidos"));

    snap.forEach(d => {
      const p = d.data();

      // 📦 pedidos activos
      if (p.estado !== "ENTREGADO") {
        activos++;
      }

      // 💰 total no pagado
      if (!p.pagado) {
        noPagado += Number(p.total || 0);
      }
    });

    elActivos.textContent = activos;
    elNoPagado.textContent = `$${noPagado}`;
  } catch (err) {
    console.error("Error cargando resumen home:", err);
  }
}

// ejecutar al cargar
document.addEventListener("DOMContentLoaded", cargarResumenHome);
const elPendientes = document.getElementById("homePendientes");
const elListos = document.getElementById("homeListos");
const elNoPagado = document.getElementById("homeNoPagado");

async function cargarResumenHome() {
  if (!elPendientes || !elListos || !elNoPagado) return;

  let pendientes = 0;
  let listos = 0;
  let noPagado = 0;

  try {
    const snap = await getDocs(collection(db, "pedidos"));

    snap.forEach(d => {
      const p = d.data();

      if (p.estado === "PENDIENTE" || p.estado === "PROCESO") {
        pendientes++;
      }

      if (p.estado === "LISTO") {
        listos++;
      }

      if (!p.pagado) {
        noPagado += Number(p.total || 0);
      }
    });

    elPendientes.textContent = pendientes;
    elListos.textContent = listos;
    elNoPagado.textContent = `$${noPagado}`;

  } catch (err) {
    console.error("Error resumen home:", err);
  }
}

document.addEventListener("DOMContentLoaded", cargarResumenHome);
