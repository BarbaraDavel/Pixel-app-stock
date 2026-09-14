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
const inputClienteNombre   = document.getElementById("clienteNombre");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed      = document.getElementById("clienteRed");
const datalistClientes     = document.getElementById("clientesDatalist");
const clienteEstado        = document.getElementById("clienteEstado");

const inputProductoBuscar = document.getElementById("productoBuscar");
const selProducto         = document.getElementById("productoSelect");
const inputItemNombre     = document.getElementById("itemNombre");
const inputCantidad       = document.getElementById("cantidadInput");
const inputItemPrecio     = document.getElementById("itemPrecio");
const selTipoPrecio       = document.getElementById("tipoPrecio");
const tbodyItems          = document.getElementById("pedidoItems");
const spanTotal           = document.getElementById("totalPedido");
const spanTotalFooter     = document.getElementById("totalPedidoFooter");
const productosDatalist   = document.getElementById("productosDatalist");
const itemsPedidoVacio    = document.getElementById("itemsPedidoVacio");

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

const inputFecha   = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota    = document.getElementById("pedidoNota");

const inputPagoMonto = document.getElementById("pagoMonto");
const selectPagoMedio = document.getElementById("pagoMedio");
const inputPagoFecha = document.getElementById("pagoFecha");
const btnAgregarPago = document.getElementById("agregarPagoBtn");
const listaPagosPedido = document.getElementById("listaPagosPedido");
const resumenPagos = document.getElementById("resumenPagos");
const mostrarPagoBtn = document.getElementById("mostrarPagoBtn");
const pagoFormulario = document.getElementById("pagoFormulario");

const listaPedidosBody = document.getElementById("listaPedidos");
const filtroEstado     = document.getElementById("filtroEstado");
const filtroBusqueda   = document.getElementById("filtroBusqueda");
const nuevoPedidoBtn          = document.getElementById("nuevoPedidoBtn");
const formularioPedidoModal   = document.getElementById("formularioPedidoModal");
const formularioPedidoTitulo  = document.getElementById("formularioPedidoTitulo");
const cerrarFormularioBtn     = document.getElementById("cerrarFormularioPedidoBtn");
const cargarMasPedidosBtn     = document.getElementById("cargarMasPedidosBtn");
const contadorPedidos         = document.getElementById("contadorPedidos");

const modal          = document.getElementById("pedidoModal");
const modalTitulo    = document.getElementById("modalTitulo");
const modalCliente   = document.getElementById("modalCliente");
const modalEstado    = document.getElementById("modalEstado");
const modalFecha     = document.getElementById("modalFecha");
const modalItems     = document.getElementById("modalItems");
const modalNota      = document.getElementById("modalNota");
const modalTotal     = document.getElementById("modalTotal");
const modalPago      = document.getElementById("modalPago");
const modalWhats     = document.getElementById("modalWhatsApp");
const modalCerrar    = document.getElementById("modalCerrar");
const modalHistorial = document.getElementById("modalHistorial");

/* =====================================================
   ESTADO
===================================================== */
let clientes = [];
let productos = [];
let itemsPedido = [];
let pagosPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoModalActual = null;
let limitePedidos = 20;

const ordenEstados = {
  PENDIENTE: 1,
  PROCESO: 2,
  LISTO: 3,
  ENTREGADO: 4
};

