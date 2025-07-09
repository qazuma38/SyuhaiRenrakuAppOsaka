// Firebase configuration for web notifications
// This file is configured for web-only usage

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Web-specific Firebase initialization
let app: any = null;
let messaging: any = null;

export const initializeFirebase = async () => {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, isSupported } = await import('firebase/messaging');
    
    app = initializeApp(firebaseConfig);
    
    // Check if messaging is supported in this browser
    const messagingSupported = await isSupported();
    if (messagingSupported) {
      messaging = getMessaging(app);
    }
    
    return { app, messaging };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return { app: null, messaging: null };
  }
};

export const getFirebaseApp = () => app;
export const getFirebaseMessaging = () => messaging;

export const validateFirebaseConfig = (): boolean => {
  const requiredFields = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  // Check if all required environment variables are set
  for (const field of requiredFields) {
    const value = import.meta.env[field];
    if (!value || value === 'your-value-here' || value === '') {
      console.warn(`Firebase configuration missing or invalid: ${field}`);
      return false;
    }
  }

  // Check VAPID key separately
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey || vapidKey === 'your_vapid_key' || vapidKey === '') {
    console.warn('Firebase VAPID key missing or invalid');
    return false;
  }

  return true;
};