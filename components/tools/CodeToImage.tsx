'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode,
  Hash,
  Image as ImageIcon,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { RetinaExportVerifiedIcon } from '@/components/ui/AqurivoContextIcons';
import { CodeToImageLogo } from './CodeToImageLogo';
import styles from './CodeToImage.module.css';

export interface CodeToImageProps {
  locale: 'ar' | 'en';
}

type StudioThemeId =
  | 'emerald_noir'
  | 'midnight_gold'
  | 'cyber_ocean'
  | 'nord_aurora'
  | 'sunset_ember'
  | 'minimal_paper';

type WindowChromeStyle = 'macos_color' | 'macos_mono' | 'geometric' | 'none';
type PaddingSize = 24 | 44 | 64;

interface ThemeConfig {
  id: StudioThemeId;
  nameAr: string;
  nameEn: string;
  backdropCss: string;
  backdropStops: [string, string, string];
  windowBg: string;
  windowBorder: string;
  titleBarBg: string;
  textPrimary: string;
  lineNumColor: string;
  tokKeyword: string;
  tokString: string;
  tokNumber: string;
  tokFunction: string;
  tokComment: string;
  tokOperator: string;
  badgeBg: string;
  badgeText: string;
}

const STUDIO_THEMES: Record<StudioThemeId, ThemeConfig> = {
  emerald_noir: {
    id: 'emerald_noir',
    nameAr: 'زمردي ليلي AQURIVO',
    nameEn: 'AQURIVO Emerald Noir',
    backdropCss:
      'linear-gradient(135deg, #06281E 0%, #0B3B2D 48%, #071A2C 100%)',
    backdropStops: ['#06281E', '#0B3B2D', '#071A2C'],
    windowBg: '#09111B',
    windowBorder: 'rgba(16, 185, 129, 0.35)',
    titleBarBg: '#0D1826',
    textPrimary: '#E2E8F0',
    lineNumColor: '#475569',
    tokKeyword: '#34D399',
    tokString: '#FBBF24',
    tokNumber: '#38BDF8',
    tokFunction: '#60A5FA',
    tokComment: '#64748B',
    tokOperator: '#94A3B8',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    badgeText: '#34D399',
  },
  midnight_gold: {
    id: 'midnight_gold',
    nameAr: 'ذهبي ملكي داكن',
    nameEn: 'Midnight Sovereign Gold',
    backdropCss:
      'linear-gradient(135deg, #1E1608 0%, #2D210B 50%, #111827 100%)',
    backdropStops: ['#1E1608', '#2D210B', '#111827'],
    windowBg: '#0B0F17',
    windowBorder: 'rgba(245, 158, 11, 0.38)',
    titleBarBg: '#111724',
    textPrimary: '#F1F5F9',
    lineNumColor: '#4B5563',
    tokKeyword: '#F59E0B',
    tokString: '#34D399',
    tokNumber: '#FBBF24',
    tokFunction: '#38BDF8',
    tokComment: '#6B7280',
    tokOperator: '#9CA3AF',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    badgeText: '#FBBF24',
  },
  cyber_ocean: {
    id: 'cyber_ocean',
    nameAr: 'محيط سيبراني أزرق',
    nameEn: 'Cyber Ocean Matrix',
    backdropCss:
      'linear-gradient(135deg, #08203E 0%, #0C4A6E 50%, #0F172A 100%)',
    backdropStops: ['#08203E', '#0C4A6E', '#0F172A'],
    windowBg: '#070E1A',
    windowBorder: 'rgba(56, 189, 248, 0.36)',
    titleBarBg: '#0C1628',
    textPrimary: '#E2E8F0',
    lineNumColor: '#475569',
    tokKeyword: '#38BDF8',
    tokString: '#34D399',
    tokNumber: '#F59E0B',
    tokFunction: '#818CF8',
    tokComment: '#64748B',
    tokOperator: '#94A3B8',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    badgeText: '#38BDF8',
  },
  nord_aurora: {
    id: 'nord_aurora',
    nameAr: 'شفق قطبي هادئ',
    nameEn: 'Nordic Aurora Borealis',
    backdropCss:
      'linear-gradient(135deg, #0F292F 0%, #1E3A5F 52%, #1D2436 100%)',
    backdropStops: ['#0F292F', '#1E3A5F', '#1D2436'],
    windowBg: '#161C28',
    windowBorder: 'rgba(136, 192, 208, 0.32)',
    titleBarBg: '#1E2636',
    textPrimary: '#ECEFF4',
    lineNumColor: '#616E88',
    tokKeyword: '#81A1C1',
    tokString: '#A3BE8C',
    tokNumber: '#EBCB8B',
    tokFunction: '#88C0D0',
    tokComment: '#6C7A96',
    tokOperator: '#D8DEE9',
    badgeBg: 'rgba(136, 192, 208, 0.16)',
    badgeText: '#88C0D0',
  },
  sunset_ember: {
    id: 'sunset_ember',
    nameAr: 'جمر الغروب المرجاني',
    nameEn: 'Sunset Coral & Amber',
    backdropCss:
      'linear-gradient(135deg, #3B0D1E 0%, #4C1D24 48%, #1F162B 100%)',
    backdropStops: ['#3B0D1E', '#4C1D24', '#1F162B'],
    windowBg: '#0D0B14',
    windowBorder: 'rgba(244, 63, 94, 0.35)',
    titleBarBg: '#151120',
    textPrimary: '#F8FAFC',
    lineNumColor: '#52525B',
    tokKeyword: '#FB7185',
    tokString: '#FBBF24',
    tokNumber: '#34D399',
    tokFunction: '#38BDF8',
    tokComment: '#71717A',
    tokOperator: '#A1A1AA',
    badgeBg: 'rgba(244, 63, 94, 0.16)',
    badgeText: '#FB7185',
  },
  minimal_paper: {
    id: 'minimal_paper',
    nameAr: 'ورقي نهاري نقي',
    nameEn: 'Minimal Daylight Paper',
    backdropCss:
      'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 52%, #E6F4F1 100%)',
    backdropStops: ['#E2E8F0', '#CBD5E1', '#E6F4F1'],
    windowBg: '#FFFFFF',
    windowBorder: 'rgba(15, 23, 42, 0.12)',
    titleBarBg: '#F8FAFC',
    textPrimary: '#0F172A',
    lineNumColor: '#94A3B8',
    tokKeyword: '#059669',
    tokString: '#D97706',
    tokNumber: '#0284C7',
    tokFunction: '#2563EB',
    tokComment: '#64748B',
    tokOperator: '#475569',
    badgeBg: 'rgba(5, 150, 105, 0.12)',
    badgeText: '#059669',
  },
};

