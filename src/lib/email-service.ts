/**
 * SkillFarm Email Service
 *
 * Dispatches verification emails, password reset links, and notifications.
 * Works seamlessly both in production (with configured email provider) and
 * in development (with structured logging & direct verification flows).
 */

const IS_DEV = process.env.NODE_ENV !== "production";

type SendEmailOptions = {
  to: string;
  subject: string;
  actionUrl: string;
  actionText: string;
  previewText: string;
  type: "verification" | "password_reset";
};

export async function sendAuthEmail(options: SendEmailOptions): Promise<{ success: boolean; url: string }> {
  const { to, subject, actionUrl, actionText, previewText, type } = options;

  // In development & preview environments, log a clean developer banner
  if (IS_DEV) {
    const divider = "─".repeat(60);
    console.log(`\n┌${divider}┐`);
    console.log(`│ 📧 SkillFarm Email Dispatch (${type.toUpperCase()})`);
    console.log(`│ To:       ${to}`);
    console.log(`│ Subject:  ${subject}`);
    console.log(`│ Link:     ${actionUrl}`);
    console.log(`└${divider}┘\n`);
  }

  // If a custom email provider webhook / SMTP / Resend is configured, dispatch here
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes("your-resend-key")) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SkillFarm <auth@skillfarm.ai>",
          to: [to],
          subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0F17; color: #F8F8FA; padding: 40px 20px;">
              <div style="max-width: 480px; margin: 0 auto; background-color: #171A23; border: 1px solid #252A3A; border-radius: 16px; padding: 32px; text-align: center;">
                <h1 style="color: #FFFFFF; font-size: 24px; margin-bottom: 8px;">SkillFarm</h1>
                <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 24px;">Plant knowledge. Grow skills. Ship real things.</p>
                <p style="color: #F8F8FA; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${previewText}</p>
                <a href="${actionUrl}" style="display: inline-block; background-color: #7C5CFC; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                  ${actionText}
                </a>
                <p style="color: #6B7280; font-size: 12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error("[email-service] Failed to send email via Resend API:", err);
    }
  }

  return { success: true, url: actionUrl };
}
