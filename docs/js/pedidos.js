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
const inputClienteApodo = document.getElementById("clienteApodo");
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
const resumenPendientesEl = document.getElementById("resumenPendientes");
const resumenListosEl = document.getElementById("resumenListos");

// Resumen simple
const resumenActivosEl  = document.getElementById("resumenActivos");
const resumenNoPagadoEl = document.getElementById("resumenNoPagado");

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
const modalHistorial = document.getElementById("modalHistorial");

// ✅ nuevo botón pago en modal
const modalPago = document.getElementById("modalPago");

// Modal editar chico
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

const ordenEstados = {
  "PENDIENTE": 1,
  "PROCESO": 2,
  "LISTO": 3,
  "ENTREGADO": 4
};

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

// ✅ pagos parciales
function getPagos(p) {
  return Array.isArray(p?.pagos) ? p.pagos : [];
}

function calcTotalPagado(p) {
  return getPagos(p).reduce((acc, x) => acc + Number(x?.monto || 0), 0);
}

function calcSaldo(p) {
  const total = Number(p?.total || 0);
  return total - calcTotalPagado(p);
}

function money(n) {
  // simple: sin símbolos raros para que quede parecido a lo tuyo
  return String(Math.round(Number(n || 0)));
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
      red: c.instagram || c.red || "",
      apodo: c.apodo || ""
    };
    datalistClientes.innerHTML += `<option value="${c.nombre}"></option>`;
  });
}

function syncClienteDesdeNombre() {
  const c = clientesPorNombre[inputClienteNombre.value.trim()];
  if (!c) return;

  if (!inputClienteTelefono.value) inputClienteTelefono.value = c.telefono;
  if (!inputClienteRed.value) inputClienteRed.value = c.red;

  // 🆕 autocompletar apodo si existe el input
  if (inputClienteApodo && c.apodo && !inputClienteApodo.value) {
    inputClienteApodo.value = c.apodo;
  }
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

  productos.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;
  productos.forEach(p => {
    selProducto.innerHTML += `
      <option value="${p.id}">
        ${p.nombre} — $${Number(p.precio || 0)}
      </option>
    `;
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
  if (inputClienteApodo) inputClienteApodo.value = "";
  inputNota.value = "";
  inputCantidad.value = 1;
  selProducto.value = "";
  inputFecha.value = "";
  inputPagado.checked = false;
  selectEstado.value = "PENDIENTE";
  pedidoEditandoId = null;
  btnGuardar.textContent = "Guardar pedido";
}

btnLimpiar.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   GUARDAR / EDITAR PEDIDO + HISTORIAL
===================================================== */
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length)
    return alert("Faltan datos");

  const total = itemsPedido.reduce((a, i) => a + i.subtotal, 0);
  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const baseData = {
    clienteNombre: inputClienteNombre.value.trim(),
    clienteApodo: inputClienteApodo?.value?.trim() || "",
    clienteTelefono: inputClienteTelefono.value,
    clienteRed: inputClienteRed.value,
    fecha: fechaIso,
    estado: selectEstado.value,
    nota: inputNota.value,
    pagado: inputPagado.checked, // (si después hay pagos parciales, se recalcula igual)
    total,
    items: itemsPedido
  };

  if (pedidoEditandoId) {
    const p = pedidosCache.find(x => x.id === pedidoEditandoId);
    if (p?.estado === "ENTREGADO") {
      if (!confirm("Este pedido está ENTREGADO. ¿Querés modificarlo igual?")) {
        return;
      }
    }

    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      ...baseData,
      historial: [
        ...(p?.historial || []),
        {
          fecha: new Date().toISOString(),
          accion: "EDITADO",
          estado: baseData.estado,
          pagado: baseData.pagado,
          total: baseData.total
        }
      ]
    });

    alert("Pedido actualizado ✔");
  } else {
    await addDoc(collection(db, "pedidos"), {
      ...baseData,
      fechaServer: serverTimestamp(),
      stockDescontado: false,
      pagos: [], // ✅ por default
      historial: [{
        fecha: new Date().toISOString(),
        accion: "CREADO",
        estado: baseData.estado,
        pagado: baseData.pagado,
        total: baseData.total
      }]
    });

    alert("Pedido guardado ✔");
  }

  limpiarFormulario();
  await cargarClientes();
  await cargarPedidos();
});

