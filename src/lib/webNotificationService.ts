import { initializeFirebase, validateFirebaseConfig } from './firebaseConfig';
import { supabase } from './supabase';

export interface NotificationSupport {
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerSupported: boolean;
  pushManagerSupported: boolean;
}

export class WebNotificationService {
  private static messaging: any = null;
  private static isInitialized = false;

  // 通知サポートの確認
  static checkNotificationSupport(): NotificationSupport {
    const supported = 'Notification' in window;
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    const pushManagerSupported = 'PushManager' in window;
    
    return {
      supported,
      permission: supported ? Notification.permission : 'denied',
      serviceWorkerSupported,
      pushManagerSupported,
    };
  }

  // Firebase初期化
  static async initializeFirebase() {
    if (this.isInitialized) {
      return this.messaging;
    }

    try {
      const { messaging } = await initializeFirebase();
      this.messaging = messaging;
      this.isInitialized = true;
      return messaging;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  // 通知権限の要求
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // FCMトークンの取得
  static async getFCMToken(): Promise<string | null> {
    try {
      if (!validateFirebaseConfig()) {
        console.warn('Firebase configuration incomplete');
        return null;
      }

      const messaging = await this.initializeFirebase();
      if (!messaging) {
        console.warn('Firebase messaging not available');
        return null;
      }

      // Service Workerの登録
      await this.registerServiceWorker();

      const { getToken } = await import('firebase/messaging');
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      if (!vapidKey) {
        console.warn('VAPID key not configured');
        return null;
      }

      const token = await getToken(messaging, {
        vapidKey: vapidKey,
      });

      return token || null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Service Workerの登録
  static async registerServiceWorker(): Promise<void> {
    // StackBlitzや開発環境でのService Worker登録をスキップ
    if (window.location.hostname.includes('stackblitz') || 
        window.location.hostname.includes('webcontainer') ||
        !window.isSecureContext) {
      console.log('Service Worker registration skipped in development environment');
      return;
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // フォアグラウンド通知リスナーの設定
  static setupForegroundListener(callback: (payload: any) => void): () => void {
    if (!this.messaging) {
      console.warn('Firebase messaging not initialized');
      return () => {};
    }

    try {
      // Dynamic import for browser compatibility
      import('firebase/messaging').then(({ onMessage }) => {
        const unsubscribe = onMessage(this.messaging, (payload) => {
          console.log('Foreground message received:', payload);
          
          // フォアグラウンド時の通知表示（Android Chrome対応）
          this.showForegroundNotification(payload);
          
          callback(payload);
        });
        
        // Store unsubscribe function for later cleanup
        this.foregroundUnsubscribe = unsubscribe;
      }).catch(error => {
        console.error('Error setting up foreground listener:', error);
      });

      // Return a cleanup function
      return () => {
        if (this.foregroundUnsubscribe) {
          this.foregroundUnsubscribe();
        }
      };
    } catch (error) {
      console.error('Error setting up foreground listener:', error);
      return () => {};
    }
  }
  
  private static foregroundUnsubscribe: (() => void) | null = null;

  // フォアグラウンド通知の表示（Android Chrome対応）
  private static showForegroundNotification(payload: any): void {
    try {
      const title = payload.notification?.title || payload.data?.title || 'medic.web';
      const body = payload.notification?.body || payload.data?.body || '新しいメッセージがあります';
      const icon = '/favicon.png';
      const badge = '/favicon.png';
      const data = payload.data || {};

      console.log('🔔 Showing foreground notification:', { title, body, data });

      // Android Chrome用の通知オプション
      const notificationOptions: NotificationOptions = {
        body: body,
        icon: icon,
        badge: badge,
        data: data,
        tag: 'medic-web-foreground', // 同じタグで重複を防ぐ
        requireInteraction: true, // Android Chromeで通知を持続表示
        silent: false, // 音を鳴らす
        vibrate: [200, 100, 200], // バイブレーション（Android対応）
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
        ],
        // Android Chrome用の追加オプション
        renotify: true, // 同じタグでも再通知
        timestamp: Date.now(),
      };

      // 通知権限の確認
      if (Notification.permission === 'granted') {
        console.log('✅ Creating notification with options:', notificationOptions);
        
        const notification = new Notification(title, notificationOptions);
        
        // 通知イベントリスナー
        notification.onclick = (event) => {
          console.log('🖱️ Notification clicked');
          event.preventDefault();
          
          // アプリにフォーカスを移す
          window.focus();
          
          // チャット画面に移動（データにchatIdがある場合）
          if (data.chatId) {
            const chatUrl = `/chat/${data.chatId}`;
            if (window.location.pathname !== chatUrl) {
              window.location.href = chatUrl;
            }
          }
          
          notification.close();
        };
        
        notification.onclose = () => {
          console.log('🔕 Notification closed');
        };
        
        notification.onerror = (error) => {
          console.error('❌ Notification error:', error);
        };
        
        notification.onshow = () => {
          console.log('👁️ Notification shown');
        };
        
        // Android Chromeでは自動で閉じないことがあるので、一定時間後に閉じる
        setTimeout(() => {
          if (notification) {
            notification.close();
          }
        }, 10000); // 10秒後に自動で閉じる
        
      } else {
        console.warn('⚠️ Notification permission not granted:', Notification.permission);
        
        // 権限がない場合はブラウザ内通知として表示
        this.showInAppNotification(title, body);
      }
      
    } catch (error) {
      console.error('❌ Error showing foreground notification:', error);
      
      // エラーの場合はブラウザ内通知として表示
      const title = payload.notification?.title || 'medic.web';
      const body = payload.notification?.body || '新しいメッセージがあります';
      this.showInAppNotification(title, body);
    }
  }

  // ブラウザ内通知の表示（フォールバック）
  private static showInAppNotification(title: string, body: string): void {
    console.log('📱 Showing in-app notification:', { title, body });
    
    // 簡単なトースト通知を作成
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4285f4;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
      <div>${body}</div>
    `;
    
    // アニメーション用CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // クリックで閉じる
    toast.onclick = () => {
      toast.remove();
      style.remove();
    };
    
    // 5秒後に自動で閉じる
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        style.remove();
      }
    }, 5000);
  }

  // Web通知の初期化（権限要求 + トークン取得）
  static async initializeWebNotifications(): Promise<string | null> {
    try {
      // 通知権限の要求
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('Notification permission denied');
        return null;
      }

      // FCMトークンの取得
      const token = await this.getFCMToken();
      if (token) {
        console.log('FCM token obtained:', token);
        return token;
      } else {
        console.log('Failed to obtain FCM token');
        return null;
      }
    } catch (error) {
      console.error('Error initializing web notifications:', error);
      return null;
    }
  }

  // ユーザーのFCMトークンをデータベースに更新
  static async updateUserFCMToken(userId: string, token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ fcm_token: token })
        .eq('id', userId);

      if (error) {
        console.error('Error updating FCM token:', error);
        return false;
      }

      console.log('FCM token updated successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('Error in updateUserFCMToken:', error);
      return false;
    }
  }

  // 通知送信（Edge Function経由）
  static async sendNotification(
    receiverId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-web-notification', {
        body: {
          receiverId,
          title,
          body,
          data,
        },
      });

      if (error) {
        console.error('Error calling notification function:', error);
        return false;
      }

      return result?.success || false;
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return false;
    }
  }

  // ローカル通知の表示
  static showLocalNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        ...options,
      });
    }
  }
}