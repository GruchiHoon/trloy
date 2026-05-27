# TRLOY v3.4 (트로이)

> **"Trace, Merge, Prompt — 추적하고, 합치고, 명세로 바꿉니다."**
>
> *Trace your References, by 로이에유*

TRLOY는 여러 레퍼런스 사이트의 디자인 무드를 분석해 **하나의 합성된 DESIGN.md**로 추출하는 도구입니다. 단일 사이트가 아니라 여러 사이트의 무드를 한 번에 합쳐서 처리하고, 결과물은 `DESIGN.md` · `Figma Make` · `Stitch` · `Cursor Rules` · `Claude Code` 등 다양한 형태로 동시에 내보낼 수 있어요.

---

## v3.32 → v3.4 변경 이력

### 레이아웃 재정비 — 카탈로그 통합

C 섹션(9카드) · 모달 상세보기 · E 버튼 · P3 프롬프트 패널을 모두 삭제하고, **P2 카탈로그 하나로 통합**했습니다.

| 삭제 대상 | 영향 파일 |
|---|---|
| C 섹션 (9카드 + 3그룹) | `index.html`, `05-render.js`, `01-config.js` (CARD_META/CARD_GROUPS) |
| C 섹션 모달 (CARD_MODAL_BUILDERS 9개) | `06-modal.js` |
| E 버튼 (5버튼) | `index.html`, `07-export.js` (bindExportButtons), `css/e-section.css` (삭제) |
| P3 AI 프롬프트 패널 | `index.html`, `07-export.js` (renderPromptPanel), `css/v31-modules.css` |
| 이미지 무드 (imageMood) | `prompts.js` (스키마), `07-export.js` (DESIGN.md §10), `06-modal.js` |
| `css/section-c.css` | 파일 삭제 |
| `css/e-section.css` | 파일 삭제 |

### 카탈로그 보강

| 항목 | 내용 | 파일 |
|---|---|---|
| **섹션 넘버링 통일** | `Section 01 / Colors` 형식으로 전 섹션 통일 | `12-preview.js` |
| **영역 내용 요약** | 섹션 제목 아래 1~2문장 영문 요약 (API summary 필드) | `12-preview.js`, `prompts.js` |
| **📋 복사 버튼** | 모든 섹션 헤더 우측에 복사 버튼 → 해당 토큰 클립보드 복사 | `12-preview.js` |
| **폰트명 크게 강조** | Typography 섹션 상단에 폰트명 32px 렌더링 (렌더 실패 대비) | `12-preview.js` |
| **Forms 메타 텍스트** | height/padding/radius 수치 표시 | `12-preview.js` |
| **Depth shadow value** | 그림자 카드 아래 CSS 값 텍스트 표시 | `12-preview.js` |
| **Spacing layout meta** | 바 차트 아래 grid/baseUnit/gutter/maxWidth key-value 행 | `12-preview.js` |
| **아이콘 섹션 (09)** | style/weight/rounding + 라이브러리 + import 코드 | `12-preview.js` |
| **규칙 섹션 (11)** | 마지막 섹션, 2컬럼 Do's/Don'ts | `12-preview.js` |
| **catAccent 명도 보정** | 라이트/다크 배경에서 넘버링 안 보이는 문제 해결 | `12-preview.js` |

### 데이터 구조 변경

| 항목 | 변경 |
|---|---|
| `prompts.js` | `imageMood` 스키마 삭제 |
| `prompts.js` | `sectionSummaries` 객체 추가 (11개 섹션별 영문 요약) |
| `01-config.js` | `CARD_META`, `CARD_GROUPS` 삭제 |

### 파일 구조 (v3.4)

```
HTML 1 + CSS 8 + JS 13 + design-ref/ (22개 DESIGN.md + index.json) + README
```

