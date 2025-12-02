import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ============================================================
   ELEMENTOS DEL DOM
============================================================ */

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
const modalVenta = document.getElementById("ventaModal");
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const selectMetodoPago = document.getElementById("metodoPago");
const inputNotaVenta = document.getElementById("notaVenta");
const btnVentaCancelar = document.getElementById("ventaCancelar");
const btnVentaConfirmar = document.getElementById("ventaConfirmar");

// Modal editar producto
const modalEditar = document.getElementById("editarProductoModal");
const editNombre = document.getElementById("editNombre");
const editPrecio = document.getElementById("editPrecio");
const recetaDetalle = document.getElementById("recetaProductoDetalle");
const costoBox = document.getElementById("costoProduccionBox");
const gananciaBox = document.getElementById("gananciaBox");
const btnCancelarEdicion = document.getElementById("cancelarEdicion");
const btnGuardarEdicion = document.getElementById("guardarEdicion");

// Cache
let productosCache = {};
let ventaItems = [];
let productoEditandoId = null;

/* ============================================================
   POPUP PIXEL (globito violeta)
============================================================ */
function popup(msg) {
  const box = document.getElementById("popupPixel");
  const txt = document.getElementById("popupText");
  if (!box || !txt) return alert(msg);

  txt.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 2000);
}

/* ============================================================
   CARGAR PRODUCTOS
============================================================ */
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

        <div class="producto-actions">
          <button class="btn btn-outline" onclick="editarProducto('${d.id}')">Editar</button>
          <button class="btn btn-delete-pp" onclick="eliminarProducto('${d.id}')">✕</button>
          <button class="btn btn-primary" onclick="agregarAVenta('${d.id}')">💸 Vender</button>
        </div>
      </div>
    `;
  });
}

/* ============================================================
   CARGAR RECETAS + COSTO + GANANCIA
============================================================ */
async function cargarRecetaYCostos(productoId) {
  if (!recetaDetalle || !costoBox) return;

  recetaDetalle.innerHTML = "Cargando...";
  costoBox.innerHTML = "Calculando...";
  if (gananciaBox) gananciaBox.innerHTML = "";

  const recetasSnap = await getDocs(
    query(collection(db, "recetas"), where("productoId", "==", productoId))
  );
  const insumosSnap = await getDocs(collection(db, "insumos"));

  const insumosMap = {};
  insumosSnap.forEach((i) => (insumosMap[i.id] = i.data()));

  const recetaLista = [];
  recetasSnap.forEach((r) => recetaLista.push(r.data()));

  if (recetaLista.length === 0) {
    recetaDetalle.innerHTML = `<p class="hint">Este producto no tiene recetas asignadas.</p>`;
    costoBox.innerHTML = `<p class="hint">No se puede calcular el costo de producción.</p>`;
    return;
  }

  let htmlReceta = "";
  let costoTotal = 0;

  recetaLista.forEach((r) => {
    const ins = insumosMap[r.insumoId];
    if (!ins) return;

    const costoUnitario = Number(ins.costoUnitario) || 0;
    const usado = Number(r.cantidadUsada) || 0;
    const subtotal = costoUnitario * usado;

    costoTotal += subtotal;

    htmlReceta += `<p>• ${usado}× ${ins.nombre} — $${subtotal}</p>`;
  });

  recetaDetalle.innerHTML = htmlReceta;
  costoBox.innerHTML = `<strong>Costo producir 1 unidad:</strong> $${costoTotal}`;

  const precioVenta = Number(editPrecio.value) || 0;
  if (gananciaBox) {
    gananciaBox.innerHTML = `
      <strong>Ganancia estimada:</strong> $${precioVenta - costoTotal}
      <br><span class="hint">(por unidad)</span>
    `;
  }
}

/* ============================================================
   DESCONTAR INSUMOS POR VENTA SEGÚN RECETAS
============================================================ */
async function descontarInsumosPorVenta(items) {
  if (!items || items.length === 0) return;

  // Cargo stock una sola vez
  const stockSnap = await getDocs(collection(db, "stock"));
  const stockMap = {};
  stockSnap.forEach((s) => {
    const data = s.data();
    stockMap[data.insumoId] = { id: s.id, ...data };
  });

  for (const item of items) {
    const q = query(
      collection(db, "recetas"),
      where("productoId", "==", item.productoId)
    );
    const recSnap = await getDocs(q);

    for (const r of recSnap.docs) {
      const receta = r.data();
      const insumoId = receta.insumoId;
      const porUnidad = Number(receta.cantidadUsada) || 0;
      const cantidadConsumida = porUnidad * item.cantidad;

      const stockInfo = stockMap[insumoId];
      if (!stockInfo) continue;

      const nuevoStock =
        (Number(stockInfo.stockActual) || 0) - cantidadConsumida;

      await updateDoc(doc(db, "stock", stockInfo.id), {
        stockActual: nuevoStock
      });

      await addDoc(collection(db, "movimientos_stock"), {
        tipo: "CONSUMO",
        insumoId,
        cantidad: cantidadConsumida,
        producto: item.nombre,
        fecha: new Date().toISOString(),
        nota: "Consumo automático por venta"
      });

      stockInfo.stockActual = nuevoStock;
    }
  }
}

/* ============================================================
   EDITAR PRODUCTO
============================================================ */
window.editarProducto = function (id) {
  const p = productosCache[id];
  if (!p || !modalEditar) return;

  productoEditandoId = id;
  editNombre.value = p.nombre;
  editPrecio.value = p.precio;

  modalEditar.classList.remove("hidden");
  cargarRecetaYCostos(id);
};

btnCancelarEdicion.onclick = () => {
  modalEditar.classList.add("hidden");
  productoEditandoId = null;
};

btnGuardarEdicion.onclick = async () => {
  if (!productoEditandoId) return;

  await updateDoc(doc(db, "productos", productoEditandoId), {
    nombre: editNombre.value.trim(),
    precio: Number(editPrecio.value)
  });

  popup("Producto actualizado ✨");
  modalEditar.classList.add("hidden");
  productoEditandoId = null;

  cargarProductos();
};

/* ============================================================
   ELIMINAR PRODUCTO
============================================================ */
window.eliminarProducto = async function (id) {
  if (!confirm("¿Eliminar este producto?")) return;

  await deleteDoc(doc(db, "productos", id));
  popup("Producto eliminado 🗑️");
  cargarProductos();
};

/* ============================================================
   AGREGAR PRODUCTO NUEVO
============================================================ */
btnGuardar.onclick = async () => {
  const nombre = inputNombre.value.trim();
  const precio = Number(inputPrecio.value);

  if (!nombre) {
    alert("Ingresá un nombre");
    return;
  }

  await addDoc(collection(db, "productos"), { nombre, precio });

  popup("Producto agregado 💖");
  inputNombre.value = "";
  inputPrecio.value = "";

  cargarProductos();
};

/* ============================================================
   AGREGAR A VENTA
============================================================ */
window.agregarAVenta = function (id) {
  const p = productosCache[id];
  if (!p) return;

  const existe = ventaItems.find((i) => i.productoId === id);

  if (existe) {
    existe.cantidad += 1;
  } else {
    ventaItems.push({
      productoId: id,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: 1
    });
  }

  renderVenta();
};

/* ============================================================
   RENDER VENTA
============================================================ */
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

  ventaItems.forEach((i, index) => {
    const sub = i.precio * i.cantidad;
    total += sub;

    ventaItemsBody.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, -1)">-</button>
          ${i.cantidad}
          <button class="btn btn-sm" onclick="cambiarCantidad(${index}, 1)">+</button>
        </td>
        <td>$${i.precio}</td>
        <td>$${sub}</td>
        <td><button class="btn btn-delete-pp" onclick="quitarItem(${index})">✕</button></td>
      </tr>
    `;
  });

  ventaTotalSpan.textContent = `$${total}`;
}

