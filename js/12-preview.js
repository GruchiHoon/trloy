/* =================================================
   TRLOY js/12-preview.js  (v3.32b)
   P2: Preview — div 직접 렌더링 (iframe 제거)

   구조:
   - _buildCatalogCSS(vars)  → scoped CSS 문자열
   - _buildCatalogBody(data, vars) → HTML 본문 조각
   - buildCatalogHTML(data, theme) → 완전한 HTML 문서 (다운로드용)
   - renderPreviewSection(data) → div.innerHTML 주입
   ================================================= */

/* ── 유틸 ── */
function _esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _isLight(hex) {
  if (!hex || hex.length < 7) return true;
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function _capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _swatchBorder(hex, bgIsLight) {
  if (!hex) return '1px solid rgba(0,0,0,0.08)';
  var light = _isLight(hex);
  if (bgIsLight && light) return '1px solid rgba(0,0,0,0.1)';
  if (!bgIsLight && !light) return '1px solid rgba(255,255,255,0.15)';
  return '1px solid transparent';
}

function _minPx(val, min) {
  if (!val) return min + 'px';
  var n = parseInt(val, 10);
  if (isNaN(n) || n < min) return min + 'px';
  return val;
}

function _invertHex(hex) {
  if (!hex || hex.length < 7) return '#888888';
  var r = 255 - parseInt(hex.slice(1, 3), 16);
  var g = 255 - parseInt(hex.slice(3, 5), 16);
  var b = 255 - parseInt(hex.slice(5, 7), 16);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function _adaptColor(color, bgIsLight, type) {
  if (!color || color === 'transparent') {
    if (type === 'bg') return 'transparent';
    if (type === 'border') return bgIsLight ? '1px solid #CCCCCC' : '1px solid #555555';
    return bgIsLight ? '#1A1A1A' : '#F0F0F0';
  }
  var colorIsLight = _isLight(color);
  if (bgIsLight !== colorIsLight) return color;
  return _invertHex(color);
}

function _adaptButton(v, bgIsLight) {
  var bg = v.bg || 'transparent';
  var text = v.text || '#FFFFFF';
  var border = v.border || '';

  if (bg === 'transparent') {
    text = _adaptColor(text, bgIsLight, 'text');
    if (!border) {
      border = bgIsLight ? '1px solid #CCCCCC' : '1px solid #555555';
    } else {
      var borderColor = border.replace(/.*solid\s*/, '').trim();
      if (borderColor) {
        border = '1px solid ' + _adaptColor(borderColor, bgIsLight, 'text');
      }
    }
  } else {
    if (_isLight(bg) === _isLight(text)) {
      text = _invertHex(text);
    }
    if (bgIsLight === _isLight(bg) && !border) {
      border = bgIsLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)';
    }
  }
  return { bg: bg, text: text, border: border };
}

/* ── 테마 변수 계산 ── */
function _calcThemeVars(data, theme) {
  var isDark = (theme === 'dark');
  var cp = data.colorPalette || {};

  var catAccent = '#C25450';
  (cp.colors || []).forEach(function(c) {
    var r = (c.role || '').toLowerCase();
    if (r.includes('accent') || r.includes('primary')) catAccent = c.hex;
  });

  var catBg, catText, catMuted, catBorder;
  if (isDark) {
    catBg = '#0F0F0F'; catText = '#F0F0F0'; catMuted = '#888888'; catBorder = '#2A2A2A';
  } else {
    catBg = '#F8F7F4'; catText = '#1A1A1A'; catMuted = '#6B6B6B'; catBorder = '#E8E6E1';
  }

  /* accent 명도 보정 — 배경과 대비 부족 시 반전 */
  if (isDark && !_isLight(catAccent)) catAccent = _invertHex(catAccent);
  if (!isDark && _isLight(catAccent)) catAccent = _invertHex(catAccent);

  var barColor = catAccent;

  return {
    isDark: isDark,
    bgIsLight: !isDark,
    catBg: catBg,
    catText: catText,
    catMuted: catMuted,
    catBorder: catBorder,
    catAccent: catAccent,
    navBg: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(248,247,244,0.92)',
    navBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    heroBg: isDark ? '#141414' : '#F0EFE9',
    sectionBg: isDark ? '#161616' : '#FFFFFF',
    sectionBorder: isDark ? '#2A2A2A' : '#E8E6E1',
    barColor: barColor
  };
}

/* ── Scoped CSS 생성 ── */
/* S = '.catalog-embed' (페이지 내 삽입 시) 또는 '' (다운로드 HTML 시) */
function _buildCatalogCSS(v, S) {
  var s = S ? S + ' ' : '';
  var c = [];

  if (!S) {
    c.push('*{margin:0;padding:0;box-sizing:border-box}');
    c.push('body{background:' + v.catBg + ';color:' + v.catText + ';font-family:Inter,sans-serif;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.5}');
  } else {
    c.push(S + '{background:' + v.catBg + ';color:' + v.catText + ';font-family:Inter,sans-serif;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.5;border-radius:var(--radius-xl,16px)}');
  }

  c.push(s + '.cat-nav{background:' + v.navBg + ';backdrop-filter:blur(12px);border-bottom:1px solid ' + v.navBorder + ';padding:0 40px}');
  c.push(s + '.cat-nav-inner{max-width:960px;margin:0 auto;display:flex;align-items:center;height:48px;gap:20px}');
  c.push(s + '.cat-nav-brand{font-size:13px;font-weight:700;color:' + v.catAccent + ';letter-spacing:0.02em;flex-shrink:0}');
  c.push(s + '.cat-nav-links{display:flex;gap:18px;flex:1;justify-content:center}');
  c.push(s + '.cat-nav-links a{font-size:12px;color:' + v.catMuted + ';text-decoration:none;font-weight:500}');
  c.push(s + '.cat-nav-links a:hover{color:' + v.catText + '}');

  c.push(s + '.cat-hero{background:' + v.heroBg + ';padding:72px 40px 64px;text-align:center}');
  c.push(s + '.cat-hero-inner{max-width:680px;margin:0 auto}');
  c.push(s + '.cat-hero h1{font-size:36px;font-weight:700;line-height:1.2;margin-bottom:16px;color:' + v.catText + '}');
  c.push(s + '.cat-hero h1 span{color:' + v.catAccent + '}');
  c.push(s + '.cat-hero p{font-size:15px;color:' + v.catMuted + ';line-height:1.6;margin-bottom:28px}');
  c.push(s + '.cat-hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}');

  c.push(s + '.catalog{max-width:960px;margin:0 auto;padding:56px 40px 96px}');

  c.push(s + '.cat-section{background:' + v.sectionBg + ';border:1px solid ' + v.sectionBorder + ';border-radius:16px;padding:36px 36px 40px;margin-bottom:24px;scroll-margin-top:64px}');
  c.push(s + '.cat-section-num{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:' + v.catMuted + ';margin-bottom:4px;font-weight:600}');
  c.push(s + '.cat-section-title{font-size:22px;font-weight:600;margin-bottom:28px;color:' + v.catText + '}');
  c.push(s + '.cat-group-label{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:' + v.catMuted + ';margin-bottom:14px;margin-top:24px}');

  c.push(s + '.swatch-grid{display:flex;gap:16px;flex-wrap:wrap}');
  c.push(s + '.swatch-item{width:160px}');
  c.push(s + '.swatch-box{width:160px;height:96px;border-radius:10px;margin-bottom:10px}');
  c.push(s + '.swatch-name{font-size:13px;font-weight:600;color:' + v.catText + '}');
  c.push(s + '.swatch-hex{font-size:11px;font-family:monospace;color:' + v.catMuted + '}');
  c.push(s + '.swatch-role{font-size:10px;color:' + v.catMuted + ';opacity:0.7;margin-top:2px}');

  c.push(s + '.typo-item{margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid ' + v.sectionBorder + '}');
  c.push(s + '.typo-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}');
  c.push(s + '.typo-sample{margin-bottom:8px}');
  c.push(s + '.typo-meta{font-size:11px;color:' + v.catMuted + ';font-family:monospace}');

  c.push(s + '.btn-grid{display:flex;gap:16px;flex-wrap:wrap;align-items:center}');
  c.push(s + '.btn-sample{display:inline-block;cursor:default;text-decoration:none;font-family:Inter,sans-serif}');
  c.push(s + '.btn-label{font-size:11px;color:' + v.catMuted + ';margin-top:8px;text-align:center}');

  c.push(s + '.card-sample{border-radius:12px;background:' + v.catBg + ';border:1px solid ' + v.sectionBorder + ';margin-bottom:12px;max-width:360px}');
  c.push(s + '.card-sample-title{font-size:15px;font-weight:600;margin-bottom:6px}');
  c.push(s + '.card-sample-desc{font-size:13px;color:' + v.catMuted + ';line-height:1.5}');
  c.push(s + '.card-meta{font-size:11px;color:' + v.catMuted + ';font-family:monospace;margin-top:12px;padding-top:10px;border-top:1px solid ' + v.sectionBorder + '}');

  c.push(s + '.form-grid{display:flex;flex-direction:column;gap:14px;max-width:400px}');
  c.push(s + '.input-sample{width:100%;background:' + v.catBg + ';color:' + v.catText + ';font-family:Inter,sans-serif;font-size:14px;outline:none;border:1px solid ' + v.sectionBorder + '}');

  c.push(s + '.spacing-grid{display:flex;flex-direction:column;gap:10px}');
  c.push(s + '.spacing-row{display:flex;align-items:center;gap:14px}');
  c.push(s + '.spacing-bar{height:10px;background:' + v.barColor + ';border-radius:3px}');
  c.push(s + '.spacing-label{font-size:11px;font-family:monospace;color:' + v.catMuted + ';min-width:44px;text-align:right}');

  c.push(s + '.radius-grid{display:flex;gap:20px;flex-wrap:wrap;align-items:end}');
  c.push(s + '.radius-item{text-align:center}');
  c.push(s + '.radius-box{width:64px;height:64px;background:' + v.catBg + ';border:1px solid ' + v.sectionBorder + '}');
  c.push(s + '.radius-val{font-size:11px;font-family:monospace;color:' + v.catMuted + ';margin-top:8px}');

  c.push(s + '.depth-grid{display:flex;gap:24px;flex-wrap:wrap;align-items:start}');
  c.push(s + '.depth-card{width:150px;height:88px;border-radius:12px;background:' + v.catBg + ';border:1px solid ' + v.sectionBorder + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:' + v.catMuted + '}');

  c.push(s + '.resp-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px}');
  c.push(s + '.resp-table th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:' + v.catMuted + ';padding:10px 12px;border-bottom:1px solid ' + v.sectionBorder + '}');
  c.push(s + '.resp-table td{padding:10px 12px;border-bottom:1px solid ' + v.sectionBorder + ';color:' + v.catText + '}');
  c.push(s + '.bp-grid{display:flex;gap:12px;flex-wrap:wrap;align-items:end}');
  c.push(s + '.bp-card{background:' + v.catBg + ';border:1px solid ' + v.sectionBorder + ';border-radius:8px;padding:14px;display:flex;flex-direction:column;align-items:flex-start;gap:4px}');
  c.push(s + '.bp-size{font-size:20px;font-weight:700;color:' + v.catText + '}');
  c.push(s + '.bp-name{font-size:11px;color:' + v.catMuted + '}');

  /* v3.4 신규 */
  c.push(s + '.cat-section-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}');
  c.push(s + '.cat-section-summary{font-size:14px;line-height:1.6;color:' + v.catMuted + ';margin-top:8px;max-width:640px;border-left:2px solid ' + v.sectionBorder + ';padding-left:12px}');
  c.push(s + '.cat-copy-btn{background:none;border:1px solid ' + v.sectionBorder + ';border-radius:6px;padding:6px 10px;cursor:pointer;font-size:14px;color:' + v.catMuted + ';transition:all 0.15s}');
  c.push(s + '.cat-copy-btn:hover{border-color:' + v.catAccent + ';color:' + v.catAccent + '}');
  c.push(s + '.cat-copy-data{display:none}');
  c.push(s + '.typo-family-highlight{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid ' + v.sectionBorder + '}');
  c.push(s + '.typo-family-name{font-size:32px;font-weight:600;color:' + v.catText + '}');
  c.push(s + '.cat-kv-grid{display:flex;flex-direction:column;gap:6px}');
  c.push(s + '.cat-kv-row{display:flex;align-items:baseline;gap:12px}');
  c.push(s + '.cat-kv-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:' + v.catMuted + ';min-width:80px}');
  c.push(s + '.cat-kv-value{font-size:13px;color:' + v.catText + ';font-family:monospace}');
  c.push(s + '.cat-code-block{background:' + (v.isDark ? '#1A1A1A' : '#F5F4F0') + ';border:1px solid ' + v.sectionBorder + ';border-radius:8px;padding:14px 16px;font-size:12px;font-family:monospace;color:' + v.catText + ';margin-top:14px;overflow-x:auto;white-space:pre-wrap}');
  c.push(s + '.cat-meta-row{font-size:11px;font-family:monospace;color:' + v.catMuted + ';margin-top:14px;padding-top:10px;border-top:1px solid ' + v.sectionBorder + '}');
  c.push(s + '.depth-item{text-align:center}');
  c.push(s + '.depth-value{font-size:10px;font-family:monospace;color:' + v.catMuted + ';margin-top:6px;max-width:150px;word-break:break-all}');
  c.push(s + '.rules-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}');
  c.push(s + '.rules-col{display:flex;flex-direction:column;gap:8px}');
  c.push(s + '.rules-col-title{font-size:13px;font-weight:700;margin-bottom:4px}');
  c.push(s + '.rules-item{font-size:13px;line-height:1.6;color:' + v.catText + ';padding:8px 12px;border-radius:6px;background:' + (v.isDark ? '#1A1A1A' : '#FFFFFF') + ';border:1px solid ' + v.sectionBorder + '}');

  return c.join('\n');
}

/* ── 카탈로그 본문 HTML (v3.4) ── */
function _buildCatalogBody(data, v, isEmbed) {
  var cp = data.colorPalette || {};
  var tp = data.typography || {};
  var cm = data.components || {};
  var lo = data.layout || {};
  var de = data.depth || {};
  var vt = data.visualTheme || {};
  var rs = data.responsive || {};
  var ic = data.iconSystem || {};
  var ru = data.rules || {};
  var ss = data.sectionSummaries || {};

  var brandColors = (cp.brand && cp.brand.length > 0) ? cp.brand : (cp.colors || []).slice(0, 4);
  var semanticColors = (cp.semantic && cp.semantic.length > 0) ? cp.semantic : [];
  var textColors = (cp.colors || []).filter(function(c) {
    var r = (c.role || '').toLowerCase();
    return r.includes('text') || r === 'foreground' || r === 'primary';
  });

  var typoScale = [];
  if (tp.scale && tp.scale.length > 0) {
    typoScale = tp.scale;
  } else {
    ['display', 'heading', 'body', 'caption'].forEach(function(role) {
      if (tp[role]) {
        typoScale.push({ role: role, family: tp[role].family || 'sans-serif', size: tp[role].size || '16px', weight: tp[role].weight || 400, lineHeight: tp[role].lineHeight || 'normal', letterSpacing: 'normal', textTransform: 'none' });
      }
    });
  }

  /* 폰트명 목록 (중복 제거) */
  var fontFamilies = [];
  var _fontSeen = {};
  typoScale.forEach(function(t) {
    var f = t.family || '';
    if (f && !_fontSeen[f]) { _fontSeen[f] = true; fontFamilies.push(f); }
  });

  var btnVariants = [];
  if (cm.buttonVariants && cm.buttonVariants.length > 0) {
    btnVariants = cm.buttonVariants;
  } else if (cm.button) {
    var acHex = '#333333';
    (cp.colors || []).forEach(function(c) { var r = (c.role || '').toLowerCase(); if (r.includes('accent') || r.includes('primary')) acHex = c.hex; });
    btnVariants = [{ name: 'Primary', bg: acHex, text: _isLight(acHex) ? '#000000' : '#FFFFFF', padding: cm.button.padding || '12px 24px', radius: cm.button.radius || '8px', weight: cm.button.weight || 500 }];
  }

  var spacingScale = (lo.spacingScale && lo.spacingScale.length > 0) ? lo.spacingScale : [4, 8, 12, 16, 24];
  var radiusScale = (lo.radiusScale && lo.radiusScale.length > 0) ? lo.radiusScale : ['4px', '8px', '12px'];
  var shadows = (de.shadows && de.shadows.length > 0) ? de.shadows : [];
  var breakpoints = (rs.breakpoints && rs.breakpoints.length > 0) ? rs.breakpoints : [];

  var brands = vt.referenceBrands || [];
  var brandName = 'Design System';
  if (brands.length === 1) brandName = brands[0];
  else if (brands.length === 2) brandName = brands[0] + ' + ' + brands[1];
  else if (brands.length === 3) brandName = brands[0] + ' + ' + brands[1] + ' + ' + brands[2];
  else if (brands.length > 3) brandName = brands[0] + ' + ' + brands[1] + ' + ' + (brands.length - 2) + ' more';

  var bgIsLight = v.bgIsLight;
  var h = [];

  /* 섹션 헤더 헬퍼 (넘버링 + 제목 + 요약 + 복사 버튼) */
  function secHeader(num, slug, title, summaryKey, copyId) {
    var out = '<div class="cat-section-head">';
    out += '<div><div class="cat-section-num">Section ' + num + ' / ' + _esc(slug) + '</div>';
    out += '<div class="cat-section-title">' + _esc(title) + '</div>';
    if (ss[summaryKey]) out += '<div class="cat-section-summary">' + _esc(ss[summaryKey]) + '</div>';
    out += '</div>';
    if (copyId) out += '<button class="cat-copy-btn" data-copy-target="' + _esc(copyId) + '" onclick="_catCopySection(this)" title="Copy tokens">📋</button>';
    out += '</div>';
    return out;
  }

  /* 내비 */
  h.push('<nav class="cat-nav"><div class="cat-nav-inner">');
  h.push('<div class="cat-nav-brand">TRLOY</div>');
  h.push('<div class="cat-nav-links">');
  if (isEmbed) {
    h.push('<a onclick="document.getElementById(\'sec-colors\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false" href="javascript:void(0)">Colors</a><a onclick="document.getElementById(\'sec-typography\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false" href="javascript:void(0)">Typography</a><a onclick="document.getElementById(\'sec-buttons\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false" href="javascript:void(0)">Buttons</a><a onclick="document.getElementById(\'sec-components\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false" href="javascript:void(0)">Components</a><a onclick="document.getElementById(\'sec-responsive\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false" href="javascript:void(0)">Responsive</a>');
  } else {
    h.push('<a href="#sec-colors">Colors</a><a href="#sec-typography">Typography</a><a href="#sec-buttons">Buttons</a><a href="#sec-components">Components</a><a href="#sec-responsive">Responsive</a>');
  }
  h.push('</div></div></nav>');

  /* 히어로 */
  h.push('<section class="cat-hero"><div class="cat-hero-inner">');
  h.push('<h1>Design Token Catalog of <span>' + _esc(brandName) + '</span></h1>');
  h.push('<p>A visual catalog of the tokens, components, and layout principles — generated by TRLOY.</p>');
  if (btnVariants.length >= 1) {
    h.push('<div class="cat-hero-btns">');
    var heroCount = Math.min(btnVariants.length, 2);
    for (var bi = 0; bi < heroCount; bi++) {
      var bv = btnVariants[bi];
      var ad = _adaptButton(bv, bgIsLight);
      var bdr = ad.border ? 'border:' + _esc(ad.border) + ';' : 'border:none;';
      h.push('<div class="btn-sample" style="background:' + _esc(ad.bg) + ';color:' + _esc(ad.text) + ';padding:' + _esc(bv.padding || '12px 24px') + ';border-radius:' + _esc(bv.radius || '8px') + ';font-weight:' + (bv.weight || 600) + ';font-size:14px;' + bdr + '">' + _esc(bv.name || 'Button') + '</div>');
    }
    h.push('</div>');
  }
  h.push('</div></section>');

  /* 본문 */
  h.push('<div class="catalog">');

  /* 01 Colors */
  h.push('<div class="cat-section" id="sec-colors">');
  h.push(secHeader('01', 'Colors', 'Color Palette', 'colors', 'copy-colors'));
  h.push('<div class="cat-copy-data" id="copy-colors" style="display:none">' + _esc((cp.colors || []).map(function(c){ return c.hex + '  /* ' + (c.role||'') + ' */'; }).join('\n')) + '</div>');
  if (brandColors.length > 0) {
    h.push('<div class="cat-group-label" style="margin-top:0">Brand</div><div class="swatch-grid">');
    brandColors.forEach(function(c) {
      h.push('<div class="swatch-item"><div class="swatch-box" style="background:' + _esc(c.hex) + ';border:' + _swatchBorder(c.hex, bgIsLight) + '"></div>');
      h.push('<div class="swatch-name">' + _esc(c.name || c.role || '') + '</div><div class="swatch-hex">' + _esc(c.hex) + '</div><div class="swatch-role">' + _esc(c.meaning || c.role || '') + '</div></div>');
    });
    h.push('</div>');
  }
  if (textColors.length > 0 || semanticColors.length > 0) {
    h.push('<div class="cat-group-label">Text & Semantic</div><div class="swatch-grid">');
    textColors.concat(semanticColors).forEach(function(c) {
      h.push('<div class="swatch-item"><div class="swatch-box" style="background:' + _esc(c.hex) + ';border:' + _swatchBorder(c.hex, bgIsLight) + '"></div>');
      h.push('<div class="swatch-name">' + _esc(c.name || c.role || '') + '</div><div class="swatch-hex">' + _esc(c.hex) + '</div><div class="swatch-role">' + _esc(c.meaning || '') + '</div></div>');
    });
    h.push('</div>');
  }
  h.push('</div>');

  /* 02 Typography */
  h.push('<div class="cat-section" id="sec-typography">');
  h.push(secHeader('02', 'Typography', 'Typography Scale', 'typography', 'copy-typo'));
  var typoCopyText = typoScale.map(function(t){ return t.role + ': ' + (t.family||'') + ' ' + (t.size||'') + ' / ' + (t.weight||''); }).join('\n');
  h.push('<div class="cat-copy-data" id="copy-typo" style="display:none">' + _esc(typoCopyText) + '</div>');
  /* 폰트명 크게 강조 */
  if (fontFamilies.length > 0) {
    h.push('<div class="typo-family-highlight">');
    fontFamilies.forEach(function(f) {
      h.push('<span class="typo-family-name" style="font-family:' + _esc(f) + ',Inter,sans-serif">' + _esc(f) + '</span>');
    });
    h.push('</div>');
  }
  typoScale.forEach(function(t) {
    var sample = _capitalize(t.role || 'Text') + ' — ' + _esc(vt.title || 'Design System');
    h.push('<div class="typo-item"><div class="typo-sample" style="font-family:' + _esc(t.family || 'Inter') + ',Inter,sans-serif;font-size:' + _esc(t.size || '16px') + ';font-weight:' + (t.weight || 400) + ';line-height:' + _esc(String(t.lineHeight || 'normal')) + ';letter-spacing:' + _esc(t.letterSpacing || 'normal') + ';text-transform:' + _esc(t.textTransform || 'none') + ';color:' + v.catText + '">' + _esc(sample) + '</div>');
    h.push('<div class="typo-meta">' + _esc(t.role || '') + ' — ' + _esc(t.size || '') + ' / ' + (t.weight || '') + ' / ' + _esc(t.family || ''));
    if (t.letterSpacing && t.letterSpacing !== 'normal') h.push(' / ls:' + _esc(t.letterSpacing));
    if (t.textTransform && t.textTransform !== 'none') h.push(' / ' + _esc(t.textTransform));
    h.push('</div></div>');
  });
  h.push('</div>');

  /* 03 Buttons */
  h.push('<div class="cat-section" id="sec-buttons">');
  h.push(secHeader('03', 'Buttons', 'Button Variants', 'buttons', 'copy-buttons'));
  var btnCopyText = btnVariants.map(function(b){ return b.name + ': bg=' + (b.bg||'') + ' text=' + (b.text||'') + ' radius=' + (b.radius||'') + ' padding=' + (b.padding||''); }).join('\n');
  h.push('<div class="cat-copy-data" id="copy-buttons" style="display:none">' + _esc(btnCopyText) + '</div>');
  h.push('<div class="btn-grid">');
  btnVariants.forEach(function(bv2) {
    var ad2 = _adaptButton(bv2, bgIsLight);
    var bdr2 = ad2.border ? 'border:' + _esc(ad2.border) + ';' : 'border:none;';
    h.push('<div style="text-align:center"><div class="btn-sample" style="background:' + _esc(ad2.bg) + ';color:' + _esc(ad2.text) + ';padding:' + _esc(bv2.padding || '12px 24px') + ';border-radius:' + _esc(bv2.radius || '8px') + ';font-weight:' + (bv2.weight || 500) + ';font-size:14px;' + bdr2 + '">' + _esc(bv2.name || 'Button') + '</div><div class="btn-label">' + _esc(bv2.name || '') + '</div></div>');
  });
  h.push('</div></div>');

  /* 04 Cards */
  h.push('<div class="cat-section" id="sec-components">');
  h.push(secHeader('04', 'Cards', 'Card Component', 'cards', 'copy-cards'));
  var cd = cm.card || {};
  var cardPad = _minPx(cd.padding, 16);
  var cardRad = cd.radius || '12px';
  var cardShadow = cd.shadow || '';
  var cardCopyText = 'padding: ' + cardPad + ' · radius: ' + cardRad + (cardShadow ? ' · shadow: ' + cardShadow : '');
  h.push('<div class="cat-copy-data" id="copy-cards" style="display:none">' + _esc(cardCopyText) + '</div>');
  h.push('<div class="card-sample" style="padding:' + _esc(cardPad) + ';border-radius:' + _esc(cardRad) + ';' + (cardShadow ? 'box-shadow:' + _esc(cardShadow) + ';' : '') + '"><div class="card-sample-title">Sample Card</div><div class="card-sample-desc">Extracted design tokens applied to a real card component.</div><div class="card-meta">padding: ' + _esc(cardPad) + ' · radius: ' + _esc(cardRad) + (cardShadow ? ' · shadow: applied' : '') + '</div></div></div>');

  /* 05 Forms */
  h.push('<div class="cat-section">');
  h.push(secHeader('05', 'Forms', 'Input Fields', 'forms', 'copy-forms'));
  var inp = cm.input || {};
  var formMeta = 'height: ' + (inp.height || '44px') + ' · padding: ' + (inp.padding || '0 16px') + ' · radius: ' + (inp.radius || '8px');
  h.push('<div class="cat-copy-data" id="copy-forms" style="display:none">' + _esc(formMeta) + '</div>');
  var inpS = 'height:' + _esc(inp.height || '44px') + ';padding:' + _esc(inp.padding || '0 16px') + ';border-radius:' + _esc(inp.radius || '8px') + ';';
  h.push('<div class="form-grid"><div><div class="cat-group-label" style="margin-top:0">Default</div><input class="input-sample" type="text" value="Default state" readonly style="' + inpS + '"></div>');
  h.push('<div><div class="cat-group-label" style="margin-top:0">Placeholder</div><input class="input-sample" type="text" placeholder="Enter text..." readonly style="' + inpS + 'color:' + v.catMuted + ';"></div></div>');
  h.push('<div class="cat-meta-row">' + _esc(formMeta) + '</div>');
  h.push('</div>');

  /* 06 Spacing & Layout */
  h.push('<div class="cat-section">');
  h.push(secHeader('06', 'Spacing', 'Spacing & Layout', 'spacing', 'copy-spacing'));
  var spacingCopyText = spacingScale.map(function(px){ return px + 'px'; }).join(', ') + '\ngrid: ' + (lo.grid || '—') + '\nbaseUnit: ' + (lo.baseUnit || '—') + '\ngutter: ' + (lo.gutter || '—') + '\nmaxWidth: ' + (lo.maxWidth || '—');
  h.push('<div class="cat-copy-data" id="copy-spacing" style="display:none">' + _esc(spacingCopyText) + '</div>');
  h.push('<div class="spacing-grid">');
  var maxSp = Math.max.apply(null, spacingScale);
  spacingScale.forEach(function(px) {
    h.push('<div class="spacing-row"><div class="spacing-label">' + px + 'px</div><div class="spacing-bar" style="width:' + Math.max(5, (px / maxSp) * 100) + '%"></div></div>');
  });
  h.push('</div>');
  /* layout meta key-value */
  h.push('<div class="cat-kv-grid" style="margin-top:20px">');
  [['grid', lo.grid], ['baseUnit', lo.baseUnit], ['gutter', lo.gutter], ['maxWidth', lo.maxWidth]].forEach(function(pair) {
    if (pair[1]) h.push('<div class="cat-kv-row"><span class="cat-kv-label">' + _esc(pair[0]) + '</span><span class="cat-kv-value">' + _esc(pair[1]) + '</span></div>');
  });
  h.push('</div></div>');

  /* 07 Border Radius */
  h.push('<div class="cat-section">');
  h.push(secHeader('07', 'Radius', 'Radius Scale', 'radius', 'copy-radius'));
  h.push('<div class="cat-copy-data" id="copy-radius" style="display:none">' + _esc(radiusScale.join(', ')) + '</div>');
  h.push('<div class="radius-grid">');
  radiusScale.forEach(function(val) {
    h.push('<div class="radius-item"><div class="radius-box" style="border-radius:' + _esc(val) + '"></div><div class="radius-val">' + _esc(val) + '</div></div>');
  });
  h.push('</div></div>');

  /* 08 Depth */
  h.push('<div class="cat-section">');
  h.push(secHeader('08', 'Depth', 'Elevation & Shadows', 'depth', 'copy-depth'));
  var depthCopyText = shadows.map(function(s2){ return s2.level + ': ' + (s2.value || 'none'); }).join('\n');
  h.push('<div class="cat-copy-data" id="copy-depth" style="display:none">' + _esc(depthCopyText) + '</div>');
  h.push('<div class="depth-grid">');
  shadows.forEach(function(s2) {
    var sv = (s2.value && s2.value !== 'none') ? s2.value : 'none';
    h.push('<div class="depth-item"><div class="depth-card" style="box-shadow:' + _esc(sv) + '">' + _esc(_capitalize(s2.level || '—')) + '</div>');
    h.push('<div class="depth-value">' + _esc(sv) + '</div></div>');
  });
  h.push('</div></div>');

  /* 09 Icons */
  if (ic.style || ic.library) {
    h.push('<div class="cat-section" id="sec-icons">');
    h.push(secHeader('09', 'Icons', 'Icon System', 'icons', 'copy-icons'));
    var iconCopyText = 'style: ' + (ic.style || '—') + '\nweight: ' + (ic.weight || '—') + '\nrounding: ' + (ic.rounding || '—') + '\nlibrary: ' + ((ic.library && ic.library.recommended) || '—') + (ic.importCode ? '\n' + ic.importCode : '');
    h.push('<div class="cat-copy-data" id="copy-icons" style="display:none">' + _esc(iconCopyText) + '</div>');
    h.push('<div class="cat-kv-grid">');
    [['style', ic.style], ['weight', ic.weight], ['rounding', ic.rounding]].forEach(function(pair) {
      if (pair[1]) h.push('<div class="cat-kv-row"><span class="cat-kv-label">' + _esc(pair[0]) + '</span><span class="cat-kv-value">' + _esc(pair[1]) + '</span></div>');
    });
    if (ic.library) {
      var libText = ic.library.recommended || '—';
      if (ic.library.alternatives && ic.library.alternatives.length) libText += ' · alt: ' + ic.library.alternatives.join(', ');
      h.push('<div class="cat-kv-row"><span class="cat-kv-label">library</span><span class="cat-kv-value">' + _esc(libText) + '</span></div>');
    }
    h.push('</div>');
    if (ic.importCode) {
      h.push('<pre class="cat-code-block">' + _esc(ic.importCode) + '</pre>');
    }
    h.push('</div>');
  }

  /* 10 Responsive */
  if (breakpoints.length > 0) {
    h.push('<div class="cat-section" id="sec-responsive">');
    h.push(secHeader('10', 'Responsive', 'Responsive Behavior', 'responsive', 'copy-responsive'));
    var respCopyText = breakpoints.map(function(bp){ return bp.name + ': ' + bp.query + ' → ' + (bp.cols != null ? bp.cols : '?') + ' col'; }).join('\n');
    h.push('<div class="cat-copy-data" id="copy-responsive" style="display:none">' + _esc(respCopyText) + '</div>');
    h.push('<table class="resp-table"><thead><tr><th>Name</th><th>Width</th><th>Cols</th></tr></thead><tbody>');
    breakpoints.forEach(function(bp) {
      h.push('<tr><td>' + _esc(bp.name || '') + '</td><td>' + _esc(bp.query || '') + '</td><td>' + (bp.cols != null ? bp.cols : '—') + '</td></tr>');
    });
    h.push('</tbody></table><div class="bp-grid">');
    breakpoints.forEach(function(bp) {
      var w = 60;
      var n = (bp.name || '').toLowerCase();
      if (n.includes('mobile')) w = 80; else if (n.includes('tablet')) w = 110; else if (n.includes('desktop')) w = 150; else if (n.includes('large') || n.includes('xl')) w = 180;
      h.push('<div class="bp-card" style="width:' + w + 'px;height:' + Math.round(w * 0.6) + 'px"><div class="bp-size">' + (bp.cols != null ? bp.cols : '?') + '</div><div class="bp-name">' + _esc(bp.name || '') + '</div></div>');
    });
    h.push('</div></div>');
  }

  /* 11 Rules (Do's / Don'ts) */
  var hasDos = ru.dos && ru.dos.length > 0;
  var hasDonts = ru.donts && ru.donts.length > 0;
  if (hasDos || hasDonts) {
    h.push('<div class="cat-section" id="sec-rules">');
    h.push(secHeader('11', 'Rules', "Do's & Don'ts", 'rules', 'copy-rules'));
    var rulesCopyText = (hasDos ? "Do's:\n" + ru.dos.map(function(d){ return '✓ ' + d; }).join('\n') : '') + (hasDonts ? "\nDon'ts:\n" + ru.donts.map(function(d){ return '✗ ' + d; }).join('\n') : '');
    h.push('<div class="cat-copy-data" id="copy-rules" style="display:none">' + _esc(rulesCopyText) + '</div>');
    h.push('<div class="rules-grid">');
    if (hasDos) {
      h.push('<div class="rules-col rules-do-col"><div class="rules-col-title" style="color:#22863a">✓ Do\'s</div>');
      ru.dos.forEach(function(d) { h.push('<div class="rules-item rules-do-item">' + _esc(d) + '</div>'); });
      h.push('</div>');
    }
    if (hasDonts) {
      h.push('<div class="rules-col rules-dont-col"><div class="rules-col-title" style="color:#cb2431">✗ Don\'ts</div>');
      ru.donts.forEach(function(d) { h.push('<div class="rules-item rules-dont-item">' + _esc(d) + '</div>'); });
      h.push('</div>');
    }
    h.push('</div></div>');
  }

  h.push('</div>'); /* .catalog */
  return h.join('\n');
}

/* ── 완전한 HTML 문서 (다운로드용) ── */
function buildCatalogHTML(data, theme) {
  if (!data) return '';
  var v = _calcThemeVars(data, theme);
  var css = _buildCatalogCSS(v, '');
  var body = _buildCatalogBody(data, v);
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + css + '</style></head><body>' + body + '</body></html>';
}

/* ── 현재 상태 ── */
var _pvCurrentTab = 'live';
var _pvCurrentTheme = 'light';
var _pvData = null;
var _pvStyleEl = null;

/* ── 프리뷰 섹션 렌더 (05-render.js 호환) ── */
function renderPreviewSection(data) {
  var container = document.getElementById('preview-section');
  if (!container) return;
  if (!data) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  _pvData = data;

  if (!container._pvBound) {
    container._pvBound = true;
    _bindPreviewTabs(container);
  }

  _renderLivePreview(data, _pvCurrentTheme);
}

/* ── 탭 바인딩 ── */
function _bindPreviewTabs(container) {
  var tabs = container.querySelectorAll('.pv-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      _pvCurrentTab = tab.dataset.pvTab;
      tabs.forEach(function(t) { t.classList.toggle('active', t.dataset.pvTab === _pvCurrentTab); });
      _switchPreviewContent();
    });
  });

  var themeBtns = container.querySelectorAll('.theme-btn');
  themeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      _pvCurrentTheme = btn.dataset.theme;
      themeBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.theme === _pvCurrentTheme); });
      if (_pvCurrentTab === 'live' && _pvData) {
        _renderLivePreview(_pvData, _pvCurrentTheme);
      }
    });
  });

  var copyBtn = document.getElementById('btn-pv-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var textBody = document.getElementById('preview-text-body');
      if (textBody && textBody.textContent) {
        if (typeof copyToClipboard === 'function') {
          copyToClipboard(textBody.textContent).then(function() {
            if (typeof showToast === 'function') showToast('복사됐어요.');
          });
        }
      }
    });
  }
}