- CSS: base, empty-state, modal, section-b, settings, sticky, v3-upgrades, v31-modules
- JS: 01-config, 02-input, 03-analyze, 04-thumio, 05-render, 06-modal, 07-export, 08-snippets, 09-settings, 10-app, 11-drafts, 12-preview, prompts

---

## v2 → v3.3 변경 이력

### 신규 기능

| 코드명 | 기능 | 관련 파일 |
|---|---|---|
| **P1** | 다중 임시저장 (최대 10슬롯, localStorage). 결과를 저장하고 불러오기 가능. 설정 화면에서 저장 데이터 전체 삭제. | `11-drafts.js`, `index.html`, `v31-modules.css` |
| **P2** | 라이브 프리뷰 (iframe srcdoc). 합성된 토큰으로 렌더링된 실물 프리뷰를 결과 하단에 표시. wireframe.html 다운로드 지원. postMessage로 토큰 인라인 편집. | `12-preview.js`, `index.html`, `v31-modules.css` |
| **P3** | AI 프롬프트 패널 (5탭: DESIGN.md / Figma Make / Cursor Rules / Claude Code / Stitch v2). 결과 하단에 탭 전환 가능한 프롬프트 패널. 복사 버튼 포함. | `07-export.js`, `index.html`, `v31-modules.css` |
| **P5** | FRLOY .md 가져오기. 빈 상태에서 📂 버튼으로 FRLOY에서 내보낸 .md 파일을 textarea에 가져오기. | `10-app.js`, `index.html`, `v31-modules.css` |

### 레이아웃 변경

| 영역 | v2 | v3.2 |
|---|---|---|
| 결과 전체 구조 | B(정체성) + C(토큰) 2열 사이드바이사이드 | **D안 풀너비 스택**: B → C → 프리뷰 → 프롬프트 수직 배치 |
| C 섹션 카드 그리드 | 단일 `#card-grid` (3×3) | **3그룹**: Visual foundation / Structure / Expression 각각 3카드 |
| E 섹션 (출력 버튼) | 4버튼 (DESIGN.md · Figma Make · Stitch · 무드보드) | **5버튼** (DESIGN.md · AI 프롬프트 · Figma Make · PM 브리프 · 무드보드) |
| 빈 상태 | 단순 헤드라인 + textarea | 태그 라벨 + 2줄 헤드라인 (개별 모션) + 저장된 분석 카드 리스트 |
| 무드보드 출력 | 직접 PNG 다운로드 | **모달 미리보기** → PNG 다운로드 |
| 카드 클릭 힌트 | 없음 | **expand 아이콘** (hover 시 표시, 클릭 시 모달 확대 암시) |

### 데이터 구조 변경

| 항목 | v2 | v3.2 |
|---|---|---|
| `CARD_META` | `{ id, key, title, hint }` | `{ id, key, title, hint, group }` — `group` 속성 추가 (`visual` / `structure` / `expression`) |
| `CARD_GROUPS` | 없음 | 신규 상수: `[{ key, label, ids }]` 3그룹 정의 |
| 드래프트 관련 상수 | 없음 | `STORAGE_KEY_DRAFTS`, `DRAFT_MAX_SLOTS(10)`, `DRAFT_RESULT_MAX_KB(400)` |

### UI 변경

| 항목 | v2 | v3.2 |
|---|---|---|
| sticky 헤더 | 새 분석 · 합성 과정 · 편집 · 설정 | **저장** · 새 분석 · 합성 과정 · 편집 · 설정 |
| 로딩 오버레이 | 스피너 + 메시지 텍스트 | 스피너 + 메시지 + **합성 프레임 실시간 4단계 표시** (1.공통 추출 → 2.차이 식별 → 3.우선순위 → 4.충돌 해소) |
| 힌트 컬러 | `--color-success` (녹색) | `--color-terracotta` (테라코타 통일) |
| 카드 컬러 표시 | 상위 4색, hex만 | **상위 5색**, hex + role 표시 |

### 삭제된 기능 (v3.11 → v3.2)

