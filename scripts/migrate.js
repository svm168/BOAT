const fs = require('fs');
const mysql = require('mysql2/promise');

async function migrate() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=([^\r\n]+)/)[1];

  const conn = await mysql.createConnection(dbUrl);
  console.log('Connected to TiDB.');

  // Check columns of bikes
  const [cols] = await conn.query('SHOW COLUMNS FROM bikes LIKE "tag_id"');
  if (cols.length === 0) {
    console.log('Adding tag_id column to bikes...');
    await conn.query('ALTER TABLE bikes ADD COLUMN tag_id VARCHAR(64) NULL AFTER model');
    await conn.query('CREATE INDEX idx_bikes_tag_id ON bikes (tag_id)');
    console.log('tag_id added.');
  } else {
    console.log('tag_id column already exists.');
  }

  // Populate existing bikes tag_id if null
  await conn.query("UPDATE bikes SET tag_id = CONCAT('TAG-', public_id) WHERE tag_id IS NULL");

  // Create missing_reports table
  console.log('Creating missing_reports table if not exists...');
  await conn.query(`
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
    )
  `);
  console.log('missing_reports ready.');

  // Sync existing 'missing' bike into missing_reports if not present
  const [missingBikes] = await conn.query("SELECT id FROM bikes WHERE status = 'missing'");
  for (const b of missingBikes) {
    const [existing] = await conn.query(
      "SELECT id FROM missing_reports WHERE bike_id = ? AND status = 'active' LIMIT 1",
      [b.id]
    );
    if (existing.length === 0) {
      await conn.query(
        "INSERT INTO missing_reports (bike_id, status) VALUES (?, 'active')",
        [b.id]
      );
      console.log(`Synced existing missing bike id ${b.id} into missing_reports.`);
    }
  }

  // Update location_reports source ENUM to include rfid
  try {
    await conn.query(`
      ALTER TABLE location_reports 
      MODIFY COLUMN source ENUM('web', 'ble', 'rfid', 'manual') NOT NULL DEFAULT 'web'
    `);
    console.log('location_reports source modified to include rfid.');
  } catch (e) {
    console.log('Source modify notice:', e.message);
  }

  const [bikes] = await conn.query('SELECT id, name, tag_id, status FROM bikes');
  console.log('Updated bikes:', bikes);

  await conn.end();
}

migrate().catch(console.error);
