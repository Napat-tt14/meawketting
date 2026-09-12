/** Calendar dates use the Branch timezone; persistence timestamps remain UTC. */
export function dateInZone(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function addDays(date: string, days: number) { return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
export function utcDayStart(date: string, timezone: string) {
  const target = Date.parse(`${date}T00:00:00Z`); let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(candidate)), get = (type: string) => parts.find((p) => p.type === type)!.value;
    const local = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`), adjustment = target - local;
    if (adjustment === 0) break; candidate += adjustment;
  }
  return new Date(candidate).toISOString();
}
