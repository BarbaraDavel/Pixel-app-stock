import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const insumoSelect = document.getElementById("movInsumoSelect");
const inputCantidad = document.getElementById("movCantidad");
const inputCostoUnitario = document.getElementById("movCostoUnitario");
const selectTipo = document.getElementById("movTipo");
const inputNota = document.getElementById("movNota");
const btnGuardar = document.getElementById("btnGuardarMov");

const movLista = document.getElementById("movLista");
const movTotalCompras = document.getElementById("movTotalCompras");

// modal venta
const movVentaModal = document.getElementById("movVentaModal");
const movVentaTitulo = document.getElementById("movVentaTitulo");
const movVentaBody = document.getElementById("movVentaBody");
const movVentaCerrar = document.getElementById("movVentaCerrar");

let insumosCache = {};       // id -> { nombre, costoUnitario }
let stockCache = {};         // insumoId -> { stockDocId, stockActual }

// ================== CARGA INSUMOS & STOCK ==================

async function cargarInsumos() {
  insumoSelect.innerHTML = `<option value="">Seleccionar insumo…</option>`;
  insumosCache = {};

  const snap = await getDocs(collection(db, "insumos"));
  snap.forEach(d => {
    const data = d.data();
    insumosCache[d.id] = data;
    insumoSelect.innerHTML += `<option value="${d.id}">${data.nombre}</option>`;
  });
}

async function cargarStock() {
  stockCache = {};
  const snap = await getDocs(collection(db, "stock"));
  snap.forEach(d => {
    const data = d.data();
    stockCache[data.insumoId] = {
      stockDocId: d.id,
      stockActual: data.stockActual ?? 0
    };
  });
}

// ================== LISTADO DE MOVIMIENTOS ==================

async function cargarMovimientos() {
  movLista.innerHTML = "";
  let totalCompras = 0;

  const snap = await getDocs(collection(db, "movimientos_stock"));
  snap.forEach(d => {
    const m = d.data();
    const fecha = m.fecha ? new Date(m.fecha).toLocaleString("es-AR") : "—";

    let detalle = "";
    let cantidad = "";
    let costoTotal = m.costoTotal ?? "";

    if (m.tipo === "VENTA") {
      // movimiento generado automáticamente por venta
      detalle = `Venta a ${m.clienteNombre || "—"}`;
      cantidad = "";
    } else {
      // COMPRA / AJUSTE
      detalle = m.insumoNombre || "—";
      cantidad = m.cantidad || 0;
      if (m.tipo === "COMPRA") {
        totalCompras += Number(costoTotal) || 0;
      }
    }

    movLista.innerHTML += `
      <tr>
        <td>${m.tipo}</td>
        <td>${detalle}</td>
        <td>${cantidad}</td>
        <td>${costoTotal ? "$" + costoTotal : "—"}</td>
        <td>${fecha}</td>
        <td>${m.nota || ""}</td>
        <td>
          ${m.ventaId ? `<button class="btn btn-sm btn-outline" onclick="verVentaMov('${m.ventaId}')">Ver</button>` : ""}
        </td>
      </tr>
    `;
  });

  movTotalCompras.textContent = `$${totalCompras}`;
}

// ================== NUEVO MOVIMIENTO MANUAL ==================

btnGuardar.onclick = async () => {
  const insumoId = insumoSelect.value;
  const cantidad = Number(inputCantidad.value) || 0;
  const costoUnitario = Number(inputCostoUnitario.value) || 0;
  const tipo = selectTipo.value;
  const nota = inputNota.value.trim();

  if (!insumoId) {
    alert("Elegí un insumo");
    return;
  }
  if (cantidad <= 0) {
    alert("La cantidad debe ser mayor a 0");
    return;
  }

  const insumo = insumosCache[insumoId];
  const costoTotal = costoUnitario * cantidad;

  // registrar movimiento
  await addDoc(collection(db, "movimientos_stock"), {
    tipo,
    insumoId,
    insumoNombre: insumo?.nombre || "",
    cantidad,
    costoUnitario,
    costoTotal,
    fecha: new Date().toISOString(),
    nota
  });

  // actualizar stock
  await cargarStock(); // recargar por seguridad
  const infoStock = stockCache[insumoId];
  if (infoStock) {
    const ref = doc(db, "stock", infoStock.stockDocId);
    let nuevoStock = infoStock.stockActual;

    if (tipo === "COMPRA") {
      nuevoStock += cantidad;
    } else if (tipo === "AJUSTE") {
      nuevoStock = Math.max(0, infoStock.stockActual - cantidad);
    }

    await updateDoc(ref, { stockActual: nuevoStock });
  }

  inputCantidad.value = "";
  inputCostoUnitario.value = "";
  inputNota.value = "";
  insumoSelect.value = "";

  await cargarMovimientos();
  await cargarStock();
};

// ================== VER VENTA DESDE MOVIMIENTOS ==================

window.verVentaMov = async function(ventaId) {
  const ref = doc(db, "ventas", ventaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("No se encontró la venta asociada");
    return;
  }

  const v = snap.data();
  const fechaTxt = v.fecha ? new Date(v.fecha).toLocaleString("es-AR") : "—";

  movVentaTitulo.textContent = `Venta a ${v.clienteNombre || "—"}`;
  movVentaBody.innerHTML = `
    <p><strong>Fecha:</strong> ${fechaTxt}</p>
    <p><strong>Teléfono:</strong> ${v.clienteTelefono || "—"}</p>
    <p><strong>Medio de pago:</strong> ${v.metodoPago || "—"}</p>
    <p><strong>Nota:</strong> ${v.nota || "—"}</p>
    <hr style="margin:0.5rem 0; border:none; border-top:1px solid #eee;">
    <p><strong>Detalle:</strong></p>
  `;

  if (v.items && Array.isArray(v.items) && v.items.length > 0) {
    v.items.forEach(it => {
      movVentaBody.innerHTML += `
        <p>${it.cantidad}× ${it.nombre} — $${it.subtotal}</p>
      `;
    });
  } else {
    movVentaBody.innerHTML += `<p>${v.nombre || "(sin detalle)"}</p>`;
  }

  movVentaBody.innerHTML += `
    <hr style="margin:0.5rem 0; border:none; border-top:1px solid #eee;">
    <p><strong>Total: $${v.total ?? v.precio ?? 0}</strong></p>
  `;

  movVentaModal.classList.remove("hidden");
};

movVentaCerrar.onclick = () => movVentaModal.classList.add("hidden");
movVentaModal.addEventListener("click", (e) => {
  if (e.target === movVentaModal) movVentaModal.classList.add("hidden");
});

// ================== INIT ==================

(async () => {
  await cargarInsumos();
  await cargarStock();
  await cargarMovimientos();
})();
