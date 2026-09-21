const GAME_EVENT_TIME_ZONE = "America/Montevideo";

export function formatGameEventTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: GAME_EVENT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
