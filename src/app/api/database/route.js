import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

// 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST || '192.168.45.208',
  user: process.env.DB_USER || 'pm2',
  password: process.env.DB_PASSWORD || '2792',
  database: process.env.DB_NAME || 'sc_map',
  charset: 'utf8mb4'
};

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const spaceId = searchParams.get('spaceId');

  try {
    switch (action) {
      case 'users':
        const [users] = await pool.execute('SELECT * FROM users');
        return Response.json({ success: true, data: users });

      case 'spaces':
        const [spaces] = await pool.execute(`
          SELECT 
            id, name, description,
            coordinates_level_0_x, coordinates_level_0_y,
            coordinates_level_1_x, coordinates_level_1_y,
            coordinates_level_2_x, coordinates_level_2_y
          FROM school_spaces
        `);
        return Response.json({ success: true, data: spaces });

      case 'test':
        const [test] = await pool.execute('SELECT 1 as connected');
        return Response.json({ success: true, message: '데이터베이스 연결 성공', data: test });

      case 'reports':
        if (!spaceId) {
          return Response.json({ success: false, message: '공간 ID가 필요합니다.' }, { status: 400 });
        }
        const [reports] = await pool.execute(`
          SELECT r.*, u.name as user_name, u.type as user_type, u.grade, u.department
          FROM reports r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.space_id = ?
          ORDER BY r.created_at DESC
        `, [spaceId]);
        return Response.json({ success: true, data: reports });

      case 'likes':
        if (!spaceId) {
          return Response.json({ success: false, message: 'spaceId가 필요합니다.' }, { status: 400 });
        }
        
        const [likeRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM likes WHERE space_id = ?',
          [spaceId]
        );
        
        return Response.json({ 
          success: true, 
          data: { count: likeRows[0].count }
        });

      case 'userLike':
        const userId = searchParams.get('userId');
        
        if (!spaceId || !userId) {
          return Response.json({ success: false, message: 'spaceId와 userId가 필요합니다.' }, { status: 400 });
        }
        
        const [userLikeRows] = await pool.execute(
          'SELECT id FROM likes WHERE space_id = ? AND user_id = ?',
          [spaceId, userId]
        );
        
        return Response.json({ 
          success: true, 
          data: { liked: userLikeRows.length > 0 }
        });

      case 'commentLikes':
        const commentId = searchParams.get('commentId');
        
        if (!commentId) {
          return Response.json({ success: false, message: 'commentId가 필요합니다.' }, { status: 400 });
        }
        
        const [commentLikeRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM comment_likes WHERE report_id = ?',
          [commentId]
        );
        
        return Response.json({ 
          success: true, 
          data: { count: commentLikeRows[0].count }
        });

      case 'userCommentLike':
        const commentUserId = searchParams.get('userId');
        const reportId = searchParams.get('commentId');
        
        if (!reportId || !commentUserId) {
          return Response.json({ success: false, message: 'commentId와 userId가 필요합니다.' }, { status: 400 });
        }
        
        const [userCommentLikeRows] = await pool.execute(
          'SELECT id FROM comment_likes WHERE report_id = ? AND user_id = ?',
          [reportId, commentUserId]
        );
        
        return Response.json({ 
          success: true, 
          data: { liked: userCommentLikeRows.length > 0 }
        });

      case 'replies':
        const replyCommentId = searchParams.get('commentId');
        
        if (!replyCommentId) {
          return Response.json({ success: false, message: 'commentId가 필요합니다.' }, { status: 400 });
        }
        
        const [replies] = await pool.execute(`
          SELECT r.*, u.name as user_name, u.type as user_type, u.grade, u.department
          FROM replies r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.report_id = ?
          ORDER BY r.created_at ASC
        `, [replyCommentId]);
        
        return Response.json({ success: true, data: replies });

      case 'replyLikes':
        const replyId = searchParams.get('replyId');
        
        if (!replyId) {
          return Response.json({ success: false, message: 'replyId가 필요합니다.' }, { status: 400 });
        }
        
        const [replyLikeRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM reply_likes WHERE reply_id = ?',
          [replyId]
        );
        
        return Response.json({ 
          success: true, 
          data: { count: replyLikeRows[0].count }
        });

      case 'userReplyLike':
        const replyUserId = searchParams.get('userId');
        const userReplyId = searchParams.get('replyId');
        
        if (!userReplyId || !replyUserId) {
          return Response.json({ success: false, message: 'replyId와 userId가 필요합니다.' }, { status: 400 });
        }
        
        const [userReplyLikeRows] = await pool.execute(
          'SELECT id FROM reply_likes WHERE reply_id = ? AND user_id = ?',
          [userReplyId, replyUserId]
        );
        
        return Response.json({ 
          success: true, 
          data: { liked: userReplyLikeRows.length > 0 }
        });

      default:
        return Response.json({ success: false, message: '유효하지 않은 액션입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    return Response.json({ 
      success: false, 
      message: '데이터베이스 연결 실패', 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { action, username, password, spaceId, userId, content } = body;

  try {
    if (action === 'login') {
      // Modified login to handle bcrypt-hashed passwords
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [username]
      );
      
      if (rows.length > 0) {
        const user = rows[0];
        
        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (passwordMatch) {
          return Response.json({
            success: true,
            user: {
              id: user.id,
              name: user.name,
              type: user.type,
              isFirst: user.isFirst || 0, // Include the isFirst flag
              ...(user.type === "student" ? { 
                grade: user.grade, 
                class: user.class,
                column_name: user.column_name // Add the student number from column_name
              } : { 
                department: user.department 
              })
            }
          });
        }
      }
      
      return Response.json({
        success: false,
        message: "아이디 또는 비밀번호가 올바르지 않습니다."
      });
    } else if (action === 'register') {
      // Registration logic
      const { 
        username, 
        password, 
        studentName, 
        grade, 
        classNum, 
        studentNum, 
        schoolEmail,
        userRole
      } = body;
      
      // Determine user type based on email or provided userRole
      let type = userRole || 'student';
      
      if (!userRole && schoolEmail) {
        const emailLocalPart = schoolEmail.split('@')[0];
        type = /^\d{6}/.test(emailLocalPart) ? 'student' : 'teacher';
      }

      // Validate required fields based on role
      if (!username || !password || !studentName) {
        return Response.json({ 
          success: false, 
          message: '모든 필수 항목을 입력해주세요.' 
        }, { status: 400 });
      }
      
      // For students, validate additional required fields
      if (type === 'student' && (!grade || !classNum || !studentNum)) {
        return Response.json({ 
          success: false, 
          message: '모든 학적 정보를 입력해주세요.' 
        }, { status: 400 });
      }
      
      // Check if username already exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE id = ?',
        [username]
      );
      
      if (existingUsers.length > 0) {
        return Response.json({ 
          success: false, 
          message: '이미 사용 중인 아이디입니다.' 
        }, { status: 400 });
      }
      
      // Check if email already exists
      const [existingEmails] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [schoolEmail]
      );
      
      if (existingEmails.length > 0) {
        return Response.json({ 
          success: false, 
          message: '이미 사용 중인 이메일입니다.' 
        }, { status: 400 });
      }
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert the new user - fix the SQL syntax error (removed extra quote)
      await pool.execute(
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
          type, // Use determined type instead of hardcoded 'student'
          studentName,
          type === 'teacher' ? null : grade,
          type === 'teacher' ? null : classNum,
          schoolEmail,
          type === 'teacher' ? null : studentNum
        ]
      );
      
      return Response.json({
        success: true,
        message: '회원가입이 완료되었습니다.'
      }, { status: 201 });
    } else if (action === 'addReport') {
      if (!spaceId || !userId || !content) {
        return Response.json({ 
          success: false, 
          message: '필수 데이터가 누락되었습니다.' 
        }, { status: 400 });
      }

      const [result] = await pool.execute(
        'INSERT INTO reports (space_id, user_id, content) VALUES (?, ?, ?)',
        [spaceId, userId, content]
      );

      // 방금 추가된 댓글 정보를 가져오기
      const [newReport] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.type as user_type, u.grade, u.department
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [result.insertId]);

      return Response.json({
        success: true,
        message: '댓글이 추가되었습니다.',
        data: newReport[0]
      });
    } else if (action === 'toggleLike') {
      const { spaceId, userId } = body;
      
      if (!spaceId || !userId) {
        return Response.json({ success: false, message: 'spaceId와 userId가 필요합니다.' }, { status: 400 });
      }
      
      // Check if like already exists
      const [existingLikes] = await pool.execute(
        'SELECT id FROM likes WHERE space_id = ? AND user_id = ?',
        [spaceId, userId]
      );
      
      if (existingLikes.length > 0) {
        // Unlike - remove the like
        await pool.execute(
          'DELETE FROM likes WHERE space_id = ? AND user_id = ?',
          [spaceId, userId]
        );
        
        // Get updated count
        const [countRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM likes WHERE space_id = ?',
          [spaceId]
        );
        
        return Response.json({ 
          success: true, 
          data: { 
            liked: false, 
            count: countRows[0].count 
          }
        });
      } else {
        // Like - add the like
        await pool.execute(
          'INSERT INTO likes (space_id, user_id) VALUES (?, ?)',
          [spaceId, userId]
        );
        
        // Get updated count
        const [countRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM likes WHERE space_id = ?',
          [spaceId]
        );
        
        return Response.json({ 
          success: true, 
          data: { 
            liked: true, 
            count: countRows[0].count 
          }
        });
      }
    } else if (action === 'toggleCommentLike') {
      const { commentId, userId } = body;
      
      if (!commentId || !userId) {
        return Response.json({ success: false, message: 'commentId와 userId가 필요합니다.' }, { status: 400 });
      }
      
      // Check if like already exists
      const [existingLikes] = await pool.execute(
        'SELECT id FROM comment_likes WHERE report_id = ? AND user_id = ?',
        [commentId, userId]
      );
      
      if (existingLikes.length > 0) {
        // Unlike - remove the like
        await pool.execute(
          'DELETE FROM comment_likes WHERE report_id = ? AND user_id = ?',
          [commentId, userId]
        );
        
        // Get updated count
        const [countRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM comment_likes WHERE report_id = ?',
          [commentId]
        );
        
        return Response.json({ 
          success: true, 
          data: { 
            liked: false, 
            count: countRows[0].count 
          }
        });
      } else {
        // Like - add the like
        await pool.execute(
          'INSERT INTO comment_likes (report_id, user_id) VALUES (?, ?)',
          [commentId, userId]
        );
        
        // Get updated count
        const [countRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM comment_likes WHERE report_id = ?',
          [commentId]
        );
        
        return Response.json({ 
          success: true, 
          data: { 
            liked: true, 
            count: countRows[0].count 
          }
        });
      }
    } else if (action === 'addReply') {
      const { commentId, userId, content } = body;
      
      if (!commentId || !userId || !content) {
        return Response.json({ 
          success: false, 
          message: '필수 데이터가 누락되었습니다.' 
        }, { status: 400 });
      }

      const [result] = await pool.execute(
        'INSERT INTO replies (report_id, user_id, content) VALUES (?, ?, ?)',
        [commentId, userId, content]
      );

      // 방금 추가된 답글 정보를 가져오기
      const [newReply] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.type as user_type, u.grade, u.department
        FROM replies r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [result.insertId]);

      return Response.json({
        success: true,
        message: '답글이 추가되었습니다.',
        data: newReply[0]
      });
    } else if (action === 'toggleReplyLike') {
      const { replyId, userId } = body;
      
      if (!replyId || !userId) {
        return Response.json({ success: false, message: 'replyId와 userId가 필요합니다.' }, { status: 400 });
      }
      
      // Check if like already exists
      const [existingLikes] = await pool.execute(
        'SELECT id FROM reply_likes WHERE reply_id = ? AND user_id = ?',
        [replyId, userId]
      );
      
      if (existingLikes.length > 0) {
        // Unlike - remove the like
        await pool.execute(
          'DELETE FROM reply_likes WHERE reply_id = ? AND user_id = ?',
          [replyId, userId]
        );
        
        // Get updated count
        const [countRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM reply_likes WHERE reply_id = ?',
          [replyId]
        );
        
        return Response.json({ 
          success: true, 
          data: { 
            liked: false, 
            count: countRows[0].count 
          }
        });
      } else {
        // Like - add the like
        await pool.execute(
          'INSERT INTO reply_likes (reply_id, user_id) VALUES (?, ?)',
          [replyId, userId]
        );
        
        // Get updated count
        const [countRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM reply_likes WHERE reply_id = ?',
          [replyId]
        );
        
        return Response.json({ 
          success: true, 
          data: { 
            liked: true, 
            count: countRows[0].count 
          }
        });
      }
    } else if (action === 'updateFirstTimeFlag') {
      const { userId } = body;
      
      if (!userId) {
        return Response.json({ 
          success: false, 
          message: '사용자 ID가 필요합니다.' 
        }, { status: 400 });
      }
      
      // Update the isFirst flag to 0
      await pool.execute(
        'UPDATE users SET isFirst = 0 WHERE id = ?',
        [userId]
      );
      
      return Response.json({
        success: true,
        message: '첫 방문 상태가 업데이트되었습니다.'
      });
    }

    return Response.json({ success: false, message: '유효하지 않은 액션입니다.' }, { status: 400 });
  } catch (error) {
    console.error('데이터베이스 오류:', error);
    return Response.json({
      success: false,
      message: "처리 중 오류가 발생했습니다."
    }, { status: 500 });
  }
}
