/*
  # Fix cleanup_logs RLS policies

  1. Security Updates
    - Update RLS policies for cleanup_logs table
    - Allow admin users to read all cleanup logs
    - Allow system to insert cleanup logs
    - Fix policy conditions for proper data access

  2. Changes
    - Update existing policies with correct conditions
    - Ensure admin users can access all data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can read cleanup logs" ON cleanup_logs;
DROP POLICY IF EXISTS "System can insert cleanup logs" ON cleanup_logs;

-- Create new policies with correct conditions
CREATE POLICY "Admin users can read cleanup logs"
  ON cleanup_logs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Admin users can manage cleanup logs"
  ON cleanup_logs
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.is_admin = true
    )
  );

CREATE POLICY "System can insert cleanup logs"
  ON cleanup_logs
  FOR INSERT
  TO public
  WITH CHECK (true);