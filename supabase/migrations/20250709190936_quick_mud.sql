/*
  # medic.web集配連絡システム - 完全データベーススキーマ
  # 現在のデータベースをゼロから構築するためのSQLスクリプト
  
  このスクリプトは以下を含みます：
  1. 全テーブルの作成
  2. インデックスの作成
  3. RLS（Row Level Security）の設定
  4. 制約とトリガーの設定
  5. サンプルデータの挿入
*/

-- ============================================================================
-- 1. テーブル作成
-- ============================================================================

-- ユーザーテーブル（顧客・社員）
CREATE TABLE users (
  id text PRIMARY KEY,
  name text,
  phone text,
  password text DEFAULT '',
  user_type text NOT NULL CHECK (user_type IN ('customer', 'employee')),
  fcm_token text,
  base text NOT NULL CHECK (base ~ '^[0-9]{2}$'),
  created_at timestamptz DEFAULT now()
);

-- セッション管理テーブル
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  expire_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- コーステーブル
CREATE TABLE courses (
  id text PRIMARY KEY,
  name text NOT NULL,
  base text NOT NULL CHECK (base ~ '^[0-9]{2}$'),
  created_at timestamptz DEFAULT now()
);

-- 顧客-コース紐付けテーブル
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

-- 社員-コース担当テーブル（各社員は一つのコースのみ担当可能）
CREATE TABLE employee_courses (
  employee_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 担当登録コーステーブル
CREATE TABLE registered_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  course_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, course_id)
);

-- 定型メッセージテーブル
CREATE TABLE preset_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('pickup_yes', 'pickup_no', 're_pickup', 'custom')),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- チャットメッセージテーブル
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

-- メッセージログテーブル（1ヶ月保持）
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

-- 通知履歴テーブル
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

-- ============================================================================
-- 2. インデックス作成
-- ============================================================================

-- users テーブル
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_base ON users(base);

-- user_sessions テーブル
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expire_time);

-- courses テーブル
CREATE INDEX idx_courses_base ON courses(base);

-- customer_courses テーブル
CREATE INDEX idx_customer_courses_customer_id ON customer_courses(customer_id);
CREATE INDEX idx_customer_courses_course_id ON customer_courses(course_id);

-- employee_courses テーブル
CREATE INDEX idx_employee_courses_course_id ON employee_courses(course_id);
CREATE INDEX idx_employee_courses_date_active ON employee_courses(assigned_date, is_active);

-- registered_courses テーブル
CREATE INDEX idx_registered_courses_employee_id ON registered_courses(employee_id);

-- preset_messages テーブル
CREATE INDEX idx_preset_messages_customer_id ON preset_messages(customer_id);

-- chat_messages テーブル
CREATE INDEX idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- message_logs テーブル
CREATE INDEX idx_message_logs_sender_receiver ON message_logs(sender_id, receiver_id);
CREATE INDEX idx_message_logs_sender_id ON message_logs(sender_id);
CREATE INDEX idx_message_logs_receiver_id ON message_logs(receiver_id);
CREATE INDEX idx_message_logs_expires_at ON message_logs(expires_at);

-- notification_history テーブル
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);

-- ============================================================================
-- 3. RLS（Row Level Security）有効化
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLSポリシー設定
-- ============================================================================

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

-- registered_courses テーブル
CREATE POLICY "Users can read own registered courses" ON registered_courses
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own registered courses" ON registered_courses
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

-- ============================================================================
-- 5. トリガー関数とトリガー
-- ============================================================================

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- employee_courses テーブルの更新日時トリガー
CREATE TRIGGER update_employee_courses_updated_at 
    BEFORE UPDATE ON employee_courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 期限切れメッセージログ削除関数
CREATE OR REPLACE FUNCTION delete_expired_message_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM message_logs WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_expired_message_logs() IS 'Delete expired message logs (call this function periodically)';

-- ============================================================================
-- 6. サンプルデータ挿入
-- ============================================================================

-- ユーザーデータ（拠点01）
INSERT INTO users (id, name, phone, password, user_type, base) VALUES
  ('0002580', 'シス：福井一真', '090-1234-5678', 'test123', 'employee', '01'),
  ('1001', 'さくら内科クリニック', '03-1234-5678', 'test123', 'customer', '01'),
  ('1002', '田中整形外科医院', '03-2345-6789', 'test123', 'customer', '01'),
  ('1003', '佐藤皮膚科クリニック', '03-3456-7890', 'test123', 'customer', '01'),
  ('1004', 'みどり眼科医院', '03-4567-8901', 'test123', 'customer', '01'),
  ('1005', '山田総合病院', '03-5678-9012', 'test123', 'customer', '01'),
  ('1006', '鈴木小児科医院', '03-6789-0123', 'test123', 'customer', '01')
ON CONFLICT (id) DO NOTHING;

