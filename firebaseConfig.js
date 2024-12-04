// firebaseConfig.js
const firebase = require("firebase-admin");
require("dotenv").config(); // Load environment variables from .env

// Set up the credentials using the environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines with actual newlines
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Initialize Firebase with service account credentials
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://fast-app-main-default-rtdb.firebaseio.com/"
});

const db = firebase.firestore();

module.exports = { firebase, db };
