import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Database, Users, MapPin, BookOpen, UserCheck, Building2, Settings } from 'lucide-react'
import { useAppSelector } from '../../hooks/useAppSelector'

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)

  // 管理者権限チェック
  if (!user?.is_admin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/settings')}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>管理者ダッシュボード</h1>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>管理者権限が必要です</p>
        </div>
      </div>
    )
  }

  const adminMenuItems = [
    {
      id: 'users',
      title: 'ユーザー管理',
      description: 'ユーザーの作成・編集・削除',
      icon: Users,
      color: '#4285f4',
      path: '/admin/users'
    },
    {
      id: 'courses',
      title: 'コース管理',
      description: 'コースの作成・編集・削除',
      icon: MapPin,
      color: '#10b981',
      path: '/admin/courses'
    },
    {
      id: 'registered-courses',
      title: '登録コース管理',
      description: '社員の登録コース管理',
      icon: BookOpen,
      color: '#f59e0b',
      path: '/admin/registered-courses'
    },
    {
      id: 'employee-courses',
      title: '担当コース管理',
      description: '社員の日別担当コース管理',
      icon: UserCheck,
      color: '#8b5cf6',
      path: '/admin/employee-courses'
    },
    {
      id: 'customer-courses',
      title: '顧客コース管理',
      description: '顧客のコース設定管理',
      icon: Building2,
      color: '#ef4444',
      path: '/admin/customer-courses'
    },
    {
      id: 'system-settings',
      title: 'システム設定管理',
      description: 'アプリケーション全体の設定管理',
      icon: Settings,
      color: '#6366f1',
      path: '/admin/system-settings'
    }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/settings')}>
          <ChevronLeft size={24} color="#ffffff" />
        </button>
        <h1 style={styles.headerTitle}>管理者ダッシュボード</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.welcomeSection}>
          <Database size={48} color="#4285f4" />
          <h2 style={styles.welcomeTitle}>データベース管理</h2>
          <p style={styles.welcomeText}>
            システム管理者として各テーブルのデータを管理できます
          </p>
        </div>

        <div style={styles.menuGrid}>
          {adminMenuItems.map((item) => {
            const IconComponent = item.icon
            return (
              <div
                key={item.id}
                style={{
                  ...styles.menuItem,
                  borderColor: item.color,
                }}
                onClick={() => navigate(item.path)}
              >
                <div style={styles.menuItemHeader}>
                  <IconComponent size={32} color={item.color} />
                  <h3 style={{
                    ...styles.menuItemTitle,
                    color: item.color,
                  }}>
                    {item.title}
                  </h3>
                </div>
                <p style={styles.menuItemDescription}>
                  {item.description}
                </p>
              </div>
            )
          })}
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
  welcomeSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center' as const,
    marginBottom: '32px',
    border: '1px solid #e5e7eb',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '16px 0 8px 0',
  },
  welcomeText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  menuItem: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  menuItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  menuItemTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0',
  },
  menuItemDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
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

export default AdminDashboardPage