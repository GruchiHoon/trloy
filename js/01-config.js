/* =================================================
   TRLOY js/01-config.js
   전역 상수 · API 설정 · 저장소 키
   ================================================= */

/* 저장소 키 — API 키는 localStorage(탭 공유), 결과는 sessionStorage(탭 독립) */
const STORAGE_KEY_API = 'trloy_anthropic_key';
const STORAGE_KEY_LAST = 'trloy_last_result';
const STORAGE_KEY_DRAFTS = 'trloy_drafts';

/* P1: 임시저장 설정 */
const DRAFT_MAX_SLOTS = 10;
const DRAFT_RESULT_MAX_KB = 400;

/* =================================================
   Claude API 설정
   ─────────────────────────────────────────────────
   모델 ID는 Anthropic 공식 docs의 표기를 따른다.
   참조: https://platform.claude.com/docs/en/about-claude/models/overview
         (확인일: 2026-04-22)

   현행 주요 모델 (2026-04 기준):
   ┌──────────────┬──────────────────────────────┬──────────────────┐
   │ 모델         │ API ID (= alias)             │ 단가(in/out $)   │
   ├──────────────┼──────────────────────────────┼──────────────────┤
   │ Opus 4.7     │ claude-opus-4-7              │ $5 / $25 per MTok│
   │ Sonnet 4.6   │ claude-sonnet-4-6   ← 사용중 │ $3 / $15 per MTok│
   │ Haiku 4.5    │ claude-haiku-4-5-20251001    │ $1 / $5  per MTok│
   └──────────────┴──────────────────────────────┴──────────────────┘

   왜 Sonnet 4.6 인가:
   - TRLOY 1회 분석은 스크린샷 multi-image + 프롬프트 캐시된 system
     ~10KB + ground truth DESIGN.md 0~6KB + 출력 JSON 3~6k 토큰.
     품질/비용 균형이 가장 좋은 지점.
   - Opus 4.7 승격 시 건당 약 1.67배 비용, 품질 개선은 복잡한
     에이전틱 코딩 영역에서 두드러지며 TRLOY 작업엔 체감이 제한적.

   모델 교체 시 이 상수 한 줄만 바꾸면 된다. snapshot date가 붙은
   풀 ID(예: claude-haiku-4-5-20251001)는 pin이 필요할 때만 사용.
   Sonnet 4.6은 ID와 alias가 동일하므로 pin 여부 무관.
   ================================================= */
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_MAX_TOKENS = 8000;
const ANTHROPIC_VERSION = '2023-06-01';

/* 스크린샷 프록시 (Cloudflare Workers → SnapRender)
   v1.1까지: Thum.io 직접 호출 (썸네일 품질, API 키 불필요)
   v2: Cloudflare Workers 프록시 → SnapRender (고품질, API 키 서버 은닉)  */
const SCREENSHOT_PROXY_BASE = 'https://trloy-screenshot.chjy21chjy21.workers.dev/screenshot';

/* 이미지 리사이징 */
const IMAGE_MAX_WIDTH = 1280;
const IMAGE_JPEG_QUALITY = 0.85;

/* CARD_META / CARD_GROUPS — 삭제됨 (v3.4, C 섹션 카드 → 카탈로그 통합) */

/* 분석 시 사용자 안내 메시지 (§7.16 Agent log) */
const LOADING_MESSAGES = [
  '레퍼런스 스크린샷을 수집하고 있어요...',       // 0 — captureScreenshots
  '이미지를 최적화하고 있어요...',                 // 1 — buildUserContent
  'Claude에 분석을 요청했어요...',                 // 2 — API 호출 시작
  '공통 무드를 추출하고 있어요...',                // 3 — Claude 분석 중 (자동)
  '차이점을 식별하고 있어요...',                   // 4 — Claude 분석 중 (자동)
  '충돌을 해소하며 합성하고 있어요...',            // 5 — Claude 분석 중 (자동)
  '응답을 받았어요, 결과를 파싱하고 있어요...',    // 6 — parseClaudeResponse
  '결과를 화면에 배치하고 있어요...',              // 7 — renderResult
];

