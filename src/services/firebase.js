/**
 * FireBase Information for BiNx React App
 * Author: ML
 * Date: August 8, 2025
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA_0deL-k83xa2JtgRJ5j04AEpyLpYUbIU",
  authDomain: "binx-3a213.firebaseapp.com",
  projectId: "binx-3a213",
  storageBucket: "binx-3a213.firebasestorage.app",
  messagingSenderId: "914267568982",
  appId: "1:914267568982:web:ef9a3aa367c7d9c807f4f7",
  measurementId: "G-JC27F166BJ"
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { app };


