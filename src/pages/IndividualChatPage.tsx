import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Send, Building2, Truck, X, RotateCcw, RefreshCw } from 'lucide-react'
import { ChatService } from '../lib/chatService'
import { PresetMessageService } from '../lib/presetMessageService'
import { SystemSettingService } from '../lib/systemSettingService'
import { useAppSelector } from '../hooks/useAppSelector'
import { ChatMessage, PresetMessage } from '../types/auth'

// 社員用の定型メッセージ
const employeeTemplates = [
  { id: 'response_1', icon: Truck, text: 'かしこまりました、ご連絡ありがとうございます。', color: '#10b981', type: 'auto_response' as const },
  { id: 'response_2', icon: Truck, text: '検体回収いたしました。', color: '#4285f4', type: 'auto_response' as const },
]

// 顧客用の定型メッセージ
const customerTemplates = [
  { id: 'pickup_yes', icon: Truck, text: '集配あり - 本日の集配をお願いします。', color: '#10b981', type: 'pickup_yes' as const, label: '検体あり' },
  { id: 'pickup_no', icon: X, text: '集配なし - 本日の集配はございません。', color: '#ef4444', type: 'pickup_no' as const, label: '検体なし' },
  { id: 're_pickup', icon: RotateCcw, text: '再集配 - 再度集配をお願いします。', color: '#f59e0b', type: 're_pickup' as const, label: '再集配' },
]

