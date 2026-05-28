const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Convert UI date (dd/mm/yyyy) or API date (yyyy-mm-dd) to canonical yyyy-mm-dd.
 */
export function parseDobToApiFormat(displayOrApi: string): string | undefined {
  const trimmed = displayOrApi.trim();
  if (!trimmed) return undefined;

  const isoMatch = trimmed.match(YYYY_MM_DD);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidDateParts(year, month, day)) return undefined;
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parts = trimmed.split("/");
  if (parts.length !== 3) return undefined;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!isValidDateParts(year, month, day)) return undefined;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Display profile/API yyyy-mm-dd as dd/mm/yyyy in forms. */
export function formatDobForDisplay(apiDob: string): string {
  const parts = apiDob.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return apiDob;
}
