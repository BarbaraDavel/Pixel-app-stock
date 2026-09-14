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

const btnAgregar = document.getElementById("agregarItemBtn");
const btnGuardar = document.getElementById("guardarPedidoBtn");
const btnLimpiar = document.getElementById("limpiarPedidoBtn");

const inputFecha   = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota    = document.getElementById("pedidoNota");

const inputPagoMonto = document.getElementById("pagoMonto");
const selectPagoMedio = document.getElementById("pagoMedio");
const resumenPagos = document.getElementById("resumenPagos");

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

  const existente = clienteExistentePorNombre(nombre);
  if (existente) return existente.id;

  const ref = await addDoc(collection(db, "clientes"), {
    nombre,
    whatsapp: inputClienteTelefono.value.trim(),
    instagram: inputClienteRed.value.trim(),
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
  const actual = selProducto.value;

  const filtrados = texto
    ? productos.filter(p => normalizarTexto(obtenerNombreProducto(p)).includes(texto))
    : productos;

  selProducto.innerHTML = `<option value="">No usar producto guardado</option>`;

  filtrados.forEach(p => {
    selProducto.innerHTML += `
      <option value="${p.id}">
        ${obtenerNombreProducto(p)} — $${money(obtenerPrecioProducto(p))}
      </option>`;
  });

  if (filtrados.some(p => p.id === actual)) selProducto.value = actual;
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
        <td>${precioLabel}</td>
        <td>${i.cantidad}</td>
        <td>$${money(i.subtotal)}</td>
        <td>
          <button class="btn-pp" onclick="editarItem(${idx})">✏️</button>
          <button class="btn-pp btn-delete-pp" onclick="eliminarItem(${idx})">✖</button>
        </td>
      </tr>`;
  });

  spanTotal.textContent = money(obtenerTotalPedidoActual());
  renderResumenPagos();
}

function limpiarCargaItem() {
  inputProductoBuscar.value = "";
  selProducto.value = "";
  inputItemNombre.value = "";
  inputItemPrecio.value = "";
  inputCantidad.value = 1;
  selTipoPrecio.value = "UNITARIO";
  renderOpcionesProductos();
}

function agregarItemDesdeFormulario() {
  const nombre = inputItemNombre.value.trim();
  const cantidad = toNumber(inputCantidad.value);
  const precioIngresado = toNumber(inputItemPrecio.value);
  const tipoPrecio = selTipoPrecio.value;
  const prod = productos.find(p => p.id === selProducto.value);

  if (!nombre) return alert("Escribí el nombre del producto o trabajo.");
  if (cantidad <= 0) return alert("La cantidad debe ser mayor a 0.");
  if (precioIngresado < 0) return alert("El precio no puede ser negativo.");

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

  resumenPagos.textContent = `Pagado: $${money(pagado)} · Pendiente: $${money(pendiente)}`;
}

function tomarPagoDelFormulario() {
  const monto = toNumber(inputPagoMonto.value);
  if (monto <= 0) return null;

  return {
    monto,
    medio: selectPagoMedio.value || "OTRO",
    fecha: new Date().toISOString()
  };
}

inputPagoMonto?.addEventListener("input", () => {
  const temporal = tomarPagoDelFormulario();
  const original = [...pagosPedido];
  if (temporal) pagosPedido.push(temporal);
  renderResumenPagos();
  pagosPedido = original;
});

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

  pedidoEditandoId = null;
  btnGuardar.textContent = "Guardar pedido";

  limpiarCargaItem();
  actualizarEstadoCliente();
  renderPedido();
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
  if (!clienteNombre) return alert("Escribí el nombre del cliente.");
  if (!itemsPedido.length) return alert("Agregá al menos un producto o trabajo al pedido.");

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

    alert("Pedido actualizado ✔");
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

    alert("Pedido guardado ✔");
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
  limpiarCargaItem();
  actualizarEstadoCliente();
  renderPedido();

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
window.irAProduccion = pedidoId => {
  window.location.href = `produccion.html?pedido=${pedidoId}`;
};

/* =====================================================
   INIT
===================================================== */
(async function init() {
  inputFecha.value = new Date().toISOString().slice(0, 10);
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
