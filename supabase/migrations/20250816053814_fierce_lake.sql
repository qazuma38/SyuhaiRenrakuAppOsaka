/*
  # Create cleanup logs table

  1. New Tables
    - `cleanup_logs`
      - `id` (uuid, primary key)
      - `cleanup_date` (timestamp)
      - `table_name` (text)
      - `records_found` (integer)
      - `records_deleted` (integer)
      - `csv_content` (text) - CSV data as text
      - `file_size` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `cleanup_logs` table
    - Add policy for admin users to read cleanup logs
*/

CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date timestamptz NOT NULL,
  table_name text NOT NULL,
  records_found integer NOT NULL DEFAULT 0,
  records_deleted integer NOT NULL DEFAULT 0,
  csv_content text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can read cleanup logs
CREATE POLICY "Admin users can read cleanup logs"
  ON cleanup_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (auth.uid())::text 
      AND users.is_admin = true
    )
  );

-- System can insert cleanup logs
CREATE POLICY "System can insert cleanup logs"
  ON cleanup_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleanup_date ON cleanup_logs(cleanup_date);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_table_name ON cleanup_logs(table_name);