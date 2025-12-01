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
   CARGAR CLIENTES (con apodo)
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
      nota: c.nota || "",
      apodo: c.apodo || ""       // <<< NUEVO
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

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
   RENDER DE ITEMS
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
        <td><button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button></td>
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
   AGREGAR ITEM
============================================================ */

btnAgregar.addEventListener("click", () => {
  const id = selProducto.value;
  const cant = Number(inputCantidad.value);
  if (!id || cant <= 0) return;

  const p = productos.find(x => x.id === id);
  if (!p) return;

  itemsPedido.push({
    productoId: id,
    nombre: p.nombre,
    precio: Number(p.precio),
    cantidad: cant,
    subtotal: Number(p.precio) * cant
  });

  renderPedido();
});

/* ============================================================
   GUARDAR
============================================================ */

btnGuardar.addEventListener("click", async () => {
  const nombre = inputClienteNombre.value.trim();
  const info = clientesPorNombre[nombre] || {};

  const pedidoDoc = {
    clienteId: info.id || null,
    clienteNombre: nombre,
    clienteApodo: info.apodo || "", // <<< NUEVO
    clienteTelefono: inputClienteTelefono.value.trim() || info.telefono || "",
    clienteRed: inputClienteRed.value.trim() || info.red || "",
    fecha: inputFecha.value
      ? new Date(inputFecha.value + "T00:00").toISOString()
      : new Date().toISOString(),
    fechaServer: serverTimestamp(),
    estado: selectEstado.value,
    nota: inputNota.value.trim(),
    pagado: inputPagado.checked,
    total: itemsPedido.reduce((a, b) => a + b.subtotal, 0),
    items: itemsPedido
  };

  await addDoc(collection(db, "pedidos"), pedidoDoc);

  alert("Pedido guardado ✔");
  btnLimpiar.click();
  cargarPedidos();
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
   LISTA
============================================================ */

function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p =>
      (!est || p.estado === est) &&
      (!txt || p.clienteNombre.toLowerCase().includes(txt))
    )
    .forEach(p => {
      listaPedidosBody.innerHTML += `
        <tr>
          <td>${p.clienteNombre}</td>
          <td>${new Date(p.fecha).toLocaleDateString("es-AR")}</td>
          <td class="estado ${p.estado}">${p.estado}</td>
          <td>${p.pagado ? "✔ Pagado" : "✖ No pagado"}</td>
          <td>$${p.total}</td>

          <td style="display:flex; gap:6px;">
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁 Ver</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏ Editar</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕ Duplicar</button>
            <button class="btn-pp btn-delete-pp" onclick="eliminarPedido('${p.id}')">🗑 Eliminar</button>
          </td>
        </tr>
      `;
    });
}

/* ============================================================
   VER PEDIDO
============================================================ */

window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoActualModal = p;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString("es-AR")}`;
  modalItems.innerHTML = p.items.map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`).join("<br>");
  modalNota.textContent = p.nota ? `Nota: ${p.nota}` : "";
  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

/* ============================================================
   WHATSAPP
============================================================ */

modalWhatsApp.onclick = () => {
  const p = pedidoActualModal;
  if (!p) return;

  const nombreMostrado = p.clienteApodo?.trim() || p.clienteNombre;

  const items = p.items
    .map(i => `✨ ${i.cantidad}× *${i.nombre}* — $${i.subtotal}`)
    .join("\n");

  const msg =
    `¡Hola ${nombreMostrado}! 😊\n\n` +
    `🦊 *Detalle de tu pedido en Pixel:*\n\n` +
    `${items}\n\n` +
    `💰 *Total:* $${p.total}\n` +
    `📅 *Fecha:* ${new Date(p.fecha).toLocaleDateString("es-AR")}\n` +
    `📌 *Estado:* ${p.estado}\n` +
    `💵 *Pagado:* ${p.pagado ? "Sí ✔️" : "No ❌"}\n` +
    (p.nota ? `📝 *Nota:* ${p.nota}\n\n` : "\n") +
    `💜 Gracias por tu compra!\n` +   // 💜 corazón lila
    `📸 Instagram: https://instagram.com/pixel.stickerss`;

  const tel = p.clienteTelefono?.replace(/\D/g, "");
  const url = tel
    ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
};

/* ============================================================
   PDF (con QR y firma)
============================================================ */

modalPdf.onclick = async () => {
  const p = pedidoActualModal;
  if (!p) return;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=https://instagram.com/pixel.stickerss`;

  const html = `
    <div id="pdf" style="font-family:Arial; padding:16px;">
      <h2 style="text-align:center;">🦊 Pixel - Pedido</h2>

      <p><strong>Cliente:</strong> ${p.clienteNombre}</p>
      <p><strong>Apodo:</strong> ${p.clienteApodo || "—"}</p>
      <p><strong>Teléfono:</strong> ${p.clienteTelefono || "—"}</p>
      <p><strong>Estado:</strong> ${p.estado}</p>
      <p><strong>Pagado:</strong> ${p.pagado ? "Sí" : "No"}</p>

      <hr>

      <p><strong>Items:</strong></p>
      <p>${p.items.map(i => `• ${i.cantidad}× ${i.nombre} — $${i.subtotal}`).join("<br>")}</p>

      <p style="margin-top:10px;"><strong>Total:</strong> $${p.total}</p>
      ${p.nota ? `<p><strong>Nota:</strong> ${p.nota}</p>` : ""}

      <hr>

      <div style="text-align:center; margin-top:10px;">
        <p>Seguinos en Instagram 💜</p>
        <img src="${qrUrl}" style="width:120px;">

        <p style="margin-top:20px; font-family: 'Pacifico', cursive; font-size:20px;">
          Firma: <span style="font-size:24px;">Barbi</span>
        </p>
      </div>
    </div>
  `;

  const cont = document.createElement("div");
  cont.innerHTML = html;
  document.body.appendChild(cont);

  html2pdf().from(cont).set({
    margin: 10,
    filename: `pedido-${p.clienteNombre.replace(/\s+/g, "_")}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  }).save().then(() => cont.remove());
};

/* ============================================================
   EDITAR
============================================================ */

window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  editEstado.value = p.estado;
  editNota.value = p.nota || "";
  editFecha.value = p.fecha?.slice(0,10);
  editPagado.checked = p.pagado;

  modalEdit.classList.remove("hidden");
};

editGuardar.onclick = async () => {
  if (!pedidoEditandoId) return;

  await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
    estado: editEstado.value,
    nota: editNota.value,
    pagado: editPagado.checked,
    fecha: editFecha.value
      ? new Date(editFecha.value + "T00:00").toISOString()
      : null
  });

  modalEdit.classList.add("hidden");
  cargarPedidos();
};

editCerrar.onclick = () => modalEdit.classList.add("hidden");

/* ============================================================
   ELIMINAR
============================================================ */

window.eliminarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;

  await deleteDoc(doc(db, "pedidos", id));
  cargarPedidos();
};

/* ============================================================
   DUPLICAR
============================================================ */

window.duplicarPedido = async id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const nuevo = { ...p };
  delete nuevo.id;

  nuevo.fecha = new Date().toISOString();
  nuevo.fechaServer = serverTimestamp();

  await addDoc(collection(db, "pedidos"), nuevo);
  cargarPedidos();
};

/* ============================================================
   INIT
============================================================ */

(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
