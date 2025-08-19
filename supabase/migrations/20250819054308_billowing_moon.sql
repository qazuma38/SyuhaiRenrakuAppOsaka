@@ .. @@
   user_type text NOT NULL CHECK (user_type IN ('customer', 'employee', 'admin')),
   fcm_token text,
   created_at timestamptz DEFAULT now(),
   base text NOT NULL CHECK (base ~ '^[0-9]{2}$'),
-  is_admin boolean NOT NULL DEFAULT false COMMENT 'Indicates if the user has administrator privileges'
+  is_admin boolean NOT NULL DEFAULT false
 );

+-- Add comment for is_admin column
+COMMENT ON COLUMN users.is_admin IS 'Indicates if the user has administrator privileges';
+
 ALTER TABLE users ENABLE ROW LEVEL SECURITY;