import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  canShowInstallPrompt: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  debugInfo: {
    userAgent: string;
    isSecureContext: boolean;
    hasServiceWorker: boolean;
    hasManifest: boolean;
    displayMode: string;
    standalone: boolean;
    eventsFired: string[];
    lastError: string | null;
    manifestUrl: string | null;
    manifestContent: any;
  };
}

export function usePWAInstall() {
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    platform: 'unknown',
    canShowInstallPrompt: false,
    installPrompt: null,
    debugInfo: {
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasManifest: false,
      displayMode: 'browser',
      standalone: false,
      eventsFired: [],
      lastError: null,
      manifestUrl: null,
      manifestContent: null,
    },
  });

  // デバッグ情報を更新する関数
  const updateDebugInfo = (updates: Partial<PWAInstallState['debugInfo']>) => {
    setInstallState(prev => ({
      ...prev,
      debugInfo: {
        ...prev.debugInfo,
        ...updates,
      },
    }));
  };

  // イベントを記録する関数
  const logEvent = (event: string) => {
    console.log(`PWA Debug: ${event}`);
    updateDebugInfo({
      eventsFired: [...installState.debugInfo.eventsFired, `${new Date().toISOString()}: ${event}`],
    });
  };

  useEffect(() => {
    logEvent('usePWAInstall hook initialized');

    // プラットフォーム検出
    const detectPlatform = (): 'android' | 'ios' | 'desktop' | 'unknown' => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (/android/i.test(userAgent)) {
        logEvent('Platform detected: Android');
        return 'android';
      } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        logEvent('Platform detected: iOS');
        return 'ios';
      } else if (/windows|mac|linux/i.test(userAgent)) {
        logEvent('Platform detected: Desktop');
        return 'desktop';
      }
      
      logEvent('Platform detected: Unknown');
      return 'unknown';
    };

    // PWAがすでにインストールされているかチェック
    const checkIfInstalled = (): boolean => {
      // スタンドアローンモードで実行されているかチェック
      if (window.matchMedia('(display-mode: standalone)').matches) {
        logEvent('PWA is installed (standalone mode)');
        return true;
      }
      
      // iOS Safari のホーム画面追加チェック
      if ((navigator as any).standalone === true) {
        logEvent('PWA is installed (iOS standalone)');
        return true;
      }
      
      // Android Chrome のTWA（Trusted Web Activity）チェック
      if (document.referrer.includes('android-app://')) {
        logEvent('PWA is installed (TWA)');
        return true;
      }
      
      logEvent('PWA is not installed');
      return false;
    };

    // マニフェストファイルの存在確認
    const checkManifest = async () => {
      try {
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink) {
          const manifestUrl = manifestLink.href;
          updateDebugInfo({ 
            hasManifest: true, 
            manifestUrl: manifestUrl 
          });
          logEvent(`Manifest found: ${manifestUrl}`);

          // マニフェストの内容を取得
          try {
            const response = await fetch(manifestUrl);
            const manifestContent = await response.json();
            updateDebugInfo({ manifestContent });
            logEvent('Manifest content loaded successfully');
          } catch (error) {
            logEvent(`Failed to load manifest content: ${error}`);
            updateDebugInfo({ lastError: `Manifest load error: ${error}` });
          }
        } else {
          logEvent('No manifest link found');
          updateDebugInfo({ hasManifest: false });
        }
      } catch (error) {
        logEvent(`Manifest check error: ${error}`);
        updateDebugInfo({ lastError: `Manifest check error: ${error}` });
      }
    };

    // Service Worker の状態確認
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            logEvent('Service Worker is registered');
          } else {
            logEvent('Service Worker is not registered');
          }
        } catch (error) {
          logEvent(`Service Worker check error: ${error}`);
          updateDebugInfo({ lastError: `Service Worker error: ${error}` });
        }
      } else {
        logEvent('Service Worker not supported');
      }
    };

    // PWA条件の詳細チェック
    const checkPWARequirements = () => {
      const requirements = {
        manifest: !!document.querySelector('link[rel="manifest"]'),
        serviceWorker: 'serviceWorker' in navigator,
        secureContext: window.isSecureContext,
        notStackBlitz: !window.location.hostname.includes('stackblitz') && 
                      !window.location.hostname.includes('webcontainer') &&
                      !window.location.hostname.includes('bolt.new'),
        isAndroidChrome: /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent),
      };
      
      logEvent(`PWA Requirements: ${JSON.stringify(requirements)}`);
      console.log('🔍 PWA Requirements Check:', requirements);
      
      return requirements;
    };

    const requirements = checkPWARequirements();
    const platform = detectPlatform();
    const isInstalled = checkIfInstalled();

    // 表示モードの検出
    const displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
    const standalone = (navigator as any).standalone === true;

    // PWA条件が満たされている場合のみインストール可能とする
    const meetsBasicRequirements = requirements.manifest && 
                                  requirements.serviceWorker && 
                                  requirements.secureContext;

    updateDebugInfo({
      displayMode,
      standalone,
    });

    setInstallState(prev => ({
      ...prev,
      platform,
      isInstalled,
      isInstallable: meetsBasicRequirements && !isInstalled,
    }));

    // 非同期チェック
    checkManifest();
    checkServiceWorker();

    // Android Chrome用のbeforeinstallpromptイベント
    const handleBeforeInstallPrompt = (e: Event) => {
      logEvent('beforeinstallprompt event fired');
      console.log('🎯 PWA: beforeinstallprompt event fired!', e);
      e.preventDefault();
      
      const installEvent = e as BeforeInstallPromptEvent;
      
      logEvent(`Install prompt platforms: ${installEvent.platforms?.join(', ') || 'unknown'}`);
      
      setInstallState(prev => ({
        ...prev,
        isInstallable: true,
        canShowInstallPrompt: true,
        installPrompt: installEvent,
      }));
    };

    // PWAがインストールされた時のイベント
    const handleAppInstalled = () => {
      logEvent('appinstalled event fired');
      console.log('PWA: App was installed');
      
      setInstallState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        canShowInstallPrompt: false,
        installPrompt: null,
      }));
    };

    // iOS Safari用のインストール可能性チェック
    const checkIOSInstallability = () => {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
      const isStandalone = (navigator as any).standalone === true;
      
      logEvent(`iOS check - isIOS: ${isIOS}, isSafari: ${isSafari}, isStandalone: ${isStandalone}`);
      
      if (isIOS && isSafari && !isStandalone) {
        logEvent('iOS PWA installable');
        setInstallState(prev => ({
          ...prev,
          isInstallable: true,
        }));
      }
    };

    // イベントリスナーの設定
    logEvent('Setting up event listeners');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS用のチェック
    checkIOSInstallability();

    // 初期状態のログ
    setTimeout(() => {
      logEvent(`Initial state - Platform: ${platform}, Installed: ${isInstalled}, Secure: ${window.isSecureContext}`);
    }, 1000);

    // クリーンアップ
    return () => {
      logEvent('Cleaning up event listeners');
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Android Chrome用のインストール実行
  const installPWA = async (): Promise<boolean> => {
    logEvent('installPWA called');
    
    if (!installState.installPrompt) {
      const error = 'No install prompt available';
      logEvent(error);
      updateDebugInfo({ lastError: error });
      console.warn('PWA:', error);
      return false;
    }

    try {
      logEvent('Showing install prompt');
      console.log('PWA: Showing install prompt');
      await installState.installPrompt.prompt();
      
      logEvent('Waiting for user choice');
      const choiceResult = await installState.installPrompt.userChoice;
      logEvent(`User choice: ${choiceResult.outcome} on ${choiceResult.platform}`);
      console.log('PWA: User choice:', choiceResult);
      
      if (choiceResult.outcome === 'accepted') {
        logEvent('Installation accepted');
        setInstallState(prev => ({
          ...prev,
          installPrompt: null,
          canShowInstallPrompt: false,
        }));
        return true;
      } else {
        logEvent('Installation dismissed');
      }
      
      return false;
    } catch (error) {
      const errorMsg = `Error during installation: ${error}`;
      logEvent(errorMsg);
      updateDebugInfo({ lastError: errorMsg });
      console.error('PWA:', errorMsg);
      return false;
    }
  };

  // iOS Safari用のインストール手順表示
  const showIOSInstructions = (): void => {
    logEvent('Showing iOS instructions');
    const instructions = `
iPhoneでアプリをインストールするには：

1. 画面下部の共有ボタン（□↑）をタップ
2. 「ホーム画面に追加」を選択
3. 「追加」をタップして完了

これでホーム画面からアプリを起動できます！
    `.trim();

    alert(instructions);
  };

  // デスクトップ用のインストール手順
  const showDesktopInstructions = (): void => {
    logEvent('Showing desktop instructions');
    const instructions = `
デスクトップでアプリをインストールするには：

Chrome:
1. アドレスバー右側のインストールアイコンをクリック
2. または、メニュー > その他のツール > ショートカットを作成

Edge:
1. アドレスバー右側のアプリアイコンをクリック
2. 「インストール」をクリック

これでデスクトップからアプリを起動できます！
    `.trim();

    alert(instructions);
  };

  // デバッグ情報をコンソールに出力
  const logDebugInfo = () => {
    console.group('PWA Install Debug Info');
    console.log('Install State:', installState);
    console.log('Debug Info:', installState.debugInfo);
    console.groupEnd();
  };

  return {
    ...installState,
    installPWA,
    showIOSInstructions,
    showDesktopInstructions,
    logDebugInfo,
  };
}