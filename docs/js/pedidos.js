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
const inputClienteApodo    = document.getElementById("clienteApodo");
const inputClienteTelefono = document.getElementById("clienteTelefono");
const inputClienteRed      = document.getElementById("clienteRed");
const datalistClientes     = document.getElementById("clientesDatalist");

// Productos / items
const inputProductoBuscar = document.getElementById("productoBuscar");
const selProducto         = document.getElementById("productoSelect");
const inputCantidad       = document.getElementById("cantidadInput");
const tbodyItems          = document.getElementById("pedidoItems");
const spanTotal           = document.getElementById("totalPedido");

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
const filtroEstado     = document.getElementById("filtroEstado");
const filtroBusqueda   = document.getElementById("filtroBusqueda");

// Modal ver
const modal          = document.getElementById("pedidoModal");
const modalTitulo    = document.getElementById("modalTitulo");
const modalCliente   = document.getElementById("modalCliente");
const modalEstado    = document.getElementById("modalEstado");
const modalFecha     = document.getElementById("modalFecha");
const modalItems     = document.getElementById("modalItems");
const modalNota      = document.getElementById("modalNota");
const modalTotal     = document.getElementById("modalTotal");
const modalPdf       = document.getElementById("modalPdf");
const modalWhats     = document.getElementById("modalWhatsApp");
const modalCerrar    = document.getElementById("modalCerrar");
const modalHistorial = document.getElementById("modalHistorial");

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
  PENDIENTE: 1,
  PROCESO: 2,
  LISTO: 3,
  ENTREGADO: 4
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
  if (p.estado !== "ENTREGADO" && p.pagado) return 2;
  if (p.estado === "ENTREGADO" && !p.pagado) return 3;
  return 4;
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
  return Number(p?.precio || p?.valor || p?.importe || 0);
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

  if (inputClienteApodo && c.apodo && !inputClienteApodo.value) {
    inputClienteApodo.value = c.apodo;
  }
}

inputClienteNombre?.addEventListener("change", syncClienteDesdeNombre);
inputClienteNombre?.addEventListener("blur", syncClienteDesdeNombre);

/* =====================================================
   PRODUCTOS
===================================================== */
function renderOpcionesProductos(textoBusqueda = "") {
  if (!selProducto) return;

  const texto = normalizarTexto(textoBusqueda);
  const valorActual = selProducto.value;

  let productosFiltrados = productos;

  if (texto) {
    productosFiltrados = productos.filter(p => {
      const nombre = normalizarTexto(obtenerNombreProducto(p));
      return nombre.includes(texto);
    });
  }

  console.log("BUSQUEDA PRODUCTO:", textoBusqueda);
  console.log("PRODUCTOS FILTRADOS:", productosFiltrados);

  selProducto.innerHTML = `<option value="">Elegí un producto...</option>`;

  productosFiltrados.forEach(p => {
    const nombre = obtenerNombreProducto(p);
    const precio = obtenerPrecioProducto(p);

    selProducto.innerHTML += `
      <option value="${p.id}">
        ${nombre} — $${precio}
      </option>
    `;
  });

  if (productosFiltrados.length === 1) {
    selProducto.value = productosFiltrados[0].id;
  } else {
    const sigueExistiendo = productosFiltrados.some(p => p.id === valorActual);
    if (sigueExistiendo) {
      selProducto.value = valorActual;
    }
  }
}

async function cargarProductos() {
  if (!selProducto) return;

  selProducto.innerHTML = `<option value="">Cargando...</option>`;
  productos = [];

  const snap = await getDocs(collection(db, "productos"));

  console.log("DOCS PRODUCTOS:", snap.size);

  snap.forEach(d => {
    const data = d.data();
    console.log("PRODUCTO FIREBASE:", d.id, data);

    productos.push({
      id: d.id,
      ...data
    });
  });

  console.log("ARRAY FINAL PRODUCTOS:", productos);

  productos.sort((a, b) =>
    obtenerNombreProducto(a).localeCompare(obtenerNombreProducto(b), "es", {
      sensitivity: "base"
    })
  );

  renderOpcionesProductos("");
}

if (inputProductoBuscar) {
  inputProductoBuscar.addEventListener("input", () => {
    renderOpcionesProductos(inputProductoBuscar.value);
  });
}

