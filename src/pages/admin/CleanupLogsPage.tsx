import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Database, Play, RefreshCw, Plus, Edit, Trash2, Search, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'
import { CleanupLog } from '../../types/auth'

const CleanupLogsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [executing, setExecuting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [cleanupLogs, setCleanupLogs] = useState<CleanupLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingLog, setEditingLog] = useState<CleanupLog | null>(null)
  const [previewingLog, setPreviewingLog] = useState<CleanupLog | null>(null)
  const [formData, setFormData] = useState({
    cleanup_date: '',
    table_name: '',
    records_found: 0,
    records_deleted: 0,
    csv_content: '',
    file_size: 0
  })

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

  const loadCleanupLogs = async () => {
    try {
      console.log('Loading cleanup logs...')
      console.log('Current user:', currentUser)
      
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('cleanup_date', { ascending: false })

      if (error) {
        console.error('Error loading cleanup logs:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert('クリーンアップログの読み込みに失敗しました')
        return
      }

      console.log('Cleanup logs loaded:', data)
      console.log('Number of records:', data?.length || 0)
      setCleanupLogs(data || [])
    } catch (error) {
      console.error('Error in loadCleanupLogs:', error)
      alert('クリーンアップログの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('CleanupLogsPage mounted, loading data...')
    loadCleanupLogs()
  }, [])

  const filteredLogs = cleanupLogs.filter(log =>
    log.table_name.includes(searchQuery) ||
    new Date(log.cleanup_date).toLocaleDateString('ja-JP').includes(searchQuery)
  )

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
        await loadCleanupLogs() // ログを再読み込み
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
      
      // cleanup_logsテーブルの全データを取得（管理者権限で）
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('cleanup_date', { ascending: false })

      if (error) {
        console.error('Error fetching cleanup logs:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`クリーンアップログの取得に失敗しました: ${error.message}`)
        return
      }

      console.log('Downloaded cleanup logs data:', data)
      console.log('Number of records for download:', data?.length || 0)
      
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

  const handleCreate = () => {
    setEditingLog(null)
    setFormData({
      cleanup_date: new Date().toISOString(),
      table_name: '',
      records_found: 0,
      records_deleted: 0,
      csv_content: '',
      file_size: 0
    })
    setShowModal(true)
  }

  const handleEdit = (log: CleanupLog) => {
    setEditingLog(log)
    setFormData({
      cleanup_date: log.cleanup_date,
      table_name: log.table_name,
      records_found: log.records_found,
      records_deleted: log.records_deleted,
      csv_content: log.csv_content || '',
      file_size: log.file_size || 0
    })
    setShowModal(true)
  }

  const handleDelete = async (log: CleanupLog) => {
    if (!window.confirm(`${new Date(log.cleanup_date).toLocaleDateString('ja-JP')}の${log.table_name}のクリーンアップログを削除しますか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('cleanup_logs')
        .delete()
        .eq('id', log.id)

      if (error) {
        console.error('Error deleting cleanup log:', error)
        alert('クリーンアップログの削除に失敗しました')
        return
      }

      alert('クリーンアップログを削除しました')
      await loadCleanupLogs()
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('クリーンアップログの削除中にエラーが発生しました')
    }
  }

  const handlePreview = (log: CleanupLog) => {
    setPreviewingLog(log)
    setShowPreviewModal(true)
  }

  const handleDownloadSingle = (log: CleanupLog) => {
    if (!log.csv_content) {
      alert('CSVデータがありません')
      return
    }

    try {
      // BOMを追加してExcelで文字化けを防ぐ
      const bom = '\uFEFF'
      const blob = new Blob([bom + log.csv_content], { type: 'text/csv;charset=utf-8;' })
      
      // ダウンロード実行
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const fileName = `${log.table_name}_${new Date(log.cleanup_date).toISOString().split('T')[0]}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // URLオブジェクトをクリーンアップ
      URL.revokeObjectURL(url)
      
      console.log('Single cleanup log CSV downloaded successfully')
    } catch (error) {
      console.error('Error downloading single CSV:', error)
      alert('CSVダウンロード中にエラーが発生しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.table_name || !formData.cleanup_date) {
      alert('必須項目を入力してください')
      return
    }

    try {
      if (editingLog) {
        // 更新
        const { error } = await supabase
          .from('cleanup_logs')
          .update({
            cleanup_date: formData.cleanup_date,
            table_name: formData.table_name,
            records_found: formData.records_found,
            records_deleted: formData.records_deleted,
            csv_content: formData.csv_content,
            file_size: formData.file_size
          })
          .eq('id', editingLog.id)

        if (error) {
          console.error('Error updating cleanup log:', error)
          alert('クリーンアップログの更新に失敗しました')
          return
        }

        alert('クリーンアップログを更新しました')
      } else {
        // 作成
        const { error } = await supabase
          .from('cleanup_logs')
          .insert({
            cleanup_date: formData.cleanup_date,
            table_name: formData.table_name,
            records_found: formData.records_found,
            records_deleted: formData.records_deleted,
            csv_content: formData.csv_content,
            file_size: formData.file_size
          })

        if (error) {
          console.error('Error creating cleanup log:', error)
          alert('クリーンアップログの作成に失敗しました')
          return
        }

        alert('クリーンアップログを作成しました')
      }

      setShowModal(false)
      await loadCleanupLogs()
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert('処理中にエラーが発生しました')
    }
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

        {/* CRUD機能 */}
        <div style={styles.crudSection}>
          <div style={styles.toolbar}>
            <div style={styles.searchContainer}>
              <Search size={20} color="#6b7280" />
              <input
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="テーブル名、日付で検索..."
              />
            </div>
            <button style={styles.createButton} onClick={handleCreate}>
              <Plus size={20} color="#ffffff" />
              <span>新規作成</span>
            </button>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>クリーンアップ日時</th>
                  <th style={styles.th}>テーブル名</th>
                  <th style={styles.th}>検出件数</th>
                  <th style={styles.th}>削除件数</th>
                  <th style={styles.th}>ファイルサイズ</th>
                  <th style={styles.th}>作成日時</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      {new Date(log.cleanup_date).toLocaleString('ja-JP')}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.tableBadge}>
                        {log.table_name}
                      </span>
                    </td>
                    <td style={styles.td}>{log.records_found}</td>
                    <td style={styles.td}>{log.records_deleted}</td>
                    <td style={styles.td}>{formatFileSize(log.file_size)}</td>
                    <td style={styles.td}>
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.previewButton}
                          onClick={() => handlePreview(log)}
                          title="CSVプレビュー"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          style={styles.downloadSingleButton}
                          onClick={() => handleDownloadSingle(log)}
                          title="CSVダウンロード"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          style={styles.editButton}
                          onClick={() => handleEdit(log)}
                          title="編集"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDelete(log)}
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div style={styles.emptyContainer}>
                <Database size={48} color="#9ca3af" />
                <p style={styles.emptyText}>
                  {searchQuery ? '該当するログが見つかりません' : 'クリーンアップログがありません'}
                </p>
              </div>
            )}
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

      {/* 作成・編集モーダル */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingLog ? 'クリーンアップログ編集' : 'クリーンアップログ作成'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>クリーンアップ日時 *</label>
                <input
                  style={styles.input}
                  type="datetime-local"
                  value={formData.cleanup_date.slice(0, 16)}
                  onChange={(e) => setFormData({...formData, cleanup_date: e.target.value + ':00.000Z'})}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>テーブル名 *</label>
                <select
                  style={styles.select}
                  value={formData.table_name}
                  onChange={(e) => setFormData({...formData, table_name: e.target.value})}
                  required
                >
                  <option value="">テーブルを選択してください</option>
                  <option value="message_logs">message_logs</option>
                  <option value="user_sessions">user_sessions</option>
                  <option value="chat_messages">chat_messages</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>検出件数</label>
                <input
                  style={styles.input}
                  type="number"
                  value={formData.records_found}
                  onChange={(e) => setFormData({...formData, records_found: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>削除件数</label>
                <input
                  style={styles.input}
                  type="number"
                  value={formData.records_deleted}
                  onChange={(e) => setFormData({...formData, records_deleted: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>CSVコンテンツ</label>
                <textarea
                  style={styles.textarea}
                  value={formData.csv_content}
                  onChange={(e) => {
                    const content = e.target.value
                    const size = new TextEncoder().encode(content).length
                    setFormData({
                      ...formData, 
                      csv_content: content,
                      file_size: size
                    })
                  }}
                  placeholder="CSVデータを入力してください..."
                  rows={10}
                />
                <p style={styles.helpText}>
                  ファイルサイズ: {formatFileSize(formData.file_size)}
                </p>
              </div>

              <div style={styles.modalButtons}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  キャンセル
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingLog ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSVプレビューモーダル */}
      {showPreviewModal && previewingLog && (
        <div style={styles.modalOverlay} onClick={() => setShowPreviewModal(false)}>
          <div style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <h3 style={styles.modalTitle}>
                CSVプレビュー - {previewingLog.table_name}
              </h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowPreviewModal(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.previewInfo}>
              <p><strong>日時:</strong> {new Date(previewingLog.cleanup_date).toLocaleString('ja-JP')}</p>
              <p><strong>検出件数:</strong> {previewingLog.records_found}</p>
              <p><strong>削除件数:</strong> {previewingLog.records_deleted}</p>
              <p><strong>ファイルサイズ:</strong> {formatFileSize(previewingLog.file_size)}</p>
            </div>
            
            <div style={styles.csvPreview}>
              <pre style={styles.csvContent}>
                {previewingLog.csv_content || 'CSVデータがありません'}
              </pre>
            </div>
            
            <div style={styles.previewButtons}>
              <button
                style={styles.downloadSingleButton}
                onClick={() => handleDownloadSingle(previewingLog)}
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
  crudSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    marginBottom: '32px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    gap: '12px',
    flex: 1,
    maxWidth: '400px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#1f2937',
    backgroundColor: 'transparent',
  },
  createButton: {
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
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
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
  previewButton: {
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
  downloadSingleButton: {
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
  editButton: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
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
  emptySubText: {
    fontSize: '14px',
    color: '#9ca3af',
    marginTop: '8px',
    margin: '8px 0 0 0',
    textAlign: 'center' as const,
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
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90%',
    overflow: 'auto',
    padding: '24px',
  },
  previewModal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '95%',
    maxWidth: '800px',
    maxHeight: '90%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
  },
  previewInfo: {
    padding: '16px 24px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#374151',
  },
  csvPreview: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
    backgroundColor: '#f8fafc',
  },
  csvContent: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#374151',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  previewButtons: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
    fontFamily: 'monospace',
    resize: 'vertical' as const,
  },
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    margin: '4px 0 0 0',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '32px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default CleanupLogsPage