const CODE_PRESETS: Record<
  string,
  {
    labelAr: string;
    labelEn: string;
    fileName: string;
    language: string;
    code: string;
  }
> = {
  ts_hook: {
    labelAr: 'TypeScript / محرك قرار',
    labelEn: 'TypeScript / Decision Engine',
    fileName: 'aqurivo-worth-engine.ts',
    language: 'typescript',
    code: `// AQURIVO Real Value & Cost-Per-Use Engine
export interface PurchaseEvaluation {
  costPerUse: number;
  workHoursRequired: number;
  verdict: "BUY_CONFIDENTLY" | "WAIT_OR_SKIP";
}

export function evaluateSmartPurchase(
  price: number,
  expectedUses: number,
  realHourlyWage: number
): PurchaseEvaluation {
  const costPerUse = Number((price / Math.max(1, expectedUses)).toFixed(2));
  const workHoursRequired = Number((price / Math.max(1, realHourlyWage)).toFixed(1));

  return {
    costPerUse,
    workHoursRequired,
    verdict: costPerUse <= 1.5 ? "BUY_CONFIDENTLY" : "WAIT_OR_SKIP",
  };
}`,
  },
  python_ai: {
    labelAr: 'Python / تحليل مالي',
    labelEn: 'Python / Compounding Model',
    fileName: 'wealth_trajectory.py',
    language: 'python',
    code: `# AQURIVO Real Purchasing-Power Compounding
def calculate_real_wealth(principal: float, monthly: float, years: int) -> dict:
    annual_return = 0.095
    inflation_rate = 0.03
    real_rate = (1 + annual_return) / (1 + inflation_rate) - 1

    balance = principal
    for month in range(1, years * 12 + 1):
        balance = (balance + monthly) * (1 + real_rate / 12)

    return {
        "years": years,
        "real_purchasing_power": round(balance, 2),
        "financial_freedom": balance >= 250000
    }`,
  },
  sql_query: {
    labelAr: 'SQL / استعلام تحليلي',
    labelEn: 'SQL / Analytics Query',
    fileName: 'top_value_products.sql',
    language: 'sql',
    code: `-- Rank verified products by durability & real user value score
SELECT
  p.slug,
  p.category_name,
  p.price_usd,
  ROUND(p.price_usd / NULLIF(p.expected_lifespan_days, 0), 2) AS cost_per_day,
  COUNT(r.id) AS verified_reviews
FROM catalog_products p
LEFT JOIN product_reviews r ON r.product_id = p.id
WHERE p.is_verified = true
  AND p.durability_score >= 8.5
GROUP BY p.id
ORDER BY cost_per_day ASC
LIMIT 10;`,
  },
  css_tokens: {
    labelAr: 'CSS / هويات لونية',
    labelEn: 'CSS / Design Tokens',
    fileName: 'aqurivo-tokens.css',
    language: 'css',
    code: `:root {
  /* AQURIVO Precision Architectural Palette */
  --surface-vault-deep: #091322;
  --accent-emerald-core: #10B981;
  --accent-sovereign-gold: #F59E0B;
  --accent-cyber-sky: #38BDF8;
  --radius-squircle: 16px;
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
}`,
  },
};

