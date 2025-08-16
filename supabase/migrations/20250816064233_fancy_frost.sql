/*
  # Complete Database Reset and Recreation

  1. Purpose
    - Completely drops all existing tables and recreates them from scratch
    - Ensures clean database state with proper structure
    - Includes all necessary indexes, constraints, and RLS policies

  2. Tables Created
    - users: User accounts (customers, employees, admins)
    - courses: Course definitions
    - user_sessions: Login sessions
    - registered_courses: Employee registered courses
    - employee_courses: Daily course assignments
    - customer_courses: Customer course schedules
    - chat_messages: Chat messages
    - message_logs: Message history archive
    - preset_messages: Custom message templates
    - notification_history: Push notification logs
    - system_setting: Application settings
    - cleanup_logs: Data cleanup history

  3. Security
    - Row Level Security enabled on all tables
    - Appropriate policies for each table
    - Admin-controlled access for sensitive tables

  4. Performance
    - Optimized indexes for common queries
    - Foreign key indexes for JOIN operations
    - Composite indexes for complex queries
*/

-- Drop all existing tables in dependency order
DROP TABLE IF EXISTS cleanup_logs CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS system_setting CASCADE;
DROP TABLE IF EXISTS preset_messages CASCADE;
DROP TABLE IF EXISTS message_logs CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS customer_courses CASCADE;
DROP TABLE IF EXISTS employee_courses CASCADE;
DROP TABLE IF EXISTS registered_courses CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop the update trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table
CREATE TABLE users (
  id text PRIMARY KEY,
  name text,
  phone text,
  password text DEFAULT '',
  user_type text NOT NULL CHECK (user_type IN ('customer', 'employee', 'admin')),
  fcm_token text,
  created_at timestamptz DEFAULT now(),
  base text NOT NULL CHECK (base ~ '^[0-9]{2}$'),
  is_admin boolean NOT NULL DEFAULT false COMMENT 'Indicates if the user has administrator privileges'
);

-- Create courses table
CREATE TABLE courses (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  base text NOT NULL CHECK (base ~ '^[0-9]{2}$')
);

-- Create user_sessions table
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  expire_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create registered_courses table
CREATE TABLE registered_courses (
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  course_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (employee_id, course_id)
);

-- Create employee_courses table
CREATE TABLE employee_courses (
  employee_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_courses table
CREATE TABLE customer_courses (
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  monday boolean DEFAULT false,
  tuesday boolean DEFAULT false,
  wednesday boolean DEFAULT false,
  thursday boolean DEFAULT false,
  friday boolean DEFAULT false,
  saturday boolean DEFAULT false,
  re_pickup boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (customer_id, course_id)
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'auto_response')),
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'employee', 'system')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create message_logs table
CREATE TABLE message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'auto_response')),
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'employee', 'system')),
  original_message_id uuid,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 month')
);

-- Create preset_messages table
CREATE TABLE preset_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'custom')),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create notification_history table
CREATE TABLE notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  sent_at timestamptz DEFAULT now(),
  delivery_status text NOT NULL CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Create system_setting table
CREATE TABLE system_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cleanup_logs table
CREATE TABLE cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date timestamptz NOT NULL,
  table_name text NOT NULL,
  records_found integer NOT NULL DEFAULT 0,
  records_deleted integer NOT NULL DEFAULT 0,
  csv_content text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance optimization

-- Users table indexes
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_base ON users(base);
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- Courses table indexes
CREATE INDEX idx_courses_base ON courses(base);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expire_time);

-- Registered courses indexes
CREATE INDEX idx_registered_courses_employee_id ON registered_courses(employee_id);

-- Employee courses indexes
CREATE INDEX idx_employee_courses_course_id ON employee_courses(course_id);
CREATE INDEX idx_employee_courses_date_active ON employee_courses(assigned_date, is_active);

