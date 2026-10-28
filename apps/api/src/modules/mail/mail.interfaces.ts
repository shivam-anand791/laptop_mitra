export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface MailSendResult {
  provider: 'resend' | 'smtp' | 'stdout';
  messageId?: string;
  success: boolean;
  error?: string;
}