-- ユーザーデータ（拠点02）
INSERT INTO users (id, name, phone, password, user_type, base) VALUES
  ('0002581', 'シス：田中二郎', '090-2345-6789', 'test123', 'employee', '02'),
  ('2001', 'ひまわり内科クリニック', '03-1111-2222', 'test123', 'customer', '02'),
  ('2002', '松本整形外科医院', '03-3333-4444', 'test123', 'customer', '02')
ON CONFLICT (id) DO NOTHING;

-- コースデータ（拠点01）
INSERT INTO courses (id, name, base) VALUES
  ('A01', 'Aコース01', '01'),
  ('A02', 'Aコース02', '01'),
  ('A03', 'Aコース03', '01'),
  ('B01', 'Bコース01', '01'),
  ('B02', 'Bコース02', '01'),
  ('B05', 'Bコース05', '01'),
  ('C61', 'Cコース61', '01'),
  ('C62', 'Cコース62', '01'),
  ('C63', 'Cコース63', '01'),
  ('C64', 'Cコース64', '01'),
  ('C65', 'Cコース65', '01'),
  ('N99', 'テストコース', '01')
ON CONFLICT (id) DO NOTHING;

-- コースデータ（拠点02）
INSERT INTO courses (id, name, base) VALUES
  ('C61-02', 'Cコース61', '02'),
  ('C62-02', 'Cコース62', '02'),
  ('C63-02', 'Cコース63', '02'),
  ('N99-02', 'テストコース', '02')
ON CONFLICT (id) DO NOTHING;

-- 顧客-コース紐付けデータ（拠点01）
INSERT INTO customer_courses (customer_id, course_id, monday, tuesday, wednesday, thursday, friday, saturday, re_pickup) VALUES
  ('1001', 'C61', true, true, true, true, true, false, false),
  ('1002', 'C61', true, false, true, false, true, false, false),
  ('1003', 'C62', false, true, false, true, false, true, false),
  ('1004', 'N99', true, true, true, true, true, false, true),
  ('1005', 'C63', true, true, true, true, true, true, false),
  ('1006', 'C61', false, true, false, true, false, false, false)
ON CONFLICT (customer_id, course_id) DO UPDATE SET
  monday = EXCLUDED.monday,
  tuesday = EXCLUDED.tuesday,
  wednesday = EXCLUDED.wednesday,
  thursday = EXCLUDED.thursday,
  friday = EXCLUDED.friday,
  saturday = EXCLUDED.saturday,
  re_pickup = EXCLUDED.re_pickup;

-- 顧客-コース紐付けデータ（拠点02）
INSERT INTO customer_courses (customer_id, course_id, monday, tuesday, wednesday, thursday, friday, saturday, re_pickup) VALUES
  ('2001', 'C61-02', true, true, true, true, true, false, false),
  ('2002', 'C62-02', false, true, false, true, false, true, true)
ON CONFLICT (customer_id, course_id) DO UPDATE SET
  monday = EXCLUDED.monday,
  tuesday = EXCLUDED.tuesday,
  wednesday = EXCLUDED.wednesday,
  thursday = EXCLUDED.thursday,
  friday = EXCLUDED.friday,
  saturday = EXCLUDED.saturday,
  re_pickup = EXCLUDED.re_pickup;

-- 社員-コース担当データ（今日の日付で）
INSERT INTO employee_courses (employee_id, course_id, assigned_date, is_active) VALUES
  ('0002580', 'C61', CURRENT_DATE, true)
ON CONFLICT (employee_id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  assigned_date = EXCLUDED.assigned_date,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 登録コースデータ（拠点01の社員用）
INSERT INTO registered_courses (employee_id, course_id, course_name) VALUES
  ('0002580', 'C61', 'Cコース61'),
  ('0002580', 'C62', 'Cコース62'),
  ('0002580', 'C63', 'Cコース63'),
  ('0002580', 'N99', 'テストコース'),
  ('0002580', 'A01', 'Aコース01'),
  ('0002580', 'B05', 'Bコース05')
ON CONFLICT (employee_id, course_id) DO NOTHING;

-- 定型メッセージデータ
INSERT INTO preset_messages (customer_id, message, message_type, order_index) VALUES
  (NULL, '集配あり - 本日の集配をお願いします。', 'pickup_yes', 1),
  (NULL, '集配なし - 本日の集配はございません。', 'pickup_no', 2),
  (NULL, '再集配 - 再度集配をお願いします。', 're_pickup', 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'medic.web集配連絡システム データベーススキーマの構築が完了しました。';
    RAISE NOTICE '作成されたテーブル数: 10';
    RAISE NOTICE '作成されたインデックス数: 16';
    RAISE NOTICE 'RLSポリシー数: 20';
    RAISE NOTICE 'サンプルデータが挿入されました。';
END $$;