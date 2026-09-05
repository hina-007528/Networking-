import { brand, formatCurrency, formatDate } from '@stormfiber/config';
import { NotificationEvent } from '@stormfiber/types';

export interface RenderedNotification {
  subject: string;
  html: string;
  text: string;
  sms: string;
  inApp: { title: string; body: string; href: string | null };
}

/** Payload accepted by each template. Extra keys are ignored, missing keys fall back to sane copy. */
export interface TemplateData {
  firstName?: string;
  code?: string;
  expiryMinutes?: number;
  reference?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  dueDate?: string | Date;
  invoiceNumber?: string;
  ticketNumber?: string;
  ticketSubject?: string;
  ticketStatus?: string;
  resetUrl?: string;
  reason?: string;
  scheduledFor?: string | Date;
  href?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Wraps body copy in a table-based shell.
 *
 * Tables and inline styles are deliberate: they are the only layout primitives that render
 * consistently across Outlook, Gmail and mobile clients.
 */
function layout(heading: string, paragraphs: string[], cta?: { label: string; url: string }): string {
  const body = paragraphs.map((line) => `<p style="margin:0 0 16px;line-height:1.6">${line}</p>`).join('');
  const button = cta
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#f97316;color:#ffffff;font-weight:600;text-decoration:none">${escapeHtml(cta.label)}</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f172a;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700">${escapeHtml(brand.name)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(heading)}</h1>
${body}${button}
</td></tr>
<tr><td style="padding:20px 28px;background:#fafafa;font-size:12px;color:#71717a;line-height:1.6">
Need help? Call ${escapeHtml(brand.supportPhoneDisplay)} or email ${escapeHtml(brand.supportEmail)}.<br>
&copy; ${new Date().getFullYear()} ${escapeHtml(brand.legalName)}
</td></tr>
</table></td></tr></table></body></html>`;
}

const greeting = (firstName?: string): string => (firstName ? `Hi ${firstName},` : 'Hi,');
const money = (data: TemplateData): string =>
  formatCurrency(data.amount ?? 0, { currency: data.currency, withDecimals: true });

type Renderer = (data: TemplateData) => RenderedNotification;

const templates: Record<string, Renderer> = {
  [NotificationEvent.OTP_REQUESTED]: (data) => {
    const minutes = data.expiryMinutes ?? 5;
    const code = data.code ?? '------';
    return {
      subject: `${code} is your ${brand.name} verification code`,
      html: layout('Verify your number', [
        greeting(data.firstName),
        `Your verification code is <strong style="font-size:24px;letter-spacing:4px">${escapeHtml(code)}</strong>`,
        `The code expires in ${minutes} minutes. If you did not request it, you can ignore this message.`,
      ]),
      text: `Your ${brand.name} verification code is ${code}. It expires in ${minutes} minutes.`,
      sms: `${code} is your ${brand.name} verification code. Valid for ${minutes} minutes. Never share this code.`,
      inApp: { title: 'Verification code sent', body: `A code was sent, valid for ${minutes} minutes.`, href: null },
    };
  },

  [NotificationEvent.USER_REGISTERED]: (data) => ({
    subject: `Welcome to ${brand.name}`,
    html: layout('Your account is ready', [
      greeting(data.firstName),
      `Thanks for creating a ${brand.name} account. You can now check coverage, apply for a connection and manage billing from your dashboard.`,
    ], { label: 'Open dashboard', url: data.href ?? '/dashboard' }),
    text: `Welcome to ${brand.name}. Your account is ready — sign in to check coverage and manage your services.`,
    sms: `Welcome to ${brand.name}! Your account is ready.`,
    inApp: { title: 'Welcome to StormFiber', body: 'Your account is ready. Check coverage to get started.', href: '/dashboard' },
  }),

  [NotificationEvent.APPLICATION_SUBMITTED]: (data) => ({
    subject: `Application ${data.reference ?? ''} received`.trim(),
    html: layout('We have your application', [
      greeting(data.firstName),
      `Your application <strong>${escapeHtml(data.reference ?? '')}</strong>${data.planName ? ` for <strong>${escapeHtml(data.planName)}</strong>` : ''} has been received.`,
      'Our team will verify serviceability at your address and contact you to schedule installation.',
    ], { label: 'Track application', url: data.href ?? '/dashboard/applications' }),
    text: `Your ${brand.name} application ${data.reference ?? ''} has been received. We will contact you to schedule installation.`,
    sms: `${brand.name}: application ${data.reference ?? ''} received. We will call you to arrange installation.`,
    inApp: {
      title: 'Application received',
      body: `Application ${data.reference ?? ''} is being reviewed.`,
      href: '/dashboard/applications',
    },
  }),

  [NotificationEvent.APPLICATION_APPROVED]: (data) => ({
    subject: `Application ${data.reference ?? ''} approved`.trim(),
    html: layout('Your application is approved', [
      greeting(data.firstName),
      `Good news — application <strong>${escapeHtml(data.reference ?? '')}</strong> has been approved.`,
      data.scheduledFor
        ? `Installation is scheduled for <strong>${escapeHtml(formatDate(data.scheduledFor, 'long'))}</strong>.`
        : 'Our installation team will call you to confirm a slot.',
    ], { label: 'View application', url: data.href ?? '/dashboard/applications' }),
    text: `Your ${brand.name} application ${data.reference ?? ''} is approved.`,
    sms: `${brand.name}: application ${data.reference ?? ''} approved. Our team will confirm your installation slot.`,
    inApp: {
      title: 'Application approved',
      body: 'Installation will be scheduled shortly.',
      href: '/dashboard/applications',
    },
  }),

  [NotificationEvent.APPLICATION_REJECTED]: (data) => ({
    subject: `Update on application ${data.reference ?? ''}`.trim(),
    html: layout('We could not proceed', [
      greeting(data.firstName),
      `Unfortunately we cannot proceed with application <strong>${escapeHtml(data.reference ?? '')}</strong>.`,
      data.reason ? escapeHtml(data.reason) : 'Your address is outside our current serviceable footprint.',
      'We will let you know as soon as coverage expands to your area.',
    ]),
    text: `We could not proceed with your ${brand.name} application ${data.reference ?? ''}. ${data.reason ?? ''}`,
    sms: `${brand.name}: we could not proceed with application ${data.reference ?? ''}. Our team will be in touch.`,
    inApp: {
      title: 'Application update',
      body: data.reason ?? 'We could not proceed with your application.',
      href: '/dashboard/applications',
    },
  }),

  [NotificationEvent.INVOICE_GENERATED]: (data) => ({
    subject: `Invoice ${data.invoiceNumber ?? ''} — ${money(data)} due`,
    html: layout('Your monthly invoice is ready', [
      greeting(data.firstName),
      `Invoice <strong>${escapeHtml(data.invoiceNumber ?? '')}</strong> for <strong>${money(data)}</strong> is now available.`,
      `Payment is due by <strong>${escapeHtml(formatDate(data.dueDate, 'long'))}</strong>.`,
    ], { label: 'Pay now', url: data.href ?? '/dashboard/invoices' }),
    text: `${brand.name} invoice ${data.invoiceNumber ?? ''} for ${money(data)} is due by ${formatDate(data.dueDate, 'long')}.`,
    sms: `${brand.name}: invoice ${data.invoiceNumber ?? ''} of ${money(data)} is due by ${formatDate(data.dueDate, 'short')}.`,
    inApp: {
      title: `Invoice ${data.invoiceNumber ?? ''} ready`,
      body: `${money(data)} due by ${formatDate(data.dueDate, 'medium')}.`,
      href: '/dashboard/invoices',
    },
  }),

  [NotificationEvent.INVOICE_OVERDUE]: (data) => ({
    subject: `Invoice ${data.invoiceNumber ?? ''} is overdue`,
    html: layout('Payment reminder', [
      greeting(data.firstName),
      `Invoice <strong>${escapeHtml(data.invoiceNumber ?? '')}</strong> for <strong>${money(data)}</strong> was due on ${escapeHtml(formatDate(data.dueDate, 'long'))} and is still unpaid.`,
      'Please settle the balance to avoid interruption to your service.',
    ], { label: 'Pay now', url: data.href ?? '/dashboard/invoices' }),
    text: `${brand.name} invoice ${data.invoiceNumber ?? ''} for ${money(data)} is overdue. Please pay to avoid interruption.`,
    sms: `${brand.name}: invoice ${data.invoiceNumber ?? ''} of ${money(data)} is overdue. Please pay to avoid suspension.`,
    inApp: {
      title: 'Invoice overdue',
      body: `${money(data)} is past its due date.`,
      href: '/dashboard/invoices',
    },
  }),

  [NotificationEvent.PAYMENT_SUCCESS]: (data) => ({
    subject: `Payment received — ${money(data)}`,
    html: layout('Thank you for your payment', [
      greeting(data.firstName),
      `We have received <strong>${money(data)}</strong>${data.reference ? ` against reference <strong>${escapeHtml(data.reference)}</strong>` : ''}.`,
      data.invoiceNumber ? `Invoice ${escapeHtml(data.invoiceNumber)} has been updated.` : 'Your account balance has been updated.',
    ], { label: 'View payments', url: data.href ?? '/dashboard/payments' }),
    text: `${brand.name} received your payment of ${money(data)}. Thank you.`,
    sms: `${brand.name}: payment of ${money(data)} received. Thank you.`,
    inApp: {
      title: 'Payment received',
      body: `${money(data)} has been credited to your account.`,
      href: '/dashboard/payments',
    },
  }),

  [NotificationEvent.PAYMENT_FAILED]: (data) => ({
    subject: 'We could not process your payment',
    html: layout('Payment unsuccessful', [
      greeting(data.firstName),
      `Your payment of <strong>${money(data)}</strong> could not be completed.`,
      data.reason ? escapeHtml(data.reason) : 'No amount has been charged. Please try again or use another method.',
    ], { label: 'Try again', url: data.href ?? '/dashboard/invoices' }),
    text: `${brand.name}: your payment of ${money(data)} was not completed. ${data.reason ?? ''}`,
    sms: `${brand.name}: payment of ${money(data)} failed. No amount was charged.`,
    inApp: {
      title: 'Payment failed',
      body: data.reason ?? 'The payment was not completed. No amount was charged.',
      href: '/dashboard/invoices',
    },
  }),

  [NotificationEvent.TICKET_CREATED]: (data) => ({
    subject: `Ticket ${data.ticketNumber ?? ''} created`,
    html: layout('We are on it', [
      greeting(data.firstName),
      `Ticket <strong>${escapeHtml(data.ticketNumber ?? '')}</strong>${data.ticketSubject ? ` — ${escapeHtml(data.ticketSubject)}` : ''} has been logged.`,
      'Our support team will respond shortly. You can add details or attachments any time from your dashboard.',
    ], { label: 'View ticket', url: data.href ?? '/dashboard/support' }),
    text: `${brand.name} ticket ${data.ticketNumber ?? ''} has been created. Our team will respond shortly.`,
    sms: `${brand.name}: ticket ${data.ticketNumber ?? ''} logged. Our team will contact you shortly.`,
    inApp: {
      title: `Ticket ${data.ticketNumber ?? ''} created`,
      body: data.ticketSubject ?? 'Our support team will respond shortly.',
      href: '/dashboard/support',
    },
  }),

  [NotificationEvent.TICKET_UPDATED]: (data) => ({
    subject: `Update on ticket ${data.ticketNumber ?? ''}`,
    html: layout('Your ticket has an update', [
      greeting(data.firstName),
      `Ticket <strong>${escapeHtml(data.ticketNumber ?? '')}</strong> is now <strong>${escapeHtml(data.ticketStatus ?? 'updated')}</strong>.`,
    ], { label: 'Read the reply', url: data.href ?? '/dashboard/support' }),
    text: `${brand.name} ticket ${data.ticketNumber ?? ''} is now ${data.ticketStatus ?? 'updated'}.`,
    sms: `${brand.name}: ticket ${data.ticketNumber ?? ''} updated (${data.ticketStatus ?? 'updated'}).`,
    inApp: {
      title: `Ticket ${data.ticketNumber ?? ''} updated`,
      body: `Status is now ${data.ticketStatus ?? 'updated'}.`,
      href: '/dashboard/support',
    },
  }),

  [NotificationEvent.TICKET_RESOLVED]: (data) => ({
    subject: `Ticket ${data.ticketNumber ?? ''} resolved`,
    html: layout('Your ticket is resolved', [
      greeting(data.firstName),
      `Ticket <strong>${escapeHtml(data.ticketNumber ?? '')}</strong> has been marked resolved.`,
      'If the problem persists, reopen the ticket and we will pick it straight back up.',
    ], { label: 'View ticket', url: data.href ?? '/dashboard/support' }),
    text: `${brand.name} ticket ${data.ticketNumber ?? ''} has been resolved.`,
    sms: `${brand.name}: ticket ${data.ticketNumber ?? ''} resolved. Reply if you still need help.`,
    inApp: {
      title: `Ticket ${data.ticketNumber ?? ''} resolved`,
      body: 'Reopen the ticket if the problem persists.',
      href: '/dashboard/support',
    },
  }),

  [NotificationEvent.PASSWORD_RESET_REQUESTED]: (data) => ({
    subject: `Reset your ${brand.name} password`,
    html: layout('Reset your password', [
      greeting(data.firstName),
      'Use the button below to choose a new password. The link expires in 60 minutes and can be used once.',
      'If you did not request this, no action is needed — your current password still works.',
    ], { label: 'Reset password', url: data.resetUrl ?? '/reset-password' }),
    text: `Reset your ${brand.name} password: ${data.resetUrl ?? ''} (expires in 60 minutes)`,
    sms: `${brand.name}: a password reset was requested. If this was not you, ignore this message.`,
    inApp: {
      title: 'Password reset requested',
      body: 'A reset link was sent to your email address.',
      href: null,
    },
  }),

  [NotificationEvent.ACCOUNT_INVITED]: (data) => ({
    subject: `Set up your ${brand.name} account`,
    html: layout('Your account is ready to activate', [
      greeting(data.firstName),
      `Your application${data.reference ? ` <strong>${escapeHtml(data.reference)}</strong>` : ''} has been approved and we have created your ${brand.name} account.`,
      'Choose a password to sign in, track your installation and manage billing. The link below is valid for 7 days.',
    ], { label: 'Choose a password', url: data.resetUrl ?? '/reset-password' }),
    text: `Your ${brand.name} account is ready. Choose a password to sign in: ${data.resetUrl ?? ''}`,
    sms: `${brand.name}: your application is approved and your account is ready. Check your email to set a password.`,
    inApp: {
      title: 'Account created',
      body: 'Set a password to finish activating your account.',
      href: null,
    },
  }),

  [NotificationEvent.SUBSCRIPTION_CHANGED]: (data) => ({
    subject: 'Your subscription has changed',
    html: layout('Subscription updated', [
      greeting(data.firstName),
      `Your subscription${data.planName ? ` is now on <strong>${escapeHtml(data.planName)}</strong>` : ' has been updated'}.`,
      data.scheduledFor
        ? `The change takes effect on <strong>${escapeHtml(formatDate(data.scheduledFor, 'long'))}</strong>.`
        : 'The change is effective immediately.',
    ], { label: 'View subscription', url: data.href ?? '/dashboard/subscription' }),
    text: `Your ${brand.name} subscription has been updated${data.planName ? ` to ${data.planName}` : ''}.`,
    sms: `${brand.name}: your subscription has been updated${data.planName ? ` to ${data.planName}` : ''}.`,
    inApp: {
      title: 'Subscription updated',
      body: data.planName ? `You are now on ${data.planName}.` : 'Your subscription has been updated.',
      href: '/dashboard/subscription',
    },
  }),
};

const fallback: Renderer = (data) => ({
  subject: `Update from ${brand.name}`,
  html: layout('Account update', [greeting(data.firstName), 'There is an update on your account.']),
  text: `There is an update on your ${brand.name} account.`,
  sms: `${brand.name}: there is an update on your account.`,
  inApp: { title: 'Account update', body: 'There is an update on your account.', href: data.href ?? null },
});

export function renderNotification(event: string, data: TemplateData = {}): RenderedNotification {
  return (templates[event] ?? fallback)(data);
}

export function hasTemplate(event: string): boolean {
  return event in templates;
}
