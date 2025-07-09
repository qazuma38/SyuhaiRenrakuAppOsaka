import { supabase } from './supabase'
import { NotificationService } from './notificationService'
import { ChatMessage, Customer, Employee } from '../types/auth'

export class ChatService {
  // 過去5日のメッセージを取得
  static async getRecentMessages(contactId: string, currentUserId: string): Promise<ChatMessage[]> {
    try {
      const now = new Date()
      const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)) // 5日前

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${contactId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${contactId})`)
        .gte('created_at', fiveDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentMessages:', error)
      throw error
    }
  }

  // メッセージを送信
  static async sendMessage(
    receiverId: string,
    senderId: string,
    message: string,
    messageType: 'pickup_yes' | 'pickup_no' | 're_pickup' | 'auto_response',
    senderType: 'customer' | 'employee' | 'system',
    actualSenderId: string
  ): Promise<boolean> {
    try {
      // チャットメッセージを保存
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: actualSenderId,
          receiver_id: receiverId,
          message,
          message_type: messageType,
          sender_type: senderType,
          is_read: false
        })
        .select()
        .single()

      if (chatError) {
        console.error('Error saving chat message:', chatError)
        return false
      }

      // メッセージログを保存
      const { error: logError } = await supabase
        .from('message_logs')
        .insert({
          sender_id: actualSenderId,
          receiver_id: receiverId,
          message,
          message_type: messageType,
          sender_type: senderType,
          original_message_id: chatData.id
        })

      if (logError) {
        console.error('Error saving message log:', logError)
      }

      // プッシュ通知を送信
      try {
        const { data: senderData } = await supabase
          .from('users')
          .select('name')
          .eq('id', actualSenderId)
          .single()

        const senderName = senderData?.name || `ユーザー${actualSenderId}`
        
        // 受信者（receiverId）にプッシュ通知を送信
        await NotificationService.sendNotification(
          receiverId,
          `${senderName}からメッセージ`,
          message,
          {
            chatId: actualSenderId,
            messageType: messageType,
            senderId: actualSenderId
          }
        )
        
        console.log(`Notification sent to receiver: ${receiverId} from sender: ${actualSenderId}`)
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
        // 通知エラーはメッセージ送信の成功に影響しない
      }

      return true
    } catch (error) {
      console.error('Error in sendMessage:', error)
      return false
    }
  }

  // メッセージを既読にする
  static async markMessagesAsRead(currentUserId: string, contactId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', contactId)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking messages as read:', error)
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error)
    }
  }

  // 社員の担当顧客を取得
  static async getCustomersForEmployee(employeeId: string): Promise<Customer[]> {
    try {
      // 今日の曜日を取得（0=日曜, 1=月曜, ..., 6=土曜）
      const today = new Date()
      const dayOfWeek = today.getDay()
      
      // 曜日に対応するフィールド名を取得
      const dayFields = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayField = dayFields[dayOfWeek]
      
      // 日曜日の場合は何も表示しない
      if (dayOfWeek === 0) {
        return []
      }

      // まず社員の拠点を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('base')
        .eq('id', employeeId)
        .single()

      if (userError) {
        console.error('Error fetching user base:', userError)
        throw userError
      }

      const todayDateString = new Date().toISOString().split('T')[0]

      // 社員の今日の担当コースを取得
      const { data: employeeCourses, error: courseError } = await supabase
        .from('employee_courses')
        .select('course_id')
        .eq('employee_id', employeeId)
        .eq('assigned_date', todayDateString)
        .eq('is_active', true)

      if (courseError) {
        console.error('Error fetching employee courses:', courseError)
        throw courseError
      }

      if (!employeeCourses || employeeCourses.length === 0) {
        return []
      }

      const courseIds = employeeCourses.map(ec => ec.course_id)

      // 担当コースの顧客を取得
      const { data: customerCourses, error: customerError } = await supabase
        .from('customer_courses')
        .select(`
          customer_id,
          course_id,
          monday,
          tuesday,
          wednesday,
          thursday,
          friday,
          saturday,
          re_pickup,
          users!customer_courses_customer_id_fkey(id, name, phone, base),
          courses!customer_courses_course_id_fkey(id, name, base)
        `)
        .in('course_id', courseIds)
        .eq(todayField, true)

      if (customerError) {
        console.error('Error fetching customers:', customerError)
        throw customerError
      }

      // 同じ拠点の顧客のみフィルタリング
      const filteredCustomerCourses = customerCourses?.filter(cc => 
        cc.users?.base === userData.base && cc.courses?.base === userData.base
      ) || []

      // 未読メッセージ数を取得
      const customerIds = filteredCustomerCourses.map(cc => cc.customer_id)
      const unreadCounts = await this.getUnreadCounts(employeeId, customerIds)
      
      // 最新メッセージタイプを取得
      const latestMessageTypes = await this.getLatestMessageTypes(employeeId, customerIds)

      // 顧客データを整形
      const customers: Customer[] = filteredCustomerCourses.map(cc => ({
        id: cc.customer_id,
        name: cc.users?.name || `顧客${cc.customer_id}`,
        phone: cc.users?.phone || '',
        course: cc.courses?.name || '',
        courseId: cc.course_id,
        rePickup: cc.re_pickup || false,
        unreadCount: unreadCounts[cc.customer_id] || 0,
        latestMessageType: latestMessageTypes[cc.customer_id] || null
      }))

      return customers
    } catch (error) {
      console.error('Error in getCustomersForEmployee:', error)
      throw error
    }
  }

  // 顧客の担当社員を取得
  static async getEmployeesForCustomer(customerId: string): Promise<Employee[]> {
    try {
      // 今日の曜日を取得（0=日曜, 1=月曜, ..., 6=土曜）
      const today = new Date()
      const dayOfWeek = today.getDay()
      
      // 曜日に対応するフィールド名を取得
      const dayFields = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayField = dayFields[dayOfWeek]
      
      // 日曜日の場合は何も表示しない
      if (dayOfWeek === 0) {
        return []
      }

      // まず顧客の拠点を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('base')
        .eq('id', customerId)
        .single()

      if (userError) {
        console.error('Error fetching user base:', userError)
        throw userError
      }

      const todayDateString = new Date().toISOString().split('T')[0]

      // 顧客のコースを取得
      const { data: customerCourses, error: courseError } = await supabase
        .from('customer_courses')
        .select(`
          course_id,
          re_pickup,
          monday,
          tuesday,
          wednesday,
          thursday,
          friday,
          saturday
        `)
        .eq('customer_id', customerId)
        .eq(todayField, true)

      if (courseError) {
        console.error('Error fetching customer courses:', courseError)
        throw courseError
      }

      if (!customerCourses || customerCourses.length === 0) {
        return []
      }

      const courseIds = customerCourses.map(cc => cc.course_id)
      
      // 再集配対象のコースIDを取得
      const rePickupCourseIds = customerCourses
        .filter(cc => cc.re_pickup === true)
        .map(cc => cc.course_id)

      // 今日そのコースを担当している社員を取得
      const { data: employeeCourses, error: employeeError } = await supabase
        .from('employee_courses')
        .select(`
          employee_id,
          course_id,
          users!employee_courses_employee_id_fkey(id, name, phone, base),
          courses!employee_courses_course_id_fkey(id, name, base)
        `)
        .in('course_id', courseIds)
        .eq('assigned_date', todayDateString)
        .eq('is_active', true)

      if (employeeError) {
        console.error('Error fetching employees:', employeeError)
        throw employeeError
      }

      // 同じ拠点の社員のみフィルタリング
      const filteredEmployeeCourses = employeeCourses?.filter(ec => 
        ec.users?.base === userData.base && ec.courses?.base === userData.base
      ) || []

      // 未読メッセージ数を取得
      const employeeIds = filteredEmployeeCourses.map(ec => ec.employee_id)
      const unreadCounts = await this.getUnreadCounts(customerId, employeeIds)

      // 社員データを整形
      const employees: Employee[] = filteredEmployeeCourses.map(ec => ({
        id: ec.employee_id,
        name: ec.users?.name || `社員${ec.employee_id}`,
        phone: ec.users?.phone || '',
        course: ec.courses?.name || '',
        courseId: ec.course_id,
        isRePickupAssigned: rePickupCourseIds.includes(ec.course_id),
        unreadCount: unreadCounts[ec.employee_id] || 0
      }))

      return employees
    } catch (error) {
      console.error('Error in getEmployeesForCustomer:', error)
      throw error
    }
  }

  // 未読メッセージ数を取得
  private static async getUnreadCounts(currentUserId: string, contactIds: string[]): Promise<Record<string, number>> {
    try {
      if (contactIds.length === 0) {
        return {}
      }

      const now = new Date()
      const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000))

      const { data, error } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .in('sender_id', contactIds)
        .eq('is_read', false)
        .gte('created_at', fiveDaysAgo.toISOString())

      if (error) {
        console.error('Error fetching unread counts:', error)
        return {}
      }

      // 送信者IDごとの未読数をカウント
      const counts: Record<string, number> = {}
      data?.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
      })

      return counts
    } catch (error) {
      console.error('Error in getUnreadCounts:', error)
      return {}
    }
  }
  
  // 最新メッセージタイプを取得
  private static async getLatestMessageTypes(currentUserId: string, contactIds: string[]): Promise<Record<string, string>> {
    try {
      if (contactIds.length === 0) {
        return {}
      }

      const now = new Date()
      const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000))

      // 各顧客の最新メッセージを取得
      const latestMessages: Record<string, string> = {}
      
      for (const contactId of contactIds) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('message_type, sender_id')
          .or(`and(sender_id.eq.${contactId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${contactId})`)
          .gte('created_at', fiveDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        if (!error && data && data.length > 0) {
          latestMessages[contactId] = data[0].message_type
        }
      }

      return latestMessages
    } catch (error) {
      console.error('Error in getLatestMessageTypes:', error)
      return {}
    }
  }
}