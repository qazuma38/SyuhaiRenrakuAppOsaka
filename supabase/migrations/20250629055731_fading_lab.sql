/*
  # 担当登録コーステーブルの追加

  1. New Tables
    - `registered_courses`
      - `id` (uuid, primary key)
      - `employee_id` (text, foreign key to users)
      - `course_id` (text)
      - `course_name` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `registered_courses` table
    - Add policies for authenticated users to manage their registered courses

  3. Sample Data
    - Add some sample registered courses for the test employee
*/

-- 担当登録コーステーブル
CREATE TABLE IF NOT EXISTS registered_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  course_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, course_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_registered_courses_employee_id ON registered_courses(employee_id);
CREATE INDEX IF NOT EXISTS idx_registered_courses_active ON registered_courses(is_active);

-- RLS有効化
ALTER TABLE registered_courses ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Users can read own registered courses" ON registered_courses
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own registered courses" ON registered_courses
  FOR ALL USING (true);

-- サンプルデータ挿入（テスト社員用）
INSERT INTO registered_courses (employee_id, course_id, course_name, is_active) VALUES
  ('0002580', 'C61', 'Cコース61', true),
  ('0002580', 'C62', 'Cコース62', true),
  ('0002580', 'C63', 'Cコース63', true),
  ('0002580', 'N99', 'テストコース', true),
  ('0002580', 'A01', 'Aコース01', true),
  ('0002580', 'B05', 'Bコース05', true)
ON CONFLICT (employee_id, course_id) DO NOTHING;