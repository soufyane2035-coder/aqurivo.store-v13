'use client';

import Link from 'next/link';
import {
  ArrowUpLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileCheck2,
  Mail,
  MessageCircle,
  Scale,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import {
  ABOUT_FAQS_DATA,
  ABOUT_ORIGIN_DATA,
  EDITORIAL_METRICS_DATA,
  INTEGRITY_CHARTER_DATA,
  METHODOLOGY_PILLARS_DATA,
  TEAM_DOSSIERS_DATA,
} from './aboutData';
import styles from './AboutView.module.css';

export function AboutView() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowMark} aria-hidden="true" />
              {isAr ? 'من نحن · معاييرنا · فريقنا' : 'About · Standards · People'}
            </span>
            <h1 className={styles.heroTitle}>
              {isAr
                ? 'معلومات أوضح. اختيارات أذكى.'
                : 'Clearer information. Better choices.'}
            </h1>
            <p className={styles.heroSubtitle}>
              {isAr
                ? 'نرتّب تفاصيل المنتجات والأسعار والقيود لتعرف ما يناسبك قبل أن تشتري.'
                : 'We make product details, prices, and trade-offs easier to understand before you buy.'}
            </p>
            <div className={styles.heroActions}>
              <Link href={`/${locale}/guides`} className={styles.primaryAction}>
                {isAr ? 'اكتشف أدلة الشراء' : 'Explore buying guides'}
                <Arrow size={16} aria-hidden="true" />
              </Link>
              <Link href={`/${locale}/products`} className={styles.secondaryAction}>
                {isAr ? 'تصفح المنتجات' : 'Browse products'}
              </Link>
            </div>
          </div>

          <aside className={styles.heroNote} aria-label={isAr ? 'مبادئنا' : 'Our principles'}>
            <span className={styles.heroNoteIndex}>AQ / 01</span>
            <span className={styles.heroNoteRule} aria-hidden="true" />
            <p>
              {isAr
                ? 'القيمة قبل الضجيج. والوضوح قبل الشراء.'
                : 'Value over noise. Clarity before checkout.'}
            </p>
            <span className={styles.heroNoteFoot}>
              {isAr ? 'دليل تحريري مستقل' : 'Independent editorial guide'}
            </span>
          </aside>
        </header>

        <section className={styles.originSection} aria-labelledby="origin-story-heading">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>
              {isAr ? 'قصتنا' : 'Our story'}
            </span>
            <h2 id="origin-story-heading" className={styles.sectionTitle}>
              {isAr ? 'التسوق لا يحتاج إلى مزيد من الضجيج' : 'Shopping needs less noise'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {isAr
                ? 'بدأت AQURIVO بفكرة بسيطة: أن تكون المقارنة مفيدة وصادقة وسهلة الفهم.'
                : 'AQURIVO began with a simple idea: make comparison useful, honest, and easy to follow.'}
            </p>
          </div>

          <div className={styles.originGrid}>
            <div className={styles.narrativeProse}>
              {(isAr
                ? ABOUT_ORIGIN_DATA.paragraphsAr
                : ABOUT_ORIGIN_DATA.paragraphsEn
              ).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <blockquote className={styles.originQuote}>
              <span className={styles.quoteMark} aria-hidden="true">“</span>
              <p>
                {isAr
                  ? 'نساعدك على فهم ما تشتريه، لا على شراء ما لا تحتاجه.'
                  : 'We help you understand what you buy, not buy what you do not need.'}
              </p>
              <footer>
                <BadgeCheck size={16} aria-hidden="true" />
                <span>
                  {isAr ? 'سفيان العرايش · مؤسس AQURIVO' : 'Soufiane Laraich · Founder of AQURIVO'}
                </span>
              </footer>
            </blockquote>
          </div>
        </section>

        <section
          className={styles.metricsSection}
          aria-label={isAr ? 'AQURIVO بالأرقام' : 'AQURIVO at a glance'}
        >
          <div className={styles.metricsIntro}>
            <span>{isAr ? 'دليلنا اليوم' : 'Our guide today'}</span>
            <strong>{isAr ? 'مختار بعناية، ومُحدّث باستمرار' : 'Curated with care, updated over time'}</strong>
          </div>
          <div className={styles.metricsGrid}>
            {EDITORIAL_METRICS_DATA.map((metric) => (
              <div key={metric.labelEn} className={styles.metricBlock}>
                <span className={styles.metricValue}>{metric.value}</span>
                <p className={styles.metricLabel}>
                  {isAr ? metric.labelAr : metric.labelEn}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.methodologySection} aria-labelledby="methodology-heading">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>
              {isAr ? 'كيف نعمل' : 'How we work'}
            </span>
            <h2 id="methodology-heading" className={styles.sectionTitle}>
              {isAr ? 'من البحث إلى قرار أوضح' : 'From research to a clearer decision'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {isAr
                ? 'أربع خطوات تساعدنا على تقديم صورة متوازنة عن كل خيار.'
                : 'Four practical steps help us present a balanced view of each option.'}
            </p>
          </div>

          <div className={styles.pipelineList}>
            {METHODOLOGY_PILLARS_DATA.map((pillar) => (
              <article key={pillar.step} className={styles.pipelineStage}>
                <span className={styles.stageNumber} aria-hidden="true">{pillar.step}</span>
                <div className={styles.stageContent}>
                  <h3>{isAr ? pillar.titleAr : pillar.titleEn}</h3>
                  <p>{isAr ? pillar.descAr : pillar.descEn}</p>
                  <ul className={styles.stageTags}>
                    {(isAr ? pillar.tagsAr : pillar.tagsEn).map((tag) => (
                      <li key={tag}>
                        <Check size={13} aria-hidden="true" />
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.charterSection} aria-labelledby="charter-heading">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>
              {isAr ? 'ميثاقنا' : 'Our charter'}
            </span>
            <h2 id="charter-heading" className={styles.sectionTitle}>
              {isAr ? 'الثقة تُبنى بالوضوح' : 'Trust is built with clarity'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {isAr
                ? 'مبادئ بسيطة تشرح كيف نختار، وكيف نكسب، وما الذي نلتزم به تجاهك.'
                : 'Simple principles explain how we curate, how we earn, and what we owe you.'}
            </p>
          </div>

          <div className={styles.charterGrid}>
            {INTEGRITY_CHARTER_DATA.map((item) => (
              <article key={item.number} className={styles.charterItem}>
                <span className={styles.charterNumber}>{item.number}</span>
                <h3>{isAr ? item.titleAr : item.titleEn}</h3>
                <p className={styles.charterPrinciple}>
                  {isAr ? item.principleAr : item.principleEn}
                </p>
                <p className={styles.charterGuarantee}>
                  {isAr ? item.guaranteeAr : item.guaranteeEn}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.teamSection} aria-labelledby="team-heading">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>
              {isAr ? 'الأشخاص وراء العمل' : 'The people behind the work'}
            </span>
            <h2 id="team-heading" className={styles.sectionTitle}>
              {isAr ? 'أدوار مختلفة، وهدف واحد' : 'Different roles, one purpose'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {isAr
                ? 'تعرف على الأشخاص والأدوار التحريرية التي تساهم في إعداد محتوى AQURIVO.'
                : 'Meet the people and editorial roles contributing to AQURIVO.'}
            </p>
          </div>

          <div className={styles.teamGrid}>
            {TEAM_DOSSIERS_DATA.map((member) => (
              <article key={member.id} className={styles.memberCard}>
                <div className={styles.memberCardTop}>
                  <span className={styles.memberInitial} aria-hidden="true">
                    {isAr ? member.initialAr : member.initialEn}
                  </span>
                  <span className={styles.memberRole}>
                    {isAr ? member.roleAr : member.roleEn}
                  </span>
                </div>
                <h3>{isAr ? member.nameAr : member.nameEn}</h3>
                <p>{isAr ? member.scopeAr : member.scopeEn}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="faq-heading">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>
              {isAr ? 'أسئلة شائعة' : 'Frequently asked'}
            </span>
            <h2 id="faq-heading" className={styles.sectionTitle}>
              {isAr ? 'قبل أن تتابع التصفح' : 'Before you browse'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {isAr
                ? 'إجابات مباشرة عن التوصيات والروابط والعمولات.'
                : 'Straight answers about recommendations, links, and commissions.'}
            </p>
          </div>

          <div className={styles.faqList}>
            {ABOUT_FAQS_DATA.map((faq, index) => (
              <details key={faq.questionEn} className={styles.faqItem}>
                <summary>
                  <span className={styles.faqIndex}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{isAr ? faq.questionAr : faq.questionEn}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{isAr ? faq.answerAr : faq.answerEn}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.contactSection} aria-labelledby="contact-heading">
          <div className={styles.contactCopy}>
            <span className={styles.sectionKicker}>
              {isAr ? 'نستمع إليك' : 'We are listening'}
            </span>
            <h2 id="contact-heading">
              {isAr ? 'رأيت معلومة تحتاج إلى تحديث؟' : 'Found something that needs an update?'}
            </h2>
            <p>
              {isAr
                ? 'ملاحظتك تساعدنا على تحسين الأدلة والروابط. تواصل معنا وسنراجعها.'
                : 'Your feedback helps us improve our guides and links. Get in touch and we will review it.'}
            </p>
          </div>
          <div className={styles.contactActions}>
            <a
              href="mailto:contact@aqurivo.store"
              className={styles.contactActionPrimary}
            >
              <Mail size={17} aria-hidden="true" />
              {isAr ? 'راسل فريق AQURIVO' : 'Email the AQURIVO team'}
              <Arrow size={15} aria-hidden="true" />
            </a>
            <a
              href="https://wa.me/212684063908"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactActionSecondary}
            >
              <MessageCircle size={17} aria-hidden="true" />
              {isAr ? 'تواصل عبر واتساب' : 'Contact us on WhatsApp'}
            </a>
          </div>
          <div className={styles.legalLinks}>
            <Link href={`/${locale}/security`}>
              <FileCheck2 size={14} aria-hidden="true" />
              {isAr ? 'الأمان والروابط' : 'Security & links'}
            </Link>
            <Link href={`/${locale}/affiliate-disclosure`}>
              <Scale size={14} aria-hidden="true" />
              {isAr ? 'إفصاح العمولات' : 'Affiliate disclosure'}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