/* ── 탭 전환 ── */
function _switchPreviewContent() {
  var liveWrap = document.getElementById('preview-wrap-live');
  var textWrap = document.getElementById('preview-wrap-text');
  var dlBtn = document.getElementById('btn-download-catalog');
  var themeToggle = document.getElementById('theme-toggle');
  var filenameEl = document.getElementById('preview-text-filename');

  if (_pvCurrentTab === 'live') {
    if (liveWrap) liveWrap.classList.remove('hidden');
    if (textWrap) textWrap.classList.add('hidden');
    if (dlBtn) dlBtn.style.display = '';
    if (themeToggle) themeToggle.style.display = '';
    if (_pvData) _renderLivePreview(_pvData, _pvCurrentTheme);
  } else {
    if (liveWrap) liveWrap.classList.add('hidden');
    if (textWrap) textWrap.classList.remove('hidden');
    if (dlBtn) dlBtn.style.display = 'none';
    if (themeToggle) themeToggle.style.display = 'none';

    var text = '';
    var fileName = '';
    if (_pvData) {
      switch (_pvCurrentTab) {
        case 'designmd':
          text = (typeof buildDesignMdContent === 'function') ? buildDesignMdContent(_pvData) : '';
          fileName = 'DESIGN.md'; break;
        case 'figma-make':
          text = (typeof buildFigmaMakePrompt === 'function') ? buildFigmaMakePrompt(_pvData) : '';
          fileName = 'figma-make-prompt.txt'; break;
        case 'cursor':
          text = (typeof buildCursorRules === 'function') ? buildCursorRules(_pvData) : '';
          fileName = '.cursorrules'; break;
        case 'claude-code':
          text = (typeof buildClaudeCodePrompt === 'function') ? buildClaudeCodePrompt(_pvData) : '';
          fileName = 'claude-code-prompt.md'; break;
        case 'stitch-v2':
          text = (typeof buildStitchPrompt === 'function') ? buildStitchPrompt(_pvData) : '';
          fileName = 'stitch-v2-prompt.txt'; break;
      }
    }
    var textBody = document.getElementById('preview-text-body');
    if (textBody) textBody.textContent = text;
    if (filenameEl) filenameEl.textContent = fileName;
  }
}

