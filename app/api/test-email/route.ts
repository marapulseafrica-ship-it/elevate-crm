import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? "elevatealsolutionsagency@gmail.com";

  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "Elevate CRM <support@elevateaisolutionsagency.com>",
    to: adminEmail,
    subject: "Test email from Elevate CRM",
    html: "<p>This is a test email. If you receive this, email notifications are working correctly.</p>",
  });

  if (error) {
    return NextResponse.json({ error, adminEmail, apiKeySet: true });
  }

  return NextResponse.json({ success: true, emailId: data?.id, sentTo: adminEmail });
}
