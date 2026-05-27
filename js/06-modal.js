/* =================================================
   TRLOY js/06-modal.js  (v3.4)
   모달 제어:
   - 범용 openModal / closeModal / bindModalEvents
   - copyToClipboard (카탈로그 복사에서도 사용)
   - B [프롬프트 변환] 모달
   ================================================= */

let lastFocusedEl = null;

/* -------------------------------------------------
   열기 / 닫기
   ------------------------------------------------- */
function openModal({ title, note, body, copyText }) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const noteEl = document.getElementById('modal-note');
  const bodyEl = document.getElementById('modal-body');
  const copyBtn = document.getElementById('modal-copy');

  if (!overlay || !bodyEl) return;

  lastFocusedEl = document.activeElement;

  titleEl.textContent = title || '';

  if (note) {
    noteEl.textContent = note;
    noteEl.hidden = false;
  } else {
    noteEl.textContent = '';
    noteEl.hidden = true;
  }

  // body는 HTML 노드 또는 문자열 둘 다 허용
  bodyEl.innerHTML = '';
  if (typeof body === 'string') {
    bodyEl.innerHTML = body;
  } else if (body instanceof Node) {
    bodyEl.appendChild(body);
  }

  // 복사 버튼 동작
  copyBtn.classList.remove('copied');
  copyBtn.onclick = () => {
    if (!copyText) {
      showToast('복사할 내용이 없어요.');
      return;
    }
    copyToClipboard(copyText).then(() => {
      copyBtn.classList.add('copied');
      showToast('클립보드에 복사됐어요.');
      setTimeout(() => copyBtn.classList.remove('copied'), 1200);
    });
  };

  // 노출
  overlay.classList.remove('hidden', 'closing');
  document.body.classList.add('modal-open');

  // 포커스 이동
  setTimeout(() => {
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) closeBtn.focus();
  }, 50);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;

  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('closing');
    document.body.classList.remove('modal-open');
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      try { lastFocusedEl.focus(); } catch (_) {}
    }
  }, 160);
}

function bindModalEvents() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // 오버레이 외부 클릭
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // ESC 키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeModal();
    }
  });
}

/* -------------------------------------------------
   복사 유틸
   ------------------------------------------------- */
async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error('복사 실패:', err);
    return false;
  }
}

/* 카드 모달 — 삭제됨 (v3.4, 카탈로그로 통합) */

/* -------------------------------------------------
   B [프롬프트 변환] 모달
   ------------------------------------------------- */
function openPromptConvertModal(data) {
  const prompt = data?.agentPrompt || '';
  const frag = document.createDocumentFragment();

  const block = document.createElement('div');
  block.className = 'prompt-block';
  block.textContent = prompt || '생성된 프롬프트가 없습니다.';
  frag.appendChild(block);

  openModal({
    title: '프롬프트 변환',
    note: '이 프롬프트는 B 정체성의 AI 변환본입니다. Figma Make · Stitch · Cursor 같은 AI 도구에 붙여넣으면 동일한 정체성으로 결과를 생성해요.',
    body: frag,
    copyText: prompt,
  });
}
