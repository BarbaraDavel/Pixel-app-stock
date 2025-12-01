import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =========================
// DOM ELEMENTOS
// =========================

// Cliente
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed = document.getElementById("clienteRed");
const datalistClientes = document.getElementById("clientesDatalist");

// Productos / items
const selProducto = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems = document.getElementById("pedidoItems");
const spanTotal = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// Datos generales del pedido
const inputFecha = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");
const inputPagado = document.getElementById("pedidoPagado");

// Lista pedidos
const listaPedidosBody = document.getElementById("listaPedidos");

// Filtros
const filtroEstado = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

// Modal ver pedido
const modal = document.getElementById("pedidoModal");
const modalTitulo = document.getElementById("modalTitulo");
const modalItems = document.getElementById("modalItems");
const modalTotal = document.getElementById("modalTotal");
const modalCerrar = document.getElementById("modalCerrar");
const modalPdf = document.getElementById("modalPdf");
const modalWhatsApp = document.getElementById("modalWhatsApp");

// Modal editar pedido
const modalEdit = document.getElementById("editarPedidoModal");
const editEstado = document.getElementById("editEstado");
const editNota = document.getElementById("editNota");
const editFecha = document.getElementById("editFecha");
const editPagado = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar = document.getElementById("editCerrar");

// =========================
// ESTADO
// =========================
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;

// =========================
// CARGAR CLIENTES
// =========================
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));

  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = {
      id: d.id,
      telefono: c.telefono || "",
      red: c.red || "",
      nota: c.nota || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const nombre = inputClienteNombre.value.trim();
  const c = clientesPorNombre[nombre];
  if (c) {
    inputClienteTelefono.value = c.telefono || "";
    inputClienteRed.value = c.red || "";
  }
}

inputClienteNombre.addEventListener("input", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

// =========================
// CARGAR PRODUCTOS
// =========================
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `<option value="${p.id}">${p.nombre} — $${p.precio}</option>`;
  });
}

// =========================
// RENDER ITEMS
// =========================
function renderPedido() {
  tbodyItems.innerHTML = "";
  let total = 0;

  itemsPedido.forEach((item, idx) => {
    total += item.subtotal;
    tbodyItems.innerHTML += `
      <tr>
        <td>${item.nombre}</td>
        <td>$${item.precio}</td>
        <td>${item.cantidad}</td>
        <td>$${item.subtotal}</td>
        <td><button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button></td>
      </tr>`;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

// =========================
// AGREGAR ITEM
// =========================
btnAgregar.addEventListener("click", () => {
  const id = selProducto.value;
  const cant = Number(inputCantidad.value);
  if (!id) return alert("Elegí un producto.");
  if (!cant || cant <= 0) return alert("Cantidad inválida.");

  const prod = productos.find(p => p.id === id);
  const precio = Number(prod.precio);

  itemsPedido.push({
    productoId: id,
    nombre: prod.nombre,
    precio,
    cantidad: cant,
    subtotal: precio * cant
  });
  renderPedido();
});

// =========================
// LIMPIAR
// =========================
btnLimpiar.addEventListener("click", () => {
  itemsPedido = [];
  renderPedido();
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputNota.value = "";
  inputCantidad.value = 1;
  selProducto.value = "";
  inputFecha.value = "";
  inputPagado.checked = false;
  selectEstado.value = "PENDIENTE";
});

// =========================
// GUARDAR PEDIDO
// =========================
btnGuardar.addEventListener("click", async () => {
  const nombre = inputClienteNombre.value.trim();
  const telefono = inputClienteTelefono.value.trim();
  const red = inputClienteRed.value.trim();
  const nota = inputNota.value.trim();
  const estado = selectEstado.value;
  const fechaInput = inputFecha.value;
  const pagado = inputPagado.checked;

  if (!nombre) return alert("Poné el nombre del cliente.");
  if (!itemsPedido.length) return alert("Agregá productos.");

  const total = itemsPedido.reduce((acc, i) => acc + i.subtotal, 0);
  const clienteInfo = clientesPorNombre[nombre] || null;

  const fechaIso =
    fechaInput === ""
      ? new Date().toISOString()
      : new Date(fechaInput + "T00:00:00").toISOString();

  const pedidoDoc = {
    clienteId: clienteInfo ? clienteInfo.id : null,
    clienteNombre: nombre,
    clienteTelefono: telefono || (clienteInfo ? clienteInfo.telefono : ""),
    clienteRed: red || (clienteInfo ? clienteInfo.red : ""),
    fecha: fechaIso,
    fechaServer: serverTimestamp(),
    estado,
    nota,
    pagado,
    total,
    items: itemsPedido
  };

  try {
    await addDoc(collection(db, "pedidos"), pedidoDoc);
    alert("Pedido guardado correctamente 🦊");
    btnLimpiar.click();
    cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al guardar el pedido.");
  }
});

// =========================
// CARGAR PEDIDOS
// =========================
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));
  pedidosCache.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  renderLista();
}

