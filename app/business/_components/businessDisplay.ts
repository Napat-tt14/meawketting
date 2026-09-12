const countFormatter = new Intl.NumberFormat("th-TH");
const dateFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatBusinessCount(value: number) {
  return countFormatter.format(value);
}

export function formatBusinessDate(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00Z`));
}
