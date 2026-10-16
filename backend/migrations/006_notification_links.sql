-- Lets a notification carry a destination the recipient can navigate to
-- (e.g. an admin's "MoMo payment received" notification linking to that
-- member's account page) instead of being message-only.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255);