// =========================
// RENDER LISTA + FILTROS
// =========================
function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();
  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p => {
      if (est && p.estado !== est) return false;
      if (txt && !p.clienteNombre.toLowerCase().includes(txt)) return false;
      return true;
    })
    .forEach(p => {
      const fechaTxt = p.fecha
        ? new Date(p.fecha).toLocaleDateString()
        : "—";
      listaPedidosBody.innerHTML += `
        <tr>
          <td>${p.clienteNombre}</td>
          <td>${fechaTxt}</td>
          <td class="estado ${p.estado}">${p.estado}</td>
          <td class="${p.pagado ? "pagado-si" : "pagado-no"}">${
        p.pagado ? "✔ Pagado" : "✖ No pagado"
      }</td>
          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁️ Ver</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕</button>
          </td>
        </tr>`;
    });
}

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

// =========================
// MODAL VER
// =========================
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalItems.innerHTML = p.items
    .map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
    .join("<br>");
  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");

  modalPdf.onclick = () => generarPDF(p);
  modalWhatsApp.onclick = () => enviarWhatsApp(p);
};

modalCerrar.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =========================
// MODAL EDITAR
// =========================
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;
  editEstado.value = p.estado || "PENDIENTE";
  editNota.value = p.nota || "";
  editFecha.value = p.fecha
    ? new Date(p.fecha).toISOString().slice(0, 10)
    : "";
  editPagado.checked = !!p.pagado;
  modalEdit.classList.remove("hidden");
};

editCerrar.addEventListener("click", () => {
  modalEdit.classList.add("hidden");
  pedidoEditandoId = null;
});

editGuardar.addEventListener("click", async () => {
  if (!pedidoEditandoId) return;
  const nuevoEstado = editEstado.value;
  const nuevaNota = editNota.value.trim();
  const nuevaFecha = editFecha.value
    ? new Date(editFecha.value + "T00:00:00").toISOString()
    : null;
  const nuevoPagado = editPagado.checked;

  try {
    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      estado: nuevoEstado,
      nota: nuevaNota,
      fecha: nuevaFecha,
      pagado: nuevoPagado
    });
    alert("Cambios guardados correctamente");
    modalEdit.classList.add("hidden");
    pedidoEditandoId = null;
    cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al actualizar el pedido.");
  }
});

// =========================
// DUPLICAR
// =========================
window.duplicarPedido = async id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;
  const nuevo = { ...p, fecha: new Date().toISOString(), fechaServer: serverTimestamp() };
  delete nuevo.id;
  await addDoc(collection(db, "pedidos"), nuevo);
  alert("Pedido duplicado ✔");
  cargarPedidos();
};

// =========================
// PDF + WHATSAPP
// =========================
function generarPDF(pedido) {
  const element = document.createElement("div");
  element.innerHTML = `
    <h3>Pedido de ${pedido.clienteNombre}</h3>
    <p><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleDateString()}</p>
    <p><strong>Estado:</strong> ${pedido.estado}</p>
    <hr>
    ${pedido.items.map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`).join("<br>")}
    <hr>
    <p><strong>Total:</strong> $${pedido.total}</p>
  `;
  html2pdf().from(element).save(`Pedido_${pedido.clienteNombre}.pdf`);
}

function enviarWhatsApp(pedido) {
  const mensaje = `🦊 *Pixel* - Pedido de ${pedido.clienteNombre}%0AEstado: ${pedido.estado}%0ATotal: $${pedido.total}%0A%0A${pedido.items
    .map(i => `• ${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
    .join("%0A")}`;
  const telefono = pedido.clienteTelefono || "";
  const url = `https://wa.me/${telefono}?text=${mensaje}`;
  window.open(url, "_blank");
}

// =========================
// INICIO
// =========================
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
