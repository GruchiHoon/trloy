/* =================================================
   TRLOY js/10-app.js
   - DOMContentLoaded 초기화
   - 모든 이벤트 바인딩 (P1~P5 포함)
   - 초기 상태 결정 (키 있음→빈 상태 / 없음→설정)
   ================================================= */

/* 편집 상태용 별도 입력 상태 */
const editState = {
  urls: [],
  imageFiles: [],
  imagePreviews: [],
  naturalLanguage: '',
};

window.currentResult = null;
window.lastAnalyzedInputs = null;

document.addEventListener('DOMContentLoaded', () => {
  /* 모달 공통 이벤트 */
  bindModalEvents();

  /* 설정 화면 이벤트 */
  bindSettingsEvents();

  /* 빈 상태 입력 이벤트 */
  bindEmptyStateEvents();

  /* 결과 상태 이벤트 (편집, 합성 노트 토글, 설정 진입) */
  bindResultStateEvents();

  /* Export 버튼 — E 버튼 삭제됨 (v3.4) */

  /* 에러 박스 재시도 */
  const retryBtn = document.getElementById('btn-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      if (window.lastAnalyzedInputs) {
        runAnalysis(window.lastAnalyzedInputs);
      } else {
        setState('empty');
      }
    });
  }

  /* 에러 박스 → 입력으로 돌아가기 */
  const errorBackBtn = document.getElementById('btn-error-back');
  if (errorBackBtn) {
    errorBackBtn.addEventListener('click', () => {
      showErrorBox(false);
      goToEmptyState();
    });
  }

  /* P1: 저장 데이터 전체 삭제 */
  const clearDraftsBtn = document.getElementById('btn-clear-drafts');
  if (clearDraftsBtn) {
    clearDraftsBtn.addEventListener('click', () => {
      if (typeof clearAllDrafts === 'function') clearAllDrafts();
    });
  }

  /* P1: 저장 버튼 */
  const saveDraftBtn = document.getElementById('btn-save-draft');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => {
      if (typeof saveDraft === 'function' && window.currentResult) {
        saveDraft(window.lastAnalyzedInputs, window.currentResult);
      }
    });
  }

  /* P2: catalog.html 다운로드 */
  const catalogBtn = document.getElementById('btn-download-catalog');
  if (catalogBtn) {
    catalogBtn.addEventListener('click', () => {
      const data = window.currentResult;
      if (data && typeof downloadWireframeHTML === 'function') {
        downloadWireframeHTML(data);
      } else {
        showToast('분석 결과가 없어요.');
      }
    });
  }

  /* P5: FRLOY .md 가져오기 */
  const frloyImportBtn = document.getElementById('btn-frloy-import');
  const frloyFileInput = document.getElementById('frloy-file-input');
  if (frloyImportBtn && frloyFileInput) {
    frloyImportBtn.addEventListener('click', () => frloyFileInput.click());
    frloyFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const textarea = document.getElementById('input-textarea');
        if (textarea) {
          textarea.value += (textarea.value ? '\n\n' : '') + text;
          textarea.dispatchEvent(new Event('input'));
          showToast(`${file.name}을 가져왔어요.`);
        }
      } catch {
        showToast('.md 파일을 읽을 수 없어요.');
      }
      frloyFileInput.value = '';
    });
  }

  /* 초기 상태 결정 */
  bootstrapState();
});

/* -------------------------------------------------
   초기 상태
   ------------------------------------------------- */
function bootstrapState() {
  // URL 해시에서 상태 확인 (뒤로가기/앞으로가기 대응)
  const hash = window.location.hash.replace('#', '');

  // P1: 레거시 결과 마이그레이션
  if (typeof migrateLegacyResult === 'function') migrateLegacyResult();

  // 마지막 결과 복원 시도 (sessionStorage — 탭 독립)
  try {
    const last = sessionStorage.getItem(STORAGE_KEY_LAST);
    if (last) {
      const parsed = JSON.parse(last);
      if (parsed && parsed.visualTheme) {
        window.currentResult = parsed;
      }
    }
  } catch (e) { /* noop */ }

  const key = getApiKey();
  if (!key) {
    showSettings(false);
    return;
  }

  // 해시가 'result'이고 결과가 있으면 결과 표시
  if (hash === 'result' && window.currentResult) {
    setState('result');
    renderResult(window.currentResult);
  } else if (window.currentResult && !hash) {
    // 해시 없이 결과가 있으면 (새 탭이 아닌 새로고침) → 결과 표시
    setState('result');
    renderResult(window.currentResult);
    history.replaceState({ view: 'result' }, '', '#result');
  } else {
    setState('empty');
    history.replaceState({ view: 'empty' }, '', '#empty');
    // P1: 저장된 드래프트 목록 렌더
    if (typeof renderDraftList === 'function') renderDraftList();
  }
}

