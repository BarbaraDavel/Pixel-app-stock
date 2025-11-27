// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyDb0esdqeYHqY57WMJ4QM3BueX4nJQwrhk",
  authDomain: "pixel-stock.firebaseapp.com",
  projectId: "pixel-stock",
  storageBucket: "pixel-stock.firebasestorage.app",
  messagingSenderId: "120893853574",
  appId: "1:120893853574:web:92f03598f1e941dc38a607"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
