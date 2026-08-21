import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.error(`Email not sent (RESEND_API_KEY missing): "${opts.subject}" to ${opts.to}`);
    return;
  }

  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const fromName = opts.fromName || 'ELEV8';

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    console.error('Resend email failed:', error);
  }
}
