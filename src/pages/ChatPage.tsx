import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppSelector } from '../hooks/useAppSelector'

interface ChatSummary {
  customer_id: string
  customer_name: string
  last_message: string
  last_message_time: string
  unread_count: number
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadChatSummaries = async () => {
    if (!user || user.user_type !== 'employee') {
      setLoading(false)
      return
    }

    try {
      // Get recent chat summaries for the employee (past 5 days)
      const now = new Date()
      const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000))

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          sender_id,
          receiver_id,
          message,
          created_at,
          is_read,
          sender:users!chat_messages_sender_id_fkey(name),
          receiver:users!chat_messages_receiver_id_fkey(name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte('created_at', fiveDaysAgo.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading chat summaries:', error)
        return
      }

      // Group messages by customer and create summaries
      const summariesMap = new Map<string, ChatSummary>()
      
      data?.forEach(msg => {
        // Determine the other party (customer) in the conversation
        const customerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const customerName = msg.sender_id === user.id ? msg.receiver.name : msg.sender.name
        
        if (!summariesMap.has(customerId)) {
          summariesMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName || `顧客${customerId}`,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: (!msg.is_read && msg.receiver_id === user.id) ? 1 : 0
          })
        } else {
          const summary = summariesMap.get(customerId)!
          // Only count unread messages where current user is the receiver
          if (!msg.is_read && msg.receiver_id === user.id) {
            summary.unread_count++
          }
        }
      })

      setChatSummaries(Array.from(summariesMap.values()))
    } catch (error) {
      console.error('Error in loadChatSummaries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChatSummaries()
  }, [user])

  const handleChatPress = (summary: ChatSummary) => {
    navigate(`/chat/${summary.customer_id}?name=${encodeURIComponent(summary.customer_name)}`)
  }

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
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>チャット</h2>
        </div>
        <div style={styles.loadingContainer}>
          <p style={styles.loadingText}>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>チャット</h2>
      </div>

      <div style={styles.chatsList}>
        {chatSummaries.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>最近のチャットはありません</p>
          </div>
        ) : (
          chatSummaries.map((item) => (
            <div
              key={item.customer_id}
              style={{
                ...styles.chatCard,
                ...(item.unread_count > 0 ? styles.unreadChatCard : {}),
              }}
              onClick={() => handleChatPress(item)}
            >
              <div style={styles.chatHeader}>
                <div style={styles.chatInfo}>
                  <Building2 size={20} color="#10b981" />
                  <div style={styles.chatDetails}>
                    <p style={styles.customerName}>{item.customer_name}</p>
                    <p style={styles.customerId}>ID: {item.customer_id}</p>
                  </div>
                </div>
                <div style={styles.chatMeta}>
                  <p style={styles.timestamp}>{formatTime(item.last_message_time)}</p>
                  {item.unread_count > 0 && (
                    <div style={styles.unreadBadge}>
                      <span style={styles.unreadText}>{item.unread_count}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <p style={styles.lastMessage}>{item.last_message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  pageHeader: {
    backgroundColor: '#10b981',
    padding: '16px',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0',
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
  chatsList: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  chatCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },
  unreadChatCard: {
    borderLeft: '4px solid #ef4444',
    backgroundColor: '#fef7f7',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  chatInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
  },
  chatDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '2px',
    margin: '0 0 2px 0',
  },
  customerId: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
  },
  chatMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: '10px',
    padding: '2px 6px',
    minWidth: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '20px',
    margin: '0',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
  },
  emptyContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: '100px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
  },
}

export default ChatPage