-- PostgreSQL schema for ecologe_tennis_club
-- Connect pgAdmin to: host=localhost, port=5432, user=postgres, password=123er
-- Create the database first, then run this file against it.

CREATE TYPE user_role AS ENUM ('member','coach','ballboy','admin');
CREATE TYPE court_status AS ENUM ('available','maintenance');
CREATE TYPE membership_type AS ENUM ('monthly','half_yearly','yearly');
CREATE TYPE membership_status AS ENUM ('active','expired','pending');
CREATE TYPE booking_status AS ENUM ('confirmed','cancelled');
CREATE TYPE booked_by_role AS ENUM ('member','coach','admin');
CREATE TYPE payment_status AS ENUM ('pending','successful','failed');

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'member',
  phone VARCHAR(20),
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  status court_status DEFAULT 'available'
);

INSERT INTO courts (name) VALUES
  ('Court 1'), ('Court 2'), ('Court 3'),
  ('Court 4'), ('Court 5'), ('Court 6')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS memberships (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  type membership_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status membership_status DEFAULT 'pending',
  payment_reference VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  court_id INT NOT NULL,
  user_id INT NOT NULL,
  coach_id INT DEFAULT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status DEFAULT 'confirmed',
  booked_by booked_by_role DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES courts(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ball_boy_assignments (
  id SERIAL PRIMARY KEY,
  ball_boy_id INT NOT NULL,
  booking_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ball_boy_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE (ball_boy_id, booking_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  membership_id INT,
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(150),
  status payment_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE SET NULL
);

-- Default admin account (password: 123456e)
INSERT INTO users (name, email, password, role, phone)
VALUES ('Eric Ndayishimiye', 'ericnd8@gmail.com', '$2a$10$6WLRiDqIl4lJwsAn6tJCOeRmKFNQogzJxaL5i4VnlrMYtvYx8iTuy', 'admin', '+250727050987')
ON CONFLICT (email) DO NOTHING;
