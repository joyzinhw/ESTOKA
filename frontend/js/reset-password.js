import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCfCJv5CQ6Qk9wF7YWrHvQp2Yk7BVgOC-g",
  authDomain: "login-cc86f.firebaseapp.com",
  projectId: "login-cc86f",
  storageBucket: "login-cc86f.firebasestorage.app",
  messagingSenderId: "867237090778",
  appId: "1:867237090778:web:33e70f4fd966da682c1ce3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Lógica de redefinição
const resetBtn = document.getElementById('resetPasswordBtn');
resetBtn.addEventListener('click', () => {
  const email = document.getElementById('resetEmail').value;
  const messageDiv = document.getElementById('resetMessage');

  if (!email) {
    messageDiv.style.color = "red";
    messageDiv.textContent = "Por favor, digite um e-mail válido.";
    return;
  }

  sendPasswordResetEmail(auth, email)
    .then(() => {
      messageDiv.style.color = "green";
      messageDiv.textContent = "E-mail de redefinição enviado!";
    })
    .catch((error) => {
      messageDiv.style.color = "red";
      if (error.code === 'auth/user-not-found') {
        messageDiv.textContent = "Usuário não encontrado com esse e-mail.";
      } else {
        messageDiv.textContent = "Erro ao enviar o e-mail. Tente novamente.";
        console.error(error);
      }
    });
});
