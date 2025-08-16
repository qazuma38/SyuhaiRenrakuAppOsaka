import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Edit, Trash2, Search, UserCheck, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'
import { EmployeeCourse } from '../../types/auth'

interface EmployeeCourseWithDetails extends EmployeeCourse {
  employee_name?: string
  employee_base?: string
  course_name?: string
  course_base?: string
}

const EmployeeCoursesManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [employeeCourses, setEmployeeCourses] = useState<EmployeeCourseWithDetails[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<EmployeeCourseWithDetails | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    course_id: '',
    assigned_date: '',
    is_active: true
  })

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>担当コース管理</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const loadData = async () => {
    try {
      // 担当コースデータを取得
      const { data: employeeCoursesData, error: employeeCoursesError } = await supabase
        .from('employee_courses')
        .select(`
          *,
          users!employee_courses_employee_id_fkey(name, base),
          courses!employee_courses_course_id_fkey(name, base)
        `)
        .order('assigned_date', { ascending: false })
        .order('employee_id', { ascending: true })

      if (employeeCoursesError) {
        console.error('Error loading employee courses:', employeeCoursesError)
        alert('担当コースデータの読み込みに失敗しました')
        return
      }

      // データを整形
      const formattedData = (employeeCoursesData || []).map(item => ({
        employee_id: item.employee_id,
        course_id: item.course_id,
        assigned_date: item.assigned_date,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        employee_name: item.users?.name || '',
        employee_base: item.users?.base || '',
        course_name: item.courses?.name || '',
        course_base: item.courses?.base || ''
      }))

      setEmployeeCourses(formattedData)

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

  const filteredRecords = employeeCourses.filter(record => {
    const matchesSearch = record.employee_id.includes(searchQuery) ||
      record.course_id.includes(searchQuery) ||
      (record.employee_name && record.employee_name.includes(searchQuery)) ||
      (record.course_name && record.course_name.includes(searchQuery))
    
    const matchesDate = !dateFilter || record.assigned_date === dateFilter
    
    return matchesSearch && matchesDate
  })

  const handleCreate = () => {
    setEditingRecord(null)
    setFormData({
      employee_id: '',
      course_id: '',
      assigned_date: new Date().toISOString().split('T')[0],
      is_active: true
    })
    setShowModal(true)
  }

  const handleEdit = (record: EmployeeCourseWithDetails) => {
    setEditingRecord(record)
    setFormData({
      employee_id: record.employee_id,
      course_id: record.course_id,
      assigned_date: record.assigned_date,
      is_active: record.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (record: EmployeeCourseWithDetails) => {
    if (!window.confirm(`社員「${record.employee_name || record.employee_id}」の${record.assigned_date}の担当コース「${record.course_name}」を削除しますか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('employee_courses')
        .delete()
        .eq('employee_id', record.employee_id)

      if (error) {
        console.error('Error deleting employee course:', error)
        alert('担当コースの削除に失敗しました')
        return
      }

      alert('担当コースを削除しました')
      await loadData()
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('担当コースの削除中にエラーが発生しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.employee_id || !formData.course_id || !formData.assigned_date) {
      alert('すべての項目を入力してください')
      return
    }

    try {
      if (editingRecord) {
        // 更新
        const { error } = await supabase
          .from('employee_courses')
          .update({
            course_id: formData.course_id,
            assigned_date: formData.assigned_date,
            is_active: formData.is_active
          })
          .eq('employee_id', editingRecord.employee_id)

        if (error) {
          console.error('Error updating employee course:', error)
          alert('担当コースの更新に失敗しました')
          return
        }

        alert('担当コースを更新しました')
      } else {
        // 作成
        const { error } = await supabase
          .from('employee_courses')
          .insert({
            employee_id: formData.employee_id,
            course_id: formData.course_id,
            assigned_date: formData.assigned_date,
            is_active: formData.is_active
          })

        if (error) {
          console.error('Error creating employee course:', error)
          alert('担当コースの作成に失敗しました')
          return
        }

        alert('担当コースを作成しました')
      }

      setShowModal(false)
      await loadData()
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
          <h1 style={styles.headerTitle}>担当コース管理</h1>
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
        <h1 style={styles.headerTitle}>担当コース管理</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.toolbar}>
          <div style={styles.filtersContainer}>
            <div style={styles.searchContainer}>
              <Search size={20} color="#6b7280" />
              <input
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="社員ID、コースID、名前で検索..."
              />
            </div>
            <div style={styles.dateContainer}>
              <Calendar size={20} color="#6b7280" />
              <input
                style={styles.dateInput}
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
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
                <th style={styles.th}>担当日</th>
                <th style={styles.th}>状態</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.employee_id} style={styles.tableRow}>
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
                  <td style={styles.td}>{record.course_name || '-'}</td>
                  <td style={styles.td}>
                    {new Date(record.assigned_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: record.is_active ? '#dcfce7' : '#fee2e2',
                      color: record.is_active ? '#16a34a' : '#dc2626'
                    }}>
                      {record.is_active ? 'アクティブ' : '非アクティブ'}
                    </span>
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
              <UserCheck size={48} color="#9ca3af" />
              <p style={styles.emptyText}>
                {searchQuery || dateFilter ? '該当する担当コースが見つかりません' : '担当コースがありません'}
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
              {editingRecord ? '担当コース編集' : '担当コース作成'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>社員 *</label>
                <select
                  style={styles.select}
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  disabled={!!editingRecord}
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
                  onChange={(e) => setFormData({...formData, course_id: e.target.value})}
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
                <label style={styles.label}>担当日 *</label>
                <input
                  style={styles.input}
                  type="date"
                  value={formData.assigned_date}
                  onChange={(e) => setFormData({...formData, assigned_date: e.target.value})}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  アクティブ
                </label>
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
    backgroundColor: '#8b5cf6',
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
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    flex: 1,
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
    maxWidth: '300px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#1f2937',
  },
  dateContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    gap: '12px',
  },
  dateInput: {
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#1f2937',
  },
  createButton: {
    backgroundColor: '#8b5cf6',
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
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
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
  select: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
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
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default EmployeeCoursesManagementPage