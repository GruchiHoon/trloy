/* =================================================
   TRLOY js/03-analyze.js  (patched 2026-04-16)
   Claude API 브라우저 직접 호출 ⭐

   [v1.0.1 → patch 변경점]
   buildUserContent() 안에서 Thum.io 스크린샷 결과가 base64를 포함하면
   type: 'base64' 소스로, 없으면 URL 소스로 Claude에 전달.
   → Claude가 외부 URL을 다운로드하다 타임아웃되는 문제 회피.
   ================================================= */

/**
 * 전체 분석 플로우
 */
async function runAnalysis({ urls = [], images = [], naturalLanguage = '' }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    showSettings(true);
    return;
  }

  if (urls.length === 0 && images.length === 0) {
    showToast('URL 또는 이미지를 1개 이상 추가해주세요.');
    return;
  }

  setState('result', { keepContent: hasExistingResult() });
  showLoadingOverlay(true);
  startLoadingMessageRotator();
  showErrorBox(false);

  /* 기존 결과 유지 → 스켈레톤 교체 (§7.18) */
  renderSkeletons();

  try {
    /* 1. 스크린샷 확보 (브라우저에서 base64로) */
    updateLoadingMessage(0);
    const shots = await captureScreenshots(urls);

    /* 2. 사용자 콘텐츠 구성 (v3.3: DESIGN.md fetch 포함) */
    updateLoadingMessage(1);
    const userContent = await buildUserContent(shots, images, naturalLanguage, urls);

    /* 3. Claude API 호출 — 여기서부터 2~6번 메시지 자동 순환 */
    startAnalysisPhaseRotator();
    const requestBody = {
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: ANALYSIS_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    };

    const res = await fetch(CLAUDE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errBody = null;
      try {
        errBody = JSON.parse(errText);
      } catch (_) { /* noop */ }

      if (res.status === 401) {
        stopLoadingMessageRotator();
        showLoadingOverlay(false);
        showToast('API 키가 올바르지 않습니다.');
        showSettings(true);
        return;
      }

      throw new Error(
        errBody?.error?.message ||
          errBody?.message ||
          `Claude API 오류 (HTTP ${res.status})`
      );
    }

    /* 4. 응답 파싱 — 분석 단계 rotator 정지 */
    stopLoadingMessageRotator();
    updateLoadingMessage(6);
    const data = await res.json();
    let parsed;
    try {
      parsed = parseClaudeResponse(data);
    } catch (parseErr) {
      // 파싱 실패 시 raw 응답을 표시할 수 있도록 전달
      const rawText = data?.content?.[0]?.text || JSON.stringify(data, null, 2);
      stopLoadingMessageRotator();
      showLoadingOverlay(false);
      showErrorBox(true, parseErr?.message || 'JSON 파싱에 실패했어요.', rawText);
      return;
    }

    /* 5. 렌더 */
    updateLoadingMessage(7);
    window.currentResult = parsed;
    try {
      sessionStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(parsed));
    } catch (e) { /* 용량 초과 등 — 무시 */ }

    renderResult(parsed);
    pushResultState();
    stopLoadingMessageRotator();
    showLoadingOverlay(false);
    showErrorBox(false);
  } catch (err) {
    console.error('분석 실패:', err);
    stopLoadingMessageRotator();
    showLoadingOverlay(false);
    showErrorBox(true, err?.message || '분석 중 문제가 발생했어요.');
  }
}

/* -------------------------------------------------
   사용자 메시지 빌드 (v3.3: DESIGN.md ground truth + 컬러 fallback)
   우선순위:
   1. design-ref/ DESIGN.md 전문 (있으면)
   2. BRAND_COLOR_LOOKUP 컬러 힌트 (DESIGN.md 없는 브랜드)
   3. 스크린샷만으로 분석
   ------------------------------------------------- */

/* design-ref/index.json 캐시 */
let _designRefIndex = null;
let _designRefIndexLoaded = false;