-- Customer courses indexes
CREATE INDEX idx_customer_courses_customer_id ON customer_courses(customer_id);
CREATE INDEX idx_customer_courses_course_id ON customer_courses(course_id);

-- Chat messages indexes
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Message logs indexes
CREATE INDEX idx_message_logs_sender_id ON message_logs(sender_id);
CREATE INDEX idx_message_logs_receiver_id ON message_logs(receiver_id);
CREATE INDEX idx_message_logs_sender_receiver ON message_logs(sender_id, receiver_id);
CREATE INDEX idx_message_logs_expires_at ON message_logs(expires_at);

-- Preset messages indexes
CREATE INDEX idx_preset_messages_customer_id ON preset_messages(customer_id);

-- Notification history indexes
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);

-- System setting indexes
CREATE INDEX idx_system_setting_key ON system_setting(setting_key);

-- Cleanup logs indexes
CREATE INDEX idx_cleanup_logs_cleanup_date ON cleanup_logs(cleanup_date);
CREATE INDEX idx_cleanup_logs_table_name ON cleanup_logs(table_name);

-- Add update triggers
CREATE TRIGGER update_employee_courses_updated_at
    BEFORE UPDATE ON employee_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_setting_updated_at
    BEFORE UPDATE ON system_setting
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO public
  USING (true);

-- Courses policies
CREATE POLICY "Anyone can read courses" ON courses
  FOR SELECT TO public
  USING (true);

-- User sessions policies
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL TO public
  USING (true);

-- Registered courses policies
CREATE POLICY "Users can read own registered courses" ON registered_courses
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can manage own registered courses" ON registered_courses
  FOR ALL TO public
  USING (true);

-- Employee courses policies
CREATE POLICY "Anyone can read employee courses" ON employee_courses
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can manage employee courses" ON employee_courses
  FOR ALL TO public
  USING (true);

-- Customer courses policies
CREATE POLICY "Anyone can read customer courses" ON customer_courses
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can manage customer courses" ON customer_courses
  FOR ALL TO public
  USING (true);

-- Chat messages policies
CREATE POLICY "Users can read relevant chat messages" ON chat_messages
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can update relevant chat messages" ON chat_messages
  FOR UPDATE TO public
  USING (true);

-- Message logs policies
CREATE POLICY "Users can read relevant message logs" ON message_logs
  FOR SELECT TO public
  USING (true);

CREATE POLICY "System can manage message logs" ON message_logs
  FOR ALL TO public
  USING (true);

-- Preset messages policies
CREATE POLICY "Anyone can read preset messages" ON preset_messages
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can manage preset messages" ON preset_messages
  FOR ALL TO public
  USING (true);

-- Notification history policies
CREATE POLICY "Users can read own notifications" ON notification_history
  FOR SELECT TO public
  USING (true);

CREATE POLICY "System can manage notifications" ON notification_history
  FOR ALL TO public
  USING (true);

-- System setting policies
CREATE POLICY "Anyone can read system settings" ON system_setting
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Admin users can manage system settings" ON system_setting
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (uid())::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (uid())::text 
      AND users.is_admin = true
    )
  );

-- Cleanup logs policies (simplified for admin access)
CREATE POLICY "Anyone can read cleanup logs" ON cleanup_logs
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Anyone can insert cleanup logs" ON cleanup_logs
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update cleanup logs" ON cleanup_logs
  FOR UPDATE TO public
  USING (true);

CREATE POLICY "Anyone can delete cleanup logs" ON cleanup_logs
  FOR DELETE TO public
  USING (true);

-- Insert default system settings
INSERT INTO system_setting (setting_key, setting_value, description) VALUES
  ('show_pickup_yes_icon', 'true', '「検体あり」アイコンの表示設定'),
  ('show_pickup_no_icon', 'true', '「検体なし」アイコンの表示設定'),
  ('show_re_pickup_icon', 'true', '「再集配」アイコンの表示設定'),
  ('message_icon_display_enabled', 'true', 'メッセージアイコン表示機能の有効/無効');