/* -------------------------------------------------
   빈 상태 이벤트
   ------------------------------------------------- */
function bindEmptyStateEvents() {
  const textarea = document.getElementById('input-textarea');
  const fileInput = document.getElementById('input-file');
  const thumbsEl = document.getElementById('input-thumbs');
  const hintEl = document.getElementById('input-hint');
  const analyzeBtn = document.getElementById('btn-analyze');
  const settingsBtn = document.getElementById('btn-settings');

  if (!textarea || !analyzeBtn) return;

  /* textarea 입력 */
  textarea.addEventListener('input', () => {
    syncStateFromTextarea(textarea.value, inputState);
    updateAnalyzeButton(inputState, analyzeBtn, hintEl);
  });

  /* 파일 업로드 */
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      await addFilesToState(files, inputState);
      renderThumbs(thumbsEl, inputState, () => {
        renderThumbs(thumbsEl, inputState);
        updateAnalyzeButton(inputState, analyzeBtn, hintEl);
      });
      updateAnalyzeButton(inputState, analyzeBtn, hintEl);
    }
    fileInput.value = ''; // 같은 파일 재선택 가능
  });

  /* 드래그 & 드롭 */
  bindDragDrop(textarea, async (files) => {
    await addFilesToState(files, inputState);
    renderThumbs(thumbsEl, inputState, () => {
      renderThumbs(thumbsEl, inputState);
      updateAnalyzeButton(inputState, analyzeBtn, hintEl);
    });
    updateAnalyzeButton(inputState, analyzeBtn, hintEl);
  });

  /* 분석 버튼 */
  analyzeBtn.addEventListener('click', () => {
    syncStateFromTextarea(textarea.value, inputState);
    if (inputState.urls.length === 0 && inputState.imageFiles.length === 0) {
      showToast('URL 또는 이미지를 1개 이상 추가해주세요.');
      return;
    }
    const payload = {
      urls: inputState.urls.slice(),
      images: inputState.imagePreviews.slice(),
      naturalLanguage: inputState.naturalLanguage,
    };
    window.lastAnalyzedInputs = payload;
    runAnalysis(payload);
  });

  /* 설정 진입 */
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => showSettings(true));
  }

  /* 초기 상태 */
  updateAnalyzeButton(inputState, analyzeBtn, hintEl);
}

/* -------------------------------------------------
   결과 상태 이벤트
   ------------------------------------------------- */
function bindResultStateEvents() {
  /* 합성 노트 ▾ 토글 (디폴트 접힘) */
  const toggleBtn = document.getElementById('btn-toggle-synth');
  const panel = document.getElementById('synth-panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
      } else {
        toggleBtn.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
      }
    });
  }

  /* 편집 버튼 */
  const editBtn = document.getElementById('btn-edit');
  const editPanel = document.getElementById('edit-panel');
  const editTextarea = document.getElementById('edit-textarea');
  const editFileInput = document.getElementById('edit-file');
  const editThumbsEl = document.getElementById('edit-thumbs');
  const analyzeAgainBtn = document.getElementById('btn-analyze-again');
  const cancelEditBtn = document.getElementById('btn-cancel-edit');

  if (editBtn && editPanel) {
    editBtn.addEventListener('click', () => {
      // 이전 값 pre-fill
      const last = window.lastAnalyzedInputs || {};
      const lines = [];
      if (last.urls && last.urls.length) lines.push(...last.urls);
      if (last.naturalLanguage) lines.push(last.naturalLanguage);
      editTextarea.value = lines.join('\n');

      // 이전 이미지 유지
      editState.urls = last.urls ? last.urls.slice() : [];
      editState.imageFiles = [];
      editState.imagePreviews = (last.images || []).slice();
      editState.naturalLanguage = last.naturalLanguage || '';
      renderThumbs(editThumbsEl, editState, () => renderThumbs(editThumbsEl, editState));

      editPanel.hidden = false;
      setTimeout(() => editTextarea.focus(), 50);
    });
  }

  /* 편집 - textarea 변경 */
  if (editTextarea) {
    editTextarea.addEventListener('input', () => {
      syncStateFromTextarea(editTextarea.value, editState);
    });
    bindDragDrop(editTextarea, async (files) => {
      await addFilesToState(files, editState);
      renderThumbs(editThumbsEl, editState, () => renderThumbs(editThumbsEl, editState));
    });
  }

  /* 편집 - 파일 업로드 */
  if (editFileInput) {
    editFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) {
        await addFilesToState(files, editState);
        renderThumbs(editThumbsEl, editState, () => renderThumbs(editThumbsEl, editState));
      }
      editFileInput.value = '';
    });
  }

  /* 편집 - 다시 분석 */
  if (analyzeAgainBtn) {
    analyzeAgainBtn.addEventListener('click', () => {
      syncStateFromTextarea(editTextarea.value, editState);
      if (editState.urls.length === 0 && editState.imageFiles.length === 0 && editState.imagePreviews.length === 0) {
        showToast('URL 또는 이미지를 1개 이상 추가해주세요.');
        return;
      }
      const payload = {
        urls: editState.urls.slice(),
        images: editState.imagePreviews.slice(),
        naturalLanguage: editState.naturalLanguage,
      };
      window.lastAnalyzedInputs = payload;
      editPanel.hidden = true;
      runAnalysis(payload);
    });
  }

  /* 편집 - 취소 */
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      editPanel.hidden = true;
    });
  }

  /* 결과 상태의 설정 진입 */
  const settingsFromResult = document.getElementById('btn-settings-from-result');
  if (settingsFromResult) {
    settingsFromResult.addEventListener('click', () => showSettings(true));
  }

  /* 로고 클릭 → 빈 상태로 이동 (현재 결과는 유지, 나중에 복귀 가능) */
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      goToEmptyState();
    });
  }

  /* [새 분석] 클릭 → 빈 상태 + 입력값 초기화 */
  const newAnalysisBtn = document.getElementById('btn-new-analysis');
  if (newAnalysisBtn) {
    newAnalysisBtn.addEventListener('click', () => {
      goToEmptyState({ clearInput: true });
    });
  }
}

