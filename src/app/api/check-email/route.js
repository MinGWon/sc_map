import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST || '211.186.91.57',
  user: process.env.DB_USER || 'pm2',
  password: process.env.DB_PASSWORD || '2792',
  database: process.env.DB_NAME || 'sc_map',
  charset: 'utf8mb4'
};

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: '이메일 주소가 필요합니다.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existingEmails] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingEmails.length > 0) {
      return NextResponse.json(
        { success: false, message: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      );
    }

    // Email is available
    return NextResponse.json(
      { success: true, message: '사용 가능한 이메일입니다.' }
    );
    
  } catch (error) {
    console.error('이메일 중복 확인 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
