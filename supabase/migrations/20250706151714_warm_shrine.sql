/*
  # Update preset message text

  1. Changes
    - Update pickup_yes message from "本日の集配を実施いたします。" to "本日の集配をお願いします。"
    - Update re_pickup message from "再度集配にお伺いいたします。" to "再度集配をお願いします。"

  2. Security
    - No security changes required
*/

-- Update existing preset messages
UPDATE preset_messages 
SET message = '集配あり - 本日の集配をお願いします。'
WHERE message_type = 'pickup_yes' 
AND message = '集配あり - 本日の集配を実施いたします。';

UPDATE preset_messages 
SET message = '再集配 - 再度集配をお願いします。'
WHERE message_type = 're_pickup' 
AND message = '再集配 - 再度集配にお伺いいたします。';