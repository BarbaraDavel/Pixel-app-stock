import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

async function migrarInsumos() {
  const snap = await getDocs(collection(db, "insumos"));

  for (const d of snap.docs) {
    const ins = d.data();

    // Solo migrar si NO tiene costoPaquete
    if (ins.costoPaquete) continue;

    const costoPaquete = Number(ins.costoUnitario || 0);
    const cantidad     = Number(ins.cantidadPaquete || 1);
    const costoUnitario = cantidad > 0 ? costoPaquete / cantidad : costoPaquete;

    await updateDoc(doc(db, "insumos", d.id), {
      costoPaquete,
      costoUnitario
    });

    console.log(`✔ Migrado ${ins.nombre}`);
  }

  console.log("🎉 Migración completa");
}

migrarInsumos();