/* =====================================================
   HELPERS
===================================================== */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v) {
  return toNumber(v).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obtenerNombreProducto(p) {
  return p?.nombre || p?.producto || p?.titulo || p?.descripcion || "";
}

function obtenerPrecioProducto(p) {
  return toNumber(p?.precio || p?.valor || p?.importe || 0);
}

function obtenerTotalPedidoActual() {
  return itemsPedido.reduce((acc, item) => acc + toNumber(item.subtotal), 0);
}

function obtenerPagadoPedido(p) {
  if (Array.isArray(p?.pagos) && p.pagos.length) {
    return p.pagos.reduce((acc, pago) => acc + toNumber(pago.monto), 0);
  }

  // Compatibilidad con pedidos viejos que solo tenían pagado true/false.
  return p?.pagado ? toNumber(p?.total) : 0;
}

function obtenerPagadoActual() {
  return pagosPedido.reduce((acc, pago) => acc + toNumber(pago.monto), 0);
}

function clienteExistentePorNombre(nombre) {
  const buscado = normalizarTexto(nombre);
  return clientes.find(c => normalizarTexto(c.nombre) === buscado) || null;
}

/* =====================================================
   FEEDBACK / TOASTS
===================================================== */
function mostrarToast(mensaje, tipo = "ok") {
  let contenedor = document.getElementById("pixelToastContainer");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "pixelToastContainer";
    contenedor.className = "pixel-toast-container";
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement("div");
  toast.className = `pixel-toast pixel-toast-${tipo}`;
  toast.innerHTML = `
    <span class="pixel-toast-icon">${tipo === "error" ? "!" : "✓"}</span>
    <span>${mensaje}</span>
  `;
  contenedor.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

/* =====================================================
   CLIENTES
===================================================== */
async function cargarClientes() {
  clientes = [];
  datalistClientes.innerHTML = "";

  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach(d => clientes.push({ id: d.id, ...d.data() }));

  clientes.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" }));

  datalistClientes.innerHTML = clientes
    .map(c => `<option value="${c.nombre || ""}"></option>`)
    .join("");

  actualizarEstadoCliente();
}

function sincronizarCliente() {
  const c = clienteExistentePorNombre(inputClienteNombre.value);
  if (!c) {
    actualizarEstadoCliente();
    return;
  }

  inputClienteTelefono.value = c.whatsapp || c.telefono || "";
  inputClienteRed.value = c.instagram || c.red || "";
  actualizarEstadoCliente();
}

function actualizarEstadoCliente() {
  if (!clienteEstado) return;

  const nombre = inputClienteNombre.value.trim();
  if (!nombre) {
    clienteEstado.textContent = "";
    return;
  }

  const existe = clienteExistentePorNombre(nombre);
  clienteEstado.textContent = existe
    ? "Cliente existente ✔"
    : `Cliente nuevo: se guardará automáticamente como “${nombre}”.`;
}

inputClienteNombre?.addEventListener("input", actualizarEstadoCliente);
inputClienteNombre?.addEventListener("change", sincronizarCliente);
inputClienteNombre?.addEventListener("blur", sincronizarCliente);

async function guardarClienteSiHaceFalta() {
  const nombre = inputClienteNombre.value.trim();
  if (!nombre) return null;

  const telefono = inputClienteTelefono.value.trim();
  const red = inputClienteRed.value.trim();
  const existente = clienteExistentePorNombre(nombre);

  if (existente) {
    // Si completaste o corregiste datos desde el pedido, también actualizamos
    // la ficha del cliente para que no queden guiones en Clientes.
    const cambios = {};
    if (telefono && telefono !== (existente.telefono || existente.whatsapp || "")) {
      cambios.telefono = telefono;
      cambios.whatsapp = telefono; // compatibilidad con registros anteriores
    }
    if (red && red !== (existente.red || existente.instagram || "")) {
      cambios.red = red;
      cambios.instagram = red; // compatibilidad con registros anteriores
    }

    if (Object.keys(cambios).length) {
      await updateDoc(doc(db, "clientes", existente.id), cambios);
      Object.assign(existente, cambios);
    }
    return existente.id;
  }

  const ref = await addDoc(collection(db, "clientes"), {
    nombre,
    telefono,
    red,
    // Dejamos también estos alias por compatibilidad con código viejo.
    whatsapp: telefono,
    instagram: red,
    creadoDesdePedido: true,
    fechaCreacion: serverTimestamp()
  });

  return ref.id;
}

/* =====================================================
   PRODUCTOS
===================================================== */
function renderOpcionesProductos(textoBusqueda = "") {
  const texto = normalizarTexto(textoBusqueda);
  const filtrados = texto
    ? productos.filter(p => normalizarTexto(obtenerNombreProducto(p)).includes(texto))
    : productos;

  if (selProducto) {
    selProducto.innerHTML = `<option value="">No usar producto guardado</option>`;
    filtrados.forEach(p => {
      selProducto.innerHTML += `<option value="${p.id}">${obtenerNombreProducto(p)}</option>`;
    });
  }

  if (productosDatalist) {
    productosDatalist.innerHTML = filtrados
      .map(p => `<option value="${obtenerNombreProducto(p)}"></option>`)
      .join("");
  }
}

function sincronizarProductoPorNombre() {
  const nombre = inputItemNombre.value.trim();
  const prod = productos.find(p => normalizarTexto(obtenerNombreProducto(p)) === normalizarTexto(nombre));

  if (!prod) {
    if (selProducto) selProducto.value = "";
    return;
  }

  if (selProducto) selProducto.value = prod.id;
  inputItemPrecio.value = obtenerPrecioProducto(prod);
  selTipoPrecio.value = "UNITARIO";
}

async function cargarProductos() {
  productos = [];
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

  productos.sort((a, b) => obtenerNombreProducto(a).localeCompare(obtenerNombreProducto(b), "es", { sensitivity: "base" }));
  renderOpcionesProductos();
}

inputProductoBuscar?.addEventListener("input", () => {
  renderOpcionesProductos(inputProductoBuscar.value);
});

selProducto?.addEventListener("change", () => {
  const prod = productos.find(p => p.id === selProducto.value);
  if (!prod) return;

  inputItemNombre.value = obtenerNombreProducto(prod);
  inputItemPrecio.value = obtenerPrecioProducto(prod);
  selTipoPrecio.value = "UNITARIO";
});

inputItemNombre?.addEventListener("input", () => {
  if (selProducto) selProducto.value = "";
});
inputItemNombre?.addEventListener("change", sincronizarProductoPorNombre);
inputItemNombre?.addEventListener("blur", sincronizarProductoPorNombre);

/* =====================================================
   ITEMS
===================================================== */
function renderPedido() {
  tbodyItems.innerHTML = "";

  itemsPedido.forEach((i, idx) => {
    const precioLabel = i.tipoPrecio === "TOTAL"
      ? `$${money(i.subtotal)} total`
      : `$${money(i.precio)}`;

    tbodyItems.innerHTML += `
      <tr>
        <td>
          ${i.nombre}
          ${i.productoId ? "" : `<div class="hint">Ítem personalizado</div>`}
        </td>
        <td>${i.cantidad}</td>
        <td>$${money(i.subtotal)}</td>
        <td>
          <button class="btn-pp" onclick="editarItem(${idx})">✏️</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>`;
  });

  const totalActual = obtenerTotalPedidoActual();
  spanTotal.textContent = money(totalActual);
  if (spanTotalFooter) spanTotalFooter.textContent = money(totalActual);
  if (itemsPedidoVacio) itemsPedidoVacio.classList.toggle("hidden", itemsPedido.length > 0);
  renderResumenPagos();
}

function limpiarCargaItem() {
  inputProductoBuscar.value = "";
  selProducto.value = "";
  inputItemNombre.value = "";
  inputItemPrecio.value = "";
  inputCantidad.value = 1;
  selTipoPrecio.value = "TOTAL";
  renderOpcionesProductos();
}

function agregarItemDesdeFormulario() {
  const nombre = inputItemNombre.value.trim();
  const cantidad = toNumber(inputCantidad.value);
  const precioIngresado = toNumber(inputItemPrecio.value);
  const tipoPrecio = selTipoPrecio.value;
  const prod = productos.find(p => p.id === selProducto.value);

  if (!nombre) { mostrarToast("Escribí el nombre del producto o trabajo.", "error"); return; }
  if (cantidad <= 0) { mostrarToast("La cantidad debe ser mayor a 0.", "error"); return; }
  if (precioIngresado < 0) { mostrarToast("El precio no puede ser negativo.", "error"); return; }

  const subtotal = tipoPrecio === "TOTAL"
    ? precioIngresado
    : precioIngresado * cantidad;

  const precioUnitario = tipoPrecio === "TOTAL"
    ? (cantidad ? precioIngresado / cantidad : 0)
    : precioIngresado;

  itemsPedido.push({
    productoId: prod?.id || null,
    nombre,
    precio: precioUnitario,
    precioIngresado,
    tipoPrecio,
    cantidad,
    subtotal,
    personalizado: !prod
  });

  renderPedido();
  limpiarCargaItem();
}

btnAgregar?.addEventListener("click", e => {
  e.preventDefault();
  agregarItemDesdeFormulario();
});

window.eliminarItem = idx => {
  itemsPedido.splice(idx, 1);
  renderPedido();
};

window.editarItem = idx => {
  const i = itemsPedido[idx];
  if (!i) return;

  selProducto.value = i.productoId || "";
  inputItemNombre.value = i.nombre || "";
  inputCantidad.value = i.cantidad || 1;
  selTipoPrecio.value = i.tipoPrecio || "UNITARIO";
  inputItemPrecio.value = i.tipoPrecio === "TOTAL"
    ? toNumber(i.subtotal)
    : toNumber(i.precio);

  itemsPedido.splice(idx, 1);
  renderPedido();
  inputItemNombre.focus();
};

/* =====================================================
   PAGOS
===================================================== */
function renderResumenPagos() {
  if (!resumenPagos) return;

  const total = obtenerTotalPedidoActual();
  const pagado = obtenerPagadoActual();
  const pendiente = Math.max(total - pagado, 0);

  resumenPagos.textContent = `Pagado $${money(pagado)} · Debe $${money(pendiente)}`;
}

function renderPagosPedido() {
  if (!listaPagosPedido) return;

  if (!pagosPedido.length) {
    listaPagosPedido.innerHTML = '';
    renderResumenPagos();
    return;
  }

  listaPagosPedido.innerHTML = pagosPedido.map((pago, idx) => {
    const fecha = pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-AR') : '-';
    const medio = (pago.medio || 'OTRO').replaceAll('_', ' ');
    return `
      <div class="pago-pedido-item">
        <span>${fecha}</span>
        <span>${medio}</span>
        <strong>$${money(pago.monto)}</strong>
        <button type="button" class="pago-quitar-btn" data-pago-index="${idx}" aria-label="Quitar pago">✕</button>
      </div>`;
  }).join('');

  renderResumenPagos();
}

function tomarPagoDelFormulario() {
  const monto = toNumber(inputPagoMonto.value);
  if (monto <= 0) return null;

  const fechaBase = inputPagoFecha?.value
    ? new Date(inputPagoFecha.value + 'T12:00:00').toISOString()
    : new Date().toISOString();

  return {
    monto,
    medio: selectPagoMedio.value || 'OTRO',
    fecha: fechaBase
  };
}

function agregarPagoDesdeFormulario() {
  const pago = tomarPagoDelFormulario();
  if (!pago) { mostrarToast('Ingresá un monto mayor a 0.', 'error'); return; }

  const total = obtenerTotalPedidoActual();
  const pagadoActual = obtenerPagadoActual();
  if (total > 0 && pagadoActual + pago.monto > total) {
    if (!confirm('El pago supera el saldo pendiente. ¿Querés registrarlo igual?')) return;
  }

  pagosPedido.push(pago);
  inputPagoMonto.value = '';
  renderPagosPedido();
  pagoFormulario?.classList.add("hidden");
}

btnAgregarPago?.addEventListener('click', e => {
  e.preventDefault();
  agregarPagoDesdeFormulario();
});

mostrarPagoBtn?.addEventListener("click", () => {
  pagoFormulario?.classList.toggle("hidden");
  if (!pagoFormulario?.classList.contains("hidden")) {
    setTimeout(() => inputPagoMonto?.focus(), 20);
  }
});

listaPagosPedido?.addEventListener('click', e => {
  const btn = e.target.closest('[data-pago-index]');
  if (!btn) return;
  const idx = Number(btn.dataset.pagoIndex);
  if (!Number.isInteger(idx)) return;
  pagosPedido.splice(idx, 1);
  renderPagosPedido();
});

inputPagoMonto?.addEventListener('input', renderResumenPagos);

/* =====================================================
   MODAL NUEVO / EDITAR
===================================================== */
function abrirFormularioPedido(modo = "nuevo") {
  if (!formularioPedidoModal) return;
  formularioPedidoTitulo.textContent = modo === "editar" ? "Editar pedido" : "Nuevo pedido";
  formularioPedidoModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(() => inputClienteNombre?.focus(), 50);
}

function cerrarFormularioPedido() {
  if (!formularioPedidoModal) return;
  formularioPedidoModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

nuevoPedidoBtn?.addEventListener("click", () => {
  limpiarFormulario();
  abrirFormularioPedido("nuevo");
});

cerrarFormularioBtn?.addEventListener("click", cerrarFormularioPedido);

formularioPedidoModal?.addEventListener("click", e => {
  if (e.target === formularioPedidoModal) cerrarFormularioPedido();
});

window.addEventListener("keydown", e => {
  if (e.key === "Escape" && !formularioPedidoModal?.classList.contains("hidden")) {
    cerrarFormularioPedido();
  }
});

/* =====================================================
   FORM
===================================================== */
function limpiarFormulario() {
  itemsPedido = [];
  pagosPedido = [];

  inputClienteNombre.value = "";
  inputClienteTelefono.value = "";
  inputClienteRed.value = "";
  inputNota.value = "";
  inputFecha.value = new Date().toISOString().slice(0, 10);
  selectEstado.value = "PENDIENTE";
  inputPagoMonto.value = "";
  selectPagoMedio.value = "TRANSFERENCIA";
  if (inputPagoFecha) inputPagoFecha.value = new Date().toISOString().slice(0, 10);
  pagoFormulario?.classList.add("hidden");

  pedidoEditandoId = null;
  btnGuardar.textContent = "Guardar pedido";

  limpiarCargaItem();
  actualizarEstadoCliente();
  renderPedido();
  renderPagosPedido();
}

btnLimpiar?.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   GUARDAR / EDITAR
===================================================== */
btnGuardar?.addEventListener("click", async e => {
  e.preventDefault();

  const clienteNombre = inputClienteNombre.value.trim();
  if (!clienteNombre) { mostrarToast("Escribí el nombre del cliente.", "error"); return; }
  if (!itemsPedido.length) { mostrarToast("Agregá al menos un producto o trabajo al pedido.", "error"); return; }

  const pagoNuevo = tomarPagoDelFormulario();
  const pagosFinales = pagoNuevo ? [...pagosPedido, pagoNuevo] : [...pagosPedido];

  const total = obtenerTotalPedidoActual();
  const montoPagado = pagosFinales.reduce((acc, pago) => acc + toNumber(pago.monto), 0);
  const pagado = total > 0 && montoPagado >= total;

  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const clienteId = await guardarClienteSiHaceFalta();

  const baseData = {
    clienteId,
    clienteNombre,
    clienteTelefono: inputClienteTelefono.value.trim(),
    clienteRed: inputClienteRed.value.trim(),
    fecha: fechaIso,
    estado: selectEstado.value || "PENDIENTE",
    nota: inputNota.value.trim(),
    total,
    items: itemsPedido,
    pagos: pagosFinales,
    montoPagado,
    saldoPendiente: Math.max(total - montoPagado, 0),
    pagado
  };

  if (pedidoEditandoId) {
    const anterior = pedidosCache.find(x => x.id === pedidoEditandoId);

    if (anterior?.estado === "ENTREGADO") {
      if (!confirm("Este pedido está ENTREGADO. ¿Querés modificarlo igual?")) return;
    }

    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      ...baseData,
      historial: [
        ...(anterior?.historial || []),
        {
          fecha: new Date().toISOString(),
          accion: "EDITADO",
          estado: baseData.estado,
          pagado: baseData.pagado,
          total: baseData.total,
          montoPagado: baseData.montoPagado
        }
      ]
    });

    mostrarToast("Pedido actualizado");
  } else {
    await addDoc(collection(db, "pedidos"), {
      ...baseData,
      fechaServer: serverTimestamp(),
      stockDescontado: false,
      historial: [
        {
          fecha: new Date().toISOString(),
          accion: "CREADO",
          estado: baseData.estado,
          pagado: baseData.pagado,
          total: baseData.total,
          montoPagado: baseData.montoPagado
        }
      ]
    });

    mostrarToast("Pedido guardado");
  }

  limpiarFormulario();
  cerrarFormularioPedido();
  await cargarClientes();
  await cargarPedidos();
});

/* =====================================================
   LISTA
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => {
    if (!!a.pagado !== !!b.pagado) return a.pagado ? 1 : -1;
    const ea = ordenEstados[a.estado] || 99;
    const eb = ordenEstados[b.estado] || 99;
    if (ea !== eb) return ea - eb;
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  renderLista();
}

function renderLista() {
  const est = filtroEstado?.value || "";
  const txt = normalizarTexto(filtroBusqueda?.value || "");

  listaPedidosBody.innerHTML = "";

  const filtrados = pedidosCache.filter(p => {
    const coincideEstado = est === "ACTIVOS"
      ? ["PENDIENTE", "PROCESO", "LISTO"].includes(p.estado || "PENDIENTE")
      : (!est || p.estado === est);

    const coincideTexto = !txt || normalizarTexto(p.clienteNombre || "").includes(txt);
    return coincideEstado && coincideTexto;
  });

  const visibles = filtrados.slice(0, limitePedidos);

  visibles.forEach(p => {
    let fila = "tr-ok";
    if (p.estado === "PENDIENTE") fila = "tr-urgente";
    else if (p.estado === "PROCESO") fila = "tr-atencion";
    else if (p.estado === "LISTO") fila = "tr-listo";

    const montoPagado = obtenerPagadoPedido(p);
    const pendiente = Math.max(toNumber(p.total) - montoPagado, 0);
    const pagoHtml = pendiente <= 0 && toNumber(p.total) > 0
      ? `<span class="badge badge-pagado">Pagado</span>`
      : `<span class="badge badge-nopagado">Debe $${money(pendiente)}</span>`;

    listaPedidosBody.innerHTML += `
      <tr class="${fila}">
        <td class="cliente-click" onclick="verPedido('${p.id}')" style="cursor:pointer;" title="Ver pedido">
          ${p.clienteNombre || "Sin nombre"}
        </td>
        <td>${new Date(p.fecha).toLocaleDateString()}</td>
        <td><span class="badge badge-${String(p.estado || "PENDIENTE").toLowerCase()}">${p.estado || "PENDIENTE"}</span></td>
        <td>${pagoHtml}</td>
        <td>$${money(p.total)}</td>
        <td class="acciones-pedido">
          <button class="btn-pp" onclick="editarPedido('${p.id}')" title="Editar">✏️</button>
          <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`;
  });

  if (!visibles.length) {
    listaPedidosBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem;" class="hint">No hay pedidos para mostrar.</td></tr>`;
  }

  if (contadorPedidos) {
    const mostrados = Math.min(visibles.length, filtrados.length);
    contadorPedidos.textContent = filtrados.length
      ? `Mostrando ${mostrados} de ${filtrados.length} pedidos`
      : "0 pedidos";
  }

  if (cargarMasPedidosBtn) {
    cargarMasPedidosBtn.classList.toggle("hidden", visibles.length >= filtrados.length);
  }
}

function reiniciarListado() {
  limitePedidos = 20;
  renderLista();
}

filtroEstado?.addEventListener("change", reiniciarListado);
filtroBusqueda?.addEventListener("input", reiniciarListado);

cargarMasPedidosBtn?.addEventListener("click", () => {
  limitePedidos += 20;
  renderLista();
});

/* =====================================================
   MODAL VER + WHATSAPP
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;

  const montoPagado = obtenerPagadoPedido(p);
  const pendiente = Math.max(toNumber(p.total) - montoPagado, 0);

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalItems.innerHTML = (p.items || [])
    .map(i => `• ${i.cantidad}× ${i.nombre} ($${money(i.subtotal)})`)
    .join("<br>");
  modalNota.textContent = p.nota || "";
  modalTotal.textContent = `Total: $${money(p.total)}`;
  if (modalPago) modalPago.textContent = `Pagado: $${money(montoPagado)} · Pendiente: $${money(pendiente)}`;

  if (p.historial?.length) {
    modalHistorial.innerHTML = `
      <strong>🕓 Historial</strong><br>
      ${p.historial
        .map(h => `• ${new Date(h.fecha).toLocaleString()} – ${traducirAccion(h.accion)}`)
        .join("<br>")}`;
  } else {
    modalHistorial.innerHTML = "";
  }

  modal.classList.remove("hidden");
};

modalCerrar?.addEventListener("click", () => modal.classList.add("hidden"));

modalWhats?.addEventListener("click", () => {
  if (!pedidoModalActual) return;

  const p = pedidoModalActual;
  const telefono = (p.clienteTelefono || "").replace(/\D/g, "");
  const montoPagado = obtenerPagadoPedido(p);
  const pendiente = Math.max(toNumber(p.total) - montoPagado, 0);

  const items = (p.items || [])
    .map(i => `• ${i.cantidad} x ${i.nombre} ($${money(i.subtotal)})`)
    .join("\n");

  const pagoTexto = pendiente > 0
    ? `💳 Pagado: $${money(montoPagado)}\n⏳ Pendiente: $${money(pendiente)}`
    : `✅ Pedido pagado`;

  const mensaje = `
Hola ${p.clienteApodo || p.clienteNombre} 👋

Te paso el detalle de tu pedido:

${items}

💰 Total: $${money(p.total)}
${pagoTexto}
📦 Estado: ${p.estado}

💳 Podés pagar en efectivo o por transferencia al alias:
👉 barbi-mp (a nombre de Barbara Davel)
📸 Enviame el comprobante cuando puedas

✨ Instagram:
👉 https://www.instagram.com/pixel.stickerss/

Gracias 🤍 Pixel
`.trim();

  const url = telefono
    ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
});

/* =====================================================
   EDITAR
===================================================== */
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  inputClienteNombre.value = p.clienteNombre || "";
  inputClienteTelefono.value = p.clienteTelefono || "";
  inputClienteRed.value = p.clienteRed || "";
  inputFecha.value = (p.fecha || "").slice(0, 10);
  selectEstado.value = p.estado || "PENDIENTE";
  inputNota.value = p.nota || "";

  itemsPedido = (p.items || []).map(i => ({
    tipoPrecio: i.tipoPrecio || "UNITARIO",
    precioIngresado: i.precioIngresado ?? i.precio ?? 0,
    personalizado: i.personalizado ?? !i.productoId,
    ...i
  }));

  pagosPedido = Array.isArray(p.pagos) && p.pagos.length
    ? p.pagos.map(x => ({ ...x }))
    : (p.pagado ? [{ monto: toNumber(p.total), medio: "HISTORICO", fecha: p.fecha || new Date().toISOString() }] : []);

  inputPagoMonto.value = "";
  if (inputPagoFecha) inputPagoFecha.value = new Date().toISOString().slice(0, 10);
  limpiarCargaItem();
  actualizarEstadoCliente();
  renderPedido();
  renderPagosPedido();

  btnGuardar.textContent = "Guardar cambios";
  abrirFormularioPedido("editar");
};

/* =====================================================
   BORRAR
===================================================== */
window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db, "pedidos", id));
  await cargarPedidos();
};

/* =====================================================
   UTILS
===================================================== */
function traducirAccion(accion) {
  switch (accion) {
    case "CREADO": return "Pedido creado";
    case "EDITADO": return "Pedido editado";
    case "PAGADO": return "Marcado como pagado";
    case "NO_PAGADO": return "Marcado como no pagado";
    default: return accion;
  }
}

window.getPedidosCache = () => pedidosCache || [];

/* =====================================================
   INIT
===================================================== */
(async function init() {
  inputFecha.value = new Date().toISOString().slice(0, 10);
  if (inputPagoFecha) inputPagoFecha.value = new Date().toISOString().slice(0, 10);
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
