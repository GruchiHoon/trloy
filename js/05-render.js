/* =================================================
   TRLOY js/05-render.js  (v3.4)
   결과 렌더링 (D안: 풀너비 스택)
   - B 정체성 → P2 Preview
   ================================================= */

/* -------------------------------------------------
   상태 컨테이너 전환
   ------------------------------------------------- */
function setState(name, opts = {}) {
  const ids = ['state-settings', 'state-empty', 'state-result'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === `state-${name}`) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

/* -------------------------------------------------
   스켈레톤 렌더 (재분석 시 기존 결과 유지 → 스켈레톤 교체)
   ------------------------------------------------- */
function renderSkeletons() {
  // B 섹션
  const headline = document.getElementById('vibe-headline');
  const atm = document.getElementById('vibe-atmosphere');
  if (headline) {
    headline.textContent = '\u00A0';
    headline.classList.add('skeleton');
  }
  if (atm) {
    atm.textContent = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
    atm.classList.add('skeleton');
  }

  const chipsEl = document.getElementById('vibe-chips');
  const swatchesEl = document.getElementById('vibe-swatches');
  if (chipsEl) chipsEl.innerHTML = '';
  if (swatchesEl) swatchesEl.innerHTML = '';

  ['block-1', 'block-2', 'block-3'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '\u00A0';
      el.classList.add('skeleton');
    }
  });

  // sticky 브랜드명 스켈레톤 (분석 중 임시 텍스트)
  const brandsEl = document.getElementById('sticky-brands');
  if (brandsEl && !brandsEl.textContent.trim()) {
    brandsEl.innerHTML = '<span style="color: var(--color-text-tertiary); font-weight: 400;">분석 중...</span>';
  }
}

/* -------------------------------------------------
   메인 렌더
   ------------------------------------------------- */
function renderResult(data) {
  if (!data) return;

  /* sticky */
  renderSticky(data);
  renderSynthThumbs();
  renderSynthNote(data.synthesisNote);

  /* B 섹션 */
  renderSectionB(data);

  /* P2 프리뷰 */
  if (typeof renderPreviewSection === 'function') renderPreviewSection(data);
}

/* -------------------------------------------------
   sticky 브랜드명 (Pinterest + Stitch 형식)
   썸네일은 합성 노트 패널로 이동
   ------------------------------------------------- */
function renderSticky(data) {
  const brandsEl = document.getElementById('sticky-brands');
  if (!brandsEl) return;

  brandsEl.innerHTML = '';
  const brands = (data?.visualTheme?.referenceBrands || [])
    .filter((b) => typeof b === 'string' && b.trim());

  if (brands.length === 0) {
    // fallback — 입력 URL에서 도메인 추출
    const state = window.lastAnalyzedInputs || {};
    const urls = state.urls || [];
    const imageCnt = (state.images || []).length;
    const fallback = urls.slice(0, 6).map(domainFromUrl);
    if (imageCnt > 0) fallback.push(`이미지 ${imageCnt}장`);

    fallback.forEach((name, idx) => {
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'brand-sep';
        sep.textContent = '+';
        brandsEl.appendChild(sep);
      }
      const span = document.createElement('span');
      span.textContent = name;
      brandsEl.appendChild(span);
    });
    return;
  }

  brands.slice(0, 6).forEach((name, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'brand-sep';
      sep.textContent = '+';
      brandsEl.appendChild(sep);
    }
    const span = document.createElement('span');
    span.textContent = name;
    brandsEl.appendChild(span);
  });
}

/* -------------------------------------------------
   합성 노트 — 썸네일 (synth 패널 내부)
   ------------------------------------------------- */
function renderSynthThumbs() {
  const el = document.getElementById('synth-thumbs');
  if (!el) return;
  el.innerHTML = '';

  const state = window.lastAnalyzedInputs || {};
  const urls = state.urls || [];
  const images = state.images || [];

  urls.forEach((u) => {
    const thumb = document.createElement('div');
    thumb.className = 'synth-thumb';

    const img = document.createElement('img');
    img.className = 'synth-thumb-img';
    img.src = buildThumioUrl(u);
    img.alt = u;
    img.onerror = () => {
      const ph = document.createElement('div');
      ph.className = 'synth-thumb-img placeholder';
      ph.textContent = 'URL';
      img.replaceWith(ph);
    };

    const label = document.createElement('span');
    label.className = 'synth-thumb-label';
    label.textContent = domainFromUrl(u);
    label.title = u;

    thumb.appendChild(img);
    thumb.appendChild(label);
    el.appendChild(thumb);
  });

  images.forEach((image, idx) => {
    const thumb = document.createElement('div');
    thumb.className = 'synth-thumb';

    const img = document.createElement('img');
    img.className = 'synth-thumb-img';
    img.src = image.dataUrl || `data:${image.mediaType};base64,${image.base64}`;
    img.alt = `uploaded ${idx + 1}`;

    const label = document.createElement('span');
    label.className = 'synth-thumb-label';
    label.textContent = image.name || `이미지 ${idx + 1}`;

    thumb.appendChild(img);
    thumb.appendChild(label);
    el.appendChild(thumb);
  });
}

/* URL에서 깔끔한 도메인 추출 */
function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/* -------------------------------------------------
   합성 노트 4단계 채우기
   ------------------------------------------------- */
function renderSynthNote(note) {
  if (!note) note = {};
  setText('synth-common', note.commonExtraction || '—');
  setText('synth-diff', note.differentiation || '—');
  setText('synth-priority', note.prioritization || '—');
  setText('synth-conflict', note.conflictResolution || '—');
}

/* -------------------------------------------------
   B 섹션: 정체성 (Vibe + 칩·스와치 + 3블록)
   ------------------------------------------------- */
