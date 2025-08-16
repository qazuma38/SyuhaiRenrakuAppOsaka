import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Database, FileText, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'
import { CleanupLog } from '../../types/auth'

const CleanupLogsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [logs, setLogs] = useState<CleanupLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<CleanupLog | null>(null)
  const [showCsvModal, setShowCsvModal] = useState(false)

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

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('cleanup_date', { ascending: false })

      if (error) {
        console.error('Error loading cleanup logs:', error)
        alert('クリーンアップログの読み込みに失敗しました')
        return
      }

      setLogs(data || [])
    } catch (error) {
      console.error('Error in loadLogs:', error)
      alert('ログの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleDownloadCsv = (log: CleanupLog) => {
    if (!log.csv_content) {
      alert('CSVデータがありません')
      return
    }

    const blob = new Blob([log.csv_content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${log.table_name}_cleanup_${log.cleanup_date.split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewCsv = (log: CleanupLog) => {
    setSelectedLog(log)
    setShowCsvModal(true)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>クリーンアップログ</h1>
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
        <h1 style={styles.headerTitle}>クリーンアップログ</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.summarySection}>
          <Database size={48} color="#6366f1" />
          <h2 style={styles.summaryTitle}>データクリーンアップ履歴</h2>
          <p style={styles.summaryText}>
            15日以上古いレコードの削除履歴とアーカイブデータを管理します
          </p>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>実行日時</th>
                <th style={styles.th}>テーブル名</th>
                <th style={styles.th}>検出件数</th>
                <th style={styles.th}>削除件数</th>
                <th style={styles.th}>ファイルサイズ</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.dateCell}>
                      <Calendar size={16} color="#6b7280" />
                      <span>{new Date(log.cleanup_date).toLocaleString('ja-JP')}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.tableBadge}>
                      {log.table_name}
                    </span>
                  </td>
                  <td style={styles.td}>{log.records_found.toLocaleString()}</td>
                  <td style={styles.td}>{log.records_deleted.toLocaleString()}</td>
                  <td style={styles.td}>{formatFileSize(log.file_size)}</td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      {log.csv_content && (
                        <>
                          <button
                            style={styles.viewButton}
                            onClick={() => handleViewCsv(log)}
                            title="CSVプレビュー"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            style={styles.downloadButton}
                            onClick={() => handleDownloadCsv(log)}
                            title="CSVダウンロード"
                          >
                            <Download size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div style={styles.emptyContainer}>
              <Database size={48} color="#9ca3af" />
              <p style={styles.emptyText}>クリーンアップログがありません</p>
            </div>
          )}
        </div>
      </div>

      {/* CSV表示モーダル */}
      {showCsvModal && selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setShowCsvModal(false)}>
          <div style={styles.csvModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {selectedLog.table_name} - CSV プレビュー
              </h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowCsvModal(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.csvPreview}>
              <pre style={styles.csvContent}>
                {selectedLog.csv_content?.substring(0, 5000)}
                {selectedLog.csv_content && selectedLog.csv_content.length > 5000 && '\n\n... (省略されました)'}
              </pre>
            </div>
            
            <div style={styles.modalActions}>
              <button
                style={styles.downloadModalButton}
                onClick={() => handleDownloadCsv(selectedLog)}
              >
                <Download size={16} />
                <span>ダウンロード</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
    margin: '0',
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
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tableBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  viewButton: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 32px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginTop: '16px',
    margin: '16px 0 0 0',
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
  csvModal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '80%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
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
  csvPreview: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    backgroundColor: '#f9fafb',
  },
  csvContent: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#374151',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  modalActions: {
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  downloadModalButton: {
    backgroundColor: '#10b981',
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
}

export default CleanupLogsPage