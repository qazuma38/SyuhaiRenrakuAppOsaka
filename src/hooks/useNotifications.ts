import { useEffect, useRef } from 'react'
import { NotificationService } from '../lib/notificationService'
import { WebNotificationService } from '../lib/webNotificationService'
import { validateFirebaseConfig } from '../lib/firebaseConfig'
import { useAppSelector } from './useAppSelector'

export function useNotifications() {
  const { user } = useAppSelector((state) => state.auth)
  const notificationListeners = useRef<any>(null)

  useEffect(() => {
    if (user) {
      const initializeNotifications = async () => {
        try {
          // Firebase設定の検証
          if (!validateFirebaseConfig()) {
            console.warn('Firebase configuration incomplete - notifications disabled')
            return
          }

          // 通知サポートの確認
          const support = WebNotificationService.checkNotificationSupport()
          console.log('Notification support:', support)
          
          if (!support.supported) {
            console.log('Notifications not supported in this browser')
            return
          }

          // プッシュ通知の登録とトークン取得
          const token = await NotificationService.registerForPushNotificationsAsync()
          
          if (token) {
            console.log('Notification token obtained')
            // ユーザーのFCMトークンを更新
            const success = await NotificationService.updateUserFCMToken(user.id, token)
            if (success) {
              console.log('FCM token updated in database')
            } else {
              console.error('Failed to update FCM token in database')
            }
          } else {
            console.log('Failed to obtain notification token')
          }

          // 通知リスナーの設定
          notificationListeners.current = NotificationService.setupNotificationListeners()
          console.log('Notification listeners set up')

        } catch (error) {
          console.error('Error initializing notifications:', error)
        }
      }

      initializeNotifications()

      return () => {
        // リスナーのクリーンアップ
        if (notificationListeners.current) {
          NotificationService.removeNotificationListeners(notificationListeners.current)
          console.log('Notification listeners cleaned up')
        }
      }
    }
  }, [user])

  // 通知権限の状態を返す（デバッグ用）
  const getNotificationStatus = () => {
    return WebNotificationService.checkNotificationSupport()
  }

  return {
    getNotificationStatus
  }
}