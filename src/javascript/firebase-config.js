import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZce9J6Zeo-dsVxBMOlXt44qn82ahwRfA",
    authDomain: "by-nook-2026.firebaseapp.com",
    projectId: "by-nook-2026",
    storageBucket: "by-nook-2026.firebasestorage.app",
    messagingSenderId: "203970509846",
    appId: "1:203970509846:web:28eb2f4eb3d4e6506a4937",
    measurementId: "G-YXB5G079XY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);