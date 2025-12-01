import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ============================================================
   DOM
============================================================ */

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

// Datos del pedido
const inputFecha = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");
const inputPagado = document.getElementById("pedidoPagado");

// Lista
const listaPedidosBody = document.getElementById("listaPedidos");

// Filtros
const filtroEstado = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

// Modal Ver
const modal = document.getElementById("pedidoModal");
const modalTitulo = document.getElementById("modalTitulo");
const modalCliente = document.getElementById("modalCliente");
const modalEstado = document.getElementById("modalEstado");
const modalFecha = document.getElementById("modalFecha");
const modalItems = document.getElementById("modalItems");
const modalNota = document.getElementById("modalNota");
const modalTotal = document.getElementById("modalTotal");
const modalCerrar = document.getElementById("modalCerrar");
const modalWhatsApp = document.getElementById("modalWhatsApp");
const modalPdf = document.getElementById("modalPdf");

// Modal Editar
const modalEdit = document.getElementById("editarPedidoModal");
const editEstado = document.getElementById("editEstado");
const editNota = document.getElementById("editNota");
const editFecha = document.getElementById("editFecha");
const editPagado = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar = document.getElementById("editCerrar");

/* ============================================================
   ESTADO
============================================================ */

let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoActualModal = null;

/* ============================================================
   CARGAR CLIENTES
============================================================ */

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
    if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
    if (!inputClienteRed.value) inputClienteRed.value = c.red;
  }
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* ============================================================
   CARGAR PRODUCTOS
============================================================ */

async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `
      <option value="${p.id}">${p.nombre} — $${p.precio}</option>
    `;
  });
}

/* ============================================================
   RENDER ITEMS DEL PEDIDO
============================================================ */

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
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">
            ✖
          </button>
        </td>
      </tr>
    `;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

/* ============================================================
   AGREGAR ÍTEM
============================================================ */

btnAgregar.addEventListener("click", () => {
  const id = selProducto.value;
  const cant = Number(inputCantidad.value);

  if (!id) return alert("Elegí un producto.");
  if (!cant || cant <= 0) return alert("Cantidad inválida.");

  const prod = productos.find(p => p.id === id);
  if (!prod) return;

  const precio = Number(prod.precio || 0);

  itemsPedido.push({
    productoId: id,
    nombre: prod.nombre,
    precio,
    cantidad: cant,
    subtotal: precio * cant
  });

  renderPedido();
});

/* ============================================================
   LIMPIAR FORMULARIO
============================================================ */

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

/* ============================================================
   GUARDAR PEDIDO
============================================================ */

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
    alert("Pedido guardado ✔");

    btnLimpiar.click();
    cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al guardar.");
  }
});

/* ============================================================
   CARGAR LISTA
============================================================ */

async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  renderLista();
}

/* ============================================================
   RENDER LISTA
============================================================ */

function renderLista() {
  const est = filtroEstado ? filtroEstado.value : "";
  const txt = filtroBusqueda ? filtroBusqueda.value.toLowerCase() : "";

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
          <td class="${p.pagado ? "pagado-si" : "pagado-no"}">
            ${p.pagado ? "✔ Pagado" : "✖ No pagado"}
          </td>
          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁️ Ver</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️ Editar</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕ Duplicar</button>
          </td>
        </tr>
      `;
    });
}

if (filtroEstado) filtroEstado.addEventListener("change", renderLista);
if (filtroBusqueda) filtroBusqueda.addEventListener("input", renderLista);

/* ============================================================
   MODAL VER PEDIDO
============================================================ */