/* ── Live Preview: div 직접 렌더링 ── */
function _renderLivePreview(data, theme) {
  var container = document.getElementById('catalog-container');
  if (!container) return;

  var v = _calcThemeVars(data, theme);

  /* CSS: <style> 태그 동적 관리 */
  if (!_pvStyleEl) {
    _pvStyleEl = document.createElement('style');
    _pvStyleEl.id = 'catalog-scoped-css';
    document.head.appendChild(_pvStyleEl);
  }
  _pvStyleEl.textContent = _buildCatalogCSS(v, '.catalog-embed');

  /* HTML 본문 주입 */
  container.innerHTML = _buildCatalogBody(data, v, true);
}

/* ── 카탈로그 섹션 복사 (인라인 onclick) ── */
function _catCopySection(btn) {
  var targetId = btn.getAttribute('data-copy-target');
  var el = document.getElementById(targetId);
  if (!el) return;
  var text = el.textContent || '';
  if (typeof copyToClipboard === 'function') {
    copyToClipboard(text).then(function() {
      if (typeof showToast === 'function') showToast('복사됐어요.');
    });
  }
}

/* ── no-op (호환용) ── */
function sendTokenUpdate(updates) {}

/* ── catalog.html 다운로드 ── */
function downloadWireframeHTML(data) {
  if (!data) { if (typeof showToast === 'function') showToast('분석 결과가 없어요.'); return; }
  var html = buildCatalogHTML(data, _pvCurrentTheme);
  var vt = data.visualTheme || {};
  var slug = (vt.title || 'design').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '').slice(0, 30);
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'catalog-' + slug + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  if (typeof showToast === 'function') showToast('catalog.html을 저장했어요.');
}
