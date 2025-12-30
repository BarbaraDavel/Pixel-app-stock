// js/pedidos.js
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

/* =====================================================
   DOM
===================================================== */
// Cliente
const inputClienteNombre   = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed      = document.getElementById("clienteRed");
const datalistClientes     = document.getElementById("clientesDatalist");

// Productos / items
const selProducto   = document.getElementById("productoSelect");
const inputCantidad = document.getElementById("cantidadInput");
const tbodyItems    = document.getElementById("pedidoItems");
const spanTotal     = document.getElementById("totalPedido");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

// Datos pedido
const inputFecha   = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota    = document.getElementById("pedidoNota");
const inputPagado  = document.getElementById("pedidoPagado");

// Lista
const listaPedidosBody = document.getElementById("listaPedidos");
const filtroEstado   = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

// Modal ver
const modal        = document.getElementById("pedidoModal");
const modalTitulo  = document.getElementById("modalTitulo");
const modalCliente = document.getElementById("modalCliente");
const modalEstado  = document.getElementById("modalEstado");
const modalFecha   = document.getElementById("modalFecha");
const modalItems   = document.getElementById("modalItems");
const modalNota    = document.getElementById("modalNota");
const modalTotal   = document.getElementById("modalTotal");
const modalPdf     = document.getElementById("modalPdf");
const modalWhats   = document.getElementById("modalWhatsApp");
const modalCerrar  = document.getElementById("modalCerrar");

// Modal editar
const modalEdit   = document.getElementById("editarPedidoModal");
const editEstado  = document.getElementById("editEstado");
const editNota    = document.getElementById("editNota");
const editFecha   = document.getElementById("editFecha");
const editPagado  = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar  = document.getElementById("editCerrar");

/* =====================================================
   ESTADO
===================================================== */
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoModalActual = null;

/* =====================================================
   HELPERS
===================================================== */
function esEstadoFinal(e) {
  return e === "LISTO" || e === "ENTREGADO";
}

function debeDescontarStock(p) {
  return !p.stockDescontado && (p.pagado || esEstadoFinal(p.estado));
}

function prioridadPedido(p) {
  if (p.estado !== "ENTREGADO" && !p.pagado) return 1;
  if (p.estado !== "ENTREGADO" && p.pagado)  return 2;
  if (p.estado === "ENTREGADO" && !p.pagado) return 3;
  return 4;
}

/* =====================================================
   CLIENTES
===================================================== */
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = {
      id: d.id,
      telefono: c.whatsapp || c.telefono || "",
      red: c.instagram || c.red || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const c = clientesPorNombre[inputClienteNombre.value.trim()];
  if (!c) return;
  if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
  if (!inputClienteRed.value) inputClienteRed.value = c.red;
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* =====================================================
   PRODUCTOS
===================================================== */
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `<option value="${p.id}">
      ${p.nombre} — $${Number(p.precio || 0)}
    </option>`;
  });
}

