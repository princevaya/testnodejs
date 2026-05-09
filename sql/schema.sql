CREATE DATABASE IF NOT EXISTS smart_complaints;
USE smart_complaints;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('User', 'Admin', 'Staff') NOT NULL DEFAULT 'User',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Network', 'Plumbing', 'Electrical', 'General') NOT NULL,
  priority ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
  building VARCHAR(100) NOT NULL,
  floor VARCHAR(50) NOT NULL,
  room VARCHAR(50) NOT NULL,
  image_url VARCHAR(255) NULL,
  status ENUM('Pending', 'In Progress', 'Resolve Requested', 'Resolved') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  CONSTRAINT fk_complaint_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  complaint_id INT NOT NULL,
  staff_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (complaint_id),
  CONSTRAINT fk_assignment_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  complaint_id INT PRIMARY KEY,
  rating TINYINT NOT NULL,
  comment VARCHAR(1000) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE INDEX idx_complaint_status ON complaints(status);
CREATE INDEX idx_complaint_category ON complaints(category);
CREATE INDEX idx_complaint_priority ON complaints(priority);
CREATE INDEX idx_complaint_room_category_status ON complaints(room, category, status);
