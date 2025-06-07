import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
 import{getFirestore, setDoc, doc} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyCfCJv5CQ6Qk9wF7YWrHvQp2Yk7BVgOC-g",
  authDomain: "login-cc86f.firebaseapp.com",
  projectId: "login-cc86f",
  storageBucket: "login-cc86f.firebasestorage.app",
  messagingSenderId: "867237090778",
  appId: "1:867237090778:web:33e70f4fd966da682c1ce3"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Lógica de logout
document.getElementById("logout").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      localStorage.removeItem("loggedInUserId");
      window.location.href = "index.html"; // Redireciona após sair
    })
    .catch((error) => {
      console.error("Erro ao sair:", error);
    });
});