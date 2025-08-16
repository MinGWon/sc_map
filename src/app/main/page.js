"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import styles from "./main.module.css";
import { schoolSpaces, getSchoolSpaces, initializeData, getReports, addReport, getLikeCount, hasUserLiked, toggleLike, 
  getCommentLikeCount, hasUserLikedComment, toggleCommentLike, getReplies, addReply,
  getReplyLikeCount, hasUserLikedReply, toggleReplyLike } from "../mockData";
import LoadingScreen from "../components/LoadingScreen";

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [isRelogin, setIsRelogin] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapLevel, setMapLevel] = useState(2);
  const [spacesData, setSpacesData] = useState([]);
  const [spacesLoaded, setSpacesLoaded] = useState(false);
  const [commentLikes, setCommentLikes] = useState({});
  const [userCommentLikes, setUserCommentLikes] = useState({});
  const [commentReplies, setCommentReplies] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [replyLikes, setReplyLikes] = useState({});
  const [userReplyLikes, setUserReplyLikes] = useState({});
  const [showComments, setShowComments] = useState(true); // Default is comments visible
  const [commentVisibility, setCommentVisibility] = useState({}); // Store visibility by space ID
  const router = useRouter();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const customTilesetAddedRef = useRef(false);
  const markersRef = useRef([]);
  const refreshIntervalRef = useRef(null);
  const zoomLogIntervalRef = useRef(null);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userData = localStorage.getItem('user');
    const hasVisited = localStorage.getItem('hasVisited');
    
    if (userData) {
      setUser(JSON.parse(userData));
      setUserLoaded(true);
      
      // 이전에 방문한 적이 있으면 재로그인으로 처리
      if (hasVisited) {
        setIsRelogin(true);
      } else {
        localStorage.setItem('hasVisited', 'true');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // 공간 데이터 로딩
  useEffect(() => {
    const loadSpacesData = async () => {
      try {
        // 데이터 초기화
        await initializeData();
        
        // 최신 데이터 가져오기
        const spaces = await getSchoolSpaces();
        
        if (spaces && spaces.length > 0) {
          setSpacesData(spaces);
        } else {
          // 프록시를 통해 접근
          const proxySpaces = Array.from(schoolSpaces);
          setSpacesData(proxySpaces);
        }
        
        setSpacesLoaded(true);
      } catch (error) {
        // 폴백 데이터 사용
        const fallbackSpaces = [
          { 
            id: 1, 
            name: "본관 (폴백)", 
            description: "학교 본관 건물", 
            reports: [],
            coordinates: {
              0: { x: 768, y: -600 },
              1: { x: 384, y: -300 },
              2: { x: 192, y: -150 }
            }
          },
          { 
            id: 2, 
            name: "도서관 (폴백)", 
            description: "학교 도서관", 
            reports: [],
            coordinates: {
              0: { x: 600, y: -500 },
              1: { x: 300, y: -250 },
              2: { x: 150, y: -125 }
            }
          }
        ];
        setSpacesData(fallbackSpaces);
        setSpacesLoaded(true);
      }
    };

    loadSpacesData();
  }, []);

  const handleLogout = () => {
    // 마커 이벤트 리스너 정리
    markersRef.current.forEach(markerData => {
      if (markerData.cleanup) {
        markerData.cleanup();
      }
    });
    markersRef.current = [];
    
    // 지도 인스턴스 정리
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }
    
    // 상태 초기화
    setMapLoaded(false);
    setLoadingComplete(false);
    setMapError(null);
    
    // 로컬 스토리지 정리
    localStorage.removeItem('user');
    
    router.push('/');
  };

  // Handle like/unlike action with optimistic update
  const handleLikeToggle = async () => {
    if (!selectedSpace || !user) return;
    
    // Optimistic update - immediately update UI
    const currentLiked = isLiked;
    const currentCount = likesCount;
    
    // Update UI immediately
    setIsLiked(!currentLiked);
    setLikesCount(currentLiked ? currentCount - 1 : currentCount + 1);
    
    try {
      // Then send to database
      const result = await toggleLike(selectedSpace.id, user.id);
      
      // If server result differs from our optimistic update, correct it
      if (result.success) {
        if (result.liked !== !currentLiked || result.count !== (currentLiked ? currentCount - 1 : currentCount + 1)) {
          setIsLiked(result.liked);
          setLikesCount(result.count);
        }
      } else {
        // Revert on error
        console.error('Like toggle failed:', result.message);
        setIsLiked(currentLiked);
        setLikesCount(currentCount);
        
        // Optionally show error message
        alert(result.message || '좋아요 처리에 실패했습니다.');
      }
    } catch (error) {
      // Revert on exception
      console.error('Error in handleLikeToggle:', error);
      setIsLiked(currentLiked);
      setLikesCount(currentCount);
    }
  };

  // Handle comment like toggle with optimistic update
  const handleCommentLikeToggle = async (commentId) => {
    if (!user) return;
    
    // Store current state
    const currentLiked = userCommentLikes[commentId] || false;
    const currentCount = commentLikes[commentId] || 0;
    
    // Optimistic update
    setUserCommentLikes(prev => ({
      ...prev,
      [commentId]: !currentLiked
    }));
    
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: currentLiked ? currentCount - 1 : currentCount + 1
    }));
    
    try {
      // Send to server
      const result = await toggleCommentLike(commentId, user.id);
      
      // If server response differs, correct UI
      if (result.success) {
        if (result.liked !== !currentLiked || result.count !== (currentLiked ? currentCount - 1 : currentCount + 1)) {
          setUserCommentLikes(prev => ({
            ...prev,
            [commentId]: result.liked
          }));
          
          setCommentLikes(prev => ({
            ...prev,
            [commentId]: result.count
          }));
        }
      } else {
        // Revert on error
        console.error('Comment like toggle failed:', result.message);
        setUserCommentLikes(prev => ({
          ...prev,
          [commentId]: currentLiked
        }));
        
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: currentCount
        }));
      }
    } catch (error) {
      // Revert on exception
      console.error('Error in handleCommentLikeToggle:', error);
      setUserCommentLikes(prev => ({
        ...prev,
        [commentId]: currentLiked
      }));
      
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: currentCount
      }));
    }
  };

  // Handle reply like toggle with optimistic update
  const handleReplyLikeToggle = async (replyId) => {
    if (!user) return;
    
    // Store current state
    const currentLiked = userReplyLikes[replyId] || false;
    const currentCount = replyLikes[replyId] || 0;
    
    // Optimistic update
    setUserReplyLikes(prev => ({
      ...prev,
      [replyId]: !currentLiked
    }));
    
    setReplyLikes(prev => ({
      ...prev,
      [replyId]: currentLiked ? currentCount - 1 : currentCount + 1
    }));
    
    try {
      // Send to server
      const result = await toggleReplyLike(replyId, user.id);
      
      // If server response differs, correct UI
      if (result.success) {
        if (result.liked !== !currentLiked || result.count !== (currentLiked ? currentCount - 1 : currentCount + 1)) {
          setUserReplyLikes(prev => ({
            ...prev,
            [replyId]: result.liked
          }));
          
          setReplyLikes(prev => ({
            ...prev,
            [replyId]: result.count
          }));
        }
      } else {
        // Revert on error
        console.error('Reply like toggle failed:', result.message);
        setUserReplyLikes(prev => ({
          ...prev,
          [replyId]: currentLiked
        }));
        
        setReplyLikes(prev => ({
          ...prev,
          [replyId]: currentCount
        }));
      }
    } catch (error) {
      // Revert on exception
      console.error('Error in handleReplyLikeToggle:', error);
      setUserReplyLikes(prev => ({
        ...prev,
        [replyId]: currentLiked
      }));
      
      setReplyLikes(prev => ({
        ...prev,
        [replyId]: currentCount
      }));
    }
  };

  // Load initial data when first loading a space
  const loadInitialData = async (space) => {
    try {
      // Get all data in parallel
      const [reports, likeCount, userLiked] = await Promise.all([
        getReports(space.id),
        getLikeCount(space.id),
        hasUserLiked(space.id, user.id)
      ]);
      
      // Process comments
      const reportsWithRelativeTime = reports.map(comment => ({
        ...comment,
        relativeTime: getRelativeTime(comment.timestamp)
      }));
      
      setComments(reportsWithRelativeTime);
      setLikesCount(likeCount);
      setIsLiked(userLiked);
      
      // Prepare containers for comment likes and replies
      const newCommentLikes = {};
      const newUserCommentLikes = {};
      const newCommentReplies = {};
      const newReplyLikes = {};
      const newUserReplyLikes = {};
      
      // Get all comment likes and replies in parallel
      await Promise.all(reportsWithRelativeTime.map(async (comment) => {
        try {
          const [commentLikeCount, userCommentLiked, replies] = await Promise.all([
            getCommentLikeCount(comment.id),
            hasUserLikedComment(comment.id, user.id),
            getReplies(comment.id)
          ]);
          
          newCommentLikes[comment.id] = commentLikeCount;
          newUserCommentLikes[comment.id] = userCommentLiked;
          
          // Process reply timestamps
          const repliesWithRelativeTime = replies.map(reply => ({
            ...reply,
            relativeTime: getRelativeTime(reply.timestamp)
          }));
          
          // Get all reply likes in parallel
          await Promise.all(repliesWithRelativeTime.map(async (reply) => {
            try {
              const [replyLikeCount, userReplyLiked] = await Promise.all([
                getReplyLikeCount(reply.id),
                hasUserLikedReply(reply.id, user.id)
              ]);
              
              newReplyLikes[reply.id] = replyLikeCount;
              newUserReplyLikes[reply.id] = userReplyLiked;
            } catch (error) {
              console.error(`Error loading likes for reply ${reply.id}:`, error);
              newReplyLikes[reply.id] = 0;
              newUserReplyLikes[reply.id] = false;
            }
          }));
          
          newCommentReplies[comment.id] = repliesWithRelativeTime;
        } catch (error) {
          console.error(`Error loading data for comment ${comment.id}:`, error);
          newCommentLikes[comment.id] = 0;
          newUserCommentLikes[comment.id] = false;
          newCommentReplies[comment.id] = [];
        }
      }));
      
      // Update all states with the full data
      setCommentLikes(newCommentLikes);
      setUserCommentLikes(newUserCommentLikes);
      setCommentReplies(newCommentReplies);
      setReplyLikes(newReplyLikes);
      setUserReplyLikes(newUserReplyLikes);
      
      return true;
    } catch (error) {
      console.error('Error loading initial data:', error);
      return false;
    }
  };

  const handleSpaceClick = async (space) => {
    // Remove "!" and "^" from space name for display
    let displayName = space.name;
    if (displayName.startsWith('!')) {
      displayName = displayName.substring(1);
    }
    if (displayName.endsWith('^')) {
      displayName = displayName.slice(0, -1);
    }
    
    const displaySpace = {
      ...space,
      name: displayName,
      commentsDisabled: space.name.endsWith('^') // 댓글 비활성화 여부 추가
    };
    
    setSelectedSpace(displaySpace);
    
    // Make sure comments are visible by default for newly selected spaces
    setCommentVisibility(prev => ({
      ...prev,
      [space.id]: true // Set to visible by default when selecting a new space
    }));
    
    // Update marker states
    markersRef.current.forEach(markerData => {
      const markerElement = markerData.element;
      if (markerData.space.id === space.id) {
        markerElement.classList.add(styles.activeMarker);
      } else {
        markerElement.classList.remove(styles.activeMarker);
      }
    });
    
    // 댓글이 비활성화되지 않은 경우에만 댓글 로드
    if (!displaySpace.commentsDisabled) {
      // Load all data at once with the new function
      await loadInitialData(space);
    } else {
      // 댓글이 비활성된 경우 빈 배열로 설정
      setComments([]);
      setCommentLikes({});
      setUserCommentLikes({});
      setCommentReplies({});
      setReplyLikes({});
      setUserReplyLikes({});
      
      // Still get the like count for the space
      try {
        const [likeCount, userLiked] = await Promise.all([
          getLikeCount(space.id),
          hasUserLiked(space.id, user.id)
        ]);
        
        setLikesCount(likeCount);
        setIsLiked(userLiked);
      } catch (error) {
        console.error('Error loading like data:', error);
        setLikesCount(0);
        setIsLiked(false);
      }
    }
  };

  // Toggle comments visibility for the current space
  const handleCommentsToggle = () => {
    if (!selectedSpace) return;
    
    // Don't allow toggling for spaces where comments are disabled
    if (selectedSpace.commentsDisabled) return;
    
    setCommentVisibility(prev => ({
      ...prev,
      [selectedSpace.id]: !(prev[selectedSpace.id] ?? true) // Default is visible (true)
    }));
  };

  // Data refresh function - implement the missing function
  const refreshData = async () => {
    try {
      // Only refresh data if a space is selected
      if (selectedSpace) {
        // Get updated comments with relative time
        const reports = await getReports(selectedSpace.id);
        const reportsWithRelativeTime = reports.map(comment => ({
          ...comment,
          relativeTime: getRelativeTime(comment.timestamp)
        }));
        setComments(reportsWithRelativeTime);

        // Get updated space like information
        const [likeCount, userLiked] = await Promise.all([
          getLikeCount(selectedSpace.id),
          hasUserLiked(selectedSpace.id, user.id)
        ]);
        setLikesCount(likeCount);
        setIsLiked(userLiked);

        // Get updated comment likes and replies
        const newCommentLikes = {};
        const newUserCommentLikes = {};
        const newCommentReplies = {};
        const newReplyLikes = {};
        const newUserReplyLikes = {};
        
        await Promise.all(reportsWithRelativeTime.map(async (comment) => {
          try {
            // Get comment likes and replies
            const [commentLikeCount, userCommentLiked, replies] = await Promise.all([
              getCommentLikeCount(comment.id),
              hasUserLikedComment(comment.id, user.id),
              getReplies(comment.id)
            ]);
            
            newCommentLikes[comment.id] = commentLikeCount;
            newUserCommentLikes[comment.id] = userCommentLiked;
            
            // Process replies with relative time
            const repliesWithRelativeTime = replies.map(reply => ({
              ...reply,
              relativeTime: getRelativeTime(reply.timestamp)
            }));
            
            // Get reply likes
            await Promise.all(repliesWithRelativeTime.map(async (reply) => {
              try {
                const [replyLikeCount, userReplyLiked] = await Promise.all([
                  getReplyLikeCount(reply.id),
                  hasUserLikedReply(reply.id, user.id)
                ]);
                
                newReplyLikes[reply.id] = replyLikeCount;
                newUserReplyLikes[reply.id] = userReplyLiked;
              } catch (error) {
                console.error(`Error refreshing likes for reply ${reply.id}:`, error);
              }
            }));
            
            newCommentReplies[comment.id] = repliesWithRelativeTime;
          } catch (error) {
            console.error(`Error refreshing data for comment ${comment.id}:`, error);
          }
        }));
        
        // Update all states with the refreshed data
        setCommentLikes(newCommentLikes);
        setUserCommentLikes(newUserCommentLikes);
        setCommentReplies(newCommentReplies);
        setReplyLikes(newReplyLikes);
        setUserReplyLikes(newUserReplyLikes);
      }
      
      // Refresh spaces data
      const spaces = await getSchoolSpaces();
      if (spaces && spaces.length > 0) {
        setSpacesData(spaces);
      }
    } catch (error) {
      console.error('데이터 새로고침 실패:', error);
    }
  };

  // 5초마다 데이터 새로고침을 15초로 변경
  useEffect(() => {
    // 초기 로딩이 완료된 후에만 새로고침 시작
    if (loadingComplete && spacesLoaded) {
      refreshIntervalRef.current = setInterval(refreshData, 15000); // 15초마다 새로고침
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [loadingComplete, spacesLoaded, selectedSpace]);

  // 1초마다 확대 레벨 콘솔 출력
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current) {
      zoomLogIntervalRef.current = setInterval(() => {
        const currentLevel = mapInstanceRef.current.getLevel();
        console.log(`현재 지도 확대 레벨: ${currentLevel}`);
      }, 1000);
    }

    return () => {
      if (zoomLogIntervalRef.current) {
        clearInterval(zoomLogIntervalRef.current);
        zoomLogIntervalRef.current = null;
      }
    };
  }, [mapLoaded]);

  const getAnonymousName = (user) => {
    if (user.type === "student") {
      return `@${user.grade}학년 재학생`;
    } else if (user.type === "teacher") {
      return `@교직원`;
    } else if (user.type === "staff") {
      return `@직원`;
    }
    return "@사용자";
  };

  const getRelativeTime = (timestamp) => {
    try {
      console.log('getRelativeTime 호출 - 원본 timestamp:', timestamp, typeof timestamp);
      
      const now = new Date();
      let commentTime;
      
      // 간단한 방식으로 처리
      if (typeof timestamp === 'string') {
        commentTime = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        commentTime = new Date(timestamp);
      } else {
        console.log('알 수 없는 timestamp 형식:', timestamp);
        return "방금 전";
      }
      
      // 유효하지 않은 날짜 처리
      if (isNaN(commentTime.getTime())) {
        console.log('유효하지 않은 날짜:', timestamp);
        return "방금 전";
      }
      
      const diffInSeconds = Math.floor((now - commentTime) / 1000);
      
      // 자세한 디버그 출력
      console.log('=== 시간 계산 디버그 ===');
      console.log('원본 timestamp:', timestamp);
      console.log('파싱된 commentTime:', commentTime.toISOString());
      console.log('현재 시간:', now.toISOString());
      console.log('시간 차이 (초):', diffInSeconds);
      console.log('=========================');
      
      // 음수이거나 비정상적으로 큰 값 처리
      if (diffInSeconds < 0) {
        console.log('음수 시간 차이, 방금 전으로 처리');
        return "방금 전";
      }
      
      if (diffInSeconds < 60) {
        return diffInSeconds === 0 ? "방금 전" : `${diffInSeconds}초전`;
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}분전`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}시간전`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}일전`;
      } else if (diffInSeconds < 2629746) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks}주전`;
      } else if (diffInSeconds < 31556952) {
        const months = Math.floor(diffInSeconds / 2629746);
        return `${months}달전`;
      } else {
        const years = Math.floor(diffInSeconds / 31556952);
        return `${years}년전`;
      }
    } catch (error) {
      console.error('Error parsing timestamp:', timestamp, error);
      return "방금 전";
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (newComment.trim() && selectedSpace && user) {
      try {
        const result = await addReport(selectedSpace.id, user.id, newComment.trim());
        
        if (result.success) {
          // 새 댓글에도 상대 시간 미리 계산
          const newCommentWithRelativeTime = {
            ...result.comment,
            relativeTime: getRelativeTime(result.comment.timestamp)
          };
          
          // 새 댓글을 배열 맨 앞에 추가 (맨 위에 표시)
          setComments([newCommentWithRelativeTime, ...comments]);
          setNewComment("");
        } else {
          alert(result.message || '댓글 추가에 실패했습니다.');
        }
      } catch (error) {
        alert('댓글 추가 중 오류가 발생했습니다.');
      }
    }
  };

  // 답글 폼 열기
  const handleReplyClick = (commentId) => {
    setReplyingTo(commentId);
    setNewReply("");
  };

  // 답글 폼 닫기
  const handleCancelReply = () => {
    setReplyingTo(null);
    setNewReply("");
  };

  // 답글 제출
  const handleReplySubmit = async (commentId) => {
    if (!newReply.trim() || !user) return;
    
    try {
      const result = await addReply(commentId, user.id, newReply.trim());
      
      if (result.success) {
        // 새 답글에 상대 시간 추가
        const replyWithRelativeTime = {
          ...result.reply,
          relativeTime: getRelativeTime(result.reply.timestamp)
        };
        
        // 기존 답글 배열에 새 답글 추가
        setCommentReplies(prev => ({
          ...prev,
          [commentId]: [...(prev[commentId] || []), replyWithRelativeTime]
        }));
        
        // 답글 폼 닫기
        setReplyingTo(null);
        setNewReply("");
      } else {
        alert(result.message || '답글 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('답글 추가 중 오류가 발생했습니다.');
    }
  };

  // 패널 닫기 시 답글 입력 상태 초기화
  const closePanel = () => {
    setSelectedSpace(null);
    setComments([]);
    setReplyingTo(null);
    setNewReply("");
    
    // Reset all marker states
    markersRef.current.forEach(markerData => {
      markerData.element.classList.remove(styles.activeMarker);
    });
  };

  const initializeMap = () => {
    if (!window.kakao || !window.kakao.maps) {
      setMapError('카카오 지도 API 로딩 실패');
      return;
    }
    
    if (!mapRef.current) {
      setMapError('지도 컨테이너 준비 실패');
      return;
    }
    
    if (mapInstanceRef.current) {
      return;
    }

    if (!spacesLoaded || spacesData.length === 0) {
      return;
    }
    
    try {
      // 커스텀 타일셋이 아직 추가되지 않았을 때만 추가
      if (!customTilesetAddedRef.current) {
        // 커스텀 타일셋 함수 정의
        const customTileFunction = function(x, y, z) {
          y = -y - 1;
          
          let limit;
          if (z === 0) limit = 4;      // 4×4 grid
          else if (z === 1) limit = 2; // 2×2 grid  
          else if (z === 2) limit = 1; // 1×1 grid
          else {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 1024, 1024);
            return canvas.toDataURL();
          }
          
          if (0 <= y && y < limit && 0 <= x && x < limit) {
            return `/split_map/${z}_${y}_${x}.png`;
          } else {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 1024, 1024);
            return canvas.toDataURL();
          }
        };

        try {
          // 커스텀 타일셋 추가
          window.kakao.maps.Tileset.add('CUSTOM_MAP',
            new window.kakao.maps.Tileset(
              1024, 1024, customTileFunction, '', false, 0, 2
            )
          );
          
          customTilesetAddedRef.current = true;
        } catch (tilesetError) {
          customTilesetAddedRef.current = true; // 이미 존재한다고 가정
        }
      }

      const container = mapRef.current;
      
      // 컨테이너 초기화
      container.innerHTML = '';
      
      const options = {
        projectionId: null,
        mapTypeId: window.kakao.maps.MapTypeId.CUSTOM_MAP,
        $scale: false,
        center: new window.kakao.maps.Coords(1800, -1615),
        level: mapLevel,
        scrollwheel: true,
        disableDoubleClick: false,
        disableDoubleClickZoom: false
      };
      
      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;
      
      // 지도 컨테이너에 이벤트 리스너 추가
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      
      container.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });
      
      container.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      }, { passive: true });
      
      // 학교 공간들에 마커 추가
      markersRef.current = []; // Reset markers array
      
      spacesData.forEach((space) => {
        createCustomMarker(space, map);
      });
      
      // 지도 로딩 완료
      setMapLoaded(true);
      setMapError(null);
      
      // 리사이즈
      const resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.relayout();
        }
      }, isRelogin ? 200 : 500);
      
      // 지도 레벨 변경 이벤트 리스너 추가
      window.kakao.maps.event.addListener(map, 'zoom_changed', function() {
        const level = map.getLevel();
        setMapLevel(level);
      });
      
      return () => {
        clearTimeout(resizeTimer);
        
        // 이벤트 리스너 정리
        window.kakao.maps.event.removeListener(map, 'zoom_changed');
        window.kakao.maps.event.removeListener(map, 'center_changed');
        window.kakao.maps.event.removeListener(map, 'bounds_changed');
      };
      
    } catch (error) {
      setMapError(`지도 초기화 실패: ${error.message}`);
    }
  };

  const createCustomMarker = (space, map) => {
    // Check if space name starts with "!" for label positioning
    const hasExclamation = space.name.startsWith('!');
    
    // Remove "!" and "^" from display name
    let displayName = space.name;
    if (hasExclamation) {
      displayName = displayName.substring(1);
    }
    if (displayName.endsWith('^')) {
      displayName = displayName.slice(0, -1);
    }
    
    // Create custom marker element
    const markerElement = document.createElement('div');
    markerElement.className = styles.customMarker;
    
    // Create marker structure based on label position
    if (hasExclamation) {
      // Label above marker with flipped label pointer
      markerElement.innerHTML = `
        <div class="${styles.markerLabel} ${styles.markerLabelFlipped}">${displayName}</div>
        <div class="${styles.markerIcon}">
          <div class="${styles.markerDot}"></div>
          <div class="${styles.markerPulse}"></div>
        </div>
      `;
    } else {
      // Label below marker (default)
      markerElement.innerHTML = `
        <div class="${styles.markerIcon}">
          <div class="${styles.markerDot}"></div>
          <div class="${styles.markerPulse}"></div>
        </div>
        <div class="${styles.markerLabel}">${displayName}</div>
      `;
    }

    // Set absolute positioning to prevent layout shifts
    markerElement.style.position = 'absolute';
    markerElement.style.transformOrigin = 'center bottom';

    // Function to calculate marker scale based on zoom level
    const getMarkerScale = (level) => {
      // Level 0 (most zoomed in) = 1.8x scale
      // Level 1 = 1.5x scale
      // Level 2 (most zoomed out) = 1.2x scale
      const scaleMap = {
        0: 1.8,  // 가장 확대된 상태 - 마커 1.8배
        1: 1.1,  // 중간 상태 - 마커 1.5배
        2: 0.9   // 가장 축소된 상태 - 마커 1.2배
      };
      return scaleMap[level] || 1.0;
    };

    // Function to update marker scale
    const updateMarkerScale = () => {
      const currentLevel = map.getLevel();
      const scale = getMarkerScale(currentLevel);
      
      console.log(`마커 스케일 업데이트: 레벨 ${currentLevel}, 스케일 ${scale}`);
      
      // Apply transform with translation and scale
      markerElement.style.transform = `translate(-50%, -100%) scale(${scale})`;
    };

    // Apply initial scale with explicit transform
    const initialLevel = map.getLevel();
    const initialScale = getMarkerScale(initialLevel);
    markerElement.style.transform = `translate(-50%, -100%) scale(${initialScale})`;
    
    console.log(`마커 초기 스케일: 레벨 ${initialLevel}, 스케일 ${initialScale}`);

    // Get position from manual coordinates based on current map level
    const getPositionForLevel = (level) => {
      const coords = space.coordinates[level];
      if (!coords) {
        // Fallback to level 1 coordinates if level not found
        const fallbackCoords = space.coordinates[1] || space.coordinates[0];
        return new window.kakao.maps.Coords(fallbackCoords.x, fallbackCoords.y);
      }
      return new window.kakao.maps.Coords(coords.x, coords.y);
    };

    // Initial position
    let currentPosition = getPositionForLevel(mapLevel);

    // Create custom overlay with strict positioning
    const customOverlay = new window.kakao.maps.CustomOverlay({
      position: currentPosition,
      content: markerElement,
      xAnchor: 0,
      yAnchor: 0,
      zIndex: 3
    });

    customOverlay.setMap(map);

    // Update marker position and scale based on zoom level using manual coordinates
    const updateMarkerPosition = () => {
      const currentLevel = map.getLevel();
      currentPosition = getPositionForLevel(currentLevel);
      customOverlay.setPosition(currentPosition);
      updateMarkerScale(); // Update scale when zoom changes
    };

    // Add map event listeners to maintain position and scale
    window.kakao.maps.event.addListener(map, 'zoom_changed', updateMarkerPosition);

    // Store marker reference with cleanup function
    markersRef.current.push({ 
      element: markerElement, 
      space: space, 
      overlay: customOverlay,
      updatePosition: updateMarkerPosition,
      updateScale: updateMarkerScale,
      cleanup: () => {
        window.kakao.maps.event.removeListener(map, 'zoom_changed', updateMarkerPosition);
      }
    });

    // Add click event
    markerElement.addEventListener('click', () => {
      handleSpaceClick(space);
    });

    // Add hover effects
    markerElement.addEventListener('mouseenter', () => {
      markerElement.classList.add(styles.markerHover);
    });

    markerElement.addEventListener('mouseleave', () => {
      markerElement.classList.remove(styles.markerHover);
    });

    return customOverlay;
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 새로고침 인터벌 정리
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // 줌 레벨 로그 인터벌 정리
      if (zoomLogIntervalRef.current) {
        clearInterval(zoomLogIntervalRef.current);
      }
      
      // 마커 이벤트 리스너 정리
      markersRef.current.forEach(markerData => {
        if (markerData.cleanup) {
          markerData.cleanup();
        }
      });
      markersRef.current = [];

      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 로딩 완료 후 지도 초기화 - spacesLoaded 조건 추가
  useEffect(() => {
    if (scriptLoaded && userLoaded && spacesLoaded && loadingComplete && !mapInstanceRef.current) {
      // 재로그인인 경우 더 짧은 지연시간
      const initDelay = isRelogin ? 100 : 200;
      
      const timer = setTimeout(() => {
        let attempts = 0;
        const maxAttempts = 20;
        
        const tryInitialize = () => {
          attempts++;
          
          if (mapRef.current && 
              mapRef.current.offsetWidth > 0 && 
              mapRef.current.offsetHeight > 0 &&
              window.kakao && 
              window.kakao.maps &&
              spacesData.length > 0) {
            initializeMap();
          } else if (attempts < maxAttempts) {
            setTimeout(tryInitialize, 200);
          } else {
            setMapError('지도 컨테이너 초기화 실패');
          }
        };
        
        tryInitialize();
      }, initDelay);
      
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, userLoaded, spacesLoaded, loadingComplete, isRelogin, spacesData.length]);

  // 스크립트 로딩 상태 확인 (재로그인 시)
  useEffect(() => {
    if (isRelogin && window.kakao && window.kakao.maps && !scriptLoaded) {
      setScriptLoaded(true);
    }
  }, [isRelogin, scriptLoaded]);

  const handleMapLevelChange = (newLevel) => {
    setMapLevel(newLevel);
    
    if (mapInstanceRef.current) {
      // 카카오 지도의 부드러운 줌 애니메이션 사용
      const currentCenter = mapInstanceRef.current.getCenter();
      
      // 애니메이션과 함께 레벨 변경
      mapInstanceRef.current.setLevel(newLevel, {
        animate: {
          duration: 300, // 300ms 애니메이션
          easing: 'ease-out'
        }
      });
      
      // Update all marker positions and scales after zoom
      setTimeout(() => {
        markersRef.current.forEach(markerData => {
          if (markerData.updatePosition) {
            markerData.updatePosition();
          }
          if (markerData.updateScale) {
            markerData.updateScale();
          }
        });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(currentCenter);
        }
      }, 50);
    }
  };

  // 로딩 스크린 표시 조건 - spacesLoaded 추가
  if (!user || !userLoaded || !spacesLoaded || !loadingComplete) {
    return (
      <LoadingScreen 
        isRelogin={isRelogin}
        onLoadingComplete={() => {
          setLoadingComplete(true);
        }}
      />
    );
  }

  return (
    <>
      <Script
        src="//dapi.kakao.com/v2/maps/sdk.js?appkey=c8361c0862be76a247fee56467340c21&autoload=false"
        onLoad={() => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              setScriptLoaded(true);
            });
          } else {
            setMapError('카카오 지도 스크립트 로딩 실패');
          }
        }}
        onError={(e) => {
          setMapError('카카오 지도 스크립트 로딩 에러');
        }}
      />
      
      <div className={styles.mainPage}>
        <div className={styles.headerLeft}>
          <h1>순창고등학교</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span>{user.name}님 환영합니다</span>
            <button onClick={handleLogout} className={styles.logoutButton}>로그아웃</button>
          </div>
        </div>

        {/* 지도 레벨 컨트롤 - 왼쪽 배치 */}
        <div className={styles.mapLevelControl}>
          <div className={styles.mapControls}>
            <label className={styles.sliderLabel}>확대/축소 (마우스휠)</label>
            <div className={styles.sliderContainer}>
              <span className={styles.levelLabel}>
                ✚
              </span>
              <input
                type="range"
                min="0"
                max="2"
                value={mapLevel}
                onChange={(e) => handleMapLevelChange(parseInt(e.target.value))}
                className={styles.levelSlider}
              />
              <span className={styles.levelLabel} style={{fontWeight: 950}}>━	</span>
            </div>
          </div>
        </div>

        {/* 공간 정보 패널 */}
        {selectedSpace && (
          <div className={styles.spacePanel}>
            <div className={styles.panelHeader}>
              <div className={styles.profileInfo}>
                <div className={styles.profileImage}>
                  <div className={styles.profileAvatar}>🏫</div>
                </div>
                <div className={styles.profileDetails}>
                  <div className={styles.username}>{selectedSpace.name}</div>
                  <div className={styles.location}>순창고등학교</div>
                </div>
              </div>
              <button onClick={closePanel} className={styles.closeButton}>×</button>
            </div>
            <div className={styles.panelContent}>
              {/* Instagram-style post image */}
              <div className={styles.postImage}>
                <img 
                  src={`/${selectedSpace.id}.jpg`} 
                  alt={selectedSpace.name}
                  onLoad={(e) => {
                    console.log('Image loaded successfully:', e.target.src);
                    e.target.style.display = 'block';
                    e.target.nextSibling.style.display = 'none';
                  }}
                  onError={(e) => {
                    console.log('Image failed to load:', e.target.src);
                    console.log('Selected space ID:', selectedSpace.id);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                  style={{ display: 'block' }}
                />
                <div className={styles.imagePlaceholder} style={{display: 'none'}}>
                  <div className={styles.placeholderIcon}>📷</div>
                  <div className={styles.placeholderText}>사진 없음</div>
                  <div style={{fontSize: '12px', marginTop: '8px', color: '#666'}}>
                    시도한 경로: /{selectedSpace.id}.jpg
                  </div>
                </div>
              </div>

              {/* Instagram-style action buttons */}
              <div className={styles.postActions}>
                <div className={styles.actionButtons}>
                  <button 
                    className={styles.actionButton}
                    onClick={handleLikeToggle}
                  >
                    <span className={`${styles.heartIcon} ${isLiked ? styles.heartLiked : ''}`}>
                      {isLiked ? '❤️' : '♡'}
                    </span>
                  </button>
                  <button 
                    className={styles.actionButton}
                    onClick={handleCommentsToggle}
                  >
                    <span className={styles.commentIcon}>
                      {/* Instagram-style comment icon */}
                      <svg 
                        aria-label="댓글" 
                        className={`${styles.commentSvg} ${(commentVisibility[selectedSpace?.id] ?? true) ? styles.commentActive : ''}`}
                        height="24" 
                        width="24" 
                        viewBox="0 0 24 24"
                        fill={(commentVisibility[selectedSpace?.id] ?? true) ? "#262626" : "none"}
                        stroke={(commentVisibility[selectedSpace?.id] ?? true) ? "none" : "currentColor"}
                        strokeWidth="2"
                      >
                        <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {/* Instagram-style likes section */}
              <div className={styles.likesSection}>
                <div className={styles.likesCount}>좋아요 {likesCount}개</div>
              </div>

              {/* Instagram-style post content */}
              <div className={styles.postContent}>
                <div className={styles.postCaption}>
                  <span className={styles.postUsername}>{selectedSpace.name}</span>
                  <span className={styles.postText}>{selectedSpace.description}</span>
                </div>
                <div className={styles.postMeta}>
                  <span className={styles.postTime}>1시간 전</span>
                </div>
              </div>

              {/* Instagram-style comments section */}
              {selectedSpace && (
                <div className={styles.commentsSection}>
                  {selectedSpace.commentsDisabled ? (
                    // Always show this message for spaces where comments are disabled
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#666',
                      fontSize: '14px'
                    }}>
                      이 공간은 댓글을 작성할 수 없습니다.
                    </div>
                  ) : (
                    // For spaces where comments are enabled, show/hide based on toggle state
                    <div style={{ 
                      display: (commentVisibility[selectedSpace.id] ?? true) ? 'block' : 'none' 
                    }}>
                      {/* Comments header with count */}
                      <div style={{
                        padding: '4px 16px 3px 16px',
                        color: '#8e8e8e',
                        fontSize: '14px',
                        fontWeight: '600',
                        borderBottom: '1px solid #efefef'
                      }}>
                        댓글 ({comments.length})
                      </div>

                      {/* Comments list */}
                      <div className={styles.commentsList}>
                        {comments.map(comment => (
                          <div key={comment.id} className={styles.comment}>
                            <div className={styles.commentContent}>
                              <span className={styles.commentUsername}>{comment.author}</span>
                              <span className={styles.commentText}>{comment.text}</span>
                            </div>
                            <div className={styles.commentMeta}>
                              <span className={styles.commentTime}>{comment.relativeTime}</span>
                              <button 
                                className={`${styles.commentLike} ${userCommentLikes[comment.id] ? styles.commentLikeActive : ''}`}
                                onClick={() => handleCommentLikeToggle(comment.id)}
                              >
                                {userCommentLikes[comment.id] ? '❤️' : '좋아요'} {commentLikes[comment.id] > 0 && `(${commentLikes[comment.id]})`}
                              </button>
                              <button 
                                className={styles.commentReply}
                                onClick={() => handleReplyClick(comment.id)}
                              >
                                답글 달기
                              </button>
                            </div>
                            
                            {/* 답글 섹션 */}
                            {(commentReplies[comment.id]?.length > 0 || replyingTo === comment.id) && (
                              <div className={styles.repliesSection}>
                                {/* 기존 답글 표시 */}
                                {commentReplies[comment.id]?.map(reply => (
                                  <div key={reply.id} className={styles.reply}>
                                    <div className={styles.replyContent}>
                                      <span className={styles.replyUsername}>{reply.author}</span>
                                      <span className={styles.replyText}>{reply.text}</span>
                                    </div>
                                    <div className={styles.replyMeta}>
                                      <span className={styles.replyTime}>{reply.relativeTime}</span>
                                      <button 
                                        className={`${styles.replyLike} ${userReplyLikes[reply.id] ? styles.replyLikeActive : ''}`}
                                        onClick={() => handleReplyLikeToggle(reply.id)}
                                      >
                                        {userReplyLikes[reply.id] ? '❤️' : '좋아요'} {replyLikes[reply.id] > 0 && `(${replyLikes[reply.id]})`}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* 답글 작성 폼 */}
                                {replyingTo === comment.id && (
                                  <div className={styles.replyForm}>
                                    <div className={styles.replyInputContainer}>
                                      <textarea
                                        value={newReply}
                                        onChange={(e) => {
                                          setNewReply(e.target.value);
                                          e.target.style.height = 'auto';
                                          const scrollHeight = e.target.scrollHeight;
                                          const maxHeight = 100;
                                          e.target.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                                          if (scrollHeight > maxHeight) {
                                            e.target.style.overflowY = 'auto';
                                          } else {
                                            e.target.style.overflowY = 'hidden';
                                          }
                                        }}
                                        placeholder={`${comment.author}님에게 답글 작성...`}
                                        className={styles.replyInput}
                                        rows="1"
                                        style={{ 
                                          minHeight: '18px',
                                          height: '18px',
                                          resize: 'none',
                                          overflow: 'hidden'
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (newReply.trim()) {
                                              handleReplySubmit(comment.id);
                                            }
                                          }
                                        }}
                                      />
                                      <div className={styles.replyActions}>
                                        <button 
                                          className={styles.cancelReplyButton}
                                          onClick={handleCancelReply}
                                        >
                                          취소
                                        </button>
                                        <button 
                                          className={styles.submitReplyButton}
                                          disabled={!newReply.trim()}
                                          onClick={() => handleReplySubmit(comment.id)}
                                        >
                                          게시
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Comment form */}
                      <div className={styles.commentForm}>
                        <div className={styles.commentInputContainer}>
                          <textarea
                            value={newComment}
                            onChange={(e) => {
                              setNewComment(e.target.value);
                              // Reset height to auto to get the correct scrollHeight
                              e.target.style.height = 'auto';
                              // Calculate the content height
                              const scrollHeight = e.target.scrollHeight;
                              const maxHeight = 120;
                              // Set the height to fit content, with max limit
                              e.target.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                              // If content exceeds max height, enable scrolling
                              if (scrollHeight > maxHeight) {
                                e.target.style.overflowY = 'auto';
                              } else {
                                e.target.style.overflowY = 'hidden';
                              }
                            }}
                            placeholder="댓글 달기..."
                            className={styles.commentInput}
                            rows="1"
                            style={{ 
                              minHeight: '18px',
                              height: '18px',
                              resize: 'none',
                              overflow: 'hidden',
                              wordWrap: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (newComment.trim()) {
                                  handleCommentSubmit(e);
                                }
                              }
                            }}
                          />
                          <button 
                            type="submit" 
                            className={styles.submitButton}
                            disabled={!newComment.trim()}
                            onClick={handleCommentSubmit}
                          >
                            게시
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className={styles.mapContainer}>
          {mapError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#ff6b6b',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              zIndex: 1000
            }}>
              <h3>지도 로딩 오류</h3>
              <p>{mapError}</p>
              <button 
                onClick={() => {
                  setMapError(null);
                  setMapLoaded(false);
                  mapInstanceRef.current = null;
                  customTilesetAddedRef.current = false;
                  setTimeout(() => initializeMap(), 500);
                }}
                style={{
                  background: 'white',
                  color: '#ff6b6b',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                다시 시도
              </button>
            </div>
          )}
          
          {!mapLoaded && !mapError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '18px',
              color: '#666'
            }}>
              지도 로딩 중...
            </div>
          )}
          
          <div 
            ref={mapRef}
            id="kakao-map"
            style={{ 
              width: '100%', 
              height: '100%',
              position: 'relative',
              backgroundColor: '#f0f0f0',
              touchAction: 'none',
              userSelect: 'none',
              minHeight: '500px'
            }}
          />
        </div>
      </div>
    </>
  );
}