'use client';

import React, { useState } from 'react';
import { CheckCircle2, Mail, MessageCircle, LifeBuoy, ShieldCheck, Scale } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './ContactView.module.css';

export function ContactView() {
  const { locale, messages } = useI18n();
  const isAr = locale === 'ar';

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(''); // Honeypot anti-spam field

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          senderEmail,
          subject,
          message,
          websiteUrl,
        }),
      });

      const data = (await res.json()) as { sent?: boolean; error?: string };
      if (!res.ok) {
        setErrorMessage(
          data.error ||
            (isAr
              ? 'تعذّر إرسال رسالتك حالياً. يمكنك مراسلتنا مباشرة عبر البريد أو واتساب.'
              : 'Unable to send your message right now. Please contact us via email or WhatsApp.')
        );
        return;
      }

      setIsSent(true);
      setSenderName('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setErrorMessage(
        isAr
          ? 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى أو التواصل معنا عبر البريد الإلكتروني.'
          : 'Network error while sending your message. Please try again or email us directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={`${styles.header} revealUp`}>
          <SignatureMotif index="01" label={messages.nav.contact} />
          <h1 className={styles.title}>
            {isAr ? 'تواصل مع فريق AQURIVO' : 'Get in Touch with AQURIVO'}
          </h1>
          <p className={styles.subtitle}>
            {isAr
              ? 'سواء كان لديك استفسار حول منتج، أو رغبت في الإبلاغ عن رابط غير محدث، أو اقتراح فئة جديدة، يسعدنا تواصلك معنا.'
              : 'Whether you have a question about a curated pick, want to report an outdated store link, or suggest a product category, we would love to hear from you.'}
          </p>
          <address className={styles.staticContactSummary}>
            <span>AQURIVO — </span>
            <a href="mailto:contact@aqurivo.store">contact@aqurivo.store</a>
            <span aria-hidden="true"> · </span>
            <a href="mailto:support@aqurivo.store">support@aqurivo.store</a>
            <span aria-hidden="true"> · </span>
            <a
              href="https://wa.me/212684063908"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp: +212 684 063908
            </a>
          </address>
        </header>

        <div className={styles.contactGrid}>
          {/* Direct Channels Column */}
          <aside className={styles.channelsColumn}>
            <SignatureMotif
              index="02"
              label={isAr ? 'قنوات التواصل المباشر' : 'Direct Channels'}
            />

            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <Mail size={18} className={styles.channelIcon} aria-hidden="true" />
                <h2 className={styles.channelTitle}>
                  {isAr ? 'عناوين البريد المتخصصة' : 'Specialized Email Desks'}
                </h2>
              </div>
              <p className={styles.channelDesc}>
                {isAr
                  ? 'اختر القسم المعني لضمان استجابة دقيقة وسريعة من فريقنا:'
                  : 'Reach the dedicated desk for rapid, direct assistance:'}
              </p>
              <div className={styles.deptList}>
                <div className={styles.deptItem}>
                  <div className={styles.deptLabel}>
                    <Mail size={13} className={styles.deptIcon} aria-hidden="true" />
                    <span>{isAr ? 'التواصل العام والشراكات:' : 'General & Business:'}</span>
                  </div>
                  <a href="mailto:contact@aqurivo.store" className={styles.deptLink}>
                    contact@aqurivo.store
                  </a>
                </div>

                <div className={styles.deptItem}>
                  <div className={styles.deptLabel}>
                    <LifeBuoy size={13} className={styles.deptIcon} aria-hidden="true" />
                    <span>{isAr ? 'خدمة العملاء والدعم:' : 'Customer Care & Support:'}</span>
                  </div>
                  <a href="mailto:support@aqurivo.store" className={styles.deptLink}>
                    support@aqurivo.store
                  </a>
                </div>

                <div className={styles.deptItem}>
                  <div className={styles.deptLabel}>
                    <ShieldCheck size={13} className={styles.deptIcon} aria-hidden="true" />
                    <span>{isAr ? 'الخصوصية وحماية البيانات:' : 'Privacy & Data Rights:'}</span>
                  </div>
                  <a href="mailto:privacy@aqurivo.store" className={styles.deptLink}>
                    privacy@aqurivo.store
                  </a>
                </div>

                <div className={styles.deptItem}>
                  <div className={styles.deptLabel}>
                    <Scale size={13} className={styles.deptIcon} aria-hidden="true" />
                    <span>{isAr ? 'الشؤون القانونية والامتثال:' : 'Legal & Compliance:'}</span>
                  </div>
                  <a href="mailto:legal@aqurivo.store" className={styles.deptLink}>
                    legal@aqurivo.store
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <MessageCircle size={18} className={styles.channelIcon} aria-hidden="true" />
                <h2 className={styles.channelTitle}>
                  {isAr ? 'محادثة فورية عبر واتساب' : 'Instant WhatsApp Chat'}
                </h2>
              </div>
              <p className={styles.channelDesc}>
                {isAr
                  ? 'تواصل معنا مباشرة عبر تطبيق واتساب لرد سريع ومريح على كافة استفساراتك:'
                  : 'Reach us directly on WhatsApp for prompt assistance:'}
              </p>
              <a
                href="https://wa.me/212684063908"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.channelActionLink} tabularNums`}
                dir="ltr"
              >
                WhatsApp: +212 684 063908
              </a>
              <a
                href="https://wa.me/212684063908"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappButton}
              >
                <MessageCircle size={16} aria-hidden="true" />
                <span>{messages.footer.whatsappCta}</span>
              </a>
            </div>
          </aside>

          {/* Protected Contact Form Column */}
          <section className={styles.formColumn}>
            <SignatureMotif
              index="03"
              label={isAr ? 'أرسل لنا رسالة مباشرة' : 'Send Us a Message'}
            />

            <div className={styles.formCard}>
              {isSent ? (
                <div className={styles.successState} role="status">
                  <CheckCircle2 size={32} className={styles.successIcon} aria-hidden="true" />
                  <h2 className={styles.successTitle}>
                    {isAr ? 'تم استلام رسالتك بنجاح' : 'Your message has been received'}
                  </h2>
                  <p className={styles.successText}>
                    {isAr
                      ? 'شكراً لتواصلك مع AQURIVO. سيقوم فريقنا بمراجعة رسالتك والرد عليك عبر البريد الإلكتروني في أقرب وقت.'
                      : 'Thank you for reaching out to AQURIVO. Our team will review your note and reply to your email shortly.'}
                  </p>
                  <Button variant="outline" onClick={() => setIsSent(false)}>
                    {isAr ? 'إرسال رسالة أخرى' : 'Send another message'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                  {/* Visually hidden anti-spam honeypot field */}
                  <div className={styles.honeypotWrap} aria-hidden="true">
                    <label htmlFor="contact-website-url">Website</label>
                    <input
                      id="contact-website-url"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>

                  <div className={styles.twoColRow}>
                    <Input
                      label={isAr ? 'الاسم الكامل' : 'Your Name'}
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                    <Input
                      type="email"
                      label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      required
                      maxLength={160}
                    />
                  </div>

                  <Input
                    label={isAr ? 'موضوع الرسالة' : 'Subject'}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    minLength={2}
                    maxLength={160}
                  />

                  <div className={styles.textareaGroup}>
                    <label htmlFor="contact-message-body" className={styles.textareaLabel}>
                      {isAr ? 'تفاصيل الرسالة' : 'Message'}
                    </label>
                    <textarea
                      id="contact-message-body"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      minLength={10}
                      maxLength={3000}
                      className={styles.textarea}
                      placeholder={
                        isAr
                          ? 'اكتب استفسارك أو اقتراحك هنا...'
                          : 'Write your question, feedback, or product suggestion here...'
                      }
                    />
                  </div>

                  {errorMessage && (
                    <p className={styles.errorBanner} role="alert">
                      {errorMessage}
                    </p>
                  )}

                  <Button type="submit" size="lg" isLoading={isSubmitting}>
                    {isAr ? 'إرسال الرسالة' : 'Send Message'}
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