/* =====================================================
   ITEMS PEDIDO
===================================================== */
function renderPedido() {
  if (!tbodyItems || !spanTotal) return;

  tbodyItems.innerHTML = "";
  let total = 0;

  itemsPedido.forEach((i, idx) => {
    total += Number(i.subtotal || 0);

    tbodyItems.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>$${i.precio}</td>
        <td>${i.cantidad}</td>
        <td>$${i.subtotal}</td>
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

btnAgregar?.addEventListener("click", e => {
  e.preventDefault();

  const prod = productos.find(p => p.id === selProducto.value);
  const cant = Number(inputCantidad.value);

  if (!prod || cant <= 0) {
    return alert("Producto o cantidad inválida");
  }

  const nombre = obtenerNombreProducto(prod);
  const precio = obtenerPrecioProducto(prod);

  itemsPedido.push({
    productoId: prod.id,
    nombre,
    precio,
    cantidad: cant,
    subtotal: cant * precio
  });

  renderPedido();

  inputCantidad.value = 1;
  if (inputProductoBuscar) inputProductoBuscar.value = "";
  renderOpcionesProductos("");
  selProducto.value = "";
});

/* =====================================================
   FORM
===================================================== */
function limpiarFormulario() {
  itemsPedido = [];
  renderPedido();

  if (inputClienteNombre) inputClienteNombre.value = "";
  if (inputClienteTelefono) inputClienteTelefono.value = "";
  if (inputClienteRed) inputClienteRed.value = "";
  if (inputNota) inputNota.value = "";
  if (inputCantidad) inputCantidad.value = 1;
  if (inputFecha) inputFecha.value = "";
  if (inputPagado) inputPagado.checked = false;
  if (selectEstado) selectEstado.value = "PENDIENTE";

  pedidoEditandoId = null;
  if (btnGuardar) btnGuardar.textContent = "Guardar pedido";

  if (inputProductoBuscar) inputProductoBuscar.value = "";
  renderOpcionesProductos("");
  if (selProducto) selProducto.value = "";
}

btnLimpiar?.addEventListener("click", e => {
  e.preventDefault();
  limpiarFormulario();
});

/* =====================================================
   GUARDAR / EDITAR PEDIDO + HISTORIAL
===================================================== */
btnGuardar?.addEventListener("click", async e => {
  e.preventDefault();

  if (!inputClienteNombre.value || !itemsPedido.length) {
    return alert("Faltan datos");
  }

  const total = itemsPedido.reduce((a, i) => a + Number(i.subtotal || 0), 0);
  const fechaIso = inputFecha.value
    ? new Date(inputFecha.value + "T00:00:00").toISOString()
    : new Date().toISOString();

  const baseData = {
    clienteNombre: inputClienteNombre.value.trim(),
    clienteApodo: inputClienteApodo?.value?.trim() || "",
    clienteTelefono: inputClienteTelefono?.value || "",
    clienteRed: inputClienteRed?.value || "",
    fecha: fechaIso,
    estado: selectEstado?.value || "PENDIENTE",
    nota: inputNota?.value || "",
    pagado: inputPagado?.checked || false,
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
      historial: [
        {
          fecha: new Date().toISOString(),
          accion: "CREADO",
          estado: baseData.estado,
          pagado: baseData.pagado,
          total: baseData.total
        }
      ]
    });

    alert("Pedido guardado ✔");
  }

  limpiarFormulario();
  await cargarClientes();
  await cargarPedidos();
});

/* =====================================================
   LISTA PEDIDOS
===================================================== */
async function cargarPedidos() {
  pedidosCache = [];
  if (listaPedidosBody) listaPedidosBody.innerHTML = "";

  const snap = await getDocs(collection(db, "pedidos"));
  snap.forEach(d => pedidosCache.push({ id: d.id, ...d.data() }));

  pedidosCache.sort((a, b) => {
    if (a.pagado !== b.pagado) {
      return a.pagado ? 1 : -1;
    }

    const ea = ordenEstados[a.estado] || 99;
    const eb = ordenEstados[b.estado] || 99;

    if (ea !== eb) {
      return ea - eb;
    }

    return 0;
  });

  renderLista();
}

function renderLista() {
  if (!listaPedidosBody) return;

  const est = filtroEstado?.value || "";
  const txt = normalizarTexto(filtroBusqueda?.value || "");

  listaPedidosBody.innerHTML = "";

  pedidosCache
    .filter(p =>
      (!est || p.estado === est) &&
      (!txt || normalizarTexto(p.clienteNombre || "").includes(txt))
    )
    .forEach(p => {
      let fila = "tr-ok";

      if (p.estado === "PENDIENTE") fila = "tr-urgente";
      else if (p.estado === "PROCESO") fila = "tr-atencion";
      else if (p.estado === "LISTO") fila = "tr-listo";
      else if (p.estado === "ENTREGADO") fila = "tr-ok";

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
          <td><span class="badge badge-${String(p.estado).toLowerCase()}">${p.estado}</span></td>
          <td
            onclick="togglePagado('${p.id}')"
            style="cursor:pointer;"
            title="Cambiar estado de pago"
          >
            ${
              p.pagado
                ? `<span class="badge badge-pagado">Pagado</span>`
                : `<span class="badge badge-nopagado">No pagado</span>`
            }
          </td>
          <td>$${p.total}</td>
          <td>
            <button class="btn-pp" onclick="editarPedido('${p.id}')">✏️</button>
            <button class="btn-pp btn-delete-pp" onclick="borrarPedido('${p.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
}

filtroEstado?.addEventListener("change", renderLista);
filtroBusqueda?.addEventListener("input", renderLista);

/* =====================================================
   MODAL VER + WHATSAPP
===================================================== */
window.verPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoModalActual = p;

  modalTitulo.textContent = `Pedido de ${p.clienteNombre}`;
  modalCliente.textContent = `Cliente: ${p.clienteNombre}`;
  modalEstado.textContent = `Estado: ${p.estado}`;
  modalFecha.textContent = `Fecha: ${new Date(p.fecha).toLocaleString()}`;
  modalItems.innerHTML = (p.items || [])
    .map(i => `• ${i.cantidad}× ${i.nombre} ($${i.subtotal})`)
    .join("<br>");
  modalNota.textContent = p.nota || "";
  modalTotal.textContent = `Total: $${p.total}`;

  if (p.historial && p.historial.length) {
    modalHistorial.innerHTML = `
      <strong>🕓 Historial</strong><br>
      ${p.historial
        .map(h => `• ${new Date(h.fecha).toLocaleString()} – ${traducirAccion(h.accion)}`)
        .join("<br>")}
    `;
  } else {
    modalHistorial.innerHTML = "";
  }

  modal.classList.remove("hidden");
};

if (modalCerrar) {
  modalCerrar.onclick = () => modal.classList.add("hidden");
}

if (modalWhats) {
  modalWhats.onclick = () => {
    if (!pedidoModalActual) return;

    const p = pedidoModalActual;
    const telefono = (p.clienteTelefono || "").replace(/\D/g, "");

    const items = (p.items || [])
      .map(i => `• ${i.cantidad} x ${i.nombre} ($${i.subtotal})`)
      .join("\n");

    const mensaje = `
Hola ${p.clienteApodo || p.clienteNombre} 👋

Te paso el detalle de tu pedido:

${items}

💰 Total: $${p.total}
📦 Estado: ${p.estado}

💳 Podés pagar por transferencia al alias (cuenta de astropay a nombre de Barbara Davel):
👉 barbi-d
📸 Enviame el comprobante cuando puedas

✨ Si te gustó tu pedido, podés ver más diseños y novedades en nuestro Instagram:
👉 https://www.instagram.com/pixel.stickerss/

Gracias 🤍 Pixel
`.trim();

    const url = telefono
      ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  };
}

/* =====================================================
   EDITAR DESDE LISTA
===================================================== */
window.editarPedido = id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  pedidoEditandoId = id;

  if (inputClienteNombre) inputClienteNombre.value = p.clienteNombre || "";
  if (inputClienteTelefono) inputClienteTelefono.value = p.clienteTelefono || "";
  if (inputClienteRed) inputClienteRed.value = p.clienteRed || "";
  if (inputFecha) inputFecha.value = (p.fecha || "").slice(0, 10);
  if (selectEstado) selectEstado.value = p.estado || "PENDIENTE";
  if (inputNota) inputNota.value = p.nota || "";
  if (inputPagado) inputPagado.checked = !!p.pagado;

  itemsPedido = (p.items || []).map(i => ({ ...i }));
  renderPedido();

  if (inputProductoBuscar) inputProductoBuscar.value = "";
  renderOpcionesProductos("");
  if (selProducto) selProducto.value = "";

  if (btnGuardar) btnGuardar.textContent = "Guardar cambios";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* =====================================================
   BORRAR / PAGADO
===================================================== */
window.borrarPedido = async id => {
  if (!confirm("¿Eliminar pedido?")) return;
  await deleteDoc(doc(db, "pedidos", id));
  await cargarPedidos();
};

window.togglePagado = async id => {
  const p = pedidosCache.find(x => x.id === id);
  if (!p) return;

  const nuevoEstado = !p.pagado;

  const mensaje = nuevoEstado
    ? "¿Marcar este pedido como PAGADO?"
    : "¿Marcar este pedido como NO PAGADO?";

  if (!confirm(mensaje)) return;

  const nuevoHistorial = [
    ...(p.historial || []),
    {
      fecha: new Date().toISOString(),
      accion: nuevoEstado ? "PAGADO" : "NO_PAGADO"
    }
  ];

  try {
    await updateDoc(doc(db, "pedidos", id), {
      pagado: nuevoEstado,
      historial: nuevoHistorial
    });

    await cargarPedidos();
  } catch (err) {
    console.error(err);
    alert("No se pudo cambiar el estado de pago.");
  }
};

/* =====================================================
   UTILS
===================================================== */
function traducirAccion(accion) {
  switch (accion) {
    case "CREADO":
      return "Pedido creado";
    case "EDITADO":
      return "Pedido editado";
    case "PAGADO":
      return "Marcado como pagado";
    case "NO_PAGADO":
      return "Marcado como no pagado";
    default:
      return accion;
  }
}

// 👉 Exponer pedidos para otros módulos
window.getPedidosCache = function () {
  return pedidosCache || [];
};

window.irAProduccion = function(pedidoId) {
  window.location.href = `produccion.html?pedido=${pedidoId}`;
};

/* =====================================================
   INIT
===================================================== */
(async function init() {
  await cargarClientes();
  await cargarProductos();
  await cargarPedidos();
  renderPedido();
})();