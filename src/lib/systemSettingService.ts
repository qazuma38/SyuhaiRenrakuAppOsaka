import { supabase } from './supabase'
import { SystemSetting } from '../types/auth'

export class SystemSettingService {
  // システム設定を取得
  static async getSystemSettings(): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_setting')
        .select('*')
        .order('setting_key', { ascending: true })

      if (error) {
        console.error('Error fetching system settings:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getSystemSettings:', error)
      throw error
    }
  }

  // 特定の設定値を取得
  static async getSettingValue(settingKey: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('system_setting')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single()

      if (error) {
        console.error('Error fetching setting value:', error)
        return null
      }

      return data?.setting_value || null
    } catch (error) {
      console.error('Error in getSettingValue:', error)
      return null
    }
  }

  // 設定値を更新
  static async updateSettingValue(settingKey: string, settingValue: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_setting')
        .update({ setting_value: settingValue })
        .eq('setting_key', settingKey)

      if (error) {
        console.error('Error updating setting value:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateSettingValue:', error)
      return false
    }
  }

  // 新しい設定を作成
  static async createSetting(settingKey: string, settingValue: string, description?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_setting')
        .insert({
          setting_key: settingKey,
          setting_value: settingValue,
          description: description
        })

      if (error) {
        console.error('Error creating setting:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in createSetting:', error)
      return false
    }
  }

  // 設定を削除
  static async deleteSetting(settingKey: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_setting')
        .delete()
        .eq('setting_key', settingKey)

      if (error) {
        console.error('Error deleting setting:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteSetting:', error)
      return false
    }
  }

  // メッセージアイコン表示設定を取得
  static async getMessageIconSettings(): Promise<{
    showPickupYesIcon: boolean;
    showPickupNoIcon: boolean;
    showRePickupIcon: boolean;
    messageIconDisplayEnabled: boolean;
  }> {
    try {
      console.log('SystemSettingService: Getting message icon settings...')
      const settings = await this.getSystemSettings()
      console.log('SystemSettingService: All settings:', settings)
      
      const getSettingBoolean = (key: string, defaultValue: boolean = true): boolean => {
        const setting = settings.find(s => s.setting_key === key)
        const value = setting ? setting.setting_value === 'true' : defaultValue
        console.log(`SystemSettingService: Setting ${key} = ${value} (raw: ${setting?.setting_value})`)
        return value
      }

      const result = {
        showPickupYesIcon: getSettingBoolean('show_pickup_yes_icon'),
        showPickupNoIcon: getSettingBoolean('show_pickup_no_icon'),
        showRePickupIcon: getSettingBoolean('show_re_pickup_icon'),
        messageIconDisplayEnabled: getSettingBoolean('message_icon_display_enabled')
      }
      
      console.log('SystemSettingService: Final result:', result)
      return result
    } catch (error) {
      console.error('Error in getMessageIconSettings:', error)
      // エラー時はデフォルト値を返す
      return {
        showPickupYesIcon: true,
        showPickupNoIcon: true,
        showRePickupIcon: true,
        messageIconDisplayEnabled: true
      }
    }
  }

  // メッセージアイコン表示設定を更新
  static async updateMessageIconSettings(settings: {
    showPickupYesIcon?: boolean;
    showPickupNoIcon?: boolean;
    showRePickupIcon?: boolean;
    messageIconDisplayEnabled?: boolean;
  }): Promise<boolean> {
    try {
      console.log('SystemSettingService: Updating settings:', settings)
      const updates = []

      if (settings.showPickupYesIcon !== undefined) {
        const updatePromise = this.updateSettingValue('show_pickup_yes_icon', settings.showPickupYesIcon.toString())
        updates.push(updatePromise)
        console.log('SystemSettingService: Updating show_pickup_yes_icon to', settings.showPickupYesIcon.toString())
      }
      if (settings.showPickupNoIcon !== undefined) {
        const updatePromise = this.updateSettingValue('show_pickup_no_icon', settings.showPickupNoIcon.toString())
        updates.push(updatePromise)
        console.log('SystemSettingService: Updating show_pickup_no_icon to', settings.showPickupNoIcon.toString())
      }
      if (settings.showRePickupIcon !== undefined) {
        const updatePromise = this.updateSettingValue('show_re_pickup_icon', settings.showRePickupIcon.toString())
        updates.push(updatePromise)
        console.log('SystemSettingService: Updating show_re_pickup_icon to', settings.showRePickupIcon.toString())
      }
      if (settings.messageIconDisplayEnabled !== undefined) {
        const updatePromise = this.updateSettingValue('message_icon_display_enabled', settings.messageIconDisplayEnabled.toString())
        updates.push(updatePromise)
        console.log('SystemSettingService: Updating message_icon_display_enabled to', settings.messageIconDisplayEnabled.toString())
      }

      const results = await Promise.all(updates)
      console.log('SystemSettingService: Update results:', results)
      return results.every(result => result === true)
    } catch (error) {
      console.error('Error in updateMessageIconSettings:', error)
      return false
    }
  }
}