/* =====================================================
   PAGOS PARCIALES
===================================================== */
window.registrarPago = async (id) => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const raw = prompt("Ingresá el monto del pago (solo número):");
  if (raw === null) return;

  const monto = Number(String(raw).replace(",", "."));
  if (!monto || isNaN(monto) || monto <= 0) {
    alert("Monto inválido.");
    return;
  }

  const pagos = getPagos(p);
  pagos.push({
    fecha: new Date().toISOString(),
    monto: monto
  });

  const totalPagado = pagos.reduce((acc, x) => acc + Number(x.monto || 0), 0);
  const total = Number(p.total || 0);
  const saldo = total - totalPagado;

  // ✅ si se completó, queda pagado
  const pagado = saldo <= 0;

  const nuevoHistorial = [
    ...(p.historial || []),
    {
      fecha: new Date().toISOString(),
      accion: "PAGO_PARCIAL",
      monto: monto
    }
  ];

  try {
    await updateDoc(doc(db, "pedidos", id), {
      pagos,
      pagado,
      historial: nuevoHistorial
    });

    await cargarPedidos();

    // Si tenías el modal abierto, refrescamos el modal con los datos nuevos
    if (pedidoModalActual?.id === id) {
      window.verPedido(id);
    }
  } catch (err) {
    console.error(err);
    alert("No se pudo registrar el pago.");
  }
};

/* =====================================================
   LISTA PEDIDOS
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  // ✅ recalcular pagado en memoria (por si hay pedidos viejos con pagos)
  pedidosCache = pedidosCache.map(p => {
    const pagos = getPagos(p);
    if (!pagos.length) return p;
    const saldo = calcSaldo(p);
    return { ...p, pagado: saldo <= 0 };
  });

  pedidosCache.sort((a, b) => {
    // 1️⃣ saldo mayor a 0 primero (no terminados)
    const sa = calcSaldo(a);
    const sb = calcSaldo(b);
    const aOk = sa <= 0;
    const bOk = sb <= 0;
    if (aOk !== bOk) return aOk ? 1 : -1;

    // 2️⃣ Orden por estado
    const ea = ordenEstados[a.estado] || 99;
    const eb = ordenEstados[b.estado] || 99;
    if (ea !== eb) return ea - eb;

    return 0;
  });

  renderLista();
  renderResumenSimple();
}

function renderLista() {
  const est = filtroEstado.value;
  const txt = filtroBusqueda.value.toLowerCase();

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p =>
      (!est || p.estado === est) &&
      (!txt || (p.clienteNombre || "").toLowerCase().includes(txt))
    )
    .forEach(p => {
      let fila = "tr-ok";

      if (p.estado === "PENDIENTE") fila = "tr-urgente";
      else if (p.estado === "PROCESO") fila = "tr-atencion";
      else if (p.estado === "LISTO") fila = "tr-listo";
      else if (p.estado === "ENTREGADO") fila = "tr-ok";

      const totalPagado = calcTotalPagado(p);
      const saldo = calcSaldo(p);

      let badgePago = "";
      if (saldo <= 0) {
        badgePago = `<span class="badge badge-pagado">Pagado</span>`;
      } else if (totalPagado > 0) {
        // parcial
        badgePago = `<span class="badge badge-nopagado">Parcial</span>
          <div style="font-size:0.82rem; opacity:.85;">
            $${money(totalPagado)} / Saldo $${money(saldo)}
          </div>`;
      } else {
        badgePago = `<span class="badge badge-nopagado">No pagado</span>`;
      }

      listaPedidosBody.innerHTML += `
        <tr class="${fila}">
          <td
            class="cliente-click"
            onclick="verPedido('${p.id}')"
            style="cursor:pointer;"
            title="Ver pedido"
          >
            ${p.clienteNombre}
          </td>
          <td>${new Date(p.fecha).toLocaleDateString()}</td>
          <td><span class="badge badge-${String(p.estado || "").toLowerCase()}">${p.estado}</span></td>

          <td
            style="cursor:pointer;"
            title="Registrar pago / ver detalle"
            onclick="verPedido('${p.id}')"
          >
            ${badgePago}
          </td>

          <td>$${money(p.total)}</td>
          <td>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp" onclick="registrarPago('${p.id}')" title="Registrar pago">💰</button>
            <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>`;
    });
}

filtroEstado.addEventListener("change", renderLista);
filtroBusqueda.addEventListener("input", renderLista);

/* =====================================================
   MODAL VER + WHATSAPP
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;

  const totalPagado = calcTotalPagado(p);
  const saldo = calcSaldo(p);

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalItems.innerHTML = (p.items || [])
    .map(i => `• ${i.cantidad}× ${i.nombre} ($${money(i.subtotal)})`)
    .join("<br>");
  modalNota.textContent = p.nota || "";

  // ✅ total + pagado + saldo
  modalTotal.innerHTML = `
    <div><strong>Total:</strong> $${money(p.total)}</div>
    <div><strong>Pagado:</strong> $${money(totalPagado)}</div>
    <div><strong>Saldo:</strong> $${money(Math.max(0, saldo))}</div>
  `;

  // 🕓 HISTORIAL + pagos
  const pagos = getPagos(p);
  const pagosHtml = pagos.length
    ? `
      <div style="margin-top:0.6rem;">
        <strong>💰 Pagos</strong><br>
        ${pagos
          .map(pg => `• ${new Date(pg.fecha).toLocaleString()} – $${money(pg.monto)}`)
          .join("<br>")}
      </div>
    `
    : "";

  const historialHtml = (p.historial && p.historial.length)
    ? `
      <div style="margin-top:0.6rem;">
        <strong>🕓 Historial</strong><br>
        ${p.historial
          .map(h => `• ${new Date(h.fecha).toLocaleString()} – ${traducirAccion(h)}`)
          .join("<br>")}
      </div>
    `
    : "";

  modalHistorial.innerHTML = `${pagosHtml}${historialHtml}`.trim();

  modal.classList.remove("hidden");
};

modalCerrar.onclick = () => modal.classList.add("hidden");

// ✅ botón pago dentro del modal
if (modalPago) {
  modalPago.onclick = () => {
    if (!pedidoModalActual) return;
    window.registrarPago(pedidoModalActual.id);
  };
}

modalWhats.onclick = () => {
  if (!pedidoModalActual) return;

  const p = pedidoModalActual;
  const telefono = (p.clienteTelefono || "").replace(/\D/g, "");

  const items = (p.items || [])
    .map(i => `• ${i.cantidad} x ${i.nombre} ($${money(i.subtotal)})`)
    .join("\n");

  const totalPagado = calcTotalPagado(p);
  const saldo = calcSaldo(p);

  const mensaje = `
Hola ${p.clienteApodo || p.clienteNombre} 👋
Te paso el detalle del pedido:

${items}

💰 Total: $${money(p.total)}
💵 Pagado: $${money(totalPagado)}
⏳ Saldo: $${money(Math.max(0, saldo))}
📦 Estado: ${p.estado}

✨Si te gustó tu pedido, podés ver más diseños
y novedades en nuestro Instagram:
👉 https://www.instagram.com/pixel.stickerss/

Gracias 🤍 Pixel
`.trim();

  const url = telefono
    ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
};

/* =====================================================
   EDITAR DESDE LISTA (formulario grande)
===================================================== */
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  inputClienteNombre.value = p.clienteNombre;
  inputClienteTelefono.value = p.clienteTelefono || "";
  inputClienteRed.value = p.clienteRed || "";
  if (inputClienteApodo) inputClienteApodo.value = p.clienteApodo || "";
  inputFecha.value = (p.fecha || "").slice(0, 10);
  selectEstado.value = p.estado;
  inputNota.value = p.nota || "";

  // ✅ si tiene pagos, el checkbox “pagado” refleja saldo
  inputPagado.checked = calcSaldo(p) <= 0 ? true : !!p.pagado;

  itemsPedido = (p.items || []).map(i => ({ ...i }));
  renderPedido();

  btnGuardar.textContent = "Guardar cambios";
  window.scrollTo({ top: 0, behavior: "smooth" });
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
   INIT
