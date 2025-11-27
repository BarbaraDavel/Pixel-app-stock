// Firebase desde CDN (compatible con GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9b6YtyJkm_hkpTp-eXEN7Yr-V8m9OarQ",
  authDomain: "pixel-app-9d439-ed678.firebaseapp.com",
  projectId: "pixel-app-9d439-ed678",
  storageBucket: "pixel-app-9d439-ed678.firebasestorage.app",
  messagingSenderId: "209432229326",
  appId: "1:209432229326:web:fd865c5ac691f99060679f",
  measurementId: "G-MPKSR2DMJB"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