async function loadDesignRefIndex() {
  if (_designRefIndexLoaded) return _designRefIndex;
  _designRefIndexLoaded = true;
  try {
    const res = await fetch('design-ref/index.json', { cache: 'no-store' });
    if (res.ok) _designRefIndex = await res.json();
  } catch { /* design-ref 폴더 없음 — 무시 */ }
  return _designRefIndex;
}

async function fetchDesignMd(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const index = await loadDesignRefIndex();
    if (!index) return null;

    // 정확 매칭
    let filename = index[hostname];
    // 서브도메인 fallback
    if (!filename) {
      const parts = hostname.split('.');
      for (let i = 1; i < parts.length - 1; i++) {
        const parent = parts.slice(i).join('.');
        if (index[parent]) { filename = index[parent]; break; }
      }
    }
    if (!filename) return null;

    const res = await fetch(`design-ref/${filename}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    // 너무 긴 파일은 앞부분만 (토큰 비용 제한 — 약 6000자 ≈ 3000토큰)
    const MAX_CHARS = 6000;
    const brandName = hostname.split('.')[0];
    if (text.length > MAX_CHARS) {
      return { brand: brandName, content: text.slice(0, MAX_CHARS) + '\n\n[... 이하 생략]', full: false };
    }
    return { brand: brandName, content: text, full: true };
  } catch {
    return null;
  }
}

async function buildUserContent(shots, images, naturalLanguage, urls = []) {
  const content = [];

  // 스크린샷 — base64 우선
  const okShots = shots.filter((s) => s.ok);
  okShots.forEach((s) => {
    if (s.base64) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: s.mediaType || 'image/png',
          data: s.base64,
        },
      });
    } else {
      content.push({
        type: 'image',
        source: { type: 'url', url: s.shotUrl },
      });
    }
  });

  // 업로드 이미지 (base64)
  images.forEach((img) => {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType || 'image/png',
        data: img.base64,
      },
    });
  });

  // 본문 텍스트
  const failedUrls = shots.filter((s) => !s.ok).map((s) => s.url);
  const originalUrls = shots.map((s) => s.url);

  let text = '위 레퍼런스들을 합성해서 DESIGN.md JSON을 생성하세요.\n\n';

  if (originalUrls.length) {
    text += `원본 URL 목록:\n${originalUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n\n`;
  }

  // v3.3: DESIGN.md Ground Truth 전문 주입
  const designMdResults = await Promise.allSettled(
    originalUrls.map((u) => fetchDesignMd(u))
  );
  const fetchedDesigns = designMdResults
    .map((r) => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);

  // DESIGN.md가 있는 URL과 없는 URL 분리
  const urlsWithDesignMd = new Set();

  if (fetchedDesigns.length) {
    text += `━━━ 검증된 DESIGN.md (ground truth — 스크린샷보다 이 데이터를 우선 참고하세요) ━━━\n\n`;
    fetchedDesigns.forEach((d) => {
      urlsWithDesignMd.add(d.brand);
      text += `▼ ${d.brand.toUpperCase()} DESIGN.md\n${d.content}\n\n`;
    });
    text += `━━━ ground truth 끝 ━━━\n\n`;
  }

  // v3.2.1 fallback: DESIGN.md가 없는 브랜드만 컬러 힌트 주입
  const brandHints = originalUrls
    .map((u) => {
      if (typeof lookupBrandColors !== 'function') return null;
      const brand = lookupBrandColors(u);
      if (!brand) return null;
      // DESIGN.md가 이미 있는 브랜드는 스킵
      const slug = brand.name.toLowerCase().replace(/\s+/g, '');
      if (urlsWithDesignMd.has(slug)) return null;
      return `- ${brand.name}: accent=${brand.accent}, bg=${brand.bg}, text=${brand.text} (${brand.note})`;
    })
    .filter(Boolean);

  if (brandHints.length) {
    text += `⚠ 알려진 브랜드 컬러 (DESIGN.md 미보유 브랜드의 컬러 힌트):\n${brandHints.join('\n')}\n\n`;
  }

  if (failedUrls.length) {
    text += `(주: 위 URL 중 ${failedUrls.length}개는 스크린샷 실패. 해당 사이트는 도메인·이름 맥락만 참고하세요.)\n\n`;
  }

  if (naturalLanguage && naturalLanguage.trim()) {
    text += `사용자 의도: "${naturalLanguage.trim()}"`;
  } else {
    text += '사용자 의도: (없음 — 균등 합성)';
  }

  content.push({ type: 'text', text });
  return content;
}

/* -------------------------------------------------
   Claude 응답 파싱 (§12D.4)
   ------------------------------------------------- */
function parseClaudeResponse(apiResponse) {
  if (!apiResponse || !Array.isArray(apiResponse.content)) {
    throw new Error('응답 형식이 올바르지 않습니다.');
  }
  const textBlock = apiResponse.content.find((c) => c.type === 'text');
  if (!textBlock || !textBlock.text) {
    throw new Error('응답 본문이 비어 있습니다.');
  }
  const raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON을 찾을 수 없습니다. Claude가 형식을 지키지 않았어요.');
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error('JSON 파싱 실패: ' + err.message);
  }
}

/* -------------------------------------------------
   로딩 메시지 — 파이프라인 단계 연동
   - 단계 0 (스크린샷 수집), 1 (최적화): 수동 호출
   - 단계 2~6 (Claude 분석 대기): 자동 순환 (6초 간격)
   - 단계 7 (결과 렌더): 수동 호출
   ------------------------------------------------- */
let loadingRotatorId = null;
let loadingMsgIndex = 0;

function startLoadingMessageRotator() {
  loadingMsgIndex = 0;
  updateLoadingMessage(0);
  // 자동 순환 없음 — 파이프라인의 수동 호출이 제어
}

/** Claude API 대기 중에만 2~6번 메시지를 자동 순환 */
function startAnalysisPhaseRotator() {
  stopLoadingMessageRotator();
  loadingMsgIndex = 2;
  updateLoadingMessage(2);
  /* v3: 합성 프레임 실시간 표시 시작 */
  if (typeof startLoadingSynthFrame === 'function') startLoadingSynthFrame();
  loadingRotatorId = setInterval(() => {
    if (loadingMsgIndex < 6) {
      loadingMsgIndex += 1;
      updateLoadingMessage(loadingMsgIndex);
    }
  }, 6000);
}

function stopLoadingMessageRotator() {
  if (loadingRotatorId) {
    clearInterval(loadingRotatorId);
    loadingRotatorId = null;
  }
  /* v3: 합성 프레임 완료 표시 */
  if (typeof completeLoadingSynthFrame === 'function') completeLoadingSynthFrame();
}

function updateLoadingMessage(idx) {
  const el = document.getElementById('loading-message');
  if (!el) return;
  const safeIdx = Math.max(0, Math.min(idx, LOADING_MESSAGES.length - 1));
  el.textContent = LOADING_MESSAGES[safeIdx];
  loadingMsgIndex = safeIdx;
}

function showLoadingOverlay(show) {
  const el = document.getElementById('loading-overlay');
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

function showErrorBox(show, msg, rawResponse) {
  const box = document.getElementById('error-box');
  const text = document.getElementById('error-message');
  const rawWrap = document.getElementById('error-raw-wrap');
  const rawEl = document.getElementById('error-raw');
  if (!box) return;
  if (show) {
    if (text && msg) text.textContent = msg;
    // raw 응답이 있으면 토글로 표시
    if (rawWrap && rawEl && rawResponse) {
      rawEl.textContent = typeof rawResponse === 'string'
        ? rawResponse.slice(0, 5000)  // 5KB 제한
        : JSON.stringify(rawResponse, null, 2).slice(0, 5000);
      rawWrap.hidden = false;
      rawWrap.open = false;
    } else if (rawWrap) {
      rawWrap.hidden = true;
    }
    box.classList.remove('hidden');
    // 로딩 오버레이 확실히 닫기
    showLoadingOverlay(false);
    stopLoadingMessageRotator();
  } else {
    box.classList.add('hidden');
    if (rawWrap) rawWrap.hidden = true;
  }
}

function hasExistingResult() {
  return !!window.currentResult;
}
