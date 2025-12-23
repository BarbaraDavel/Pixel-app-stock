// js/pedidos.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =========================
// DOM
// =========================

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

// Datos generales del pedido
const inputFecha  = document.getElementById("pedidoFecha");
const selectEstado = document.getElementById("pedidoEstado");
const inputNota   = document.getElementById("pedidoNota");
const inputPagado = document.getElementById("pedidoPagado");

// Lista pedidos
const listaPedidosBody = document.getElementById("listaPedidos");

// Filtros
const filtroEstado   = document.getElementById("filtroEstado");
const filtroBusqueda = document.getElementById("filtroBusqueda");

// Modal ver pedido
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

// Modal editar pedido
const modalEdit   = document.getElementById("editarPedidoModal");
const editEstado  = document.getElementById("editEstado");
const editNota    = document.getElementById("editNota");
const editFecha   = document.getElementById("editFecha");
const editPagado  = document.getElementById("editPagado");
const editGuardar = document.getElementById("editGuardar");
const editCerrar  = document.getElementById("editCerrar");

// =========================
// ESTADO
// =========================
let clientesPorNombre = {};
let productos = [];
let itemsPedido = [];
let pedidosCache = [];
let pedidoEditandoId = null;
let pedidoModalActual = null;

// =========================
// HELPERS
// =========================
function esEstadoFinal(estado) {
  return estado === "LISTO" || estado === "ENTREGADO";
}

function debeDescontarStock(p) {
  return !p.stockDescontado && (p.pagado || esEstadoFinal(p.estado));
}

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
      apodo: c.apodo || "",
      telefono: c.whatsapp || c.telefono || "",
      red: c.instagram || c.red || "",
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
    if (!inputClienteRed.value)      inputClienteRed.value      = c.red;
  }
}
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
    const precio = Number(p.precio || 0);
    selProducto.innerHTML += `<option value="${p.id}">${p.nombre} — $${precio}</option>`;
  });
}

// =========================
// RENDER ITEMS PEDIDO
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

