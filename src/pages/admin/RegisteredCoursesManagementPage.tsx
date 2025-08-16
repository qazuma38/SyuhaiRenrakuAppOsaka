import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Edit, Trash2, Search, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'

interface RegisteredCourse {
  employee_id: string
  course_id: string
  course_name: string
  created_at: string
  employee_name?: string
  employee_base?: string
}

const RegisteredCoursesManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RegisteredCourse | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    course_id: '',
    course_name: ''
  })

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>登録コース管理</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const loadData = async () => {
    try {
      // 登録コースデータを取得
      const { data: registeredData, error: registeredError } = await supabase
        .from('registered_courses')
        .select(`
          *,
          users!registered_courses_employee_id_fkey(name, base)
        `)
        .order('created_at', { ascending: false })

      if (registeredError) {
        console.error('Error loading registered courses:', registeredError)
        alert('登録コースデータの読み込みに失敗しました')
        return
      }

      // データを整形
      const formattedData = (registeredData || []).map(item => ({
        employee_id: item.employee_id,
        course_id: item.course_id,
        course_name: item.course_name,
        created_at: item.created_at,
        employee_name: item.users?.name || '',
        employee_base: item.users?.base || ''
      }))

      setRegisteredCourses(formattedData)

      // 社員一覧を取得
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select('id, name, base')
        .eq('user_type', 'employee')
        .order('id')

      if (employeesError) {
        console.error('Error loading employees:', employeesError)
      } else {
        setEmployees(employeesData || [])
      }

      // コース一覧を取得
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, base')
        .order('id')

      if (coursesError) {
        console.error('Error loading courses:', coursesError)
      } else {
        setCourses(coursesData || [])
      }

    } catch (error) {
      console.error('Error in loadData:', error)
      alert('データの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRecords = registeredCourses.filter(record =>
    record.employee_id.includes(searchQuery) ||
    record.course_id.includes(searchQuery) ||
    record.course_name.includes(searchQuery) ||
    (record.employee_name && record.employee_name.includes(searchQuery))
  )

  const handleCreate = () => {
    setEditingRecord(null)
    setFormData({
      employee_id: '',
      course_id: '',
      course_name: ''
    })
    setShowModal(true)
  }

  const handleEdit = (record: RegisteredCourse) => {
    setEditingRecord(record)
    setFormData({
      employee_id: record.employee_id,
      course_id: record.course_id,
      course_name: record.course_name
    })
    setShowModal(true)
  }

  const handleDelete = async (record: RegisteredCourse) => {
    if (!window.confirm(`社員「${record.employee_name || record.employee_id}」のコース「${record.course_name}」の登録を削除しますか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('registered_courses')
        .delete()
        .eq('employee_id', record.employee_id)
        .eq('course_id', record.course_id)

      if (error) {
        console.error('Error deleting registered course:', error)
        alert('登録コースの削除に失敗しました')
        return
      }

      alert('登録コースを削除しました')
      await loadData()
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('登録コースの削除中にエラーが発生しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.employee_id || !formData.course_id || !formData.course_name) {
      alert('すべての項目を入力してください')
      return
    }

    try {
      if (editingRecord) {
        // 更新（主キーが変更される場合は削除→作成）
        if (editingRecord.employee_id !== formData.employee_id || editingRecord.course_id !== formData.course_id) {
          // 古いレコードを削除
          const { error: deleteError } = await supabase
            .from('registered_courses')
            .delete()
            .eq('employee_id', editingRecord.employee_id)
            .eq('course_id', editingRecord.course_id)

          if (deleteError) {
            console.error('Error deleting old record:', deleteError)
            alert('古いレコードの削除に失敗しました')
            return
          }

          // 新しいレコードを作成
          const { error: insertError } = await supabase
            .from('registered_courses')
            .insert({
              employee_id: formData.employee_id,
              course_id: formData.course_id,
              course_name: formData.course_name
            })

          if (insertError) {
            console.error('Error creating new record:', insertError)
            alert('新しいレコードの作成に失敗しました')
            return
          }
        } else {
          // コース名のみ更新
          const { error } = await supabase
            .from('registered_courses')
            .update({
              course_name: formData.course_name
            })
            .eq('employee_id', editingRecord.employee_id)
            .eq('course_id', editingRecord.course_id)

          if (error) {
            console.error('Error updating registered course:', error)
            alert('登録コースの更新に失敗しました')
            return
          }
        }

        alert('登録コースを更新しました')
      } else {
        // 作成
        const { error } = await supabase
          .from('registered_courses')
          .insert({
            employee_id: formData.employee_id,
            course_id: formData.course_id,
            course_name: formData.course_name
          })

        if (error) {
          console.error('Error creating registered course:', error)
          alert('登録コースの作成に失敗しました')
          return
        }

        alert('登録コースを作成しました')
      }

      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert('処理中にエラーが発生しました')
    }
  }

  const handleCourseChange = (courseId: string) => {
    const selectedCourse = courses.find(course => course.id === courseId)
    setFormData({
      ...formData,
      course_id: courseId,
      course_name: selectedCourse?.name || ''
    })
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>登録コース管理</h1>
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
        <h1 style={styles.headerTitle}>登録コース管理</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.toolbar}>
          <div style={styles.searchContainer}>
            <Search size={20} color="#6b7280" />
            <input
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="社員ID、コースID、コース名で検索..."
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
                <th style={styles.th}>社員ID</th>
                <th style={styles.th}>社員名</th>
                <th style={styles.th}>拠点</th>
                <th style={styles.th}>コースID</th>
                <th style={styles.th}>コース名</th>
                <th style={styles.th}>登録日時</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={`${record.employee_id}-${record.course_id}`} style={styles.tableRow}>
                  <td style={styles.td}>{record.employee_id}</td>
                  <td style={styles.td}>{record.employee_name || '-'}</td>
                  <td style={styles.td}>
                    {record.employee_base && (
                      <span style={styles.baseBadge}>
                        {record.employee_base}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{record.course_id}</td>
                  <td style={styles.td}>{record.course_name}</td>
                  <td style={styles.td}>
                    {new Date(record.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.editButton}
                        onClick={() => handleEdit(record)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(record)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div style={styles.emptyContainer}>
              <BookOpen size={48} color="#9ca3af" />
              <p style={styles.emptyText}>
                {searchQuery ? '該当する登録コースが見つかりません' : '登録コースがありません'}
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
              {editingRecord ? '登録コース編集' : '登録コース作成'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>社員 *</label>
                <select
                  style={styles.select}
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  required
                >
                  <option value="">社員を選択してください</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.id} - {employee.name || '名前なし'} (拠点: {employee.base})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>コース *</label>
                <select
                  style={styles.select}
                  value={formData.course_id}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  required
                >
                  <option value="">コースを選択してください</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.id} - {course.name} (拠点: {course.base})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>コース名 *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.course_name}
                  onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                  placeholder="コース名"
                  required
                />
                <p style={styles.helpText}>コースを選択すると自動入力されます</p>
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
                  {editingRecord ? '更新' : '作成'}
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
    backgroundColor: '#f59e0b',
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
    backgroundColor: '#f59e0b',
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
    maxWidth: '600px',
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
  select: {
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
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default RegisteredCoursesManagementPage