/* -------------------------------------------------
   빈 상태로 이동
   - clearInput: true → 기존 입력도 모두 비움
   ------------------------------------------------- */
function goToEmptyState({ clearInput = false, fromPopstate = false } = {}) {
  setState('empty');

  // 편집 패널은 항상 닫기
  const editPanel = document.getElementById('edit-panel');
  if (editPanel) editPanel.hidden = true;

  // 합성 과정 토글도 닫기
  const toggleBtn = document.getElementById('btn-toggle-synth');
  const synthPanel = document.getElementById('synth-panel');
  if (toggleBtn && synthPanel) {
    toggleBtn.setAttribute('aria-expanded', 'false');
    synthPanel.hidden = true;
  }

  // 에러 박스 닫기
  showErrorBox(false);

  if (clearInput) {
    // 입력 상태 초기화
    resetInputState(inputState);
    const textarea = document.getElementById('input-textarea');
    const thumbsEl = document.getElementById('input-thumbs');
    const hintEl = document.getElementById('input-hint');
    const analyzeBtn = document.getElementById('btn-analyze');
    if (textarea) textarea.value = '';
    if (thumbsEl) thumbsEl.innerHTML = '';
    updateAnalyzeButton(inputState, analyzeBtn, hintEl);
  }

  // 히스토리 기록 (뒤로가기에서 온 게 아닐 때만)
  if (!fromPopstate) {
    history.pushState({ view: 'empty' }, '', '#empty');
  }

  // P1: 드래프트 목록 갱신
  if (typeof renderDraftList === 'function') renderDraftList();

  // 스크롤 맨 위로
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------------------------------------
   결과 상태로 이동 시 히스토리 기록
   (분석 완료 후 호출)
   ------------------------------------------------- */
function pushResultState() {
  history.pushState({ view: 'result' }, '', '#result');
}

/* -------------------------------------------------
   뒤로가기 / 앞으로가기 처리
   ------------------------------------------------- */
window.addEventListener('popstate', (event) => {
  const view = event.state?.view || 'empty';

  if (view === 'result' && window.currentResult) {
    // 앞으로가기 → 결과 복원
    setState('result');
    renderResult(window.currentResult);
    window.scrollTo({ top: 0 });
  } else {
    // 뒤로가기 → 빈 상태 (히스토리 push 없이)
    goToEmptyState({ fromPopstate: true });
  }
});

/* -------------------------------------------------
   글로벌 에러 안전망 — 스켈레톤 멈춤 방지
   ------------------------------------------------- */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const overlay = document.getElementById('loading-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    showLoadingOverlay(false);
    stopLoadingMessageRotator();
    if (typeof resetLoadingSynthFrame === 'function') resetLoadingSynthFrame();
    showErrorBox(true, '예상치 못한 오류가 발생했어요. 다시 시도해주세요.');
  }
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  const overlay = document.getElementById('loading-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    showLoadingOverlay(false);
    stopLoadingMessageRotator();
    if (typeof resetLoadingSynthFrame === 'function') resetLoadingSynthFrame();
    showErrorBox(true, `오류가 발생했어요: ${event.error?.message || '알 수 없는 오류'}`);
  }
});
