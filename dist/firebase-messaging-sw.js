importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const messaging = firebase.messaging();

// Background handling
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title || 'RadiExpense Alert';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new finance update.',
    icon: '/logo192.png', // Ensure this path is correct in your public folder
    badge: '/badge.png', // Small monochrome icon for Android task bars
    tag: payload.data?.type || 'general-alert', // Groups notifications
    data: {
      url: payload.data?.click_action || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});