/* =====================================================
   ITEMS PEDIDO
===================================================== */
function renderPedido() {
  tbodyItems.innerHTML = "";
  let total = 0;

  itemsPedido.forEach((i, idx) => {
    total += i.subtotal;
    tbodyItems.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>$${i.precio}</td>
        <td>${i.cantidad}</td>
        <td>$${i.subtotal}</td>
        <td>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>`;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

btnAgregar.addEventListener("click", e => {
  e.preventDefault();
  const prod = productos.find(p => p.id === selProducto.value);
  const cant = Number(inputCantidad.value);
  if (!prod || cant <= 0) return alert("Producto o cantidad inválida");

  itemsPedido.push({
    productoId: prod.id,
    nombre: prod.nombre,
    precio: Number(prod.precio || 0),
    cantidad: cant,
    subtotal: cant * Number(prod.precio || 0)
  });

  renderPedido();
});

/* =====================================================
   FORM
===================================================== */
function limpiarFormulario() {
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
}

btnLimpiar.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   GUARDAR PEDIDO (con creación automática de cliente)
===================================================== */
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length)
    return alert("Faltan datos");

  const nombreCliente = inputClienteNombre.value.trim();

  // 👉 crear cliente si no existe
  if (!clientesPorNombre[nombreCliente]) {
    await addDoc(collection(db, "clientes"), {
      nombre: nombreCliente,
      telefono: inputClienteTelefono.value || "",
      instagram: inputClienteRed.value || "",
      createdAt: serverTimestamp()
    });
  }

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const pedido = {
    clienteNombre: nombreCliente,
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: fechaIso,
    fechaServer: serverTimestamp(),
    estado: selectEstado.value,
    nota: inputNota.value,
    pagado: inputPagado.checked,
    total,
    stockDescontado: false,
    items: itemsPedido
  };

  const ref = await addDoc(collection(db, "pedidos"), pedido);
  if (debeDescontarStock({ ...pedido, id: ref.id })) {
    await updateDoc(doc(db, "pedidos", ref.id), { stockDescontado: true });
  }

  alert("Pedido guardado ✔");
  limpiarFormulario();
  cargarClientes();
  cargarPedidos();
});

/* =====================================================
   LISTA PEDIDOS
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => {
    const pa = prioridadPedido(a);
    const pb = prioridadPedido(b);
    if (pa !== pb) return pa - pb;
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  renderLista();
}

function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p => (!est || p.estado === est) &&
      (!txt || p.clienteNombre.toLowerCase().includes(txt)))
    .forEach(p => {
      const fila =
        prioridadPedido(p) === 1 ? "tr-urgente" :
        prioridadPedido(p) <= 3 ? "tr-atencion" : "tr-ok";

      listaPedidosBody.innerHTML += `
        <tr class="${fila}">
          <td>${p.clienteNombre}</td>
          <td>${new Date(p.fecha).toLocaleDateString()}</td>
          <td><span class="badge badge-${p.estado.toLowerCase()}">${p.estado}</span></td>
          <td>
            ${
              p.pagado
                ? `<span class="badge badge-pagado">Pagado</span>`
                : `<span class="badge badge-nopagado">No pagado</span>`
            }
          </td>

          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁️</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕</button>
            <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>`;
    });
}

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

/* =====================================================
   MODALES + WHATSAPP
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;
  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalItems.innerHTML = p.items.map(i => `• ${i.cantidad}× ${i.nombre} ($${i.subtotal})`).join("<br>");
  modalNota.textContent = p.nota || "";
  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

modalWhats.onclick = () => {
  if (!pedidoModalActual) return;

  const p = pedidoModalActual;
  const telefono = (p.clienteTelefono || "").replace(/\D/g, "");

  const items = p.items
    .map(i => `• ${i.cantidad} x ${i.nombre} ($${i.subtotal})`)
    .join("\n");

  
const mensaje = `
Hola ${p.clienteNombre} 👋
Te paso el detalle de tu pedido:

${items}

💰 Total: $${p.total}
📦 Estado: ${p.estado}

💳 Podés pagar por transferencia al alias:
👉 barbi-d
📸 Enviame el comprobante cuando puedas

Gracias 💜 Pixel
`.trim();

const url = telefono
  ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
  : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

window.open(url, "_blank");

};

/* =====================================================
   EDITAR / DUPLICAR / BORRAR
===================================================== */
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  pedidoEditandoId = id;
  editEstado.value = p.estado;
  editNota.value = p.nota || "";
  editFecha.value = p.fecha.slice(0,10);
  editPagado.checked = p.pagado;
  modalEdit.classList.remove("hidden");
};

editCerrar.onclick = () => modalEdit.classList.add("hidden");

editGuardar.onclick = async () => {
  await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
    estado: editEstado.value,
    nota: editNota.value,
    fecha: editFecha.value + "T00:00:00",
    pagado: editPagado.checked
  });
  modalEdit.classList.add("hidden");
  cargarPedidos();
};

window.duplicarPedido = async id => {
  const p = pedidosCache.find(x => x.id === id);
  const nuevo = { ...p, fecha: new Date().toISOString(), pagado:false, estado:"PENDIENTE" };
  delete nuevo.id;
  await addDoc(collection(db,"pedidos"), nuevo);
  cargarPedidos();
};

window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db,"pedidos",id));
  cargarPedidos();
};

/* =====================================================
   INIT
===================================================== */
(async function init(){
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
rrar");

// Modal editar
const modalEdit   = document.getElementById("editarPedidoModal");
const editEstado  = document.getElementById("editEstado");
const editNota    = document.getElementById("editNota");
const editFecha   = document.getElementById("editFecha");
const editPagado  = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar  = document.getElementById("editCerrar");

/* =====================================================
   ESTADO
===================================================== */
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoModalActual = null;

/* =====================================================
   HELPERS
===================================================== */
function esEstadoFinal(e) {
  return e === "LISTO" || e === "ENTREGADO";
}

function debeDescontarStock(p) {
  return !p.stockDescontado && (p.pagado || esEstadoFinal(p.estado));
}

function prioridadPedido(p) {
  if (p.estado !== "ENTREGADO" && !p.pagado) return 1;
  if (p.estado !== "ENTREGADO" && p.pagado)  return 2;
  if (p.estado === "ENTREGADO" && !p.pagado) return 3;
  return 4;
}

/* =====================================================
   CLIENTES
===================================================== */
async function cargarClientes() {
  datalistClientes.innerHTML = "";
  clientesPorNombre = {};

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => {
    const c = d.data();
    clientesPorNombre[c.nombre] = {
      id: d.id,
      telefono: c.whatsapp || c.telefono || "",
      red: c.instagram || c.red || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const c = clientesPorNombre[inputClienteNombre.value.trim()];
  if (!c) return;
  if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
  if (!inputClienteRed.value) inputClienteRed.value = c.red;
}

inputClienteNombre.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre.addEventListener("blur", syncClienteDesdeNombre);

/* =====================================================
   PRODUCTOS
===================================================== */
async function cargarProductos() {
  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `<option value="${p.id}">
      ${p.nombre} — $${Number(p.precio || 0)}
    </option>`;
  });
}

/* =====================================================
   ITEMS PEDIDO
===================================================== */
function renderPedido() {
  tbodyItems.innerHTML = "";
  let total = 0;

  itemsPedido.forEach((i, idx) => {
    total += i.subtotal;
    tbodyItems.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>$${i.precio}</td>
        <td>${i.cantidad}</td>
        <td>$${i.subtotal}</td>
        <td>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>`;
  });

  spanTotal.textContent = total;
}

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

