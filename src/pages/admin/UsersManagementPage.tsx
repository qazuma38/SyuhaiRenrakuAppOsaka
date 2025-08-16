import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Edit, Trash2, Search, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSelector } from '../../hooks/useAppSelector'
import { User } from '../../types/auth'

const UsersManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    password: '',
    user_type: 'customer' as 'customer' | 'employee' | 'admin',
    base: '',
    is_admin: false
  })

  // 管理者権限チェック
  if (!currentUser?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/admin')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>ユーザー管理</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        alert('ユーザーデータの読み込みに失敗しました')
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error in loadUsers:', error)
      alert('ユーザーデータの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = users.filter(user =>
    user.id.includes(searchQuery) ||
    (user.name && user.name.includes(searchQuery)) ||
    (user.phone && user.phone.includes(searchQuery))
  )

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({
      id: '',
      name: '',
      phone: '',
      password: '',
      user_type: 'customer',
      base: '',
      is_admin: false
    })
    setShowModal(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      id: user.id,
      name: user.name || '',
      phone: user.phone || '',
      password: user.password || '',
      user_type: user.user_type,
      base: user.base || '',
      is_admin: user.is_admin || false
    })
    setShowModal(true)
  }

  const handleDelete = async (user: User) => {
    if (!window.confirm(`ユーザー「${user.name || user.id}」を削除しますか？`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) {
        console.error('Error deleting user:', error)
        alert('ユーザーの削除に失敗しました')
        return
      }

      alert('ユーザーを削除しました')
      await loadUsers()
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('ユーザーの削除中にエラーが発生しました')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.id || !formData.user_type || !formData.base) {
      alert('必須項目を入力してください')
      return
    }

    try {
      if (editingUser) {
        // 更新
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            phone: formData.phone,
            password: formData.password,
            user_type: formData.user_type,
            base: formData.base,
            is_admin: formData.is_admin
          })
          .eq('id', editingUser.id)

        if (error) {
          console.error('Error updating user:', error)
          alert('ユーザーの更新に失敗しました')
          return
        }

        alert('ユーザーを更新しました')
      } else {
        // 作成
        const { error } = await supabase
          .from('users')
          .insert({
            id: formData.id,
            name: formData.name,
            phone: formData.phone,
            password: formData.password,
            user_type: formData.user_type,
            base: formData.base,
            is_admin: formData.is_admin
          })

        if (error) {
          console.error('Error creating user:', error)
          alert('ユーザーの作成に失敗しました')
          return
        }

        alert('ユーザーを作成しました')
      }

      setShowModal(false)
      await loadUsers()
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
          <h1 style={styles.headerTitle}>ユーザー管理</h1>
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
        <h1 style={styles.headerTitle}>ユーザー管理</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.toolbar}>
          <div style={styles.searchContainer}>
            <Search size={20} color="#6b7280" />
            <input
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID、名前、電話番号で検索..."
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
                <th style={styles.th}>ID</th>
                <th style={styles.th}>名前</th>
                <th style={styles.th}>電話番号</th>
                <th style={styles.th}>タイプ</th>
                <th style={styles.th}>拠点</th>
                <th style={styles.th}>管理者</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.td}>{user.id}</td>
                  <td style={styles.td}>{user.name || '-'}</td>
                  <td style={styles.td}>{user.phone || '-'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: user.user_type === 'admin' ? '#ef4444' :
                                     user.user_type === 'employee' ? '#10b981' : '#4285f4'
                    }}>
                      {user.user_type === 'admin' ? '管理者' :
                       user.user_type === 'employee' ? '社員' : '顧客'}
                    </span>
                  </td>
                  <td style={styles.td}>{user.base || '-'}</td>
                  <td style={styles.td}>
                    {user.is_admin ? (
                      <span style={{...styles.badge, backgroundColor: '#f59e0b'}}>
                        管理者権限
                      </span>
                    ) : '-'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.editButton}
                        onClick={() => handleEdit(user)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div style={styles.emptyContainer}>
              <Users size={48} color="#9ca3af" />
              <p style={styles.emptyText}>
                {searchQuery ? '該当するユーザーが見つかりません' : 'ユーザーがありません'}
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
              {editingUser ? 'ユーザー編集' : 'ユーザー作成'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>ID *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>名前</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>電話番号</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>パスワード</label>
                <input
                  style={styles.input}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>ユーザータイプ *</label>
                <select
                  style={styles.select}
                  value={formData.user_type}
                  onChange={(e) => setFormData({...formData, user_type: e.target.value as any})}
                  required
                >
                  <option value="customer">顧客</option>
                  <option value="employee">社員</option>
                  <option value="admin">管理者</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>拠点 *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.base}
                  onChange={(e) => setFormData({...formData, base: e.target.value})}
                  placeholder="例: 01"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                  />
                  管理者権限を付与
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
                  {editingUser ? '更新' : '作成'}
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
    backgroundColor: '#4285f4',
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
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
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
    backgroundColor: '#4285f4',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
}

export default UsersManagementPage