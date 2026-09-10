import { track } from "@vercel/analytics/server";

type AnalyticsValue = string | number | boolean | null;
type AnalyticsData = Record<string, AnalyticsValue>;

export async function safeTrack(eventName: string, data?: AnalyticsData) {
  try {
    await track(eventName, data);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] Failed to track event", eventName, error);
    }
  }
}