// =========================
// AGREGAR ITEM
// =========================
btnAgregar.addEventListener("click", e => {
  e.preventDefault();

  const id   = selProducto.value;
  const cant = Number(inputCantidad.value);

  if (!id) return alert("Elegí un producto.");
  if (!cant || cant <= 0) return alert("Cantidad inválida.");

  const prod = productos.find(p => p.id === id);
  if (!prod) return alert("No se encontró el producto.");

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

// =========================
// LIMPIAR FORMULARIO
// =========================
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

// =========================
// RECETAS / STOCK
// =========================
async function obtenerRecetasDeProducto(productoId) {
  const snap = await getDocs(collection(db, "recetas"));
  const lista = [];

  snap.forEach(r => {
    const data = r.data();
    if (data.productoId === productoId) {
      lista.push({ id: r.id, ...data });
    }
  });

  return lista;
}

async function obtenerStockPorInsumo(insumoId) {
  const snap = await getDocs(collection(db, "stock"));
  let encontrado = null;

  snap.forEach(s => {
    const d = s.data();
    if (d.insumoId === insumoId) {
      encontrado = { id: s.id, ...d };
    }
  });

  return encontrado;
}

async function descontarStockPorPedido(pedido) {
  if (!pedido.items || !pedido.items.length) return;

  for (const item of pedido.items) {
    const recetasProd = await obtenerRecetasDeProducto(item.productoId);

    for (const r of recetasProd) {
      const cantUsadaPorUnidad = Number(r.cantidadUsada || 0);
      const totalUsado = cantUsadaPorUnidad * item.cantidad;

      const stockDoc = await obtenerStockPorInsumo(r.insumoId);
      if (!stockDoc) continue;

      const stockAnterior = Number(stockDoc.stockActual || 0);
      const stockNuevo = stockAnterior - totalUsado;

      await updateDoc(doc(db, "stock", stockDoc.id), {
        stockActual: stockNuevo
      });

      await addDoc(collection(db, "movimientos_stock"), {
        tipo: "VENTA",
        motivo: "Pedido",
        fecha: serverTimestamp(),
        pedidoId: pedido.id || null,
        clienteNombre: pedido.clienteNombre,
        productoId: item.productoId,
        productoNombre: item.nombre,
        insumoId: r.insumoId,
        cantidad: -totalUsado,
        stockAnterior,
        stockNuevo
      });
    }
  }
}

// =========================
// GUARDAR PEDIDO
// =========================
btnGuardar.addEventListener("click", async e => {
  e.preventDefault();

  const nombre   = inputClienteNombre.value.trim();
  const telefono = inputClienteTelefono.value.trim();
  const red      = inputClienteRed.value.trim();
  const nota     = inputNota.value.trim();
  const estado   = selectEstado.value;
  const fechaInput = inputFecha.value;
  const pagado   = inputPagado.checked;

  if (!nombre) return alert("Poné el nombre del cliente.");
  if (!itemsPedido.length) return alert("Agregá productos al pedido.");

  const total = itemsPedido.reduce((acc, i) => acc + i.subtotal, 0);
  const clienteInfo = clientesPorNombre[nombre] || null;

  const fechaIso =
    fechaInput === ""
      ? new Date().toISOString()
      : new Date(fechaInput + "T00:00:00").toISOString();

  const pedidoDoc = {
    clienteId: clienteInfo ? clienteInfo.id : null,
    clienteNombre: nombre,
    clienteApodo: clienteInfo ? clienteInfo.apodo : "",
    clienteTelefono: telefono || (clienteInfo ? clienteInfo.telefono : ""),
    clienteRed: red || (clienteInfo ? clienteInfo.red : ""),
    fecha: fechaIso,
    fechaServer: serverTimestamp(),
    estado,
    nota,
    pagado,
    total,
    stockDescontado: false,
    items: itemsPedido
  };

  try {
    const ref = await addDoc(collection(db, "pedidos"), pedidoDoc);
    const pedidoGuardado = { id: ref.id, ...pedidoDoc };

    if (debeDescontarStock(pedidoGuardado)) {
      await descontarStockPorPedido(pedidoGuardado);
      await updateDoc(doc(db, "pedidos", ref.id), { stockDescontado: true });
    }

    alert("Pedido guardado ✔");

    limpiarFormulario();
    await cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al guardar.");
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

          <td class="estado ${p.estado}">
            ${p.estado}
          </td>

          <td class="${p.pagado ? "pagado-si" : "pagado-no"}">
            ${p.pagado ? "✔ Pagado" : "✖ No pagado"}
          </td>

          <td>$${p.total}</td>

          <td class="td-actions">
            <button class="btn-pp" onclick="verPedido('${p.id}')">👁️ Ver</button>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp" onclick="duplicarPedido('${p.id}')">➕</button>
            <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
}

if (filtroEstado)   filtroEstado.addEventListener("change", renderLista);
if (filtroBusqueda) filtroBusqueda.addEventListener("input", renderLista);

// =========================
// MODAL VER
// =========================
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;

  const nombreMostrar = p.clienteApodo || p.clienteNombre;

  modalTitulo.textContent = `Pedido de ${nombreMostrar}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre} ${
    p.clienteApodo ? "(" + p.clienteApodo + ")" : ""
  } — Tel: ${p.clienteTelefono || "—"} — Contacto: ${
    p.clienteRed || "—"
  }`;

  modalEstado.textContent = `Estado: ${p.estado || "—"}`;
  modalFecha.textContent = p.fecha
    ? `Fecha: ${new Date(p.fecha).toLocaleString()}`
    : "Fecha: —";

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

// =========================
// PDF
// =========================
modalPdf.addEventListener("click", () => {
  if (!pedidoModalActual) return;

  const p = pedidoModalActual;
  const nombreMostrar = p.clienteApodo || p.clienteNombre;
  const fechaTxt = p.fecha
    ? new Date(p.fecha).toLocaleString()
    : "—";

  const html = `
    <div style="font-family: Poppins, Arial, sans-serif; padding:16px; max-width:480px;">
      <h2 style="margin-bottom:8px;">Pedido de ${nombreMostrar}</h2>
      <p><strong>Cliente:</strong> ${p.clienteNombre}</p>
      ${
        p.clienteApodo
          ? `<p><strong>Apodo:</strong> ${p.clienteApodo}</p>`
          : ""
      }
      <p><strong>Teléfono:</strong> ${p.clienteTelefono || "—"}</p>
      <p><strong>Contacto:</strong> ${p.clienteRed || "—"}</p>
      <p><strong>Fecha:</strong> ${fechaTxt}</p>

      <hr style="margin:12px 0;">

      <h3>Detalle</h3>
      ${
        p.items && p.items.length
          ? p.items
              .map(
                i => `<p>${i.cantidad}× ${i.nombre} — $${i.subtotal}</p>`
              )
              .join("")
          : "<p>Sin items</p>"
      }

      ${
        p.nota
          ? `<p style="margin-top:8px;"><strong>Nota:</strong> ${p.nota}</p>`
          : ""
      }

      <p style="margin-top:12px; font-size:1.05rem;">
        <strong>Total:</strong> $${p.total}
      </p>
    </div>
  `;

  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  const opt = {
    margin: 10,
    filename: `Pedido_${nombreMostrar}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  html2pdf().set(opt).from(tmp).save();
});

// =========================
// WHATSAPP
// =========================
modalWhats.addEventListener("click", () => {
  if (!pedidoModalActual) return;

  const p = pedidoModalActual;
  const nombreMostrar = p.clienteApodo || p.clienteNombre;
  const fechaTxt = p.fecha
    ? new Date(p.fecha).toLocaleDateString()
    : "—";

  const lineasItems =
    p.items && p.items.length
      ? p.items
          .map(i => `✨ ${i.cantidad}× *${i.nombre}* — $${i.subtotal}`)
          .join("\n")
      : "—";

  const msg = `¡Hola ${nombreMostrar}! 😊

🦊 *Pixel - Detalle de tu pedido*

${lineasItems}

💰 *Total:* $${p.total}
📅 *Fecha:* ${fechaTxt}

💳 *Forma de pago*
Podés abonar mediante transferencia:
👉 *Alias:* barbi.dLE

💜 Gracias por tu compra!
📸 Instagram: https://instagram.com/pixel.stickerss`;

  const numero = (p.clienteTelefono || "").replace(/[^0-9]/g, "");
  const url = numero
    ? `https://wa.me/549${numero}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
});

// =========================
// MODAL EDITAR
// =========================
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  editEstado.value = p.estado || "PENDIENTE";
  editNota.value   = p.nota || "";
  editFecha.value  = p.fecha
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

  const pAnterior = pedidosCache.find(x => x.id === pedidoEditandoId);
  if (!pAnterior) return;

  const nuevoEstado = editEstado.value;
  const nuevaNota   = editNota.value.trim();
  const nuevaFecha  = editFecha.value
    ? new Date(editFecha.value + "T00:00:00").toISOString()
    : pAnterior.fecha;
  const nuevoPagado = editPagado.checked;

  const pedidoActualizado = {
    ...pAnterior,
    estado: nuevoEstado,
    nota: nuevaNota,
    fecha: nuevaFecha,
    pagado: nuevoPagado
  };

  try {
    await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
      estado: nuevoEstado,
      nota: nuevaNota,
      fecha: nuevaFecha,
      pagado: nuevoPagado
    });

    if (debeDescontarStock(pedidoActualizado) && !pAnterior.stockDescontado) {
      await descontarStockPorPedido(pedidoActualizado);
      await updateDoc(doc(db, "pedidos", pedidoEditandoId), {
        stockDescontado: true
      });
    }

    alert("Cambios guardados ✔");
    modalEdit.classList.add("hidden");
    pedidoEditandoId = null;
    await cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al actualizar.");
  }
});

// =========================
// DUPLICAR PEDIDO
// =========================
window.duplicarPedido = async id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const nuevo = {
    ...p,
    fecha: new Date().toISOString(),
    fechaServer: serverTimestamp(),
    estado: "PENDIENTE",
    pagado: false,
    stockDescontado: false
  };

  delete nuevo.id;

  await addDoc(collection(db, "pedidos"), nuevo);

  alert("Pedido duplicado ✔");
  cargarPedidos();
};

// =========================
// BORRAR PEDIDO
// =========================
window.borrarPedido = async id => {
  if (!confirm("¿Eliminar este pedido?")) return;

  try {
    await deleteDoc(doc(db, "pedidos", id));
    alert("Pedido eliminado ✔");
    await cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("Error al eliminar pedido.");
  }
};

// =========================
// INICIO
// =========================
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();
