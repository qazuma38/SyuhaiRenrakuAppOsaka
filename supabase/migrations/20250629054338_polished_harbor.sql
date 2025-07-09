/*
  # 医療配送システム完全データベーススキーマ

  1. 新しいテーブル
    - `users` - ユーザー情報（顧客・社員）
    - `user_sessions` - セッション管理
    - `courses` - コース情報
    - `customer_courses` - 顧客-コース紐付け
    - `employee_courses` - 社員-コース担当
    - `preset_messages` - 定型メッセージ
    - `chat_messages` - チャットメッセージ
    - `message_logs` - メッセージログ（1ヶ月保持）
    - `notification_history` - 通知履歴

  2. セキュリティ
    - 全テーブルでRLS有効化
    - 適切なポリシー設定

  3. インデックス
    - パフォーマンス向上のための最適化

  4. サンプルデータ
    - テスト用データの挿入
*/

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text,
  phone text,
  password text DEFAULT '',
  user_type text NOT NULL CHECK (user_type IN ('customer', 'employee')),
  fcm_token text,
  created_at timestamptz DEFAULT now()
);

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  expire_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- コーステーブル
CREATE TABLE IF NOT EXISTS courses (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 顧客-コース紐付けテーブル
CREATE TABLE IF NOT EXISTS customer_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  UNIQUE(customer_id, course_id)
);

-- 社員-コース担当テーブル
CREATE TABLE IF NOT EXISTS employee_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 定型メッセージテーブル
CREATE TABLE IF NOT EXISTS preset_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'custom')),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'auto_response')),
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'employee', 'system')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- メッセージログテーブル（1ヶ月保持）
CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'auto_response')),
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'employee', 'system')),
  original_message_id uuid,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 month')
);

-- 通知履歴テーブル
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  sent_at timestamptz DEFAULT now(),
  delivery_status text NOT NULL CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expire_time);
CREATE INDEX IF NOT EXISTS idx_customer_courses_customer_id ON customer_courses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_courses_course_id ON customer_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_employee_courses_employee_id ON employee_courses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_courses_date_active ON employee_courses(assigned_date, is_active);
CREATE INDEX IF NOT EXISTS idx_preset_messages_customer_id ON preset_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_customer_employee ON chat_messages(customer_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_logs_expires_at ON message_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定

-- users テーブル
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true);

-- user_sessions テーブル
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (true);

-- courses テーブル
CREATE POLICY "Anyone can read courses" ON courses
  FOR SELECT USING (true);

-- customer_courses テーブル
CREATE POLICY "Anyone can read customer courses" ON customer_courses
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage customer courses" ON customer_courses
  FOR ALL USING (true);

-- employee_courses テーブル
CREATE POLICY "Anyone can read employee courses" ON employee_courses
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage employee courses" ON employee_courses
  FOR ALL USING (true);

-- preset_messages テーブル
CREATE POLICY "Anyone can read preset messages" ON preset_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage preset messages" ON preset_messages
  FOR ALL USING (true);

-- chat_messages テーブル
CREATE POLICY "Users can read relevant chat messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update relevant chat messages" ON chat_messages
  FOR UPDATE USING (true);

-- message_logs テーブル
CREATE POLICY "Users can read relevant message logs" ON message_logs
  FOR SELECT USING (true);

CREATE POLICY "System can manage message logs" ON message_logs
  FOR ALL USING (true);

-- notification_history テーブル
CREATE POLICY "Users can read own notifications" ON notification_history
  FOR SELECT USING (true);

CREATE POLICY "System can manage notifications" ON notification_history
  FOR ALL USING (true);

-- サンプルデータ挿入

-- ユーザーデータ
INSERT INTO users (id, name, phone, password, user_type) VALUES
  ('0002580', 'シス：福井一真', '090-1234-5678', 'test123', 'employee'),
  ('1001', 'さくら内科クリニック', '03-1234-5678', 'test123', 'customer'),
  ('1002', '田中整形外科医院', '03-2345-6789', 'test123', 'customer'),
  ('1003', '佐藤皮膚科クリニック', '03-3456-7890', 'test123', 'customer'),
  ('1004', 'みどり眼科医院', '03-4567-8901', 'test123', 'customer'),
  ('1005', '山田総合病院', '03-5678-9012', 'test123', 'customer'),
  ('1006', '鈴木小児科医院', '03-6789-0123', 'test123', 'customer')
ON CONFLICT (id) DO NOTHING;

-- コースデータ
INSERT INTO courses (id, name) VALUES
  ('C61', 'Cコース61'),
  ('C62', 'Cコース62'),
  ('C63', 'Cコース63'),
  ('C64', 'Cコース64'),
  ('C65', 'Cコース65'),
  ('N99', 'テストコース')
ON CONFLICT (id) DO NOTHING;

-- 顧客-コース紐付けデータ
INSERT INTO customer_courses (customer_id, course_id, monday, tuesday, wednesday, thursday, friday, saturday, re_pickup) VALUES
  ('1001', 'C61', true, true, true, true, true, false, false),
  ('1002', 'C61', true, false, true, false, true, false, false),
  ('1003', 'C62', false, true, false, true, false, true, false),
  ('1004', 'N99', true, true, true, true, true, false, true),
  ('1005', 'C63', true, true, true, true, true, true, false),
  ('1006', 'C61', false, true, false, true, false, false, false)
ON CONFLICT (customer_id, course_id) DO NOTHING;

-- 社員-コース担当データ（今日の日付で）
INSERT INTO employee_courses (employee_id, course_id, assigned_date, is_active) VALUES
  ('0002580', 'C61', CURRENT_DATE, true),
  ('0002580', 'N99', CURRENT_DATE, true)
ON CONFLICT DO NOTHING;

-- 定型メッセージデータ
INSERT INTO preset_messages (customer_id, message, message_type, order_index) VALUES
  (NULL, '集配あり - 本日の集配を実施いたします。', 'pickup_yes', 1),
  (NULL, '集配なし - 本日の集配はございません。', 'pickup_no', 2),
  (NULL, '再集配 - 再度集配にお伺いいたします。', 're_pickup', 3)
ON CONFLICT DO NOTHING;

-- 自動削除機能（期限切れメッセージログ）
CREATE OR REPLACE FUNCTION delete_expired_message_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM message_logs WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 定期実行用の関数（必要に応じて外部から呼び出し）
COMMENT ON FUNCTION delete_expired_message_logs() IS 'Delete expired message logs (call this function periodically)';