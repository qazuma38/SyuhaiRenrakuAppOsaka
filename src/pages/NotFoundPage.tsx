import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>404</h1>
      <p style={styles.message}>ページが見つかりません</p>
      <button style={styles.button} onClick={() => navigate('/')}>
        ホームに戻る
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#4285f4',
    margin: '0 0 16px 0',
  },
  message: {
    fontSize: '20px',
    color: '#6b7280',
    marginBottom: '32px',
    margin: '0 0 32px 0',
  },
  button: {
    backgroundColor: '#4285f4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
}

export default NotFoundPage