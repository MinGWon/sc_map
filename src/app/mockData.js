// 순창고등학교 커뮤니티 매핑 서비스 클라이언트 사이드 데이터 관리

// 사용자 데이터 조회 (API 호출)
export const getUsers = async () => {
  try {
    const response = await fetch('/api/database?action=users');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API 라우트가 존재하지 않거나 잘못된 응답을 반환함');
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    return [];
  }
};

// 로그인 검증 함수 (API 호출)
export const validateLogin = async (username, password) => {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'login', username, password })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      message: "로그인 처리 중 오류가 발생했습니다."
    };
  }
};

// 학교 공간 데이터 조회 (API 호출)
export const getSchoolSpaces = async () => {
  try {
    const response = await fetch('/api/database?action=spaces');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API 라우트가 존재하지 않거나 잘못된 응답을 반환함');
    }
    
    const result = await response.json();
    
    if (result.success) {
      const mappedData = result.data.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        reports: [],
        coordinates: {
          0: { x: row.coordinates_level_0_x, y: row.coordinates_level_0_y },
          1: { x: row.coordinates_level_1_x, y: row.coordinates_level_1_y },
          2: { x: row.coordinates_level_2_x, y: row.coordinates_level_2_y }
        }
      }));
      
      return mappedData;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    // 폴백 데이터 반환
    const fallbackData = [
      { 
        id: 1, 
        name: "본관 (폴백)", 
        description: "학교 본관 건물 (API 연결 실패)", 
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
        description: "학교 도서관 (API 연결 실패)", 
        reports: [],
        coordinates: {
          0: { x: 600, y: -500 },
          1: { x: 300, y: -250 },
          2: { x: 150, y: -125 }
        }
      },
      { 
        id: 3, 
        name: "체육관 (폴백)", 
        description: "실내 체육관 (API 연결 실패)", 
        reports: [],
        coordinates: {
          0: { x: 900, y: -700 },
          1: { x: 450, y: -350 },
          2: { x: 225, y: -175 }
        }
      }
    ];
    return fallbackData;
  }
};

// 데이터베이스 연결 상태 확인 (API 호출)
export const checkDatabaseConnection = async () => {
  try {
    const response = await fetch('/api/database?action=test');
    
    if (!response.ok) {
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return false;
    }
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    return false;
  }
};

// 캐시된 데이터 (초기 로드 시 사용)
let cachedUsers = [];
let cachedSchoolSpaces = [];
let isInitialized = false;

// 데이터 초기화 함수 (앱 시작 시 호출)
export const initializeData = async () => {
  if (isInitialized) {
    return;
  }

  try {
    // 데이터베이스 연결 확인 (실패해도 계속 진행)
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      cachedUsers = await getUsers();
      cachedSchoolSpaces = await getSchoolSpaces();
    } else {
      throw new Error('API 연결 실패');
    }
    
    isInitialized = true;
    
  } catch (error) {
    // 폴백으로 기본 데이터 사용
    cachedUsers = [
      { id: "20240101", password: "student123", type: "student", name: "김철수", grade: 2, class: 3 },
      { id: "T001", password: "teacher123", type: "teacher", name: "홍길동", department: "국어과" }
    ];
    cachedSchoolSpaces = [
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
      },
      { 
        id: 3, 
        name: "체육관 (폴백)", 
        description: "실내 체육관", 
        reports: [],
        coordinates: {
          0: { x: 900, y: -700 },
          1: { x: 450, y: -350 },
          2: { x: 225, y: -175 }
        }
      }
    ];
    isInitialized = true;
  }
};

// 동기식 접근을 위한 캐시된 데이터 반환 (기존 코드 호환성)
export const users = new Proxy([], {
  get(target, prop) {
    if (typeof prop === 'string' && !isNaN(prop)) {
      return cachedUsers[parseInt(prop)];
    }
    if (prop === 'length') return cachedUsers.length;
    if (prop === 'find') return cachedUsers.find.bind(cachedUsers);
    if (prop === 'filter') return cachedUsers.filter.bind(cachedUsers);
    if (prop === 'map') return cachedUsers.map.bind(cachedUsers);
    return cachedUsers[prop];
  }
});

