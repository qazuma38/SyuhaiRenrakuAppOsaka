/*
  # customer_coursesテーブルから曜日フィールドを削除

  1. 変更内容
    - `customer_courses`テーブルから以下のフィールドを削除:
      - monday
      - tuesday
      - wednesday
      - thursday
      - friday
      - saturday
    - `re_pickup`フィールドは保持

  2. セキュリティ
    - 既存のRLSポリシーは維持

  3. データ保護
    - 削除前にバックアップテーブルを作成
*/

-- 既存のcustomer_coursesテーブルをバックアップ
CREATE TABLE IF NOT EXISTS customer_courses_backup AS 
SELECT * FROM customer_courses;

-- 曜日フィールドを削除
ALTER TABLE customer_courses DROP COLUMN IF EXISTS monday;
ALTER TABLE customer_courses DROP COLUMN IF EXISTS tuesday;
ALTER TABLE customer_courses DROP COLUMN IF EXISTS wednesday;
ALTER TABLE customer_courses DROP COLUMN IF EXISTS thursday;
ALTER TABLE customer_courses DROP COLUMN IF EXISTS friday;
ALTER TABLE customer_courses DROP COLUMN IF EXISTS saturday;

-- バックアップテーブルを削除（必要に応じてコメントアウト）
-- DROP TABLE customer_courses_backup;