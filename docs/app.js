console.log("Pixel Stock Manager cargado correctamente 🦊");

// ========= LOCAL STORAGE =========

// Cargar insumos guardados (si hay)
let insumos = JSON.parse(localStorage.getItem("insumos")) || [];

// Guardar insumos en localStorage
function guardarInsumos() {
  localStorage.setItem("insumos", JSON.stringify(insumos));
}

// ========= DETECTAR PÁGINA: INSUMOS =========

const form = document.getElementById("formInsumo");
const lista = document.getElementById("listaInsumos");

if (form) {
  console.log("Página de INSUMOS detectada ✔");

  // mostrar los insumos guardados al cargar la página
  mostrarInsumos();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const precio = document.getElementById("precio").value;
    const cantidad = document.getElementById("cantidad").value;

    // Crear el insumo
    const nuevoInsumo = {
      id: Date.now(),
      nombre,
      precio: Number(precio),
      cantidad: Number(cantidad),
    };

    insumos.push(nuevoInsumo);

    guardarInsumos();
    mostrarInsumos();

    form.reset();
  });
}

// ========= FUNCION PARA MOSTRAR INSUMOS =========

function mostrarInsumos() {
  if (!lista) return;

  lista.innerHTML = ""; // limpiar lista

  insumos.forEach((insumo) => {
    const li = document.createElement("li");
    li.textContent = `${insumo.nombre} — $${insumo.precio} — ${insumo.cantidad} unidades`;
    lista.appendChild(li);
  });
}
