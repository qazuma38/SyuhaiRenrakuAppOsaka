/*
  # 社員ごとに一つのコースのみ担当可能にする

  1. Schema Changes
    - `employee_courses`テーブルの主キーを`employee_id`に変更
    - 各社員は一つのコースのみ担当可能
    - 既存データの整合性を保持

  2. Migration Steps
    - 既存テーブルをバックアップ
    - 新しいスキーマでテーブルを再作成
    - データを移行
    - インデックスとポリシーを再設定
*/

-- 既存のemployee_coursesテーブルをバックアップ
CREATE TABLE IF NOT EXISTS employee_courses_backup AS 
SELECT * FROM employee_courses;

-- 既存のemployee_coursesテーブルを削除
DROP TABLE IF EXISTS employee_courses CASCADE;

-- 新しいemployee_coursesテーブルを作成（employee_idを主キーに）
CREATE TABLE employee_courses (
  employee_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- バックアップから最新のデータを移行（各社員の最新の担当コースのみ）
INSERT INTO employee_courses (employee_id, course_id, assigned_date, is_active, created_at)
SELECT DISTINCT ON (employee_id) 
  employee_id, 
  course_id, 
  assigned_date, 
  is_active, 
  created_at
FROM employee_courses_backup 
WHERE is_active = true
ORDER BY employee_id, created_at DESC
ON CONFLICT (employee_id) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_employee_courses_course_id ON employee_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_employee_courses_date_active ON employee_courses(assigned_date, is_active);

-- RLS有効化
ALTER TABLE employee_courses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Anyone can read employee courses" ON employee_courses
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage employee courses" ON employee_courses
  FOR ALL USING (true);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時トリガーを設定
CREATE TRIGGER update_employee_courses_updated_at 
    BEFORE UPDATE ON employee_courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- バックアップテーブルを削除（必要に応じてコメントアウト）
-- DROP TABLE employee_courses_backup;

-- サンプルデータを挿入（テスト用）
INSERT INTO employee_courses (employee_id, course_id, assigned_date, is_active) VALUES
  ('0002580', 'C61', CURRENT_DATE, true)
ON CONFLICT (employee_id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  assigned_date = EXCLUDED.assigned_date,
  is_active = EXCLUDED.is_active,
  updated_at = now();