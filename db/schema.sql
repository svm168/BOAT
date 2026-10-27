-- Run this once against your TiDB database (SQL Editor in TiDB Cloud, or any MySQL client).
-- Database name should match the path in DATABASE_URL (here: boat).

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) NULL,
  hostel VARCHAR(120) NULL,
  room VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS bikes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  public_id VARCHAR(16) NOT NULL,
  name VARCHAR(120) NOT NULL,
  color VARCHAR(64) NULL,
  model VARCHAR(120) NULL,
  tag_id VARCHAR(64) NOT NULL,
  status ENUM('active', 'missing') NOT NULL DEFAULT 'active',
  beacon_uuid CHAR(36) NOT NULL,
  beacon_major INT UNSIGNED NOT NULL DEFAULT 1,
  beacon_minor INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bikes_public_id (public_id),
  UNIQUE KEY uq_bikes_beacon (beacon_uuid, beacon_major, beacon_minor),
  KEY idx_bikes_owner (owner_id),
  KEY idx_bikes_tag_id (tag_id),
  CONSTRAINT fk_bikes_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS missing_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bike_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active', 'resolved') NOT NULL DEFAULT 'active',
  reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_missing_bike_status (bike_id, status),
  CONSTRAINT fk_missing_reports_bike FOREIGN KEY (bike_id) REFERENCES bikes (id)
);

-- Direct ingestion table. Mobile/web/hardware pings INSERT here with no pre-query.
-- Latest position: WHERE bike_id = ? ORDER BY recorded_at DESC LIMIT 1
CREATE TABLE IF NOT EXISTS location_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bike_id BIGINT UNSIGNED NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  accuracy_m FLOAT NULL,
  source ENUM('web', 'ble', 'rfid', 'manual') NOT NULL DEFAULT 'web',
  reporter_note VARCHAR(255) NULL,
  recorded_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_bike_recorded (bike_id, recorded_at DESC),
  CONSTRAINT fk_reports_bike FOREIGN KEY (bike_id) REFERENCES bikes (id)
);
