console.log("Pixel Stock Manager cargado correctamente 🦊");

// ---- VARIABLES ----
let insumos = []; // memoria temporal hasta conectar Firebase

// ---- DETECTAR SI ESTAMOS EN LA PAGINA DE INSUMOS ----
const form = document.getElementById("formInsumo");
const lista = document.getElementById("listaInsumos");

if (form) {
  console.log("Página de INSUMOS detectada ✔");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const precio = document.getElementById("precio").value;
    const cantidad = document.getElementById("cantidad").value;

    // crear el insumo
    const nuevoInsumo = {
      id: Date.now(),
      nombre,
      precio,
      cantidad,
    };

    insumos.push(nuevoInsumo);
    mostrarInsumos();

    // limpiar formulario
    form.reset();
  });
}

// ---- FUNCION PARA MOSTRAR INSUMOS ----
function mostrarInsumos() {
  if (!lista) return;

  lista.innerHTML = ""; // limpiar

  insumos.forEach((insumo) => {
    const li = document.createElement("li");
    li.textContent = `${insumo.nombre} — $${insumo.precio} — ${insumo.cantidad} unidades`;
    lista.appendChild(li);
  });
}
