import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const grid = document.getElementById("productosLista");
const btnGuardar = document.getElementById("guardarProd");
const inputNombre = document.getElementById("prodNombre");
const inputPrecio = document.getElementById("prodPrecio");

// Venta actual UI
const ventaVacia = document.getElementById("ventaVacia");
const ventaTabla = document.getElementById("ventaTabla");
const ventaItemsBody = document.getElementById("ventaItems");
const ventaResumen = document.getElementById("ventaResumen");
const ventaTotalSpan = document.getElementById("ventaTotal");
const btnCancelarVenta = document.getElementById("btnCancelarVenta");
const btnFinalizarVenta = document.getElementById("btnFinalizarVenta");

// Modal venta
const modal = document.getElementById("ventaModal");
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const selectMetodoPago = document.getElementById("metodoPago");
const inputNotaVenta = document.getElementById("notaVenta");
const btnVentaCancelar = document.getElementById("ventaCancelar");
const btnVentaConfirmar = document.getElementById("ventaConfirmar");

// Cache de productos
let productosCache = {};
// Venta actual: array de { productoId, nombre, precio, cantidad }
let ventaItems = [];

async function cargarProductos() {
  grid.innerHTML = "";
  productosCache = {};

  const snap = await getDocs(collection(db, "productos"));

  snap.forEach((d) => {
    const p = d.data();
    productosCache[d.id] = p;

    grid.innerHTML += `
      <div class="producto-card">
        <div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-precio">$${p.precio}</div>
        </div>

        <button class="btn btn-primary" onclick="agregarAVenta('${d.id}')">
          💸 Vender
        </button>
      </div>
    `;
  });
}

window.agregarAVenta = function (id) {
  const prod = productosCache[id];
  if (!prod) return;

  const existente = ventaItems.find((i) => i.productoId === id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    ventaItems.push({
      productoId: id,
      nombre: prod.nombre,
      precio: prod.precio,
      cantidad: 1
    });
  }

  renderVenta();
};

function renderVenta() {
  if (ventaItems.length === 0) {
    ventaVacia.classList.remove("hidden");
    ventaTabla.classList.add("hidden");
    ventaResumen.classList.add("hidden");
    ventaTotalSpan.textContent = "$0";
    return;
  }

  ventaVacia.classList.add("hidden");
  ventaTabla.classList.remove("hidden");
  ventaResumen.classList.remove("hidden");

  ventaItemsBody.innerHTML = "";
  let total = 0;

  ventaItems.forEach((item, index) => {
    const subtotal = item.cantidad * item.precio;
    total += subtotal;

    ventaItemsBody.innerHTML += `
      <tr>
        <td>${item.nombre}</td>
        <td>
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, -1)">-</button>
          ${item.cantidad}
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, 1)">+</button>
        </td>
        <td>$${item.precio}</td>
        <td>$${subtotal}</td>
        <td><button class="btn btn-sm btn-danger" onclick="quitarItem(${index})">✕</button></td>
      </tr>
    `;
  });

  ventaTotalSpan.textContent = `$${total}`;
}

window.cambiarCantidad = function (index, delta) {
  const item = ventaItems[index];
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) {
    ventaItems.splice(index, 1);
  }

  renderVenta();
};

window.quitarItem = function (index) {
  ventaItems.splice(index, 1);
  renderVenta();
};

btnCancelarVenta.onclick = () => {
  if (!confirm("¿Cancelar venta actual?")) return;
  ventaItems = [];
  renderVenta();
};

btnFinalizarVenta.onclick = () => {
  if (ventaItems.length === 0) {
    alert("No hay productos en la venta.");
    return;
  }
  // abrir modal
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  selectMetodoPago.value = "Efectivo";
  inputNotaVenta.value = "";
  modal.classList.remove("hidden");
};

btnVentaCancelar.onclick = () => {
  modal.classList.add("hidden");
};

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

btnVentaConfirmar.onclick = async () => {
  if (ventaItems.length === 0) {
    alert("La venta está vacía.");
    return;
  }

  const clienteNombre = inputClienteNombre.value.trim() || "Sin nombre";
  const clienteTelefono = inputClienteTelefono.value.trim() || "";
  const metodoPago = selectMetodoPago.value;
  const nota = inputNotaVenta.value.trim();

  let total = 0;
  const items = ventaItems.map((i) => {
    const subtotal = i.cantidad * i.precio;
    total += subtotal;
    return {
      productoId: i.productoId,
      nombre: i.nombre,
      precioUnitario: i.precio,
      cantidad: i.cantidad,
      subtotal
    };
  });

  // 1) Guardar la venta
  const ventaRef = await addDoc(collection(db, "ventas"), {
    tipo: "VENTA",
    clienteNombre,
    clienteTelefono,
    metodoPago,
    nota,
    fecha: new Date().toISOString(),
    total,
    items
  });

  // 2) Crear movimiento de tipo VENTA con link a esta venta
  await addDoc(collection(db, "movimientos_stock"), {
    tipo: "VENTA",
    ventaId: ventaRef.id,
    clienteNombre,
    total,
    metodoPago,
    fecha: new Date().toISOString(),
    nota: nota || "Venta registrada desde Productos"
  });

  // limpiar venta actual
  ventaItems = [];
  renderVenta();
  modal.classList.add("hidden");
  alert("Venta registrada 💖");
};

btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const precio = Number(inputPrecio.value) || 0;

  if (!nombre) {
    alert("Ingresá un nombre");
    return;
  }

  await addDoc(collection(db, "productos"), { nombre, precio });

  inputNombre.value = "";
  inputPrecio.value = "";

  cargarProductos();
};

cargarProductos();
renderVenta();
