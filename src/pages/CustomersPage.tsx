import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, UserCheck, RotateCcw, Truck, X } from 'lucide-react'
import { useAppSelector } from '../hooks/useAppSelector'
import { useAppDispatch } from '../hooks/useAppDispatch'
import { loadCustomersForEmployee, loadEmployeesForCustomer } from '../store/slices/customerSlice'
import { SystemSettingService } from '../lib/systemSettingService'
import { Customer, Employee } from '../types/auth'

const CustomersPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { customers, employees, loading: customersLoading, error: customersError } = useAppSelector((state) => state.customer)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageIconSettings, setMessageIconSettings] = useState({
    showPickupYesIcon: true,
    showPickupNoIcon: true,
    showRePickupIcon: true,
    messageIconDisplayEnabled: true
  })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const loadData = async () => {
    if (!user) return

    if (user.user_type === 'employee') {
      dispatch(loadCustomersForEmployee(user.id))
    } else if (user.user_type === 'customer') {
      dispatch(loadEmployeesForCustomer(user.id))
    }
  }


  const loadMessageIconSettings = async () => {
    try {
      console.log('Loading message icon settings...')
      const settings = await SystemSettingService.getMessageIconSettings()
      console.log('Loaded settings:', settings)
      setMessageIconSettings(settings)
      setSettingsLoaded(true)
    } catch (error) {
      console.error('Error loading message icon settings:', error)
      setSettingsLoaded(true)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, dispatch])

  useEffect(() => {
    loadMessageIconSettings()
  }, [])
  useEffect(() => {
    if (customersError) {
      console.error('Customer error:', customersError)
    }
  }, [customersError])

  // Filter data based on user type
  const filteredData = user?.user_type === 'employee' 
    ? customers.filter(customer =>
        customer.name.includes(searchQuery) || customer.id.includes(searchQuery)
      )
    : employees

  const handleItemPress = (item: Customer | Employee) => {
    navigate(`/chat/${item.id}?name=${encodeURIComponent(item.name)}`)
  }
  
  // メッセージタイプに応じたアイコンとテキストを取得
  const getMessageTypeDisplay = (messageType?: string | null) => {
    console.log('getMessageTypeDisplay called with:', messageType)
    console.log('Current settings:', messageIconSettings)
    console.log('Settings loaded:', settingsLoaded)
    
    // メッセージアイコン表示が無効な場合は何も表示しない
    if (!messageIconSettings.messageIconDisplayEnabled) {
      console.log('Message icon display disabled')
      return null
    }

    switch (messageType) {
      case 'pickup_yes':
        if (!messageIconSettings.showPickupYesIcon) {
          console.log('Pickup yes icon disabled')
          return null
        }
        return {
          icon: Truck,
          text: '検体あり',
          color: '#10b981',
          bgColor: '#dcfce7'
        }
      case 'pickup_no':
        if (!messageIconSettings.showPickupNoIcon) {
          console.log('Pickup no icon disabled')
          return null
        }
        return {
          icon: X,
          text: '検体なし',
          color: '#ef4444',
          bgColor: '#fee2e2'
        }
      case 're_pickup':
        if (!messageIconSettings.showRePickupIcon) {
          console.log('Re-pickup icon disabled')
          return null
        }
        return {
          icon: RotateCcw,
          text: '再集配',
          color: '#f59e0b',
          bgColor: '#fef3c7'
        }
      case 'auto_response':
        return {
          icon: Building2,
          text: '返信',
          color: '#6b7280',
          bgColor: '#f3f4f6'
        }
      default:
        console.log('Unknown message type:', messageType)
        return null
    }
  }

  const renderCustomerItem = (item: Customer) => (
    <div
      key={item.id}
      style={styles.customerCard}
      onClick={() => handleItemPress(item)}
    >
      <div style={styles.customerHeader}>
        <div style={styles.customerInfo}>
          <Building2 size={20} color="#10b981" />
          <div style={styles.customerDetails}>
            <p style={styles.customerId}>ID: {item.id}</p>
            <p style={styles.customerName}>{item.name}</p>
          </div>
        </div>
        <div style={styles.badges}>
          {/* 顧客からのメッセージタイプ表示（検体あり、検体なし、再集配） */}
          {item.latestMessageType && ['pickup_yes', 'pickup_no', 're_pickup'].includes(item.latestMessageType) && (() => {
            const messageDisplay = getMessageTypeDisplay(item.latestMessageType)
            if (messageDisplay) {
              const IconComponent = messageDisplay.icon
              return (
                <div style={{
                  ...styles.messageTypeBadge,
                  backgroundColor: messageDisplay.bgColor,
                  borderColor: messageDisplay.color
                }}>
                  <IconComponent size={12} color={messageDisplay.color} />
                  <span style={{
                    ...styles.messageTypeText,
                    color: messageDisplay.color
                  }}>
                    {messageDisplay.text}
                  </span>
                </div>
              )
            }
            return null
          })()}
          
          {/* 社員からの返信表示 */}
          {item.latestMessageType === 'auto_response' && (
            <div style={{
              ...styles.messageTypeBadge,
              backgroundColor: '#f3f4f6',
              borderColor: '#6b7280'
            }}>
              <Building2 size={12} color="#6b7280" />
              <span style={{
                ...styles.messageTypeText,
                color: '#6b7280'
              }}>
                返信済み
              </span>
            </div>
          )}
          
          {item.rePickup && (
            <div style={styles.rePickupBadge}>
              <span style={styles.rePickupText}>再集配</span>
            </div>
          )}
          {item.unreadCount > 0 && (
            <div style={styles.unreadBadge}>
              <span style={styles.unreadText}>{item.unreadCount}</span>
            </div>
          )}
        </div>
      </div>
      
      <div style={styles.customerMeta}>
        <p style={styles.courseText}>担当コース: {item.course} ({item.courseId})</p>
        {item.phone && (
          <p style={styles.phoneText}>電話: {item.phone}</p>
        )}
      </div>
    </div>
  )

  const renderEmployeeItem = (item: Employee) => (
    <div
      key={item.id}
      style={styles.customerCard}
      onClick={() => handleItemPress(item)}
    >
      <div style={styles.customerHeader}>
        <div style={styles.customerInfo}>
          <UserCheck size={20} color="#4285f4" />
          <div style={styles.customerDetails}>
            <p style={styles.customerId}>ID: {item.id}</p>
            <p style={styles.customerName}>{item.name}</p>
          </div>
        </div>
        <div style={styles.badges}>
          {item.isRePickupAssigned && (
            <div style={styles.rePickupBadge}>
              <RotateCcw size={12} color="#d97706" />
              <span style={styles.rePickupText}>再集配担当</span>
            </div>
          )}
          {item.unreadCount > 0 && (
            <div style={styles.unreadBadge}>
              <span style={styles.unreadText}>{item.unreadCount}</span>
            </div>
          )}
        </div>
      </div>
      
      <div style={styles.customerMeta}>
        <p style={styles.courseText}>担当コース: {item.course} ({item.courseId})</p>
        {item.phone && (
          <p style={styles.phoneText}>電話: {item.phone}</p>
        )}
      </div>
    </div>
  )

  const isLoading = customersLoading && (
    (user?.user_type === 'employee' && customers.length === 0) ||
    (user?.user_type === 'customer' && employees.length === 0)
  )

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>連絡先一覧</h2>
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
        <h2 style={styles.pageTitle}>
          {user?.user_type === 'employee' ? '連絡先一覧' : '担当社員一覧'}
        </h2>
      </div>

      {user?.user_type === 'employee' && (
        <div style={styles.searchContainer}>
          <Search size={20} color="#6b7280" />
          <input
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="医院名またはIDで検索..."
          />
        </div>
      )}

      <div style={styles.customersList}>
        {filteredData.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>
              {searchQuery 
                ? '該当する連絡先が見つかりません' 
                : user?.user_type === 'employee' 
                  ? '担当の顧客がありません'
                  : '担当社員がいません'
              }
            </p>
          </div>
        ) : (
          filteredData.map((item) => 
            user?.user_type === 'employee' 
              ? renderCustomerItem(item as Customer)
              : renderEmployeeItem(item as Employee)
          )
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
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: '16px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    gap: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#1f2937',
  },
  customersList: {
    flex: 1,
    padding: '0 16px 16px',
    overflow: 'auto',
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },
  customerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  customerInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
  },
  customerDetails: {
    flex: 1,
  },
  customerId: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
    margin: '0 0 4px 0',
  },
  customerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  messageTypeBadge: {
    padding: '3px 6px',
    borderRadius: '4px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    minWidth: 'fit-content',
  },
  messageTypeText: {
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap' as const,
  },
  rePickupBadge: {
    backgroundColor: '#fef3c7',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #f59e0b',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  rePickupText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#d97706',
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
  customerMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  courseText: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
    margin: '0',
  },
  phoneText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
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

export default CustomersPage