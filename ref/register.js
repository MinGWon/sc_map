import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Geist } from "next/font/google";
import styles from '@/styles/Auth.module.css';
import homeStyles from '@/styles/Home.module.css'; // Import Home styles for header
import { useRouter } from 'next/router';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Register() {
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [grade, setGrade] = useState(1);
  const [classNumber, setClassNumber] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const router = useRouter();

  // 현재 시간 업데이트
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('ko-KR', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // 오늘 날짜 가져오기
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0].replace(/-/g, '.') + '.';
  };

  // 학번 생성 함수
  const generateStudentId = () => {
    if (grade && classNumber && studentNumber) {
      return `${grade}${classNumber.toString().padStart(2, '0')}${studentNumber.toString().padStart(2, '0')}`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // 아이디 유효성 검사
    if (loginId.length < 4) {
      setError('아이디는 최소 4자 이상이어야 합니다.');
      return;
    }
    
    // 아이디 형식 검사 (영문, 숫자, 밑줄만 허용)
    if (!/^[a-zA-Z0-9_]+$/.test(loginId)) {
      setError('아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.');
      return;
    }
    
    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    // 비밀번호 복잡성 검사
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    
    // 학년, 반, 번호 유효성 검사
    if (!grade || grade < 1 || grade > 3) {
      setError('유효한 학년을 선택해주세요.');
      return;
    }
    
    if (!classNumber || classNumber < 1 || classNumber > 20) {
      setError('반은 1~20 사이의 숫자여야 합니다.');
      return;
    }
    
    if (!studentNumber || studentNumber < 1 || studentNumber > 40) {
      setError('번호는 1~40 사이의 숫자여야 합니다.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name,
          loginId,
          password, 
          grade: parseInt(grade),
          classNumber: parseInt(classNumber),
          studentNumber: parseInt(studentNumber)
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '회원가입 중 오류가 발생했습니다.');
      }
      
      // 회원가입 성공 시 로그인 페이지로 이동
      router.push({
        pathname: '/login',
        query: { registered: true }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>회원가입 - 순창고 통합계정 시스템</title>
        <meta name="description" content="순창고등학교 통합계정 시스템 회원가입" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={`${geistSans.variable}`}>
        {/* Add consistent header from home page */}
        <header className={homeStyles.header}>
          <div className={homeStyles.headerContainer}>
            <div className={homeStyles.logo}>
              <Link href="/">
                <div className={homeStyles.logoWrapper}>
                  <div className={homeStyles.logoIcon}>SC</div>
                  <span className={homeStyles.logoText}>순창고 통합계정</span>
                </div>
              </Link>
            </div>
            <nav className={homeStyles.nav}>
              <div className={homeStyles.navLinks}>
                <Link href="/docs" className={homeStyles.navLink}>문서</Link>
                <Link href="/dashboard" className={homeStyles.navLink}>대시보드</Link>
              </div>
              <div className={homeStyles.authButtons}>
                <Link href="/login" className={homeStyles.loginButton}>로그인</Link>
              </div>
            </nav>
          </div>
        </header>
        
        <div className={styles.container}>
          <div className={styles.authCard}>
            <h1 className={styles.title}>회원가입</h1>
            
            {error && <p className={styles.error}>{error}</p>}
            
            <form onSubmit={handleSubmit} className={styles.form}>
              
              <div className={styles.studentInfoContainer}>
                <h3 className={styles.sectionTitle}>학적 확인</h3>
                
                <div className={styles.formGroup}>
                  <label htmlFor="name">이름</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="이름 입력"
                    className={styles.input}
                  />
                </div>

                <div className={styles.studentInfoGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="grade">학년</label>
                    <select
                      id="grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      required
                      className={styles.select}
                    >
                      <option value="1">1학년</option>
                      <option value="2">2학년</option>
                      <option value="3">3학년</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="classNumber">반</label>
                    <input
                      id="classNumber"
                      type="number"
                      value={classNumber}
                      onChange={(e) => setClassNumber(e.target.value)}
                      min="1"
                      max="20"
                      required
                      placeholder="1~20"
                      className={styles.input}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="studentNumber">번호</label>
                    <input
                      id="studentNumber"
                      type="number"
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      min="1"
                      max="40"
                      required
                      placeholder="1~40"
                      className={styles.input}
                    />
                  </div>
                </div>

                {/* 학생증 미리보기 */}
                {(name || grade || classNumber || studentNumber) && (
                  <div className={styles.studentCardPreview}>
                    <div className={styles.studentCard}>
                      <div className={styles.cardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className={styles.schoolLogo}>SC</div>
                          <div className={styles.cardTitle}>
                            <h4>순창고등학교</h4>
                            <span style={{fontSize: "10px"}}>SUNCHANG HIGH SCHOOL</span>
                          </div>
                        </div>
                        <div className={styles.realCardType}>
                          <div className={styles.statusRow}>
                            <div className={styles.greenDot}></div>
                            원본
                          </div>
                          <div className={styles.timeDisplay}>{currentTime}</div>
                        </div>
                      </div>
                      
                      <div className={styles.cardBody}>
                        <div className={styles.photoSection}>
                          <div className={styles.photoPlaceholder}>
                            <span>사진</span>
                          </div>
                        </div>
                        
                        <div className={styles.infoSection}>
                          <div className={styles.infoRow}>
                            <span className={styles.label}>성명</span>
                            <span className={styles.value}>{name || '이름을 입력하세요'}</span>
                          </div>
                          <div className={styles.infoRow}>
                            <span className={styles.label}>학적</span>
                            <span className={styles.value}>
                              {grade && classNumber && studentNumber 
                                ? `${grade}학년 ${classNumber}반 ${studentNumber}번` 
                                : '학적 정보를 입력하세요'}
                            </span>
                          </div>
                          <div className={styles.infoRow}>
                            <span className={styles.label}>유효기간</span>
                            <span className={styles.value}>2026년 2월 21일</span>
                          </div>
                        </div>
                        
                        <span className={styles.schoolMotto}>學行一致</span>
                        <span className={styles.principalSignature}>순창고등학교장</span>
                        <div className={styles.sealPlaceholder}>
                          <span>직인<br />생략</span>
                        </div>
                      </div>
                      
                      <div className={styles.cardFooter}>
                        <div className={styles.schoolInfo}>
                          <span>전북특별자치도 순창군 순창읍 옥천로 67-14</span>
                          <span>교무실: 063-653-2792ㅤㅤ({getTodayDate()})</span>
                        </div>
                        <div className={styles.cardType}>전자학생증</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="loginId">아이디</label>
                <input
                  id="loginId"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  placeholder="아이디 입력 (영문, 숫자, 밑줄(_)만 사용 가능)"
                  className={styles.input}
                  minLength={4}
                  pattern="[a-zA-Z0-9_]+"
                />
                <small className={styles.helpText}>4자 이상의 영문, 숫자, 밑줄(_)만 사용 가능합니다.</small>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="password">비밀번호</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="비밀번호 입력 (8자 이상)"
                  className={styles.input}
                  minLength={8}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">비밀번호 확인</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="비밀번호 재입력"
                  className={styles.input}
                />
              </div>
              
              <button 
                type="submit" 
                className={styles.button}
                disabled={isLoading}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </form>
            
            <div className={styles.links}>
              <Link href="/login">이미 계정이 있으신가요? 로그인</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
