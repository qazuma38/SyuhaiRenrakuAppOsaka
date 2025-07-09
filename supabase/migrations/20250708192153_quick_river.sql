/*
  # registered_coursesテーブルからis_activeフィールドを削除

  1. 変更内容
    - `registered_courses`テーブルから`is_active`フィールドを削除
    - 関連するインデックスも削除

  2. データ保護
    - 削除前にバックアップテーブルを作成
*/

-- 既存のregistered_coursesテーブルをバックアップ
CREATE TABLE IF NOT EXISTS registered_courses_backup AS 
SELECT * FROM registered_courses;

-- is_activeフィールドを削除
ALTER TABLE registered_courses DROP COLUMN IF EXISTS is_active;

-- is_activeに関連するインデックスを削除
DROP INDEX IF EXISTS idx_registered_courses_active;

-- バックアップテーブルを削除（必要に応じてコメントアウト）
-- DROP TABLE registered_courses_backup;