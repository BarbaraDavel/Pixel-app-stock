// Pixel App - Control de Insumos, Productos y Stock
console.log("Pixel App cargada 🦊");

// Detectar en qué página estamos
const page = location.pathname.split("/").pop();
console.log("Página actual:", page);

/* -------------------------------------
   MANEJO DE INSUMOS
-------------------------------------- */
if (page === "insumos.html") {

  console.log("Cargando módulo de Insumos...");

  const form = document.getElementById("formInsumo");
  const lista = document.getElementById("listaInsumos");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre").value;
      const precio = document.getElementById("precio").value;
      const cantidad = document.getElementById("cantidad").value;

      const li = document.createElement("li");
      li.textContent = `${nombre} — $${precio}