| 항목 | 사유 |
|---|---|
| P4 이용가이드 (`?` 버튼, 가이드 모달, 코치마크 오버레이, `13-guide.js`) | UI 간소화. 파일·HTML·CSS·JS·상수 전체 제거. |
| P5 섹션 매핑 패널 ("섹션 매핑 (FRLOY 연동)" 접이식 영역) | 미완성 기능. HTML·CSS·JS 이벤트 바인딩 전체 제거. FRLOY .md 가져오기(📂 버튼)는 유지. |

### 코드 품질

| 항목 | v2 | v3.2 |
|---|---|---|
| JS 문법 | ES6+ (const/let, arrow, template literal, optional chaining) | **ES6+ 동일 유지**. v3.11에서 ES5로 다운그레이드된 파일들을 전부 ES6+로 재작성. |
| `var` 사용 | 0건 | 0건 |
| 코드 가독성 | 주석·줄바꿈 충분 | V2 수준 유지. v3.11의 한 줄 압축 패턴 복원. |

### v3.2.1 패치 — 컬러 분석 프롬프트 강화 (2026-04-21)

| 항목 | 변경 내용 | 관련 파일 |
|---|---|---|
| **컬러 분석 절차** | 기존 3줄 규칙 → **강제 3단계 사고 절차(STEP A/B/C)**로 전면 재작성. 스크린샷을 UI 영역과 콘텐츠 영역으로 먼저 분리한 뒤 UI 영역에서만 브랜드 컬러를 추출하도록 강제. | `prompts.js` |
| **Few-shot 예시 추가** | 기존 SaaS 예시(Toss+Linear)에 더해 **콘텐츠 플랫폼 컬러 판단 예시**(SOOP) 추가. ❌ 잘못된 분석 / ✅ 올바른 분석을 JSON 대비로 제시. | `prompts.js` |
| **대상 문제** | 스트리밍·커머스·뉴스 등 UGC 기반 플랫폼에서 콘텐츠 썸네일·배너의 색을 브랜드 컬러로 오인하는 현상 (예: SOOP 분석 시 KBO 배너의 빨간색을 accent로 채택) | — |

**변경 상세 — STEP A/B/C 절차:**

- **STEP A** — 스크린샷을 UI 영역(로고, GNB, 사이드바, CTA, 배지)과 콘텐츠 영역(썸네일, 배너, 외부 로고, 프로필, 영상 프레임)으로 분리. 콘텐츠 영역의 색은 `colorPalette`에 절대 넣지 않도록 강제.
- **STEP B** — UI 영역에서 accent/primary 후보 결정. 로고 색상 1순위 → 네비게이션 반복 색 2순위 → 도메인 기반 브랜드 교차 검증. 구체적 예시(SOOP: 시안 블루 로고 → accent, 빨간 KBO 배너 → 무시) 포함.
- **STEP C** — 5색 팔레트 완성. 기존 규칙(hex 정확도, 의미론적 역할) 유지.

**프롬프트 크기 변화:** 10,484B → 13,711B (+3,227B). 프롬프트 캐싱 구조 변경 없음. 배포 후 첫 분석에서 캐시가 새로 쓰여지고 두 번째부터 할인 적용.

### v3.3 — DESIGN.md Ground Truth 자동 주입 (2026-04-21)

