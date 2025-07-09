export interface User {
  id: string;
  name?: string;
  phone?: string;
  password?: string;
  user_type: 'customer' | 'employee';
  fcm_token?: string;
  base?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  sessionExpiry: string | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  login_time: string;
  expire_time: string;
  is_active: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  base?: string;
  created_at: string;
}

export interface CustomerCourse {
  id: string;
  customer_id: string;
  course_id: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  re_pickup: boolean;
  created_at: string;
}

export interface EmployeeCourse {
  employee_id: string; // 主キー
  course_id: string;
  assigned_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisteredCourse {
  id: string;
  employee_id: string;
  course_id: string;
  course_name: string;
  created_at: string;
}

export interface PresetMessage {
  id: string;
  customer_id?: string;
  message: string;
  message_type: 'pickup_yes' | 'pickup_no' | 're_pickup' | 'custom';
  order_index: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'pickup_yes' | 'pickup_no' | 're_pickup' | 'auto_response';
  sender_type: 'customer' | 'employee' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface MessageLog {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'pickup_yes' | 'pickup_no' | 're_pickup' | 'auto_response';
  sender_type: 'customer' | 'employee' | 'system';
  original_message_id?: string;
  created_at: string;
  expires_at: string;
}

export interface NotificationHistory {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  sent_at: string;
  delivery_status: 'sent' | 'delivered' | 'failed';
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  course: string;
  courseId: string;
  rePickup: boolean;
  unreadCount: number;
  latestMessageType?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  course: string;
  courseId: string;
  isRePickupAssigned: boolean;
  unreadCount: number;
}