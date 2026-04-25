import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendCampaign } from "@/inngest/functions/send-campaign";
import { dailyAlerts } from "@/inngest/functions/daily-alerts";
import { weeklyReport } from "@/inngest/functions/weekly-report";
import { extractPromo } from "@/inngest/functions/extract-promo";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendCampaign, dailyAlerts, weeklyReport, extractPromo],
});
