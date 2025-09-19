// Firebase configuration for TreonAdmin
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "treondatabase.firebaseapp.com",
  projectId: "treondatabase",
  storageBucket: "treondatabase.appspot.com",
  messagingSenderId: "your-sender-id-here",
  appId: "your-app-id-here"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();