const IndividualChatPage: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const contactName = searchParams.get('name') || '連絡先'
  
  const { user } = useAppSelector((state) => state.auth)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmationModal, setConfirmationModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof employeeTemplates[0] | typeof customerTemplates[0]) | null>(null)
  const [customPresetMessages, setCustomPresetMessages] = useState<PresetMessage[]>([])
  const [messageIconSettings, setMessageIconSettings] = useState({
    showPickupYesIcon: true,
    showPickupNoIcon: true,
    showRePickupIcon: true,
    messageIconDisplayEnabled: true
  })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // メッセージリストの参照を作成
  const messagesListRef = React.useRef<HTMLDivElement>(null)

  // Load system settings for message icon display
  const loadMessageIconSettings = async () => {
    try {
      console.log('IndividualChat: Loading message icon settings...')
      const settings = await SystemSettingService.getMessageIconSettings()
      console.log('IndividualChat: Loaded settings:', settings)
      setMessageIconSettings(settings)
      setSettingsLoaded(true)
    } catch (error) {
      console.error('IndividualChat: Error loading message icon settings:', error)
      setSettingsLoaded(true)
    }
  }

  // Load custom preset messages for customers
  const loadCustomPresetMessages = async () => {
    if (user?.user_type === 'customer') {
      try {
        const presetMessages = await PresetMessageService.getCustomerPresetMessages(user.id)
        setCustomPresetMessages(presetMessages)
      } catch (error) {
        console.error('Error loading custom preset messages:', error)
      }
    }
  }

  useEffect(() => {
    loadMessageIconSettings()
    loadCustomPresetMessages()
  }, [user])

  const loadMessages = async () => {
    if (!user || !contactId) {
      setError('ユーザー情報または連絡先IDが見つかりません')
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      const messagesData = await ChatService.getRecentMessages(contactId, user.id)
      setMessages(messagesData)

      // Mark messages as read when the receiver loads them
      await ChatService.markMessagesAsRead(user.id, contactId)
      
      // メッセージ読み込み後に最下部にスクロール
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    } catch (error) {
      console.error('Error in loadMessages:', error)
      setError('メッセージの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [user, contactId])

  // 最下部にスクロールする関数
  const scrollToBottom = () => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadMessages()
      await loadCustomPresetMessages()
      // リフレッシュ後も最下部にスクロール
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    } finally {
      setRefreshing(false)
    }
  }

  const handleTemplateSelect = (template: typeof employeeTemplates[0] | typeof customerTemplates[0]) => {
    setSelectedTemplate(template)
    setConfirmationModal(true)
  }

  const sendTemplateMessage = async () => {
    if (!selectedTemplate || !user || !contactId) return

    try {
      // Determine sender type based on user type
      const senderType = user.user_type === 'customer' ? 'customer' : 'employee'
      
      // Send message: contactId is the receiver, user.id is the sender
      const success = await ChatService.sendMessage(
        contactId,
        contactId,  // receiverId - the person receiving the message
        selectedTemplate.text,
        selectedTemplate.type,
        senderType,
        user.id   // actualSenderId - the person sending the message (logged-in user)
      )

      if (success) {
        await loadMessages()
        await loadCustomPresetMessages() // Reload to update any changes
        // メッセージ送信後に最下部にスクロール
        setTimeout(() => {
          scrollToBottom()
        }, 100)
        setConfirmationModal(false)
        setSelectedTemplate(null)
      } else {
        alert('メッセージの送信に失敗しました')
      }
    } catch (error) {
      console.error('Error in sendTemplateMessage:', error)
      alert('メッセージの送信中にエラーが発生しました')
    }
  }

  // Create dynamic templates based on user type and custom presets
  const getDynamicTemplates = () => {
    console.log('IndividualChat: getDynamicTemplates called')
    console.log('IndividualChat: Current settings:', messageIconSettings)
    console.log('IndividualChat: Settings loaded:', settingsLoaded)
    
    // メッセージアイコン表示が無効な場合は空の配列を返す
    if (!messageIconSettings.messageIconDisplayEnabled) {
      console.log('IndividualChat: Message icon display disabled, returning empty templates')
      return []
    }

    if (user?.user_type === 'employee') {
      return employeeTemplates
    } else {
      // For customers, combine default templates with custom preset messages
      let defaultTemplates = customerTemplates.filter(template => {
        console.log('IndividualChat: Filtering template:', template.type)
        switch (template.type) {
          case 'pickup_yes':
            const showPickupYes = messageIconSettings.showPickupYesIcon
            console.log('IndividualChat: pickup_yes template, show:', showPickupYes)
            return showPickupYes
          case 'pickup_no':
            const showPickupNo = messageIconSettings.showPickupNoIcon
            console.log('IndividualChat: pickup_no template, show:', showPickupNo)
            return showPickupNo
          case 're_pickup':
            const showRePickup = messageIconSettings.showRePickupIcon
            console.log('IndividualChat: re_pickup template, show:', showRePickup)
            return showRePickup
          default:
            return true
        }
      })
      
      const customTemplates = customPresetMessages.slice(0, 2).map((preset, index) => ({
        id: `custom_${preset.id}`,
        icon: preset.message_type === 'pickup_yes' ? Truck : 
              preset.message_type === 'pickup_no' ? X : 
              preset.message_type === 're_pickup' ? RotateCcw : Send,
        text: preset.message,
        color: preset.message_type === 'pickup_yes' ? '#10b981' : 
               preset.message_type === 'pickup_no' ? '#ef4444' : 
               preset.message_type === 're_pickup' ? '#f59e0b' : '#6b7280',
        type: preset.message_type as 'pickup_yes' | 'pickup_no' | 're_pickup' | 'auto_response',
        label: `カスタム${index + 1}`
      }))

      // Always show the 3 default templates first, then add up to 2 custom templates
      const allTemplates = [...defaultTemplates]
      
      // Add custom templates (up to 2)
      customTemplates.forEach(customTemplate => {
        allTemplates.push(customTemplate)
      })
      
      // Return maximum of 5 templates (3 default + 2 custom)
      console.log('IndividualChat: Final templates count:', allTemplates.length)
      return allTemplates.slice(0, 5)
    }
  }

  const templates = getDynamicTemplates()

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>medic.web集配連絡システム ver0.1.0</h1>
        </div>
        <div style={styles.pageHeader}>
          <div style={styles.pageHeaderContent}>
            <Building2 size={20} color="#ffffff" />
            <h2 style={styles.pageTitle}>{contactName}</h2>
          </div>
        </div>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <h1 style={styles.headerTitle}>medic.web集配連絡システム ver0.1.0</h1>
        </div>
        <div style={styles.pageHeader}>
          <div style={styles.pageHeaderContent}>
            <Building2 size={20} color="#ffffff" />
            <h2 style={styles.pageTitle}>{contactName}</h2>
          </div>
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryButton} onClick={loadMessages}>
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#ffffff" />
        </button>
        <h1 style={styles.headerTitle}>medic.web集配連絡システム ver0.1.0</h1>
      </div>
      
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderContent}>
          <Building2 size={20} color="#ffffff" />
          <h2 style={styles.pageTitle}>{contactName}</h2>
          <button 
            style={{
              ...styles.refreshButton,
              ...(refreshing ? styles.refreshButtonDisabled : {}),
            }}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} color="#ffffff" style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>
      </div>

      <div style={styles.dateHeader}>
        <p style={styles.dateText}>
          過去5日間のメッセージ
        </p>
      </div>

      <div ref={messagesListRef} style={styles.messagesList}>
        {messages.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>メッセージはありません</p>
          </div>
        ) : (
          messages.map((item, index) => {
            const isMyMessage = item.sender_id === user?.id
            const messageDate = new Date(item.created_at)
            const showDateSeparator = index === 0 || 
              new Date(messages[index - 1].created_at).toDateString() !== messageDate.toDateString()
            
            return (
              <React.Fragment key={item.id}>
                {showDateSeparator && (
                  <div style={styles.dateSeparator}>
                    <p style={styles.dateSeparatorText}>
                      {messageDate.toLocaleDateString('ja-JP', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                <div
                  style={{
                    ...styles.messageContainer,
                    ...(isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer),
                  }}
                >
                  <div style={{
                    ...styles.messageBubble,
                    ...(isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble),
                  }}>
                    <p style={styles.senderName}>
                      {isMyMessage 
                        ? (user?.name || `ユーザー${user?.id}`)
                        : contactName
                      }
                    </p>
                    <p style={{
                      ...styles.messageText,
                      ...(isMyMessage ? styles.myMessageText : styles.otherMessageText),
                    }}>
                      {item.message}
                    </p>
                    <p style={{
                      ...styles.messageTime,
                      ...(isMyMessage ? styles.myMessageTime : styles.otherMessageTime),
                    }}>
                      {formatTime(item.created_at)}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            )
          })
        )}
      </div>

      {/* Template Icons Row */}
      <div style={styles.templateIconsContainer}>
        {templates.map((template) => {
          const IconComponent = template.icon
          const isEmployee = user?.user_type === 'employee'
          
          // Get label text based on user type
          let labelText
          if (isEmployee) {
            labelText = template.id === 'response_1' ? '返信' : '検体回収'
          } else {
            // For customers, use the label property from the template
            labelText = (template as any).label
          }
          
          return (
            <div key={template.id} style={styles.templateWrapper}>
              <button
                style={{
                  ...styles.templateIconButton,
                  borderColor: template.color,
                }}
                onClick={() => handleTemplateSelect(template)}
              >
                <IconComponent size={28} color={template.color} />
              </button>
              <p style={styles.templateLabel}>{labelText}</p>
            </div>
          )
        })}
        
        <div style={styles.spacer} />
      </div>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <div style={styles.modalOverlay} onClick={() => setConfirmationModal(false)}>
          <div style={styles.confirmationModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.confirmationTitle}>メッセージ送信確認</h3>
            <div style={styles.messagePreview}>
              <p style={styles.messagePreviewText}>{selectedTemplate?.text}</p>
            </div>
            
            <div style={styles.confirmationButtons}>
              <button
                style={styles.cancelButton}
                onClick={() => setConfirmationModal(false)}
              >
                キャンセル
              </button>
              
              <button
                style={styles.confirmButton}
                onClick={sendTemplateMessage}
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4285f4',
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    marginRight: '8px',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
  },
  pageHeader: {
    backgroundColor: '#10b981',
    padding: '12px 16px',
  },
  pageHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0',
    flex: 1,
    marginLeft: '8px',
  },
  refreshButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '34px',
    minHeight: '34px',
  },
  refreshButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    cursor: 'not-allowed',
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
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  errorText: {
    fontSize: '16px',
    color: '#ef4444',
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  retryButton: {
    backgroundColor: '#4285f4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dateHeader: {
    backgroundColor: '#ffffff',
    padding: '8px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #e5e7eb',
  },
  dateText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    margin: '0',
  },
  messagesList: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  messageContainer: {
    marginBottom: '12px',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '12px 16px',
    borderRadius: '16px',
  },
  myMessageBubble: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: '4px',
  },
  otherMessageBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  senderName: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '20px',
    marginBottom: '4px',
    margin: '0 0 4px 0',
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: '11px',
    margin: '0',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right' as const,
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  templateIconsContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    gap: '12px',
  },
  templateWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  },
  templateIconButton: {
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    border: '2px solid',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  templateLabel: {
    fontSize: '10px',
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center' as const,
    maxWidth: '56px',
    margin: '0',
  },
  spacer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  dateSeparator: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '16px 0',
  },
  dateSeparatorText: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    fontSize: '12px',
    padding: '4px 12px',
    borderRadius: '12px',
    margin: '0',
    fontWeight: '500',
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
  confirmationModal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '85%',
    maxWidth: '400px',
    padding: '24px',
  },
  confirmationTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center' as const,
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  messagePreview: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
  },
  messagePreviewText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '20px',
    margin: '0',
  },
  confirmationButtons: {
    display: 'flex',
    gap: '12px',
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
  confirmButton: {
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

export default IndividualChatPage