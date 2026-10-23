'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import type { SiteSettings } from '@/types';
import type {
  CanopyApiKeyItem,
  CanopyConfig,
  CanopyRotationStrategy,
} from '@/server/services/canopy.service';
import {
  fetchAdminDocumentFromFirebaseClient,
  getFreshFirebaseIdToken,
  syncAdminDocumentToFirebaseClient,
} from '@/lib/firebase-client';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './AdminShell.module.css';

const RETIRED_CANOPY_KEYS = new Set([
  '0f3d3a6e-d787-4118-ae41-b1d308867d96',
  '6868bf02-88ae-49af-822a-4270592cafbf',
  'd6118f97-2e93-4303-911d-dd4edafb7c7e',
  'c1b276cc-4db5-4ab4-8a70-51aa47f231b2',
]);

function stripRetiredCanopyKeys(cfg: CanopyConfig): {
  cleaned: CanopyConfig;
  hadRetired: boolean;
} {
  const rawKeys = Array.isArray(cfg.keys) ? cfg.keys : [];
  let hadRetired = false;
  const filtered = rawKeys.filter((k) => {
    const clean = String(k?.key || '').trim().toLowerCase();
    if (!clean || RETIRED_CANOPY_KEYS.has(clean)) {
      hadRetired = true;
      return false;
    }
    return true;
  });
  return {
    cleaned: {
      ...cfg,
      keys: filtered,
      activeKeyIndex:
        filtered.length > 0
          ? Math.max(0, Math.min(cfg.activeKeyIndex || 0, filtered.length - 1))
          : 0,
      explicitlyCleared: filtered.length === 0 ? true : cfg.explicitlyCleared,
    },
    hadRetired,
  };
}

async function buildAdminAuthHeaders(
  csrfToken: string | null
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  try {
    const idToken = await getFreshFirebaseIdToken();
    if (idToken) {
      headers['x-firebase-id-token'] = idToken;
    }
  } catch {
    // Ignore client token read errors
  }
  return headers;
}

