/* =================================================
   TRLOY js/04-thumio.js  (v2 · 2026-04-17)
   스크린샷 캡처 — Cloudflare Workers 프록시 → SnapRender

   [v1.1 → v2 변경점]
   Thum.io (썸네일 품질) → Cloudflare Workers 프록시 + SnapRender (고품질)
   - Workers가 SnapRender API 키를 서버에 은닉
   - 쿠키 배너·광고 자동 제거
   - SPA/JS 렌더링 완전 지원
   - 캐시 히트 = 쿼터 무소모
   ================================================= */

const SCREENSHOT_FETCH_TIMEOUT = 30000;  // 30초 (SnapRender 평균 5~10초)
const SCREENSHOT_MAX_RETRIES = 1;        // 1회 재시도 (SnapRender는 안정적)
const SCREENSHOT_RETRY_DELAY = 2000;     // 2초 대기

/**
 * 프록시 URL 생성
 * 예: https://trloy-screenshot.chjy21chjy21.workers.dev/screenshot?url=https://toss.im
 */
function buildScreenshotUrl(url) {
  return SCREENSHOT_PROXY_BASE + '?url=' + encodeURIComponent(url);
}

/* ── 하위 호환: 기존 코드가 buildThumioUrl을 호출할 경우 대비 ── */
const buildThumioUrl = buildScreenshotUrl;

/**
 * URL 배열 → 스크린샷 결과 배열
 * 각 결과: { url, shotUrl, ok, base64?, mediaType?, reason? }
 *
 * - 각 URL은 병렬 실행, 개별 실패는 건너뜀 (ok: false)
 * - 전체 캡처에 SCREENSHOT_GLOBAL_TIMEOUT(90초) 적용
 *   → 90초 내 완료된 것만 사용, 미완료 URL은 건너뜀
 */
const SCREENSHOT_GLOBAL_TIMEOUT = 90000; // 전체 90초 (SnapRender가 Thum.io보다 느릴 수 있음)

async function captureScreenshots(urls) {
  if (!urls || urls.length === 0) return [];

  const tasks = urls.map(async (url) => {
    const shotUrl = buildScreenshotUrl(url);
    const okFormat = /^https?:\/\/.+/.test(url);
    if (!okFormat) {
      return { url, shotUrl, ok: false, reason: 'URL 형식이 올바르지 않아요.' };
    }

    try {
      const { base64, mediaType } = await fetchScreenshotAsBase64(shotUrl);
      return { url, shotUrl, ok: true, base64, mediaType };
    } catch (err) {
      console.warn(`스크린샷 실패: ${url}`, err);
      return {
        url,
        shotUrl,
        ok: false,
        reason: err?.message || '스크린샷 캡처 실패',
      };
    }
  });

  // 전체 타임아웃 — 90초 내 완료된 결과만 수집
  const globalTimer = new Promise((resolve) => {
    setTimeout(() => resolve('__TIMEOUT__'), SCREENSHOT_GLOBAL_TIMEOUT);
  });

  const results = [];
  await Promise.allSettled(
    tasks.map(async (task, idx) => {
      const result = await Promise.race([task, globalTimer]);
      if (result === '__TIMEOUT__') {
        results[idx] = {
          url: urls[idx],
          shotUrl: buildScreenshotUrl(urls[idx]),
          ok: false,
          reason: '스크린샷 수집 시간 초과 (90초)',
        };
      } else {
        results[idx] = result;
      }
    })
  );

  return results.filter(Boolean);
}

/**
 * Workers 프록시에서 이미지를 받아 base64로 변환
 * - Workers는 Access-Control-Allow-Origin: * 를 보냄 (CORS OK)
 * - 최대 1회 재시도
 */
async function fetchScreenshotAsBase64(shotUrl) {
  let lastErr = null;

  for (let attempt = 0; attempt <= SCREENSHOT_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), SCREENSHOT_FETCH_TIMEOUT);

      const res = await fetch(shotUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        mode: 'cors',
      });
      clearTimeout(timerId);

      if (!res.ok) {
        // Workers 프록시가 JSON 에러를 반환할 수 있음
        let errMsg = `스크린샷 HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch (_) { /* noop */ }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('응답이 이미지가 아니에요. 프록시 설정을 확인해주세요.');
      }

      const base64 = await blobToBase64(blob);
      const mediaType = normalizeMediaType(blob.type);
      return { base64, mediaType };
    } catch (err) {
      lastErr = err;
      if (err?.name === 'AbortError') {
        lastErr = new Error('스크린샷 응답이 너무 느려요 (30초 초과).');
      }
      if (attempt < SCREENSHOT_MAX_RETRIES) {
        await wait(SCREENSHOT_RETRY_DELAY);
      }
    }
  }

  throw lastErr || new Error('스크린샷 캡처 실패');
}

/* ── 하위 호환: 기존 코드가 fetchThumioAsBase64를 호출할 경우 대비 ── */
const fetchThumioAsBase64 = fetchScreenshotAsBase64;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const comma = result.indexOf(',');
      if (comma === -1) {
        reject(new Error('base64 변환 실패'));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(blob);
  });
}

function normalizeMediaType(type) {
  if (!type) return 'image/png';
  if (/jpeg|jpg/i.test(type)) return 'image/jpeg';
  if (/png/i.test(type)) return 'image/png';
  if (/webp/i.test(type)) return 'image/webp';
  if (/gif/i.test(type)) return 'image/gif';
  return 'image/png';
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
