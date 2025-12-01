import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =========================================================
// DOM
// =========================================================

// Cliente
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed = document.getElementById("clienteRed");
const datalistClientes = document.getElementById("clientesDatalist");

// Productos
const selProducto = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems = document.getElementById("pedidoItems");
const spanTotal = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// Otros datos
const inputFecha = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");
const inputPagado = document.getElementById("pedidoPagado");

// Lista de pedidos
const listaPedidosBody = document.getElementById("listaPedidos");

// Filtros
const filtroEstado = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

// Modal Ver
const modal = document.getElementById("pedidoModal");
const modalTitulo = document.getElementById("modalTitulo");
const modalItems = document.getElementById("modalItems");
const modalTotal = document.getElementById("modalTotal");
const modalCliente = document.getElementById("modalCliente");
const modalFecha = document.getElementById("modalFecha");
const modalNota = document.getElementById("modalNota");
const modalPdf = document.getElementById("modalPdf");
const modalWhatsApp = document.getElementById("modalWhatsApp");
const modalCerrar = document.getElementById("modalCerrar");

// Modal Editar completo
const modalEdit = document.getElementById("editarPedidoModal");
const editEstado = document.getElementById("editEstado");
const editNota = document.getElementById("editNota");
const editFecha = document.getElementById("editFecha");
const editPagado = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar = document.getElementById("editCerrar");

// =========================================================
// ESTADO
// =========================================================
let clientes = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditId = null;
let pedidoActual = null; // para PDF y WhatsApp

// =========================================================
// CARGAR CLIENTES
// =========================================================
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientes = {};

  const snap = await getDocs(collection(db, "clientes"));

  snap.forEach(d => {
    const c = d.data();
    clientes[c.nombre] = {
      id: d.id,
      telefono: c.telefono || "",
      red: c.red || "",
      nota: c.nota || "",
      apodo: c.apodo || ""
    };

    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncCliente() {
  const nombre = inputClienteNombre.value.trim();
  const c = clientes[nombre];

  if (c) {
    if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
    if (!inputClienteRed.value) inputClienteRed.value = c.red;
  }
}

inputClienteNombre.addEventListener("change", syncCliente);
inputClienteNombre.addEventListener("blur", syncCliente);

// =========================================================
// CARGAR PRODUCTOS
// =========================================================
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  selProducto.innerHTML = `<option value="">Elegí un producto…</option>`;

  productos.forEach(p => {
    selProducto.innerHTML += `<option value="${p.id}">${p.nombre} — $${p.precio}</option>`;
  });
}

// =========================================================
// RENDER ITEMS
// =========================================================
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
        <td>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>
    `;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = i => {
  itemsPedido.splice(i, 1);
  renderPedido();
};

// =========================================================
// AGREGAR ITEM
// =========================================================
btnAgregar.addEventListener("click", () => {
  const id = selProducto.value;
  const cant = Number(inputCantidad.value);

  if (!id) return alert("Elegí un producto.");
  if (cant <= 0) return alert("Cantidad incorrecta.");

  const prod = productos.find(p => p.id === id);
  const precio = Number(prod.precio);

  itemsPedido.push({
    productoId: id,
    nombre: prod.nombre,
    precio,
    cantidad: cant,
    subtotal: cant * precio
  });

  renderPedido();
});

// =========================================================
// LIMPIAR
// =========================================================
btnLimpiar.addEventListener("click", () => {
  itemsPedido = [];
  renderPedido();
  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputCantidad.value = 1;
  inputNota.value = "";
  inputPagado.checked = false;
  selectEstado.value = "PENDIENTE";
  inputFecha.value = "";
});

// =========================================================
// GUARDAR PEDIDO
// =========================================================
btnGuardar.addEventListener("click", async () => {
  const nombre = inputClienteNombre.value.trim();
  if (!nombre) return alert("Ingresá el nombre del cliente.");
  if (itemsPedido.length === 0) return alert("Agregá productos.");

  const c = clientes[nombre] || {};
  const fechaInput = inputFecha.value;

  const pedidoData = {
    clienteNombre: nombre,
    clienteRed: inputClienteRed.value.trim() || c.red || "",
    clienteTelefono: inputClienteTelefono.value.trim() || c.telefono || "",
    clienteApodo: c.apodo || "",
    clienteId: c.id || null,
    items: itemsPedido,
    total: itemsPedido.reduce((a, b) => a + b.subtotal, 0),
    fecha: fechaInput ? new Date(fechaInput + "T00:00:00").toISOString() : new Date().toISOString(),
    fechaServer: serverTimestamp(),
    nota: inputNota.value.trim(),
    estado: selectEstado.value,
    pagado: inputPagado.checked
  };

  try {
    await addDoc(collection(db, "pedidos"), pedidoData);
    alert("Pedido guardado ✔");

    cargarPedidos();
    btnLimpiar.click();
  } catch (e) {
    console.error(e);
    alert("Error al guardar.");
  }
});

// =========================================================
// CARGAR PEDIDOS
// =========================================================
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  renderLista();
}

// =========================================================
// RENDER LISTA
// =========================================================
function renderLista() {
  const fEstado = filtroEstado.value;
  const fTxt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p => (!fEstado || p.estado === fEstado))
    .filter(p => p.clienteNombre.toLowerCase().includes(fTxt))
    .forEach(p => {
      const fechaTxt = new Date(p.fecha).toLocaleDateString();

      listaPedidosBody.innerHTML += `
        <tr>
          <td>${p.clienteNombre}</td>
          <td>${fechaTxt}</td>
          <td class="estado ${p.estado}">${p.estado}</td>
          <td class="${p.pagado ? "pagado-si" : "pagado-no"}">
            ${p.pagado ? "✔ Sí" : "✖ No"}
          </td>
          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁️</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕</button>
            <button class="btn-pp btn-delete-pp" onclick="eliminarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
}

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

