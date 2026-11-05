export type MailErrorCode =
  | 'MAIL_NOT_CONFIGURED'
  | 'MAIL_DOMAIN_NOT_VERIFIED'
  | 'MAIL_RECIPIENT_NOT_ALLOWED'
  | 'MAIL_PROVIDER_UNAVAILABLE'
  | 'MAIL_RATE_LIMITED';

export type MailHealthStatus = 'ok' | 'not configured' | 'degraded';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  templateName?: string;
}

export interface MailSendResult {
  provider: 'resend' | 'smtp' | 'stdout';
  messageId?: string;
  success: boolean;
  error?: string;
  errorCode?: MailErrorCode;
  userMessage?: string;
}
