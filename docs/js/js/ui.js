document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.querySelector(".nav-links");

  if (btn && nav) {
    btn.addEventListener("click", () => {
      nav.classList.toggle("open");
      btn.classList.toggle("open");
    });
  }
});