export function AdminSettingsView({
  initialSettings,
  initialCanopyConfig,
}: {
  initialSettings: SiteSettings;
  initialCanopyConfig?: CanopyConfig;
}) {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [siteNameEn, setSiteNameEn] = useState(initialSettings.siteName.en);
  const [siteNameAr, setSiteNameAr] = useState(initialSettings.siteName.ar);
  const [topBarEn, setTopBarEn] = useState(initialSettings.topBarAnnouncement.en);
  const [topBarAr, setTopBarAr] = useState(initialSettings.topBarAnnouncement.ar);
  const [topBarEnabled, setTopBarEnabled] = useState(initialSettings.topBarEnabled);
  const [contactEmail, setContactEmail] = useState(initialSettings.contactEmail);
  const [contactPhoneDisplay, setContactPhoneDisplay] = useState(
    initialSettings.contactPhoneDisplay
  );
  const [contactPhoneE164, setContactPhoneE164] = useState(
    initialSettings.contactPhoneE164
  );
  const [whatsappUrl, setWhatsappUrl] = useState(initialSettings.whatsappUrl);
  const [saving, setSaving] = useState(false);

  // Canopy API Key Pool & Rotation State
  const [canopyConfig, setCanopyConfig] = useState<CanopyConfig>(() => {
    const base = initialCanopyConfig || {
      rotationStrategy: 'failover',
      activeKeyIndex: 0,
      keys: [],
      updatedAt: new Date().toISOString(),
      explicitlyCleared: true,
    };
    return stripRetiredCanopyKeys(base).cleaned;
  });
  const [newKeysRawInput, setNewKeysRawInput] = useState('');
  const [newKeyCustomLabel, setNewKeyCustomLabel] = useState('');
  const [addingKeys, setAddingKeys] = useState(false);
  const [checkingAllKeys, setCheckingAllKeys] = useState(false);
  const [checkingKeyId, setCheckingKeyId] = useState<string | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [togglingKeyId, setTogglingKeyId] = useState(null as string | null);
  const [updatingStrategy, setUpdatingStrategy] = useState(false);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const syncCanopyConfig = async () => {
      try {
        const headers = await buildAdminAuthHeaders(csrfToken);
        const [apiRes, cloudDoc] = await Promise.all([
          fetch('/api/admin/canopy/keys', {
            method: 'GET',
            headers,
            cache: 'no-store',
          }).catch(() => null),
          fetchAdminDocumentFromFirebaseClient<CanopyConfig>(
            'admin_secrets',
            'canopy_config'
          ),
        ]);

        let serverConfig: CanopyConfig | null = null;
        if (apiRes && apiRes.ok) {
          const data = (await apiRes.json()) as { config?: CanopyConfig };
          if (data.config) {
            serverConfig = stripRetiredCanopyKeys(data.config).cleaned;
          }
        }

        let cloudConfig: CanopyConfig | null = null;
        if (cloudDoc && Array.isArray(cloudDoc.keys)) {
          const { cleaned, hadRetired } = stripRetiredCanopyKeys(cloudDoc);
          cloudConfig = cleaned;
          if (hadRetired) {
            const purged = {
              ...cleaned,
              updatedAt: new Date().toISOString(),
            };
            cloudConfig = purged;
            await syncAdminDocumentToFirebaseClient(
              'admin_secrets',
              'canopy_config',
              purged
            );
          }
        }

        let chosen = serverConfig || cloudConfig;
        if (serverConfig && cloudConfig) {
          const serverTime = String(serverConfig.updatedAt || '');
          const cloudTime = String(cloudConfig.updatedAt || '');
          if (cloudTime > serverTime) {
            chosen = cloudConfig;
            await fetch('/api/admin/canopy/keys', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                action: 'sync_from_client',
                clientConfig: cloudConfig,
              }),
            }).catch(() => null);
          } else if (serverTime > cloudTime) {
            chosen = serverConfig;
            await syncAdminDocumentToFirebaseClient(
              'admin_secrets',
              'canopy_config',
              serverConfig
            );
          }
        }

        if (active && chosen) {
          setCanopyConfig(chosen);
        }
      } catch {
        // Keep initial SSR config if client fetch fails
      }
    };
    void syncCanopyConfig();
    return () => {
      active = false;
    };
  }, [csrfToken]);

  const [dnsChecking, setDnsChecking] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    checked: boolean;
    spfFound: boolean;
    spfValue: string;
    dmarcFound: boolean;
    dmarcValue: string;
  }>({
    checked: false,
    spfFound: false,
    spfValue: '',
    dmarcFound: false,
    dmarcValue: '',
  });

  const handleCopyRecord = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(
        isAr ? `تم نسخ ${label} بنجاح.` : `Copied ${label} to clipboard.`,
        'success'
      );
    } catch {
      showToast(
        isAr ? 'تعذر النسخ التلقائي، يرجى تحديد النص ونسخه.' : 'Could not copy automatically.',
        'error'
      );
    }
  };

  const handleAddCanopyKeys = async () => {
    if (!newKeysRawInput.trim()) {
      showToast(
        isAr
          ? 'يرجى لصق مفتاح واحد أو عدة مفاتيح Canopy API أولاً.'
          : 'Please paste one or more Canopy API keys first.',
        'error'
      );
      return;
    }

    setAddingKeys(true);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/canopy/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'add',
          rawKeysInput: newKeysRawInput,
          customLabel: newKeyCustomLabel.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        config?: CanopyConfig;
        addedCount?: number;
        skippedDuplicates?: number;
        error?: string;
      };

      if (!res.ok || !data.config) {
        showToast(data.error || 'تعذر إضافة المفاتيح.', 'error');
        return;
      }

      await syncAdminDocumentToFirebaseClient(
        'admin_secrets',
        'canopy_config',
        data.config
      );
      setCanopyConfig(data.config);
      setNewKeysRawInput('');
      setNewKeyCustomLabel('');
      showToast(
        isAr
          ? `✅ تم إضافة (${data.addedCount || 0}) مفتاح جديد وحفظه في قاعدة البيانات بنجاح${
              data.skippedDuplicates ? ` (وتم تخطي ${data.skippedDuplicates} مكرر)` : ''
            }.`
          : `✅ Added (${data.addedCount || 0}) new key(s)${
              data.skippedDuplicates ? ` (${data.skippedDuplicates} duplicate skipped)` : ''
            }.`,
        'success'
      );
    } catch {
      showToast(
        isAr ? 'حدث خطأ أثناء إضافة المفاتيح.' : 'Error adding keys.',
        'error'
      );
    } finally {
      setAddingKeys(false);
    }
  };

  const handleCheckSingleKey = async (keyItem: CanopyApiKeyItem) => {
    setCheckingKeyId(keyItem.id);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/canopy/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'check_one',
          keyId: keyItem.id,
        }),
      });
      const data = (await res.json()) as {
        config?: CanopyConfig;
        ok?: boolean;
        messageAr?: string;
        error?: string;
      };

      if (!res.ok || !data.config) {
        showToast(data.error || 'تعذر فحص المفتاح.', 'error');
        return;
      }

      await syncAdminDocumentToFirebaseClient(
        'admin_secrets',
        'canopy_config',
        data.config
      );
      setCanopyConfig(data.config);
      showToast(
        data.messageAr || (data.ok ? 'المفتاح يعمل بنجاح' : 'المفتاح غير متاح'),
        data.ok ? 'success' : 'error'
      );
    } catch {
      showToast(
        isAr ? 'تعذر الاتصال بخادم فحص المفاتيح.' : 'Unable to check key.',
        'error'
      );
    } finally {
      setCheckingKeyId(null);
    }
  };

  const handleCheckAllKeys = async () => {
    setCheckingAllKeys(true);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/canopy/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'check_all',
        }),
      });
      const data = (await res.json()) as {
        config?: CanopyConfig;
        activeCount?: number;
        exhaustedCount?: number;
        invalidCount?: number;
        error?: string;
      };

      if (!res.ok || !data.config) {
        showToast(data.error || 'تعذر فحص المفاتيح.', 'error');
        return;
      }

      await syncAdminDocumentToFirebaseClient(
        'admin_secrets',
        'canopy_config',
        data.config
      );
      setCanopyConfig(data.config);
      showToast(
        isAr
          ? `✅ اكتمل فحص جميع المفاتيح: (${data.activeCount || 0}) نشط وجاهز | (${data.exhaustedCount || 0}) متوقف/منتهي الرصيد | (${data.invalidCount || 0}) غير صالح.`
          : `✅ Checked all keys: (${data.activeCount || 0}) active | (${data.exhaustedCount || 0}) exhausted | (${data.invalidCount || 0}) invalid.`,
        (data.activeCount || 0) > 0 ? 'success' : 'error'
      );
    } catch {
      showToast(
        isAr ? 'حدث خطأ أثناء فحص جميع المفاتيح.' : 'Error checking all keys.',
        'error'
      );
    } finally {
      setCheckingAllKeys(false);
    }
  };

  const handleDeleteKey = async (keyItem: CanopyApiKeyItem) => {
    setDeletingKeyId(keyItem.id);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/canopy/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete',
          keyId: keyItem.id,
        }),
      });
      const data = (await res.json()) as { config?: CanopyConfig; error?: string };
      if (!res.ok || !data.config) {
        showToast(data.error || 'تعذر حذف المفتاح.', 'error');
        return;
      }
      await syncAdminDocumentToFirebaseClient(
        'admin_secrets',
        'canopy_config',
        data.config
      );
      setCanopyConfig(data.config);
      showToast(
        isAr ? `🗑️ تم حذف (${keyItem.label}) نهائياً من قاعدة البيانات.` : `🗑️ Deleted (${keyItem.label}).`,
        'info'
      );
    } finally {
      setDeletingKeyId(null);
    }
  };

  const handleToggleKey = async (keyItem: CanopyApiKeyItem, nextEnabled: boolean) => {
    setTogglingKeyId(keyItem.id);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/canopy/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'toggle',
          keyId: keyItem.id,
          enabled: nextEnabled,
        }),
      });
      const data = (await res.json()) as { config?: CanopyConfig; error?: string };
      if (res.ok && data.config) {
        await syncAdminDocumentToFirebaseClient(
          'admin_secrets',
          'canopy_config',
          data.config
        );
        setCanopyConfig(data.config);
        showToast(
          isAr
            ? nextEnabled
              ? `تم تفعيل (${keyItem.label}) وإعادته لنظام التدوير.`
              : `تم إيقاف (${keyItem.label}) مؤقتاً.`
            : nextEnabled
              ? `Enabled (${keyItem.label}).`
              : `Disabled (${keyItem.label}).`,
          'success'
        );
      }
    } finally {
      setTogglingKeyId(null);
    }
  };

  const handleUpdateStrategy = async (params: {
    rotationStrategy?: CanopyRotationStrategy;
    activeKeyId?: string;
  }) => {
    setUpdatingStrategy(true);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/canopy/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update_strategy',
          ...params,
        }),
      });
      const data = (await res.json()) as { config?: CanopyConfig; error?: string };
      if (res.ok && data.config) {
        await syncAdminDocumentToFirebaseClient(
          'admin_secrets',
          'canopy_config',
          data.config
        );
        setCanopyConfig(data.config);
        showToast(
          isAr
            ? '⚡ تم تحديث إعدادات نظام التدوير والمفتاح النشط بنجاح.'
            : '⚡ Rotation strategy & active key updated.',
          'success'
        );
      }
    } finally {
      setUpdatingStrategy(false);
    }
  };

  const handleVerifyDnsRecords = async () => {
    setDnsChecking(true);
    try {
      const [spfRes, dmarcRes] = await Promise.all([
        fetch('https://dns.google/resolve?name=aqurivo.store&type=TXT', { cache: 'no-store' }),
        fetch('https://dns.google/resolve?name=_dmarc.aqurivo.store&type=TXT', { cache: 'no-store' }),
      ]);
      const spfJson = (await spfRes.json()) as { Answer?: Array<{ data?: string }> };
      const dmarcJson = (await dmarcRes.json()) as { Answer?: Array<{ data?: string }> };

      const spfAnswers = (spfJson.Answer || []).map((a) => (a.data || '').replace(/^"|"$/g, ''));
      const dmarcAnswers = (dmarcJson.Answer || []).map((a) => (a.data || '').replace(/^"|"$/g, ''));

      const spfMatch = spfAnswers.find((txt) => txt.toLowerCase().includes('v=spf1')) || '';
      const dmarcMatch = dmarcAnswers.find((txt) => txt.toLowerCase().includes('v=dmarc1')) || '';

      setDnsStatus({
        checked: true,
        spfFound: Boolean(spfMatch),
        spfValue: spfMatch,
        dmarcFound: Boolean(dmarcMatch),
        dmarcValue: dmarcMatch,
      });

      if (spfMatch && dmarcMatch) {
        showToast(
          isAr
            ? 'تم التحقق! سجلا SPF و DMARC منشوران وفعالان على نطاق aqurivo.store.'
            : 'Verified! Both SPF and DMARC records are published on aqurivo.store.',
          'success'
        );
      } else {
        showToast(
          isAr
            ? 'تم فحص DNS: يرجى إضافة السجلات الموضحة أدناه في لوحة تحكم النطاق.'
            : 'DNS checked: Please add the missing TXT records at your DNS provider.',
          'info'
        );
      }
    } catch {
      showToast(
        isAr ? 'تعذر الاتصال بخادم فحص DNS حالياً.' : 'Unable to reach DNS resolver right now.',
        'error'
      );
    } finally {
      setDnsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await buildAdminAuthHeaders(csrfToken);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          siteName: { en: siteNameEn, ar: siteNameAr },
          topBarAnnouncement: { en: topBarEn, ar: topBarAr },
          topBarEnabled,
          contactEmail,
          contactPhoneDisplay,
          contactPhoneE164,
          whatsappUrl,
        }),
      });
      if (res.ok) {
        showToast(
          isAr ? 'تم حفظ إعدادات الموقع بنجاح.' : 'Site settings updated.',
          'success'
        );
      } else {
        const data = (await res.json()) as { error?: string };
        showToast(data.error || 'Error saving settings', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const spfRecordValue = 'v=spf1 include:spf.improvmx.com ~all';
  const dmarcObserveValue = 'v=DMARC1; p=none; sp=none; adkim=s; aspf=s; rua=mailto:contact@aqurivo.store';
  const dmarcRejectValue = 'v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:contact@aqurivo.store';

  const activeKeysCount = canopyConfig.keys.filter(
    (k) => k.enabled && k.status === 'active'
  ).length;
  const exhaustedKeysCount = canopyConfig.keys.filter(
    (k) => k.status === 'exhausted'
  ).length;
  const totalRequestsServed = canopyConfig.keys.reduce(
    (sum, k) => sum + (k.usageCount || 0),
    0
  );

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'إعدادات الموقع وإدارة المفاتيح' : 'Site Settings & API Key Pool'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'إدارة مفاتيح Canopy API ونظام التدوير الذكي، تحديث بيانات العلامة التجارية، وفحص أمان البريد.'
              : 'Manage Canopy API keys & smart rotation failover, brand settings, and domain security.'}
          </p>
        </div>
      </div>

      {/* ⚡ Canopy API Key Pool & Auto-Failover Rotation Studio */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2
              className={styles.sectionTitle}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <KeyRound size={19} color="#2DD4BF" />
              <span>
                {isAr
                  ? 'إدارة مفاتيح Canopy API ونظام التدوير التلقائي (Auto-Failover & Rotation)'
                  : 'Canopy API Key Pool & Auto-Failover Rotation'}
              </span>
            </h2>
            <p className={styles.pageSubtitle}>
              {isAr
                ? 'عند انتهاء رصيد أي مفتاح أو حدوث خطأ فيه أثناء جلب بيانات وصور وفيديوهات المنتج، ينتقل النظام تلقائياً وفي نفس اللحظة إلى المفتاح التالي دون توقف.'
                : 'When any key runs out of credits or returns an error, the system automatically fails over to the next key in the pool.'}
            </p>
          </div>

          <div className={styles.actionRow}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={checkingAllKeys}
              onClick={handleCheckAllKeys}
            >
              <RefreshCw size={14} />
              <span>
                {isAr
                  ? `فحص جميع المفاتيح الآن (${canopyConfig.keys.length})`
                  : `Test All Keys Now (${canopyConfig.keys.length})`}
              </span>
            </Button>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border-hairline)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {isAr ? 'إجمالي المفاتيح المدمجة' : 'Total Integrated Keys'}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                marginTop: '4px',
              }}
            >
              {canopyConfig.keys.length}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#10B981' }}>
              {isAr ? 'المفاتيح النشطة والجاهزة' : 'Active & Ready Keys'}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#10B981',
                marginTop: '4px',
              }}
            >
              {activeKeysCount}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background:
                exhaustedKeysCount > 0
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'var(--color-bg-subtle)',
              border:
                exhaustedKeysCount > 0
                  ? '1px solid rgba(245, 158, 11, 0.35)'
                  : '1px solid var(--color-border-hairline)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: exhaustedKeysCount > 0 ? '#F59E0B' : 'var(--color-text-secondary)',
              }}
            >
              {isAr ? 'مفاتيح منتهية الرصيد (تم تجاوزها)' : 'Exhausted Keys (Skipped)'}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: exhaustedKeysCount > 0 ? '#F59E0B' : 'var(--color-text-primary)',
                marginTop: '4px',
              }}
            >
              {exhaustedKeysCount}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border-hairline)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {isAr ? 'عمليات الجلب الناجحة' : 'Successful Product Fetches'}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#2DD4BF',
                marginTop: '4px',
              }}
            >
              {totalRequestsServed}
            </div>
          </div>
        </div>

        {/* Rotation Mode Selector */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.35)',
            border: '1px solid rgba(45, 212, 191, 0.25)',
            marginBottom: '18px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              {isAr ? '🔄 استراتيجية نظام التدوير بين المفاتيح:' : '🔄 Key Rotation Strategy:'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {canopyConfig.rotationStrategy === 'failover'
                ? isAr
                  ? 'الوضع الحالي: يعتمد المفتاح النشط أولاً، وإذا انتهى رصيده أو أعاد خطأ ينتقل فوراً للمفتاح التالي تلقائياً.'
                  : 'Current: Uses the active primary key until quota is exhausted, then automatically switches to the next key.'
                : isAr
                  ? 'الوضع الحالي: يوزع عمليات الجلب بالتناوب المتساوي (1 ثم 2 ثم 3 ثم 4) ويتخطى أي مفتاح ينتهي رصيده تلقائياً.'
                  : 'Current: Distributes requests evenly across all active keys in turn, skipping any exhausted key.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              size="sm"
              variant={canopyConfig.rotationStrategy === 'failover' ? 'primary' : 'outline'}
              disabled={updatingStrategy}
              onClick={() => handleUpdateStrategy({ rotationStrategy: 'failover' })}
            >
              <Zap size={14} />
              <span>
                {isAr
                  ? 'الانتقال عند انتهاء الرصيد (Failover)'
                  : 'Quota Failover (Recommended)'}
              </span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant={canopyConfig.rotationStrategy === 'round_robin' ? 'primary' : 'outline'}
              disabled={updatingStrategy}
              onClick={() => handleUpdateStrategy({ rotationStrategy: 'round_robin' })}
            >
              <RefreshCw size={14} />
              <span>
                {isAr
                  ? 'التدوير المتناوب المتساوي (Round-Robin)'
                  : 'Round-Robin Rotation'}
              </span>
            </Button>
          </div>
        </div>

        {/* Add Single or Multiple Keys Form */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border-hairline)',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '8px',
            }}
          >
            {isAr
              ? '➕ إضافة مفتاح جديد أو عدة مفاتيح دفعة واحدة:'
              : '➕ Add Single or Multiple Canopy API Keys:'}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
              alignItems: 'start',
            }}
          >
            <div className={styles.fieldGroup} style={{ margin: 0 }}>
              <label className={styles.fieldLabel} style={{ fontSize: '12px' }}>
                {isAr
                  ? 'المفاتيح (الصق مفتاحاً واحداً أو عدة مفاتيح مفصولة بسطر أو فاصلة)'
                  : 'API Key(s) (Paste one or multiple keys separated by lines or commas)'}
              </label>
              <textarea
                rows={2}
                value={newKeysRawInput}
                onChange={(e) => setNewKeysRawInput(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: 0f3d3a6e-d787-4118-ae41-b1d308867d96\nأو الصق عدة مفاتيح معاً ليتم استخراجها وإضافتها تلقائياً...'
                    : 'Paste one or more UUID keys here...'
                }
                className={styles.textareaInput}
                dir="ltr"
                style={{ fontSize: '12px', minHeight: '60px', fontFamily: 'monospace' }}
              />
            </div>

            <div className={styles.fieldGroup} style={{ margin: 0 }}>
              <label className={styles.fieldLabel} style={{ fontSize: '12px' }}>
                {isAr ? 'اسم توضيحي للمفتاح (اختياري)' : 'Key Label (Optional)'}
              </label>
              <input
                type="text"
                value={newKeyCustomLabel}
                onChange={(e) => setNewKeyCustomLabel(e.target.value)}
                placeholder={isAr ? 'مثال: مفتاح حساب إضافي 5' : 'e.g. Backup Account Key'}
                className={styles.selectInput}
                style={{ fontSize: '12px' }}
              />
              <div style={{ marginTop: '8px' }}>
                <Button
                  type="button"
                  size="sm"
                  isLoading={addingKeys}
                  onClick={handleAddCanopyKeys}
                >
                  <Plus size={14} />
                  <span>
                    {isAr ? 'إضافة المفاتيح إلى حوض التدوير' : 'Add Key(s) to Rotation Pool'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Keys List */}
        <div className={styles.mobileAdminCards} style={{ display: 'flex' }}>
          {canopyConfig.keys.length === 0 ? (
            <div className={styles.alertBanner}>
              {isAr
                ? 'لا توجد مفاتيح مضافة حالياً. استخدم الخانة أعلاه لإضافة مفاتيح Canopy API.'
                : 'No Canopy API keys in pool. Add keys above.'}
            </div>
          ) : (
            canopyConfig.keys.map((keyItem, index) => {
              const isCurrentPointer = index === canopyConfig.activeKeyIndex && keyItem.enabled;
              const isRevealed = Boolean(revealedKeyIds[keyItem.id]);

              let statusBadgeColor = '#10B981';
              let statusBadgeBg = 'rgba(16, 185, 129, 0.12)';
              let statusText = isAr ? 'نشط وجاهز' : 'Active & Ready';

              if (!keyItem.enabled) {
                statusBadgeColor = '#94A3B8';
                statusBadgeBg = 'rgba(148, 163, 184, 0.15)';
                statusText = isAr ? 'موقوف مؤقتاً' : 'Disabled';
              } else if (keyItem.status === 'exhausted') {
                statusBadgeColor = '#F59E0B';
                statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
                statusText = isAr
                  ? 'انتهى الرصيد (يتجاوزه النظام تلقائياً)'
                  : 'Quota Exhausted (Auto-Skipped)';
              } else if (keyItem.status === 'invalid') {
                statusBadgeColor = '#EF4444';
                statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
                statusText = isAr ? 'غير صالح' : 'Invalid Key';
              } else if (keyItem.status === 'untested') {
                statusBadgeColor = '#38BDF8';
                statusBadgeBg = 'rgba(56, 189, 248, 0.15)';
                statusText = isAr ? 'جاهز (بانتظار الفحص)' : 'Ready (Untested)';
              }

              return (
                <div
                  key={keyItem.id}
                  className={styles.mobileAdminCard}
                  style={{
                    borderColor: isCurrentPointer
                      ? '#2DD4BF'
                      : 'var(--color-border-hairline)',
                    background: isCurrentPointer
                      ? 'rgba(45, 212, 191, 0.04)'
                      : undefined,
                  }}
                >
                  <div className={styles.mobileAdminCardHeader}>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#2DD4BF',
                          }}
                        >
                          #{index + 1}
                        </span>
                        <h3 className={styles.mobileAdminCardTitle} style={{ margin: 0 }}>
                          {keyItem.label}
                        </h3>
                        {isCurrentPointer && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#2DD4BF',
                              background: 'rgba(45, 212, 191, 0.14)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {isAr ? '⚡ المفتاح النشط حالياً في الدور' : '⚡ Current Active Key'}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: statusBadgeColor,
                            background: statusBadgeBg,
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {statusText}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '6px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          color: 'var(--color-text-primary)',
                        }}
                        dir="ltr"
                      >
                        <span>{isRevealed ? keyItem.key : keyItem.maskedKey}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedKeyIds((prev) => ({
                              ...prev,
                              [keyItem.id]: !prev[keyItem.id],
                            }))
                          }
                          title={isAr ? 'إظهار / إخفاء المفتاح' : 'Show / Hide Key'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyRecord(keyItem.label, keyItem.key)}
                          title={isAr ? 'نسخ المفتاح' : 'Copy Key'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={checkingKeyId === keyItem.id}
                        onClick={() => handleCheckSingleKey(keyItem)}
                      >
                        <Activity size={13} />
                        <span>{isAr ? 'فحص المفتاح' : 'Test Key'}</span>
                      </Button>

                      {!isCurrentPointer && keyItem.enabled && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingStrategy}
                          onClick={() =>
                            handleUpdateStrategy({ activeKeyId: keyItem.id })
                          }
                        >
                          <CheckCircle2 size={13} />
                          <span>{isAr ? 'تعيين كنشط' : 'Set Active'}</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={togglingKeyId === keyItem.id}
                        onClick={() =>
                          handleToggleKey(
                            keyItem,
                            keyItem.status === 'exhausted' ? true : !keyItem.enabled
                          )
                        }
                      >
                        <span>
                          {keyItem.status === 'exhausted'
                            ? isAr
                              ? 'إعادة تفعيل الرصيد'
                              : 'Reactivate'
                            : keyItem.enabled
                              ? isAr
                                ? 'إيقاف مؤقت'
                                : 'Disable'
                              : isAr
                                ? 'تفعيل'
                                : 'Enable'}
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isLoading={deletingKeyId === keyItem.id}
                        onClick={() => handleDeleteKey(keyItem)}
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 size={13} />
                        <span>{isAr ? 'حذف' : 'Delete'}</span>
                      </Button>
                    </div>
                  </div>

                  <div className={styles.mobileAdminCardMeta}>
                    <div className={styles.mobileAdminMetaItem}>
                      <span className={styles.mobileAdminMetaLabel}>
                        {isAr ? 'مرات الجلب الناجحة' : 'Successful Uses'}
                      </span>
                      <span className={styles.mobileAdminMetaValue}>
                        {keyItem.usageCount}
                      </span>
                    </div>

                    <div className={styles.mobileAdminMetaItem}>
                      <span className={styles.mobileAdminMetaLabel}>
                        {isAr ? 'سرعة الاستجابة' : 'Latency'}
                      </span>
                      <span className={styles.mobileAdminMetaValue} dir="ltr">
                        {keyItem.lastLatencyMs !== null ? `${keyItem.lastLatencyMs} ms` : '—'}
                      </span>
                    </div>

                    <div className={styles.mobileAdminMetaItem}>
                      <span className={styles.mobileAdminMetaLabel}>
                        {isAr ? 'آخر فحص / استخدام' : 'Last Checked / Used'}
                      </span>
                      <span className={styles.mobileAdminMetaValue} dir="ltr">
                        {keyItem.lastCheckedAt || keyItem.lastUsedAt
                          ? new Date(
                              (keyItem.lastCheckedAt || keyItem.lastUsedAt)!
                            ).toLocaleTimeString(isAr ? 'ar-MA' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {keyItem.lastError && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        fontSize: '12px',
                        color: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShieldAlert size={14} />
                      <span>{keyItem.lastError}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              {isAr ? 'إعدادات العلامة التجارية والتواصل' : 'Brand & Contact Settings'}
            </h2>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Input
            label={isAr ? 'اسم الموقع (بالإنجليزية)' : 'Site Name (English)'}
            value={siteNameEn}
            onChange={(e) => setSiteNameEn(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'اسم الموقع (بالعربية)' : 'Site Name (Arabic)'}
            value={siteNameAr}
            onChange={(e) => setSiteNameAr(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'نص الشريط العلوي (بالإنجليزية)' : 'Announcement Text (English)'}
            value={topBarEn}
            onChange={(e) => setTopBarEn(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'نص الشريط العلوي (بالعربية)' : 'Announcement Text (Arabic)'}
            value={topBarAr}
            onChange={(e) => setTopBarAr(e.target.value)}
            required
          />
          <Input
            type="email"
            label={isAr ? 'البريد الإلكتروني الرسمي' : 'Official Contact Email'}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'رقم الهاتف المعروض' : 'Display Phone Number'}
            value={contactPhoneDisplay}
            onChange={(e) => setContactPhoneDisplay(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'رقم الهاتف بصيغة E.164' : 'Phone E.164 Format'}
            value={contactPhoneE164}
            onChange={(e) => setContactPhoneE164(e.target.value)}
            required
          />
          <Input
            label={isAr ? 'رابط واتساب الرسمي' : 'Official WhatsApp URL'}
            value={whatsappUrl}
            onChange={(e) => setWhatsappUrl(e.target.value)}
            required
          />
        </div>

        <label className={styles.actionRow}>
          <input
            type="checkbox"
            checked={topBarEnabled}
            onChange={(e) => setTopBarEnabled(e.target.checked)}
          />
          <span className={styles.fieldLabel}>
            {isAr ? 'تفعيل الشريط العلوي في المتجر' : 'Enable Top Announcement Bar'}
          </span>
        </label>

        <div className={styles.actionRow}>
          <Button type="submit" isLoading={saving}>
            {isAr ? 'حفظ الإعدادات' : 'Save Settings'}
          </Button>
        </div>
      </form>

      {/* Domain Email Anti-Spoofing (SPF & DMARC) + Security Headers Verification */}
      <section className={`${styles.card} ${styles.dnsSection}`}>
        <div className={styles.dnsHeader}>
          <div className={styles.dnsIntro}>
            <span className={styles.dnsIcon} aria-hidden="true">
              <ShieldAlert size={19} />
            </span>
            <div>
              <h2 className={styles.dnsTitle}>
                {isAr
                  ? 'حماية النطاق من انتحال البريد (SPF & DMARC) وترويسات الأمان'
                  : 'Domain Email Anti-Spoofing (SPF & DMARC) & Security Headers'}
              </h2>
              <p className={styles.pageSubtitle}>
                {isAr
                  ? 'أضف سجلات TXT التالية في لوحة تحكم DNS الخاصة بنطاق aqurivo.store لمنع أي جهة من إرسال بريد مزيف باسم موقعك.'
                  : 'Add these TXT records in your DNS provider for aqurivo.store to prevent email spoofing.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={dnsChecking}
            onClick={handleVerifyDnsRecords}
          >
            {isAr ? 'فحص سجلات DNS الآن' : 'Verify DNS Records Live'}
          </Button>
        </div>

        {dnsStatus.checked && (
          <div
            className={`${styles.alertBanner} ${styles.dnsStatus}`}
            role="status"
          >
            <strong>
              {isAr
                ? 'نتيجة الفحص المباشر لنطاق aqurivo.store:'
                : 'Live DNS Check Result for aqurivo.store:'}
            </strong>
            <p>
              • <strong>SPF (aqurivo.store):</strong>{' '}
              {dnsStatus.spfFound
                ? `${isAr ? 'مفعّل بنجاح' : 'Published'} (${dnsStatus.spfValue})`
                : isAr
                  ? 'غير منشور بعد في DNS — انسخ السجل الأول أدناه وأضفه في لوحة النطاق.'
                  : 'Not published in DNS yet — copy Record 1 below into your DNS panel.'}
            </p>
            <p>
              • <strong>DMARC (_dmarc.aqurivo.store):</strong>{' '}
              {dnsStatus.dmarcFound
                ? `${isAr ? 'مفعّل بنجاح' : 'Published'} (${dnsStatus.dmarcValue})`
                : isAr
                  ? 'غير منشور بعد في DNS — انسخ السجل الثاني أدناه وأضفه في لوحة النطاق.'
                  : 'Not published in DNS yet — copy Record 2 below into your DNS panel.'}
            </p>
          </div>
        )}

        <div className={styles.dnsRecords}>
          <article className={styles.dnsRecordCard}>
            <div className={styles.dnsRecordHeader}>
              <div className={styles.dnsRecordInfo}>
                <span className={styles.dnsRecordNumber}>01</span>
                <div>
                  <h3 className={styles.dnsRecordTitle}>
                    {isAr
                      ? 'سجل SPF (منع إرسال بريد مزيف باسم النطاق)'
                      : 'SPF Record (Prevent Spoofing)'}
                  </h3>
                  <div className={styles.dnsRecordMeta}>
                    <span>
                      <strong>TXT</strong> {isAr ? 'النوع' : 'Type'}
                    </span>
                    <span dir="ltr">
                      <strong>@</strong> aqurivo.store
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopyRecord('SPF', spfRecordValue)}
              >
                {isAr ? 'نسخ القيمة' : 'Copy Value'}
              </Button>
            </div>
            <div className={styles.dnsValueBlock}>
              <span className={styles.dnsValueLabel}>TXT VALUE</span>
              <code className={styles.dnsValue} dir="ltr">
                {spfRecordValue}
              </code>
            </div>
          </article>

          <article className={styles.dnsRecordCard}>
            <div className={styles.dnsRecordHeader}>
              <div className={styles.dnsRecordInfo}>
                <span className={styles.dnsRecordNumber}>02</span>
                <div>
                  <h3 className={styles.dnsRecordTitle}>
                    {isAr
                      ? 'سجل DMARC — وضع المراقبة الموصى به للبدء (p=none)'
                      : 'DMARC Record — Observation Mode (p=none)'}
                  </h3>
                  <div className={styles.dnsRecordMeta}>
                    <span>
                      <strong>TXT</strong> {isAr ? 'النوع' : 'Type'}
                    </span>
                    <span dir="ltr">
                      <strong>_dmarc</strong> _dmarc.aqurivo.store
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopyRecord('DMARC (p=none)', dmarcObserveValue)}
              >
                {isAr ? 'نسخ القيمة' : 'Copy Value'}
              </Button>
            </div>
            <div className={styles.dnsValueBlock}>
              <span className={styles.dnsValueLabel}>TXT VALUE</span>
              <code className={styles.dnsValue} dir="ltr">
                {dmarcObserveValue}
              </code>
            </div>
          </article>

          <article className={styles.dnsRecordCard}>
            <div className={styles.dnsRecordHeader}>
              <div className={styles.dnsRecordInfo}>
                <span className={styles.dnsRecordNumber}>03</span>
                <div>
                  <h3 className={styles.dnsRecordTitle}>
                    {isAr
                      ? 'سجل DMARC — وضع الحظر الصارم (p=reject)'
                      : 'DMARC Record — Strict Reject Mode (p=reject)'}
                  </h3>
                  <div className={styles.dnsRecordMeta}>
                    <span>
                      <strong>TXT</strong> {isAr ? 'النوع' : 'Type'}
                    </span>
                    <span dir="ltr">
                      <strong>_dmarc</strong> _dmarc.aqurivo.store
                    </span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopyRecord('DMARC (p=reject)', dmarcRejectValue)}
              >
                {isAr ? 'نسخ القيمة' : 'Copy Value'}
              </Button>
            </div>
            <div className={styles.dnsValueBlock}>
              <span className={styles.dnsValueLabel}>TXT VALUE</span>
              <code className={styles.dnsValue} dir="ltr">
                {dmarcRejectValue}
              </code>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
