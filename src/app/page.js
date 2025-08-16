"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Add Link import
import styles from "./page.module.css";
import { validateLogin } from "./mockData";
import LoadingScreen from "./components/LoadingScreen";

export default function Home() {
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // 세션 유효성 검사 함수
  const checkSession = () => {
    const user = localStorage.getItem('user');
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    
    if (user && sessionExpiry) {
      const now = new Date().getTime();
      const expiryTime = parseInt(sessionExpiry);
      
      if (now < expiryTime) {
        // 세션이 유효하면 메인 페이지로 리다이렉트
        console.log("유효한 세션 발견, 메인 페이지로 이동");
        router.push('/main');
        return true;
      } else {
        // 세션이 만료되었으면 로컬스토리지 정리
        console.log("세션 만료됨, 로그아웃 처리");
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
      }
    }
    return false;
  };

  // 컴포넌트 마운트 시 세션 확인
  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("로그인 폼 제출됨:", { username, password });
    
    setIsLoading(true);
    setLoginError("");
    
    // 로그인 검증
    setTimeout(async () => {
      try {
        const result = await validateLogin(username, password);
        console.log("로그인 결과:", result);
        
        if (result.success) {
          // 1시간 후 만료 시간 계산 (60 * 60 * 1000 = 3600000ms)
          const expiryTime = new Date().getTime() + (60 * 60 * 1000);
          
          localStorage.setItem('user', JSON.stringify(result.user));
          localStorage.setItem('sessionExpiry', expiryTime.toString());
          
          console.log("로그인 성공, 세션 만료 시간:", new Date(expiryTime).toLocaleString());
          
          setIsLoading(false);
          setIsNavigating(true);
          
          console.log("로그인 성공, 메인 페이지로 이동 중...");
          // 로딩 화면을 2초간 보여준 후 메인 페이지로 이동
          setTimeout(() => {
            router.push('/main');
          }, 2000);
        } else {
          console.log("로그인 실패:", result.message);
          setLoginError(result.message);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("로그인 처리 중 오류:", error);
        setLoginError("로그인 처리 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    }, 1000);
  };

  // 네비게이션 로딩 중일 때 로딩 스크린 표시
  if (isNavigating) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.rightSection}>
        <div className={styles.loginContainer} style={{width: '350px'}}>
          <div className={styles.logoSection}>
            <h1 className={styles.logo}>순창고 커뮤니티맵</h1>
          </div>
          
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="전화번호, 사용자 이름 또는 이메일"
                className={styles.input}
                id="username"
                required
              />

            </div>
            
            <div className={styles.inputGroup}>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className={styles.input}
                id="password"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className={`${styles.loginButton} ${username && password ? styles.active : ''}`}
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner} style={{borderTopColor: '#000'}}></div>
                  로그인 중...
                </div>
              ) : (
                "로그인"
              )}
            </button>
            
            {loginError && (
              <div className={styles.errorMessage}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ed4956">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {loginError}
              </div>
            )}
          </form>
          
          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>또는</span>
            <div className={styles.dividerLine}></div>
          </div>
          
          <div className={styles.forgotPassword}>
            <a href="#" className={styles.forgotLink}>비밀번호를 잊으셨나요?</a>
          </div>
        </div>
        
        <div className={styles.signupContainer}>
          <p className={styles.signupText}>
            계정이 없으신가요? <Link href="/register" className={styles.signupLink}>가입하기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}


