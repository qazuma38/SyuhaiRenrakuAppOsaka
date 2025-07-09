import { supabase } from './supabase'
import { PresetMessage } from '../types/auth'

export class PresetMessageService {
  // 顧客のカスタム定型メッセージを取得
  static async getCustomerPresetMessages(customerId: string): Promise<PresetMessage[]> {
    try {
      const { data, error } = await supabase
        .from('preset_messages')
        .select('*')
        .eq('customer_id', customerId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching preset messages:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getCustomerPresetMessages:', error)
      throw error
    }
  }

  // カスタム定型メッセージを作成
  static async createPresetMessage(
    customerId: string,
    message: string,
    messageType: 'pickup_yes' | 'pickup_no' | 're_pickup' | 'custom',
    orderIndex: number = 0
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('preset_messages')
        .insert({
          customer_id: customerId,
          message,
          message_type: messageType,
          order_index: orderIndex
        })

      if (error) {
        console.error('Error creating preset message:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in createPresetMessage:', error)
      return false
    }
  }

  // カスタム定型メッセージを更新
  static async updatePresetMessage(
    messageId: string,
    message: string,
    messageType: 'pickup_yes' | 'pickup_no' | 're_pickup' | 'custom',
    orderIndex: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('preset_messages')
        .update({
          message,
          message_type: messageType,
          order_index: orderIndex
        })
        .eq('id', messageId)

      if (error) {
        console.error('Error updating preset message:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updatePresetMessage:', error)
      return false
    }
  }

  // カスタム定型メッセージを削除
  static async deletePresetMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('preset_messages')
        .delete()
        .eq('id', messageId)

      if (error) {
        console.error('Error deleting preset message:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deletePresetMessage:', error)
      return false
    }
  }
}