export interface SyntaxToken {
  type:
    | 'comment'
    | 'string'
    | 'keyword'
    | 'number'
    | 'function'
    | 'operator'
    | 'plain';
  value: string;
}

const KEYWORDS_SET = new Set([
  'export',
  'import',
  'from',
  'interface',
  'type',
  'function',
  'const',
  'let',
  'var',
  'return',
  'if',
  'else',
  'for',
  'while',
  'in',
  'range',
  'def',
  'class',
  'async',
  'await',
  'true',
  'false',
  'null',
  'undefined',
  'number',
  'string',
  'boolean',
  'float',
  'int',
  'dict',
  'SELECT',
  'FROM',
  'WHERE',
  'LEFT',
  'JOIN',
  'ON',
  'AND',
  'OR',
  'GROUP',
  'BY',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'AS',
]);

export function tokenizeCodeLine(line: string): SyntaxToken[] {
  const trimmed = line.trimStart();
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('--') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*')
  ) {
    return [{ type: 'comment', value: line }];
  }

  const regex =
    /(".*?"|'.*?'|`.*?`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b(?=\s*\()|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,:;+\-*/=<>!&|]+)/g;

  const tokens: SyntaxToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'plain',
        value: line.slice(lastIndex, match.index),
      });
    }
    const val = match[0];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('`') && val.endsWith('`'))
    ) {
      tokens.push({ type: 'string', value: val });
    } else if (/^\d/.test(val)) {
      tokens.push({ type: 'number', value: val });
    } else if (KEYWORDS_SET.has(val) || KEYWORDS_SET.has(val.toUpperCase())) {
      tokens.push({ type: 'keyword', value: val });
    } else if (
      line.slice(match.index + val.length).trimStart().startsWith('(') &&
      /^[A-Za-z_]/.test(val)
    ) {
      tokens.push({ type: 'function', value: val });
    } else if (/^[{}()[\].,:;+\-*/=<>!&|]+$/.test(val)) {
      tokens.push({ type: 'operator', value: val });
    } else {
      tokens.push({ type: 'plain', value: val });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'plain', value: line.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'plain', value: line }];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function CodeToImage({ locale }: CodeToImageProps) {
  const isAr = locale === 'ar';

  const [activePreset, setActivePreset] = useState<string>('ts_hook');
  const [themeId, setThemeId] = useState<StudioThemeId>('emerald_noir');
  const [language, setLanguage] = useState<string>('typescript');
  const [fileName, setFileName] = useState<string>('aqurivo-worth-engine.ts');
  const [windowStyle, setWindowStyle] =
    useState<WindowChromeStyle>('macos_color');
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [paddingSize, setPaddingSize] = useState<PaddingSize>(44);
  const [authorSign, setAuthorSign] = useState<string>('AQURIVO.STUDIO');
  const [code, setCode] = useState<string>(CODE_PRESETS.ts_hook.code);

  const [exportStatus, setExportStatus] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const activeTheme = STUDIO_THEMES[themeId];
  const lines = useMemo(() => code.split('\n'), [code]);

  const applyCodePreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (presetKey === 'clear') {
      setCode('');
      setFileName('snippet.ts');
      return;
    }
    const p = CODE_PRESETS[presetKey];
    if (p) {
      setCode(p.code);
      setFileName(p.fileName);
      setLanguage(p.language);
    }
  };

  /**
   * Renders a crisp 2x Retina Canvas directly from the tokenized AST
   * without relying on external third-party scripts.
   */
  const buildRetinaCanvas = (): HTMLCanvasElement => {
    const scale = 2; // 2x Retina DPI
    const pad = paddingSize;
    const fontSize = 14;
    const lineHeight = 23;
    const codeLines = code.split('\n');

    const measureCanvas = document.createElement('canvas');
    const mCtx = measureCanvas.getContext('2d')!;
    mCtx.font = `600 ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

    const maxLineCharsWidth = codeLines.reduce((maxW, ln) => {
      const w = mCtx.measureText(ln || ' ').width;
      return Math.max(maxW, w);
    }, 320);

    const lineNumGutter = showLineNumbers ? 44 : 0;
    const innerPadX = 26;
    const innerPadY = 24;
    const titleBarHeight = windowStyle === 'none' ? 0 : 44;
    const footerHeight = authorSign.trim() ? 32 : 0;

    const windowWidth = Math.max(
      460,
      Math.ceil(maxLineCharsWidth + lineNumGutter + innerPadX * 2)
    );
    const windowHeight =
      titleBarHeight +
      codeLines.length * lineHeight +
      innerPadY * 2 +
      footerHeight;

    const totalWidth = windowWidth + pad * 2;
    const totalHeight = windowHeight + pad * 2;

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth * scale;
    canvas.height = totalHeight * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // 1. Draw Backdrop Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, totalWidth, totalHeight);
    bgGrad.addColorStop(0, activeTheme.backdropStops[0]);
    bgGrad.addColorStop(0.5, activeTheme.backdropStops[1]);
    bgGrad.addColorStop(1, activeTheme.backdropStops[2]);
    drawRoundedRect(ctx, 0, 0, totalWidth, totalHeight, 18);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // 2. Draw Window Shadow & Body
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    drawRoundedRect(ctx, pad, pad, windowWidth, windowHeight, 14);
    ctx.fillStyle = activeTheme.windowBg;
    ctx.fill();
    ctx.restore();

    // Window Border
    drawRoundedRect(ctx, pad, pad, windowWidth, windowHeight, 14);
    ctx.strokeStyle = activeTheme.windowBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Draw Title Bar if enabled
    if (windowStyle !== 'none') {
      ctx.save();
      drawRoundedRect(ctx, pad, pad, windowWidth, titleBarHeight, 14);
      ctx.fillStyle = activeTheme.titleBarBg;
      ctx.fill();
      ctx.restore();

      // Traffic dots or geometric squares
      const dotY = pad + titleBarHeight / 2;
      if (windowStyle === 'macos_color' || windowStyle === 'macos_mono') {
        const colors =
          windowStyle === 'macos_color'
            ? ['#F43F5E', '#F59E0B', '#10B981']
            : ['#64748B', '#64748B', '#64748B'];
        colors.forEach((col, i) => {
          ctx.beginPath();
          ctx.arc(pad + 20 + i * 18, dotY, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
        });
      } else if (windowStyle === 'geometric') {
        ['#10B981', '#38BDF8', '#F59E0B'].forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(pad + 16 + i * 16, dotY - 4, 8, 8);
        });
      }

      // File Name Center
      ctx.font = `600 12.5px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeTheme.textPrimary;
      ctx.textAlign = 'center';
      ctx.fillText(
        fileName.trim() || 'snippet.ts',
        pad + windowWidth / 2,
        dotY + 4
      );

      // Language Badge Right
      ctx.textAlign = 'right';
      ctx.fillStyle = activeTheme.badgeText;
      ctx.font = `700 11px "JetBrains Mono", monospace`;
      ctx.fillText(
        language.toUpperCase(),
        pad + windowWidth - 18,
        dotY + 4
      );
    }

    // 4. Draw Code Lines & Syntax Tokens
    ctx.textAlign = 'left';
    ctx.font = `500 ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

    const startY = pad + titleBarHeight + innerPadY + fontSize - 2;
    codeLines.forEach((ln, lineIdx) => {
      const y = startY + lineIdx * lineHeight;

      if (showLineNumbers) {
        ctx.fillStyle = activeTheme.lineNumColor;
        ctx.fillText(String(lineIdx + 1).padStart(2, ' '), pad + innerPadX, y);
      }

      let cursorX = pad + innerPadX + lineNumGutter;
      const tokens = tokenizeCodeLine(ln);

      tokens.forEach((tok) => {
        switch (tok.type) {
          case 'keyword':
            ctx.fillStyle = activeTheme.tokKeyword;
            break;
          case 'string':
            ctx.fillStyle = activeTheme.tokString;
            break;
          case 'number':
            ctx.fillStyle = activeTheme.tokNumber;
            break;
          case 'function':
            ctx.fillStyle = activeTheme.tokFunction;
            break;
          case 'comment':
            ctx.fillStyle = activeTheme.tokComment;
            break;
          case 'operator':
            ctx.fillStyle = activeTheme.tokOperator;
            break;
          default:
            ctx.fillStyle = activeTheme.textPrimary;
        }
        ctx.fillText(tok.value, cursorX, y);
        cursorX += ctx.measureText(tok.value).width;
      });
    });

    // 5. Optional Footer Watermark
    if (authorSign.trim()) {
      const footerY = pad + windowHeight - 12;
      ctx.font = `700 10.5px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeTheme.lineNumColor;
      ctx.textAlign = 'right';
      ctx.fillText(authorSign.trim(), pad + windowWidth - 18, footerY);
    }

    return canvas;
  };

  const handleDownloadRetinaPng = () => {
    if (!code.trim()) return;
    try {
      const canvas = buildRetinaCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanName = (fileName || 'aqurivo-code').replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );
      link.download = `${cleanName}-2x.png`;
      link.href = dataUrl;
      link.click();

      setExportStatus(
        isAr
          ? 'تم تنزيل الصورة بدقة Retina 2x PNG بنجاح ✓'
          : 'Downloaded 2x Retina PNG successfully ✓'
      );
      setTimeout(() => setExportStatus(''), 3000);
    } catch {
      setExportStatus('');
    }
  };

  const handleCopyImageToClipboard = () => {
    if (!code.trim()) return;
    try {
      const canvas = buildRetinaCanvas();
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && 'ClipboardItem' in window) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setExportStatus(
              isAr
                ? 'تم نسخ الصورة عالية الدقة إلى الحافظة ✓'
                : 'Copied 2x PNG image to clipboard ✓'
            );
            setTimeout(() => setExportStatus(''), 3000);
          } catch {
            handleDownloadRetinaPng();
          }
        } else {
          handleDownloadRetinaPng();
        }
      }, 'image/png');
    } catch {
      handleDownloadRetinaPng();
    }
  };

  const handleCopyRawCode = async () => {
    if (!code.trim()) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2400);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. STUDIO HEADER BAR */}
      <header className={styles.studioHeaderBar}>
        <CodeToImageLogo size="md" showWordmark locale={locale} />

        <div className={styles.presetRibbon} role="group">
          {Object.entries(CODE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyCodePreset(key)}
              className={`${styles.presetBtn} ${
                activePreset === key ? styles.presetBtnActive : ''
              }`}
            >
              <Code2 size={13} />
              <span>{isAr ? preset.labelAr : preset.labelEn}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyCodePreset('clear')}
            className={styles.clearBtn}
          >
            <RotateCcw size={13} />
            <span>{isAr ? 'تفريغ المحرر' : 'Clear Editor'}</span>
          </button>
        </div>
      </header>

      {/* 2. STUDIO CONTROL DECK */}
      <section className={styles.controlDeckCard}>
        {/* Theme & Backdrop Swatches */}
        <div className={styles.themeSwatchesRow}>
          <span className={styles.controlSectionLabel}>
            {isAr
              ? 'ثيم الإضاءة وخلفية الاستوديو (6 ثيمات):'
              : 'Studio Backdrop & Syntax Theme (6 Curated Themes):'}
          </span>
          <div className={styles.themeGrid}>
            {Object.values(STUDIO_THEMES).map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setThemeId(th.id)}
                className={`${styles.themePillBtn} ${
                  themeId === th.id ? styles.themePillBtnActive : ''
                }`}
              >
                <span
                  className={styles.themeSwatchCircle}
                  style={{ background: th.backdropCss }}
                />
                <span className={styles.themeNameText}>
                  {isAr ? th.nameAr : th.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Window & Formatting Controls */}
        <div className={styles.controlsGridRow}>
          <div className={styles.controlField}>
            <label htmlFor="cti-lang-select" className={styles.controlLabel}>
              {isAr ? 'اللغة البرمجية' : 'Language'}
            </label>
            <select
              id="cti-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={styles.selectInput}
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="css">HTML / CSS</option>
              <option value="rust">Rust / Go</option>
              <option value="json">JSON</option>
              <option value="bash">Bash / Shell</option>
            </select>
          </div>

          <div className={styles.controlField}>
            <label htmlFor="cti-file-input" className={styles.controlLabel}>
              {isAr ? 'عنوان الملف في النافذة' : 'Window File Title'}
            </label>
            <input
              id="cti-file-input"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="aqurivo-engine.ts"
              className={styles.textInput}
              dir="ltr"
            />
          </div>

          <div className={styles.controlField}>
            <label htmlFor="cti-chrome-select" className={styles.controlLabel}>
              {isAr ? 'نمط إطار النافذة' : 'Window Frame Chrome'}
            </label>
            <select
              id="cti-chrome-select"
              value={windowStyle}
              onChange={(e) =>
                setWindowStyle(e.target.value as WindowChromeStyle)
              }
              className={styles.selectInput}
            >
              <option value="macos_color">
                {isAr ? 'macOS ملون كلاسيكي' : 'macOS Traffic Lights'}
              </option>
              <option value="macos_mono">
                {isAr ? 'macOS أحادي هادئ' : 'macOS Monochrome'}
              </option>
              <option value="geometric">
                {isAr ? 'معماري هندسي حاد' : 'Architectural Geometric'}
              </option>
              <option value="none">
                {isAr ? 'بدون شريط علوي' : 'Frameless Minimal'}
              </option>
            </select>
          </div>

          <div className={styles.controlField}>
            <span className={styles.controlLabel}>
              {isAr ? 'حجم الحواف (Padding)' : 'Canvas Padding'}
            </span>
            <div className={styles.segmentedGroup}>
              {([24, 44, 64] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaddingSize(p)}
                  className={`${styles.segBtn} ${
                    paddingSize === p ? styles.segBtnActive : ''
                  }`}
                >
                  {p}px
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlField}>
            <span className={styles.controlLabel}>
              {isAr ? 'أرقام الأسطر' : 'Line Numbers'}
            </span>
            <button
              type="button"
              onClick={() => setShowLineNumbers((v) => !v)}
              className={`${styles.toggleBtn} ${
                showLineNumbers ? styles.toggleBtnOn : ''
              }`}
            >
              <Hash size={14} />
              <span>
                {showLineNumbers
                  ? isAr
                    ? 'مفعّلة ✓'
                    : 'Visible ✓'
                  : isAr
                    ? 'مخفية'
                    : 'Hidden'}
              </span>
            </button>
          </div>

          <div className={styles.controlField}>
            <label htmlFor="cti-author-input" className={styles.controlLabel}>
              {isAr ? 'توقيع سفلي (اختياري)' : 'Footer Watermark'}
            </label>
            <input
              id="cti-author-input"
              type="text"
              value={authorSign}
              onChange={(e) => setAuthorSign(e.target.value)}
              placeholder="@username"
              className={styles.textInput}
              dir="ltr"
            />
          </div>
        </div>
      </section>

      {/* 3. WORKBENCH: LIVE SYNTAX STAGE + EDITOR */}
      <div className={styles.workbenchSplit}>
        {/* CODE EDITOR PANEL */}
        <section className={styles.editorCard}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitleGroup}>
              <FileCode size={17} className={styles.iconSky} />
              <h2 className={styles.cardHeading}>
                {isAr ? 'محرر الكود المصدري' : 'Source Code Editor'}
              </h2>
            </div>
            <span className={styles.statsCounterBadge}>
              {lines.length} {isAr ? 'سطر' : 'lines'} • {code.length}{' '}
              {isAr ? 'حرف' : 'chars'}
            </span>
          </div>

          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setActivePreset('custom');
            }}
            placeholder={
              isAr
                ? '// الصق أو اكتب الكود البرمجي هنا...'
                : '// Paste or type your source code here...'
            }
            className={styles.codeTextarea}
            dir="ltr"
            spellCheck={false}
          />

          <div className={styles.editorFooter}>
            <button
              type="button"
              onClick={handleCopyRawCode}
              className={styles.secondaryActionBtn}
            >
              {copiedCode ? <Check size={15} /> : <Copy size={15} />}
              <span>
                {copiedCode
                  ? isAr
                    ? 'تم نسخ النص البرمجي ✓'
                    : 'Raw Code Copied ✓'
                  : isAr
                    ? 'نسخ الكود النصي'
                    : 'Copy Raw Code'}
              </span>
            </button>
          </div>
        </section>

        {/* LIVE SYNTAX-HIGHLIGHTED PREVIEW STAGE */}
        <section className={styles.previewCard}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitleGroup}>
              <Eye size={17} className={styles.iconEmerald} />
              <h2 className={styles.cardHeading}>
                {isAr
                  ? 'المعاينة البصرية الحية (تلوين تلقائي للكود)'
                  : 'Live Syntax-Highlighted Studio Stage'}
              </h2>
            </div>
            <span className={styles.retinaBadge}>RETINA 2X PNG</span>
          </div>

          <div className={styles.stageViewport}>
            <div
              className={styles.canvasBackdrop}
              style={{
                background: activeTheme.backdropCss,
                padding: `${paddingSize}px`,
              }}
            >
              <div
                className={styles.codeWindowFrame}
                style={{
                  backgroundColor: activeTheme.windowBg,
                  borderColor: activeTheme.windowBorder,
                  color: activeTheme.textPrimary,
                }}
              >
                {windowStyle !== 'none' && (
                  <div
                    className={styles.windowHeaderBar}
                    style={{ backgroundColor: activeTheme.titleBarBg }}
                  >
                    <div className={styles.windowControlsCluster}>
                      {windowStyle === 'macos_color' && (
                        <>
                          <span
                            className={styles.dotCircle}
                            style={{ background: '#F43F5E' }}
                          />
                          <span
                            className={styles.dotCircle}
                            style={{ background: '#F59E0B' }}
                          />
                          <span
                            className={styles.dotCircle}
                            style={{ background: '#10B981' }}
                          />
                        </>
                      )}
                      {windowStyle === 'macos_mono' && (
                        <>
                          <span
                            className={styles.dotCircle}
                            style={{ background: '#64748B' }}
                          />
                          <span
                            className={styles.dotCircle}
                            style={{ background: '#64748B' }}
                          />
                          <span
                            className={styles.dotCircle}
                            style={{ background: '#64748B' }}
                          />
                        </>
                      )}
                      {windowStyle === 'geometric' && (
                        <>
                          <span
                            className={styles.dotSquare}
                            style={{ background: '#10B981' }}
                          />
                          <span
                            className={styles.dotSquare}
                            style={{ background: '#38BDF8' }}
                          />
                          <span
                            className={styles.dotSquare}
                            style={{ background: '#F59E0B' }}
                          />
                        </>
                      )}
                    </div>

                    <span
                      className={styles.windowTitleText}
                      style={{ color: activeTheme.textPrimary }}
                    >
                      {fileName.trim() || 'snippet.ts'}
                    </span>

                    <span
                      className={styles.windowLangBadge}
                      style={{
                        backgroundColor: activeTheme.badgeBg,
                        color: activeTheme.badgeText,
                      }}
                    >
                      {language.toUpperCase()}
                    </span>
                  </div>
                )}

                <pre className={styles.codeBlockPre} dir="ltr">
                  <code>
                    {lines.map((ln, idx) => {
                      const tokens = tokenizeCodeLine(ln);
                      return (
                        <div key={idx} className={styles.codeRenderLine}>
                          {showLineNumbers && (
                            <span
                              className={styles.lineNumCol}
                              style={{ color: activeTheme.lineNumColor }}
                            >
                              {idx + 1}
                            </span>
                          )}
                          <span className={styles.lineTokensWrap}>
                            {tokens.map((tok, tIdx) => {
                              let tokColor = activeTheme.textPrimary;
                              if (tok.type === 'keyword')
                                tokColor = activeTheme.tokKeyword;
                              else if (tok.type === 'string')
                                tokColor = activeTheme.tokString;
                              else if (tok.type === 'number')
                                tokColor = activeTheme.tokNumber;
                              else if (tok.type === 'function')
                                tokColor = activeTheme.tokFunction;
                              else if (tok.type === 'comment')
                                tokColor = activeTheme.tokComment;
                              else if (tok.type === 'operator')
                                tokColor = activeTheme.tokOperator;

                              return (
                                <span
                                  key={tIdx}
                                  style={{
                                    color: tokColor,
                                    fontStyle:
                                      tok.type === 'comment'
                                        ? 'italic'
                                        : 'normal',
                                    fontWeight:
                                      tok.type === 'keyword' ||
                                      tok.type === 'function'
                                        ? 600
                                        : 500,
                                  }}
                                >
                                  {tok.value || ' '}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </code>
                </pre>

                {authorSign.trim() && (
                  <div
                    className={styles.windowFooterSign}
                    style={{ color: activeTheme.lineNumColor }}
                  >
                    {authorSign.trim()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* EXPORT ACTION BAR */}
          <div className={styles.exportActionBar}>
            <button
              type="button"
              onClick={handleDownloadRetinaPng}
              disabled={!code.trim()}
              className={styles.primaryExportBtn}
            >
              <Download size={16} />
              <span>
                {isAr
                  ? 'تحميل صورة عالية الدقة PNG (2x Retina)'
                  : 'Download High-Res PNG (2x Retina)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyImageToClipboard}
              disabled={!code.trim()}
              className={styles.clipboardImageBtn}
            >
              <ImageIcon size={16} />
              <span>
                {isAr
                  ? 'نسخ الصورة إلى الحافظة (Copy Image)'
                  : 'Copy Image to Clipboard'}
              </span>
            </button>
          </div>

          {exportStatus && (
            <div className={styles.exportToast} role="status">
              <RetinaExportVerifiedIcon size={16} />
              <span>{exportStatus}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CodeToImage;
