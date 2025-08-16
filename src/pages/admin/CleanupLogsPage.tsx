import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Database, Play, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'

const CleanupLogsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [executing, setExecuting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>クリーンアップログ</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const handleManualCleanup = async () => {
    if (!window.confirm('データクリーンアップを手動実行しますか？\n\n⚠️ 15日以上古いレコードが削除されます。\n削除前にCSVファイルとしてアーカイブされます。')) {
      return
    }

    setExecuting(true)
    try {
      console.log('Executing manual cleanup...')
      const { data, error } = await supabase.functions.invoke('cleanup-old-data', {
        body: {}
      })

      if (error) {
        console.error('Error executing cleanup:', error)
        alert(`クリーンアップの実行に失敗しました: ${error.message}`)
        return
      }

      console.log('Cleanup result:', data)
      if (data?.success) {
        alert(`✅ クリーンアップが完了しました\n\n${data.message}\n\n詳細:\n${JSON.stringify(data.summary?.details || [], null, 2)}`)
      } else {
        alert(`❌ クリーンアップでエラーが発生しました\n\n${data?.error || '不明なエラー'}\n\n詳細: ${data?.details || ''}`)
      }
    } catch (error) {
      console.error('Error in handleManualCleanup:', error)
      alert(`クリーンアップの実行中にエラーが発生しました: ${error}`)
    } finally {
      setExecuting(false)
    }
  }

  const handleDownloadCleanupLogs = async () => {
    setDownloading(true)
    try {
      console.log('Downloading cleanup logs...')
      
      // cleanup_logsテーブルの全データを取得
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('cleanup_date', { ascending: false })

      if (error) {
        console.error('Error fetching cleanup logs:', error)
        alert(`クリーンアップログの取得に失敗しました: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        alert('ダウンロードするデータがありません')
        return
      }

      // CSVヘッダーを作成
      const headers = [
        'ID',
        'クリーンアップ日時',
        'テーブル名',
        '検出件数',
        '削除件数',
        'ファイルサイズ',
        '作成日時'
      ]

      // CSVデータを作成
      const csvRows = data.map(log => [
        log.id,
        new Date(log.cleanup_date).toLocaleString('ja-JP'),
        log.table_name,
        log.records_found.toString(),
        log.records_deleted.toString(),
        log.file_size ? log.file_size.toString() : '',
        new Date(log.created_at).toLocaleString('ja-JP')
      ])

      // CSVコンテンツを生成
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => {
          // セルにカンマ、引用符、改行が含まれている場合はエスケープ
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(','))
      ].join('\n')

      // BOMを追加してExcelで文字化けを防ぐ
      const bom = '\uFEFF'
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
      
      // ダウンロード実行
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `cleanup_logs_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // URLオブジェクトをクリーンアップ
      URL.revokeObjectURL(url)
      
      console.log('Cleanup logs CSV downloaded successfully')
      alert('✅ クリーンアップログをCSVファイルとしてダウンロードしました')
      
    } catch (error) {
      console.error('Error in handleDownloadCleanupLogs:', error)
      alert(`CSVダウンロード中にエラーが発生しました: ${error}`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/admin')}>
          <ChevronLeft size={24} color="#ffffff" />
        </button>
        <h1 style={styles.headerTitle}>クリーンアップログ</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.summarySection}>
          <Database size={48} color="#6366f1" />
          <h2 style={styles.summaryTitle}>データクリーンアップ管理</h2>
          <p style={styles.summaryText}>
            15日以上古いレコードの削除とクリーンアップログの管理
          </p>
          
          <div style={styles.actionsContainer}>
            <button
              style={{
                ...styles.manualExecuteButton,
                ...(executing ? styles.manualExecuteButtonDisabled : {}),
              }}
              onClick={handleManualCleanup}
              disabled={executing}
            >
              {executing ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>実行中...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>手動実行</span>
                </>
              )}
            </button>
            
            <button
              style={{
                ...styles.downloadButton,
                ...(downloading ? styles.downloadButtonDisabled : {}),
              }}
              onClick={handleDownloadCleanupLogs}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>ダウンロード中...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>ログをCSVダウンロード</span>
                </>
              )}
            </button>
          </div>
          
          <div style={styles.descriptionsContainer}>
            <p style={styles.actionDescription}>
              <strong>手動実行:</strong> スケジュールを待たずに即座にクリーンアップを実行
            </p>
            <p style={styles.actionDescription}>
              <strong>CSVダウンロード:</strong> cleanup_logsテーブル全体をCSVファイルとしてダウンロード
            </p>
          </div>
        </div>

        <div style={styles.infoSection}>
          <h3 style={styles.infoTitle}>クリーンアップについて</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <h4 style={styles.infoCardTitle}>対象テーブル</h4>
              <ul style={styles.infoList}>
                <li>message_logs</li>
                <li>user_sessions</li>
                <li>chat_messages</li>
              </ul>
            </div>
            
            <div style={styles.infoCard}>
              <h4 style={styles.infoCardTitle}>削除基準</h4>
              <p style={styles.infoText}>15日以上古いレコード</p>
            </div>
            
            <div style={styles.infoCard}>
              <h4 style={styles.infoCardTitle}>自動実行</h4>
              <p style={styles.infoText}>毎週日曜日 午前2:00-2:05（JST）</p>
            </div>
            
            <div style={styles.infoCard}>
              <h4 style={styles.infoCardTitle}>アーカイブ</h4>
              <p style={styles.infoText}>削除前にCSV形式でデータベースに保存</p>
            </div>
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
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center' as const,
    marginBottom: '32px',
    border: '1px solid #e5e7eb',
  },
  summaryTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '16px 0 8px 0',
  },
  summaryText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 32px 0',
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  manualExecuteButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    minWidth: '160px',
    justifyContent: 'center',
  },
  manualExecuteButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  downloadButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    minWidth: '200px',
    justifyContent: 'center',
  },
  downloadButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  descriptionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    textAlign: 'left' as const,
    maxWidth: '600px',
    margin: '0 auto',
  },
  actionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
    lineHeight: '1.5',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  infoTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  infoCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  infoText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
    lineHeight: '1.5',
  },
  infoList: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
    paddingLeft: '16px',
    lineHeight: '1.5',
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

export default CleanupLogsPage