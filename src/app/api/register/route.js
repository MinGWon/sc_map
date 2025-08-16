import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      username, 
      password, 
      studentName, 
      grade, 
      classNum, 
      studentNum, 
      schoolEmail,
      type
    } = body;

    // Validate required fields based on role
    if (!username || !password || !studentName) {
      return NextResponse.json(
        { success: false, message: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // For students, validate additional required fields
    if (type === 'student' && (!grade || !classNum || !studentNum)) {
      return NextResponse.json(
        { success: false, message: '모든 학적 정보를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, message: '이미 사용 중인 아이디입니다.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existingEmails] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [schoolEmail]
    );

    if (existingEmails.length > 0) {
      return NextResponse.json(
        { success: false, message: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식에 따라 역할 결정
    let role = type || 'student'; // 클라이언트에서 전달된 역할 또는 기본값 사용

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    await pool.query(
      `INSERT INTO users (
        id, 
        password, 
        type, 
        name, 
        grade, 
        class, 
        email, 
        column_name, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        username, 
        hashedPassword, 
        role,
        studentName,
        role === 'teacher' ? null : grade,
        role === 'teacher' ? null : classNum,
        schoolEmail,
        role === 'teacher' ? null : studentNum
      ]
    );

    return NextResponse.json(
      { success: true, message: '회원가입이 완료되었습니다.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('회원가입 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
