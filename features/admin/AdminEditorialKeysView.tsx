'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, Plus, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { getFreshFirebaseIdToken } from '@/lib/firebase-client';
import {
  EDITORIAL_PROVIDERS,
  EDITORIAL_PROVIDER_NAMES,
  type EditorialKeyStatus,
  type EditorialKeyTarget,
  type EditorialProvider,
  type EditorialTool,
} from './editorial-agent.types';
import styles from './AdminEditorialAgentView.module.css';

const targets: EditorialKeyTarget[] = [
  ...EDITORIAL_PROVIDERS,
  'tavily',
  'firecrawl',
];

const targetNames: Record<EditorialKeyTarget, string> = {
  ...EDITORIAL_PROVIDER_NAMES,
  tavily: 'Tavily Web Search',
  firecrawl: 'Firecrawl',
};

function emptyKeyInputs(): Record<EditorialKeyTarget, string[]> {
  return Object.fromEntries(targets.map((target) => [target, ['']])) as Record<
    EditorialKeyTarget,
    string[]
  >;
}

export function AdminEditorialKeysView() {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const isAr = locale === 'ar';
  const [keyStatus, setKeyStatus] = useState<EditorialKeyStatus | null>(null);
  const [keyInputs, setKeyInputs] = useState(emptyKeyInputs);
  const [removeKeys, setRemoveKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/editorial-agent?keys=1', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load API key settings.');
      setKeyStatus(data.keyStatus || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load API key settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = async (payload: Record<string, unknown>) => {
    if (!csrfToken) {
      throw new Error(isAr ? 'انتهت صلاحية جلسة الأمان. أعد تسجيل الدخول.' : 'Your security session expired. Sign in again.');
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    };
    const fbToken = await getFreshFirebaseIdToken();
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

  const saveKeys = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const providerKeys: Partial<Record<EditorialProvider, string[]>> = {};
      for (const provider of EDITORIAL_PROVIDERS) {
        providerKeys[provider] = keyInputs[provider].filter((value) => value.trim());
      }
      const toolKeys: Partial<Record<EditorialTool, string[]>> = {
        tavily: keyInputs.tavily.filter((value) => value.trim()),
        firecrawl: keyInputs.firecrawl.filter((value) => value.trim()),
      };
      const data = await mutate({
        action: 'save_keys',
        providerKeys,
        toolKeys,
        remove: removeKeys,
      });
      setKeyStatus(data.keyStatus);
      setKeyInputs(emptyKeyInputs());
      setRemoveKeys([]);
      setNotice(
        isAr
          ? 'حُفظت المفاتيح الجديدة بأمان. المفاتيح المحفوظة لا تظهر في المتصفح.'
          : 'New keys were saved securely. Saved values are never sent to the browser.'
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'API keys could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const keyReferences = (target: EditorialKeyTarget) => {
    if (!keyStatus) return [];
    return EDITORIAL_PROVIDERS.includes(target as EditorialProvider)
      ? keyStatus.providers[target as EditorialProvider]
      : keyStatus.tools[target as EditorialTool];
  };

  const toggleRemove = (target: EditorialKeyTarget, id: string) => {
    const key = `${target}:${id}`;
    setRemoveKeys((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  };

  return (
    <section className={styles.page} dir={isAr ? 'rtl' : 'ltr'}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}><KeyRound size={15} /> {isAr ? 'إعدادات الذكاء الاصطناعي' : 'AI CONFIGURATION'}</span>
          <h1>{isAr ? 'مفاتيح المزودين والأدوات' : 'Provider & tool API keys'}</h1>
          <p>
            {isAr
              ? 'أدِر مفاتيح النماذج وأدوات البحث والاستخراج هنا، بعيداً عن مساحة عمل الوكيل.'
              : 'Manage model providers, web search, and extraction keys separately from the agent workspace.'}
          </p>
        </div>
      </header>

      {!keyStatus?.encryptionConfigured && (
        <div className={styles.warning} role="alert">
          {isAr
            ? 'أضف AI_SECRETS_ENCRYPTION_KEY (32 حرفاً على الأقل) إلى بيئة الخادم قبل حفظ أي مفتاح.'
            : 'Set AI_SECRETS_ENCRYPTION_KEY (at least 32 characters) in the server environment before saving keys.'}
        </div>
      )}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <form className={styles.settings} onSubmit={saveKeys}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>{isAr ? 'مفاتيح الخدمات' : 'Service keys'}</h2>
            <p>
              {isAr
                ? 'يمكن إضافة عدة مفاتيح لكل مزود وأداة. تُشفّر المفاتيح على الخادم وتُستخدم بالتناوب.'
                : 'Add multiple keys per provider and tool. Keys are encrypted on the server and rotated automatically.'}
            </p>
          </div>
          <ShieldCheck size={22} aria-hidden="true" />
        </div>

        {loading ? (
          <div className={styles.empty}><LoaderCircle className={styles.spin} /> {isAr ? 'جارٍ تحميل حالة المفاتيح…' : 'Loading key status…'}</div>
        ) : (
          <div className={styles.keyGrid}>
            {targets.map((target) => {
              const references = keyReferences(target);
              const pending = keyInputs[target];
              const markedForRemoval = references.filter((reference) =>
                removeKeys.includes(`${target}:${reference.id}`)
              ).length;
              const atLimit =
                references.length -
                  markedForRemoval +
                  pending.filter((value) => value.trim()).length >=
                10;
              return (
                <div className={styles.keyService} key={target}>
                  <div className={styles.keyServiceHeading}>
                    <strong>{targetNames[target]}</strong>
                    <span className={styles.keyCount}>
                      {isAr ? `${references.length} محفوظ` : `${references.length} saved`}
                    </span>
                  </div>
                  {references.map((reference, index) => (
                    <label className={styles.removeOption} key={reference.id}>
                      <input
                        type="checkbox"
                        checked={removeKeys.includes(`${target}:${reference.id}`)}
                        onChange={() => toggleRemove(target, reference.id)}
                      />
                      {isAr ? `المفتاح المحفوظ ${index + 1} — حذف` : `Saved key ${index + 1} — remove`}
                    </label>
                  ))}
                  {pending.map((value, index) => (
                    <label className={styles.field} key={`${target}-new-${index}`}>
                      <span>
                        {isAr ? `مفتاح جديد ${index + 1}` : `New key ${index + 1}`}
                        {index === 0 && references.length > 0 && (
                          <em>{isAr ? 'اتركه فارغاً للإبقاء على المفاتيح الحالية' : 'Leave blank to keep existing keys'}</em>
                        )}
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={value}
                        maxLength={4_000}
                        onChange={(event) =>
                          setKeyInputs((current) => ({
                            ...current,
                            [target]: current[target].map((entry, inputIndex) =>
                              inputIndex === index ? event.target.value : entry
                            ),
                          }))
                        }
                        placeholder={isAr ? 'ألصق مفتاح API' : 'Paste API key'}
                      />
                    </label>
                  ))}
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    disabled={atLimit || pending.length >= 10}
                    onClick={() =>
                      setKeyInputs((current) => ({
                        ...current,
                        [target]: [...current[target], ''],
                      }))
                    }
                  >
                    <Plus size={15} /> {isAr ? 'إضافة مفتاح آخر' : 'Add another key'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.keyActions}>
          <span className={styles.researchFootnote}>
            {isAr ? 'الحد الأقصى 10 مفاتيح لكل خدمة.' : 'Up to 10 keys per service.'}
          </span>
          <button
            className={styles.primaryButton}
            disabled={busy || loading || !keyStatus?.encryptionConfigured}
          >
            {busy ? <LoaderCircle className={styles.spin} size={16} /> : <KeyRound size={16} />}
            {isAr ? 'حفظ تغييرات المفاتيح' : 'Save key changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