/* URL 감지 정규식 */
const URL_REGEX = /https?:\/\/[^\s,]+/g;

/* API 키 관리 헬퍼 */
function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY_API) || '';
  } catch (e) {
    return '';
  }
}

function setApiKey(key) {
  try {
    localStorage.setItem(STORAGE_KEY_API, key);
    return true;
  } catch (e) {
    return false;
  }
}

function clearApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY_API);
    return true;
  } catch (e) {
    return false;
  }
}

function validateApiKeyFormat(key) {
  if (!key || typeof key !== 'string') return false;
  return key.trim().startsWith('sk-ant-') && key.trim().length > 20;
}

/* =================================================
   브랜드 컬러 Lookup 테이블 (v3.2.1 — verified)
   출처: getdesign.md (VoltAgent/awesome-design-md) 실제 DESIGN.md 파일 기반
   ✅ = 실제 DESIGN.md 파일로 검증 완료
   ○ = README 설명 + 공개 브랜드 가이드 기반 (DESIGN.md 미확인)
   용도: URL 도메인 매칭 → Claude에 ground truth 컬러 힌트 주입
   ================================================= */
const BRAND_COLOR_LOOKUP = {
  /* ✅ AI & LLM — verified from DESIGN.md */
  'claude.ai':        { name: 'Claude',      accent: '#C96442', bg: '#F5F4ED', text: '#141413', note: 'Terracotta Brand on parchment canvas' },

  /* ○ AI & LLM — from README descriptions */
  'cohere.com':       { name: 'Cohere',      accent: '#39594D', bg: '#FFFFFF', text: '#1A1A1A', note: 'vibrant gradients, green-toned' },
  'elevenlabs.io':    { name: 'ElevenLabs',  accent: '#6366F1', bg: '#0A0A0A', text: '#FFFFFF', note: 'dark cinematic, audio-waveform' },
  'ollama.com':       { name: 'Ollama',      accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'terminal-first monochrome' },
  'replicate.com':    { name: 'Replicate',   accent: '#2563EB', bg: '#FFFFFF', text: '#111827', note: 'clean white code-forward' },
  'runwayml.com':     { name: 'RunwayML',    accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'cinematic dark media-rich' },

  /* ○ Developer Tools */
  'cursor.com':       { name: 'Cursor',      accent: '#7C5CFC', bg: '#0A0A0A', text: '#FFFFFF', note: 'gradient accent on dark' },
  'expo.dev':         { name: 'Expo',        accent: '#4630EB', bg: '#000020', text: '#FFFFFF', note: 'dark code-centric' },
  'linear.app':       { name: 'Linear',      accent: '#5E6AD2', bg: '#191A23', text: '#FFFFFF', note: 'ultra-minimal purple' },
  'lovable.dev':      { name: 'Lovable',     accent: '#9B59B6', bg: '#1A1A2E', text: '#FFFFFF', note: 'playful gradients' },
  'raycast.com':      { name: 'Raycast',     accent: '#FF6363', bg: '#0A0A0A', text: '#FFFFFF', note: 'vibrant gradient accents' },
  'vercel.com':       { name: 'Vercel',      accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'pure B&W precision, Geist font' },
  'warp.dev':         { name: 'Warp',        accent: '#01A4FF', bg: '#0E1117', text: '#FFFFFF', note: 'terminal dark block-based' },
  'superhuman.com':   { name: 'Superhuman',  accent: '#6C5CE7', bg: '#1A1A2E', text: '#FFFFFF', note: 'premium dark purple glow' },

  /* ○ Backend & DevOps */
  'clickhouse.com':   { name: 'ClickHouse',  accent: '#FADB14', bg: '#FFFFFF', text: '#1C1C1C', note: 'yellow-accented technical' },
  'hashicorp.com':    { name: 'HashiCorp',   accent: '#000000', bg: '#FFFFFF', text: '#000000', note: 'enterprise-clean B&W' },
  'mongodb.com':      { name: 'MongoDB',     accent: '#00ED64', bg: '#FFFFFF', text: '#1C2D38', note: 'green leaf branding' },
  'posthog.com':      { name: 'PostHog',     accent: '#F54E00', bg: '#151515', text: '#FFFFFF', note: 'playful hedgehog orange' },
  'sanity.io':        { name: 'Sanity',      accent: '#F36458', bg: '#FFFFFF', text: '#1A1A1A', note: 'red accent editorial' },
  'sentry.io':        { name: 'Sentry',      accent: '#E1567C', bg: '#1B1022', text: '#FFFFFF', note: 'pink-purple on dark' },
  'supabase.com':     { name: 'Supabase',    accent: '#3ECF8E', bg: '#1C1C1C', text: '#FFFFFF', note: 'dark emerald code-first' },
  'stripe.com':       { name: 'Stripe',      accent: '#635BFF', bg: '#FFFFFF', text: '#0A2540', note: 'signature purple gradients' },

  /* ✅ Productivity & SaaS — verified from DESIGN.md */
  'cal.com':          { name: 'Cal.com',     accent: '#242424', bg: '#FFFFFF', text: '#242424', note: 'monochromatic restraint, charcoal on white' },

  /* ○ Productivity & SaaS */
  'intercom.com':     { name: 'Intercom',    accent: '#0057FF', bg: '#FFFFFF', text: '#1A1A1A', note: 'friendly blue conversational' },
  'mintlify.com':     { name: 'Mintlify',    accent: '#0D9373', bg: '#FFFFFF', text: '#1A1A1A', note: 'green reading-optimized' },
  'notion.so':        { name: 'Notion',      accent: '#000000', bg: '#FFFFFF', text: '#37352F', note: 'warm minimal serif headings' },
  'resend.com':       { name: 'Resend',      accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'minimal dark monospace' },
  'zapier.com':       { name: 'Zapier',      accent: '#FF4A00', bg: '#FFFFFF', text: '#1A1A1A', note: 'warm orange illustration-driven' },

  /* ✅ Design & Creative — verified from DESIGN.md */
  'airtable.com':     { name: 'Airtable',    accent: '#1B61C9', bg: '#FFFFFF', text: '#181D26', note: 'Airtable Blue CTA, Haas font, positive tracking' },

  /* ○ Design & Creative */
  'figma.com':        { name: 'Figma',       accent: '#A259FF', bg: '#FFFFFF', text: '#1A1A1A', note: 'vibrant multi-color playful' },
  'framer.com':       { name: 'Framer',      accent: '#0055FF', bg: '#000000', text: '#FFFFFF', note: 'bold black-blue motion-first' },
  'miro.com':         { name: 'Miro',        accent: '#FFD02F', bg: '#FFFFFF', text: '#1A1A1A', note: 'bright yellow canvas' },
  'webflow.com':      { name: 'Webflow',     accent: '#146EF5', bg: '#FFFFFF', text: '#1A1A1A', note: 'blue polished marketing' },

  /* ✅ Fintech & Crypto — verified from DESIGN.md */
  'binance.com':      { name: 'Binance',     accent: '#F0B90B', bg: '#FFFFFF', text: '#1E2329', note: 'Binance Yellow on white+dark alternating, gold #FFD000 secondary' },

  /* ○ Fintech & Crypto */
  'coinbase.com':     { name: 'Coinbase',    accent: '#0052FF', bg: '#FFFFFF', text: '#0A0B0D', note: 'institutional trust blue' },
  'revolut.com':      { name: 'Revolut',     accent: '#0666EB', bg: '#FFFFFF', text: '#1A1A1A', note: 'sleek fintech gradient cards' },
  'wise.com':         { name: 'Wise',        accent: '#9FE870', bg: '#FFFFFF', text: '#163300', note: 'bright green friendly' },

  /* ✅ E-commerce & Retail — verified from DESIGN.md */
  'airbnb.com':       { name: 'Airbnb',      accent: '#FF385C', bg: '#FFFFFF', text: '#222222', note: 'Rausch Red singular accent, warm near-black text, 3-layer shadow' },
  'starbucks.com':    { name: 'Starbucks',   accent: '#00754A', bg: '#F2F0EB', text: '#1E3932', note: 'Green Accent CTA, cream canvas, House Green #1E3932 footer' },

  /* ○ E-commerce & Retail */
  'nike.com':         { name: 'Nike',        accent: '#111111', bg: '#FFFFFF', text: '#111111', note: 'monochrome Futura uppercase' },
  'shopify.com':      { name: 'Shopify',     accent: '#95BF47', bg: '#0A0A0A', text: '#FFFFFF', note: 'dark cinematic neon green' },

  /* ✅ Media & Consumer — verified from DESIGN.md */
  'apple.com':        { name: 'Apple',       accent: '#0071E3', bg: '#FFFFFF', text: '#1D1D1F', note: 'Apple Blue only chromatic color, SF Pro, black/white alternating sections' },
  'theverge.com':     { name: 'The Verge',   accent: '#3CFFD0', bg: '#131313', text: '#FFFFFF', note: 'Jelly Mint acid-green + Ultraviolet #5200FF, dark editorial canvas' },
  'vodafone.com':     { name: 'Vodafone',    accent: '#E60000', bg: '#FFFFFF', text: '#25282B', note: 'Vodafone Red non-negotiable, Signal Blue #3860BE links' },
  'wired.com':        { name: 'WIRED',       accent: '#057DBC', bg: '#FFFFFF', text: '#1A1A1A', note: 'Link Blue only accent in B&W, broadsheet density' },

  /* ○ Media & Consumer */
  'ibm.com':          { name: 'IBM',         accent: '#0F62FE', bg: '#FFFFFF', text: '#161616', note: 'Carbon blue structured' },
  'nvidia.com':       { name: 'NVIDIA',      accent: '#76B900', bg: '#1A1A1A', text: '#FFFFFF', note: 'green-black energy' },
  'pinterest.com':    { name: 'Pinterest',   accent: '#E60023', bg: '#FFFFFF', text: '#111111', note: 'red masonry image-first' },
  'spacex.com':       { name: 'SpaceX',      accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'stark B&W full-bleed' },
  'spotify.com':      { name: 'Spotify',     accent: '#1ED760', bg: '#121212', text: '#FFFFFF', note: 'Spotify Green on near-black cocoon' },
  'uber.com':         { name: 'Uber',        accent: '#000000', bg: '#FFFFFF', text: '#000000', note: 'bold B&W tight type urban' },

  /* ✅ Automotive — verified from DESIGN.md */
  'bmw.com':          { name: 'BMW',         accent: '#1C69D4', bg: '#FFFFFF', text: '#262626', note: 'BMW Blue interactive only, white canvas, dark hero photography sections' },
  'bugatti.com':      { name: 'Bugatti',     accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'velvet black canvas, zero color — only B&W + #999999 gray' },
  'ferrari.com':      { name: 'Ferrari',     accent: '#DC0000', bg: '#000000', text: '#FFFFFF', note: 'Ferrari Red extreme sparseness' },

  /* ○ Automotive */
  'lamborghini.com':  { name: 'Lamborghini', accent: '#D4A843', bg: '#000000', text: '#FFFFFF', note: 'gold on true black cathedral' },
  'tesla.com':        { name: 'Tesla',       accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF', note: 'radical subtraction near-zero UI' },
  'renault.com':      { name: 'Renault',     accent: '#FFCC33', bg: '#000000', text: '#FFFFFF', note: 'aurora gradients zero-radius' },
};

/**
 * URL에서 도메인을 추출하고 BRAND_COLOR_LOOKUP에서 매칭
 * @param {string} url
 * @returns {{ name, accent, bg, surface?, text, note } | null}
 */
function lookupBrandColors(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // 정확 매칭
    if (BRAND_COLOR_LOOKUP[hostname]) return BRAND_COLOR_LOOKUP[hostname];
    // 서브도메인 포함 매칭 (예: jobs.netflix.com → netflix.com)
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (BRAND_COLOR_LOOKUP[parent]) return BRAND_COLOR_LOOKUP[parent];
    }
    return null;
  } catch {
    return null;
  }
}
