import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const tabla = document.getElementById("stockLista");

async function cargarStock() {
  tabla.innerHTML = "";
  const snap = await getDocs(collection(db, "insumos"));
  snap.forEach((d) => {
    const ins = d.data();

    let color = "green";
    if (ins.stock < ins.stockMinimo) color = "red";
    else if (ins.stock <= ins.stockMinimo + 3) color = "orange";

    tabla.innerHTML += `
      <tr style="color:${color}">
        <td>${ins.nombre}</td>
        <td>${ins.stock}</td>
      </tr>
    `;
  });
}

cargarStock();