window.cambiarCantidad = function (idx, delta) {
  const item = ventaItems[idx];
  if (!item) return;

  item.cantidad += delta;
  if (item.cantidad <= 0) ventaItems.splice(idx, 1);

  renderVenta();
};

window.quitarItem = function (idx) {
  ventaItems.splice(idx, 1);
  renderVenta();
};

/* ============================================================
   FINALIZAR / CANCELAR VENTA
============================================================ */
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

  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  selectMetodoPago.value = "Efectivo";
  inputNotaVenta.value = "";

  modalVenta.classList.remove("hidden");
};

btnVentaCancelar.onclick = () => modalVenta.classList.add("hidden");

modalVenta.addEventListener("click", (e) => {
  if (e.target === modalVenta) modalVenta.classList.add("hidden");
});

/* ============================================================
   CONFIRMAR VENTA
============================================================ */
btnVentaConfirmar.onclick = async () => {
  if (ventaItems.length === 0) return;

  const clienteNombre = inputClienteNombre.value.trim() || "Sin nombre";
  const clienteTelefono = inputClienteTelefono.value.trim();
  const metodoPago = selectMetodoPago.value;
  const nota = inputNotaVenta.value.trim();
  const fechaIso = new Date().toISOString();

  const items = ventaItems.map((i) => ({
    productoId: i.productoId,
    nombre: i.nombre,
    precioUnitario: i.precio,
    cantidad: i.cantidad,
    subtotal: i.precio * i.cantidad
  }));

  const total = items.reduce((sum, it) => sum + it.subtotal, 0);

  try {
    // Guardar venta completa
    const ventaRef = await addDoc(collection(db, "ventas"), {
      tipo: "VENTA",
      clienteNombre,
      clienteTelefono,
      metodoPago,
      nota,
      fecha: fechaIso,
      total,
      items
    });

    // Registrar movimiento
    await addDoc(collection(db, "movimientos_stock"), {
      tipo: "VENTA",
      ventaId: ventaRef.id,
      clienteNombre,
      metodoPago,
      cantidadTotal: items.reduce((acc, it) => acc + it.cantidad, 0),
      costoTotal: total,
      fecha: fechaIso,
      nota
    });

    // Descontar insumos según recetas
    await descontarInsumosPorVenta(items);

    popup("Venta registrada 💖");

    ventaItems = [];
    renderVenta();
    modalVenta.classList.add("hidden");
  } catch (err) {
    console.error(err);
    alert("Error registrando la venta.");
  }
};

/* ============================================================
   INICIO
============================================================ */
cargarProductos();
renderVenta();