export const schoolSpaces = new Proxy([], {
  get(target, prop) {
    if (typeof prop === 'string' && !isNaN(prop)) {
      return cachedSchoolSpaces[parseInt(prop)];
    }
    if (prop === 'length') return cachedSchoolSpaces.length;
    if (prop === 'find') return cachedSchoolSpaces.find.bind(cachedSchoolSpaces);
    if (prop === 'filter') return cachedSchoolSpaces.filter.bind(cachedSchoolSpaces);
    if (prop === 'map') return cachedSchoolSpaces.map.bind(cachedSchoolSpaces);
    return cachedSchoolSpaces[prop];
  }
});

// 데이터 새로고침 함수
export const refreshData = async () => {
  isInitialized = false;
  await initializeData();
};

// 동기식 로그인 검증 (캐시된 데이터 사용)
export const validateLoginSync = (username, password) => {
  const user = cachedUsers.find(u => u.id === username && u.password === password);
  
  if (user) {
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        type: user.type,
        ...(user.type === "student" ? { grade: user.grade, class: user.class } : { department: user.department })
      }
    };
  }
  
  return {
    success: false,
    message: "아이디 또는 비밀번호가 올바르지 않습니다."
  };
};

// 실시간 데이터 상태 확인 함수
export const getDataStatus = () => {
  return {
    isInitialized,
    usersCount: cachedUsers.length,
    spacesCount: cachedSchoolSpaces.length,
    firstSpace: cachedSchoolSpaces[0],
    allSpaces: cachedSchoolSpaces
  };
};

// 모듈 로드 시 자동 초기화 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  initializeData().catch(() => {
    // 에러 무시
  });
}

// 전역 디버깅 함수들을 window에 추가 (브라우저에서만)
if (typeof window !== 'undefined') {
  window.debugSCMap = {
    getDataStatus,
    initializeData,
    refreshData,
    checkDatabaseConnection
  };
}


// 모듈 로드 시 자동 초기화 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  console.log('🌐 브라우저 환경에서 자동 초기화 시작');
  initializeData().catch(error => {
    console.error('❌ 자동 초기화 실패:', error);
  });
} else {
  console.log('⚙️ 서버 환경 - 수동 초기화 필요');
}

// 전역 디버깅 함수들을 window에 추가 (브라우저에서만)
if (typeof window !== 'undefined') {
  window.debugSCMap = {
    getDataStatus,
    initializeData,
    refreshData,
    checkDatabaseConnection
  };
  console.log('🔧 디버깅 도구가 window.debugSCMap에 추가되었습니다.');
}

