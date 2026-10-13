import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateIsaAllowance,
  isDateInTaxYear,
  parseIsoDateLocal,
  TAX_YEAR_2026_27,
} from "../src/engine/isa-allowance.js";

test("tax year 2026/27 boundaries", () => {
  assert.equal(isDateInTaxYear(parseIsoDateLocal("2026-04-05"), TAX_YEAR_2026_27), false);
  assert.equal(isDateInTaxYear(parseIsoDateLocal("2026-04-06"), TAX_YEAR_2026_27), true);
  assert.equal(isDateInTaxYear(parseIsoDateLocal("2027-04-05"), TAX_YEAR_2026_27), true);
  assert.equal(isDateInTaxYear(parseIsoDateLocal("2027-04-06"), TAX_YEAR_2026_27), false);
});

test("acceptance: mixed contributions exclude prior-year 5 Apr 2026", () => {
  const r = calculateIsaAllowance([
    { date: "2026-04-06", amount: 5000 },
    { date: "2026-10-01", amount: 8000 },
    { date: "2026-04-05", amount: 3000 },
  ]);
  assert.equal(r.used, 13000);
  assert.equal(r.remaining, 7000);
  assert.equal(r.pctUsed, 65);
  assert.equal(r.overBy, 0);
  assert.equal(r.rows[2].inCurrentTaxYear, false);
});

test("acceptance: over allowance when adding Jan 2027 contribution", () => {
  const base = [
    { date: "2026-04-06", amount: 5000 },
    { date: "2026-10-01", amount: 8000 },
    { date: "2026-04-05", amount: 3000 },
  ];
  const r = calculateIsaAllowance([...base, { date: "2027-01-01", amount: 8000 }]);
  assert.equal(r.used, 21000);
  assert.equal(r.overBy, 1000);
  assert.equal(r.remaining, 0);
});
