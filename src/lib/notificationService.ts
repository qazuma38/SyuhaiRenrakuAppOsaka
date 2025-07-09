import { supabase } from './supabase'
import { WebNotificationService } from './webNotificationService'

export class NotificationService {
  // Web用のFCM通知初期化
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    return await WebNotificationService.initializeWebNotifications()
  }

  // ユーザーのFCMトークンを更新
  static async updateUserFCMToken(userId: string, token: string): Promise<boolean> {
    return await WebNotificationService.updateUserFCMToken(userId, token)
  }

  // 通知送信
  static async sendNotification(
    receiverId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    return await WebNotificationService.sendNotification(receiverId, title, body, data)
  }

  // 通知リスナーの設定
  static setupNotificationListeners() {
    // Web用のフォアグラウンド通知リスナー
    const unsubscribe = WebNotificationService.setupForegroundListener((payload) => {
      console.log('Notification received:', payload)
      // 必要に応じて追加の処理
    })

    return {
      foregroundListener: { remove: unsubscribe },
      backgroundListener: { remove: () => {} }, // Web用のバックグラウンド通知はService Workerで処理
    }
  }

  // リスナーの削除
  static removeNotificationListeners(listeners: {
    foregroundListener: { remove: () => void }
    backgroundListener: { remove: () => void }
  }) {
    listeners.foregroundListener.remove()
    listeners.backgroundListener.remove()
  }

  // 通知サポートの確認
  static checkNotificationSupport() {
    return WebNotificationService.checkNotificationSupport()
  }

  // 通知権限の要求
  static async requestNotificationPermission(): Promise<boolean> {
    return await WebNotificationService.requestPermission()
  }

  // FCMトークンの取得
  static async getFCMToken(): Promise<string | null> {
    return await WebNotificationService.getFCMToken()
  }
}