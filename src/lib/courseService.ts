import { supabase } from './supabase'
import { RegisteredCourse, EmployeeCourse } from '../types/auth'

export class CourseService {
  // 社員の登録コースを取得
  static async getRegisteredCourses(employeeId: string): Promise<RegisteredCourse[]> {
    try {
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

      const { data, error } = await supabase
        .from('registered_courses')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching registered courses:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getRegisteredCourses:', error)
      throw error
    }
  }

  // 今日の担当コースを取得
  static async getTodaysAssignedCourses(employeeId: string): Promise<EmployeeCourse[]> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('employee_courses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('assigned_date', today)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching assigned courses:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getTodaysAssignedCourses:', error)
      throw error
    }
  }

  // 登録コースを設定（既存を置き換え）
  static async setRegisteredCourse(employeeId: string, courseId: string, courseName: string): Promise<boolean> {
    try {
      // 新しいコースを登録（既存のコースは保持）
      const { error } = await supabase
        .from('registered_courses')
        .upsert({
          employee_id: employeeId,
          course_id: courseId,
          course_name: courseName
        }, {
          onConflict: 'employee_id,course_id'
        })

      if (error) {
        console.error('Error upserting course:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in setRegisteredCourse:', error)
      return false
    }
  }

  // 今日のコース担当を設定
  static async assignCourseToday(employeeId: string, courseId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('employee_courses')
        .upsert({
          employee_id: employeeId,
          course_id: courseId,
          assigned_date: today,
          is_active: true
        }, {
          onConflict: 'employee_id'
        })

      if (error) {
        console.error('Error assigning course:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in assignCourseToday:', error)
      return false
    }
  }

  // 今日のコース担当を解除
  static async unassignCourseToday(employeeId: string, courseId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('employee_courses')
        .update({ is_active: false })
        .eq('employee_id', employeeId)
        .eq('course_id', courseId)
        .eq('assigned_date', today)

      if (error) {
        console.error('Error unassigning course:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in unassignCourseToday:', error)
      return false
    }
  }

  // 登録コースを削除
  static async removeRegisteredCourse(employeeId: string, courseId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('registered_courses')
        .delete()
        .eq('employee_id', employeeId)
        .eq('course_id', courseId)

      if (error) {
        console.error('Error removing registered course:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in removeRegisteredCourse:', error)
      return false
    }
  }

  // 拠点別のコース一覧を取得
  static async getCoursesByBase(base: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('base', base)
        .order('id')

      if (error) {
        console.error('Error fetching courses by base:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getCoursesByBase:', error)
      throw error
    }
  }
}