export function formatToIst(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const str = String(dateInput).trim();
  const date = str.endsWith("Z")
    ? new Date(str)
    : str.includes("T")
    ? new Date(`${str}Z`)
    : new Date(`${str.replace(" ", "T")}Z`);

  if (isNaN(date.getTime())) return str;

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }) + " IST";
}
