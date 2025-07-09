import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Users, MessageCircle, MapPin, Settings } from 'lucide-react'

const DashboardLayout: React.FC = () => {
  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.headerTitle}>medic.web集配連絡システム ver0.1.0</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={styles.main}>
        <Outlet />
      </main>

      {/* ナビゲーション */}
      <nav style={styles.nav}>
        <NavLink
          to="/customers"
          style={({ isActive }) => ({
            ...styles.navItem,
            ...(isActive ? styles.navItemActive : {}),
          })}
        >
          <Users size={24} />
          <span style={styles.navLabel}>連絡先一覧</span>
        </NavLink>
        
        <NavLink
          to="/chat"
          style={({ isActive }) => ({
            ...styles.navItem,
            ...(isActive ? styles.navItemActive : {}),
          })}
        >
          <MessageCircle size={24} />
          <span style={styles.navLabel}>チャット</span>
        </NavLink>
        
        <NavLink
          to="/courses"
          style={({ isActive }) => ({
            ...styles.navItem,
            ...(isActive ? styles.navItemActive : {}),
          })}
        >
          <MapPin size={24} />
          <span style={styles.navLabel}>コース担当</span>
        </NavLink>
        
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            ...styles.navItem,
            ...(isActive ? styles.navItemActive : {}),
          })}
        >
          <Settings size={24} />
          <span style={styles.navLabel}>設定</span>
        </NavLink>
      </nav>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4285f4',
    color: '#ffffff',
    padding: '0',
  },
  headerTop: {
    padding: '16px',
    textAlign: 'center' as const,
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
  },
  main: {
    flex: 1,
    overflow: 'auto',
  },
  nav: {
    display: 'flex',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    padding: '8px 0',
    minHeight: '70px',
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px',
    textDecoration: 'none',
    color: '#6b7280',
    transition: 'color 0.2s',
    gap: '4px',
  },
  navItemActive: {
    color: '#10b981',
  },
  navLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center' as const,
  },
}

export default DashboardLayout