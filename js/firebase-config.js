// ============================================================
// GMS - Firebase Configuration
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2ailHJnWBDH2d8fsR3szjLmJMoI6fLa8",
  authDomain: "irodori-gms-1.firebaseapp.com",
  projectId: "irodori-gms-1",
  storageBucket: "irodori-gms-1.firebasestorage.app",
  messagingSenderId: "439546138823",
  appId: "1:439546138823:web:650642d2fb43fc759e2ee2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export Firebase instances and functions
export {
  db, auth, googleProvider,
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy,
  signInWithPopup, onAuthStateChanged, signOut
};
