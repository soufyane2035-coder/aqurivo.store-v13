import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

interface ContactEmailPayload {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  createdAt?: string;
}

interface SendMailResult {
  sent: boolean;
  messageId?: string;
  reason?: string;
}

let cachedTransporter: Transporter | null = null;
let transporterInitialized = false;

function getTransporter(): Transporter | null {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = (
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    'aqurivo@gmail.com'
  ).trim();
  const rawPass = (
    process.env.SMTP_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    'slwa brud ange ovqd'
  ).trim();

  // Remove spaces often present when copying 16-character Google App Passwords
  const pass = rawPass.replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;

  try {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    transporterInitialized = true;
    return cachedTransporter;
  } catch (err) {
    console.error('[AQURIVO Mailer] Failed to initialize SMTP transporter:', err);
    transporterInitialized = true;
    cachedTransporter = null;
    return null;
  }
}

/**
 * Sends an administrative alert email when a visitor submits the contact form.
 */
export async function sendContactNotification(
  payload: ContactEmailPayload
): Promise<SendMailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    // Graceful fallback when SMTP credentials are not yet configured in env
    return {
      sent: false,
      reason: 'SMTP is not configured in environment variables (SMTP_USER, SMTP_APP_PASSWORD).',
    };
  }

  const fromUser = (process.env.SMTP_USER || process.env.GMAIL_USER || 'contact@aqurivo.store').trim();
  const fromName = process.env.SMTP_FROM_NAME || 'AQURIVO Contact Desk';
  const recipients = (
    process.env.CONTACT_NOTIFICATION_EMAIL ||
    fromUser ||
    'souftoolsai@gmail.com,contact@aqurivo.store'
  )
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const safeName = escapeHtml(payload.senderName);
  const safeEmail = escapeHtml(payload.senderEmail);
  const safeSubject = escapeHtml(payload.subject);
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br/>');
  const dateStr = payload.createdAt || new Date().toISOString();

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f8; color: #1e293b; margin: 0; padding: 24px; direction: rtl; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 24px 32px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .field-value { font-size: 15px; color: #0f172a; line-height: 1.6; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #edf2f7; }
    .message-box { font-size: 15px; color: #0f172a; line-height: 1.7; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
    .cta-row { margin-top: 28px; text-align: center; }
    .reply-btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .footer { background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>رسالة تواصل جديدة عبر موقع AQURIVO</h1>
      <p>وصلت رسالة جديدة من زائر عبر نموذج الاتصال الرسمي</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="field-label">اسم المرسل</div>
        <div class="field-value">${safeName}</div>
      </div>
      <div class="field">
        <div class="field-label">البريد الإلكتروني</div>
        <div class="field-value"><a href="mailto:${safeEmail}" style="color: #059669;">${safeEmail}</a></div>
      </div>
      <div class="field">
        <div class="field-label">موضوع الرسالة</div>
        <div class="field-value">${safeSubject}</div>
      </div>
      <div class="field">
        <div class="field-label">نص الرسالة</div>
        <div class="message-box">${safeMessage}</div>
      </div>
      <div class="field">
        <div class="field-label">تاريخ ووقت الإرسال</div>
        <div class="field-value" style="font-size: 13px; color: #64748b;">${dateStr}</div>
      </div>
      <div class="cta-row">
        <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(payload.subject)}" class="reply-btn">الرد مباشرة على المرسل عبر البريد</a>
      </div>
    </div>
    <div class="footer">
      AQURIVO — المنصة التحريرية المستقلة لترشيح الصفقات الموثوقة | WhatsApp: +212 684 063908
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: recipients,
      replyTo: payload.senderEmail,
      subject: `[AQURIVO Contact] ${payload.subject} — من ${payload.senderName}`,
      text: `رسالة جديدة من ${payload.senderName} (${payload.senderEmail}):\nالموضوع: ${payload.subject}\nالتاريخ: ${dateStr}\n\nنص الرسالة:\n${payload.message}`,
      html,
    });

    return { sent: true, messageId: info.messageId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AQURIVO Mailer] Error sending contact notification:', msg);
    return { sent: false, reason: msg };
  }
}

