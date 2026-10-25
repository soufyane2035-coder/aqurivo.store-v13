'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Bot, Check, Clock3, KeyRound, LoaderCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { getFreshFirebaseIdToken } from '@/lib/firebase-client';
import styles from './AdminEditorialAgentView.module.css';

type Provider = 'google' | 'openai' | 'anthropic' | 'openrouter';
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
type KeyStatus = {
  encryptionConfigured: boolean;
  providers: Record<Provider, boolean>;
  tavily: boolean;
  firecrawl: boolean;
};

const providerNames: Record<Provider, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  openrouter: 'OpenRouter',
};
const providerOptions: Provider[] = ['google', 'openai', 'anthropic', 'openrouter'];
const initialModels: Record<Provider, string> = {
  google: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
  openrouter: 'openai/gpt-4.1-mini',
};

export function AdminEditorialAgentView() {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const isAr = locale === 'ar';
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [kind, setKind] = useState<'product' | 'guide'>('product');
  const [sourceUrl, setSourceUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [provider, setProvider] = useState<Provider>('google');
  const [model, setModel] = useState(initialModels.google);
  const [content, setContent] = useState('');
  const [providerKeys, setProviderKeys] = useState<Record<Provider, string>>({
    google: '', openai: '', anthropic: '', openrouter: '',
  });
  const [tavilyKey, setTavilyKey] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [removeKeys, setRemoveKeys] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const activeDraft = drafts.find((draft) => draft.id === selectedId) || null;
  const canGenerate = Boolean(
    keyStatus?.encryptionConfigured &&
      keyStatus.providers[provider] &&
      keyStatus.tavily &&
      keyStatus.firecrawl
  );
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/editorial-agent', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load editorial area.');
      setDrafts(data.drafts || []);
      setKeyStatus(data.keyStatus || null);
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

  const saveKeys = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await mutate({ action: 'save_keys', providerKeys, tavilyKey, firecrawlKey, remove: removeKeys });
      setKeyStatus(data.keyStatus);
      setProviderKeys({ google: '', openai: '', anthropic: '', openrouter: '' });
      setTavilyKey(''); setFirecrawlKey(''); setRemoveKeys([]);
      setNotice(isAr ? 'حُفظت الإعدادات بأمان. لن تظهر المفاتيح المحفوظة مرة أخرى.' : 'Keys saved securely. Saved values are never shown again.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Settings could not be saved.');
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

  const toggleRemove = (key: string) => setRemoveKeys((current) =>
    current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
  );
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
        <button type="button" className={styles.secondaryButton} onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
          <KeyRound size={16} /> {isAr ? 'مفاتيح الخدمات' : 'API keys'}
        </button>
      </header>

      {!keyStatus?.encryptionConfigured && (
        <div className={styles.warning} role="alert">
          {isAr ? 'أضف AI_SECRETS_ENCRYPTION_KEY (32 حرفاً على الأقل) إلى بيئة الخادم قبل حفظ أي مفتاح.' : 'Set AI_SECRETS_ENCRYPTION_KEY (at least 32 characters) in the server environment before saving any API key.'}
        </div>
      )}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      {settingsOpen && (
        <form className={styles.settings} onSubmit={saveKeys}>
          <div className={styles.sectionHeading}>
            <div><h2>{isAr ? 'مفاتيح الخدمات' : 'Service keys'}</h2><p>{isAr ? 'تُشفّر على الخادم، ولا تُرسل إلى المتصفح بعد الحفظ.' : 'Encrypted on the server; saved values are never sent back to this browser.'}</p></div>
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className={styles.keyGrid}>
            {providerOptions.map((item) => (
              <div className={styles.field} key={item}>
                <label htmlFor={`editorial-${item}-key`}>{providerNames[item]} API key {keyStatus?.providers[item] ? <em>{isAr ? 'مُعدّ' : 'configured'}</em> : <em>{isAr ? 'غير مُعدّ' : 'not set'}</em>}</label>
                <input id={`editorial-${item}-key`} type="password" autoComplete="new-password" value={providerKeys[item]} onChange={(event) => setProviderKeys((current) => ({ ...current, [item]: event.target.value }))} placeholder={keyStatus?.providers[item] ? '•••••••• (leave empty to keep)' : 'Paste key'} />
                {keyStatus?.providers[item] && <label className={styles.removeOption}><input type="checkbox" checked={removeKeys.includes(item)} onChange={() => toggleRemove(item)} /> {isAr ? 'حذف المفتاح الحالي' : 'Remove current key'}</label>}
              </div>
            ))}
            {(['tavily', 'firecrawl'] as const).map((tool) => (
              <div className={styles.field} key={tool}>
                <label htmlFor={`editorial-${tool}-key`}>{tool === 'tavily' ? 'Tavily Web Search' : 'Firecrawl extraction'} {((tool === 'tavily' ? keyStatus?.tavily : keyStatus?.firecrawl) ? <em>{isAr ? 'مُعدّ' : 'configured'}</em> : <em>{isAr ? 'غير مُعدّ' : 'not set'}</em>)}</label>
                <input id={`editorial-${tool}-key`} type="password" autoComplete="new-password" value={tool === 'tavily' ? tavilyKey : firecrawlKey} onChange={(event) => tool === 'tavily' ? setTavilyKey(event.target.value) : setFirecrawlKey(event.target.value)} placeholder="Paste key" />
                {(tool === 'tavily' ? keyStatus?.tavily : keyStatus?.firecrawl) && <label className={styles.removeOption}><input type="checkbox" checked={removeKeys.includes(tool)} onChange={() => toggleRemove(tool)} /> {isAr ? 'حذف المفتاح الحالي' : 'Remove current key'}</label>}
              </div>
            ))}
          </div>
          <button className={styles.primaryButton} disabled={busy || !keyStatus?.encryptionConfigured}><KeyRound size={16} /> {isAr ? 'حفظ المفاتيح' : 'Save keys'}</button>
        </form>
      )}

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
                <select value={provider} onChange={(event) => { const next = event.target.value as Provider; setProvider(next); setModel(initialModels[next]); }}>
                  {providerOptions.map((item) => <option value={item} key={item}>{providerNames[item]}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>{isAr ? 'اسم النموذج' : 'Model ID'}</span>
                <input value={model} onChange={(event) => setModel(event.target.value)} maxLength={120} required />
              </label>
            </div>
            <button className={styles.primaryButton} disabled={busy || !canGenerate}>
              {busy ? <LoaderCircle className={styles.spin} size={17} /> : <Send size={16} />}
              {isAr ? 'بحث وإنشاء مسودة' : 'Research & create draft'}
            </button>
          </form>
          <div className={styles.researchFootnote}>{isAr ? 'يتطلب الإنشاء إعداد مفتاح المزوّد ومفتاحي البحث والاستخراج.' : 'Draft generation requires a provider key plus Tavily and Firecrawl keys.'}</div>
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
              <select value={provider} onChange={(event) => { const next = event.target.value as Provider; setProvider(next); setModel(initialModels[next]); }}>
                {providerOptions.map((item) => <option value={item} key={item}>{providerNames[item]}</option>)}
              </select>
            </label>
            <label className={styles.field}><span>{isAr ? 'اسم النموذج' : 'Model ID'}</span><input value={model} onChange={(event) => setModel(event.target.value)} maxLength={120} /></label>
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
