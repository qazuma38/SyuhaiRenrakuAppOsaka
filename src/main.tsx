import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store'
import App from './App'
import './index.css'

// PWA用のService Worker登録（StackBlitz環境では無効化）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // StackBlitz/WebContainer環境では Service Worker をスキップ
    const isStackBlitzEnv = window.location.hostname.includes('stackblitz.io') || 
                           window.location.hostname.includes('webcontainer.io') ||
                           window.location.hostname.includes('bolt.new') ||
                           window.name.includes('sb-preview-iframe');
    
    if (isStackBlitzEnv) {
      // StackBlitz環境では何もしない（エラーメッセージも表示しない）
      return;
    }
    
    // 本番環境でのみService Workerを登録
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.error('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)