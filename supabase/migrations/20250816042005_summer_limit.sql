/*
  # Add admin role field to users table

  1. Schema Changes
    - Add `is_admin` boolean field to `users` table with default value false
    - Update user_type check constraint to include 'admin' option
    - Add index on is_admin field for performance

  2. Security
    - Maintain existing RLS policies
    - Admin field defaults to false for security

  3. Data Migration
    - All existing users will have is_admin = false by default
    - No data loss or breaking changes
*/

-- Add is_admin column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Update the user_type check constraint to include admin
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_user_type_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_user_type_check;
  END IF;
  
  -- Add updated constraint
  ALTER TABLE users ADD CONSTRAINT users_user_type_check 
    CHECK ((user_type = ANY (ARRAY['customer'::text, 'employee'::text, 'admin'::text])));
END $$;

-- Add index on is_admin for performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Add comment to document the new field
COMMENT ON COLUMN users.is_admin IS 'Indicates if the user has administrator privileges';