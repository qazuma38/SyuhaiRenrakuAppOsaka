@@ .. @@
 -- RLS policies for users table
 CREATE POLICY "Users can read own data"
   ON users
   FOR SELECT
   TO public
-  USING (id = (uid())::text);
+  USING (id = (auth.uid())::text);

 CREATE POLICY "Users can update own data"
   ON users
   FOR UPDATE
   TO public
-  USING (id = (uid())::text)
-  WITH CHECK (id = (uid())::text);
+  USING (id = (auth.uid())::text)
+  WITH CHECK (id = (auth.uid())::text);

 CREATE POLICY "Users can insert own data"
   ON users
   FOR INSERT
   TO public
-  WITH CHECK (id = (uid())::text);
+  WITH CHECK (id = (auth.uid())::text);

@@ .. @@
 -- RLS policies for user_sessions table
 CREATE POLICY "Users can manage own sessions"
   ON user_sessions
   FOR ALL
   TO public
-  USING (user_id = (uid())::text)
-  WITH CHECK (user_id = (uid())::text);
+  USING (user_id = (auth.uid())::text)
+  WITH CHECK (user_id = (auth.uid())::text);

@@ .. @@
 -- RLS policies for registered_courses table
 CREATE POLICY "Users can manage own registered courses"
   ON registered_courses
   FOR ALL
   TO public
-  USING (employee_id = (uid())::text)
-  WITH CHECK (employee_id = (uid())::text);
+  USING (employee_id = (auth.uid())::text)
+  WITH CHECK (employee_id = (auth.uid())::text);

@@ .. @@
 -- RLS policies for employee_courses table
 CREATE POLICY "Authenticated users can manage employee courses"
   ON employee_courses
   FOR ALL
   TO public
-  USING (employee_id = (uid())::text OR EXISTS (
+  USING (employee_id = (auth.uid())::text OR EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ))
-  WITH CHECK (employee_id = (uid())::text OR EXISTS (
+  WITH CHECK (employee_id = (auth.uid())::text OR EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ));

@@ .. @@
 -- RLS policies for customer_courses table
 CREATE POLICY "Authenticated users can manage customer courses"
   ON customer_courses
   FOR ALL
   TO public
-  USING (customer_id = (uid())::text OR EXISTS (
+  USING (customer_id = (auth.uid())::text OR EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ))
-  WITH CHECK (customer_id = (uid())::text OR EXISTS (
+  WITH CHECK (customer_id = (auth.uid())::text OR EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ));

@@ .. @@
 -- RLS policies for chat_messages table
 CREATE POLICY "Users can read relevant chat messages"
   ON chat_messages
   FOR SELECT
   TO public
-  USING (sender_id = (uid())::text OR receiver_id = (uid())::text);
+  USING (sender_id = (auth.uid())::text OR receiver_id = (auth.uid())::text);

 CREATE POLICY "Users can insert chat messages"
   ON chat_messages
   FOR INSERT
   TO public
-  WITH CHECK (sender_id = (uid())::text);
+  WITH CHECK (sender_id = (auth.uid())::text);

 CREATE POLICY "Users can update relevant chat messages"
   ON chat_messages
   FOR UPDATE
   TO public
-  USING (sender_id = (uid())::text OR receiver_id = (uid())::text)
-  WITH CHECK (sender_id = (uid())::text OR receiver_id = (uid())::text);
+  USING (sender_id = (auth.uid())::text OR receiver_id = (auth.uid())::text)
+  WITH CHECK (sender_id = (auth.uid())::text OR receiver_id = (auth.uid())::text);

@@ .. @@
 -- RLS policies for message_logs table
 CREATE POLICY "Users can read relevant message logs"
   ON message_logs
   FOR SELECT
   TO public
-  USING (sender_id = (uid())::text OR receiver_id = (uid())::text);
+  USING (sender_id = (auth.uid())::text OR receiver_id = (auth.uid())::text);

 CREATE POLICY "System can manage message logs"
   ON message_logs
   FOR ALL
   TO public
-  USING (true)
-  WITH CHECK (true);
+  USING (true);

@@ .. @@
 -- RLS policies for preset_messages table
 CREATE POLICY "Authenticated users can manage preset messages"
   ON preset_messages
   FOR ALL
   TO public
-  USING (customer_id = (uid())::text OR customer_id IS NULL OR EXISTS (
+  USING (customer_id = (auth.uid())::text OR customer_id IS NULL OR EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ))
-  WITH CHECK (customer_id = (uid())::text OR customer_id IS NULL OR EXISTS (
+  WITH CHECK (customer_id = (auth.uid())::text OR customer_id IS NULL OR EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ));

@@ .. @@
 -- RLS policies for notification_history table
 CREATE POLICY "Users can read own notifications"
   ON notification_history
   FOR SELECT
   TO public
-  USING (user_id = (uid())::text);
+  USING (user_id = (auth.uid())::text);

 CREATE POLICY "System can manage notifications"
   ON notification_history
   FOR ALL
   TO public
-  USING (true)
-  WITH CHECK (true);
+  USING (true);

@@ .. @@
 -- RLS policies for system_setting table
 CREATE POLICY "Admin users can manage system settings"
   ON system_setting
   FOR ALL
   TO public
   USING (EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ))
   WITH CHECK (EXISTS (
     SELECT 1 FROM users 
-    WHERE id = (uid())::text AND is_admin = true
+    WHERE id = (auth.uid())::text AND is_admin = true
   ));