| 항목 | 변경 내용 | 관련 파일 |
|---|---|---|
| **`design-ref/` 폴더 신규** | getdesign.md에서 선별한 22개 브랜드의 DESIGN.md 원본 파일을 정적 리소스로 내장. `index.json`으로 도메인 → 파일명 매핑. | `design-ref/` |
| **DESIGN.md 자동 fetch** | `buildUserContent()`가 URL 도메인을 `index.json`과 대조. 매칭 시 `fetch()`로 DESIGN.md 전문을 읽어 Claude 메시지에 주입. 9개 섹션(컬러·타이포·컴포넌트·레이아웃·깊이·규칙·반응형·Agent Prompt) 모두 포함. | `03-analyze.js` |
| **브랜드 컬러 Lookup (fallback)** | 57개 브랜드의 accent·bg·text 컬러를 정적 데이터로 유지. `design-ref/`에 DESIGN.md가 없는 브랜드는 이 컬러 힌트를 fallback으로 사용. | `01-config.js` |
| **프롬프트 규칙 강화** | STEP B 0번 규칙을 "DESIGN.md 전문 → 컬러 힌트 → 스크린샷" 3단계 우선순위로 확장. 다중 합성 시 ground truth 브랜드를 base로 삼는 지시 추가. | `prompts.js` |

**우선순위 (3단계 fallback):**

1. `design-ref/` DESIGN.md 전문 (22개 브랜드 — 9개 섹션 모두 포함)
2. `BRAND_COLOR_LOOKUP` 컬러 힌트 (57개 브랜드 — accent·bg·text만)
3. 스크린샷만으로 분석 (위 두 가지에 해당 없는 URL)

**design-ref/ 등록 브랜드 (22개):** Airbnb, Apple, BMW, Cursor, Ferrari, Figma, IBM, Lamborghini, Linear, Mastercard, Meta, Miro, Nike, Notion, NVIDIA, Pinterest, Shopify, SpaceX, Spotify, Starbucks, Tesla, Uber

**브랜드 추가 방법:** `.md` 파일을 `design-ref/`에 넣고 `index.json`에 `"도메인": "파일명"` 한 줄 추가.

**사용자 경험 변화:** 없음. URL 입력 → 분석 버튼 클릭의 기존 플로우 유지. 내부적으로 분석 정확도가 향상됨.

**토큰 비용 영향:** DESIGN.md 1개당 약 1,500~2,500 입력 토큰 추가 (약 20~40원/회). 6,000자 초과 시 자동 잘림.

### v3.32 — getdesign.md 참고 Preview 화면 전면 개편 (2026-04-21)

