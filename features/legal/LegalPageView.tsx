'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Shield } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useToast } from '@/components/ui/Toast';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { Button } from '@/components/ui/Button';
import styles from './LegalPageView.module.css';

export type LegalDocType = 'privacy' | 'terms' | 'affiliate-disclosure' | 'cookies';

export const COOKIE_CONSENT_STORAGE_KEY = 'soufshop_cookie_consent';

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export function LegalPageView({ docType }: { docType: LegalDocType }) {
  const { locale, messages } = useI18n();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [analyticsConsent, setAnalyticsConsent] = useState<'accepted' | 'essential_only'>(
    () => {
      if (typeof window === 'undefined') return 'essential_only';
      try {
        const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        if (stored === 'accepted' || stored === 'essential_only') return stored;
      } catch {}
      return 'essential_only';
    }
  );

  const handleSaveCookiePref = (choice: 'accepted' | 'essential_only') => {
    setAnalyticsConsent(choice);
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
      document.cookie = `${COOKIE_CONSENT_STORAGE_KEY}=${choice}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('soufshop-cookie-updated'));
    } catch {
      // Ignore storage write errors
    }
    showToast(
      isAr
        ? 'تم حفظ تفضيلات ملفات تعريف الارتباط الخاصة بك.'
        : 'Your cookie preferences have been saved.',
      'success'
    );
  };

  const docContent = getLegalDocumentContent(docType, isAr);

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={`${styles.header} revealUp`}>
          <SignatureMotif index="01" label={messages.footer.legalLinks} />
          <h1 className={styles.title}>{docContent.title}</h1>
          <p className={styles.subtitle}>{docContent.subtitle}</p>

          <nav className={styles.legalTabs} aria-label="Legal Documents">
            <Link
              href="/privacy"
              className={`${styles.tabLink} ${docType === 'privacy' ? styles.tabActive : ''}`}
            >
              {messages.footer.privacy}
            </Link>
            <Link
              href="/terms"
              className={`${styles.tabLink} ${docType === 'terms' ? styles.tabActive : ''}`}
            >
              {messages.footer.terms}
            </Link>
            <Link
              href="/affiliate-disclosure"
              className={`${styles.tabLink} ${
                docType === 'affiliate-disclosure' ? styles.tabActive : ''
              }`}
            >
              {messages.footer.affiliateDisclosure}
            </Link>
            <Link
              href="/cookies"
              className={`${styles.tabLink} ${docType === 'cookies' ? styles.tabActive : ''}`}
            >
              {messages.footer.cookieSettings}
            </Link>
            <Link href={`/${locale}/security`} className={styles.tabLink}>
              {isAr ? 'شهادات الأمان والموثوقية' : 'Security & Trust'}
            </Link>
          </nav>
        </header>

        {/* Interactive Cookie Consent Control Panel on /cookies */}
        {docType === 'cookies' && (
          <section className={styles.cookieControlCard}>
            <div className={styles.cookieControlHeader}>
              <Shield size={20} className={styles.shieldIcon} aria-hidden="true" />
              <h2 className={styles.controlTitle}>
                {isAr
                  ? 'إدارة تفضيلات ملفات تعريف الارتباط الحالية'
                  : 'Manage Your Active Cookie Preferences'}
              </h2>
            </div>

            <p className={styles.controlDescription}>
              {isAr
                ? 'يمكنك تغيير تفضيلاتك أو سحب موافقتك في أي وقت بضغطة واحدة. ملفات تعريف الارتباط الضرورية (حفظ اللغة، المظهر، وأمان الجلسة) تبقى مفعّلة لضمان عمل الموقع بشكل سليم.'
                : 'You can change your mind or withdraw consent at any time. Essential cookies (language, display theme, and session security) remain active so the site functions properly.'}
            </p>

            <div className={styles.currentStatusRow}>
              <CheckCircle2 size={16} className={styles.shieldIcon} aria-hidden="true" />
              <span>
                {isAr ? 'حالتك الحالية: ' : 'Your current setting: '}
                <strong>
                  {analyticsConsent === 'accepted'
                    ? isAr
                      ? 'الضرورية + الإحصائيات الاختيارية مفعّلة'
                      : 'Essential + Optional Analytics Enabled'
                    : isAr
                      ? 'ملفات الارتباط الضرورية فقط'
                      : 'Essential Cookies Only'}
                </strong>
              </span>
            </div>

            <div className={styles.controlButtons}>
              <Button
                variant={analyticsConsent === 'essential_only' ? 'primary' : 'outline'}
                onClick={() => handleSaveCookiePref('essential_only')}
              >
                {messages.cookies.essentialOnly}
              </Button>
              <Button
                variant={analyticsConsent === 'accepted' ? 'primary' : 'outline'}
                onClick={() => handleSaveCookiePref('accepted')}
              >
                {messages.cookies.acceptAll}
              </Button>
            </div>
          </section>
        )}

        {/* Legal Document Sections */}
        <article className={styles.proseContainer}>
          {docContent.sections.map((sec, idx) => (
            <section key={idx} className={styles.legalSection}>
              <h2 className={styles.sectionHeading}>{sec.heading}</h2>
              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className={styles.paragraph}>
                  {p}
                </p>
              ))}
            </section>
          ))}

          <footer className={styles.docFooter}>
            <p>
              {isAr
                ? (docType === 'privacy' 
                    ? 'لأي استفسار متعلق بالخصوصية وحماية البيانات، تواصل معنا مباشرة عبر: '
                    : 'لأي استفسار قانوني أو متعلق بالشروط، تواصل معنا مباشرة عبر: ')
                : (docType === 'privacy'
                    ? 'For privacy and data protection inquiries, reach our team directly at: '
                    : 'For legal and regulatory inquiries, contact our legal team at: ')}
              <a
                href={`mailto:${
                  docType === 'privacy'
                    ? 'privacy@aqurivo.store'
                    : docType === 'terms' || docType === 'affiliate-disclosure'
                    ? 'legal@aqurivo.store'
                    : 'contact@aqurivo.store'
                }`}
                className={styles.mailLink}
              >
                {docType === 'privacy'
                  ? 'privacy@aqurivo.store'
                  : docType === 'terms' || docType === 'affiliate-disclosure'
                  ? 'legal@aqurivo.store'
                  : 'contact@aqurivo.store'}
              </a>
            </p>
          </footer>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

function getLegalDocumentContent(
  docType: LegalDocType,
  isAr: boolean
): { title: string; subtitle: string; sections: LegalSection[] } {
  if (docType === 'privacy') {
    return isAr
      ? {
          title: 'سياسة الخصوصية وحماية البيانات',
          subtitle:
            'نلتزم في AQURIVO بأعلى معايير الخصوصية والشفافية وفق اللائحة العامة لحماية البيانات (GDPR).',
          sections: [
            {
              heading: '1. مبدأ الحد الأدنى من البيانات',
              paragraphs: [
                'صُمّم موقع AQURIVO بحيث يمكنك تصفح جميع المنتجات، وقراءة أدلة الشراء، وحفظ منتجاتك المفضلة على جهازك دون الحاجة لإنشاء حساب أو تقديم أي بيانات شخصية.',
                'نحن لا نبيع ولا نؤجر ولا نشارك بيانات زوارنا الشخصية مع أي جهات إعلانية خارجية.',
              ],
            },
            {
              heading: '2. البيانات التي تُجمع عند استخدامك للموقع',
              paragraphs: [
                'التفضيلات المحلية: تُحفظ لغة العرض (العربية أو الإنجليزية)، والمظهر (فاتح أو داكن)، وقائمة المحفوظات المحلية داخل متصفحك فقط.',
                'إحصائيات النقرات الخصوصية (/go/[slug]): عند الضغط على رابط شراء للتوجه إلى متجر شريك، نسجّل النقرة لأغراض إحصائية داخلية دون تخزين عنوان IP الخام الخاص بك إطلاقاً؛ إذ يُحوَّل العنوان فوراً إلى بصمة يومية مشفّرة غير قابلة للعكس تتغير كل 24 ساعة.',
                'الحساب الاختياري ونموذج التواصل: إذا اخترت طوعاً إنشاء حساب لمزامنة مفضلتك أو أرسلت رسالة عبر نموذج «تواصل معنا»، نحتفظ ببريدك الإلكتروني ورسالتك فقط لتقديم الخدمة المطلوبة والرد عليك.',
              ],
            },
            {
              heading: '3. حقوقك الكاملة (الوصول، التصحيح، والحذف النهائي)',
              paragraphs: [
                'يحق لك في أي وقت حذف حسابك وجميع بياناتك المحفوظة سحابياً بضغطة زر واحدة من داخل صفحة «المحفوظات وحسابي» (/account)، أو عبر مراسلتنا على privacy@aqurivo.store.',
              ],
            },
            {
              heading: '4. مسؤول حماية البيانات والتواصل المباشر',
              paragraphs: [
                'لأي استفسار يتعلق بالخصوصية، أو ممارسة حقوقك بموجب القوانين المعمول بها (GDPR والقانون المغربي 09-08)، يمكنك التواصل مباشرة مع مكتب حماية البيانات عبر البريد: privacy@aqurivo.store أو عبر واتساب الدعم: +212 684 063908.',
              ],
            },
          ],
        }
      : {
          title: 'Privacy Policy & Data Protection',
          subtitle:
            'AQURIVO is built on strict data minimization and privacy-by-design principles in compliance with GDPR.',
          sections: [
            {
              heading: '1. Data Minimization Principle',
              paragraphs: [
                'You can browse AQURIVO, read all buying guides, and save favorite products locally on your device without creating an account or sharing personal information.',
                'We never sell, rent, or trade visitor personal data with third-party data brokers.',
              ],
            },
            {
              heading: '2. Information We Process',
              paragraphs: [
                'Local Preferences: Your chosen language, light/dark display theme, and guest saved items are stored directly in your browser.',
                'Privacy-First Outbound Click Logging (/go/[slug]): When you click a partner store link, we log aggregate click metrics (product, store, device category) without ever storing your raw IP address. Instead, a daily rotating one-way cryptographic hash is used solely to prevent automated bot spam.',
                'Optional Account & Contact Form: If you voluntarily sign in to sync your saved items across devices or submit a message via our Contact page, we process your email address and message strictly to provide that service.',
              ],
            },
            {
              heading: '3. Your Rights (Access, Portability & Instant Deletion)',
              paragraphs: [
                'If you create an optional account, you can permanently delete your account and all cloud-synced data at any time directly from the Saved & Account page (/account) or by emailing privacy@aqurivo.store.',
              ],
            },
            {
              heading: '4. Data Protection Officer & Privacy Desk',
              paragraphs: [
                'For any inquiries concerning your personal data, data deletion requests, or privacy practices, reach our dedicated compliance officer directly at privacy@aqurivo.store or via verified WhatsApp at +212 684 063908.',
              ],
            },
          ],
        };
  }

  if (docType === 'terms') {
    return isAr
      ? {
          title: 'شروط الاستخدام',
          subtitle:
            'توضح هذه الشروط طبيعة خدمة AQURIVO بصفته دليلاً تحريرياً مستقلاً لترشيح المنتجات.',
          sections: [
            {
              heading: '1. طبيعة الخدمة وعدم البيع المباشر',
              paragraphs: [
                'يعمل موقع AQURIVO كمنصة إعلامية وتحريرية مستقلة لانتقاء ومراجعة المنتجات. نحن لا نبيع المنتجات بشكل مباشر، ولا نستلم مدفوعات من المتسوقين، ولا نتولى عمليات الشحن أو التخزين.',
                'عند الضغط على زر الشراء لأي منتج، يتم توجيهك إلى المتجر الإلكتروني الأصلي (مثل Amazon أو Noon أو Temu أو ClickBank) حيث تتم عملية الشراء والدفع والشحن وفق شروط وسياسات ذلك المتجر.',
              ],
            },
            {
              heading: '2. دقة الأسعار وحالة التوفر',
              paragraphs: [
                'نبذل قصارى جهدنا لمراجعة أسعار المنتجات وتوضيح تاريخ آخر تحقق منها. ومع ذلك، فإن المتاجر العالمية تغيّر أسعارها وعروضها على مدار الساعة. السعر النهائي المعتمد هو السعر الظاهر في صفحة إتمام الطلب لدى المتجر الأصلي وقت شرائك.',
              ],
            },
            {
              heading: '3. الضمان، الاستبدال، وخدمة ما بعد البيع',
              paragraphs: [
                'بما أن عقد البيع ينعقد مباشرة بينك وبين المتجر الشريك، فإن جميع طلبات الإرجاع أو الاستبدال أو الضمان تخضع لسياسة المتجر الذي اشتريت منه المنتج.',
              ],
            },
            {
              heading: '4. الشؤون القانونية وحقوق الملكية الفكرية والتواصل',
              paragraphs: [
                'لأية إخطارات قانونية، أو استفسارات حول حقوق الملكية الفكرية، أو الشراكات الرسمية، يرجى مراسلة الدائرة القانونية عبر البريد: legal@aqurivo.store أو مراسلة الإدارة العامة على contact@aqurivo.store.',
              ],
            },
          ],
        }
      : {
          title: 'Terms of Use',
          subtitle:
            'Please read these terms carefully to understand how AQURIVO operates as an independent product curation platform.',
          sections: [
            {
              heading: '1. Editorial Curation & Third-Party Marketplaces',
              paragraphs: [
                'AQURIVO is an independent editorial curation and product discovery website. We do not sell products directly, process customer payments, or handle shipping and fulfillment.',
                'When you click a purchase link on AQURIVO, you are redirected to the external merchant or marketplace (such as Amazon, Noon, Temu, or ClickBank), where your transaction is governed by that merchant’s terms and privacy policies.',
              ],
            },
            {
              heading: '2. Pricing & Availability Accuracy',
              paragraphs: [
                'We display the date a product’s price was last checked by our team or direct you to view the live price on the merchant’s site. Because online retailers update prices and stock continuously, the final binding price is always the price displayed on the merchant’s checkout page.',
              ],
            },
            {
              heading: '3. Returns, Warranties & Customer Support',
              paragraphs: [
                'All order fulfillment, shipping, returns, refunds, and product warranties are handled directly by the marketplace or seller from whom you purchased the item.',
              ],
            },
            {
              heading: '4. Legal Notices & Intellectual Property Desk',
              paragraphs: [
                'For formal legal notices, DMCA/IP queries, or merchant inquiries, please contact our legal desk at legal@aqurivo.store or general desk at contact@aqurivo.store.',
              ],
            },
          ],
        };
  }

  if (docType === 'affiliate-disclosure') {
    return isAr
      ? {
          title: 'إفصاح العمولة والشفافية المالية',
          subtitle:
            'بيان واضح ومفصّل حول كيفية تمويل AQURIVO عبر برامج الشركاء وفق إرشادات FTC وتشريعات الاتحاد الأوروبي (UCPD).',
          sections: [
            {
              heading: '1. كيف يعمل نظام التسويق بالعمولة في AQURIVO؟',
              paragraphs: [
                'يُدار موقع AQURIVO كمشروع تحريري مستقل ومجاني لجميع الزوار. لتغطية تكاليف البحث والتشغيل وتطوير الموقع، نشارك في برامج التسويق بالعمولة (Affiliate Programs) لعدد من المتاجر العالمية الموثوقة.',
                'يعني ذلك أنه عندما تضغط على زر «اشترِ من...» أو «تحقق من السعر في...» في موقعنا وتنتقل إلى المتجر الشريك ثم تُتم عملية شراء مؤهلة، قد نحصل على عمولة إحالة صغيرة من ذلك المتجر دون أن يتحمل المتسوق أي سنت إضافي.',
              ],
            },
            {
              heading: '2. الإفصاح الرسمي لبرنامج Amazon Associates',
              paragraphs: [
                'بصفتنا شريكاً في برنامج Amazon Associates، فإننا نكسب من عمليات الشراء المؤهلة.',
                'As an Amazon Associate I earn from qualifying purchases.',
                'إن Amazon وشعار Amazon هما علامتان تجاريتان لشركة Amazon.com, Inc. أو الشركات التابعة لها.',
              ],
            },
            {
              heading: '3. المتاجر والبرامج الشريكة الأخرى (Noon, Temu, ClickBank)',
              paragraphs: [
                'بالإضافة إلى Amazon، قد تتضمن صفحاتنا روابط إحالة إلى متاجر ومنصات شريكة أخرى مثل Noon وTemu وClickBank. تخضع جميع الروابط الخارجية لوسم واضح (rel="sponsored") وإفصاح صريح بجوار زر الشراء مباشرة.',
              ],
            },
            {
              heading: '4. استقلالية القرار التحريري',
              paragraphs: [
                'لا تؤثر نسبة العمولة أبداً في اختيارنا للمنتجات أو ترتيبها داخل أدلة الشراء. نحن نختار المنتج أولاً بناءً على جودته وقيمته للمستخدم، ثم نبحث عن أفضل متجر موثوق يوفره.',
              ],
            },
          ],
        }
      : {
          title: 'Affiliate Disclosure & Editorial Independence',
          subtitle:
            'Full transparency on how AQURIVO is funded in compliance with FTC Endorsement Guides and the EU Unfair Commercial Practices Directive.',
          sections: [
            {
              heading: '1. How Affiliate Links Work on AQURIVO',
              paragraphs: [
                'AQURIVO is free for readers. To fund our research, writing, and hosting costs, we participate in affiliate marketing programs with vetted global retailers and marketplaces.',
                'When you click an outbound purchase button on AQURIVO and make a qualifying purchase on the merchant’s site, we may earn a referral commission from the merchant at zero additional cost to you.',
              ],
            },
            {
              heading: '2. Mandatory Amazon Associates Disclosure',
              paragraphs: [
                'As an Amazon Associate I earn from qualifying purchases.',
                'Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates.',
              ],
            },
            {
              heading: '3. Other Partner Programs (Noon, Temu, ClickBank)',
              paragraphs: [
                'AQURIVO also participates in affiliate programs with Noon, Temu, ClickBank, and selected direct-to-consumer brands. Every outbound affiliate link is clearly marked and accompanied by a visible disclosure right next to the action button.',
              ],
            },
            {
              heading: '4. Strict Editorial Independence',
              paragraphs: [
                'Our product selections and "Why we picked it / What to keep in mind" notes are written independently. Commission rates never influence whether a product is recommended.',
              ],
            },
          ],
        };
  }

  // cookies
  return isAr
    ? {
        title: 'سياسة وإعدادات ملفات تعريف الارتباط (Cookies)',
        subtitle:
          'تحكم كامل وشفاف في ملفات تعريف الارتباط والتخزين المحلي المستخدم في AQURIVO.',
        sections: [
          {
            heading: '1. ملفات تعريف الارتباط الضرورية (Essential Cookies)',
            paragraphs: [
              'تُستخدم هذه الملفات حصرياً لتشغيل الوظائف الأساسية التي تطلبها صراحةً: حفظ لغتك المفضلة (العربية أو الإنجليزية)، حفظ مظهر العرض (الفاتح أو الداكن)، حفظ قائمة منتجاتك المفضلة محلياً، وتأمين جلستك وحمايتها من هجمات تزوير الطلبات (CSRF) في حال قمت بتسجيل الدخول.',
            ],
          },
          {
            heading: '2. الإحصائيات الاختيارية وتوجيه المتاجر الشريكة',
            paragraphs: [
              'نحن لا نحمّل أي برمجيات تتبع إعلانية خارجية دون موافقتك. وعندما تضغط بمحض إرادتك على زر الشراء للانتقال إلى متجر شريك (مثل Amazon أو Noon أو Temu أو ClickBank)، قد يضع ذلك المتجر الشريك على صفحته الخاصة ملف ارتباط لتسجيل أن الزيارة جاءت من AQURIVO لاحتساب العمولة وفق سياسة الخصوصية الخاصة بذلك المتجر.',
            ],
          },
        ],
      }
    : {
        title: 'Cookie Policy & Preferences',
        subtitle:
          'Clear explanation and instant control over how cookies and local storage are used on AQURIVO.',
        sections: [
          {
            heading: '1. Strictly Necessary Cookies & Local Storage',
            paragraphs: [
              'These are required for core features you explicitly use: remembering your language (English or Arabic), your light/dark display theme, your locally saved product list, and securing your session and CSRF token if you choose to sign in.',
            ],
          },
          {
            heading: '2. Optional Analytics & Partner Store Attribution',
            paragraphs: [
              'We do not load third-party advertising trackers on AQURIVO. When you actively click a "Buy at [Store]" button to visit an external merchant (such as Amazon, Noon, Temu, or ClickBank), that merchant may set its own attribution cookie on its domain to credit the referral in accordance with its privacy policy.',
            ],
          },
        ],
      };
}
