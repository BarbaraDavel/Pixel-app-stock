// firebase.js
// Acá vamos a inicializar Firebase para usar Firestore más adelante.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ⚠️ Cuando tengamos tu config de Firebase, la pegamos acá:
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "pixel-app-9d439.firebaseapp.com",
  projectId: "pixel-app-9d439",
  storageBucket: "pixel-app-9d439.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