window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoActualModal = p;

  const fechaTxt = p.fecha
    ? new Date(p.fecha).toLocaleString("es-AR")
    : "—";

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre} — Tel: ${p.clienteTelefono || "—"}`;
  modalEstado.textContent = `Estado: ${p.estado} — ${p.pagado ? "Pagado ✔️" : "A pagar 💸"}`;
  modalFecha.textContent = `Fecha: ${fechaTxt}`;

  modalItems.innerHTML =
    p.items && p.items.length
      ? p.items
          .map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
          .join("<br>")
      : "<em>Sin items</em>";

  modalNota.textContent = p.nota ? `Nota: ${p.nota}` : "";
  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");
};

modalCerrar.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

/* ============================================================
   BOTÓN WHATSAPP
============================================================ */

modalWhatsApp.addEventListener("click", () => {
  const p = pedidoActualModal;
  if (!p) return;

  // Tomar apodo si existe dentro de la colección “clientes”
  const apodo =
    clientesPorNombre[p.clienteNombre]?.apodo?.trim() ||
    p.apodo?.trim() ||
    p.clienteNombre;

  const itemsTexto = p.items
    .map(i => `✨ ${i.cantidad}× *${i.nombre}* — $${i.subtotal}`)
    .join("\n");

  const fechaTxt = p.fecha
    ? new Date(p.fecha).toLocaleDateString("es-AR")
    : "—";

  const msg =
    `¡Hola *${apodo}*! 😊\n\n` +
    `🦊 *Detalle de tu pedido en Pixel:*\n\n` +
    `${itemsTexto}\n\n` +
    `💰 *Total:* $${p.total}\n` +
    `📅 *Fecha:* ${fechaTxt}\n` +
    `📌 *Estado:* ${p.estado}\n` +
    `💵 *Pagado:* ${p.pagado ? "Sí ✔️" : "No ❌"}\n\n` +
    `💜 ¡Gracias por tu compra!\n` +
    `📸 Instagram: https://instagram.com/pixel.stickerss`;

  const telefono = p.clienteTelefono
    ? p.clienteTelefono.replace(/\D/g, "")
    : "";

  const url = telefono
    ? `https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
});

/* ============================================================
   BOTÓN PDF (html2pdf)
============================================================ */

modalPdf.addEventListener("click", async () => {
  const p = pedidoActualModal;
  if (!p) return;

  if (typeof html2pdf === "undefined") {
    alert("No se cargó html2pdf.js");
    return;
  }

  // QR Instagram
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    "https://instagram.com/pixel.stickerss"
  )}`;

  // Firma manuscrita (puedo generarte un PNG personalizado si querés)
  const firmaUrl = "https://i.postimg.cc/G3N4f32m/firma-barbi-pixel.png";

  // esperar carga real
  const loadImage = src =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });

  await loadImage(qrUrl);
  await loadImage(firmaUrl);

  const fechaTxt = p.fecha
    ? new Date(p.fecha).toLocaleDateString("es-AR")
    : "—";

  const itemsHtml = p.items
    .map(i => `
      <tr>
        <td>${i.cantidad}</td>
        <td>${i.nombre}</td>
        <td>$${i.subtotal}</td>
      </tr>
    `)
    .join("");

  const html = `
    <div style="font-family: Poppins, sans-serif; padding:22px;">

      <div style="
        background: linear-gradient(90deg,#ffcd9c,#ffc48a);
        padding: 16px;
        border-radius: 14px;
        text-align:center;
      ">
        <h2 style="margin:0; color:#5b2e91;">Pixel – Pedido</h2>
        <p style="margin:0; color:#5b2e91; font-size:13px;">Gracias por elegirnos</p>
      </div>

      <p><strong>Cliente:</strong> ${p.clienteNombre}</p>
      <p><strong>Teléfono:</strong> ${p.clienteTelefono || "—"}</p>
      <p><strong>Estado:</strong> ${p.estado}</p>
      <p><strong>Pagado:</strong> ${p.pagado ? "Sí" : "No"}</p>
      <p><strong>Fecha:</strong> ${fechaTxt}</p>

      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <thead>
          <tr style="background:#fde2ff; color:#6a3bb0;">
            <th style="padding:8px;">Cant</th>
            <th style="padding:8px;">Producto</th>
            <th style="padding:8px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <p style="margin-top:14px; font-size:15px;">
        <strong>Total:</strong> $${p.total}
      </p>

      <div style="
        margin-top:22px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:20px;
      ">
        <div style="text-align:center;">
          <img src="${qrUrl}" style="width:130px; height:130px;">
          <p style="font-size:11px; color:#6a3bb0;">Instagram</p>
        </div>

        <div style="text-align:right;">
          <img src="${firmaUrl}" style="width:150px;">
          <p style="font-size:12px; margin:0; color:#5b2e91;">Pixel Stickers</p>
        </div>
      </div>

      <p style="text-align:center; margin-top:15px; font-size:12px; color:#7a4bb8;">
        ¡Esperamos que disfrutes tu compra 💜!
      </p>

    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const element = wrapper;

  await html2pdf()
    .from(element)
    .set({
      margin: 10,
      filename: `pedido_${p.clienteNombre.replace(/\s+/g, "_")}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4" }
    })
    .save();

  wrapper.remove();
});

/* ============================================================
   EDITAR PEDIDO
============================================================ */

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

    alert("Cambios guardados ✔");
    modalEdit.classList.add("hidden");
    pedidoEditandoId = null;
    cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al actualizar.");
  }
});

/* ============================================================
   DUPLICAR PEDIDO
============================================================ */

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

/* ============================================================
   INICIO
============================================================ */

(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
