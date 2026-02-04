// FIREBASE CONFIGURATION - YESSWERA
// Para tracking GPS en tiempo real y push notifications

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyD3NlXA0fB3YByvVBmDUU7iTw9xZJVcsIM",
  authDomain: "yesswera-app.firebaseapp.com",
  databaseURL: "https://yesswera-app-default-rtdb.firebaseio.com",
  projectId: "yesswera-app",
  storageBucket: "yesswera-app.firebasestorage.app",
  messagingSenderId: "594857169560",
  appId: "1:594857169560:web:bbcdecf2756ca7242676ed",
  measurementId: "G-X3ZH5ERLBH"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Realtime Database para tracking GPS
export const realtimeDb = getDatabase(app);

// Cloud Messaging para push notifications (solo funciona en dispositivo real)
// export const messaging = getMessaging(app);

export default app;
