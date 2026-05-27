/* =================================================
   TRLOY js/02-input.js
   - URL 추출
   - 자연어 맥락 분리
   - 파일 드롭·업로드
   - 이미지 리사이징 (canvas 1280px)
   - [분석] 버튼 활성화 판단
   ================================================= */

/* 입력 상태 (빈 상태·편집 상태 공유) */
const inputState = {
  urls: [],
  imageFiles: [],       // File 객체
  imagePreviews: [],    // dataURL
  naturalLanguage: '',
};

/* -------------------------------------------------
   URL 추출
   ------------------------------------------------- */
function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(URL_REGEX) || [];
  // 끝 구두점 제거
  return matches
    .map(u => u.replace(/[.,;)\]]+$/, ''))
    .filter((u, i, arr) => arr.indexOf(u) === i);
}

/* 자연어만 (URL 제거 후 남은 텍스트) */
function extractNaturalLanguage(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(URL_REGEX, '').replace(/\s+/g, ' ').trim();
}

/* -------------------------------------------------
   이미지 리사이징 → base64 (1280px canvas)
   ------------------------------------------------- */
async function resizeToBase64(file, maxWidth = IMAGE_MAX_WIDTH) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('이미지 파일이 아닙니다.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // 원본 포맷 유지 (png/jpeg/webp) — Claude는 base64로 png/jpeg/webp/gif 지원
          const mediaType = /png|jpeg|jpg|webp|gif/i.test(file.type)
            ? (file.type === 'image/jpg' ? 'image/jpeg' : file.type)
            : 'image/png';

          const mime = mediaType === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = mime === 'image/jpeg' ? IMAGE_JPEG_QUALITY : undefined;
          const dataUrl = canvas.toDataURL(mime, quality);
          const base64 = dataUrl.split(',')[1];
          resolve({ mediaType: mime, base64, dataUrl, width, height });
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* -------------------------------------------------
   드래그 & 드롭 바인딩
   ------------------------------------------------- */
function bindDragDrop(targetEl, onFiles) {
  if (!targetEl) return;

  ['dragenter', 'dragover'].forEach((evt) => {
    targetEl.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      targetEl.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    targetEl.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      targetEl.classList.remove('drag-over');
    });
  });

  targetEl.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter(
      (f) => f.type.startsWith('image/')
    );
    if (files.length) onFiles(files);
  });
}

/* -------------------------------------------------
   썸네일 칩 렌더 (입력 영역에 선택한 이미지 표시)
   ------------------------------------------------- */
async function addFilesToState(files, state = inputState) {
  for (const file of files) {
    try {
      const { dataUrl, mediaType, base64 } = await resizeToBase64(file);
      state.imageFiles.push(file);
      state.imagePreviews.push({ name: file.name, dataUrl, mediaType, base64 });
    } catch (err) {
      console.error('이미지 처리 실패:', err);
      showToast(`이미지를 처리하지 못했어요: ${file.name}`);
    }
  }
}

function renderThumbs(containerEl, state = inputState, onRemove) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  state.imagePreviews.forEach((preview, idx) => {
    const chip = document.createElement('div');
    chip.className = 'thumb-chip';
    chip.innerHTML = `
      <img src="${preview.dataUrl}" alt="">
      <span class="thumb-label"></span>
      <button type="button" class="thumb-remove" aria-label="제거">×</button>
    `;
    chip.querySelector('.thumb-label').textContent = preview.name || 'image';
    chip.querySelector('.thumb-remove').addEventListener('click', () => {
      state.imageFiles.splice(idx, 1);
      state.imagePreviews.splice(idx, 1);
      if (typeof onRemove === 'function') onRemove();
    });
    containerEl.appendChild(chip);
  });
}

/* -------------------------------------------------
   [분석] 버튼 활성화 조건
   - URL 또는 이미지가 1개 이상 있어야 함
   ------------------------------------------------- */
function updateAnalyzeButton(state, btnEl, hintEl) {
  if (!btnEl) return;
  const hasInput = (state.urls && state.urls.length > 0) ||
                   (state.imageFiles && state.imageFiles.length > 0);
  btnEl.disabled = !hasInput;

  if (hintEl) {
    if (!hasInput) {
      hintEl.textContent = 'URL 또는 이미지를 1개 이상 추가해주세요.';
      hintEl.style.color = '';
    } else {
      const urlCnt = state.urls.length;
      const imgCnt = state.imageFiles.length;
      const parts = [];
      if (urlCnt) parts.push(`URL ${urlCnt}개`);
      if (imgCnt) parts.push(`이미지 ${imgCnt}개`);
      hintEl.textContent = `준비됨: ${parts.join(' · ')}`;
      hintEl.style.color = 'var(--color-terracotta)';
    }
  }
}

/* -------------------------------------------------
   textarea 변경 처리 (URL + 자연어 자동 추출)
   ------------------------------------------------- */
function syncStateFromTextarea(text, state) {
  state.urls = extractUrls(text);
  state.naturalLanguage = extractNaturalLanguage(text);
}

/* -------------------------------------------------
   전역 헬퍼 - 빈 상태 초기화
   ------------------------------------------------- */
function resetInputState(state = inputState) {
  state.urls = [];
  state.imageFiles = [];
  state.imagePreviews = [];
  state.naturalLanguage = '';
}
