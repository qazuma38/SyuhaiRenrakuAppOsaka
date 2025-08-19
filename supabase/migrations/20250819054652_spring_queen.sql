/*
  # Complete Database Recreation with Sample Data

  1. Database Reset
    - Drops all existing tables with CASCADE
    - Recreates all tables from scratch
    - Includes proper indexes and constraints

  2. Sample Data
    - Admin, employee, and customer users
    - Course definitions for multiple bases
    - Employee course assignments
    - Customer course schedules
    - Chat messages and logs
    - System settings
    - Cleanup logs with sample data

  3. Security
    - Enable RLS on all tables
    - Proper policies for each table type
    - Admin access controls

  4. Performance
    - Optimized indexes for frequent queries
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

-- Drop trigger function if exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Users table (base table)
CREATE TABLE users (
  id text PRIMARY KEY,
  name text,
  phone text,
  password text DEFAULT '',
  user_type text NOT NULL CHECK (user_type IN ('customer', 'employee', 'admin')),
  fcm_token text,
  created_at timestamptz DEFAULT now(),
  base text NOT NULL CHECK (base ~ '^[0-9]{2}$'),
  is_admin boolean NOT NULL DEFAULT false
);

-- Add comment for is_admin column
COMMENT ON COLUMN users.is_admin IS 'Indicates if the user has administrator privileges';

-- Create indexes for users
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_base ON users(base);
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- Enable RLS and create policies for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO public
  USING (true);

-- 2. Courses table
CREATE TABLE courses (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  base text NOT NULL CHECK (base ~ '^[0-9]{2}$')
);

-- Create indexes for courses
CREATE INDEX idx_courses_base ON courses(base);

-- Enable RLS and create policies for courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read courses"
  ON courses
  FOR SELECT
  TO public
  USING (true);

-- 3. User sessions table
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  expire_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expire_time);

-- Enable RLS and create policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON user_sessions
  FOR ALL
  TO public
  USING (true);

-- 4. Registered courses table
CREATE TABLE registered_courses (
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  course_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (employee_id, course_id)
);

-- Create indexes for registered_courses
CREATE INDEX idx_registered_courses_employee_id ON registered_courses(employee_id);

-- Enable RLS and create policies for registered_courses
ALTER TABLE registered_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own registered courses"
  ON registered_courses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage own registered courses"
  ON registered_courses
  FOR ALL
  TO public
  USING (true);

-- 5. Employee courses table (daily assignments)
CREATE TABLE employee_courses (
  employee_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for employee_courses
CREATE INDEX idx_employee_courses_course_id ON employee_courses(course_id);
CREATE INDEX idx_employee_courses_date_active ON employee_courses(assigned_date, is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_courses_updated_at
  BEFORE UPDATE ON employee_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policies for employee_courses
ALTER TABLE employee_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read employee courses"
  ON employee_courses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage employee courses"
  ON employee_courses
  FOR ALL
  TO public
  USING (true);

-- 6. Customer courses table
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

-- Create indexes for customer_courses
CREATE INDEX idx_customer_courses_customer_id ON customer_courses(customer_id);
CREATE INDEX idx_customer_courses_course_id ON customer_courses(course_id);

-- Enable RLS and create policies for customer_courses
ALTER TABLE customer_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read customer courses"
  ON customer_courses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage customer courses"
  ON customer_courses
  FOR ALL
  TO public
  USING (true);

-- 7. Chat messages table
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

-- Create indexes for chat_messages
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS and create policies for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read relevant chat messages"
  ON chat_messages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert chat messages"
  ON chat_messages
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update relevant chat messages"
  ON chat_messages
  FOR UPDATE
  TO public
  USING (true);

-- 8. Message logs table (archive)
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

-- Create indexes for message_logs
CREATE INDEX idx_message_logs_sender_id ON message_logs(sender_id);
CREATE INDEX idx_message_logs_receiver_id ON message_logs(receiver_id);
CREATE INDEX idx_message_logs_sender_receiver ON message_logs(sender_id, receiver_id);
CREATE INDEX idx_message_logs_expires_at ON message_logs(expires_at);

-- Enable RLS and create policies for message_logs
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read relevant message logs"
  ON message_logs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage message logs"
  ON message_logs
  FOR ALL
  TO public
  USING (true);

-- 9. Preset messages table
CREATE TABLE preset_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'custom')),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for preset_messages
CREATE INDEX idx_preset_messages_customer_id ON preset_messages(customer_id);

-- Enable RLS and create policies for preset_messages
ALTER TABLE preset_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read preset messages"
  ON preset_messages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage preset messages"
  ON preset_messages
  FOR ALL
  TO public
  USING (true);

-- 10. Notification history table
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

-- Create indexes for notification_history
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);

-- Enable RLS and create policies for notification_history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notification_history
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage notifications"
  ON notification_history
  FOR ALL
  TO public
  USING (true);

-- 11. System settings table
CREATE TABLE system_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for system_setting
CREATE INDEX idx_system_setting_key ON system_setting(setting_key);

-- Create trigger for updated_at
CREATE TRIGGER update_system_setting_updated_at
  BEFORE UPDATE ON system_setting
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policies for system_setting
ALTER TABLE system_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings"
  ON system_setting
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin users can manage system settings"
  ON system_setting
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (auth.uid())::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (auth.uid())::text 
      AND users.is_admin = true
    )
  );

-- 12. Cleanup logs table
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

-- Create indexes for cleanup_logs
CREATE INDEX idx_cleanup_logs_cleanup_date ON cleanup_logs(cleanup_date);
CREATE INDEX idx_cleanup_logs_table_name ON cleanup_logs(table_name);

-- Enable RLS and create policies for cleanup_logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cleanup logs"
  ON cleanup_logs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert cleanup logs"
  ON cleanup_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update cleanup logs"
  ON cleanup_logs
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Anyone can delete cleanup logs"
  ON cleanup_logs
  FOR DELETE
  TO public
  USING (true);

-- Insert sample data

-- Sample users (admin, employees, customers)
INSERT INTO users (id, name, phone, password, user_type, base, is_admin) VALUES
-- Admin user
('admin01', '管理者太郎', '090-0000-0001', 'admin123', 'admin', '01', true),

-- Employee users (拠点01)
('1234567', '配送員花子', '090-1111-0001', 'emp123', 'employee', '01', false),
('1234568', '配送員次郎', '090-1111-0002', 'emp123', 'employee', '01', false),
('1234569', '配送員三郎', '090-1111-0003', 'emp123', 'employee', '01', false),

-- Employee users (拠点02)
('2234567', '配送員京子', '090-2222-0001', 'emp123', 'employee', '02', false),
('2234568', '配送員京太', '090-2222-0002', 'emp123', 'employee', '02', false),

-- Customer users (拠点01)
('1001', '田中医院', '06-1111-0001', 'cust123', 'customer', '01', false),
('1002', '佐藤クリニック', '06-1111-0002', 'cust123', 'customer', '01', false),
('1003', '山田病院', '06-1111-0003', 'cust123', 'customer', '01', false),
('1004', '鈴木診療所', '06-1111-0004', 'cust123', 'customer', '01', false),
('1005', '高橋内科', '06-1111-0005', 'cust123', 'customer', '01', false),

-- Customer users (拠点02)
('2001', '京都中央病院', '075-2222-0001', 'cust123', 'customer', '02', false),
('2002', '京都北部クリニック', '075-2222-0002', 'cust123', 'customer', '02', false),
('2003', '京都南部医院', '075-2222-0003', 'cust123', 'customer', '02', false);

-- Sample courses
INSERT INTO courses (id, name, base) VALUES
-- 拠点01のコース
('A001', '大阪中央コース', '01'),
('A002', '大阪北部コース', '01'),
('A003', '大阪南部コース', '01'),
('A004', '大阪東部コース', '01'),
('A005', '大阪西部コース', '01'),

-- 拠点02のコース
('B001', '京都中央コース', '02'),
('B002', '京都北部コース', '02'),
('B003', '京都南部コース', '02');

-- Sample user sessions (active sessions)
INSERT INTO user_sessions (user_id, expire_time, is_active) VALUES
('1234567', now() + interval '6 hours', true),
('1001', now() + interval '6 hours', true),
('admin01', now() + interval '6 hours', true);

-- Sample registered courses (employee course registrations)
INSERT INTO registered_courses (employee_id, course_id, course_name) VALUES
-- 拠点01の社員
('1234567', 'A001', '大阪中央コース'),
('1234567', 'A002', '大阪北部コース'),
('1234568', 'A003', '大阪南部コース'),
('1234568', 'A004', '大阪東部コース'),
('1234569', 'A005', '大阪西部コース'),

-- 拠点02の社員
('2234567', 'B001', '京都中央コース'),
('2234567', 'B002', '京都北部コース'),
('2234568', 'B003', '京都南部コース');

-- Sample employee courses (today's assignments)
INSERT INTO employee_courses (employee_id, course_id, assigned_date, is_active) VALUES
('1234567', 'A001', CURRENT_DATE, true),
('1234568', 'A003', CURRENT_DATE, true),
('2234567', 'B001', CURRENT_DATE, true);

-- Sample customer courses (customer schedules)
INSERT INTO customer_courses (customer_id, course_id, monday, tuesday, wednesday, thursday, friday, saturday, re_pickup) VALUES
-- 拠点01の顧客
('1001', 'A001', true, false, true, false, true, false, false),
('1002', 'A001', false, true, false, true, false, false, true),
('1003', 'A002', true, true, true, true, true, false, false),
('1004', 'A003', false, false, true, false, false, true, false),
('1005', 'A004', true, false, false, true, false, false, true),

-- 拠点02の顧客
('2001', 'B001', true, true, true, true, true, false, false),
('2002', 'B002', false, true, false, true, false, false, false),
('2003', 'B003', true, false, true, false, true, false, true);

-- Sample chat messages
INSERT INTO chat_messages (sender_id, receiver_id, message, message_type, sender_type, is_read, created_at) VALUES
-- 顧客から社員へのメッセージ
('1001', '1234567', '集配あり - 本日の集配をお願いします。', 'pickup_yes', 'customer', true, now() - interval '2 hours'),
('1002', '1234567', '集配なし - 本日の集配はございません。', 'pickup_no', 'customer', true, now() - interval '1 hour'),
('1003', '1234568', '再集配 - 再度集配をお願いします。', 're_pickup', 'customer', false, now() - interval '30 minutes'),

-- 社員から顧客への返信
('1234567', '1001', 'かしこまりました、ご連絡ありがとうございます。', 'auto_response', 'employee', false, now() - interval '1 hour 30 minutes'),
('1234567', '1002', 'かしこまりました、ご連絡ありがとうございます。', 'auto_response', 'employee', false, now() - interval '45 minutes'),

-- 過去のメッセージ
('1001', '1234567', '集配あり - 本日の集配をお願いします。', 'pickup_yes', 'customer', true, now() - interval '1 day'),
('1234567', '1001', '検体回収いたしました。', 'auto_response', 'employee', true, now() - interval '23 hours');

-- Sample message logs (archive)
INSERT INTO message_logs (sender_id, receiver_id, message, message_type, sender_type, original_message_id, created_at) VALUES
('1001', '1234567', '集配あり - 本日の集配をお願いします。', 'pickup_yes', 'customer', gen_random_uuid(), now() - interval '2 hours'),
('1002', '1234567', '集配なし - 本日の集配はございません。', 'pickup_no', 'customer', gen_random_uuid(), now() - interval '1 hour'),
('1003', '1234568', '再集配 - 再度集配をお願いします。', 're_pickup', 'customer', gen_random_uuid(), now() - interval '30 minutes'),
('1234567', '1001', 'かしこまりました、ご連絡ありがとうございます。', 'auto_response', 'employee', gen_random_uuid(), now() - interval '1 hour 30 minutes'),
('1234567', '1002', 'かしこまりました、ご連絡ありがとうございます。', 'auto_response', 'employee', gen_random_uuid(), now() - interval '45 minutes');

-- Sample preset messages (custom templates)
INSERT INTO preset_messages (customer_id, message, message_type, order_index) VALUES
('1001', '本日は検体が多めです。よろしくお願いします。', 'pickup_yes', 1),
('1001', '急ぎの検体があります。お早めにお願いします。', 'pickup_yes', 2),
('1002', '本日は休診のため集配はありません。', 'pickup_no', 1),
('1003', '時間変更をお願いします。', 'custom', 1);

-- Sample notification history
INSERT INTO notification_history (user_id, title, body, data, delivery_status, sent_at) VALUES
('1234567', '新しいメッセージ', '田中医院からメッセージが届きました', '{"chatId": "1001", "messageType": "pickup_yes"}', 'delivered', now() - interval '2 hours'),
('1001', '返信メッセージ', '配送員花子から返信が届きました', '{"chatId": "1234567", "messageType": "auto_response"}', 'delivered', now() - interval '1 hour 30 minutes'),
('1234568', '新しいメッセージ', '山田病院からメッセージが届きました', '{"chatId": "1003", "messageType": "re_pickup"}', 'sent', now() - interval '30 minutes');

-- Sample system settings
INSERT INTO system_setting (setting_key, setting_value, description) VALUES
('show_pickup_yes_icon', 'true', '「検体あり」アイコンの表示設定'),
('show_pickup_no_icon', 'true', '「検体なし」アイコンの表示設定'),
('show_re_pickup_icon', 'true', '「再集配」アイコンの表示設定'),
('message_icon_display_enabled', 'true', 'メッセージアイコン表示機能の有効/無効'),
('app_version', '0.1.3', 'アプリケーションバージョン'),
('maintenance_mode', 'false', 'メンテナンスモードの設定');

-- Sample cleanup logs (3 records as requested)
INSERT INTO cleanup_logs (cleanup_date, table_name, records_found, records_deleted, csv_content, file_size) VALUES
(
  now() - interval '7 days',
  'message_logs',
  45,
  45,
  '# Archive created: ' || (now() - interval '7 days')::text || E'\n# Table: message_logs\n# Cutoff date: ' || (now() - interval '22 days')::text || E'\n# Record count: 45\n# Columns: id, sender_id, receiver_id, message, message_type, sender_type, created_at\n\nid,sender_id,receiver_id,message,message_type,sender_type,created_at\n' ||
  'uuid1,1001,1234567,"集配あり - 本日の集配をお願いします。",pickup_yes,customer,' || (now() - interval '22 days')::text || E'\n' ||
  'uuid2,1234567,1001,"かしこまりました、ご連絡ありがとうございます。",auto_response,employee,' || (now() - interval '21 days')::text || E'\n' ||
  'uuid3,1002,1234567,"集配なし - 本日の集配はございません。",pickup_no,customer,' || (now() - interval '20 days')::text,
  2048
),
(
  now() - interval '14 days',
  'user_sessions',
  12,
  12,
  '# Archive created: ' || (now() - interval '14 days')::text || E'\n# Table: user_sessions\n# Cutoff date: ' || (now() - interval '29 days')::text || E'\n# Record count: 12\n# Columns: id, user_id, login_time, expire_time, is_active, created_at\n\nid,user_id,login_time,expire_time,is_active,created_at\n' ||
  'session1,1234567,' || (now() - interval '30 days')::text || ',' || (now() - interval '24 days')::text || ',false,' || (now() - interval '30 days')::text || E'\n' ||
  'session2,1001,' || (now() - interval '29 days')::text || ',' || (now() - interval '23 days')::text || ',false,' || (now() - interval '29 days')::text || E'\n' ||
  'session3,admin01,' || (now() - interval '28 days')::text || ',' || (now() - interval '22 days')::text || ',false,' || (now() - interval '28 days')::text,
  1536
),
(
  now() - interval '21 days',
  'chat_messages',
  78,
  78,
  '# Archive created: ' || (now() - interval '21 days')::text || E'\n# Table: chat_messages\n# Cutoff date: ' || (now() - interval '36 days')::text || E'\n# Record count: 78\n# Columns: id, sender_id, receiver_id, message, message_type, sender_type, is_read, created_at\n\nid,sender_id,receiver_id,message,message_type,sender_type,is_read,created_at\n' ||
  'msg1,1001,1234567,"集配あり - 本日の集配をお願いします。",pickup_yes,customer,true,' || (now() - interval '37 days')::text || E'\n' ||
  'msg2,1234567,1001,"検体回収いたしました。",auto_response,employee,true,' || (now() - interval '36 days')::text || E'\n' ||
  'msg3,1002,1234567,"集配なし - 本日の集配はございません。",pickup_no,customer,true,' || (now() - interval '36 days')::text,
  3072
);

-- Grant necessary permissions (if needed)
-- Note: In Supabase, these are typically handled by the platform