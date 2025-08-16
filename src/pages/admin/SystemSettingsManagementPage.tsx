import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Settings, Save, RotateCcw } from 'lucide-react'
import { SystemSettingService } from '../../lib/systemSettingService'
import { useAppSelector } from '../../hooks/useAppSelector'
import { SystemSetting } from '../../types/auth'

const SystemSettingsManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messageIconSettings, setMessageIconSettings] = useState({
    showPickupYesIcon: true,
    showPickupNoIcon: true,
    showRePickupIcon: true,
    messageIconDisplayEnabled: true
  })

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>システム設定管理</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const loadSettings = async () => {
    try {
      const [allSettings, iconSettings] = await Promise.all([
        SystemSettingService.getSystemSettings(),
        SystemSettingService.getMessageIconSettings()
      ])
      
      setSettings(allSettings)
      setMessageIconSettings(iconSettings)
    } catch (error) {
      console.error('Error loading settings:', error)
      alert('設定データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      console.log('Saving settings:', messageIconSettings)
      const success = await SystemSettingService.updateMessageIconSettings(messageIconSettings)
      
      if (success) {
        alert('設定を保存しました')
        await loadSettings() // 設定を再読み込み
      } else {
        alert('設定の保存に失敗しました')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('設定の保存中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (!window.confirm('設定をデフォルト値にリセットしますか？')) {
      return
    }

    setSaving(true)
    try {
      const defaultSettings = {
        showPickupYesIcon: true,
        showPickupNoIcon: true,
        showRePickupIcon: true,
        messageIconDisplayEnabled: true
      }

      const success = await SystemSettingService.updateMessageIconSettings(defaultSettings)
      
      if (success) {
        setMessageIconSettings(defaultSettings)
        alert('設定をリセットしました')
        await loadSettings()
      } else {
        alert('設定のリセットに失敗しました')
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
      alert('設定のリセット中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>システム設定管理</h1>
        </div>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/admin')}>
          <ChevronLeft size={24} color="#ffffff" />
        </button>
        <h1 style={styles.headerTitle}>システム設定管理</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <Settings size={24} color="#6366f1" />
            <h3 style={styles.sectionTitle}>メッセージアイコン表示設定</h3>
          </div>

          <div style={styles.settingsCard}>
            <div style={styles.settingItem}>
              <div style={styles.settingInfo}>
                <span style={styles.settingLabel}>メッセージアイコン表示機能</span>
                <span style={styles.settingDescription}>
                  メッセージ画面でのアイコン表示機能全体の有効/無効
                </span>
              </div>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={messageIconSettings.messageIconDisplayEnabled}
                  onChange={(e) => setMessageIconSettings({
                    ...messageIconSettings,
                    messageIconDisplayEnabled: e.target.checked
                  })}
                />
                <span style={styles.slider}></span>
              </label>
            </div>

            <div style={{
              ...styles.settingItem,
              ...(messageIconSettings.messageIconDisplayEnabled ? {} : styles.disabledSetting)
            }}>
              <div style={styles.settingInfo}>
                <span style={styles.settingLabel}>「検体あり」アイコン表示</span>
                <span style={styles.settingDescription}>
                  メッセージ画面で「検体あり」のアイコンを表示する
                </span>
              </div>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={messageIconSettings.showPickupYesIcon}
                  disabled={!messageIconSettings.messageIconDisplayEnabled}
                  onChange={(e) => setMessageIconSettings({
                    ...messageIconSettings,
                    showPickupYesIcon: e.target.checked
                  })}
                />
                <span style={styles.slider}></span>
              </label>
            </div>

            <div style={{
              ...styles.settingItem,
              ...(messageIconSettings.messageIconDisplayEnabled ? {} : styles.disabledSetting)
            }}>
              <div style={styles.settingInfo}>
                <span style={styles.settingLabel}>「検体なし」アイコン表示</span>
                <span style={styles.settingDescription}>
                  メッセージ画面で「検体なし」のアイコンを表示する
                </span>
              </div>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={messageIconSettings.showPickupNoIcon}
                  disabled={!messageIconSettings.messageIconDisplayEnabled}
                  onChange={(e) => setMessageIconSettings({
                    ...messageIconSettings,
                    showPickupNoIcon: e.target.checked
                  })}
                />
                <span style={styles.slider}></span>
              </label>
            </div>

            <div style={{
              ...styles.settingItem,
              ...(messageIconSettings.messageIconDisplayEnabled ? {} : styles.disabledSetting)
            }}>
              <div style={styles.settingInfo}>
                <span style={styles.settingLabel}>「再集配」アイコン表示</span>
                <span style={styles.settingDescription}>
                  メッセージ画面で「再集配」のアイコンを表示する
                </span>
              </div>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={messageIconSettings.showRePickupIcon}
                  disabled={!messageIconSettings.messageIconDisplayEnabled}
                  onChange={(e) => setMessageIconSettings({
                    ...messageIconSettings,
                    showRePickupIcon: e.target.checked
                  })}
                />
                <span style={styles.slider}></span>
              </label>
            </div>
          </div>

          <div style={styles.actionButtons}>
            <button
              style={styles.resetButton}
              onClick={handleResetSettings}
              disabled={saving}
            >
              <RotateCcw size={16} />
              <span>デフォルトに戻す</span>
            </button>
            <button
              style={{
                ...styles.saveButton,
                ...(saving ? styles.saveButtonDisabled : {})
              }}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? '保存中...' : '設定を保存'}</span>
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>全設定一覧</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>設定キー</th>
                  <th style={styles.th}>設定値</th>
                  <th style={styles.th}>説明</th>
                  <th style={styles.th}>更新日時</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.id} style={styles.tableRow}>
                    <td style={styles.td}>{setting.setting_key}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.valueBadge,
                        backgroundColor: setting.setting_value === 'true' ? '#dcfce7' : '#fee2e2',
                        color: setting.setting_value === 'true' ? '#16a34a' : '#dc2626'
                      }}>
                        {setting.setting_value}
                      </span>
                    </td>
                    <td style={styles.td}>{setting.description || '-'}</td>
                    <td style={styles.td}>
                      {new Date(setting.updated_at).toLocaleString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    backgroundColor: '#6366f1',
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    marginRight: '12px',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0',
  },
  content: {
    flex: 1,
    padding: '24px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  disabledSetting: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: '16px',
  },
  settingLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'block',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '14px',
    color: '#6b7280',
    display: 'block',
  },
  switch: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '60px',
    height: '34px',
  },
  slider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '.4s',
    borderRadius: '34px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  resetButton: {
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '16px',
    textAlign: 'left' as const,
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1f2937',
  },
  valueBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: '18px',
    color: '#ef4444',
    textAlign: 'center' as const,
  },
}

export default SystemSettingsManagementPage