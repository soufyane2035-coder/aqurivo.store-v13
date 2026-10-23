'use client';

import React, { useState } from 'react';
import { CheckCircle2, MailOpen, Trash2 } from 'lucide-react';
import type { ContactMessage } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './AdminShell.module.css';

export function AdminMessagesView({
  initialMessages,
}: {
  initialMessages: ContactMessage[];
}) {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [messages, setMessages] = useState(initialMessages);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  const handleToggleRead = async (msg: ContactMessage) => {
    if (!csrfToken) return;
    const nextRead = !msg.isRead;
    const res = await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        messageId: msg.id,
        isRead: nextRead,
      }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: nextRead } : m))
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !csrfToken) return;
    const res = await fetch(
      `/api/admin/messages?id=${encodeURIComponent(deleteTarget.id)}`,
      {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      }
    );
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(isAr ? 'تم حذف الرسالة.' : 'Message deleted.', 'info');
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {isAr ? 'صندوق الرسائل الواردة' : 'Reader Messages Inbox'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'الرسائل المرسلة عبر نموذج «تواصل معنا» المحمي.'
              : 'Messages submitted through the protected Contact Us form.'}
          </p>
        </div>
      </div>

      <section className={styles.card}>
        {messages.length === 0 ? (
          <p className={styles.pageSubtitle}>
            {isAr ? 'صندوق الرسائل فارغ حالياً.' : 'No messages received yet.'}
          </p>
        ) : (
          <>
            <div className={`${styles.tableWrap} ${styles.desktopTableOnly}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'المرسل' : 'Sender'}</th>
                    <th>{isAr ? 'الموضوع والرسالة' : 'Subject & Message'}</th>
                    <th>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th>{isAr ? 'الحالة' : 'Status'}</th>
                    <th>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id}>
                      <td>
                        <strong>{msg.senderName}</strong>
                        <div className={styles.kpiLabel}>{msg.senderEmail}</div>
                      </td>
                      <td>
                        <strong>{msg.subject}</strong>
                        <p className={styles.pageSubtitle}>{msg.message}</p>
                      </td>
                      <td className="tabularNums">
                        {formatCalendarDate(msg.createdAt, locale)}
                      </td>
                      <td>
                        <span
                          className={msg.isRead ? styles.badgeNeutral : styles.badgeWarning}
                        >
                          {msg.isRead
                            ? isAr
                              ? 'مقروءة'
                              : 'Read'
                            : isAr
                              ? 'جديدة'
                              : 'Unread'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            onClick={() => handleToggleRead(msg)}
                            className={styles.topBarBtn}
                          >
                            {msg.isRead ? (
                              <MailOpen size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>
                              {msg.isRead
                                ? isAr
                                  ? 'وسم كغير مقروءة'
                                  : 'Mark Unread'
                                : isAr
                                  ? 'وسم كمقروءة'
                                  : 'Mark Read'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(msg)}
                            className={styles.topBarBtn}
                          >
                            <Trash2 size={14} />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileAdminCards}>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.mobileItemCard}>
                  <div className={styles.mobileCardHeaderRow}>
                    <div className={styles.mobileItemInfo}>
                      <span className={styles.mobileItemTitle}>{msg.senderName}</span>
                      <span className={styles.mobileItemSlug}>{msg.senderEmail}</span>
                    </div>
                    <span
                      className={msg.isRead ? styles.badgeNeutral : styles.badgeWarning}
                    >
                      {msg.isRead
                        ? isAr
                          ? 'مقروءة'
                          : 'Read'
                        : isAr
                          ? 'جديدة'
                          : 'Unread'}
                    </span>
                  </div>

                  <div className={styles.mobileItemInfo}>
                    <strong className={styles.mobileItemTitle}>{msg.subject}</strong>
                    <p className={styles.mobileCardBodyText}>{msg.message}</p>
                  </div>

                  <div className={styles.mobileItemMetaRow}>
                    <span className={styles.mobileMetaPill}>
                      <span className={styles.mobileMetaLabel}>
                        {isAr ? 'التاريخ:' : 'Date:'}
                      </span>
                      <span className={`${styles.mobileMetaValue} tabularNums`}>
                        {formatCalendarDate(msg.createdAt, locale)}
                      </span>
                    </span>
                  </div>

                  <div className={styles.mobileItemActions}>
                    <div className={styles.mobileActionButtonsGroup}>
                      <button
                        type="button"
                        onClick={() => handleToggleRead(msg)}
                        className={styles.topBarBtn}
                      >
                        {msg.isRead ? (
                          <MailOpen size={14} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        <span>
                          {msg.isRead
                            ? isAr
                              ? 'وسم كغير مقروءة'
                              : 'Mark Unread'
                            : isAr
                              ? 'وسم كمقروءة'
                              : 'Mark Read'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(msg)}
                        className={styles.topBarBtn}
                      >
                        <Trash2 size={14} />
                        <span>{isAr ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={isAr ? 'تأكيد حذف الرسالة' : 'Confirm Message Deletion'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              {isAr ? 'حذف' : 'Delete'}
            </Button>
          </>
        }
      >
        <p>
          {isAr
            ? 'هل أنت متأكد من حذف هذه الرسالة نهائياً؟'
            : 'Are you sure you want to delete this message?'}
        </p>
      </Modal>
    </>
  );
}
