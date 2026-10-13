/** UK ISA allowance — tax year 2026/27 defaults (6 Apr 2026 – 5 Apr 2027). */

export const DEFAULT_ISA_ALLOWANCE = 20_000;

export const TAX_YEAR_2026_27 = {
  label: "2026/27",
  start: { y: 2026, m: 4, d: 6 },
  end: { y: 2027, m: 4, d: 5 },
};

/** @param {{ y: number, m: number, d: number }} parts — month 1–12 */
export function dateFromParts({ y, m, d }) {
  return new Date(y, m - 1, d);
}

/** @param {string} iso YYYY-MM-DD */
export function parseIsoDateLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return dateFromParts({ y, m, d });
}

/**
 * @param {Date} date
 * @param {{ start: { y,m,d }, end: { y,m,d } }} taxYear
 */
export function isDateInTaxYear(date, taxYear = TAX_YEAR_2026_27) {
  const start = dateFromParts(taxYear.start);
  const end = dateFromParts(taxYear.end);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

/**
 * @param {{ date: string, amount: number }[]} contributions
 * @param {{ allowance?: number, taxYear?: typeof TAX_YEAR_2026_27 }} [options]
 */
export function calculateIsaAllowance(contributions, options = {}) {
  const allowance = options.allowance ?? DEFAULT_ISA_ALLOWANCE;
  const taxYear = options.taxYear ?? TAX_YEAR_2026_27;

  let used = 0;
  const rows = contributions.map((c) => {
    const inCurrentTaxYear = isDateInTaxYear(parseIsoDateLocal(c.date), taxYear);
    if (inCurrentTaxYear) used += c.amount;
    return { ...c, inCurrentTaxYear };
  });

  const remaining = Math.max(0, allowance - used);
  const pctUsed = allowance > 0 ? (used / allowance) * 100 : 0;
  const overBy = Math.max(0, used - allowance);

  return { used, remaining, pctUsed, overBy, allowance, rows };
}
