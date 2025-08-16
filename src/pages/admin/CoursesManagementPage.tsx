import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Edit, Trash2, Search, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'
import { Course } from '../../types/auth'

const CoursesManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    base: ''
  })

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>コース管理</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('base', { ascending: true })
        .order('id', { ascending: true })

      if (error) {
        console.error('Error loading courses:', error)
        alert('コースデータの読み込みに失敗しました')
        return
      }

      setCourses(data || [])
    } catch (error) {
      console.error('Error in loadCourses:', error)
      alert('コースデータの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const filteredCourses = courses.filter(course =>
    course.id.includes(searchQuery) ||
    course.name.includes(searchQuery) ||
    course.base.includes(searchQuery)
  )

  const handleCreate = () => {
    setEditingCourse(null)
    setFormData({
      id: '',
      name: '',
      base: ''
    })
    setShowModal(true)
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      id: course.id,
      name: course.name,
      base: course.base || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`コース「${course.name}」を削除しますか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id)

      if (error) {
        console.error('Error deleting course:', error)
        alert('コースの削除に失敗しました')
        return
      }

      alert('コースを削除しました')
      await loadCourses()
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('コースの削除中にエラーが発生しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.id || !formData.name || !formData.base) {
      alert('すべての項目を入力してください')
      return
    }

    // 拠点コードの形式チェック（2桁の数字）
    if (!/^\d{2}$/.test(formData.base)) {
      alert('拠点コードは2桁の数字で入力してください（例: 01）')
      return
    }

    try {
      if (editingCourse) {
        // 更新
        const { error } = await supabase
          .from('courses')
          .update({
            name: formData.name,
            base: formData.base
          })
          .eq('id', editingCourse.id)

        if (error) {
          console.error('Error updating course:', error)
          alert('コースの更新に失敗しました')
          return
        }

        alert('コースを更新しました')
      } else {
        // 作成
        const { error } = await supabase
          .from('courses')
          .insert({
            id: formData.id,
            name: formData.name,
            base: formData.base
          })

        if (error) {
          console.error('Error creating course:', error)
          alert('コースの作成に失敗しました')
          return
        }

        alert('コースを作成しました')
      }

      setShowModal(false)
      await loadCourses()
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert('処理中にエラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>コース管理</h1>
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
        <h1 style={styles.headerTitle}>コース管理</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.toolbar}>
          <div style={styles.searchContainer}>
            <Search size={20} color="#6b7280" />
            <input
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="コースID、名前、拠点で検索..."
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
                <th style={styles.th}>コースID</th>
                <th style={styles.th}>コース名</th>
                <th style={styles.th}>拠点</th>
                <th style={styles.th}>作成日時</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.id} style={styles.tableRow}>
                  <td style={styles.td}>{course.id}</td>
                  <td style={styles.td}>{course.name}</td>
                  <td style={styles.td}>
                    <span style={styles.baseBadge}>
                      {course.base}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(course.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.editButton}
                        onClick={() => handleEdit(course)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(course)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCourses.length === 0 && (
            <div style={styles.emptyContainer}>
              <MapPin size={48} color="#9ca3af" />
              <p style={styles.emptyText}>
                {searchQuery ? '該当するコースが見つかりません' : 'コースがありません'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingCourse ? 'コース編集' : 'コース作成'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>コースID *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  disabled={!!editingCourse}
                  placeholder="例: A001"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>コース名 *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="例: 大阪中央コース"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>拠点コード *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.base}
                  onChange={(e) => setFormData({...formData, base: e.target.value})}
                  placeholder="例: 01"
                  pattern="\d{2}"
                  maxLength={2}
                  required
                />
                <p style={styles.helpText}>2桁の数字で入力してください</p>
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
                  {editingCourse ? '更新' : '作成'}
                </button>
              </div>
            </form>
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#ffffff',
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
  },
  createButton: {
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
  baseBadge: {
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
    maxWidth: '500px',
    maxHeight: '90%',
    overflow: 'auto',
    padding: '24px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '24px',
    margin: '0 0 24px 0',
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
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default CoursesManagementPage