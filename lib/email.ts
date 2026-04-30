import { Resend } from "resend";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "Elevate CRM <support@elevateaisolutionsagency.com>",
      to,
      subject,
      html,
    });
  } catch {
    // Never let email failure break the main flow
  }
}
