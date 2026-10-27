import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env.local and paste your TiDB connection string."
    );
  }
  return url;
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      uri: requireDatabaseUrl(),
      waitForConnections: true,
      connectionLimit: 8,
      dateStrings: true,
      ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    });
  }
  return pool;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
) {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