// =========================================================
// VER PEDIDO
// =========================================================
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoActual = p;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Contacto: ${p.clienteRed || "—"}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleDateString()}`;
  modalNota.textContent = p.nota ? `Nota: ${p.nota}` : "";

  modalItems.innerHTML = p.items
    .map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
    .join("<br>");

  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");
};

modalCerrar.addEventListener("click", () => modal.classList.add("hidden"));

modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

// =========================================================
// PDF (PIXEL PRO – SIN ESTADO)
// =========================================================
modalPdf.addEventListener("click", () => {
  if (!pedidoActual) return;

  const cliente = pedidoActual.clienteApodo || pedidoActual.clienteNombre;

  const contenido = `
    <div style="
      font-family: Poppins, sans-serif;
      padding: 20px;
      width: 330px;
    ">
      <h2>🦊 Pixel – Detalle de Pedido</h2>
      <p><strong>Cliente:</strong> ${cliente}</p>
      <p><strong>Fecha:</strong> ${new Date(pedidoActual.fecha).toLocaleDateString()}</p>

      <hr>

      <div>
        ${pedidoActual.items.map(i =>
          `<p>${i.cantidad}× ${i.nombre} — $${i.subtotal}</p>`
        ).join("")}
      </div>

      <hr>

      <p style="font-size:18px; font-weight:700;">Total: $${pedidoActual.total}</p>
    </div>
  `;

  html2pdf().from(contenido).save(`pedido-${cliente}.pdf`);
});

// =========================================================
// WHATSAPP – CON APODO
// =========================================================
modalWhatsApp.addEventListener("click", () => {
  if (!pedidoActual) return;

  const apodo = pedidoActual.clienteApodo || pedidoActual.clienteNombre;
  const tel = pedidoActual.clienteTelefono?.replace(/\D/g, "");

  const lineas = pedidoActual.items
    .map(i => `✨ ${i.cantidad}× *${i.nombre}* — $${i.subtotal}`)
    .join("\n");

  const mensaje = encodeURIComponent(
`¡Hola ${apodo}! 😊

🦊 *Pixel - Detalle de tu pedido*

${lineas}

💰 *Total:* $${pedidoActual.total}
📅 *Fecha:* ${new Date(pedidoActual.fecha).toLocaleDateString()}

💜 Gracias por tu compra!
📸 Instagram: https://instagram.com/pixel.stickerss`
  );

  window.open(`https://wa.me/${tel}?text=${mensaje}`);
});

// =========================================================
// EDITAR PEDIDO COMPLETO
// =========================================================
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditId = id;
  pedidoActual = p;

  editEstado.value = p.estado;
  editPagado.checked = !!p.pagado;
  editNota.value = p.nota || "";
  editFecha.value = p.fecha ? new Date(p.fecha).toISOString().slice(0, 10) : "";

  modalEdit.classList.remove("hidden");
};

editCerrar.addEventListener("click", () => {
  modalEdit.classList.add("hidden");
  pedidoEditId = null;
});

editGuardar.addEventListener("click", async () => {
  if (!pedidoEditId) return;

  try {
    await updateDoc(doc(db, "pedidos", pedidoEditId), {
      estado: editEstado.value,
      pagado: editPagado.checked,
      nota: editNota.value.trim(),
      fecha: editFecha.value
        ? new Date(editFecha.value + "T00:00:00").toISOString()
        : null
    });

    alert("Cambios guardados ✔");
    modalEdit.classList.add("hidden");
    cargarPedidos();
  } catch (e) {
    console.error(e);
    alert("Error al guardar.");
  }
});

// =========================================================
// DUPLICAR
// =========================================================
window.duplicarPedido = async id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const nuevo = {
    ...p,
    fecha: new Date().toISOString(),
    fechaServer: serverTimestamp()
  };
  delete nuevo.id;

  await addDoc(collection(db, "pedidos"), nuevo);
  alert("Pedido duplicado ✔");
  cargarPedidos();
};

// =========================================================
// ELIMINAR
// =========================================================
window.eliminarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;

  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

// =========================================================
// INIT
// =========================================================
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();

