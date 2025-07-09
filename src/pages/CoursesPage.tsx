import React, { useState, useEffect } from 'react'
import { MapPin, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppSelector } from '../hooks/useAppSelector'
import { Course, EmployeeCourse } from '../types/auth'

interface CourseWithEmployee extends Course {
  assignedEmployee?: {
    id: string
    name: string
  }
}

const CoursesPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [courses, setCourses] = useState<CourseWithEmployee[]>([])
  const [employeeCourses, setEmployeeCourses] = useState<EmployeeCourse[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user || user.user_type !== 'employee') {
      setLoading(false)
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]

      // まず社員の拠点を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('base')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('Error fetching user base:', userError)
        alert('ユーザー情報の取得に失敗しました')
        return
      }

      // 同じ拠点のコースのみ取得
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('base', userData.base)
        .order('id')

      if (coursesError) {
        console.error('Error loading courses:', coursesError)
        alert('コースデータの読み込みに失敗しました')
        return
      }

      // 同じ拠点の社員のコース担当情報を取得
      const { data: allEmployeeCoursesData, error: allEmployeeCoursesError } = await supabase
        .from('employee_courses')
        .select(`
          *,
          users!employee_courses_employee_id_fkey(id, name, base),
          courses!employee_courses_course_id_fkey(id, name, base)
        `)
        .eq('assigned_date', today)
        .eq('is_active', true)

      if (allEmployeeCoursesError) {
        console.error('Error loading all employee courses:', allEmployeeCoursesError)
        alert('担当コースの読み込みに失敗しました')
        return
      }

      // 同じ拠点の担当情報のみフィルタリング
      const filteredEmployeeCourses = allEmployeeCoursesData?.filter(assignment => 
        assignment.users?.base === userData.base && assignment.courses?.base === userData.base
      ) || []

      // Load current employee's course assignments for today
      const { data: employeeCoursesData, error: employeeCoursesError } = await supabase
        .from('employee_courses')
        .select('*')
        .eq('employee_id', user.id)
        .eq('assigned_date', today)
        .eq('is_active', true)

      if (employeeCoursesError) {
        console.error('Error loading employee courses:', employeeCoursesError)
        alert('担当コースの読み込みに失敗しました')
        return
      }

      // Create a map of course assignments
      const courseAssignments = new Map()
      filteredEmployeeCourses.forEach(assignment => {
        courseAssignments.set(assignment.course_id, {
          id: assignment.employee_id,
          name: assignment.users?.name || `社員${assignment.employee_id}`
        })
      })

      // Combine courses with assigned employee information
      const coursesWithEmployees: CourseWithEmployee[] = (coursesData || []).map(course => ({
        ...course,
        assignedEmployee: courseAssignments.get(course.id)
      }))

      setCourses(coursesWithEmployees)
      setEmployeeCourses(employeeCoursesData || [])
    } catch (error) {
      console.error('Error in loadData:', error)
      alert('データの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleCourseAssignment = async (courseId: string) => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Check if already assigned
      const existingAssignment = employeeCourses.find(ec => ec.course_id === courseId)
      
      if (existingAssignment) {
        // Remove assignment
        const { error } = await supabase
          .from('employee_courses')
          .update({ is_active: false })
          .eq('employee_id', user.id)
          .eq('course_id', courseId)
          .eq('assigned_date', today)

        if (error) {
          alert('コース担当の解除に失敗しました')
          return
        }
      } else {
        // Add assignment (upsert to handle primary key constraint)
        const { error } = await supabase
          .from('employee_courses')
          .upsert({
            employee_id: user.id,
            course_id: courseId,
            assigned_date: today,
            is_active: true
          }, {
            onConflict: 'employee_id'
          })

        if (error) {
          alert('コース担当の設定に失敗しました')
          return
        }
      }

      // Reload data
      await loadData()
      alert('コース担当を更新しました')
    } catch (error) {
      console.error('Error in handleCourseAssignment:', error)
      alert('コース担当の更新中にエラーが発生しました')
    }
  }

  const assignedCourseIds = employeeCourses.map(ec => ec.course_id)

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h2 style={styles.pageTitle}>コース担当</h2>
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
        <h2 style={styles.pageTitle}>コース担当</h2>
      </div>

      <div style={styles.content}>
        <div style={styles.userInfo}>
          <p style={styles.userIdText}>ユーザーID：{user?.id}</p>
          <p style={styles.userNameText}>ユーザー名：{user?.name}</p>
          <p style={styles.currentCourseText}>
            本日の担当コース：{assignedCourseIds.join(', ') || 'なし'}
          </p>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>コース一覧</h3>
          {courses.map((course) => {
            const isAssignedToMe = assignedCourseIds.includes(course.id)
            const isAssignedToOther = course.assignedEmployee && course.assignedEmployee.id !== user?.id
            
            return (
              <div
                key={course.id}
                style={{
                  ...styles.courseItem,
                  ...(isAssignedToMe ? styles.assignedToMeCourseItem : {}),
                  ...(isAssignedToOther ? styles.assignedToOtherCourseItem : {}),
                }}
                onClick={() => !isAssignedToOther && handleCourseAssignment(course.id)}
              >
                <div style={styles.courseInfo}>
                  <MapPin size={20} color={
                    isAssignedToMe ? '#10b981' : 
                    isAssignedToOther ? '#ef4444' : 
                    '#6b7280'
                  } />
                  <div style={styles.courseDetails}>
                    <p style={{
                      ...styles.courseName,
                      ...(isAssignedToMe ? styles.assignedToMeCourseName : {}),
                      ...(isAssignedToOther ? styles.assignedToOtherCourseName : {}),
                    }}>
                      {course.name}
                    </p>
                    <p style={styles.courseId}>{course.id}</p>
                    {course.assignedEmployee && (
                      <div style={styles.assignedEmployeeInfo}>
                        <User size={14} color="#6b7280" />
                        <span style={styles.assignedEmployeeName}>
                          担当: {course.assignedEmployee.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  ...styles.assignmentBadge,
                  ...(isAssignedToMe ? styles.assignedToMeBadge : 
                      isAssignedToOther ? styles.assignedToOtherBadge : 
                      styles.unassignedBadge),
                }}>
                  <span style={{
                    ...styles.assignmentText,
                    ...(isAssignedToMe ? styles.assignedToMeText : 
                        isAssignedToOther ? styles.assignedToOtherText : 
                        styles.unassignedText),
                  }}>
                    {isAssignedToMe ? '担当中' : 
                     isAssignedToOther ? '他社員担当' : 
                     '未担当'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
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
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  userInfo: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb',
  },
  userIdText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  userNameText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  currentCourseText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '600',
    margin: '0',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  courseItem: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  assignedToMeCourseItem: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  assignedToOtherCourseItem: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  courseInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  courseDetails: {
    flex: 1,
  },
  courseName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  assignedToMeCourseName: {
    color: '#10b981',
  },
  assignedToOtherCourseName: {
    color: '#ef4444',
  },
  courseId: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '2px',
    margin: '2px 0 0 0',
  },
  assignedEmployeeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  assignedEmployeeName: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  assignmentBadge: {
    padding: '6px 12px',
    borderRadius: '16px',
  },
  assignedToMeBadge: {
    backgroundColor: '#dcfce7',
  },
  assignedToOtherBadge: {
    backgroundColor: '#fee2e2',
  },
  unassignedBadge: {
    backgroundColor: '#f3f4f6',
  },
  assignmentText: {
    fontSize: '12px',
    fontWeight: '600',
  },
  assignedToMeText: {
    color: '#16a34a',
  },
  assignedToOtherText: {
    color: '#dc2626',
  },
  unassignedText: {
    color: '#6b7280',
  },
}

export default CoursesPage