/**
 * SkillFarm Email Service
 *
 * Sends real verification and password reset emails to users' inboxes using:
 * 1. SMTP / Gmail / Custom Mail provider (via nodemailer)
 * 2. Resend API (via RESEND_API_KEY)
 *
 * Ultra-lightweight template (<3KB) ensuring zero clipping in Gmail/Outlook.
 */

import nodemailer from "nodemailer";
import { EMAIL_CONFIG, siteConfig } from "@/config";

type SendEmailOptions = {
  to: string;
  subject: string;
  actionUrl: string;
  actionText: string;
  previewText: string;
  type: "verification" | "password_reset";
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.EMAIL_SERVER_PORT || process.env.SMTP_PORT || "587", 10);
  const user = process.env.EMAIL_SERVER_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
    return cachedTransporter;
  }

  // Also support standard GMAIL_USER + GMAIL_APP_PASSWORD convenience
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
    return cachedTransporter;
  }

  return null;
}

function generateEmailHtml(options: {
  subject: string;
  previewText: string;
  actionUrl: string;
  actionText: string;
}): string {
  const { subject, previewText, actionUrl, actionText } = options;
  const logoUrl = siteConfig.logoUrl;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0B0F17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8F8FA;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0F17; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #171A23; border: 1px solid #252A3A; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <!-- Header with Logo & Brand -->
                <tr>
                  <td align="center" style="padding: 32px 24px 18px 24px; border-bottom: 1px solid #252A3A;">
                    <img
                      src="${logoUrl}"
                      alt="SkillFarm"
                      width="48"
                      height="48"
                      style="display: block; margin: 0 auto 10px auto; width: 48px; height: 48px; border-radius: 12px; border: 0;"
                    />
                    <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">
                      <span style="color: #FFFFFF;">Skill</span><span style="color: #7C5CFC;">Farm</span>
                    </div>
                    <div style="font-size: 12px; color: #9CA3AF;">
                      Plant knowledge. Grow skills. Ship real things.
                    </div>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 28px 24px;">
                    <h2 style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin: 0 0 12px 0; text-align: center;">
                      ${subject}
                    </h2>
                    <p style="font-size: 13px; line-height: 1.6; color: #D1D5DB; margin: 0 0 24px 0; text-align: center;">
                      ${previewText}
                    </p>
                    <div style="text-align: center; margin: 8px 0;">
                      <a href="${actionUrl}" style="display: inline-block; background-color: #7C5CFC; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                        ${actionText}
                      </a>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 24px; background-color: #0F1117; border-top: 1px solid #252A3A; text-align: center; font-size: 11px; color: #6B7280; line-height: 1.5;">
                    Questions? Contact us at <a href="mailto:${siteConfig.supportEmail}" style="color: #7C5CFC; text-decoration: none;">${siteConfig.supportEmail}</a><br />
                    If you didn't make this request, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendAuthEmail(options: SendEmailOptions): Promise<{ success: boolean; delivered: boolean }> {
  const { to, subject, actionUrl, actionText, previewText, type } = options;

  const fromAddress = EMAIL_CONFIG.from;
  const htmlContent = generateEmailHtml({
    subject,
    previewText,
    actionUrl,
    actionText,
  });

  let delivered = false;

  // 1. Try sending via SMTP / Gmail Transporter
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: `${previewText}\n\n${actionText}: ${actionUrl}`,
        html: htmlContent,
      });
      delivered = true;
      console.log(`[email-service] ✅ Email delivered to ${to} via SMTP`);
      return { success: true, delivered: true };
    } catch (err) {
      console.error("[email-service] ❌ SMTP send failed:", err);
    }
  }

  // 2. Try sending via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes("your-resend-key")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html: htmlContent,
        }),
      });
      if (res.ok) {
        delivered = true;
        console.log(`[email-service] ✅ Email delivered to ${to} via Resend API`);
        return { success: true, delivered: true };
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("[email-service] ❌ Resend API error:", errorData);
      }
    } catch (err) {
      console.error("[email-service] ❌ Resend send failed:", err);
    }
  }

  // 3. Fallback: Log email details and setup instructions
  const divider = "═".repeat(64);
  console.log(`\n╔${divider}╗`);
  console.log(`║ 📧 SkillFarm Email Dispatch [Action: ${type.toUpperCase()}]`);
  console.log(`║ To:      ${to}`);
  console.log(`║ Subject: ${subject}`);
  console.log(`║ Button:  ${actionText} -> ${actionUrl}`);
  if (!delivered) {
    console.log(`║`);
    console.log(`║ ⚠️  NOTE: Real email delivery is waiting for SMTP or Resend credentials.`);
    console.log(`║ To send actual emails to users' real inboxes:`);
    console.log(`║ Add GMAIL_USER & GMAIL_APP_PASSWORD, or EMAIL_SERVER_HOST/PORT/USER/PASSWORD,`);
    console.log(`║ or RESEND_API_KEY to your .env.local file.`);
  }
  console.log(`╚${divider}╝\n`);

  return { success: true, delivered };
}
