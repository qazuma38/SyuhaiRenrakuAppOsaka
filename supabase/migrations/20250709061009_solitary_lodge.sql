/*
  # customer_coursesテーブルに曜日フィールドを追加し、主キーを変更

  1. テーブル変更
    - 主キーを(customer_id, course_id)の複合キーに変更
    - 月曜から土曜の曜日フィールドを追加
    - 既存データの整合性を保持

  2. Migration Steps
    - 既存テーブルをバックアップ
    - 新しいスキーマでテーブルを再作成
    - データを移行
    - インデックスとポリシーを再設定
*/

-- 既存のcustomer_coursesテーブルをバックアップ
CREATE TABLE IF NOT EXISTS customer_courses_backup AS 
SELECT * FROM customer_courses;

-- 既存のcustomer_coursesテーブルを削除
DROP TABLE IF EXISTS customer_courses CASCADE;

-- 新しいcustomer_coursesテーブルを作成（複合主キーと曜日フィールド付き）
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

-- バックアップから既存データを移行
INSERT INTO customer_courses (customer_id, course_id, re_pickup, created_at)
SELECT customer_id, course_id, re_pickup, created_at
FROM customer_courses_backup
ON CONFLICT (customer_id, course_id) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_customer_courses_customer_id ON customer_courses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_courses_course_id ON customer_courses(course_id);

-- RLS有効化
ALTER TABLE customer_courses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Anyone can read customer courses" ON customer_courses
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage customer courses" ON customer_courses
  FOR ALL USING (true);

-- サンプルデータを更新（曜日フィールド付き）
INSERT INTO customer_courses (customer_id, course_id, monday, tuesday, wednesday, thursday, friday, saturday, re_pickup) VALUES
  ('1001', 'C61', true, true, true, true, true, false, false),
  ('1002', 'C61', true, false, true, false, true, false, false),
  ('1003', 'C62', false, true, false, true, false, true, false),
  ('1004', 'N99', true, true, true, true, true, false, true),
  ('1005', 'C63', true, true, true, true, true, true, false),
  ('1006', 'C61', false, true, false, true, false, false, false),
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

-- バックアップテーブルを削除（必要に応じてコメントアウト）
-- DROP TABLE customer_courses_backup;