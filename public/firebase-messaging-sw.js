// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase設定（環境変数から取得）
const firebaseConfig = {
  apiKey: "AIzaSyB5FNCgDZ9lxUcEB8OxjnLbEcEvA9IMQdM",
  authDomain: "syuhairenrakuapposaka.firebaseapp.com",
  projectId: "syuhairenrakuapposaka",
  storageBucket: "syuhairenrakuapposaka.firebasestorage.app",
  messagingSenderId: "289547403764",
  appId: "1:289547403764:web:b4e626aaa343b011d7f9a1"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Messaging service worker
const messaging = firebase.messaging();

// バックグラウンド通知の処理
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'medic.web';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '新しいメッセージがあります',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: payload.data || {},
    requireInteraction: true, // Android Chromeで通知を持続表示
    tag: 'medic-web-notification',
    silent: false, // 音を鳴らす
    vibrate: [200, 100, 200], // バイブレーション（Android対応）
    renotify: true, // 同じタグでも再通知
    timestamp: Date.now(),
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/favicon.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/favicon.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');
  
  event.notification.close();
  
  const data = event.notification.data;
  
  if (event.action === 'close') {
    return;
  }
  
  // アプリを開く
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 既にアプリが開いている場合はそのタブにフォーカス
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      
      // アプリが開いていない場合は新しいタブで開く
      let url = '/';
      if (data && data.chatId) {
        url = `/chat/${data.chatId}`;
      }
      
      return clients.openWindow(url);
    })
  );
});

// 通知アクションの処理
self.addEventListener('notificationaction', function(event) {
  console.log('Notification action received:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  if (event.action === 'open') {
    const data = event.notification.data;
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // 既にアプリが開いている場合はそのタブにフォーカス
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        
        // アプリが開いていない場合は新しいタブで開く
        let url = '/';
        if (data && data.chatId) {
          url = `/chat/${data.chatId}`;
        }
        
        return clients.openWindow(url);
      })
    );
  }
});

// プッシュイベントの処理（追加のカスタマイズ用）
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push payload:', payload);
      
      // カスタム処理があればここに追加
    } catch (error) {
      console.error('Error parsing push payload:', error);
    }
  }
});

// Service Worker のインストール
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Service Worker のアクティベート
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});