-- Allow bookings/payments to exist without a registered user (guest checkout)
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name  VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
ALTER TYPE booked_by_role ADD VALUE IF NOT EXISTS 'guest';

ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id);
