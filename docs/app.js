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
