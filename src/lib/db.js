import mysql from 'mysql2/promise';

// Create a connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.45.208',
  user: process.env.DB_USER || 'pm2',
  password: process.env.DB_PASSWORD || '2792',
  database: process.env.DB_NAME || 'sc_map',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
