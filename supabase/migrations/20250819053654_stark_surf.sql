@@ .. @@
 INSERT INTO system_setting (setting_key, setting_value, description) VALUES
   ('show_pickup_yes_icon', 'true', '「検体あり」アイコンの表示設定'),
   ('show_pickup_no_icon', 'true', '「検体なし」アイコンの表示設定'),
   ('show_re_pickup_icon', 'true', '「再集配」アイコンの表示設定'),
   ('message_icon_display_enabled', 'true', 'メッセージアイコン表示機能の有効/無効');
+
+-- サンプルデータの挿入
+
+-- 1. サンプルユーザー（管理者、社員、顧客）
+INSERT INTO users (id, name, phone, password, user_type, base, is_admin) VALUES
+  -- 管理者
+  ('admin01', '管理者太郎', '090-1234-5678', 'admin123', 'admin', '01', true),
+  
+  -- 社員（拠点01）
+  ('1234567', '配送員花子', '090-2345-6789', 'emp123', 'employee', '01', false),
+  ('1234568', '配送員次郎', '090-3456-7890', 'emp456', 'employee', '01', false),
+  
+  -- 社員（拠点02）
+  ('1234569', '配送員三郎', '090-4567-8901', 'emp789', 'employee', '02', false),
+  
+  -- 顧客（拠点01）
+  ('1001', '田中医院', '06-1111-2222', 'cust123', 'customer', '01'),
+  ('1002', '佐藤クリニック', '06-2222-3333', 'cust456', 'customer', '01'),
+  ('1003', '山田病院', '06-3333-4444', 'cust789', 'customer', '01'),
+  
+  -- 顧客（拠点02）
+  ('2001', '鈴木医院', '06-4444-5555', 'cust101', 'customer', '02'),
+  ('2002', '高橋クリニック', '06-5555-6666', 'cust202', 'customer', '02');
+
+-- 2. サンプルコース
+INSERT INTO courses (id, name, base) VALUES
+  -- 拠点01のコース
+  ('A001', '大阪中央コース', '01'),
+  ('A002', '大阪北部コース', '01'),
+  ('A003', '大阪南部コース', '01'),
+  
+  -- 拠点02のコース
+  ('B001', '京都中央コース', '02'),
+  ('B002', '京都北部コース', '02');
+
+-- 3. 社員の登録コース
+INSERT INTO registered_courses (employee_id, course_id, course_name) VALUES
+  ('1234567', 'A001', '大阪中央コース'),
+  ('1234567', 'A002', '大阪北部コース'),
+  ('1234568', 'A002', '大阪北部コース'),
+  ('1234568', 'A003', '大阪南部コース'),
+  ('1234569', 'B001', '京都中央コース'),
+  ('1234569', 'B002', '京都北部コース');
+
+-- 4. 今日の社員コース担当
+INSERT INTO employee_courses (employee_id, course_id, assigned_date, is_active) VALUES
+  ('1234567', 'A001', CURRENT_DATE, true),
+  ('1234568', 'A002', CURRENT_DATE, true),
+  ('1234569', 'B001', CURRENT_DATE, true);
+
+-- 5. 顧客のコーススケジュール
+INSERT INTO customer_courses (customer_id, course_id, monday, tuesday, wednesday, thursday, friday, saturday, re_pickup) VALUES
+  -- 拠点01の顧客
+  ('1001', 'A001', true, true, true, true, true, false, false),
+  ('1002', 'A001', true, false, true, false, true, false, true),
+  ('1003', 'A002', false, true, false, true, false, true, false),
+  
+  -- 拠点02の顧客
+  ('2001', 'B001', true, true, true, true, true, false, false),
+  ('2002', 'B002', true, false, true, false, true, false, false);
+
+-- 6. サンプルチャットメッセージ
+INSERT INTO chat_messages (sender_id, receiver_id, message, message_type, sender_type, is_read) VALUES
+  -- 顧客から社員へ
+  ('1001', '1234567', '集配あり - 本日の集配をお願いします。', 'pickup_yes', 'customer', true),
+  ('1002', '1234567', '集配なし - 本日の集配はございません。', 'pickup_no', 'customer', false),
+  ('1003', '1234568', '再集配 - 再度集配をお願いします。', 're_pickup', 'customer', false),
+  
+  -- 社員から顧客へ
+  ('1234567', '1001', 'かしこまりました、ご連絡ありがとうございます。', 'auto_response', 'employee', true),
+  ('1234567', '1002', '承知いたしました。', 'auto_response', 'employee', false);
+
+-- 7. サンプルメッセージログ
+INSERT INTO message_logs (sender_id, receiver_id, message, message_type, sender_type) VALUES
+  ('1001', '1234567', '集配あり - 本日の集配をお願いします。', 'pickup_yes', 'customer'),
+  ('1234567', '1001', 'かしこまりました、ご連絡ありがとうございます。', 'auto_response', 'employee'),
+  ('1002', '1234567', '集配なし - 本日の集配はございません。', 'pickup_no', 'customer');
+
+-- 8. サンプル定型メッセージ
+INSERT INTO preset_messages (customer_id, message, message_type, order_index) VALUES
+  ('1001', '本日は検体が多めです。よろしくお願いします。', 'pickup_yes', 1),
+  ('1001', '急ぎの検体があります。', 'pickup_yes', 2),
+  ('1002', '本日は検体がございません。', 'pickup_no', 1),
+  ('1003', '再度お願いします。', 're_pickup', 1);
+
+-- 9. サンプル通知履歴
+INSERT INTO notification_history (user_id, title, body, delivery_status) VALUES
+  ('1234567', 'medic.web通知テスト', 'テスト通知が正常に送信されました', 'sent'),
+  ('1001', '新しいメッセージ', '社員からメッセージが届きました', 'delivered'),
+  ('1002', 'システム通知', 'アプリが更新されました', 'sent');
+
+-- 10. サンプルユーザーセッション
+INSERT INTO user_sessions (user_id, expire_time, is_active) VALUES
+  ('admin01', NOW() + INTERVAL '6 hours', true),
+  ('1234567', NOW() + INTERVAL '6 hours', true),
+  ('1001', NOW() + INTERVAL '6 hours', false);
+
+-- 11. サンプルクリーンアップログ
+INSERT INTO cleanup_logs (cleanup_date, table_name, records_found, records_deleted, csv_content, file_size) VALUES
+  (
+    NOW() - INTERVAL '1 day',
+    'message_logs',
+    25,
+    25,
+    '# Archive created: ' || (NOW() - INTERVAL '1 day')::text || E'\n' ||
+    '# Table: message_logs' || E'\n' ||
+    '# Record count: 25' || E'\n' ||
+    'id,sender_id,receiver_id,message,created_at' || E'\n' ||
+    'uuid1,1001,1234567,"古いメッセージ1",2024-01-01T10:00:00Z' || E'\n' ||
+    'uuid2,1234567,1001,"古いメッセージ2",2024-01-01T10:01:00Z',
+    1024
+  ),
+  (
+    NOW() - INTERVAL '2 days',
+    'user_sessions',
+    10,
+    10,
+    '# Archive created: ' || (NOW() - INTERVAL '2 days')::text || E'\n' ||
+    '# Table: user_sessions' || E'\n' ||
+    '# Record count: 10' || E'\n' ||
+    'id,user_id,login_time,expire_time,is_active' || E'\n' ||
+    'uuid3,1001,2024-01-01T09:00:00Z,2024-01-01T15:00:00Z,false' || E'\n' ||
+    'uuid4,1234567,2024-01-01T08:00:00Z,2024-01-01T14:00:00Z,false',
+    512
+  ),
+  (
+    NOW() - INTERVAL '3 days',
+    'chat_messages',
+    15,
+    15,
+    '# Archive created: ' || (NOW() - INTERVAL '3 days')::text || E'\n' ||
+    '# Table: chat_messages' || E'\n' ||
+    '# Record count: 15' || E'\n' ||
+    'id,sender_id,receiver_id,message,message_type,sender_type,is_read,created_at' || E'\n' ||
+    'uuid5,1001,1234567,"古いチャット1","pickup_yes","customer",true,2024-01-01T11:00:00Z' || E'\n' ||
+    'uuid6,1234567,1001,"古いチャット2","auto_response","employee",true,2024-01-01T11:01:00Z',
+    768
+  );