// 특정 공간의 댓글 조회
export const getReports = async (spaceId) => {
  try {
    const response = await fetch(`/api/database?action=reports&spaceId=${spaceId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('API 응답 오류');
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.map(report => ({
        id: report.id,
        text: report.content,
        author: report.user_type === "student" ? `${report.grade}학년` : 
               report.user_type === "teacher" ? "교직원" : "직원",
        timestamp: new Date(report.created_at).toLocaleString(),
        userId: report.user_id
      }));
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    return [];
  }
};

// 댓글 추가
export const addReport = async (spaceId, userId, content) => {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'addReport', 
        spaceId, 
        userId, 
        content 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        comment: {
          id: result.data.id,
          text: result.data.content,
          author: result.data.user_type === "student" ? `${result.data.grade}학년` : 
                 result.data.user_type === "teacher" ? "교직원" : "직원",
          timestamp: new Date(result.data.created_at).toLocaleString(),
          userId: result.data.user_id
        }
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    return {
      success: false,
      message: "댓글 추가 중 오류가 발생했습니다."
    };
  }
};

// Get like count for a space from database
export const getLikeCount = async (spaceId) => {
  try {
    const response = await fetch(`/api/database?action=likes&spaceId=${spaceId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.count;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error getting like count:', error);
    return 0;
  }
};

// Check if user has liked a space from database
export const hasUserLiked = async (spaceId, userId) => {
  try {
    const response = await fetch(`/api/database?action=userLike&spaceId=${spaceId}&userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.liked;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error checking user like:', error);
    return false;
  }
};

// Toggle like for a space in database
export const toggleLike = async (spaceId, userId) => {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'toggleLike', 
        spaceId, 
        userId 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        liked: result.data.liked,
        count: result.data.count
      };
    } else {
      return {
        success: false,
        liked: false,
        count: 0,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return {
      success: false,
      liked: false,
      count: 0,
      message: '좋아요 처리 중 오류가 발생했습니다.'
    };
  }
};

// Get like count for a comment from database
export const getCommentLikeCount = async (commentId) => {
  try {
    const response = await fetch(`/api/database?action=commentLikes&commentId=${commentId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.count;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error getting comment like count:', error);
    return 0;
  }
};

// Check if user has liked a comment from database
export const hasUserLikedComment = async (commentId, userId) => {
  try {
    const response = await fetch(`/api/database?action=userCommentLike&commentId=${commentId}&userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.liked;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error checking user comment like:', error);
    return false;
  }
};

// Toggle like for a comment in database
export const toggleCommentLike = async (commentId, userId) => {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'toggleCommentLike', 
        commentId, 
        userId 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        liked: result.data.liked,
        count: result.data.count
      };
    } else {
      return {
        success: false,
        liked: false,
        count: 0,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return {
      success: false,
      liked: false,
      count: 0,
      message: '댓글 좋아요 처리 중 오류가 발생했습니다.'
    };
  }
};

// Get replies for a comment from database
export const getReplies = async (commentId) => {
  try {
    const response = await fetch(`/api/database?action=replies&commentId=${commentId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.map(reply => ({
        id: reply.id,
        text: reply.content,
        author: reply.user_type === "student" ? `${reply.grade}학년` : 
               reply.user_type === "teacher" ? "교직원" : "직원",
        timestamp: new Date(reply.created_at).toLocaleString(),
        userId: reply.user_id
      }));
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error getting replies:', error);
    return [];
  }
};

// Add a reply to a comment
export const addReply = async (commentId, userId, content) => {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'addReply', 
        commentId, 
        userId, 
        content 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        reply: {
          id: result.data.id,
          text: result.data.content,
          author: result.data.user_type === "student" ? `${result.data.grade}학년` : 
                 result.data.user_type === "teacher" ? "교직원" : "직원",
          timestamp: new Date(result.data.created_at).toLocaleString(),
          userId: result.data.user_id
        }
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    return {
      success: false,
      message: "답글 추가 중 오류가 발생했습니다."
    };
  }
};

// Get like count for a reply from database
export const getReplyLikeCount = async (replyId) => {
  try {
    const response = await fetch(`/api/database?action=replyLikes&replyId=${replyId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.count;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error getting reply like count:', error);
    return 0;
  }
};

// Check if user has liked a reply from database
export const hasUserLikedReply = async (replyId, userId) => {
  try {
    const response = await fetch(`/api/database?action=userReplyLike&replyId=${replyId}&userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data.liked;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error checking user reply like:', error);
    return false;
  }
};

// Toggle like for a reply in database
export const toggleReplyLike = async (replyId, userId) => {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'toggleReplyLike', 
        replyId, 
        userId 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        liked: result.data.liked,
        count: result.data.count
      };
    } else {
      return {
        success: false,
        liked: false,
        count: 0,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Error toggling reply like:', error);
    return {
      success: false,
      liked: false,
      count: 0,
      message: '답글 좋아요 처리 중 오류가 발생했습니다.'
    };
  }
};
