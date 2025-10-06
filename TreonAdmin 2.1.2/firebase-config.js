// firebase-config.js - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "treondatabase.firebaseapp.com",
  projectId: "treondatabase",
  storageBucket: "treondatabase.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();