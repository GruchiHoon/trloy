/* =================================================
   TRLOY js/09-settings.js
   API 키 설정 화면 제어:
   - showSettings(fromResult)
   - saveKey / deleteKey
   - sk-ant- prefix 실시간 검증
   ================================================= */

let settingsEntryMode = 'first'; // 'first' | 'revisit'

function showSettings(fromExisting = false) {
  settingsEntryMode = fromExisting ? 'revisit' : 'first';
  setState('settings');

  const input = document.getElementById('api-key-input');
  const errorEl = document.getElementById('api-key-error');
  const deleteBtn = document.getElementById('btn-delete-key');
  const cancelBtn = document.getElementById('btn-cancel-settings');

  // 기존 키 있으면 마스킹 표시, 삭제/취소 버튼 노출
  const existing = getApiKey();
  if (existing) {
    input.value = existing;
    deleteBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
  } else {
    input.value = '';
    deleteBtn.classList.add('hidden');
    cancelBtn.classList.add('hidden');
  }

  input.classList.remove('error');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  setTimeout(() => input.focus(), 50);
}

function bindSettingsEvents() {
  const input = document.getElementById('api-key-input');
  const errorEl = document.getElementById('api-key-error');
  const saveBtn = document.getElementById('btn-save-key');
  const deleteBtn = document.getElementById('btn-delete-key');
  const cancelBtn = document.getElementById('btn-cancel-settings');

  if (!input || !saveBtn) return;

  /* 실시간 검증 */
  input.addEventListener('input', () => {
    input.classList.remove('error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  });

  input.addEventListener('blur', () => {
    const val = input.value.trim();
    if (val && !validateApiKeyFormat(val)) {
      input.classList.add('error');
      errorEl.textContent = 'API 키는 sk-ant- 로 시작해야 합니다.';
      errorEl.classList.remove('hidden');
    }
  });

  /* 저장 */
  saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) {
      input.classList.add('error');
      errorEl.textContent = '키를 입력해주세요.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (!validateApiKeyFormat(val)) {
      input.classList.add('error');
      errorEl.textContent = 'API 키는 sk-ant- 로 시작해야 합니다.';
      errorEl.classList.remove('hidden');
      return;
    }
    const ok = setApiKey(val);
    if (!ok) {
      errorEl.textContent = 'localStorage에 저장할 수 없습니다.';
      errorEl.classList.remove('hidden');
      return;
    }
    showToast('API 키를 저장했어요.');
    // 결과가 있으면 결과로, 아니면 빈 상태로
    if (window.currentResult) {
      setState('result');
    } else {
      setState('empty');
    }
  });

  /* Enter 키로 저장 */
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveBtn.click();
    }
  });

  /* 삭제 */
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!confirm('저장된 API 키를 삭제할까요?')) return;
      clearApiKey();
      input.value = '';
      deleteBtn.classList.add('hidden');
      cancelBtn.classList.add('hidden');
      showToast('API 키를 삭제했어요.');
    });
  }

  /* 취소 (이미 키가 있는 경우에만) */
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (window.currentResult) {
        setState('result');
      } else {
        setState('empty');
      }
    });
  }
}
