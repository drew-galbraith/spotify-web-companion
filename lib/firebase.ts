// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4wL8IyrTWGOntx_OqtH_YuXhXcGgFpLo",
  authDomain: "wandertunes-4e971.firebaseapp.com",
  projectId: "wandertunes-4e971",
  storageBucket: "wandertunes-4e971.firebasestorage.app",
  messagingSenderId: "940734983064",
  appId: "1:940734983064:web:0f1ea9a5bd743882e999ed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);