btnAgregar.addEventListener("click", e => {
  e.preventDefault();
  const prod = productos.find(p => p.id === selProducto.value);
  const cant = Number(inputCantidad.value);
  if (!prod || cant <= 0) return alert("Producto o cantidad inválida");

  itemsPedido.push({
    productoId: prod.id,
    nombre: prod.nombre,
    precio: Number(prod.precio || 0),
    cantidad: cant,
    subtotal: cant * Number(prod.precio || 0)
  });

  renderPedido();
});

/* =====================================================
   FORM
===================================================== */
function limpiarFormulario() {
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
}

btnLimpiar.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   GUARDAR PEDIDO (con creación automática de cliente)
===================================================== */
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length)
    return alert("Faltan datos");

  const nombreCliente = inputClienteNombre.value.trim();

  // 👉 crear cliente si no existe
  if (!clientesPorNombre[nombreCliente]) {
    await addDoc(collection(db, "clientes"), {
      nombre: nombreCliente,
      telefono: inputClienteTelefono.value || "",
      instagram: inputClienteRed.value || "",
      createdAt: serverTimestamp()
    });
  }

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const pedido = {
    clienteNombre: nombreCliente,
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: fechaIso,
    fechaServer: serverTimestamp(),
    estado: selectEstado.value,
    nota: inputNota.value,
    pagado: inputPagado.checked,
    total,
    stockDescontado: false,
    items: itemsPedido
  };

  const ref = await addDoc(collection(db, "pedidos"), pedido);
  if (debeDescontarStock({ ...pedido, id: ref.id })) {
    await updateDoc(doc(db, "pedidos", ref.id), { stockDescontado: true });
  }

  alert("Pedido guardado ✔");
  limpiarFormulario();
  cargarClientes();
  cargarPedidos();
});

