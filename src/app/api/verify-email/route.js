import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// 인증 코드 저장소 (실제 환경에서는 데이터베이스나 Redis를 사용)
const verificationCodes = new Map();

// 4자리 숫자 코드 생성
function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Gmail SMTP 트랜스포터 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  secure: true,
});

export async function POST(request) {
  console.log('[POST /api/verify-email] 인증 코드 요청 시작');
  
  try {
    const body = await request.json();
    console.log('[POST /api/verify-email] 요청 본문:', body);
    
    const { email } = body;
    
    console.log('[POST /api/verify-email] 이메일:', email);
    
    // 이메일 형식 및 도메인 검증
    if (!email || !email.endsWith('@sunchang.hs.kr')) {
      console.log('[POST /api/verify-email] 이메일 검증 실패: 잘못된 도메인');
      return NextResponse.json(
        { success: false, message: '@sunchang.hs.kr 도메인의 이메일만 사용 가능합니다.' },
        { status: 400 }
      );
    }

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    console.log('[POST /api/verify-email] 생성된 인증 코드:', verificationCode, '대상 이메일:', email);
    
    // 인증 코드 저장 (10분 만료)
    verificationCodes.set(email, {
      code: verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10분
    });
    console.log('[POST /api/verify-email] 현재 저장된 인증 코드 목록:', Array.from(verificationCodes.keys()));

    // 인증 이메일 발송
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: '순창고 커뮤니티맵 이메일 인증',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #405de6;">순창고 커뮤니티맵 이메일 인증</h2>
          <p>안녕하세요! 순창고 커뮤니티맵 회원가입을 위한 인증 코드입니다.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 24px;">${verificationCode}</h3>
          </div>
          <p>위 코드를 회원가입 페이지에 입력하여 인증을 완료해주세요.</p>
          <p>이 코드는 10분 후에 만료됩니다.</p>
          <p>본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #777; font-size: 12px;">순창고등학교 커뮤니티맵</p>
        </div>
      `
    };

    console.log('[POST /api/verify-email] 이메일 전송 시도:', email, verificationCode);
    await transporter.sendMail(mailOptions);
    console.log('[POST /api/verify-email] 이메일 전송 성공');

    return NextResponse.json({
      success: true,
      message: '인증 코드가 이메일로 전송되었습니다.'
    });
  } catch (error) {
    console.error('[POST /api/verify-email] 이메일 전송 오류:', error);
    return NextResponse.json(
      { success: false, message: '인증 코드 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 인증 코드 확인 API
export async function PUT(request) {
  console.log('[PUT /api/verify-email] 인증 코드 확인 요청 시작');
  
  try {
    // 요청 본문 확인
    const requestText = await request.text();
    console.log('[PUT /api/verify-email] 요청 원본 텍스트:', requestText);
    
    // 다시 JSON으로 파싱
    let body;
    try {
      body = JSON.parse(requestText);
      console.log('[PUT /api/verify-email] 파싱된 요청 본문:', body);
    } catch (parseError) {
      console.error('[PUT /api/verify-email] JSON 파싱 오류:', parseError);
      return NextResponse.json(
        { success: false, message: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }
    
    const { email, code } = body;
    console.log('[PUT /api/verify-email] 입력된 이메일:', email, '입력된 코드:', code);
    
    if (!email || !code) {
      console.log('[PUT /api/verify-email] 필수 파라미터 누락');
      return NextResponse.json(
        { success: false, message: '이메일과 인증 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('[PUT /api/verify-email] 저장된 코드 목록:', Array.from(verificationCodes.keys()));
    const storedData = verificationCodes.get(email);
    console.log('[PUT /api/verify-email] 저장된 데이터:', storedData ? 
      { code: storedData.code, expiresAt: new Date(storedData.expiresAt).toISOString() } : 
      '없음');
    
    // 코드가 존재하지 않는 경우
    if (!storedData) {
      console.log('[PUT /api/verify-email] 인증 코드 없음');
      return NextResponse.json(
        { success: false, message: '인증 코드가 만료되었거나 존재하지 않습니다.' },
        { status: 400 }
      );
    }
    
    // 코드 만료 확인
    const now = Date.now();
    console.log('[PUT /api/verify-email] 현재 시간:', new Date(now).toISOString(), '만료 시간:', new Date(storedData.expiresAt).toISOString());
    
    if (now > storedData.expiresAt) {
      console.log('[PUT /api/verify-email] 인증 코드 만료됨');
      verificationCodes.delete(email); // 만료된 코드 삭제
      return NextResponse.json(
        { success: false, message: '인증 코드가 만료되었습니다. 다시 요청해주세요.' },
        { status: 400 }
      );
    }
    
    // 코드 일치 확인
    console.log('[PUT /api/verify-email] 코드 비교 - 저장된 코드:', storedData.code, '입력된 코드:', code, '타입:', typeof storedData.code, typeof code);
    
    if (storedData.code !== code) {
      console.log('[PUT /api/verify-email] 인증 코드 불일치');
      return NextResponse.json(
        { success: false, message: '인증 코드가 일치하지 않습니다.' },
        { status: 400 }
      );
    }
    
    // 인증 완료 후 코드 삭제 (재사용 방지)
    console.log('[PUT /api/verify-email] 인증 성공 - 코드 삭제');
    verificationCodes.delete(email);
    
    return NextResponse.json({
      success: true,
      message: '이메일 인증이 완료되었습니다.'
    });
  } catch (error) {
    console.error('[PUT /api/verify-email] 인증 코드 확인 오류:', error);
    return NextResponse.json(
      { success: false, message: '인증 코드 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