===================================================== */
(async function init(){
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();

function renderResumenSimple() {
  let activos = 0;
  let noPagado = 0;

  pedidosCache.forEach(p => {
    // 📦 NO entregados
    if (p.estado !== "ENTREGADO") {
      activos++;
    }

    // 💰 saldo pendiente (si hay pagos parciales, descuenta)
    const saldo = calcSaldo(p);
    if (saldo > 0) {
      noPagado += saldo;
    }
  });

  if (resumenActivosEl) resumenActivosEl.textContent = activos;
  if (resumenNoPagadoEl) resumenNoPagadoEl.textContent = money(noPagado);

  // (estos si existen en algún momento)
  if (resumenPendientesEl || resumenListosEl) {
    let pendientes = 0;
    let listos = 0;
    pedidosCache.forEach(p => {
      if (p.estado === "PENDIENTE" || p.estado === "PROCESO") pendientes++;
      if (p.estado === "LISTO") listos++;
    });
    if (resumenPendientesEl) resumenPendientesEl.textContent = pendientes;
    if (resumenListosEl) resumenListosEl.textContent = listos;
  }
}

function traducirAccion(h) {
  const accion = typeof h === "string" ? h : h?.accion;

  switch (accion) {
    case "CREADO":
      return "Pedido creado";
    case "EDITADO":
      return "Pedido editado";
    case "PAGADO":
      return "Marcado como pagado";
    case "NO_PAGADO":
      return "Marcado como no pagado";
    case "PAGO_PARCIAL":
      return `Pago registrado ($${money(h?.monto)})`;
    default:
      return accion || "";
  }
}

// 👉 Exponer pedidos para otros módulos (calendario)
window.getPedidosCache = function () {
  return pedidosCache || [];
};
window.irAProduccion = function(pedidoId) {
  window.location.href = `produccion.html?pedido=${pedidoId}`;
};
