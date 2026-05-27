/* =================================================
   TRLOY js/08-snippets.js
   Quick Setup Snippets 클라이언트 변환 (§8.3)
   - tokensToTailwindConfig(data)
   - tokensToCSSVariables(data)

   Claude 응답에는 토큰 데이터만. 브라우저에서 변환.
   (Claude 응답 토큰 ~500 절감, 비용 최적화 4 — §12.3)
   ================================================= */

/* -------------------------------------------------
   Tailwind config
   ------------------------------------------------- */
function tokensToTailwindConfig(data) {
  const colors = {};
  if (data?.colorPalette?.colors) {
    data.colorPalette.colors.forEach((c) => {
      if (c.role && c.hex) {
        colors[c.role.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()] = c.hex;
      }
    });
  }

  const fontFamily = {};
  if (data?.typography) {
    const t = data.typography;
    const display = t.display?.family;
    const heading = t.heading?.family;
    const body = t.body?.family;
    if (display) fontFamily.display = [display, 'sans-serif'];
    if (heading && heading !== display) fontFamily.heading = [heading, 'sans-serif'];
    if (body) fontFamily.body = [body, 'sans-serif'];
  }

  const spacing = {};
  if (data?.layout?.baseUnit) {
    spacing.base = data.layout.baseUnit;
  }
  if (data?.layout?.gutter) {
    spacing.gutter = data.layout.gutter;
  }

  const borderRadius = {};
  if (data?.components?.button?.radius) borderRadius.button = data.components.button.radius;
  if (data?.components?.card?.radius) borderRadius.card = data.components.card.radius;
  if (data?.components?.input?.radius) borderRadius.input = data.components.input.radius;

  const boxShadow = {};
  if (data?.depth?.shadows) {
    data.depth.shadows.forEach((s) => {
      if (s.level && s.value) boxShadow[s.level] = s.value;
    });
  }

  const maxWidth = {};
  if (data?.layout?.maxWidth) maxWidth.content = data.layout.maxWidth;

  const config = {
    theme: {
      extend: {
        colors,
        fontFamily,
        spacing,
        borderRadius,
        boxShadow,
        maxWidth,
      },
    },
  };

  return formatAsJsObject(config, 'module.exports = ');
}

/* -------------------------------------------------
   CSS Variables
   ------------------------------------------------- */
function tokensToCSSVariables(data) {
  const lines = [':root {'];

  // colors
  if (data?.colorPalette?.colors) {
    lines.push('  /* colors */');
    data.colorPalette.colors.forEach((c) => {
      if (c.role && c.hex) {
        lines.push(`  --color-${slugifyKey(c.role)}: ${c.hex};`);
      }
    });
  }

  // typography
  if (data?.typography) {
    lines.push('');
    lines.push('  /* typography */');
    Object.entries(data.typography).forEach(([role, spec]) => {
      if (spec?.family) {
        lines.push(`  --font-${role}: ${quoteIfNeeded(spec.family)}, sans-serif;`);
      }
      if (spec?.size) {
        lines.push(`  --font-size-${role}: ${spec.size};`);
      }
      if (spec?.lineHeight) {
        lines.push(`  --line-height-${role}: ${spec.lineHeight};`);
      }
      if (spec?.weight !== undefined) {
        lines.push(`  --font-weight-${role}: ${spec.weight};`);
      }
    });
  }

  // layout
  if (data?.layout) {
    lines.push('');
    lines.push('  /* layout */');
    if (data.layout.baseUnit) lines.push(`  --space-base: ${data.layout.baseUnit};`);
    if (data.layout.gutter) lines.push(`  --space-gutter: ${data.layout.gutter};`);
    if (data.layout.maxWidth) lines.push(`  --max-width-content: ${data.layout.maxWidth};`);
  }

  // components
  if (data?.components) {
    lines.push('');
    lines.push('  /* components */');
    Object.entries(data.components).forEach(([name, spec]) => {
      if (spec?.radius) lines.push(`  --radius-${name}: ${spec.radius};`);
      if (spec?.height) lines.push(`  --height-${name}: ${spec.height};`);
      if (spec?.padding) lines.push(`  --padding-${name}: ${spec.padding};`);
      if (spec?.shadow) lines.push(`  --shadow-${name}: ${spec.shadow};`);
    });
  }

  // depth
  if (data?.depth?.shadows) {
    lines.push('');
    lines.push('  /* depth */');
    data.depth.shadows.forEach((s) => {
      if (s.level && s.value) lines.push(`  --shadow-${s.level}: ${s.value};`);
    });
  }

  lines.push('}');
  return lines.join('\n');
}

/* -------------------------------------------------
   헬퍼
   ------------------------------------------------- */
function slugifyKey(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function quoteIfNeeded(str) {
  if (!str) return "''";
  return /[\s"]/.test(str) ? `'${str.replace(/'/g, "\\'")}'` : `'${str}'`;
}

/**
 * JS 객체를 module.exports 형식의 예쁜 문자열로
 */
function formatAsJsObject(obj, prefix = '') {
  const render = (val, indent = 0) => {
    const pad = '  '.repeat(indent);
    const padNext = '  '.repeat(indent + 1);
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'string') {
      return `'${val.replace(/'/g, "\\'")}'`;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      const parts = val.map((v) => render(v, indent + 1));
      return `[${parts.join(', ')}]`;
    }
    if (typeof val === 'object') {
      const entries = Object.entries(val);
      if (entries.length === 0) return '{}';
      const lines = entries.map(([k, v]) => {
        const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : `'${k}'`;
        return `${padNext}${key}: ${render(v, indent + 1)}`;
      });
      return `{\n${lines.join(',\n')},\n${pad}}`;
    }
    return String(val);
  };
  return prefix + render(obj, 0);
}
