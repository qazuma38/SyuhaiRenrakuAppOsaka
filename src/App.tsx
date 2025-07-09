import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from './hooks/useAppSelector'
import { useAppDispatch } from './hooks/useAppDispatch'
import { checkSessionExpiry } from './store/slices/authSlice'
import { useNotifications } from './hooks/useNotifications'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './components/DashboardLayout'
import CustomersPage from './pages/CustomersPage'
import ChatPage from './pages/ChatPage'
import CoursesPage from './pages/CoursesPage'
import SettingsPage from './pages/SettingsPage'
import IndividualChatPage from './pages/IndividualChatPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  
  // 通知の初期化
  useNotifications()

  useEffect(() => {
    // セッション期限チェック
    dispatch(checkSessionExpiry())
    
    // 定期的にセッション期限をチェック
    const interval = setInterval(() => {
      dispatch(checkSessionExpiry())
    }, 60000) // 1分ごと

    return () => clearInterval(interval)
  }, [dispatch])

  if (!user) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customers" replace />} />
      <Route path="/" element={<DashboardLayout />}>
        <Route path="customers" element={<CustomersPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/chat/:contactId" element={<IndividualChatPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App