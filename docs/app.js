// ===============================
// UI GENERAL (menú, bottom nav, SW)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // ===== MENÚ HAMBURGUESA =====
  const burger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");

  if (burger && navLinks) {
    burger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  // Cerrar menú si se toca un link (mobile)
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
import { db } from "./js/firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// elementos del home
const elPendientes = document.getElementById("homePendientes");
const elListos = document.getElementById("homeListos");
const elNoPagado = document.getElementById("homeNoPagado");

async function cargarResumenHome() {
  // si no estamos en el index, no hace nada
  if (!elPendientes || !elListos || !elNoPagado) return;

  let pendientes = 0;
  let listos = 0;
  let noPagado = 0;

  try {
    const snap = await getDocs(collection(db, "pedidos"));

    snap.forEach(d => {
      const p = d.data();

      // 📦 Pendientes = PENDIENTE + PROCESO
      if (p.estado === "PENDIENTE" || p.estado === "PROCESO") {
        pendientes++;
      }

      // 🟪 Listos para entregar
      if (p.estado === "LISTO") {
        listos++;
      }

      // 💰 No pagado (independiente del estado)
      if (!p.pagado) {
        noPagado += Number(p.total || 0);
      }
    });

    elPendientes.textContent = pendientes;
    elListos.textContent = listos;
    elNoPagado.textContent = `$${noPagado}`;

  } catch (err) {
    console.error("Error cargando resumen home:", err);
  }
}

// ⬇️ ejecutar UNA sola vez
document.addEventListener("DOMContentLoaded", cargarResumenHome);
