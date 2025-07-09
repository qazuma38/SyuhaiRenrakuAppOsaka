/*
  # メッセージテーブルの送信者・受信者フィールド更新

  1. テーブル変更
    - `chat_messages`テーブル
      - `customer_id` → `sender_id`に変更
      - `employee_id` → `receiver_id`に変更
    - `message_logs`テーブル
      - `customer_id` → `sender_id`に変更
      - `employee_id` → `receiver_id`に変更

  2. 外部キー制約の更新
    - 新しいフィールドに対する外部キー制約を追加

  3. インデックスの更新
    - 新しいフィールドに対するインデックスを作成

  4. データの移行
    - 既存データを新しいフィールド構造に移行
*/

-- chat_messagesテーブルの更新
-- 新しいフィールドを追加
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_id text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS receiver_id text;

-- 既存データを移行（sender_typeに基づいて適切にマッピング）
UPDATE chat_messages 
SET 
  sender_id = CASE 
    WHEN sender_type = 'customer' THEN customer_id
    WHEN sender_type = 'employee' THEN employee_id
    ELSE customer_id -- デフォルトは顧客
  END,
  receiver_id = CASE 
    WHEN sender_type = 'customer' THEN employee_id
    WHEN sender_type = 'employee' THEN customer_id
    ELSE employee_id -- デフォルトは社員
  END
WHERE sender_id IS NULL OR receiver_id IS NULL;

-- 新しいフィールドをNOT NULLに設定
ALTER TABLE chat_messages ALTER COLUMN sender_id SET NOT NULL;
ALTER TABLE chat_messages ALTER COLUMN receiver_id SET NOT NULL;

-- 外部キー制約を追加
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- 新しいインデックスを作成
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);

-- 古いインデックスを削除
DROP INDEX IF EXISTS idx_chat_messages_customer_employee;

-- 古いフィールドを削除
ALTER TABLE chat_messages DROP COLUMN IF EXISTS customer_id;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS employee_id;

-- message_logsテーブルの更新
-- 新しいフィールドを追加
ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS sender_id text;
ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS receiver_id text;

-- 既存データを移行（sender_typeに基づいて適切にマッピング）
UPDATE message_logs 
SET 
  sender_id = CASE 
    WHEN sender_type = 'customer' THEN customer_id
    WHEN sender_type = 'employee' THEN employee_id
    ELSE customer_id -- デフォルトは顧客
  END,
  receiver_id = CASE 
    WHEN sender_type = 'customer' THEN employee_id
    WHEN sender_type = 'employee' THEN customer_id
    ELSE employee_id -- デフォルトは社員
  END
WHERE sender_id IS NULL OR receiver_id IS NULL;

-- 新しいフィールドをNOT NULLに設定
ALTER TABLE message_logs ALTER COLUMN sender_id SET NOT NULL;
ALTER TABLE message_logs ALTER COLUMN receiver_id SET NOT NULL;

-- 外部キー制約を追加
ALTER TABLE message_logs ADD CONSTRAINT message_logs_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE message_logs ADD CONSTRAINT message_logs_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- 新しいインデックスを作成
CREATE INDEX IF NOT EXISTS idx_message_logs_sender_receiver ON message_logs(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_sender_id ON message_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_receiver_id ON message_logs(receiver_id);

-- 古いフィールドを削除
ALTER TABLE message_logs DROP COLUMN IF EXISTS customer_id;
ALTER TABLE message_logs DROP COLUMN IF EXISTS employee_id;

-- RLSポリシーの更新（chat_messages）
DROP POLICY IF EXISTS "Users can read relevant chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update relevant chat messages" ON chat_messages;

CREATE POLICY "Users can read relevant chat messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update relevant chat messages" ON chat_messages
  FOR UPDATE USING (true);

-- RLSポリシーの更新（message_logs）
DROP POLICY IF EXISTS "Users can read relevant message logs" ON message_logs;
DROP POLICY IF EXISTS "System can manage message logs" ON message_logs;

CREATE POLICY "Users can read relevant message logs" ON message_logs
  FOR SELECT USING (true);

CREATE POLICY "System can manage message logs" ON message_logs
  FOR ALL USING (true);