/*
  # 拠点フィールドの追加

  1. テーブル変更
    - `users`テーブルに`base`フィールド追加（2桁の拠点コード）
    - `courses`テーブルに`base`フィールド追加（2桁の拠点コード）

  2. データ更新
    - 既存ユーザーに拠点コードを設定
    - 既存コースに拠点コードを設定

  3. インデックス追加
    - パフォーマンス向上のためのインデックス作成
*/

-- usersテーブルに拠点フィールドを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS base text;

-- coursesテーブルに拠点フィールドを追加
ALTER TABLE courses ADD COLUMN IF NOT EXISTS base text;

-- 拠点フィールドの制約を追加（00-99の2桁）
ALTER TABLE users ADD CONSTRAINT users_base_check 
  CHECK (base ~ '^[0-9]{2}$');

ALTER TABLE courses ADD CONSTRAINT courses_base_check 
  CHECK (base ~ '^[0-9]{2}$');

-- 既存データに拠点コードを設定
UPDATE users SET base = '01' WHERE base IS NULL;
UPDATE courses SET base = '01' WHERE base IS NULL;

-- 拠点フィールドをNOT NULLに設定
ALTER TABLE users ALTER COLUMN base SET NOT NULL;
ALTER TABLE courses ALTER COLUMN base SET NOT NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_base ON users(base);
CREATE INDEX IF NOT EXISTS idx_courses_base ON courses(base);

-- 拠点別のコースデータを追加
INSERT INTO courses (id, name, base) VALUES
  ('A01', 'Aコース01', '01'),
  ('A02', 'Aコース02', '01'),
  ('A03', 'Aコース03', '01'),
  ('B01', 'Bコース01', '01'),
  ('B02', 'Bコース02', '01'),
  ('B05', 'Bコース05', '01'),
  ('C61-02', 'Cコース61', '02'),
  ('C62-02', 'Cコース62', '02'),
  ('C63-02', 'Cコース63', '02'),
  ('N99-02', 'テストコース', '02')
ON CONFLICT (id) DO NOTHING;

-- 拠点02のテストユーザーを追加
INSERT INTO users (id, name, phone, password, user_type, base) VALUES
  ('0002581', 'シス：田中二郎', '090-2345-6789', 'test123', 'employee', '02'),
  ('2001', 'ひまわり内科クリニック', '03-1111-2222', 'test123', 'customer', '02'),
  ('2002', '松本整形外科医院', '03-3333-4444', 'test123', 'customer', '02')
ON CONFLICT (id) DO NOTHING;

-- 拠点02の顧客-コース紐付けデータ
INSERT INTO customer_courses (customer_id, course_id, re_pickup) VALUES
  ('2001', 'C61-02', false),
  ('2002', 'C62-02', true)
ON CONFLICT (customer_id, course_id) DO NOTHING;