/**
 * Sends an automated confirmation receipt to the customer who submitted the form.
 */
export async function sendContactAutoReply(
  payload: Pick<ContactEmailPayload, 'senderName' | 'senderEmail' | 'subject'>
): Promise<SendMailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    return { sent: false, reason: 'SMTP unconfigured' };
  }

  const fromUser = (process.env.SMTP_USER || process.env.GMAIL_USER || 'contact@aqurivo.store').trim();
  const fromName = 'AQURIVO Care Desk';
  const safeName = escapeHtml(payload.senderName);

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f8; color: #1e293b; margin: 0; padding: 24px; direction: rtl; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 28px 32px; text-align: center; }
    .logo-badge { display: inline-block; background: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
    .body { padding: 32px; font-size: 15px; line-height: 1.7; color: #334155; }
    .channels { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .channels ul { margin: 8px 0 0 0; padding-right: 20px; }
    .channels li { margin-bottom: 6px; }
    .whatsapp-badge { display: inline-block; background: #25d366; color: #ffffff !important; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 10px; }
    .footer { background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-badge">AQURIVO</div>
      <h1>تم استلام رسالتك بنجاح</h1>
    </div>
    <div class="body">
      <p>مرحباً <strong>${safeName}</strong>،</p>
      <p>نشكرك على تواصلك مع فريق <strong>AQURIVO</strong>. نؤكد لك أن رسالتك بخصوص <em>«${escapeHtml(payload.subject)}»</em> قد وصلت إلى مكتب الدعم والتحرير بنجاح.</p>
      <p>يقوم فريقنا بمراجعة الرسائل بعناية والرد عليها في أقرب وقت (خلال 24 ساعة كحد أقصى في أيام العمل).</p>
      
      <div class="channels">
        <strong style="color: #0f172a;">قنوات المساعدة المباشرة:</strong>
        <ul>
          <li>دعم العملاء: <a href="mailto:support@aqurivo.store" style="color: #059669;">support@aqurivo.store</a></li>
          <li>التواصل العام: <a href="mailto:contact@aqurivo.store" style="color: #059669;">contact@aqurivo.store</a></li>
          <li>الشؤون القانونية: <a href="mailto:legal@aqurivo.store" style="color: #059669;">legal@aqurivo.store</a></li>
          <li>الخصوصية وحماية البيانات: <a href="mailto:privacy@aqurivo.store" style="color: #059669;">privacy@aqurivo.store</a></li>
        </ul>
        <div style="text-align: center; margin-top: 12px;">
          <a href="https://wa.me/212684063908" class="whatsapp-badge">تواصل معنا عبر واتساب: +212 684 063908</a>
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        هذه رسالة تأكيد آلية، لا حاجة للرد على هذا البريد إلا إذا رغبت في إضافة تفاصيل إضافية.
      </p>
    </div>
    <div class="footer">
      © 2026 AQURIVO — جميع الحقوق محفوظة | https://aqurivo.store
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: payload.senderEmail,
      subject: `[AQURIVO] تم استلام استفسارك: ${payload.subject}`,
      text: `مرحباً ${payload.senderName}،\n\nنشكرك على تواصلك مع AQURIVO. لقد استلمنا رسالتك بنجاح وسنقوم بالرد عليك في أقرب وقت.\n\nواتساب الدعم المباشر: https://wa.me/212684063908 (+212 684 063908)\nالبريد: support@aqurivo.store\n\nفريق AQURIVO`,
      html,
    });

    return { sent: true, messageId: info.messageId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AQURIVO Mailer] Auto-reply warning:', msg);
    return { sent: false, reason: msg };
  }
}

export interface AdminPurgeEmailPayload {
  adminEmail: string;
  verificationCode: string;
  confirmationUrl: string;
  productsCount: number;
  requestIp?: string;
  expiresInMinutes?: number;
}

export async function sendAdminPurgeVerificationEmail(
  payload: AdminPurgeEmailPayload
): Promise<SendMailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    return {
      sent: false,
      reason: 'SMTP is not configured in environment variables (SMTP_USER, SMTP_APP_PASSWORD).',
    };
  }

  const fromUser = (
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    'aqurivo@gmail.com'
  ).trim();
  const fromName = 'AQURIVO Security Operations';
  const recipient = (payload.adminEmail || 'aqurivo@gmail.com').trim();
  const dateStr = new Date().toISOString();
  const count = payload.productsCount;
  const expiry = payload.expiresInMinutes || 15;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #1e293b; margin: 0; padding: 24px; direction: rtl; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
    .header { background: #991b1b; color: #ffffff; padding: 32px 28px; text-align: center; }
    .alert-badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-weight: 700; font-size: 13px; padding: 5px 14px; border-radius: 9999px; margin-bottom: 12px; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 14px; color: #fecaca; }
    .body { padding: 32px; font-size: 15px; line-height: 1.7; color: #334155; }
    .warn-box { background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; color: #991b1b; }
    .warn-box strong { display: block; font-size: 16px; margin-bottom: 6px; }
    .code-box { background: #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; color: #ffffff; }
    .code-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px; }
    .code-digits { font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #f87171; text-shadow: 0 2px 8px rgba(248,113,113,0.3); }
    .cta-button { display: block; background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 16px 28px; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center; margin: 24px 0 16px 0; box-shadow: 0 4px 14px rgba(220,38,38,0.35); }
    .info-list { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #64748b; }
    .info-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="alert-badge">⚠️ إشعار أمني حساس وحصري للإدارة</div>
      <h1>طلب تأكيد: حذف جميع المنتجات نهائياً</h1>
      <p>منصة AQURIVO — تأكيد عمليات الإدارة المعتمدة</p>
    </div>
    <div class="body">
      <div class="warn-box">
        <strong>تنبيه هام جداً:</strong>
        تم تقديم طلب من لوحة التحكم لإفراغ الكتالوج وحذف <strong>جميع المنتجات (${count} منتج)</strong> بشكل دائم لا رجعة فيه.
      </div>

      <p>لتأكيد هذا الإجراء واستكمال حذف جميع المنتجات، يمكنك إما إدخال رمز التحقق أدناه في لوحة التحكم، أو الضغط مباشرة على زر التأكيد:</p>

      <div class="code-box">
        <div class="code-title">رمز التحقق السري (OTP)</div>
        <div class="code-digits">${payload.verificationCode}</div>
      </div>

      <a href="${payload.confirmationUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
        اضغط هنا لتأكيد الحذف النهائي لجميع المنتجات
      </a>

      <div class="info-list">
        <div class="info-row"><span>عدد المنتجات المستهدفة:</span> <strong>${count} منتج</strong></div>
        <div class="info-row"><span>تاريخ الطلب:</span> <strong>${dateStr}</strong></div>
        <div class="info-row"><span>صلاحية الرمز والرابط:</span> <strong>${expiry} دقيقة فقط</strong></div>
        <div class="info-row"><span>البريد المعتمد:</span> <strong>${recipient}</strong></div>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #94a3b8; text-align: center;">
        إذا لم تكن أنت من طلب هذا الإجراء، فيرجى تجاهل هذه الرسالة فوراً. لن يتم حذف أي عنصر بدون هذا التأكيد.
      </p>
    </div>
    <div class="footer">
      AQURIVO Operations — Security Center | https://aqurivo.store
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: recipient,
      subject: `⚠️ [تأكيد أمني] طلب حذف جميع المنتجات نهائياً (${count} منتج) — AQURIVO`,
      text: `تنبيه أمني من منصة AQURIVO:\n\nتم تقديم طلب لحذف جميع المنتجات (${count} منتج) نهائياً من المتجر.\n\nرمز التأكيد السري الخاص بك هو: ${payload.verificationCode}\n\nرابط التأكيد المباشر:\n${payload.confirmationUrl}\n\nصلاحية الرمز: ${expiry} دقيقة.\nإذا لم تكن أنت من طلب ذلك، تجاهل هذا البريد تماماً.`,
      html,
    });

    return { sent: true, messageId: info.messageId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AQURIVO Mailer] Error sending purge verification email:', msg);
    return { sent: false, reason: msg };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
