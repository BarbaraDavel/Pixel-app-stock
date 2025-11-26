import { db } from "../firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.getElementById("btnAgregar").addEventListener("click", async () => {
  const nombre = document.getElementById("nombre").value;
  const precio = Number(document.getElementById("precio").value);
  const cantidad = Number(document.getElementById("cantidad").value);

  await addDoc(collection(db, "insumos"), {
    nombre,
    precio,
    cantidad
  });

  alert("Insumo agregado!");
});
