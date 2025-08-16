/*
  # Create system_setting table

  1. New Tables
    - `system_setting`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - 設定項目のキー
      - `setting_value` (text) - 設定値
      - `description` (text) - 設定の説明
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `system_setting` table
    - Add policy for admin users to manage settings
    - Add policy for all users to read settings

  3. Initial Data
    - Insert default settings for message icon display flags
*/

CREATE TABLE IF NOT EXISTS system_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_setting ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read system settings"
  ON system_setting
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin users can manage system settings"
  ON system_setting
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

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_system_setting_updated_at
  BEFORE UPDATE ON system_setting
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for message icon display
INSERT INTO system_setting (setting_key, setting_value, description) VALUES
  ('show_pickup_yes_icon', 'true', 'メッセージ画面で「検体あり」アイコンを表示するかどうか'),
  ('show_pickup_no_icon', 'true', 'メッセージ画面で「検体なし」アイコンを表示するかどうか'),
  ('show_re_pickup_icon', 'true', 'メッセージ画面で「再集配」アイコンを表示するかどうか'),
  ('message_icon_display_enabled', 'true', 'メッセージアイコン表示機能全体の有効/無効');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_system_setting_key ON system_setting(setting_key);