export interface OtpEmailContent {
  recipientName: string;
  otpCode: string;
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

export function buildOtpVerificationEmail(content: OtpEmailContent): {
  subject: string;
  text: string;
  html: string;
} {
  const name = escapeHtml(content.recipientName);
  const code = escapeHtml(content.otpCode);
  const logo = escapeHtml(content.logoUrl);
  const supportEmail = escapeHtml(content.supportEmail);
  const supportPhone = escapeHtml(content.supportPhone);

  return {
    subject: `Your Laptop Mitra verification code: ${content.otpCode}`,
    text: [
      `Hello ${content.recipientName},`,
      '',
      `Your 6-digit verification code is: ${content.otpCode}`,
      '',
      'This code is valid for 10 minutes. Enter it on the verification screen to confirm your email address.',
      '',
      'SECURITY WARNING: Never share this code with anyone. Laptop Mitra staff will never ask for your verification code.',
      '',
      `Need help? Contact ${content.supportEmail} or ${content.supportPhone}.`,
      'Laptop Mitra Security',
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
        <tr><td style="padding:8px 32px 32px;text-align:center;">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0b1f4b;">Your Verification Code</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Hello ${name}, use the one-time code below to verify your email address:</p>
          <div style="margin:0 auto 24px;max-width:320px;background:#f8fafc;border:2px dashed #1d6ff2;border-radius:12px;padding:18px 24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#0b1f4b;font-family:monospace;">${code}</span>
          </div>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;">⏱️ This code expires in <strong>10 minutes</strong> and can only be used once.</p>
          <div style="margin:0;padding:14px 16px;border-radius:8px;background:#fff8e7;border:1px solid #fed7aa;color:#76501b;font-size:12px;line-height:1.6;text-align:left;">
            🔒 <strong>Security Notice:</strong> Never share this code with anyone. Laptop Mitra representatives will never ask you for your one-time code over phone or email.
          </div>
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

export function buildOtpPasswordResetEmail(content: OtpEmailContent): {
  subject: string;
  text: string;
  html: string;
} {
  const name = escapeHtml(content.recipientName);
  const code = escapeHtml(content.otpCode);
  const logo = escapeHtml(content.logoUrl);
  const supportEmail = escapeHtml(content.supportEmail);
  const supportPhone = escapeHtml(content.supportPhone);

  return {
    subject: `Your Laptop Mitra password reset code: ${content.otpCode}`,
    text: [
      `Hello ${content.recipientName},`,
      '',
      'We received a request to reset your Laptop Mitra account password.',
      `Your 6-digit password reset code is: ${content.otpCode}`,
      '',
      'This code is valid for 10 minutes. Enter it on the reset screen to proceed with setting a new password.',
      '',
      'If you did not request a password reset, ignore this email. Your account remains secure.',
      'Never share this code with anyone.',
      '',
      `Need help? Contact ${content.supportEmail} or ${content.supportPhone}.`,
      'Laptop Mitra Security',
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
        <tr><td style="padding:8px 32px 32px;text-align:center;">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0b1f4b;">Password Reset Code</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Hello ${name}, use the one-time code below to reset your password:</p>
          <div style="margin:0 auto 24px;max-width:320px;background:#f8fafc;border:2px dashed #1d6ff2;border-radius:12px;padding:18px 24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#0b1f4b;font-family:monospace;">${code}</span>
          </div>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;">⏱️ This code expires in <strong>10 minutes</strong> and is single-use.</p>
          <div style="margin:0;padding:14px 16px;border-radius:8px;background:#fff8e7;border:1px solid #fed7aa;color:#76501b;font-size:12px;line-height:1.6;text-align:left;">
            🔒 <strong>Security Warning:</strong> If you did not request a password reset, you can safely ignore this email. Laptop Mitra will never ask for your code.
          </div>
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

