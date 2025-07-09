import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { useAppSelector } from '../hooks/useAppSelector'
import { loginUser } from '../store/slices/authSlice'

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector((state) => state.auth)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId.trim() || !password.trim()) {
      return
    }

    setIsLoading(true)
    
    try {
      const result = await dispatch(loginUser({ userId: userId.trim(), password: password.trim() }))
      
      if (loginUser.fulfilled.match(result)) {
        console.log('Login successful')
      } else {
        console.log('Login failed:', result.payload)
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.logoContainer}>
        <div style={styles.logoBox}>
          <span style={styles.logoText}>medic.web</span>
        </div>
        <h1 style={styles.title}>集配連絡システム</h1>
        <p style={styles.version}>ver0.1.0</p>
      </div>

      <form style={styles.formContainer} onSubmit={handleSubmit}>
        {error && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <div style={styles.inputContainer}>
          <label style={styles.label}>ユーザーID</label>
          <input
            style={{
              ...styles.input,
              ...(error && !userId.trim() ? styles.inputError : {}),
            }}
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="IDを入力してください"
            maxLength={7}
            required
          />
          {!userId.trim() && error && (
            <p style={styles.fieldErrorText}>ユーザーIDを入力してください</p>
          )}
        </div>

        <div style={styles.inputContainer}>
          <label style={styles.label}>パスワード</label>
          <div style={styles.passwordContainer}>
            <Lock size={20} color="#64748b" style={styles.passwordIcon} />
            <input
              style={styles.passwordInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </div>
          {!password.trim() && error && (
            <p style={styles.fieldErrorText}>パスワードを入力してください</p>
          )}
        </div>

        <button
          style={{
            ...styles.loginButton,
            ...(isLoading || loading ? styles.loginButtonDisabled : {}),
          }}
          type="submit"
          disabled={isLoading || loading}
        >
          {isLoading || loading ? (
            <div style={styles.spinner}>ログイン中...</div>
          ) : (
            'ログイン'
          )}
        </button>

        <div style={styles.noticeContainer}>
          <p style={styles.noticeText}>
            現在このサービスは開発中の試験版として運用しております。<br />
            そのため、突然ご利用いただけなくなることがございます。<br />
            ご迷惑をおかけして申し訳ありません。<br />
            ご不便の際は、お近くのラボまでお電話にてご連絡いただけますと幸いです。<br />
            何卒ご理解のほど、よろしくお願いいたします。
          </p>
        </div>
      </form>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    backgroundColor: '#f5f5f5',
  },
  logoContainer: {
    textAlign: 'center' as const,
    marginBottom: '48px',
  },
  logoBox: {
    backgroundColor: '#4285f4',
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'inline-block',
  },
  logoText: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px',
  },
  version: {
    fontSize: '16px',
    color: '#6b7280',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center' as const,
    margin: '0',
  },
  inputContainer: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '16px',
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
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: '2px',
  },
  fieldErrorText: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
    marginLeft: '4px',
  },
  passwordContainer: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  passwordIcon: {
    marginLeft: '16px',
  },
  passwordInput: {
    flex: 1,
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    outline: 'none',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#4285f4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '24px',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeContainer: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    paddingTop: '16px',
    padding: '16px',
    textAlign: 'center' as const,
    backgroundColor: '#f9fafb',
  },
  noticeText: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: '0',
  },
}

export default LoginPage