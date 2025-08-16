"use client";

import { useEffect } from 'react';
import styles from './LoadingScreen.module.css';

export default function LoadingScreen({ onLoadingComplete, isRelogin = false }) {
  useEffect(() => {
    // 재로그인인 경우 더 짧은 로딩 시간
    const loadingTime = isRelogin ? 1500 : 3000;
    
    const timer = setTimeout(() => {
      if (onLoadingComplete) {
        onLoadingComplete();
      }
    }, loadingTime);

    return () => clearTimeout(timer);
  }, [onLoadingComplete, isRelogin]);

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.logoContainer}>
        <img 
          src="/logo.png" 
          alt="순창고 로고" 
          className={styles.logo}
        />
        <div className={styles.loadingBar}>
          <div className={styles.loadingProgress}></div>
        </div>
      </div>
    </div>
  );
}
