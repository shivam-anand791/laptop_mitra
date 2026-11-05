export interface PasswordResetEmailContent {
  recipientName: string;
  resetUrl: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
}

export interface PasswordResetConfirmationContent {
  recipientName: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

export function buildPasswordResetEmail(content: PasswordResetEmailContent): {
  subject: string;
  text: string;
  html: string;
} {
  const name = escapeHtml(content.recipientName);
  const url = escapeHtml(content.resetUrl);
  const logo = escapeHtml(content.logoUrl);
  const supportEmail = escapeHtml(content.supportEmail);
  const supportPhone = escapeHtml(content.supportPhone);

  return {
    subject: 'Reset your Laptop Mitra password',
    text: [
      `Hello ${content.recipientName},`,
      '',
      'We received a request to reset the password for your Laptop Mitra account.',
      'Open this link to choose a new password:',
      content.resetUrl,
      '',
      'This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email; your account remains secure.',
      'Never share this link or your account credentials with anyone.',
      '',
      `Need help? Contact ${content.supportEmail} or ${content.supportPhone}.`,
      'Laptop Mitra Support',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10234a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e9f2;border-radius:16px;overflow:hidden;">
        <tr><td align="center" style="padding:30px 24px 18px;">
          <img src="${logo}" alt="Laptop Mitra" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:8px 32px 32px;">
          <h1 style="margin:0 0 18px;text-align:center;font-size:24px;line-height:1.3;color:#0b1f4b;">Reset your password</h1>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hello ${name},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">We received a request to reset your password. Click the button below to choose a new password. For security, this link expires in 1 hour.</p>
          <p style="margin:0 0 28px;text-align:center;">
            <a href="${url}" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#1d6ff2;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Set New Password</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 22px;word-break:break-all;font-size:12px;line-height:1.6;"><a href="${url}" style="color:#1d6ff2;">${url}</a></p>
          <p style="margin:0;padding:14px 16px;border-radius:8px;background:#fff8e7;color:#76501b;font-size:12px;line-height:1.6;">If you did not request this change, you can safely ignore this email. Laptop Mitra will never ask you for your password or one-time codes.</p>
        </td></tr>
        <tr><td style="padding:18px 24px;background:#f8fafc;text-align:center;font-size:12px;line-height:1.7;color:#64748b;">
          Need help? <a href="mailto:${supportEmail}" style="color:#1d6ff2;">${supportEmail}</a> · ${supportPhone}<br>Laptop Mitra Support
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

export function buildPasswordResetConfirmationEmail(content: PasswordResetConfirmationContent): {
  subject: string;
  text: string;
  html: string;
} {
  const name = escapeHtml(content.recipientName);
  const logo = escapeHtml(content.logoUrl);
  const supportEmail = escapeHtml(content.supportEmail);
  const supportPhone = escapeHtml(content.supportPhone);

  return {
    subject: 'Security Alert: Your Laptop Mitra password was changed',
    text: [
      `Hello ${content.recipientName},`,
      '',
      'The password for your Laptop Mitra account was recently updated.',
      'For your security, all active sessions on other devices have been automatically signed out.',
      '',
      'If you made this change, no further action is required.',
      'If you DID NOT make this change, please contact our support team immediately to secure your account.',
      '',
      `Support: ${content.supportEmail} or ${content.supportPhone}.`,
      'Laptop Mitra Security Team',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10234a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e9f2;border-radius:16px;overflow:hidden;">
        <tr><td align="center" style="padding:30px 24px 18px;">
          <img src="${logo}" alt="Laptop Mitra" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:8px 32px 32px;">
          <h1 style="margin:0 0 18px;text-align:center;font-size:22px;line-height:1.3;color:#0b1f4b;">Password changed successfully</h1>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hello ${name},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#475569;">The password for your Laptop Mitra account was recently updated. All existing sessions on your devices have been signed out for security.</p>
          <div style="margin:0 0 24px;padding:16px 20px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:14px;line-height:1.5;">
            ✓ Your new password is now active.
          </div>
          <p style="margin:0;padding:14px 16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12px;line-height:1.6;">If you did not perform this update, please contact our support team immediately to prevent unauthorized access.</p>
        </td></tr>
        <tr><td style="padding:18px 24px;background:#f8fafc;text-align:center;font-size:12px;line-height:1.7;color:#64748b;">
          Need help? <a href="mailto:${supportEmail}" style="color:#1d6ff2;">${supportEmail}</a> · ${supportPhone}<br>Laptop Mitra Security
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

