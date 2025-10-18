/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: The `getAuth` member is not exported from 'firebase/auth'.
// Using the compat library for initialization to resolve this.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

// TODO: Replace with your app's Firebase project configuration.
// You can get this from the Firebase console for your web app.
const firebaseConfig = {
 apiKey: "AIzaSyArIfrtQYUjHp6WGg1wk6DPz04rQpMLFQY",
  authDomain: "jiampast.firebaseapp.com",
  databaseURL: "https://jiampast-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "jiampast",
  storageBucket: "jiampast.firebasestorage.app",
  messagingSenderId: "1083945973358",
  appId: "1:1083945973358:web:d3abee6436b0b948b9187f",
  measurementId: "G-5BSJV8EVGN"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Export the auth instance to be used in other parts of the app
export const auth = app.auth();