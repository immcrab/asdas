import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration from the user's request
const firebaseConfig = {
  apiKey: "AIzaSyDJ2QeH6T4bjKk1fXdfPTNJAD2lAjZXZwk",
  authDomain: "scribbledev.firebaseapp.com",
  databaseURL: "https://scribbledev-default-rtdb.firebaseio.com",
  projectId: "scribbledev",
  storageBucket: "scribbledev.firebasestorage.app",
  messagingSenderId: "580074888715",
  appId: "1:580074888715:web:49c18e1770ae5b8632710e",
  measurementId: "G-V164XBTCVL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { analytics };
