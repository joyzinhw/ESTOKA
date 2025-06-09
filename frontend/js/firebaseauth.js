// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import {
  getFirestore,
  setDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCfCJv5CQ6Qk9wF7YWrHvQp2Yk7BVgOC-g",
  authDomain: "login-cc86f.firebaseapp.com",
  projectId: "login-cc86f",
  storageBucket: "login-cc86f.firebasestorage.app",
  messagingSenderId: "867237090778",
  appId: "1:867237090778:web:33e70f4fd966da682c1ce3"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Função de mensagens
function showMessage(message, divId) {
  const messageDiv = document.getElementById(divId);
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;
  setTimeout(() => {
    messageDiv.style.opacity = 0;
  }, 5000);
}

// Registro
const signUp = document.getElementById('submitSignUp');
if (signUp) {
  signUp.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPassword').value;
    const firstName = document.getElementById('fName').value;
    const lastName = document.getElementById('lName').value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email,
        firstName,
        lastName
      });

      showMessage('Conta criada com sucesso!', 'signUpMessage');
      localStorage.setItem('loggedInUserId', user.uid);
      window.location.href = 'app.html';

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        showMessage('Esse e-mail já está em uso!', 'signUpMessage');
      } else {
        showMessage('Erro ao criar conta.', 'signUpMessage');
        console.error(error);
      }
    }
  });
}

// Login
const signIn = document.getElementById('submitSignIn');
if (signIn) {
  signIn.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      showMessage('Login realizado com sucesso!', 'signInMessage');
      localStorage.setItem('loggedInUserId', user.uid);
      window.location.href = 'app.html';
    } catch (error) {
      if (error.code === 'auth/invalid-credential') {
        showMessage('E-mail ou senha incorretos!', 'signInMessage');
      } else {
        showMessage('Erro ao fazer login.', 'signInMessage');
        console.error(error);
      }
    }
  });
}

// Login com Google
const googleLoginBtn = document.querySelectorAll('.googleLoginBtn');
googleLoginBtn.forEach(btn => {
  btn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName,
          provider: "google"
        });
      }

      localStorage.setItem('loggedInUserId', user.uid);
      window.location.href = 'app.html';
    } catch (error) {
      console.error("Erro no login com Google:", error);
      showMessage('Erro ao logar com Google.', 'signInMessage');
    }
  });
});