/* =====================================================
   LISTA PEDIDOS
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => {
    const pa = prioridadPedido(a);
    const pb = prioridadPedido(b);
    if (pa !== pb) return pa - pb;
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  renderLista();
}

function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p => (!est || p.estado === est) &&
      (!txt || p.clienteNombre.toLowerCase().includes(txt)))
    .forEach(p => {
      const fila =
        prioridadPedido(p) === 1 ? "tr-urgente" :
        prioridadPedido(p) <= 3 ? "tr-atencion" : "tr-ok";

      listaPedidosBody.innerHTML += `
        <tr class="${fila}">
          <td>${p.clienteNombre}</td>
          <td>${new Date(p.fecha).toLocaleDateString()}</td>
          <td><span class="badge badge-${p.estado.toLowerCase()}">${p.estado}</span></td>
          <td>
            ${
              p.pagado
                ? `<span class="badge badge-pagado">Pagado</span>`
                : `<span class="badge badge-nopagado">No pagado</span>`
            }
          </td>

          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁️</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕</button>
            <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>`;
    });
}

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

/* =====================================================
   MODALES + WHATSAPP
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;
  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalItems.innerHTML = p.items.map(i => `• ${i.cantidad}× ${i.nombre} ($${i.subtotal})`).join("<br>");
  modalNota.textContent = p.nota || "";
  modalTotal.textContent = `Total: $${p.total}`;

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

modalWhats.onclick = () => {
  if (!pedidoModalActual) return;

  const p = pedidoModalActual;
  const telefono = (p.clienteTelefono || "").replace(/\D/g, "");

  const items = p.items
    .map(i => `• ${i.cantidad} x ${i.nombre} ($${i.subtotal})`)
    .join("\n");

  
const mensaje = `
Hola ${p.clienteNombre} 👋
Te paso el detalle de tu pedido:

${items}

💰 Total: $${p.total}
📦 Estado: ${p.estado}

💳 Podés pagar por transferencia al alias:
👉 barbi-d
📸 Enviame el comprobante cuando puedas

Gracias 💜 Pixel
`.trim();

const url = telefono
  ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
  : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

window.open(url, "_blank");

};

/* =====================================================
   EDITAR / DUPLICAR / BORRAR
===================================================== */
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  pedidoEditandoId = id;
  editEstado.value = p.estado;
  editNota.value = p.nota || "";
  editFecha.value = p.fecha.slice(0,10);
  editPagado.checked = p.pagado;
  modalEdit.classList.remove("hidden");
};

editCerrar.onclick = () => modalEdit.classList.add("hidden");

editGuardar.onclick = async () => {
  await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
    estado: editEstado.value,
    nota: editNota.value,
    fecha: editFecha.value + "T00:00:00",
    pagado: editPagado.checked
  });
  modalEdit.classList.add("hidden");
  cargarPedidos();
};

window.duplicarPedido = async id => {
  const p = pedidosCache.find(x => x.id === id);
  const nuevo = { ...p, fecha: new Date().toISOString(), pagado:false, estado:"PENDIENTE" };
  delete nuevo.id;
  await addDoc(collection(db,"pedidos"), nuevo);
  cargarPedidos();
};

window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db,"pedidos",id));
  cargarPedidos();
};

/* =====================================================
   INIT
===================================================== */
(async function init(){
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();