function renderSectionB(data) {
  const vt = data?.visualTheme ?? {};
  const cp = data?.colorPalette ?? {};

  // 헤드라인
  const headlineEl = document.getElementById('vibe-headline');
  if (headlineEl) {
    headlineEl.textContent = vt.title || '—';
    headlineEl.classList.remove('skeleton');
  }

  // 분위기
  const atmEl = document.getElementById('vibe-atmosphere');
  if (atmEl) {
    atmEl.textContent = vt.atmosphere || '—';
    atmEl.classList.remove('skeleton');
  }

  // 키워드 칩
  const chipsEl = document.getElementById('vibe-chips');
  if (chipsEl) {
    chipsEl.innerHTML = '';
    const keywords = vt.keywords ?? [];
    keywords.forEach((kw) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = kw;
      chipsEl.appendChild(chip);
    });
  }

  // 컬러 스와치 (상위 5개)
  const swatchesEl = document.getElementById('vibe-swatches');
  if (swatchesEl) {
    swatchesEl.innerHTML = '';
    const colors = cp.colors ?? [];
    colors.slice(0, 5).forEach((c) => {
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.backgroundColor = c.hex || '#ccc';
      sw.title = `${c.hex || ''} — ${c.role || ''}`;
      swatchesEl.appendChild(sw);
    });
  }

  // 3블록 — trloyMeta에서 데이터 추출 (Claude 응답 JSON 구조 기준)
  const meta = data?.trloyMeta ?? {};

  /* 블록 1: 디자인 컨셉 · 철학 */
  const b1 = document.getElementById('block-1');
  if (b1) {
    b1.classList.remove('skeleton');
    b1.innerHTML = '';
    const concept = meta.designConcept || '';
    const philosophy = meta.designPhilosophy || '';
    if (concept) {
      const p1 = document.createElement('p');
      p1.textContent = concept;
      p1.style.marginBottom = '10px';
      b1.appendChild(p1);
    }
    if (philosophy) {
      const p2 = document.createElement('p');
      p2.textContent = philosophy;
      p2.style.color = 'var(--color-text-secondary)';
      b1.appendChild(p2);
    }
  }

  /* 블록 2: 감정 · 타겟 · 업종 */
  const b2 = document.getElementById('block-2');
  if (b2) {
    b2.classList.remove('skeleton');
    b2.innerHTML = '';
    if (meta.emotions?.length) {
      const emRow = document.createElement('div');
      emRow.className = 'meta-row';
      emRow.innerHTML = '<span class="meta-label">감정</span><span class="meta-value"></span>';
      const emList = document.createElement('span');
      emList.className = 'emotions-list';
      meta.emotions.forEach((e) => {
        const tag = document.createElement('span');
        tag.className = 'emotion-tag';
        tag.textContent = e;
        emList.appendChild(tag);
      });
      emRow.querySelector('.meta-value').appendChild(emList);
      b2.appendChild(emRow);
    }
    if (meta.target) {
      const r = document.createElement('div');
      r.className = 'meta-row';
      r.innerHTML = '<span class="meta-label">타겟</span><span class="meta-value"></span>';
      r.querySelector('.meta-value').textContent = meta.target;
      b2.appendChild(r);
    }
    if (meta.industry) {
      const r = document.createElement('div');
      r.className = 'meta-row';
      r.innerHTML = '<span class="meta-label">업종</span><span class="meta-value"></span>';
      r.querySelector('.meta-value').textContent = meta.industry;
      b2.appendChild(r);
    }
    if (meta.scenarios?.length) {
      const r = document.createElement('div');
      r.className = 'meta-row';
      r.innerHTML = '<span class="meta-label">적용</span><span class="meta-value"></span>';
      r.querySelector('.meta-value').textContent = meta.scenarios.join(' · ');
      b2.appendChild(r);
    }
  }

  /* 블록 3: 포지션 */
  const b3 = document.getElementById('block-3');
  if (b3) {
    b3.classList.remove('skeleton');
    b3.textContent = meta.position || '';
  }

  /* [프롬프트 변환] 버튼 바인딩 */
  const btnConvert = document.getElementById('btn-prompt-convert');
  if (btnConvert) {
    btnConvert.onclick = () => openPromptConvertModal(data);
  }
}

/* C 섹션 카드 — 삭제됨 (v3.4, 카탈로그로 통합) */

/* -------------------------------------------------
   유틸리티
   ------------------------------------------------- */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(str, max) {
  return !str ? '' : str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

/* -------------------------------------------------
   토스트
   ------------------------------------------------- */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

/* -------------------------------------------------
   로딩 합성 프레임 실시간 표시 (v3 신규)
   ------------------------------------------------- */
let synthFrameTimers = [];

function startLoadingSynthFrame() {
  resetLoadingSynthFrame();
  const steps = [1, 2, 3, 4];
  const delays = [0, 5000, 12000, 18000];

  steps.forEach((step, i) => {
    const timerId = setTimeout(() => {
      if (i > 0) {
        const prev = document.getElementById(`ls-step-${steps[i - 1]}`);
        if (prev) {
          prev.classList.remove('active');
          prev.classList.add('done');
        }
      }
      const el = document.getElementById(`ls-step-${step}`);
      if (el) el.classList.add('active');
    }, delays[i]);
    synthFrameTimers.push(timerId);
  });
}

function completeLoadingSynthFrame() {
  synthFrameTimers.forEach(clearTimeout);
  synthFrameTimers = [];
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`ls-step-${i}`);
    if (el) {
      el.classList.remove('active');
      el.classList.add('done');
    }
  }
}

function resetLoadingSynthFrame() {
  synthFrameTimers.forEach(clearTimeout);
  synthFrameTimers = [];
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`ls-step-${i}`);
    if (el) el.classList.remove('active', 'done');
  }
}
