'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './not-found.module.css';

export function NotFoundContent() {
  const { locale } = useI18n();
  const isArabic = locale === 'ar';
  const sceneRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const aimFlashlight = (clientX: number, clientY: number) => {
    const scene = sceneRef.current;
    if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bounds = scene.getBoundingClientRect();
    const scale = Math.min(bounds.width / 760, bounds.height / 428);
    const offsetX = (bounds.width - 760 * scale) / 2;
    const offsetY = (bounds.height - 428 * scale) / 2;
    const x = (clientX - bounds.left - offsetX) / scale;
    const y = (clientY - bounds.top - offsetY) / scale;
    const angle = (Math.atan2(y - 106, x - 143) * 180) / Math.PI;
    const aim = Math.max(-14, Math.min(18, angle - 11));
    scene.style.setProperty('--pointer-aim', `${aim.toFixed(2)}deg`);
  };

  return (
    <section className={styles.card} aria-labelledby="not-found-title">
      <div
        ref={sceneRef}
        className={styles.scene}
        onPointerMove={(event) => aimFlashlight(event.clientX, event.clientY)}
        onPointerDown={(event) => aimFlashlight(event.clientX, event.clientY)}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') {
            sceneRef.current?.style.setProperty('--pointer-aim', '0deg');
          }
        }}
      >
        <svg
          className={styles.illustration}
          viewBox="0 0 760 428"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="yeti-night" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0d2945" />
              <stop offset="0.48" stopColor="#0a354e" />
              <stop offset="1" stopColor="#073047" />
            </linearGradient>
            <linearGradient id="light-cone" x1="0.1" y1="0.2" x2="0.9" y2="0.85">
              <stop offset="0" stopColor="#fffde1" stopOpacity=".96" />
              <stop offset=".42" stopColor="#f7f6df" stopOpacity=".92" />
              <stop offset="1" stopColor="#dfe8df" stopOpacity=".66" />
            </linearGradient>
            <linearGradient id="cone-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fffde1" stopOpacity=".9" />
              <stop offset="1" stopColor="#fffde1" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="lens-glow">
              <stop offset="0" stopColor="#fffedb" stopOpacity=".95" />
              <stop offset=".34" stopColor="#fff3c6" stopOpacity=".65" />
              <stop offset="1" stopColor="#fff3c6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="yeti-fur" x1=".15" y1="0" x2=".8" y2="1">
              <stop offset="0" stopColor="#effbff" />
              <stop offset=".58" stopColor="#bfe7f7" />
              <stop offset="1" stopColor="#79b5d3" />
            </linearGradient>
            <filter id="beam-soft" x="-20%" y="-30%" width="150%" height="170%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="number-shadow" x="-30%" y="-35%" width="180%" height="190%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          <rect width="760" height="428" fill="url(#yeti-night)" />
          <path
            d="M0 0h185q-8 18-25 27-21 7-25 24-5 15-24 22-18 7-23 23-5 15-24 22-16 7-23 22L0 151Z"
            fill="#071d34"
          />
          <path
            d="M0 151q22-2 37-17 8-11 24-17 20-7 25-23 6-16 23-22 20-7 26-24 4-13 22-21 15-7 22-20"
            fill="none"
            stroke="#6b9eb6"
            strokeOpacity=".42"
            strokeWidth="3"
          />

          <g className={styles.flashlightBeam}>
            <g className={styles.pointerAim}>
              <path
                d="m143 106 617 126v196H165Z"
                fill="url(#light-cone)"
                opacity=".92"
              />
              <path
                d="m143 106 617 126"
                fill="none"
                stroke="url(#cone-edge)"
                strokeWidth="12"
                filter="url(#beam-soft)"
                opacity=".9"
              />
              <path
                d="m143 106 617 126"
                fill="none"
                stroke="#fffde7"
                strokeOpacity=".72"
                strokeWidth="1.5"
              />
              <ellipse
                cx="143"
                cy="106"
                rx="50"
                ry="30"
                fill="url(#lens-glow)"
                filter="url(#beam-soft)"
              />
            </g>
          </g>

          <g className={styles.numberFloat}>
            <g className={styles.numberShadow} transform="rotate(14 285 250)">
              <text
                x="285"
                y="307"
                textAnchor="middle"
                fill="#a5a9a0"
                fillOpacity=".76"
                filter="url(#number-shadow)"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="132"
                fontWeight="900"
                letterSpacing="-9"
              >
                404
              </text>
            </g>
            <g className={styles.numberDepth} transform="rotate(14 285 250)">
              {Array.from({ length: 10 }, (_, index) => (
                <text
                  key={index}
                  x={285 + (index + 1) * 3}
                  y={307 + (index + 1) * 4}
                  textAnchor="middle"
                  fill={index < 4 ? '#87928f' : '#596c70'}
                  stroke="#50656b"
                  strokeWidth="1"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="132"
                  fontWeight="900"
                  letterSpacing="-9"
                >
                  404
                </text>
              ))}
            </g>
            <g className={styles.errorNumber} transform="rotate(14 285 250)">
              <text
                x="285"
                y="307"
                textAnchor="middle"
                fill="#68b5e4"
                stroke="#bceaff"
                strokeWidth="3"
                paintOrder="stroke"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="132"
                fontWeight="900"
                letterSpacing="-9"
              >
                404
              </text>
            </g>
          </g>

          <g className={styles.yetiRig}>
            <path
              d="M20 111q17-25 42-31 31-10 48-38l26-25q25-4 43 12 13 13 8 34-4 18-25 27l-36 17q-16 13-27 30H18Z"
              fill="#0b2944"
            />
            <path
              d="M0 120q17-4 30-16 11-11 28-14 19-4 27-19 8-15 24-22"
              fill="none"
              stroke="#4c7e99"
              strokeOpacity=".6"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M26 126q4-28 25-39 16-8 31-2 15 7 19 24 4 18-9 31-13 13-34 11-20-2-29-14Z"
              fill="#163a55"
            />
            <g className={styles.yetiHead}>
              <path
                d="M42 67q-5-7-5-16-1-8 5-9 5-1 8 5-2-22 12-33l3 12q11-17 26-15l-4 13q19-7 32 6l-9 5q16 12 9 31-8 22-32 25-27 2-40-18Z"
                fill="url(#yeti-fur)"
              />
              <path
                d="M48 39 38 25q-5-7 1-12 7-4 15 8Zm57-7 10-13q5-7 11-2 6 5 1 12l-11 13Z"
                fill="#b9e4f5"
              />
              <path
                d="M54 31q9-17 24-19l-5 9q13-9 26-5l-7 8q12-1 18 7-14-7-26 1-15-7-30 6Z"
                fill="#82bedb"
                opacity=".85"
              />
              <g className={styles.yetiEyes}>
                <ellipse cx="67" cy="49" rx="3.6" ry="5.3" fill="#102c40" />
                <ellipse cx="93" cy="49" rx="3.6" ry="5.3" fill="#102c40" />
                <circle className={styles.yetiPupil} cx="68" cy="49" r="1.4" fill="#fff" />
                <circle className={styles.yetiPupil} cx="94" cy="49" r="1.4" fill="#fff" />
              </g>
              <path d="M75 58q6-5 12 0l-6 7Z" fill="#527f98" />
              <path
                d="M75 71q7 5 15 0"
                fill="none"
                stroke="#537d91"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M42 83q-14 3-20 15-7 13-2 24 3 7 11 4l16-15Z"
                fill="url(#yeti-fur)"
              />
              <path
                d="M50 81q-7 16 1 28l18 11 27-9q10-10 8-25-10 11-26 8-17-1-28-13Z"
                fill="url(#yeti-fur)"
              />
              <path d="M48 105q15 9 36 4" fill="none" stroke="#92c9df" strokeWidth="2" />
              <path
                d="M54 118q16 13 36 4"
                fill="none"
                stroke="#82b8d0"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <g className={styles.yetiBreath} fill="none" stroke="#e8faff" strokeLinecap="round">
                <path d="M103 68q12-4 19 0" strokeOpacity=".72" strokeWidth="3" />
              </g>
            </g>
            <g className={styles.flashlightArm}>
              <g className={styles.pointerAim}>
                <path
                  d="M92 93q18 5 32 13"
                  fill="none"
                  stroke="url(#yeti-fur)"
                  strokeWidth="13"
                  strokeLinecap="round"
                />
                <path
                  d="M118 103q6-6 12-3l11 5-6 12-14-4Z"
                  fill="#d7f0fc"
                />
                <g className={styles.torch}>
                  <path
                    d="m129 98 18 5q5 1 4 6l-2 5q-1 5-6 3l-18-6Z"
                    fill="#142837"
                  />
                  <path d="m132 100 14 4-3 9-14-4Z" fill="#375264" />
                  <ellipse cx="148" cy="107" rx="3" ry="5.5" fill="#fff9cd" />
                  <ellipse cx="151" cy="107" rx="20" ry="15" fill="url(#lens-glow)" />
                  <path
                    d="m134 100 1-3m5 5 1-3m5 4 1-3"
                    stroke="#87aabe"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            </g>
          </g>
        </svg>

        <div className={styles.sceneCopy} dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
          <p className={styles.eyebrow}>
            {isArabic ? '404 · الصفحة غير موجودة' : '404 · PAGE NOT FOUND'}
          </p>
          <h1 className={styles.title} id="not-found-title">
            {isArabic ? 'ألو؟! هل يسمعني أحد؟!' : 'Hello?! Is somebody there?!'}
          </h1>
          <p className={styles.description}>
            {isArabic
              ? 'الصفحة التي تبحث عنها غير موجودة.'
              : 'The page you are looking for is not here.'}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={`/${locale}`} className={styles.primaryBtn}>
          {isArabic ? 'العودة إلى الرئيسية' : 'Back to home'}
        </Link>
        {canGoBack && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => window.history.back()}
          >
            {isArabic ? 'العودة إلى الصفحة السابقة' : 'Go back'}
          </button>
        )}
        <Link href={`/${locale}/products`} className={styles.secondaryBtn}>
          {isArabic ? 'تصفح المنتجات' : 'Explore products'}
        </Link>
      </div>
    </section>
  );
}
