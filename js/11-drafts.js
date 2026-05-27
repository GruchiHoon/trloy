/* =================================================
   TRLOY js/11-drafts.js
   P1: 다중 임시저장 + 히스토리 복원
   - CRUD: getDrafts / saveDraft / deleteDraft / loadDraft / renameDraft / clearAllDrafts
   - UI: renderDraftList (state-empty 하단)
   - 마이그레이션: sessionStorage → localStorage (첫 실행 1회)
   ================================================= */

/* -------------------------------------------------
   CRUD
   ------------------------------------------------- */
function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || '[]');
  } catch { return []; }
}

function saveDraft(inputs, result) {
  if (!result?.visualTheme) {
    showToast('분석 결과가 없어요.');
    return false;
  }

  const resultStr = JSON.stringify(result);
  const sizeKB = Math.round(resultStr.length / 1024);
  if (sizeKB > DRAFT_RESULT_MAX_KB) {
    showToast(`결과가 너무 커요 (${sizeKB}KB). 저장할 수 없어요.`);
    return false;
  }

  const urls = inputs?.urls ?? [];
  const vibeTitle = result.visualTheme?.title || '';
  const vibeKeywords = result.visualTheme?.keywords ?? [];
  const primaryColors = (result.colorPalette?.colors ?? [])
    .slice(0, 3)
    .map((c) => c.hex);

  let drafts = getDrafts();
  const existing = drafts.find(
    (d) => d.vibeTitle === vibeTitle && JSON.stringify(d.inputSnapshot.urls) === JSON.stringify(urls)
  );

  if (existing) {
    if (!confirm(`"${vibeTitle}" 이미 저장되어 있어요. 덮어쓸까요?`)) return false;
    existing.savedAt = new Date().toISOString();
    existing.result = result;
    existing.resultSizeKB = sizeKB;
    existing.vibeKeywords = vibeKeywords;
    existing.primaryColors = primaryColors;
  } else {
    let id;
    try { id = crypto.randomUUID(); }
    catch { id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

    const draft = {
      id,
      label: vibeTitle || formatDateTime(new Date()),
      savedAt: new Date().toISOString(),
      inputSnapshot: {
        urls,
        naturalLanguage: inputs?.naturalLanguage || '',
        imageCount: inputs?.images?.length ?? 0,
      },
      result,
      resultSizeKB: sizeKB,
      vibeTitle,
      vibeKeywords,
      primaryColors,
    };

    drafts.unshift(draft);
  }

  if (drafts.length > DRAFT_MAX_SLOTS) {
    drafts = drafts.slice(0, DRAFT_MAX_SLOTS);
  }

  try {
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
  } catch {
    drafts.pop();
    try {
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
    } catch {
      showToast('저장 공간이 부족해요. 기존 저장을 삭제해주세요.');
      return false;
    }
  }

  renderDraftList();
  updateSaveBtnState(true);
  showToast(`저장했어요 — "${vibeTitle || '분석 결과'}"`);
  return true;
}

function deleteDraft(id) {
  const drafts = getDrafts().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
  renderDraftList();
  showToast('삭제했어요.');
}

function loadDraft(id) {
  const draft = getDrafts().find((d) => d.id === id);
  if (!draft) {
    showToast('불러올 수 없어요.');
    return;
  }

  window.currentResult = draft.result;
  window.lastAnalyzedInputs = {
    urls: draft.inputSnapshot.urls,
    images: [],
    naturalLanguage: draft.inputSnapshot.naturalLanguage,
  };

  setState('result');
  renderResult(draft.result);
  pushResultState();

  try {
    sessionStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(draft.result));
  } catch { /* noop */ }

  if (draft.inputSnapshot.imageCount > 0) {
    showToast(`불러왔어요 — 이미지 ${draft.inputSnapshot.imageCount}장은 다시 첨부해주세요.`);
  } else {
    showToast(`불러왔어요 — "${draft.label}"`);
  }
}

function renameDraft(id, newLabel) {
  const drafts = getDrafts();
  const target = drafts.find((d) => d.id === id);
  if (!target) return;
  target.label = newLabel?.trim() || target.label;
  localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
  renderDraftList();
}

