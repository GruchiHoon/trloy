/* =================================================
   TRLOY js/13-auth.js
   Firebase Auth — 로그인 / 로그아웃 / 세션 복원
   ================================================= */

let _auth = null;
let _db   = null;
let _currentUser = null;

/* -------------------------------------------------
   초기화
   ------------------------------------------------- */
function initFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  _auth = firebase.auth();
  _db   = firebase.firestore();
  window.firebaseDb = _db;
}

/**
 * Auth 상태 감시 시작
 * @param {function} onSignedIn - 로그인 완료 시 호출 (user 전달)
 */
function initAuth(onSignedIn) {
  initFirebase();

  _auth.onAuthStateChanged((user) => {
    _currentUser = user;
    if (user) {
      hideLoginModal();
      updateUserBadge(user);
      onSignedIn(user);
    } else {
      updateUserBadge(null);
      showLoginModal();
    }
  });
}

/* -------------------------------------------------
   현재 유저
   ------------------------------------------------- */
function getCurrentUser() {
  return _currentUser;
}

/* -------------------------------------------------
   로그인
   ------------------------------------------------- */
async function signInWithEmail(email, password) {
  try {
    await _auth.signInWithEmailAndPassword(email, password);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: getAuthErrorMessage(err.code) };
  }
}

/* -------------------------------------------------
   로그아웃
   ------------------------------------------------- */
async function doSignOut() {
  await _auth.signOut();
  showToast('로그아웃했어요.');
}

/* -------------------------------------------------
   로그인 모달 제어
   ------------------------------------------------- */
function showLoginModal() {
  const el = document.getElementById('auth-modal');
  if (el) el.classList.remove('hidden');
}

function hideLoginModal() {
  const el = document.getElementById('auth-modal');
  if (el) el.classList.add('hidden');
}

/* -------------------------------------------------
   헤더 유저 뱃지 업데이트
   ------------------------------------------------- */
function updateUserBadge(user) {
  document.querySelectorAll('.user-badge-email').forEach(el => {
    el.textContent = user ? user.email : '';
  });
  document.querySelectorAll('.user-badge').forEach(el => {
    el.style.display = user ? 'flex' : 'none';
  });
}

/* -------------------------------------------------
   이벤트 바인딩
   ------------------------------------------------- */
function bindAuthEvents() {
  const emailInput   = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const loginBtn     = document.getElementById('auth-login-btn');
  const errorEl      = document.getElementById('auth-error');

  if (!loginBtn || !emailInput || !passwordInput) return;

  const doLogin = async () => {
    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorEl.textContent = '이메일과 비밀번호를 입력해주세요.';
      errorEl.classList.remove('hidden');
      return;
    }

    loginBtn.disabled    = true;
    loginBtn.textContent = '로그인 중...';
    errorEl.classList.add('hidden');

    const result = await signInWithEmail(email, password);

    if (!result.ok) {
      errorEl.textContent  = result.message;
      errorEl.classList.remove('hidden');
      loginBtn.disabled    = false;
      loginBtn.textContent = '로그인';
    }
    // 성공 시 onAuthStateChanged가 자동으로 처리
  };

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  // 로그아웃 버튼 (헤더에 여러 개 있을 수 있음)
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', doSignOut);
  });
}

/* -------------------------------------------------
   에러 코드 → 한국어
   ------------------------------------------------- */
function getAuthErrorMessage(code) {
  const map = {
    'auth/user-not-found':        '등록되지 않은 이메일이에요.',
    'auth/wrong-password':        '비밀번호가 올바르지 않아요.',
    'auth/invalid-email':         '이메일 형식이 올바르지 않아요.',
    'auth/invalid-credential':    '이메일 또는 비밀번호가 올바르지 않아요.',
    'auth/too-many-requests':     '잠시 후 다시 시도해주세요.',
    'auth/user-disabled':         '비활성화된 계정이에요. 관리자에게 문의하세요.',
    'auth/network-request-failed':'네트워크 오류가 발생했어요.',
  };
  return map[code] || '로그인에 실패했어요. 다시 시도해주세요.';
}
