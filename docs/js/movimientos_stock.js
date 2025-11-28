import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const insumoSelect = document.getElementById("movInsumoSelect");
const inputCantidad = document.getElementById("movCantidad");
const inputCostoUnitario = document.getElementById("movCostoUnitario");
const selectTipo = document.getElementById("movTipo");
const inputNota = document.getElementById("movNota");
const btnGuardar = document.getElementById("btnGuardarMov");

const movLista = document.getElementById("movLista");
const movTotalCompras = document.getElementById("movTotalCompras");

let insumosCache = {};       // id -> { nombre }
let stockCache = {};         // insumoId -> { stockDocId, stockActual }

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

async function cargarMovimientos() {
  movLista.innerHTML = "";
  let totalCompras = 0;

  const snap = await getDocs(collection(db, "movimientos_stock"));
  snap.forEach(d => {
    const m = d.data();
    const fecha = m.fecha ? new Date(m.fecha).toLocaleString("es-AR") : "—";
    const costoTotal = m.costoTotal ?? 0;
    if (m.tipo === "COMPRA") totalCompras += Number(costoTotal) || 0;

    movLista.innerHTML += `
      <tr>
        <td>${m.tipo}</td>
        <td>${m.insumoNombre || "—"}</td>
        <td>${m.cantidad || 0}</td>
        <td>$${costoTotal}</td>
        <td>${fecha}</td>
        <td>${m.nota || ""}</td>
      </tr>
    `;
  });

  movTotalCompras.textContent = `$${totalCompras}`;
}

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
      nuevoStock = Math.max(0, infoStock.stockActual + cantidad * -1);
      // ajustamos como "sale" esa cantidad
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

(async () => {
  await cargarInsumos();
  await cargarStock();
  await cargarMovimientos();
})();