getdesign.md(https://getdesign.md/)의 프리뷰 화면을 레퍼런스로, TRLOY의 결과 화면을 전면 개편.

#### 카탈로그 9섹션 (기존 랜딩 시안 프리뷰 → 토큰 카탈로그로 교체)

| # | 섹션 | 내용 |
|---|---|---|
| 01 | Colors | Brand / Text & Semantic 그룹 분리 스와치 (이름 + hex + role) |
| 02 | Typography | 위계별 실물 크기 렌더링 + 메타 정보 (letterSpacing, textTransform 포함) |
| 03 | Buttons | variant별 실물 버튼 렌더링 |
| 04 | Cards | 분석된 padding/radius/shadow 실물 적용 |
| 05 | Forms | Default/Placeholder 상태별 인풋 |
| 06 | Spacing | 간격 눈금 바 시각화 |
| 07 | Border Radius | 단계별 둥근 사각형 |
| 08 | Depth | 단계별 그림자 카드 |
| 09 | Responsive | 브레이크포인트 테이블 + 크기별 카드 |

#### 히어로 + 내비

- 히어로 타이틀: "Design Token Catalog of **{브랜드명}**" (accent 컬러 강조)
- 히어로 CTA: 분석된 버튼 variant 실물 2개 배치
- 카탈로그 내비: TRLOY 로고 + 섹션 앵커 링크 5개 (scrollIntoView 방식)
- 다중 레퍼런스: 3개까지 표시, 4개 이상이면 "Toss + Linear + 3 more" 축약

#### 탭 시스템

| 탭 | 내용 |
|---|---|
| Live Preview | 카탈로그 9섹션 시각 렌더링 |
| DESIGN.md | 마크다운 텍스트 원문 |
| Figma Make | Figma Make용 프롬프트 |
| Cursor Rules | .cursorrules 파일 내용 |
| Claude Code | Claude Code 실행 프롬프트 |
| Stitch v2 | Stitch v2용 프롬프트 |

- 각 탭에 SVG 인라인 아이콘 배치
- Light/Dark 모드 토글 (Live Preview 탭에서만 작동)
- 텍스트 탭: 파일명 표시 + 복사 버튼 (텍스트 영역 내부 헤더)

#### iframe 제거 → div 직접 렌더링

- `<iframe>` → `<div class="catalog-embed">` 교체
- 스크롤 통합 (페이지 스크롤 하나로 카탈로그까지 자연스럽게 이어짐)
- CSS scoping: 모든 카탈로그 CSS를 `.catalog-embed` 하위로 한정 (메인 UI에 영향 0)
- 다운로드 시에만 완전한 HTML 문서(`<!DOCTYPE>`, `<head>`, `<body>`) 별도 생성

#### 버튼 색 자동 반전

- `_adaptButton()`, `_adaptColor()`, `_invertHex()` 함수 추가
- 라이트/다크 배경에서 버튼 텍스트/테두리가 대비 부족하면 명도 자동 반전
- Ghost 버튼(transparent + border 없음)에 자동 테두리 추가
- 다크 스와치에 밝은 테두리 자동 표시

#### JSON 스키마 풀 확장 (하위 호환)

기존 키를 100% 유지하면서 6개 새 키만 추가. 기존 코드(`05-render.js`, `07-export.js`, `08-snippets.js`)가 새 키를 모르면 무시할 뿐 깨지지 않음.

| 새 키 | 위치 | 내용 |
|---|---|---|
| `colorPalette.brand[]` | colorPalette 안 | `{ name, hex, role, meaning }` — 이름 있는 브랜드 컬러 그룹 |
| `colorPalette.semantic[]` | colorPalette 안 | `{ name, hex, role, meaning }` — error/warning/info 기능 컬러 |
| `typography.scale[]` | typography 안 | `{ role, family, size, weight, lineHeight, letterSpacing, textTransform }` — 4~10단계 유동적 |
| `components.buttonVariants[]` | components 안 | `{ name, bg, text, border?, padding, radius, weight }` — 2~5개 버튼 변형 |
| `layout.spacingScale[]` | layout 안 | 숫자 배열 (px) — 간격 눈금 |
| `layout.radiusScale[]` | layout 안 | 문자열 배열 — border-radius 단계 |

#### DESIGN.md 출력 보강

- Brand Colors / Semantic Colors 테이블 추가
- Full Typography Scale 테이블 추가 (role, letterSpacing, textTransform 포함)
- Button Variants 섹션 추가
- spacingScale / radiusScale 출력 추가

#### 기타 변경

- "● 토큰 카탈로그" → "Preview" (28px)
- 브라우저 크롬 바 (●●●) 삭제
- `btn-download-wireframe` → `btn-download-catalog`
- P3 프롬프트 패널 렌더링 비활성화 (P2 탭 시스템으로 통합)
- 카드 padding 0px → 최소 16px fallback
- 앵커 링크: scrollIntoView 방식 (TRLOY History API popstate 충돌 해결)
- 텍스트 탭 max-height 제거 (콘텐츠에 맞게 자동 확장)

**변경 파일:** `prompts.js`, `12-preview.js`(전면 재작성), `07-export.js`, `05-render.js`, `10-app.js`, `index.html`, `v31-modules.css`, `sticky.css`

**변경 없는 파일:** `01-config.js`, `02-input.js`, `03-analyze.js`, `04-thumio.js`, `06-modal.js`, `08-snippets.js`, `09-settings.js`, `11-drafts.js`, CSS 8개, design-ref/ 전체

---

## 기술 스택

- **프레임워크 없음** — 순수 HTML + CSS + Vanilla JS
- **AI 분석** — Claude Sonnet 4.6 브라우저 직접 호출 (`anthropic-dangerous-direct-browser-access`)
- **프롬프트 캐싱** — system 필드에 `cache_control: { type: 'ephemeral' }`
- **스크린샷** — Cloudflare Workers 프록시 → SnapRender (v2에서 Thum.io 직접 호출 → 프록시로 전환)
- **이미지 합성** — `html2canvas` CDN (무드보드 PNG)
- **API 키** — 브라우저 `localStorage` 에 저장 (사용자 본인 키)
- **임시저장** — 브라우저 `localStorage` (최대 10슬롯, 400KB/슬롯)
- **배포** — GitHub Pages (정적 호스팅)

---

## 폴더 구조

```
trloy/
├── index.html                       # 메인 진입점 (3가지 상태 + 모달)
├── README.md
├── design-ref/                      # v3.3: DESIGN.md Ground Truth (22개 브랜드)
│   ├── index.json                   # 도메인 → 파일명 매핑
│   ├── airbnb.md                    # Airbnb DESIGN.md 전문
│   ├── spotify.md                   # Spotify DESIGN.md 전문
│   └── ... (22개 브랜드)
├── css/
│   ├── base.css                     # CSS 변수 + 리셋 + 타이포
│   ├── empty-state.css              # 빈 상태 (v3 모션 + 태그 + 2줄 헤드라인)
│   ├── settings.css                 # API 키 설정
│   ├── sticky.css                   # sticky 헤더 + 합성 노트
│   ├── e-section.css                # E 5버튼 상단 고정
│   ├── section-b.css                # B 정체성 (풀너비)
│   ├── section-c.css                # C 토큰 카드 기본 스타일
│   ├── modal.css                    # 디테일 모달 + 프롬프트 변환 모달
│   ├── v3-upgrades.css              # v3 신규: 로딩 합성 프레임 + 카드 밀도 + expand 아이콘
│   └── v31-modules.css              # v3 신규: P1 저장 카드 · P2 Preview · 탭 시스템
└── js/
    ├── 01-config.js                 # 상수 · storage · API 설정 · CARD_GROUPS · 브랜드 컬러 Lookup (v3.3)
    ├── prompts.js                   # 분석 시스템 프롬프트 (§12D.2 + v3.2.1 컬러 강화 + v3.3 ground truth)
    ├── 02-input.js                  # URL / 이미지 / 드래그드롭
    ├── 04-thumio.js                 # 스크린샷 프록시 (Cloudflare Workers)
    ├── 08-snippets.js               # Tailwind config + CSS variables 변환
    ├── 06-modal.js                  # 모달 제어 (9카드 + 프롬프트 변환)
    ├── 07-export.js                 # 출력물 6종 + P3 프롬프트 패널 렌더
    ├── 09-settings.js               # API 키 UI
    ├── 03-analyze.js                # Claude API 호출 ⭐ + 브랜드 Ground Truth 주입 (v3.3)
    ├── 05-render.js                 # 결과 렌더 (sticky · B · C 3그룹 · synth frame)
    ├── 11-drafts.js                 # P1: 다중 임시저장 CRUD + UI
    ├── 12-preview.js                # P2: Preview — div 직접 렌더링 카탈로그 (v3.32)
    └── 10-app.js                    # 초기화 + 이벤트 바인딩 (P1~P3, P5)
```

---

## 로컬에서 실행해보기

별도의 빌드 도구가 필요 없습니다. 아무 정적 서버로든 `index.html`을 서빙하면 됩니다.

**macOS / Linux**
```bash
cd trloy
python3 -m http.server 8080
# → http://localhost:8080 에서 열기
```

**Node.js**
```bash
npx http-server trloy -p 8080
```

**VS Code**
- Live Server 확장을 설치한 뒤 `index.html` 우클릭 → *Open with Live Server*

> `file://` 프로토콜로 직접 열어도 기본 기능은 동작하지만, 이미지 리사이징 canvas의 일부 브라우저 보안 정책 때문에 HTTP 서버 사용을 권장합니다.

---

## Anthropic API 키 받는 법

1. [https://console.anthropic.com](https://console.anthropic.com) 에 가입합니다.
2. 결제 수단을 등록하거나 무료 크레딧이 남아있는지 확인합니다.
3. 좌측 메뉴 **API Keys** 로 이동해 **Create Key** 를 눌러 새 키를 발급받습니다.
4. 발급된 `sk-ant-...` 키를 복사합니다.
5. TRLOY 첫 실행 화면에서 **API 키 설정** 입력창에 붙여넣고 *저장* 을 누릅니다.

키는 이 브라우저의 `localStorage`에만 저장됩니다. 서버로 전송되지 않아요. 기기를 옮기면 다시 입력해야 합니다.

### 요금 대략 감

- TRLOY는 한 번 분석에 Claude Sonnet 4.6을 1회 호출합니다.
- 스크린샷·이미지는 입력 토큰에, 합성 결과(JSON)는 출력 토큰에 잡힙니다.
- **프롬프트 캐싱**이 켜져 있어 시스템 프롬프트 부분은 두 번째 호출부터 할인됩니다.
- 한 번 분석 비용은 보통 몇 센트 수준이지만 이미지 장수에 따라 달라집니다. 자세한 요금은 Anthropic Console의 Usage 탭에서 확인하세요.

---

## 사용법 (빠른 가이드)

1. **URL 입력** — textarea에 사이트 URL을 붙여넣습니다. 여러 개는 줄바꿈으로 구분하세요.
2. **자연어 의도** — "Toss 위주로 차분하게" 같은 힌트를 함께 쓰면 가중치에 반영됩니다.
3. **이미지 첨부** (선택) — 드래그 드롭하거나 📎 버튼으로 추가.
4. **FRLOY .md 가져오기** (선택) — 📂 버튼으로 FRLOY에서 내보낸 .md 파일을 가져올 수 있습니다.
5. **레퍼런스 분석** 클릭 → 20~40초 대기. 로딩 중 합성 프레임 4단계가 실시간으로 표시됩니다.
6. **결과 확인**
   - 상단 sticky에 **브랜드명** + `저장` + `합성 과정 ▾` 토글.
   - E 5버튼으로 즉시 출력 (DESIGN.md · AI 프롬프트 · Figma Make · PM 브리프 · 무드보드).
   - B 섹션에서 정체성 검증 (무드 타이틀 · 분위기 · 키워드 · 3블록: 디자인 컨셉·철학 / 감정·타겟·업종 / 포지션).
   - C 섹션에서 추출된 토큰 3그룹 확인 (Visual foundation / Structure / Expression). 카드 hover 시 expand 아이콘 표시 → 클릭하면 모달로 디테일.
   - 프리뷰 섹션에서 토큰이 적용된 실물 HTML 확인. wireframe.html 다운로드 가능.
   - AI 프롬프트 패널에서 5탭 (DESIGN.md / Figma Make / Cursor Rules / Claude Code / Stitch v2) 전환하며 복사.
7. **저장** — sticky 헤더의 `저장` 버튼으로 최대 10개까지 분석 결과 저장. 빈 상태로 돌아가면 저장된 분석 카드 리스트가 표시됩니다.
8. **재분석** — *편집* 버튼으로 입력을 수정하고 다시 분석. 기존 결과는 스켈레톤으로 교체됩니다.

---

## 결과 화면 구조 (D안 풀너비 스택)

```
┌─────────────────────────────────────────────────────────┐
│  TRLOY  브랜드명    저장  새 분석  합성 과정▾  편집  ⚙  │  ← sticky 헤더
├─────────────────────────────────────────────────────────┤
│  [합성 노트 패널 — 4단계: 공통추출/차이/우선순위/충돌]   │  ← 토글 (디폴트 접힘)
├─────────────────────────────────────────────────────────┤
│  E: DESIGN.md · AI프롬프트 · Figma Make · PM브리프 · 무드│  ← 출력 5버튼
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ■ B 섹션: 정체성 (풀너비)                                │
│  Vibe 타이틀 · 분위기 · 키워드 칩 · 컬러 스와치           │
│  [1 디자인 컨셉·철학] [2 감정·타겟·업종] [3 포지션]       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● 추출된 디자인 토큰                                     │
│                                                         │
│  VISUAL FOUNDATION                                       │
│  ┌─ 01 컬러 ──┐ ┌─ 02 타이포 ──┐ ┌─ 05 깊이 ───┐       │
│  └────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
│  STRUCTURE                                               │
│  ┌─ 03 컴포넌트┐ ┌─ 04 레이아웃┐ ┌─ 07 반응형 ──┐       │
│  └────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
│  EXPRESSION                                              │
│  ┌─ 06 규칙 ──┐ ┌─ 08 이미지무드┐ ┌─ 09 아이콘 ──┐      │
│  └────────────┘ └──────────────┘ └─────────────┘      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ● 프리뷰 (iframe — 토큰 적용 실물 HTML)                  │
│  [wireframe.html 다운로드]                                │
├─────────────────────────────────────────────────────────┤
│  ● AI 프롬프트                                            │
│  [DESIGN.md] [Figma Make] [Cursor Rules] [Claude Code]  │
│  [Stitch v2]                                             │
│  ┌──────────────────────────────────────────────┐       │
│  │  (프롬프트 본문 — pre)                         │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## GitHub Pages로 배포하기

1. GitHub에서 새 저장소 (예: `trloy`) 를 만듭니다.
2. 이 폴더의 파일들을 모두 저장소 루트에 업로드합니다.
   - 웹에서 드래그&드롭으로 올려도 되고, 아래처럼 CLI로 올려도 됩니다.
     ```bash
     git init
     git add .
     git commit -m "v3.2"
     git branch -M main
     git remote add origin https://github.com/<your-id>/trloy.git
     git push -u origin main
     ```
3. 저장소 **Settings → Pages**
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` / `/ (root)`
   - Save
4. 1~2분 기다리면 `https://<your-id>.github.io/trloy/` 에서 접속 가능합니다.
5. 첫 방문 시 API 키 설정 화면이 뜹니다. 본인 `sk-ant-...` 키를 입력하면 바로 사용할 수 있어요.

> 정적 파일만 올라가 있으므로 별도의 빌드 파이프라인·서버·환경 변수가 필요 없습니다.

---

## 주의사항

- **API 키는 본인만 쓰세요.** TRLOY는 클라이언트 사이드에서 Claude API를 직접 호출합니다. 다른 사람과 공유된 브라우저에는 키를 저장하지 마세요.
- **`anthropic-dangerous-direct-browser-access: true`** 헤더를 사용합니다. 이는 "브라우저에서 API 키가 노출된다는 것을 인지하고 있다"는 명시적 확인으로, 친구 베타·사내 도구 규모에 적합합니다. 공개 서비스로 확장할 때는 서버사이드 프록시로 전환하세요.
- **CORS** — 일부 브라우저/네트워크에서 Anthropic API 직접 호출 시 에러가 날 수 있습니다. 문제가 생기면 Anthropic Console에서 API 키가 활성화된 상태인지 먼저 확인해주세요.
- **스크린샷 프록시** — Cloudflare Workers 기반 SnapRender 프록시를 사용합니다. 무료 플랜 한도 초과 시 자체 워커를 배포하거나 Thum.io 등 대체 서비스를 사용하세요.

---

## 라이선스

이 저장소의 코드는 지예×Claude의 개인 작업물입니다. 내부 사용·학습용으로 자유롭게 참고하되, 상용 배포 전에는 API 키 처리·요금 정책·보안을 다시 검토해주세요.
