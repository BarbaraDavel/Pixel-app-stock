// firebase.js — Pixel Stock (Firebase Config + Firestore)

// --- Importar Firebase App ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

// --- Importar Firestore ---
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// --- Tu configuración real proporcionada por Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyC96bYtyJkm_hkpTp-eXEN7Yz-V8m9OaRI",
  authDomain: "pixel-app-9d439-ed678.firebaseapp.com",
  projectId: "pixel-app-9d439-ed678",
  storageBucket: "pixel-app-9d439-ed678.appspot.com",
  messagingSenderId: "1209432229326",
  appId: "1:1209432229326:web:fd865c5ac691f99606679f",
  measurementId: "G-MPKSR2DMJB"
};

// --- Inicializar Firebase ---
const app = initializeApp(firebaseConfig);

// --- Inicializar Firestore ---
export const db = getFirestore(app);

// --- Exportar helpers para CRUD ---
export {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
};
