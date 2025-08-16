import mysql from 'mysql2/promise';

// 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sc_map',
  charset: 'utf8mb4'
};

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

export default pool;
