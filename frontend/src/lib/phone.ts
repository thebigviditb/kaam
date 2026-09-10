/** US phone helpers. Values are stored in E.164 (+1XXXXXXXXXX). */

/** Strip everything but digits; drop a leading country code 1 if 11 digits. */
export function phoneDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.slice(0, 10);
}

export function isValidUSPhone(digits: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
}

export function toE164(digits: string): string {
  return `+1${digits}`;
}

/** "(408) 555-0100" style display formatting for a partial or full digit string. */
export function formatUSPhone(digits: string): string {
  const d = phoneDigits(digits);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Pretty-print a stored E.164 number for display; falls back to the raw value. */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const d = e164.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `+1 ${formatUSPhone(d.slice(1))}`;
  return e164;
}

export function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
