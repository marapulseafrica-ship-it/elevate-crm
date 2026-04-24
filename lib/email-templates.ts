const PRIMARY = "#f97316";
const DARK = "#1e293b";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG = "#f8fafc";

function base(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elevate CRM</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="background:${DARK};border-radius:12px 12px 0 0;padding:20px 32px;">
          <span style="color:${PRIMARY};font-size:22px;font-weight:800;letter-spacing:-0.5px;">⚡ Elevate CRM</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${BG};border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${MUTED};">
            Elevate CRM &nbsp;·&nbsp;
            <a href="{{settingsUrl}}" style="color:${MUTED};text-decoration:underline;">Manage preferences</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function stat(label: string, value: string | number) {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:${MUTED};">${label}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:600;color:${DARK};text-align:right;">${value}</td>
  </tr>`;
}

function btn(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:${PRIMARY};color:#fff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">${text} →</a>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;">`;
}

// ─── Template 1: Check-in notification ───────────────────────────────────────
export function checkinEmail(opts: {
  restaurantName: string;
  customerName: string;
  visitNumber: number;
  isNew: boolean;
  time: string;
  dashboardUrl: string;
  settingsUrl: string;
}) {
  const badge = opts.isNew
    ? `<span style="background:#dcfce7;color:#16a34a;font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;">New Customer 🎉</span>`
    : `<span style="background:#fff7ed;color:${PRIMARY};font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;">Returning Customer 👋</span>`;

  const content = `
    <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;">Check-in Alert</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:${DARK};">A customer just checked in</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:8px;padding:16px 20px;margin-bottom:8px;">
      ${stat("Restaurant", opts.restaurantName)}
      ${stat("Customer", opts.customerName)}
      ${stat("Visit number", `#${opts.visitNumber}`)}
      ${stat("Time", opts.time)}
      ${stat("Status", "")}
    </table>
    <p style="margin:4px 0 0;font-size:13px;">${badge}</p>
    ${btn("View Customer Profile", opts.dashboardUrl)}
  `.replace("{{settingsUrl}}", opts.settingsUrl);

  return base(content).replace("{{settingsUrl}}", opts.settingsUrl);
}

// ─── Template 2: Customer milestone ──────────────────────────────────────────
export function customerMilestoneEmail(opts: {
  restaurantName: string;
  totalCustomers: number;
  newThisMonth: number;
  loyalCustomers: number;
  nextMilestone: number;
  dashboardUrl: string;
  settingsUrl: string;
}) {
  const content = `
    <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;">Milestone Reached</p>
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${DARK};">Congratulations! 🎉</h1>
    <p style="margin:0 0 24px;font-size:16px;color:${MUTED};">
      <strong style="color:${DARK};">${opts.restaurantName}</strong> has officially reached
      <strong style="color:${PRIMARY};">${opts.totalCustomers} registered customers.</strong>
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6;">
      That's ${opts.totalCustomers} real people who chose your restaurant and agreed to hear from you.
      That's not a small thing — that's a community you've built.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:8px;padding:16px 20px;margin-bottom:8px;">
      ${stat("Total customers", opts.totalCustomers)}
      ${stat("New this month", opts.newThisMonth)}
      ${stat("Loyal (5+ visits)", opts.loyalCustomers)}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">Your next milestone: <strong style="color:${DARK};">${opts.nextMilestone} customers</strong></p>
    ${btn("View Your Customers", opts.dashboardUrl)}
    ${divider()}
    <p style="margin:0;font-size:13px;color:${MUTED};">Keep doing what you're doing. — <strong>The Elevate CRM Team</strong></p>
  `;
  return base(content).replace(/\{\{settingsUrl\}\}/g, opts.settingsUrl);
}

// ─── Template 3: Daily visit milestone ───────────────────────────────────────
export function visitMilestoneEmail(opts: {
  restaurantName: string;
  returnVisits: number;
  newCheckins: number;
  totalVisits: number;
  dashboardUrl: string;
  settingsUrl: string;
}) {
  const content = `
    <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;">Visit Milestone</p>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${DARK};">Your regulars showed up. Big time. 🔥</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${MUTED};line-height:1.6;">
      <strong style="color:${DARK};">${opts.restaurantName}</strong> recorded
      <strong style="color:${PRIMARY};">${opts.returnVisits} return visits today</strong> —
      ${opts.returnVisits} customers who chose you again.
      That's not luck. That's loyalty you've built.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:8px;padding:16px 20px;">
      ${stat("Return visits today", opts.returnVisits)}
      ${stat("New check-ins today", opts.newCheckins)}
      ${stat("Total visits today", opts.totalVisits)}
    </table>
    ${btn("See Today's Activity", opts.dashboardUrl)}
    ${divider()}
    <p style="margin:0;font-size:13px;color:${MUTED};">Keep delivering great experiences — your customers are clearly coming back for a reason. — <strong>The Elevate CRM Team</strong></p>
  `;
  return base(content).replace(/\{\{settingsUrl\}\}/g, opts.settingsUrl);
}

// ─── Template 4: Campaign completed ──────────────────────────────────────────
export function campaignCompletedEmail(opts: {
  restaurantName: string;
  campaignName: string;
  audienceSegment: string;
  sentCount: number;
  deliveredCount: number;
  completedAt: string;
  dashboardUrl: string;
  settingsUrl: string;
}) {
  const deliveryRate = opts.sentCount > 0
    ? Math.round((opts.deliveredCount / opts.sentCount) * 100)
    : 0;

  const content = `
    <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;">Campaign Delivered</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:${DARK};">Your campaign has been sent ✓</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:8px;padding:16px 20px;">
      ${stat("Campaign", opts.campaignName)}
      ${stat("Audience", opts.audienceSegment)}
      ${stat("Sent to", `${opts.sentCount} customers`)}
      ${stat("Delivered", `${opts.deliveredCount} messages`)}
      ${stat("Delivery rate", `${deliveryRate}%`)}
      ${stat("Completed at", opts.completedAt)}
    </table>
    ${btn("View Campaign Details", opts.dashboardUrl)}
    ${divider()}
    <p style="margin:0;font-size:13px;color:${MUTED};">Want to follow up? Consider sending a loyalty reward to keep the momentum going. — <strong>The Elevate CRM Team</strong></p>
  `;
  return base(content).replace(/\{\{settingsUrl\}\}/g, opts.settingsUrl);
}

// ─── Template 5: Weekly report ────────────────────────────────────────────────
export function weeklyReportEmail(opts: {
  restaurantName: string;
  weekRange: string;
  newCustomers: number;
  returnVisits: number;
  campaignsSent: number;
  messagesDelivered: number;
  inactiveCount: number;
  segNew: number;
  segReturning: number;
  segLoyal: number;
  segInactive: number;
  dashboardUrl: string;
  settingsUrl: string;
}) {
  const recommendations: string[] = [];
  if (opts.inactiveCount > 10)
    recommendations.push(`<li style="margin-bottom:8px;">${opts.inactiveCount} customers haven't returned in 30+ days. A <strong>win-back campaign</strong> could bring them in.</li>`);
  if (opts.newCustomers > 0)
    recommendations.push(`<li style="margin-bottom:8px;">Great week for new sign-ups! A <strong>welcome campaign</strong> keeps them coming back.</li>`);
  if (opts.campaignsSent === 0)
    recommendations.push(`<li style="margin-bottom:8px;">You haven't sent a campaign this week. Staying in touch keeps customers loyal.</li>`);

  const content = `
    <p style="margin:0 0 4px;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:0.05em;">Weekly Report</p>
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:${DARK};">${opts.restaurantName}</h1>
    <p style="margin:0 0 28px;font-size:14px;color:${MUTED};">${opts.weekRange}</p>

    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.08em;">This Week</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      ${stat("👥 New customers", opts.newCustomers)}
      ${stat("🔄 Return visits", opts.returnVisits)}
      ${stat("📱 Campaigns sent", opts.campaignsSent)}
      ${stat("💬 Messages delivered", opts.messagesDelivered)}
      ${stat("⚠️ Inactive (30d+)", opts.inactiveCount)}
    </table>

    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.08em;">Your Customer Base</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      ${stat("🟢 New (1 visit)", opts.segNew)}
      ${stat("🔵 Returning (2–4 visits)", opts.segReturning)}
      ${stat("⭐ Loyal (5+ visits)", opts.segLoyal)}
      ${stat("🟠 Inactive (30d+)", opts.segInactive)}
    </table>

    ${recommendations.length ? `
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.08em;">Recommended Actions</p>
    <ul style="margin:0 0 8px;padding-left:20px;font-size:14px;color:${MUTED};line-height:1.6;">
      ${recommendations.join("")}
    </ul>` : ""}

    ${btn("Open Your Dashboard", opts.dashboardUrl)}
    ${divider()}
    <p style="margin:0;font-size:13px;color:${MUTED};">See you next Monday. — <strong>The Elevate CRM Team</strong></p>
  `;
  return base(content).replace(/\{\{settingsUrl\}\}/g, opts.settingsUrl);
}