function clearAllDrafts() {
  if (!confirm('모든 저장 데이터를 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return;
  localStorage.removeItem(STORAGE_KEY_DRAFTS);
  renderDraftList();
  updateStorageInfo();
  showToast('모든 저장 데이터를 삭제했어요.');
}

/* -------------------------------------------------
   UI: state-empty 하단 카드 리스트
   ------------------------------------------------- */
function renderDraftList() {
  const drafts = getDrafts();
  const section = document.getElementById('drafts-section');
  const list = document.getElementById('drafts-list');
  const countEl = document.getElementById('drafts-count');
  if (!section || !list) return;

  if (drafts.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  if (countEl) countEl.textContent = `${drafts.length} / ${DRAFT_MAX_SLOTS}`;

  list.innerHTML = '';
  drafts.forEach((d) => {
    const card = document.createElement('div');
    card.className = 'draft-card';
    card.setAttribute('role', 'listitem');

    // 컬러 스트립
    const stripHTML = `<div class="draft-strip">
      ${(d.primaryColors ?? []).map((hex) => `<div class="draft-strip-seg" style="background:${escapeHtml(hex)}"></div>`).join('')}
    </div>`;

    // URL 요약
    const urlsText = (d.inputSnapshot.urls ?? []).map((u) => {
      try { return new URL(u).hostname.replace(/^www\./, ''); }
      catch { return u; }
    }).join(' + ');

    // 키워드 칩
    const keywordsHTML = (d.vibeKeywords ?? [])
      .slice(0, 3)
      .map((kw) => `<span class="draft-chip">${escapeHtml(kw)}</span>`)
      .join('');

    card.innerHTML = `
      ${stripHTML}
      <div class="draft-body">
        <div class="draft-info">
          <div class="draft-title">${escapeHtml(d.label || d.vibeTitle || '분석 결과')}</div>
          <div class="draft-meta">${escapeHtml(urlsText)} · ${timeAgo(d.savedAt)} · ${d.resultSizeKB}KB</div>
          ${keywordsHTML ? `<div class="draft-chips">${keywordsHTML}</div>` : ''}
        </div>
        <div class="draft-actions">
          <button class="draft-btn draft-btn-load" aria-label="불러오기">불러오기</button>
          <button class="draft-btn draft-btn-del" aria-label="삭제">×</button>
        </div>
      </div>
    `;

    card.querySelector('.draft-btn-load').addEventListener('click', () => loadDraft(d.id));
    card.querySelector('.draft-btn-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDraft(d.id);
    });

    list.appendChild(card);
  });

  updateStorageInfo();
}

/* -------------------------------------------------
   저장 버튼 상태 (결과 화면)
   ------------------------------------------------- */
function updateSaveBtnState(justSaved) {
  const btn = document.getElementById('btn-save-draft');
  if (!btn) return;
  if (justSaved) {
    btn.textContent = '저장됨';
    btn.classList.add('saved');
    setTimeout(() => {
      btn.textContent = '저장';
      btn.classList.remove('saved');
    }, 1500);
  }
}

/* -------------------------------------------------
   설정 화면: 저장 데이터 정보
   ------------------------------------------------- */
function updateStorageInfo() {
  const usageEl = document.getElementById('storage-usage');
  const sizeEl = document.getElementById('storage-size');
  if (!usageEl || !sizeEl) return;
  const drafts = getDrafts();
  usageEl.textContent = drafts.length;
  const raw = localStorage.getItem(STORAGE_KEY_DRAFTS) || '';
  sizeEl.textContent = Math.round(raw.length / 1024);
}

/* -------------------------------------------------
   마이그레이션: sessionStorage → drafts (1회)
   ------------------------------------------------- */
function migrateLegacyResult() {
  try {
    const last = sessionStorage.getItem(STORAGE_KEY_LAST);
    if (!last) return;
    const parsed = JSON.parse(last);
    if (!parsed?.visualTheme) return;
    const drafts = getDrafts();
    if (drafts.length > 0) return;
    saveDraft({ urls: [], naturalLanguage: '', images: [] }, parsed);
  } catch { /* noop */ }
}

/* -------------------------------------------------
   유틸
   ------------------------------------------------- */
function formatDateTime(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}
