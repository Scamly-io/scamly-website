const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;
const DD_MM_YYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

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
 * Canonical storage/API format: yyyy-mm-dd.
 * Accepts yyyy-mm-dd or legacy dd/mm/yyyy.
 */
export function normalizeDobToYyyyMmDd(
  value: string,
): { value: string } | { error: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: "dob must be a non-empty date" };
  }

  const isoMatch = trimmed.match(YYYY_MM_DD);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidDateParts(year, month, day)) {
      return { error: "dob is not a valid date" };
    }
    return { value: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` };
  }

  const slashMatch = trimmed.match(DD_MM_YYYY);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (!isValidDateParts(year, month, day)) {
      return { error: "dob is not a valid date" };
    }
    return { value: `${year}-${pad2(month)}-${pad2(day)}` };
  }

  return { error: "dob must be yyyy-mm-dd (or dd/mm/yyyy)" };
}

/** Meta user_data.db: YYYYMMDD (no separators). */
export function dobYyyyMmDdToMetaDb(yyyyMmDd: string): string {
  return yyyyMmDd.replace(/-/g, "");
}
