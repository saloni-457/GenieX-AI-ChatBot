// Firebase v9 Modular SDK
import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup, 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdPliqfHrf2QDKedB3XSDn4cvFIU6rz40",
  authDomain: "geniex-d6c8c.firebaseapp.com",
  projectId: "geniex-d6c8c",
  storageBucket: "geniex-d6c8c.appspot.com",
  messagingSenderId: "982353981292",
  appId: "1:982353981292:web:54a071a2e5018f661bcd49"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();



const signInWithGoogle = () => {
  return signInWithPopup(auth, provider);
};
// export { auth, provider };
export { auth, signInWithGoogle };