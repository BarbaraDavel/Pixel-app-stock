import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const lista = document.getElementById("listaVentas");

async function cargarVentas() {
  lista.innerHTML = "";
  const snap = await getDocs(collection(db, "ventas"));

  snap.forEach((d) => {
    const v = d.data();
    const fecha = new Date(v.fecha).toLocaleString("es-AR");

    lista.innerHTML += `
      <tr>
        <td>${v.nombre}</td>
        <td>$${v.precio}</td>
        <td>${fecha}</td>
      </tr>
    `;
  });
}

cargarVentas();
