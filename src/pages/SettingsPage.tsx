import React, { useState, useEffect } from 'react'
import { LogOut, User, Settings as SettingsIcon, MapPin, ChevronDown, Check, Bell, BellOff, Smartphone, Download, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppSelector } from '../hooks/useAppSelector'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { logoutUser } from '../store/slices/authSlice'
import { loadCourseData, setCourse, toggleCourseAssignment, clearError, addRegisteredCourse, removeRegisteredCourse } from '../store/slices/courseSlice'
import { loadCustomersForEmployee } from '../store/slices/customerSlice'
import { NotificationService } from '../lib/notificationService'
import { validateFirebaseConfig } from '../lib/firebaseConfig'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { RegisteredCourse } from '../types/auth'
import { CourseService } from '../lib/courseService'
import { useNavigate } from 'react-router-dom'

// 利用可能なコース一覧
const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { registeredCourses, assignedCourses, loading, error } = useAppSelector((state) => state.course)
  const { loading: customersLoading } = useAppSelector((state) => state.customer)
  
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationSupport, setNotificationSupport] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // PWAインストール機能
  const {
    isInstallable,
    isInstalled,
    platform,
    canShowInstallPrompt,
    installPWA,
    showIOSInstructions,
    showDesktopInstructions,
  } = usePWAInstall()

  useEffect(() => {
    if (user && user.user_type === 'employee') {
      dispatch(loadCourseData(user.id))
    }
  }, [user, dispatch])

  useEffect(() => {
    if (error) {
      alert(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  useEffect(() => {
    // 通知サポートの確認
    const support = NotificationService.checkNotificationSupport()
    setNotificationSupport(support)
    
    // 現在の通知状態を確認
    if (support.supported) {
      setNotificationEnabled(support.permission === 'granted')
    }
    
    // デバッグ情報を収集
    collectDebugInfo()
  }, [])

  // 新しいコースを登録コースに追加
  const handleAddCourse = async (courseId: string, courseName: string) => {
    if (!user) return

    try {
      const result = await dispatch(addRegisteredCourse({
        employeeId: user.id,
        courseId,
        courseName
      }))

      if (addRegisteredCourse.fulfilled.match(result)) {
        // データを再読み込み
        await dispatch(loadCourseData(user.id))
        alert(`「${courseName}」を登録コースに追加しました`)
      }
    } catch (error) {
      console.error('Error adding course:', error)
    }
  }

  // 登録コースを削除
  const handleRemoveCourse = async (courseId: string, courseName: string) => {
    if (!user) return

    if (!window.confirm(`「${courseName}」を登録コースから削除しますか？`)) {
      return
    }

    try {
      const result = await dispatch(removeRegisteredCourse({
        employeeId: user.id,
        courseId
      }))

      if (removeRegisteredCourse.fulfilled.match(result)) {
        // データを再読み込み
        await dispatch(loadCourseData(user.id))
        alert(`「${courseName}」を登録コースから削除しました`)
      }
    } catch (error) {
      console.error('Error removing course:', error)
    }
  }

  const collectDebugInfo = () => {
    const info = {
      // ブラウザ情報
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      
      // 通知サポート
      notificationSupported: 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
      maxActions: 'Notification' in window && Notification.maxActions ? Notification.maxActions : 'unknown',
      
      // Service Worker サポート
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      serviceWorkerReady: 'serviceWorker' in navigator ? 'checking...' : 'not-supported',
      
      // Firebase 設定
      firebaseConfigValid: validateFirebaseConfig(),
      firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Not set',
      firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      firebaseVapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY ? 'Set' : 'Not set',
      
      // 現在のFCMトークン
      currentFcmToken: user?.fcm_token ? 'Set' : 'Not set',
      
      // 現在時刻
      timestamp: new Date().toISOString(),
      
      // ブラウザの機能
      isSecureContext: window.isSecureContext,
      location: window.location.href,
      protocol: window.location.protocol,
      
      // Android Chrome 固有の情報
      isAndroid: /Android/i.test(navigator.userAgent),
      isChrome: /Chrome/i.test(navigator.userAgent),
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      
      // 画面情報
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      
      // 通知テスト結果
      lastNotificationTest: localStorage.getItem('lastNotificationTest') || 'none',
      
      // PWA情報
      pwaInstallable: isInstallable,
      pwaInstalled: isInstalled,
      pwaPlatform: platform,
      pwaCanShowPrompt: canShowInstallPrompt,
      pwaDisplayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      pwaStandalone: (navigator as any).standalone === true,
    }
    
    // Service Worker の状態を非同期で取得
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        info.serviceWorkerReady = 'ready';
        info.serviceWorkerScope = registration.scope;
        info.serviceWorkerActive = registration.active ? 'active' : 'not-active';
        setDebugInfo({...info});
      }).catch(error => {
        info.serviceWorkerReady = `error: ${error.message}`;
        setDebugInfo({...info});
      });
    }
    
    setDebugInfo(info)
  }
  
  // PWAインストールボタンのハンドラー
  const handlePWAInstall = async () => {
    console.log('🚀 PWA Install button clicked');
    console.log('📱 Platform:', platform);
    console.log('🔧 Can show prompt:', canShowInstallPrompt);
    console.log('📦 Is installable:', isInstallable);
    console.log('✅ Is installed:', isInstalled);
    
    // デバッグ情報をコンソールに出力
    if (typeof (window as any).logPWADebugInfo === 'function') {
      (window as any).logPWADebugInfo();
    }
    
    switch (platform) {
      case 'android':
        console.log('🤖 Android platform detected');
        if (canShowInstallPrompt) {
          console.log('✅ Install prompt available, calling installPWA()');
          const success = await installPWA();
          console.log('📊 Install result:', success);
          if (success) {
            alert('アプリのインストールが開始されました！');
          } else {
            alert('インストールがキャンセルされました。');
          }
        } else {
          console.log('❌ Install prompt not available');
          alert(`
Android Chromeでアプリをインストールするには：

1. ブラウザのメニュー（⋮）をタップ
2. 「アプリをインストール」または「ホーム画面に追加」を選択
3. 「インストール」をタップ

または：
1. アドレスバーの右側にあるインストールアイコンをタップ
2. 「インストール」をタップ

※ インストールオプションが表示されない場合は、しばらく待ってから再度お試しください。
          `.trim());
        }
        break;
      case 'ios':
        console.log('🍎 iOS platform detected');
        showIOSInstructions();
        break;
      case 'desktop':
        console.log('🖥️ Desktop platform detected');
        showDesktopInstructions();
        break;
      default:
        console.log('❓ Unknown platform detected');
        alert('お使いのブラウザでアプリのインストールを試してください。ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を探してください。');
        break;
    }
  }
  
  // PWAインストールボタンの表示判定
  const shouldShowInstallButton = () => {
    // すでにインストール済みの場合は表示しない
    if (isInstalled) {
      return false;
    }
    
    // インストール可能な場合は表示
    if (isInstallable) {
      return true;
    }
    
    // PWAに対応していないブラウザでも手順を案内するため表示
    return true;
  };
  
  // PWAインストールボタンのテキスト
  const getInstallButtonText = () => {
    if (isInstalled) {
      return 'インストール済み';
    }
    
    switch (platform) {
      case 'android':
        return 'アプリをインストール';
      case 'ios':
        return 'ホーム画面に追加';
      case 'desktop':
        return 'デスクトップにインストール';
      default:
        return 'アプリをインストール';
    }
  };
  
  // PWAインストールボタンのアイコン
  const getInstallButtonIcon = () => {
    switch (platform) {
      case 'android':
      case 'ios':
        return Smartphone;
      case 'desktop':
      default:
        return Download;
    }
  };

  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      dispatch(logoutUser())
    }
  }

  const handleToggleCourseAssignment = async (courseId: string, courseName: string) => {
    if (!user) return

    const isAssigned = assignedCourses.some(ac => ac.course_id === courseId)

    try {
      const result = await dispatch(toggleCourseAssignment({
        employeeId: user.id,
        courseId,
        isAssigned
      }))

      if (toggleCourseAssignment.fulfilled.match(result)) {
        // Reload course data
        await dispatch(loadCourseData(user.id))
        // Reload customers for the updated assignment
        dispatch(loadCustomersForEmployee(user.id))
        alert(
          isAssigned 
            ? `「${courseName}」の本日担当を解除しました`
            : `「${courseName}」を本日担当に設定しました`
        )
      }
    } catch (error) {
      console.error('Error toggling course assignment:', error)
    }
  }

  const handleNotificationToggle = async () => {
    if (!user) return

    setNotificationLoading(true)
    
    // デバッグ情報を更新
    collectDebugInfo()

    try {
      if (!notificationEnabled) {
        // 通知を有効化
        console.log('🔔 Enabling notifications...')
        console.log('🔍 Debug info:', debugInfo)

        // Firebase設定の確認
        if (!validateFirebaseConfig()) {
          console.error('❌ Firebase configuration incomplete')
          alert('Firebase設定が不完全です。通知機能を使用するには環境変数を設定してください。')
          setNotificationLoading(false)
          return
        }
        console.log('✅ Firebase configuration valid')

        // 通知権限の要求
        console.log('🔐 Requesting notification permission...')
        const hasPermission = await NotificationService.requestNotificationPermission()
        if (!hasPermission) {
          console.error('❌ Notification permission denied')
          alert('通知権限が拒否されました。ブラウザの設定から通知を許可してください。')
          setNotificationLoading(false)
          return
        }
        console.log('✅ Notification permission granted')

        // FCMトークンの取得
        console.log('🎫 Getting FCM token...')
        const token = await NotificationService.getFCMToken()
        if (!token) {
          console.error('❌ Failed to get FCM token')
          alert('通知トークンの取得に失敗しました。')
          setNotificationLoading(false)
          return
        }
        console.log('✅ FCM token obtained:', token.substring(0, 20) + '...')

        // データベースにトークンを保存
        console.log('💾 Saving FCM token to database...')
        const success = await NotificationService.updateUserFCMToken(user.id, token)
        if (!success) {
          console.error('❌ Failed to save FCM token to database')
          alert('通知設定の保存に失敗しました。')
          setNotificationLoading(false)
          return
        }
        console.log('✅ FCM token saved to database')

        // 通知リスナーの設定
        console.log('👂 Setting up notification listeners...')
        NotificationService.setupNotificationListeners()
        console.log('✅ Notification listeners set up')

        setNotificationEnabled(true)
        alert('通知が有効化されました！')

        // テスト通知の送信
        console.log('📤 Sending test notification...')
        setTimeout(() => {
          // サーバー経由のテスト通知
          NotificationService.sendNotification(
            user.id,
            'medic.web通知テスト（サーバー）',
            'サーバー経由の通知が正常に設定されました。',
            { test: true, type: 'server' }
          ).then(success => {
            console.log(success ? '✅ Server test notification sent' : '❌ Server test notification failed')
            localStorage.setItem('lastNotificationTest', `server: ${success ? 'success' : 'failed'} at ${new Date().toISOString()}`)
          })
          
          // ローカル通知のテスト（Android Chrome用）
          setTimeout(() => {
            console.log('📱 Testing local notification...')
            if (Notification.permission === 'granted') {
              try {
                const testNotification = new Notification('medic.web通知テスト（ローカル）', {
                  body: 'ローカル通知が正常に動作しています。',
                  icon: '/favicon.png',
                  badge: '/favicon.png',
                  tag: 'test-local',
                  requireInteraction: true,
                  vibrate: [200, 100, 200],
                  data: { test: true, type: 'local' },
                  actions: [
                    { action: 'ok', title: 'OK' }
                  ]
                });
                
                testNotification.onclick = () => {
                  console.log('✅ Local test notification clicked')
                  testNotification.close()
                }
                
                setTimeout(() => testNotification.close(), 5000)
                
                localStorage.setItem('lastNotificationTest', `local: success at ${new Date().toISOString()}`)
                console.log('✅ Local test notification created')
              } catch (error) {
                console.error('❌ Local test notification failed:', error)
                localStorage.setItem('lastNotificationTest', `local: failed (${error.message}) at ${new Date().toISOString()}`)
              }
            }
          }, 2000)
        }, 1000)

      } else {
        // 通知を無効化
        console.log('🔕 Disabling notifications...')
        
        // FCMトークンをクリア
        const success = await NotificationService.updateUserFCMToken(user.id, '')
        if (success) {
          setNotificationEnabled(false)
          console.log('✅ Notifications disabled')
          alert('通知が無効化されました。')
        } else {
          console.error('❌ Failed to disable notifications')
          alert('通知設定の更新に失敗しました。')
        }
      }
    } catch (error) {
      console.error('❌ Error toggling notifications:', error)
      alert('通知設定の変更中にエラーが発生しました。')
    } finally {
      setNotificationLoading(false)
      // デバッグ情報を再収集
      collectDebugInfo()
    }
  }

  const assignedCourseIds = assignedCourses.map(ac => ac.course_id)

  if (customersLoading && !user) {
    return (
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>設定</h2>
        </div>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>設定</h2>
      </div>

      <div style={styles.content}>
        <div style={styles.userInfoSection}>
          <div style={styles.userInfoHeader}>
            <User size={24} color="#4285f4" />
            <h3 style={styles.userInfoTitle}>ユーザー情報</h3>
          </div>
          <p style={styles.infoText}>ユーザーID：{user?.id || '取得中...'}</p>
          <p style={styles.infoText}>ユーザー名：{user?.name || '取得中...'}</p>
          <p style={styles.infoText}>ユーザータイプ：{user?.user_type === 'employee' ? '社員' : '顧客'}</p>
          <p style={styles.infoText}>拠点：{user?.base || '取得中...'}</p>
          {user?.phone && (
            <p style={styles.infoText}>電話番号：{user.phone}</p>
          )}
          {user?.user_type === 'employee' && (
            <p style={styles.infoText}>
              本日の担当コース：{assignedCourseIds.length > 0 ? assignedCourseIds.join(', ') : 'なし'}
            </p>
          )}
        </div>

        {user?.user_type === 'employee' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <MapPin size={24} color="#4285f4" />
              <h3 style={styles.sectionTitle}>コース管理</h3>
            </div>

            {/* 登録コース一覧 */}
            <div style={styles.registeredCoursesSection}>
              <div style={styles.registeredCoursesHeader}>
                <h4 style={styles.subsectionTitle}>登録コース</h4>
                <button
                  style={styles.addCourseButton}
                  onClick={() => setShowAddCourseModal(true)}
                >
                  + 追加
                </button>
              </div>
              
              {registeredCourses.length === 0 ? (
                <div style={styles.emptyRegisteredCourses}>
                  <p style={styles.emptyText}>登録されたコースがありません</p>
                  <p style={styles.emptySubText}>「+ 追加」ボタンからコースを追加してください</p>
                </div>
              ) : (
                <div style={styles.registeredCoursesList}>
                  {registeredCourses.map((course) => (
                    <div key={course.course_id} style={styles.registeredCourseItem}>
                      <div style={styles.courseInfo}>
                        <p style={styles.courseId}>{course.course_id}</p>
                        <p style={styles.courseName}>{course.course_name}</p>
                      </div>
                      <button
                        style={styles.removeCourseButton}
                        onClick={() => handleRemoveCourse(course.course_id, course.course_name)}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 本日の担当設定 */}
            {registeredCourses.length > 0 && (
              <div style={styles.assignmentSection}>
                <h4 style={styles.subsectionTitle}>本日の担当設定</h4>
                {registeredCourses.map((course) => {
                  const isAssigned = assignedCourses.some(ac => ac.course_id === course.course_id)
                  
                  return (
                    <div
                      key={course.course_id}
                      style={{
                        ...styles.assignmentButton,
                        ...(isAssigned ? styles.assignedButton : styles.unassignedButton),
                      }}
                      onClick={() => handleToggleCourseAssignment(course.course_id, course.course_name)}
                    >
                      <div style={styles.assignmentButtonContent}>
                        <div style={styles.courseInfo}>
                          <p style={styles.courseId}>{course.course_id}</p>
                          <p style={styles.courseName}>{course.course_name}</p>
                        </div>
                        {isAssigned ? (
                          <div style={styles.assignedIndicator}>
                            <Check size={16} color="#ffffff" />
                            <span style={styles.assignedText}>担当中</span>
                          </div>
                        ) : (
                          <div style={styles.unassignedIndicator}>
                            <span style={styles.unassignedText}>担当する</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {registeredCourses.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>登録されたコースがありません</p>
                <p style={styles.emptySubText}>コースを追加してから担当設定を行ってください</p>
              </div>
            )}
          </div>
        )}

        <div style={styles.section}>
          {/* 管理者メニュー */}
          {user?.is_admin && (
            <div style={styles.adminSection}>
              <div style={styles.adminHeader}>
                <Shield size={24} color="#ef4444" />
                <h3 style={styles.adminTitle}>管理者メニュー</h3>
              </div>
              <button
                style={styles.adminButton}
                onClick={() => navigate('/admin')}
              >
                <span style={styles.adminButtonText}>データベース管理</span>
              </button>
              <p style={styles.adminDescription}>
                システム管理者として各テーブルのデータを管理できます
              </p>
            </div>
          )}
          
          <div style={styles.sectionHeader}>
            <SettingsIcon size={24} color="#4285f4" />
            <h3 style={styles.sectionTitle}>アプリ設定</h3>
          </div>
          
          {/* PWAインストール設定 */}
          {shouldShowInstallButton() && (
            <div style={styles.pwaSection}>
              <div style={styles.pwaHeader}>
                <div style={styles.pwaInfo}>
                  {(() => {
                    const IconComponent = getInstallButtonIcon();
                    return <IconComponent size={20} color={isInstalled ? '#10b981' : '#4285f4'} />;
                  })()}
                  <div style={styles.pwaDetails}>
                    <span style={styles.pwaTitle}>アプリインストール</span>
                    <span style={styles.pwaSubtitle}>
                      {isInstalled 
                        ? 'アプリがインストールされています' 
                        : 'ホーム画面からアクセス可能'
                      }
                    </span>
                  </div>
                </div>
                
                {!isInstalled && (
                  <button
                    style={{
                      ...styles.pwaButton,
                      ...(canShowInstallPrompt ? styles.pwaButtonEnabled : styles.pwaButtonDefault),
                    }}
                    onClick={handlePWAInstall}
                  >
                    <span style={styles.pwaButtonText}>
                      {getInstallButtonText()}
                    </span>
                  </button>
                )}
              </div>
              
              {isInstalled && (
                <p style={styles.pwaInstalledText}>
                  ✅ アプリがインストールされています。ホーム画面から起動できます。
                </p>
              )}
              
              {!isInstalled && (
                <p style={styles.pwaDescription}>
                  {platform === 'android' && 'Androidデバイスでアプリとしてインストールできます。'}
                  {platform === 'ios' && 'iPhoneのホーム画面にアプリを追加できます。'}
                  {platform === 'desktop' && 'デスクトップアプリとしてインストールできます。'}
                  {platform === 'unknown' && 'お使いのブラウザでアプリをインストールできます。'}
                </p>
              )}
            </div>
          )}
          
          {/* 通知設定 */}
          <div style={styles.notificationSection}>
            <div style={styles.notificationHeader}>
              <div style={styles.notificationInfo}>
                {notificationEnabled ? (
                  <Bell size={20} color="#10b981" />
                ) : (
                  <BellOff size={20} color="#6b7280" />
                )}
                <div style={styles.notificationDetails}>
                  <span style={styles.notificationTitle}>プッシュ通知</span>
                  <span style={styles.notificationSubtitle}>
                    {notificationSupport?.supported 
                      ? (notificationEnabled ? '有効' : '無効')
                      : 'サポートされていません'
                    }
                  </span>
                </div>
              </div>
              
              {notificationSupport?.supported && (
                <button
                  style={{
                    ...styles.notificationButton,
                    ...(notificationEnabled ? styles.notificationButtonEnabled : styles.notificationButtonDisabled),
                    ...(notificationLoading ? styles.notificationButtonLoading : {}),
                  }}
                  onClick={handleNotificationToggle}
                  disabled={notificationLoading}
                >
                  {notificationLoading ? (
                    <span style={styles.loadingSpinner}>...</span>
                  ) : (
                    <span style={styles.notificationButtonText}>
                      {notificationEnabled ? '無効化' : '有効化'}
                    </span>
                  )}
                </button>
              )}
            </div>
            
            {notificationSupport && !notificationSupport.supported && (
              <p style={styles.notificationWarning}>
                このブラウザは通知機能をサポートしていません
              </p>
            )}
            
            {notificationSupport?.supported && !validateFirebaseConfig() && (
              <p style={styles.notificationWarning}>
                Firebase設定が不完全です。通知機能を使用するには環境変数を設定してください。
              </p>
            )}
            
            {/* デバッグ情報セクション */}
            <div style={styles.debugSection}>
              <button
                style={styles.debugToggleButton}
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                {showDebugInfo ? '🔼 デバッグ情報を隠す' : '🔽 デバッグ情報を表示'}
              </button>
              
              {showDebugInfo && debugInfo && (
                <div style={styles.debugInfo}>
                  <h4 style={styles.debugTitle}>🔍 通知デバッグ情報</h4>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>📱 ブラウザ情報</h5>
                    <p style={styles.debugText}>User Agent: {debugInfo.userAgent}</p>
                    <p style={styles.debugText}>Platform: {debugInfo.platform}</p>
                    <p style={styles.debugText}>Vendor: {debugInfo.vendor}</p>
                    <p style={styles.debugText}>Language: {debugInfo.language}</p>
                    <p style={styles.debugText}>Cookie Enabled: {debugInfo.cookieEnabled ? '✅ Yes' : '❌ No'}</p>
                    <p style={styles.debugText}>Online: {debugInfo.onLine ? '✅ Yes' : '❌ No'}</p>
                    <p style={styles.debugText}>Secure Context: {debugInfo.isSecureContext ? '✅ Yes' : '❌ No'}</p>
                    <p style={styles.debugText}>Location: {debugInfo.location}</p>
                    <p style={styles.debugText}>Protocol: {debugInfo.protocol}</p>
                  </div>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>📱 デバイス情報</h5>
                    <p style={styles.debugText}>
                      Android: {debugInfo.isAndroid ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>
                      Chrome: {debugInfo.isChrome ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>
                      Mobile: {debugInfo.isMobile ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>Screen: {debugInfo.screenWidth}x{debugInfo.screenHeight}</p>
                    <p style={styles.debugText}>Device Pixel Ratio: {debugInfo.devicePixelRatio}</p>
                  </div>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>🔔 通知サポート</h5>
                    <p style={styles.debugText}>
                      Notification API: {debugInfo.notificationSupported ? '✅ Supported' : '❌ Not supported'}
                    </p>
                    <p style={styles.debugText}>
                      Permission: {debugInfo.notificationPermission === 'granted' ? '✅ Granted' : 
                                 debugInfo.notificationPermission === 'denied' ? '❌ Denied' : 
                                 debugInfo.notificationPermission === 'default' ? '⚠️ Default' : 
                                 '❌ Not supported'}
                    </p>
                    <p style={styles.debugText}>Max Actions: {debugInfo.maxActions}</p>
                    <p style={styles.debugText}>
                      Service Worker: {debugInfo.serviceWorkerSupported ? '✅ Supported' : '❌ Not supported'}
                    </p>
                    <p style={styles.debugText}>SW Ready: {debugInfo.serviceWorkerReady}</p>
                    {debugInfo.serviceWorkerScope && (
                      <p style={styles.debugText}>SW Scope: {debugInfo.serviceWorkerScope}</p>
                    )}
                    {debugInfo.serviceWorkerActive && (
                      <p style={styles.debugText}>SW Active: {debugInfo.serviceWorkerActive}</p>
                    )}
                    <p style={styles.debugText}>
                      Push Manager: {debugInfo.pushManagerSupported ? '✅ Supported' : '❌ Not supported'}
                    </p>
                  </div>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>🔥 Firebase設定</h5>
                    <p style={styles.debugText}>
                      Config Valid: {debugInfo.firebaseConfigValid ? '✅ Valid' : '❌ Invalid'}
                    </p>
                    <p style={styles.debugText}>API Key: {debugInfo.firebaseApiKey}</p>
                    <p style={styles.debugText}>Project ID: {debugInfo.firebaseProjectId}</p>
                    <p style={styles.debugText}>VAPID Key: {debugInfo.firebaseVapidKey}</p>
                  </div>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>🎫 FCMトークン</h5>
                    <p style={styles.debugText}>Current Token: {debugInfo.currentFcmToken}</p>
                    {user?.fcm_token && (
                      <p style={styles.debugText}>
                        Token Preview: {user.fcm_token.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>⏰ タイムスタンプ</h5>
                    <p style={styles.debugText}>{debugInfo.timestamp}</p>
                    <p style={styles.debugText}>Last Test: {debugInfo.lastNotificationTest}</p>
                  </div>
                  
                  <div style={styles.debugSection}>
                    <h5 style={styles.debugSubtitle}>📱 PWA情報</h5>
                    <p style={styles.debugText}>
                      Installable: {isInstallable ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>
                      Installed: {isInstalled ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>Platform: {platform}</p>
                    <p style={styles.debugText}>
                      Can Show Prompt: {canShowInstallPrompt ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>Display Mode: {window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}</p>
                    <p style={styles.debugText}>
                      Standalone: {(navigator as any).standalone ? '✅ Yes' : '❌ No'}
                    </p>
                    
                    {/* PWA詳細デバッグ情報 */}
                    <h6 style={{...styles.debugSubtitle, fontSize: '12px', marginTop: '8px'}}>🔍 PWA詳細情報</h6>
                    <p style={styles.debugText}>User Agent: {navigator.userAgent}</p>
                    <p style={styles.debugText}>
                      Secure Context: {window.isSecureContext ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>
                      Service Worker Support: {'serviceWorker' in navigator ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>
                      Manifest Link: {document.querySelector('link[rel="manifest"]') ? '✅ Found' : '❌ Not found'}
                    </p>
                    <p style={styles.debugText}>
                      beforeinstallprompt fired: {debugInfo.pwaCanShowPrompt ? '✅ Yes' : '❌ No'}
                    </p>
                    <p style={styles.debugText}>Environment: {window.location.hostname}</p>
                    <button
                      style={{
                        ...styles.copyDebugButton,
                        marginTop: '8px',
                        backgroundColor: '#10b981',
                      }}
                      onClick={() => {
                        console.log('🔍 PWA Install Debug Test');
                        handlePWAInstall();
                      }}
                    >
                      🧪 PWAインストールテスト
                    </button>
                  </div>
                  
                  <button
                    style={styles.copyDebugButton}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
                      alert('デバッグ情報をクリップボードにコピーしました')
                    }}
                  >
                    📋 デバッグ情報をコピー
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div style={styles.settingItem}>
            <span style={styles.settingText}>言語設定</span>
            <span style={styles.settingValue}>日本語</span>
          </div>
          
          <div style={styles.settingItem}>
            <span style={styles.settingText}>バージョン情報</span>
            <span style={styles.settingValue}>ver0.1.0</span>
          </div>
        </div>

        <div style={styles.section}>
          <button style={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} color="#ffffff" />
            <span style={styles.logoutButtonText}>ログアウト</span>
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>© 2024 medic.web集配連絡システム</p>
          <p style={styles.footerText}>医療配送システム専用</p>
        </div>
      </div>

      {/* 新しいコース追加モーダル */}
      {showAddCourseModal && (
        <AddCourseModal
          userBase={user?.base || ''}
          registeredCourses={registeredCourses}
          onClose={() => setShowAddCourseModal(false)}
          onAdd={handleAddCourse}
        />
      )}
    </div>
  )
}

// 新しいコース追加モーダルコンポーネント
const AddCourseModal: React.FC<{
  userBase: string
  registeredCourses: RegisteredCourse[]
  onClose: () => void
  onAdd: (courseId: string, courseName: string) => void
}> = ({ userBase, registeredCourses, onClose, onAdd }) => {
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllCourses()
  }, [])

  const loadAllCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('base', userBase)
        .order('id')

      if (error) {
        console.error('Error fetching all courses:', error)
        return
      }

      // 既に登録済みのコースを除外
      const registeredCourseIds = registeredCourses.map(rc => rc.course_id)
      const availableCourses = (data || []).filter(course => 
        !registeredCourseIds.includes(course.id)
      )
      
      setAllCourses(availableCourses)
    } catch (error) {
      console.error('Error in loadAllCourses:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.courseSelectorModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>新しいコースを追加</h3>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.courseList}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <p style={styles.loadingText}>読み込み中...</p>
            </div>
          ) : (
            allCourses.map((course) => (
              <div
                key={course.id}
                style={styles.courseOption}
                onClick={() => {
                  onAdd(course.id, course.name)
                }}
              >
                <div style={styles.courseOptionContent}>
                  <div style={styles.courseOptionInfo}>
                    <p style={styles.courseOptionId}>{course.id}</p>
                    <p style={styles.courseOptionName}>{course.name}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {!loading && allCourses.length === 0 && (
            <div style={styles.emptyContainer}>
              <p style={styles.emptyText}>追加可能なコースがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  pageHeader: {
    backgroundColor: '#10b981',
    padding: '16px',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  userInfoSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb',
  },
  userInfoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  userInfoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  infoText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    margin: '0',
  },
  courseSelectionSection: {
    marginBottom: '20px',
  },
  registeredCoursesSection: {
    marginBottom: '20px',
  },
  registeredCoursesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0',
  },
  addCourseButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyRegisteredCourses: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center' as const,
    border: '1px solid #e5e7eb',
  },
  registeredCoursesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  registeredCourseItem: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeCourseButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  assignmentSection: {
    marginBottom: '20px',
  },
  assignmentButton: {
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid',
    cursor: 'pointer',
  },
  assignedButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  unassignedButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  assignmentButtonContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
  },
  courseId: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
    margin: '0 0 4px 0',
  },
  courseName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  assignedIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#10b981',
    padding: '6px 12px',
    borderRadius: '16px',
  },
  assignedText: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
  },
  unassignedIndicator: {
    padding: '6px 12px',
    borderRadius: '16px',
    backgroundColor: '#f3f4f6',
  },
  unassignedText: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center' as const,
    border: '1px solid #e5e7eb',
  },
  emptyText: {
    fontSize: '16px',
    color: '#9ca3af',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  emptySubText: {
    fontSize: '14px',
    color: '#d1d5db',
    margin: '0',
  },
  notificationSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb',
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  notificationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  notificationDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  notificationTitle: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500',
  },
  notificationSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  notificationButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '80px',
    transition: 'all 0.2s',
  },
  notificationButtonEnabled: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  notificationButtonDisabled: {
    backgroundColor: '#10b981',
    color: '#ffffff',
  },
  notificationButtonLoading: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  notificationButtonText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  loadingSpinner: {
    fontSize: '14px',
    fontWeight: '600',
  },
  notificationWarning: {
    fontSize: '12px',
    color: '#f59e0b',
    fontStyle: 'italic',
    margin: '0',
  },
  debugSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  debugToggleButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
  },
  debugInfo: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '16px',
    marginTop: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  debugTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  debugSubtitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '8px',
    marginTop: '12px',
    margin: '12px 0 8px 0',
  },
  debugText: {
    fontSize: '11px',
    color: '#6b7280',
    marginBottom: '4px',
    margin: '0 0 4px 0',
    wordBreak: 'break-all' as const,
  },
  copyDebugButton: {
    backgroundColor: '#4285f4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  settingItem: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    fontSize: '16px',
    color: '#374151',
  },
  settingValue: {
    fontSize: '16px',
    color: '#6b7280',
  },
  pwaSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb',
  },
  pwaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  pwaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  pwaDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  pwaTitle: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500',
  },
  pwaSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  pwaButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '120px',
    transition: 'all 0.2s',
  },
  pwaButtonEnabled: {
    backgroundColor: '#4285f4',
    color: '#ffffff',
  },
  pwaButtonDefault: {
    backgroundColor: '#10b981',
    color: '#ffffff',
  },
  pwaButtonText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  pwaInstalledText: {
    fontSize: '12px',
    color: '#10b981',
    fontStyle: 'italic',
    margin: '0',
  },
  pwaDescription: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: '0',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center' as const,
    paddingTop: '32px',
    paddingBottom: '16px',
  },
  footerText: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '4px',
    margin: '0 0 4px 0',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  courseSelectorModal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
  },
  courseList: {
    maxHeight: '400px',
    overflow: 'auto',
  },
  courseOption: {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  selectedCourseOption: {
    backgroundColor: '#f0fdf4',
  },
  courseOptionContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseOptionInfo: {
    flex: 1,
  },
  courseOptionId: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
    margin: '0 0 4px 0',
  },
  courseOptionName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1f2937',
    margin: '0',
  },
  emptyContainer: {
    padding: '32px',
    textAlign: 'center' as const,
  },
  adminSection: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    border: '2px solid #fecaca',
  },
  adminHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  adminTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#dc2626',
    margin: '0',
  },
  adminButton: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '12px',
  },
  adminButtonText: {
    fontSize: '16px',
    fontWeight: '600',
  },
  adminDescription: {
    fontSize: '14px',
    color: '#7f1d1d',
    margin: '0',
    fontStyle: 'italic',
  },
}

export default SettingsPage