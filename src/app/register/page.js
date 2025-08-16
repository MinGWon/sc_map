"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../page.module.css";
import LoadingScreen from "../components/LoadingScreen";

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [registerError, setRegisterError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Step 1: 학교 인증 데이터
  const [schoolEmail, setSchoolEmail] = useState("");
  const [userRole, setUserRole] = useState(""); // 사용자 역할 (student/teacher)
  const [verificationCode, setVerificationCode] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", ""]);
  const [shakeIndexes, setShakeIndexes] = useState([false, false, false, false]); // Track which inputs to shake
  const [isVerified, setIsVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  
  // 인증코드 입력 필드에 대한 ref 배열 (4개로 변경)
  const codeInputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];
  
  // Step 2: 학적 정보
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [studentNum, setStudentNum] = useState("");
  const [studentName, setStudentName] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  
  // Step 3: 계정 정보
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  
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
  
  // 이메일 입력 핸들러 - 학년을 자동으로 감지하고 설정
  const [showKoreanWarning, setShowKoreanWarning] = useState(false);
  
  const handleEmailChange = (e) => {
    const value = e.target.value;
    
    // 한글 입력 감지 (한글 문자가 있는지 확인)
    const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value);
    
    if (hasKorean) {
      // 한글 입력이 감지되면 경고 모달 표시
      setShowKoreanWarning(true);
      
      // 3초 후 모달 자동 닫기
      setTimeout(() => {
        setShowKoreanWarning(false);
      }, 3000);
      
      // 중요: 기존 값을 유지하고 변경하지 않음
      return;
    }
    
    // 입력된 값에서 알파벳과 숫자만 추출
    const alphanumericOnly = value.replace(/[^a-zA-Z0-9]/g, '');
    
    // 입력값 설정
    setSchoolEmail(alphanumericOnly);
    
    // 이메일 형식에 따라 역할 자동 감지
    if (/^\d{6}$/.test(alphanumericOnly)) {
      setUserRole("student");
      
      // 학생 이메일 앞 2자리로 학년을 자동으로 감지
      const yearPrefix = alphanumericOnly.substring(0, 2);
      const currentYear = new Date().getFullYear().toString().substring(2); // 현재 연도의 뒤 2자리 (ex: "26")
      
      // 입학년도에 따른 학년 계산 (2023년 입학 = 3학년, 2024년 입학 = 2학년, 2025년 입학 = 1학년)
      const entryYear = parseInt('20' + yearPrefix);
      const currentFullYear = new Date().getFullYear();
      const calculatedGrade = currentFullYear - entryYear + 1;
      
      // 유효한 학년 범위(1~3)에 있는지 확인하고 설정
      if (calculatedGrade >= 1 && calculatedGrade <= 3) {
        setGrade(calculatedGrade.toString());
      } else {
        // 범위를 벗어나면 기본값으로 설정
        setGrade("");
      }
    } else if (alphanumericOnly.length > 0) {
      setUserRole("teacher");
    } else {
      setUserRole("");
    }
  };
  
  // 인증 코드 전송 핸들러
  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    
    // 이메일 형식 검증 (사용자 이름만 입력받으므로 따로 도메인 체크는 필요 없음)
    if (schoolEmail.trim() === "") {
      setRegisterError("이메일을 입력해주세요.");
      return;
    }
    
    setIsLoading(true);
    setRegisterError("");
    
    try {
      const fullEmail = `${schoolEmail}@sunchang.hs.kr`;
      
      // 먼저 이메일 중복 여부 확인
      const checkResponse = await fetch('/api/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: fullEmail
        }),
      });
      
      const checkData = await checkResponse.json();
      
      // 이메일이 이미 존재하는 경우
      if (!checkData.success) {
        setRegisterError(" 이미 사용 중인 이메일입니다.");
        setIsLoading(false);
        return;
      }
      
      // 이메일이 중복되지 않으면 인증 코드 전송 진행
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: fullEmail,
          userRole: userRole
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCodeSent(true);
      } else {
        setRegisterError(data.message || "인증 코드 전송에 실패했습니다.");
      }
    } catch (error) {
      setRegisterError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 인증 코드 디지트 변경 핸들러
  const handleCodeDigitChange = (index, value) => {
    // 숫자만 입력 가능하도록 처리
    if (value && !/^\d*$/.test(value)) return;
    
    // 새 배열 생성
    const newCodeDigits = [...codeDigits];
    
    // 이전 값이 없고 새 값이 있을 때만 애니메이션 적용
    if (!newCodeDigits[index] && value) {
      // 애니메이션을 위해 해당 인덱스만 true로 설정
      const newShakeIndexes = [false, false, false, false];
      newShakeIndexes[index] = true;
      setShakeIndexes(newShakeIndexes);
      
      // 애니메이션 초기화를 위해 500ms 후 모두 false로 설정
      setTimeout(() => {
        setShakeIndexes([false, false, false, false]);
      }, 500);
    }
    
    // 하나의 문자만 입력 허용
    newCodeDigits[index] = value.slice(0, 1);
    setCodeDigits(newCodeDigits);
    
    // 모든 코드 디지트를 결합해서 verificationCode 상태 업데이트
    const newVerificationCode = newCodeDigits.join('');
    setVerificationCode(newVerificationCode);
    
    // 값이 입력되면 다음 입력 필드로 포커스 이동
    if (value && index < 3) {
      codeInputRefs[index + 1].current.focus();
    }
    
    // 모든 자리가 채워졌으면 자동으로 인증 확인 실행
    if (value && index === 3) {
      // 마지막 자리에 입력한 값을 포함한 최종 코드 생성
      const completeCode = [
        newCodeDigits[0],
        newCodeDigits[1],
        newCodeDigits[2],
        value
      ].join('');
      
      // 약간의 지연을 두어 마지막 입력이 완료된 것을 시각적으로 확인할 수 있게 함
      setTimeout(() => {
        // 직접 최종 코드를 전달하여 상태 업데이트 지연 문제 해결
        handleVerifyCode(null, completeCode);
      }, 300);
    }
  };
  
  // 인증 코드 입력 키 핸들러 (백스페이스 처리)
  const handleCodeKeyDown = (index, e) => {
    // 백스페이스 키를 눌렀을 때
    if (e.key === 'Backspace') {
      if (codeDigits[index] === '' && index > 0) {
        // 현재 필드가 비어있고 첫 번째 필드가 아닌 경우, 이전 필드로 이동
        codeInputRefs[index - 1].current.focus();
      }
    }
  };
  
  // 인증 코드 입력 붙여넣기 처리
  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // 숫자만 추출
    const numericData = pastedData.replace(/\D/g, '');
    
    // 처음 4자리만 사용 (4로 변경)
    const digits = numericData.slice(0, 4).split('');
    
    // 부족한 자리는 빈 문자열로 채움
    while (digits.length < 4) { // 4로 변경
      digits.push('');
    }
    
    setCodeDigits(digits);
    setVerificationCode(digits.join(''));
    
    // 마지막 입력란으로 포커스
    if (digits[3]) { // 3으로 변경 (4자리 코드)
      codeInputRefs[3].current.focus(); // 3으로 변경
    } else {
      // 부족한 자리가 있다면 첫 번째 빈 자리로 포커스
      for (let i = 0; i < 4; i++) { // 4로 변경
        if (!digits[i]) {
          codeInputRefs[i].current.focus();
          break;
        }
      }
    }
  };
  
  // 인증 코드 확인 핸들러
  const handleVerifyCode = async (e, forcedCode = null) => {
    // e 파라미터가 있을 경우에만 preventDefault 호출 (버튼에서 호출될 때)
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setRegisterError("");
    
    try {
      const fullEmail = `${schoolEmail}@sunchang.hs.kr`;
      
      // 외부에서 전달된 코드 또는 상태의 코드 사용
      const codeToVerify = forcedCode || verificationCode;
      
      // 인증 코드가 숫자 형식으로만 구성되어 있는지 확인
      const cleanCode = codeToVerify.trim();
      
      // API 요청 및 응답 자세한 로깅 추가
      const response = await fetch('/api/verify-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: fullEmail,
          code: cleanCode  // 코드를 문자열로 확실하게 보냄
        }),
      });
      
      // 응답 상태가 성공적이지 않은 경우 전체 응답 텍스트 출력
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 오류: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setIsVerified(true);
        setRegisterError("");
        
        // 1.5초 후 자동으로 다음 단계로 이동
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 1500);
      } else {
        // 실패 시 더 자세한 오류 메시지 표시
        setRegisterError(data.message || "인증 코드가 일치하지 않습니다. 다시 시도해주세요.");
        setCodeDigits(["", "", "", ""]);
        setVerificationCode("");
        
        // 약간의 지연 후 첫 번째 입력란으로 포커스 이동
        setTimeout(() => {
          if (codeInputRefs[0].current) {
            codeInputRefs[0].current.focus();
          }
        }, 100);
      }
    } catch (error) {
      setRegisterError(`인증 코드가 일치하지 않습니다.`);
      
      // 오류 발생 시도 코드 초기화
      setCodeDigits(["", "", "", ""]);
      setVerificationCode("");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 인증 코드 재전송 핸들러
  const handleResendCode = async () => {
    if (isLoading) return;
    
    // 기존 코드 초기화
    setCodeDigits(["", "", "", ""]);
    setVerificationCode("");
    setRegisterError("");
    
    try {
      // 코드 재전송
      const fullEmail = `${schoolEmail}@sunchang.hs.kr`;
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: fullEmail
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`인증 코드 재전송 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCodeSent(true);
      } else {
        setRegisterError(data.message || "인증 코드 재전송에 실패했습니다.");
      }
    } catch (error) {
      setRegisterError(`인증 코드 재전송 오류: ${error.message}`);
    } finally {
      // 첫 번째 입력란으로 포커스 이동
      setTimeout(() => {
        if (codeInputRefs[0].current) {
          codeInputRefs[0].current.focus();
        }
      }, 100);
    }
  };

  // 다음 단계로 이동
  const handleNextStep = (e) => {
    e.preventDefault();
    
    if (currentStep === 1 && !isVerified) {
      setRegisterError("이메일 인증을 완료해주세요.");
      return;
    }
    
    if (currentStep === 2) {
      // 학적 정보 유효성 검사 - 교사인 경우 이름만 필요
      if (userRole === "teacher") {
        if (!studentName) {
          setRegisterError("이름을 입력해주세요.");
          return;
        }
      } else {
        // 학생인 경우 모든 학적 정보 필요
        if (!grade || !classNum || !studentNum || !studentName) {
          setRegisterError("모든 학적 정보를 입력해주세요.");
          return;
        }
      }
    }
    
    setRegisterError("");
    setCurrentStep(currentStep + 1);
  };
  
  // 이전 단계로 이동
  const handlePrevStep = () => {
    setRegisterError("");
    setCurrentStep(currentStep - 1);
  };
  
  // 최종 회원가입 제출
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // 비밀번호 확인 검증
    if (password !== confirmPassword) {
      setRegisterError("비밀번호가 일치하지 않습니다.");
      return;
    }
    
    // 약관 동의 확인
    if (!privacyAgreed || !termsAgreed) {
      setRegisterError("개인정보 처리방침과 이용약관에 동의해주세요.");
      return;
    }
    
    setIsLoading(true);
    setRegisterError("");
    
    try {
      const fullEmail = `${schoolEmail}@sunchang.hs.kr`;
      // Changed to use the existing database API endpoint
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          username,
          password,
          studentName,
          grade: userRole === "teacher" ? null : grade,
          classNum: userRole === "teacher" ? null : classNum,
          studentNum: userRole === "teacher" ? null : studentNum,
          schoolEmail: fullEmail,
          userRole: userRole
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsLoading(false);
        setRegistrationSuccess(true); // Set success state
        
        // 1.5초 후 로그인 페이지로 이동
        setTimeout(() => {
          setIsNavigating(true);
          router.push('/');
        }, 1500);
      } else {
        // Check if it's a duplicate email error and handle it specially
        if (data.message && data.message.includes('이미 사용 중인 이메일')) {
          // Set error with special flag for duplicate email
          setRegisterError(`⚠️ ${data.message}`);
          
          // Scroll to the top of the form to make sure error is visible
          const formElement = document.querySelector(`.${styles.loginForm}`);
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          setRegisterError(data.message || "가입 처리 중 오류가 발생했습니다.");
        }
        setIsLoading(false);
      }
    } catch (error) {
      setRegisterError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  // 네비게이션 로딩 중일 때 로딩 스크린 표시
  if (isNavigating) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.page}>
      {/* 한글 입력 경고 모달 */}
      {showKoreanWarning && (
        <div className={styles.koreanWarningModal} style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ff5252',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.3s ease-out',
          maxWidth: '300px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ 주의</div>
          <div>영문 및 숫자만 입력할 수 있습니다.</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            한글 키보드를 영문으로 전환해주세요.
          </div>
        </div>
      )}
      
      <div className={styles.rightSection}>
        <div className={styles.loginContainer}>
          
          {/* 진행 단계 표시 */}
          <div className={styles.progressSteps}>
            <div className={`${styles.progressStep} ${currentStep >= 1 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepLabel}>재학생/교원 인증</div>
            </div>
            <div className={styles.progressLine}></div>
            <div className={`${styles.progressStep} ${currentStep >= 2 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepLabel}>학적 정보</div>
            </div>
            <div className={styles.progressLine}></div>
            <div className={`${styles.progressStep} ${currentStep >= 3 ? styles.active : ''}`}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepLabel}>계정 정보</div>
            </div>
          </div>
          
          {/* 단계 1: 학교 이메일 인증 */}
          {currentStep === 1 && (
            <form className={styles.loginForm} onSubmit={(e) => {
              e.preventDefault();
              if (!isVerified && !isLoading) {
                if (!codeSent) {
                  // If code hasn't been sent yet, send verification code
                  handleSendVerificationCode(e);
                } else {
                  // If code has been sent, verify the code
                  handleVerifyCode(e);
                }
              } else if (isVerified) {
                // If already verified, proceed to next step
                setCurrentStep(currentStep + 1);
              }
            }}>
              <div className={styles.stepTitle}>재학생/교원 인증</div>
              
              <div className={styles.inputGroup}>
                <div className={styles.emailInputContainer} style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '368px',
                  borderRadius: '5px',
                  border: '1px solid #dbdbdb',
                  overflow: 'hidden'
                }}>
                  <input
                    type="text"
                    value={schoolEmail}
                    onChange={handleEmailChange}
                    placeholder="학교 이메일"
                    className={`${styles.input} ${styles.emailLocal}`}
                    required
                    disabled={isVerified}
                    title="영문 및 숫자만 입력할 수 있습니다. 한글 키보드로 입력하면 경고가 표시됩니다."
                  />
                  <span className={styles.emailDomain}>@sunchang.hs.kr</span>
                </div>

                <div style={{ 
                  fontSize: '12px', 
                  color: '#888', 
                  marginTop: '4px' 
                }}>
                  ※ 영문 및 숫자만 입력 가능합니다.
                </div>
              </div>
              
              {!codeSent && !isVerified && (
                <button 
                  type="submit"
                  className={`${styles.loginButton} ${schoolEmail ? styles.active : ''}`}
                  disabled={isLoading || !schoolEmail}
                >
                  {isLoading ? (
                    <div className={styles.loadingSpinner}>
                      <div className={styles.spinner} style={{borderTopColor: '#000'}}></div>
                      전송 중...
                    </div>
                  ) : (
                    "인증 코드 전송"
                  )}
                </button>
              )}
              
              {(codeSent || isVerified) && (
                <>
                  <div className={styles.inputGroup}>
                    <div className={styles.verificationCodeContainer}>
                      {codeDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={codeInputRefs[index]}
                          type="text"
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) => handleCodeDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          onPaste={index === 0 ? handleCodePaste : null}
                          maxLength={1}
                          className={`
                            ${styles.verificationCodeInput} 
                            ${digit ? styles.filled : ''} 
                            ${shakeIndexes[index] ? styles.shake : ''}

                          `}
                          disabled={isVerified || isLoading}
                          autoFocus={index === 0 && !isVerified}
                        />
                      ))}
                    </div>

                    <div className={styles.resendCodeContainer}>
                      <button 
                        type="button" 
                        onClick={handleResendCode}
                        className={styles.resendCodeButton}
                      >
                        인증 코드 재전송
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {isVerified && (
                <div className={styles.successMessage}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#4CAF50">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  이메일 인증 완료
                </div>
              )}
              
              {/* "다음 단계" 버튼 제거 - 자동으로 넘어가도록 수정 */}
              
              {registerError && (
                <div className={styles.errorMessage}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ed4956">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  {registerError}
                </div>
              )}
            </form>
          )}
          
          {/* 단계 2: 학적 정보 입력 */}
          {currentStep === 2 && (
            <form className={styles.loginForm} onSubmit={handleNextStep}>
        
              
              {/* 학생증/교사증 미리보기 - 먼저 표시 */}
              <div className={styles.studentCardPreview} style={{marginBottom:'5px'}}>
                <div className={styles.studentCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.schoolHeader}>
                      <div className={styles.schoolLogo}>SC</div>
                      <div className={styles.cardTitle}>
                        <h4>순창고등학교</h4>
                        <span>SUNCHANG HIGH SCHOOL</span>
                      </div>
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
                        <span className={styles.value}>{studentName || '이름을 입력하세요'}</span>
                      </div>
                      {userRole === "student" ? (
                        <div className={styles.infoRow}>
                          <span className={styles.label}>학적</span>
                          <span className={styles.value}>
                            {grade && classNum && studentNum 
                              ? `${grade}학년 ${classNum}반 ${studentNum}번` 
                              : '학적 정보를 입력하세요'}
                          </span>
                        </div>
                      ) : (
                        <div className={styles.infoRow}>
                          <span className={styles.label}>구분</span>
                          <span className={styles.value}>교사</span>
                        </div>
                      )}
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
                    <div className={styles.cardType}>
                      {userRole === "student" ? "전자학생증" : "교직원증"}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 정보 입력 - 학생증/교사증 아래에 위치 */}
              <div className={styles.studentInfoContainer} style={{marginTop:'0px', marginBottom:'5px'}}>
                <div className={styles.formGroup}>
                  <label htmlFor="studentName">이름</label>
                  <input 
                    id="studentName"
                    type="text" 
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="이름"
                    className={styles.input}
                    style={{width: '334px'}}
                    required
                  />
                </div>
                
                {/* 학생인 경우에만 학년, 반, 번호 필드 표시 */}
                {userRole === "student" && (
                  <div className={styles.studentInfoGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="grade">학년</label>
                      <input 
                        id="grade"
                        type="number" 
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="학년"
                        className={styles.input}
                        min="1"
                        max="3"
                        required
                        readOnly={userRole === "student"} // 학생은 학년을 수정할 수 없음
                        style={{
                          backgroundColor: userRole === "student" ? '#f0f0f0' : 'white',
                          cursor: userRole === "student" ? 'not-allowed' : 'text'
                        }}
                      />

                    </div>
                    
                    <div className={styles.formGroup}>
                      <label htmlFor="classNum">반</label>
                      <input 
                        id="classNum"
                        type="number" 
                        value={classNum}
                        onChange={(e) => setClassNum(e.target.value)}
                        placeholder="반"
                        className={styles.input}
                        min="1"
                        max="20"
                        required
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label htmlFor="studentNum">번호</label>
                      <input 
                        id="studentNum"
                        type="number" 
                        value={studentNum}
                        onChange={(e) => setStudentNum(e.target.value)}
                        placeholder="번호"
                        className={styles.input}
                        min="1"
                        max="40"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {/* 교사인 경우 이름만 입력 받기 */}
                {userRole === "teacher" && (
                  <div className={styles.formGroup}>
                    <label htmlFor="teacherName">이름</label>
                    <input 
                      id="teacherName"
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="이름"
                      className={styles.input}
                      required
                    />
                  </div>
                )}
              </div>
              
              <div className={styles.buttonGroup} style={{marginTop:'0px'}}>
                <button 
                  type="button" 
                  onClick={handlePrevStep}
                  className={`${styles.navButton} ${styles.secondaryButton}`}
                  style={{width: '120px', height: '48px', margin: '0'}}
                >
                  이전
                </button>
                
                <button 
                  type="submit" 
                  className={`${styles.navButton} ${styles.loginButton} ${
                    userRole === "teacher" 
                      ? (studentName ? styles.active : '') 
                      : (grade && classNum && studentNum && studentName ? styles.active : '')
                  }`}
                  disabled={
                    userRole === "teacher" 
                      ? !studentName 
                      : (!grade || !classNum || !studentNum || !studentName)
                  }
                  style={{width: '120px', height: '48px', margin: '0'}}
                >
                  다음 단계
                </button>
              </div>
              
              {registerError && (
                <div className={styles.errorMessage}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ed4956">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  {registerError}
                </div>
              )}
            </form>
          )}
          
          {/* 단계 3: 계정 정보 입력 */}
          {currentStep === 3 && (
            <form className={styles.loginForm} onSubmit={handleRegister}>
              <div className={styles.stepTitle}>계정 정보 입력</div>
              
              {/* 가입 성공 메시지 */}
              {registrationSuccess && (
                <div className={styles.successMessage} style={{
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #a5d6a7',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#2e7d32'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#4CAF50" style={{marginRight: '8px'}}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  가입이 완료되었습니다. 로그인해주세요.
                </div>
              )}
              
              {!registrationSuccess && (
                <>
                  <div className={styles.inputGroup}>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="사용자 이름 (아이디)"
                      className={styles.input}
                      required
                      style={{width: "366px"}}
                    />
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호"
                      className={styles.input}
                      required
                      style={{width: "366px"}}
                    />
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호 확인"
                      className={styles.input}
                      required
                      style={{width: "366px"}}
                    />
                  </div>
                  
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => setPrivacyAgreed(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>개인정보 처리방침에 동의합니다</span>
                      <Link href="#" className={styles.linkText}>(보기)</Link>
                    </label>
                  </div>
                  
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>이용약관에 동의합니다</span>
                      <Link href="#" className={styles.linkText}>(보기)</Link>
                    </label>
                  </div>
                  
                  <div className={styles.buttonGroup} style={{display: 'flex', alignItems: 'center'}}>
                    <button 
                      type="button" 
                      onClick={handlePrevStep}
                      className={`${styles.navButton} ${styles.secondaryButton}`}
                      style={{width: '120px', height: '48px', margin: '0'}}
                    >
                      이전
                    </button>
                    
                    <button 
                      type="submit" 
                      className={`${styles.navButton} ${styles.loginButton} ${
                        username && password && confirmPassword && privacyAgreed && termsAgreed ? styles.active : ''
                      }`}
                      disabled={isLoading || !username || !password || !confirmPassword || !privacyAgreed || !termsAgreed}
                      style={{width: '120px', height: '48px', margin: '0'}}
                    >
                      {isLoading ? (
                        <div className={styles.loadingSpinner}>
                          <div className={styles.spinner} style={{borderTopColor: '#000'}}></div>
                          가입 중...
                        </div>
                      ) : (
                        "가입 완료"
                      )}
                    </button>
                  </div>
                </>
              )}
              
              {registerError && !registrationSuccess && (
                <div className={`${styles.errorMessage} ${registerError.includes('이미 사용 중인 이메일') ? styles.highlightedError : ''}`} 
                     style={registerError.includes('이미 사용 중인 이메일') ? {
                       backgroundColor: '#fff8f8', 
                       border: '1px solid #ffcdd2',
                       padding: '10px',
                       marginTop: '15px'
                     } : {}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={registerError.includes('이미 사용 중인 이메일') ? "#f44336" : "#ed4956"}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span style={{ marginLeft: '8px' }}>{registerError}</span>
                </div>
              )}
            </form>
          )}
          
          {/* 계정 있으신가요 부분은 1단계에서만 표시 */}
          {currentStep === 1 && (
            <>
              <div className={styles.divider}>
                <div className={styles.dividerLine}></div>
                <span className={styles.dividerText}>또는</span>
                <div className={styles.dividerLine}></div>
              </div>
              
              <div className={styles.signupContainer} style={{marginTop: '1px', border: 'none', boxShadow: 'none'}}>
                <p className={styles.signupText}>
                  계정이 있으신가요? <Link href="/" className={styles.signupLink}>로그인하기</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



