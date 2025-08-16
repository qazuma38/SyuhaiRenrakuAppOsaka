import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Edit, Trash2, Search, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'

interface CustomerCourse {
  customer_id: string
  course_id: string
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  re_pickup: boolean
  created_at: string
  customer_name?: string
  customer_base?: string
  course_name?: string
  course_base?: string
}

const CustomerCoursesManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [customerCourses, setCustomerCourses] = useState<CustomerCourse[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CustomerCourse | null>(null)
  const [formData, setFormData] = useState({
    customer_id: '',
    course_id: '',
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    re_pickup: false
  })

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>顧客コース管理</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const loadData = async () => {
    try {
      // 顧客コースデータを取得
      const { data: customerCoursesData, error: customerCoursesError } = await supabase
        .from('customer_courses')
        .select(`
          *,
          users!customer_courses_customer_id_fkey(name, base),
          courses!customer_courses_course_id_fkey(name, base)
        `)
        .order('created_at', { ascending: false })

      if (customerCoursesError) {
        console.error('Error loading customer courses:', customerCoursesError)
        alert('顧客コースデータの読み込みに失敗しました')
        return
      }

      // データを整形
      const formattedData = (customerCoursesData || []).map(item => ({
        customer_id: item.customer_id,
        course_id: item.course_id,
        monday: item.monday,
        tuesday: item.tuesday,
        wednesday: item.wednesday,
        thursday: item.thursday,
        friday: item.friday,
        saturday: item.saturday,
        re_pickup: item.re_pickup,
        created_at: item.created_at,
        customer_name: item.users?.name || '',
        customer_base: item.users?.base || '',
        course_name: item.courses?.name || '',
        course_base: item.courses?.base || ''
      }))

      setCustomerCourses(formattedData)

      // 顧客一覧を取得
      const { data: customersData, error: customersError } = await supabase
        .from('users')
        .select('id, name, base')
        .eq('user_type', 'customer')
        .order('id')

      if (customersError) {
        console.error('Error loading customers:', customersError)
      } else {
        setCustomers(customersData || [])
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

  const filteredRecords = customerCourses.filter(record =>
    record.customer_id.includes(searchQuery) ||
    record.course_id.includes(searchQuery) ||
    (record.customer_name && record.customer_name.includes(searchQuery)) ||
    (record.course_name && record.course_name.includes(searchQuery))
  )

  const handleCreate = () => {
    setEditingRecord(null)
    setFormData({
      customer_id: '',
      course_id: '',
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      re_pickup: false
    })
    setShowModal(true)
  }

  const handleEdit = (record: CustomerCourse) => {
    setEditingRecord(record)
    setFormData({
      customer_id: record.customer_id,
      course_id: record.course_id,
      monday: record.monday,
      tuesday: record.tuesday,
      wednesday: record.wednesday,
      thursday: record.thursday,
      friday: record.friday,
      saturday: record.saturday,
      re_pickup: record.re_pickup
    })
    setShowModal(true)
  }

  const handleDelete = async (record: CustomerCourse) => {
    if (!window.confirm(`顧客「${record.customer_name || record.customer_id}」のコース「${record.course_name}」の設定を削除しますか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('customer_courses')
        .delete()
        .eq('customer_id', record.customer_id)
        .eq('course_id', record.course_id)

      if (error) {
        console.error('Error deleting customer course:', error)
        alert('顧客コースの削除に失敗しました')
        return
      }

      alert('顧客コースを削除しました')
      await loadData()
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('顧客コースの削除中にエラーが発生しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id || !formData.course_id) {
      alert('顧客とコースを選択してください')
      return
    }

    try {
      if (editingRecord) {
        // 更新
        const { error } = await supabase
          .from('customer_courses')
          .update({
            monday: formData.monday,
            tuesday: formData.tuesday,
            wednesday: formData.wednesday,
            thursday: formData.thursday,
            friday: formData.friday,
            saturday: formData.saturday,
            re_pickup: formData.re_pickup
          })
          .eq('customer_id', editingRecord.customer_id)
          .eq('course_id', editingRecord.course_id)

        if (error) {
          console.error('Error updating customer course:', error)
          alert('顧客コースの更新に失敗しました')
          return
        }

        alert('顧客コースを更新しました')
      } else {
        // 作成
        const { error } = await supabase
          .from('customer_courses')
          .insert({
            customer_id: formData.customer_id,
            course_id: formData.course_id,
            monday: formData.monday,
            tuesday: formData.tuesday,
            wednesday: formData.wednesday,
            thursday: formData.thursday,
            friday: formData.friday,
            saturday: formData.saturday,
            re_pickup: formData.re_pickup
          })

        if (error) {
          console.error('Error creating customer course:', error)
          alert('顧客コースの作成に失敗しました')
          return
        }

        alert('顧客コースを作成しました')
      }

      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert('処理中にエラーが発生しました')
    }
  }

  const getDaysText = (record: CustomerCourse) => {
    const days = []
    if (record.monday) days.push('月')
    if (record.tuesday) days.push('火')
    if (record.wednesday) days.push('水')
    if (record.thursday) days.push('木')
    if (record.friday) days.push('金')
    if (record.saturday) days.push('土')
    return days.join('・') || '-'
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>顧客コース管理</h1>
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
        <h1 style={styles.headerTitle}>顧客コース管理</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.toolbar}>
          <div style={styles.searchContainer}>
            <Search size={20} color="#6b7280" />
            <input
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="顧客ID、コースID、名前で検索..."
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
                <th style={styles.th}>顧客ID</th>
                <th style={styles.th}>顧客名</th>
                <th style={styles.th}>拠点</th>
                <th style={styles.th}>コースID</th>
                <th style={styles.th}>コース名</th>
                <th style={styles.th}>集配曜日</th>
                <th style={styles.th}>再集配</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={`${record.customer_id}-${record.course_id}`} style={styles.tableRow}>
                  <td style={styles.td}>{record.customer_id}</td>
                  <td style={styles.td}>{record.customer_name || '-'}</td>
                  <td style={styles.td}>
                    {record.customer_base && (
                      <span style={styles.baseBadge}>
                        {record.customer_base}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{record.course_id}</td>
                  <td style={styles.td}>{record.course_name || '-'}</td>
                  <td style={styles.td}>{getDaysText(record)}</td>
                  <td style={styles.td}>
                    {record.re_pickup ? (
                      <span style={{...styles.statusBadge, backgroundColor: '#fef3c7', color: '#d97706'}}>
                        対象
                      </span>
                    ) : (
                      <span style={{...styles.statusBadge, backgroundColor: '#f3f4f6', color: '#6b7280'}}>
                        対象外
                      </span>
                    )}
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
              <Building2 size={48} color="#9ca3af" />
              <p style={styles.emptyText}>
                {searchQuery ? '該当する顧客コースが見つかりません' : '顧客コースがありません'}
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
              {editingRecord ? '顧客コース編集' : '顧客コース作成'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>顧客 *</label>
                <select
                  style={styles.select}
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  disabled={!!editingRecord}
                  required
                >
                  <option value="">顧客を選択してください</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.id} - {customer.name || '名前なし'} (拠点: {customer.base})
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
                  disabled={!!editingRecord}
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
                <label style={styles.label}>集配曜日</label>
                <div style={styles.checkboxGrid}>
                  {[
                    { key: 'monday', label: '月曜日' },
                    { key: 'tuesday', label: '火曜日' },
                    { key: 'wednesday', label: '水曜日' },
                    { key: 'thursday', label: '木曜日' },
                    { key: 'friday', label: '金曜日' },
                    { key: 'saturday', label: '土曜日' }
                  ].map(day => (
                    <label key={day.key} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData[day.key as keyof typeof formData] as boolean}
                        onChange={(e) => setFormData({
                          ...formData,
                          [day.key]: e.target.checked
                        })}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.re_pickup}
                    onChange={(e) => setFormData({...formData, re_pickup: e.target.checked})}
                  />
                  再集配対象
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
    backgroundColor: '#ef4444',
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
    backgroundColor: '#ef4444',
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
  select: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
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
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default CustomerCoursesManagementPage