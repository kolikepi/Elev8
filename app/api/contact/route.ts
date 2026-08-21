import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSiteSettings, getAdminNotificationEmail } from '@/lib/settings';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body ?? {};

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Save to database
    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        subject: subject ?? '',
        message,
      },
    });

    // Send email notification
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 30px;">
        <div style="border-bottom: 2px solid #32FF6A; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #32FF6A; margin: 0; font-size: 24px;">ELEV8</h1>
          <p style="color: #888; margin: 5px 0 0 0;">New Contact Form Submission</p>
        </div>
        <div style="background: #111; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong style="color: #32FF6A;">Name:</strong> ${name}</p>
          <p style="margin: 10px 0;"><strong style="color: #32FF6A;">Email:</strong> <a href="mailto:${email}" style="color: #fff;">${email}</a></p>
          ${subject ? `<p style="margin: 10px 0;"><strong style="color: #32FF6A;">Subject:</strong> ${subject}</p>` : ''}
          <p style="margin: 10px 0;"><strong style="color: #32FF6A;">Message:</strong></p>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 4px; border-left: 4px solid #32FF6A; color: #ccc;">
            ${message}
          </div>
        </div>
        <p style="color: #666; font-size: 12px;">
          Submitted at: ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    const settings = await getSiteSettings();
    const appName = settings.businessName || 'ELEV8';
    const recipient = await getAdminNotificationEmail();

    // Only attempt to send if an internal notification email is configured.
    // The submission is always saved above regardless of email delivery.
    if (recipient) {
      await sendEmail({
        to: recipient,
        subject: `New Contact Form Submission from ${name}`,
        html: htmlBody,
        fromName: appName,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!',
      id: submission.id,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}
