import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =========================================================
   DOM ELEMENTS
========================================================= */

// Cliente
const inputClienteNombre = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed = document.getElementById("clienteRed");
const datalistClientes = document.getElementById("clientesDatalist");

// Items del pedido
const selProducto = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems = document.getElementById("pedidoItems");
const spanTotal = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// Datos generales
const inputFecha = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota = document.getElementById("pedidoNota");
const inputPagado = document.getElementById("pedidoPagado");

// Lista pedidos
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
const modalPdf = document.getElementById("modalPdf");
const modalWhatsApp = document.getElementById("modalWhatsApp");

// Modal Editar
const modalEdit = document.getElementById("editarPedidoModal");
const editEstado = document.getElementById("editEstado");
const editNota = document.getElementById("editNota");
const editFecha = document.getElementById("editFecha");
const editPagado = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar = document.getElementById("editCerrar");

/* =========================================================
   STATE
========================================================= */

let clientesPorNombre = {}; // { "Mariela Negro": {apodo, whatsapp, instagram...} }
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;

/* =========================================================
   CARGAR CLIENTES
========================================================= */

async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));

  snap.forEach(docSnap => {
    const c = docSnap.data();

    clientesPorNombre[c.nombre] = {
      id: docSnap.id,
      nombre: c.nombre,
      apodo: c.apodo || "",
      whatsapp: c.whatsapp || "",
      instagram: c.instagram || "",
      nota: c.nota || ""
    };

    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const nombre = inputClienteNombre.value.trim();
  const c = clientesPorNombre[nombre];

  if (c) {
    if (!inputClienteTelefono.value) inputClienteTelefono.value = c.whatsapp;
    if (!inputClienteRed.value) inputClienteRed.value = c.instagram;
  }
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* =========================================================
   CARGAR PRODUCTOS
========================================================= */

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

/* =========================================================
   RENDER ITEMS DEL PEDIDO
========================================================= */

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

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

/* =========================================================
   AGREGAR ITEM
========================================================= */

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

/* =========================================================
   LIMPIAR FORMULARIO
========================================================= */

btnLimpiar.addEventListener("click", () => {
  itemsPedido = [];
  renderPedido();

  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputNota.value = "";
  inputPagado.checked = false;
  inputCantidad.value = 1;
  selProducto.value = "";
  inputFecha.value = "";
  selectEstado.value = "PENDIENTE";
});

/* =========================================================
   GUARDAR PEDIDO
========================================================= */

btnGuardar.addEventListener("click", async () => {
  const nombre = inputClienteNombre.value.trim();
  if (!nombre) return alert("Poné el nombre del cliente.");
  if (!itemsPedido.length) return alert("Agregá productos.");

  const clienteInfo = clientesPorNombre[nombre] || {};

  const total = itemsPedido.reduce((acc, i) => acc + i.subtotal, 0);

  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const pedidoDoc = {
    clienteNombre: nombre,
    clienteApodo: clienteInfo.apodo || "",
    clienteTelefono: inputClienteTelefono.value || clienteInfo.whatsapp || "",
    clienteRed: inputClienteRed.value || clienteInfo.instagram || "",
    fecha: fechaIso,
    fechaServer: serverTimestamp(),
    estado: selectEstado.value,
    nota: inputNota.value.trim(),
    pagado: inputPagado.checked,
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

/* =========================================================
   CARGAR PEDIDOS
========================================================= */

async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));

  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  renderLista();
}

/* =========================================================
   LISTA DE PEDIDOS + FILTROS
========================================================= */

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
          <td style="color:#fff;">${p.clienteNombre}</td>
          <td style="color:#ddd;">${fechaTxt}</td>
          <td class="estado ${p.estado}">${p.estado}</td>
          <td>${p.pagado ? "✔ Pagado" : "✖ No pagado"}</td>
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

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

/* =========================================================
   MODAL VER PEDIDO
========================================================= */

window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const clienteReal = clientesPorNombre[p.clienteNombre] || {};

  const nombreMostrar =
    clienteReal.apodo || p.clienteApodo || p.clienteNombre.split(" ")[0];

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.innerHTML = `👤 <b>${nombreMostrar}</b>`;

  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalNota.textContent = p.nota ? `Nota: ${p.nota}` : "";

  modalItems.innerHTML = p.items
    .map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
    .join("<br>");

  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");

  modalPdf.onclick = () => generarPdf(p, nombreMostrar);
  modalWhatsApp.onclick = () => enviarWhatsApp(p, nombreMostrar);
};

modalCerrar.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

/* =========================================================
   PDF
========================================================= */

function generarPdf(p, nombreMostrar) {
  const contenido = `
    <h2>Pedido de ${nombreMostrar}</h2>
    <p><b>Cliente:</b> ${p.clienteNombre}</p>
    <p><b>Estado:</b> ${p.estado}</p>
    <p><b>Fecha:</b> ${new Date(p.fecha).toLocaleString()}</p>
    <hr>
    ${p.items
      .map(i => `${i.cantidad}× ${i.nombre} — $${i.subtotal}`)
      .join("<br>")}
    <hr>
    <h3>Total: $${p.total}</h3>
  `;

  html2pdf().from(contenido).save(`Pedido-${nombreMostrar}.pdf`);
}

/* =========================================================
   WHATSAPP
========================================================= */

function enviarWhatsApp(p, nombreMostrar) {
  const cliente = clientesPorNombre[p.clienteNombre] || {};
  const numero = cliente.whatsapp || p.clienteTelefono || "";

  const msg =
`¡Hola ${nombreMostrar}! 😊

🦊 *Pixel - Detalle de tu pedido*

${p.items
  .map(i => `✨ ${i.cantidad}× *${i.nombre}* — $${i.subtotal}`)
  .join("\n")}

💰 *Total:* $${p.total}
📅 *Fecha:* ${new Date(p.fecha).toLocaleDateString()}
📌 *Estado:* ${p.estado}
💵 *Pagado:* ${p.pagado ? "Sí ✔" : "No ❌"}

💛 ¡Gracias por tu compra!
📸 Instagram: https://instagram.com/pixel.stickerss`;

  const url = `https://wa.me/54${numero}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/* =========================================================
   EDITAR PEDIDO
========================================================= */

window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  editEstado.value = p.estado;
  editNota.value = p.nota || "";
  editFecha.value = p.fecha ? new Date(p.fecha).toISOString().slice(0, 10) : "";
  editPagado.checked = !!p.pagado;

  modalEdit.classList.remove("hidden");
};

editCerrar.addEventListener("click", () => modalEdit.classList.add("hidden"));

editGuardar.addEventListener("click", async () => {
  if (!pedidoEditandoId) return;

  const nuevaFecha = editFecha.value
    ? new Date(editFecha.value + "T00:00:00").toISOString()
    : null;

  try {
    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      estado: editEstado.value,
      nota: editNota.value.trim(),
      fecha: nuevaFecha,
      pagado: editPagado.checked
    });

    alert("Cambios guardados ✔");
    modalEdit.classList.add("hidden");
    cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al actualizar.");
  }
});

/* =========================================================
   DUPLICAR PEDIDO
========================================================= */

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

/* =========================================================
   INIT
========================================================= */

(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
