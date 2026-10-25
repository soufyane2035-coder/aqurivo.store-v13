'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Check, Clock3, LoaderCircle, RefreshCw, Send } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { getFreshFirebaseIdToken } from '@/lib/firebase-client';
import {
  EDITORIAL_INITIAL_MODELS,
  EDITORIAL_PROVIDERS,
  EDITORIAL_PROVIDER_NAMES,
  type EditorialKeyStatus,
  type EditorialProvider,
} from './editorial-agent.types';
import styles from './AdminEditorialAgentView.module.css';

type Provider = EditorialProvider;
type Draft = {
  id: string;
  kind: 'product' | 'guide';
  status: 'review' | 'reviewed';
  sourceUrl: string;
  provider: Provider;
  model: string;
  content: string;
  conversation: Array<{ role: 'admin' | 'agent'; text: string; at: string }>;
  createdAt: string;
  updatedAt: string;
};
export function AdminEditorialAgentView() {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const isAr = locale === 'ar';
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [keyStatus, setKeyStatus] = useState<EditorialKeyStatus | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [kind, setKind] = useState<'product' | 'guide'>('product');
  const [sourceUrl, setSourceUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [provider, setProvider] = useState<Provider>('google');
  const [model, setModel] = useState(EDITORIAL_INITIAL_MODELS.google);
  const [modelKeyId, setModelKeyId] = useState('');
  const [modelsByProvider, setModelsByProvider] = useState<Record<Provider, string[]>>({
    google: [],
    openai: [],
    anthropic: [],
    openrouter: [],
  });
  const [modelLoading, setModelLoading] = useState(false);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const activeDraft = drafts.find((draft) => draft.id === selectedId) || null;
  const availableProviderKeys = keyStatus?.providers[provider] || [];
  const canGenerate = Boolean(
    keyStatus?.encryptionConfigured &&
      keyStatus.providers[provider].length &&
      keyStatus.tools.tavily.length &&
      keyStatus.tools.firecrawl.length
  );
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/editorial-agent', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load editorial area.');
      setDrafts(data.drafts || []);
      setKeyStatus(data.keyStatus || null);
      setModelKeyId((current) => current || data.keyStatus?.providers?.google?.[0]?.id || '');
      setSelectedId((current) =>
        data.drafts?.some((draft: Draft) => draft.id === current)
          ? current
          : data.drafts?.[0]?.id || ''
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load editorial area.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedKind = params.get('kind');
    const requestedUrl = params.get('sourceUrl');
    if (requestedKind === 'product' || requestedKind === 'guide') {
      setKind(requestedKind);
    }
    if (requestedUrl) setSourceUrl(requestedUrl);
  }, []);
  useEffect(() => { setContent(activeDraft?.content || ''); }, [activeDraft?.id, activeDraft?.content]);

  const mutate = async (payload: Record<string, unknown>) => {
    if (!csrfToken) throw new Error(isAr ? 'انتهت صلاحية جلسة الأمان. أعد تسجيل الدخول.' : 'Your security session expired. Sign in again.');
    const fbToken = await getFreshFirebaseIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    };
    if (fbToken) headers['x-firebase-id-token'] = fbToken;
    const response = await fetch('/api/admin/editorial-agent', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const selectProvider = (next: Provider) => {
    setProvider(next);
    setModel(modelsByProvider[next][0] || EDITORIAL_INITIAL_MODELS[next]);
    setModelKeyId(keyStatus?.providers[next][0]?.id || '');
  };

  const fetchModels = async () => {
    if (!modelKeyId) return;
    setModelLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await mutate({ action: 'list_models', provider, keyId: modelKeyId });
      const models = Array.isArray(data.models)
        ? data.models.filter((entry: unknown): entry is string => typeof entry === 'string')
        : [];
      if (!models.length) throw new Error('No compatible text-generation models were returned.');
      setModelsByProvider((current) => ({ ...current, [provider]: models }));
      setModel((current) => models.includes(current) ? current : models[0]);
      setNotice(
        isAr
          ? `تم جلب ${models.length} نموذجاً من ${EDITORIAL_PROVIDER_NAMES[provider]}. اختر النموذج المناسب.`
          : `Loaded ${models.length} models from ${EDITORIAL_PROVIDER_NAMES[provider]}. Choose the one you want.`
      );
    } catch (modelError) {
      setError(modelError instanceof Error ? modelError.message : 'Could not fetch provider models.');
    } finally {
      setModelLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await mutate({ action: 'create', kind, sourceUrl, provider, model, prompt });
      setDrafts((current) => [data.draft, ...current.filter((draft) => draft.id !== data.draft.id)]);
      setSelectedId(data.draft.id);
      setSourceUrl(''); setPrompt('');
      setNotice(isAr ? 'أُنشئت المسودة وهي بانتظار المراجعة.' : 'Draft created and added to review.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Draft could not be created.');
    } finally { setBusy(false); }
  };

  const revise = async () => {
    if (!activeDraft) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await mutate({ action: 'revise', id: activeDraft.id, feedback, provider, model });
      setDrafts((current) => current.map((draft) => draft.id === data.draft.id ? data.draft : draft));
      setFeedback('');
      setNotice(isAr ? 'أعاد الوكيل صياغة المسودة. راجع النسخة الجديدة.' : 'Revision received. Please review the updated draft.');
    } catch (revisionError) {
      setError(revisionError instanceof Error ? revisionError.message : 'Revision failed.');
    } finally { setBusy(false); }
  };

  const markReviewed = async () => {
    if (!activeDraft) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await mutate({ action: 'review', id: activeDraft.id, content });
      setDrafts((current) => current.map((draft) => draft.id === data.draft.id ? data.draft : draft));
      setNotice(isAr ? 'حُفظت المسودة كمراجَعة فقط؛ لم تُنشر.' : 'Saved as reviewed only. Nothing was published.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Review could not be saved.');
    } finally { setBusy(false); }
  };

  const formatDate = (value: string) => new Date(value).toLocaleString(isAr ? 'ar' : 'en');
  const sourceHost = (value: string) => {
    try { return new URL(value).hostname; } catch { return value || 'Unknown source'; }
  };

  return (
    <section className={styles.page} dir={isAr ? 'rtl' : 'ltr'}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}><Bot size={15} /> {isAr ? 'استوديو التحرير' : 'EDITORIAL STUDIO'}</span>
          <h1>{isAr ? 'مساعد إعداد المحتوى' : 'Editorial agent'}</h1>
          <p>{isAr ? 'ابحث عن منتج وأنشئ مسودة قابلة للمراجعة. لا ينشر هذا المساعد أي محتوى.' : 'Research a product and create a reviewable draft. This assistant never publishes content.'}</p>
        </div>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <div className={styles.workspace}>
        <div className={styles.composer}>
          <div className={styles.sectionHeading}>
            <div><h2>{isAr ? 'ابدأ بمصدر موثوق' : 'Start with a source'}</h2><p>{isAr ? 'يُستخدم Firecrawl لاستخراج الصفحة وTavily للبحث في الويب.' : 'Firecrawl extracts the page; Tavily researches the web.'}</p></div>
            <span className={styles.step}>01</span>
          </div>
          <form onSubmit={submit} className={styles.form}>
            <label className={styles.field}>
              <span>{isAr ? 'نوع المسودة' : 'Draft type'}</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as 'product' | 'guide')}>
                <option value="product">{isAr ? 'صفحة منتج' : 'Product page'}</option>
                <option value="guide">{isAr ? 'دليل شراء' : 'Buying guide'}</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{isAr ? 'رابط المنتج' : 'Product URL'}</span>
              <input type="url" required maxLength={2048} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" />
            </label>
            <label className={styles.field}>
              <span>{isAr ? 'كيف تريد توجيه الوكيل؟' : 'What should the agent focus on?'}</span>
              <textarea rows={3} maxLength={2000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={isAr ? 'مثال: ركّز على الاستخدام اليومي والقيود المذكورة في المصادر.' : 'Optional: Focus on everyday use and limitations mentioned by sources.'} />
            </label>
            <div className={styles.modelRow}>
              <label className={styles.field}>
                <span>{isAr ? 'المزوّد (اختيار يدوي)' : 'Provider (manual choice)'}</span>
                <select value={provider} onChange={(event) => selectProvider(event.target.value as Provider)}>
                  {EDITORIAL_PROVIDERS.map((item) => <option value={item} key={item}>{EDITORIAL_PROVIDER_NAMES[item]}</option>)}
                </select>
              </label>
              <div className={styles.modelPicker}>
                {availableProviderKeys.length > 1 && (
                  <label className={styles.field}>
                    <span>{isAr ? 'مفتاح جلب النماذج' : 'Key to fetch models'}</span>
                    <select value={modelKeyId} onChange={(event) => setModelKeyId(event.target.value)}>
                      {availableProviderKeys.map((key, index) => (
                        <option value={key.id} key={key.id}>{isAr ? `المفتاح ${index + 1}` : `Key ${index + 1}`}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className={styles.field}>
                  <span>{isAr ? 'اسم النموذج' : 'Model ID'}</span>
                  {modelsByProvider[provider].length ? (
                    <select value={model} onChange={(event) => setModel(event.target.value)} required>
                      {modelsByProvider[provider].map((modelId) => (
                        <option value={modelId} key={modelId}>{modelId}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      maxLength={120}
                      required
                    />
                  )}
                </label>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => void fetchModels()}
                  disabled={busy || modelLoading || !modelKeyId}
                >
                  {modelLoading ? <LoaderCircle className={styles.spin} size={16} /> : <RefreshCw size={15} />}
                  {isAr ? 'جلب أحدث النماذج' : 'Fetch latest models'}
                </button>
              </div>
            </div>
            <button className={styles.primaryButton} disabled={busy || !canGenerate}>
              {busy ? <LoaderCircle className={styles.spin} size={17} /> : <Send size={16} />}
              {isAr ? 'بحث وإنشاء مسودة' : 'Research & create draft'}
            </button>
          </form>
          <div className={styles.researchFootnote}>
            {isAr ? 'تُدار مفاتيح المزود وأدوات البحث من قسم ' : 'Manage provider and research-tool keys in '}
            <Link href="/admin/editorial-agent/keys">{isAr ? 'إعدادات مفاتيح الذكاء الاصطناعي' : 'AI key settings'}</Link>.
            {isAr ? ' تُستخدم المفاتيح المحفوظة بالتناوب.' : ' Saved keys rotate automatically.'}
          </div>
        </div>

        <div className={styles.queue}>
          <div className={styles.sectionHeading}>
            <div><h2>{isAr ? 'قائمة المراجعة' : 'Review queue'}</h2><p>{isAr ? `${drafts.length} مسودة محفوظة` : `${drafts.length} saved drafts`}</p></div>
            <button className={styles.iconButton} type="button" onClick={() => void refresh()} aria-label={isAr ? 'تحديث' : 'Refresh'}><RefreshCw size={16} /></button>
          </div>
          {loading ? <div className={styles.empty}><LoaderCircle className={styles.spin} /> {isAr ? 'جارٍ التحميل…' : 'Loading…'}</div> :
            drafts.length === 0 ? <div className={styles.empty}><Bot size={24} /><strong>{isAr ? 'لا توجد مسودات بعد' : 'No drafts yet'}</strong><span>{isAr ? 'ابدأ بإرسال رابط منتج.' : 'Start by submitting a product URL.'}</span></div> :
              <div className={styles.draftList}>
                {drafts.map((draft) => (
                  <button key={draft.id} type="button" onClick={() => setSelectedId(draft.id)} className={`${styles.draftItem} ${selectedId === draft.id ? styles.draftActive : ''}`}>
                    <span className={`${styles.status} ${draft.status === 'reviewed' ? styles.statusReviewed : ''}`}>{draft.status === 'reviewed' ? (isAr ? 'مراجَعة' : 'Reviewed') : (isAr ? 'تحتاج مراجعة' : 'Needs review')}</span>
                    <strong>{draft.kind === 'product' ? (isAr ? 'مسودة منتج' : 'Product draft') : (isAr ? 'دليل شراء' : 'Buying guide')}</strong>
                    <span className={styles.draftSource}>{sourceHost(draft.sourceUrl)}</span>
                    <small><Clock3 size={13} /> {formatDate(draft.updatedAt)}</small>
                  </button>
                ))}
              </div>}
        </div>
      </div>

      {activeDraft && (
        <section className={styles.reviewPanel} aria-label={isAr ? 'مراجعة المسودة' : 'Draft review'}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.eyebrow}>{isAr ? 'المسودة المختارة' : 'SELECTED DRAFT'}</span><h2>{activeDraft.kind === 'product' ? (isAr ? 'مسودة منتج' : 'Product draft') : (isAr ? 'دليل شراء' : 'Buying guide')}</h2><p><a href={activeDraft.sourceUrl} target="_blank" rel="noreferrer">{activeDraft.sourceUrl}</a></p></div>
            <span className={`${styles.status} ${activeDraft.status === 'reviewed' ? styles.statusReviewed : ''}`}>{activeDraft.status === 'reviewed' ? (isAr ? 'مراجَعة' : 'Reviewed') : (isAr ? 'بانتظار المراجعة' : 'Awaiting review')}</span>
          </div>
          <div className={styles.conversation}>
            {activeDraft.conversation?.map((message, index) => (
              <article key={`${message.at}-${index}`} className={`${styles.message} ${message.role === 'agent' ? styles.agentMessage : styles.adminMessage}`}>
                <strong>{message.role === 'agent' ? (isAr ? 'المساعد' : 'Agent') : (isAr ? 'ملاحظة المحرر' : 'Editor note')}</strong><p>{message.text}</p>
              </article>
            ))}
          </div>
          <label className={styles.field}>
            <span>{isAr ? 'تحرير نص المسودة' : 'Edit the draft'}</span>
            <textarea className={styles.draftEditor} value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000} />
          </label>
          <div className={styles.modelRow}>
            <label className={styles.field}>
              <span>{isAr ? 'المزوّد للمراجعة التالية' : 'Provider for next revision'}</span>
              <select value={provider} onChange={(event) => selectProvider(event.target.value as Provider)}>
                {EDITORIAL_PROVIDERS.map((item) => <option value={item} key={item}>{EDITORIAL_PROVIDER_NAMES[item]}</option>)}
              </select>
            </label>
            <div className={styles.modelPicker}>
              {availableProviderKeys.length > 1 && (
                <label className={styles.field}>
                  <span>{isAr ? 'مفتاح جلب النماذج' : 'Key to fetch models'}</span>
                  <select value={modelKeyId} onChange={(event) => setModelKeyId(event.target.value)}>
                    {availableProviderKeys.map((key, index) => (
                      <option value={key.id} key={key.id}>{isAr ? `المفتاح ${index + 1}` : `Key ${index + 1}`}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className={styles.field}>
                <span>{isAr ? 'اسم النموذج' : 'Model ID'}</span>
                {modelsByProvider[provider].length ? (
                  <select value={model} onChange={(event) => setModel(event.target.value)}>
                    {modelsByProvider[provider].map((modelId) => (
                      <option value={modelId} key={modelId}>{modelId}</option>
                    ))}
                  </select>
                ) : (
                  <input value={model} onChange={(event) => setModel(event.target.value)} maxLength={120} />
                )}
              </label>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => void fetchModels()}
                disabled={busy || modelLoading || !modelKeyId}
              >
                {modelLoading ? <LoaderCircle className={styles.spin} size={16} /> : <RefreshCw size={15} />}
                {isAr ? 'جلب أحدث النماذج' : 'Fetch latest models'}
              </button>
            </div>
          </div>
          <label className={styles.field}>
            <span>{isAr ? 'أرسل ملاحظاتك للمساعد' : 'Send feedback to the agent'}</span>
            <textarea rows={3} maxLength={2000} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder={isAr ? 'ما الذي يجب تغييره؟' : 'What should change in the next draft?'} />
          </label>
          <div className={styles.reviewActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => void revise()} disabled={busy || !canGenerate || !feedback.trim()}>{busy ? <LoaderCircle className={styles.spin} size={16} /> : <RefreshCw size={16} />} {isAr ? 'إرسال للمراجعة' : 'Ask agent to revise'}</button>
            <button className={styles.primaryButton} type="button" onClick={() => void markReviewed()} disabled={busy || !content.trim()}>{busy ? <LoaderCircle className={styles.spin} size={16} /> : <Check size={17} />} {isAr ? 'حفظ كمراجَعة' : 'Save as reviewed'}</button>
          </div>
          <p className={styles.publishNotice}>{isAr ? 'الحفظ يحدّث حالة المراجعة فقط. لا يوجد نشر تلقائي أو زر نشر في هذا الاستوديو.' : 'Saving only updates the review status. There is no auto-publishing or publish action in this studio.'}</p>
        </section>
      )}
    </section>
  );
}
