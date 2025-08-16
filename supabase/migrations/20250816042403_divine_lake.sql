/*
  # Update registered_courses primary key to composite key

  1. Changes
    - Drop existing primary key constraint on id column
    - Add new composite primary key on (employee_id, course_id)
    - Remove id column as it's no longer needed
    - Update unique constraint to match new primary key

  2. Security
    - Maintains existing RLS policies
    - Preserves all existing data
    - Updates indexes appropriately

  3. Notes
    - This ensures one employee can only register each course once
    - Simplifies the table structure by removing unnecessary id column
*/

-- Drop existing primary key constraint
ALTER TABLE registered_courses DROP CONSTRAINT registered_courses_pkey;

-- Drop the unique constraint that will be replaced by primary key
ALTER TABLE registered_courses DROP CONSTRAINT IF EXISTS registered_courses_employee_id_course_id_key;

-- Add new composite primary key
ALTER TABLE registered_courses ADD CONSTRAINT registered_courses_pkey PRIMARY KEY (employee_id, course_id);

-- Drop the id column since it's no longer needed
ALTER TABLE registered_courses DROP COLUMN id;

-- Recreate the index on employee_id (course_id is already covered by the primary key)
DROP INDEX IF EXISTS idx_registered_courses_employee_id;
CREATE INDEX idx_registered_courses_employee_id ON registered_courses(employee_id);