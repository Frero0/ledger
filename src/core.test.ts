import { it, expect } from "vitest";
import {
  cents,
  civil,
  totals,
  filtered,
  monthly,
  budgetStatus,
  previousRange,
  percentChange,
  demo,
  empty,
  validateBackup,
  csv,
  categories,
  shift,
  validTransaction,
} from "./model";
import { migrate, load, save, KEY, ORIGINAL } from "./persistence";
import { parsePhrase } from "./parser";
const d = demo();
const f = {
  start: "2026-07-01",
  end: "2026-11-30",
  type: "all",
  category: "all",
  q: "",
  sort: "newest",
};
it("parses bounded exact cents without float arithmetic", () => {
  expect(cents("12,34")).toBe(1234);
  expect(cents("0.10")).toBe(10);
  for (const v of ["0", "-1", "1.234", "1e3", "NaN", "100000000", ""])
    expect(cents(v)).toBeNull();
});
it("validates civil dates and leap years", () => {
  expect(civil("2024-02-29")).toBe(true);
  expect(civil("2023-02-29")).toBe(false);
  expect(civil("2026-13-01")).toBe(false);
  expect(shift("2026-03-01", -1)).toBe("2026-02-28");
});
it("aggregates without mutating shared objects", () => {
  const before = JSON.stringify(d);
  expect(monthly(d.transactions)).toHaveLength(5);
  expect(totals(d.transactions).net).toBe(
    totals(d.transactions).income - totals(d.transactions).expense,
  );
  expect(JSON.stringify(d)).toBe(before);
  expect(Object.isFrozen(categories[0])).toBe(true);
});
it("filters all selected totals and descriptions consistently", () => {
  const rows = filtered(d.transactions, {
    ...f,
    type: "expense",
    category: "groceries",
    q: "Weekly",
  });
  expect(rows).toHaveLength(5);
  expect(rows.every((t) => t.type === "expense")).toBe(true);
});
it("computes equal-day comparisons and handles zero denominators", () => {
  expect(previousRange("2026-03-01", "2026-03-10")).toEqual({
    start: "2026-02-19",
    end: "2026-02-28",
  });
  expect(percentChange(20, 0)).toBeNull();
  expect(percentChange(120, 100)).toBe(20);
});
it("budgets use full months and show overrun above 100%", () => {
  const b = { month: "2026-11", category: "groceries", cents: 10000 };
  const s = budgetStatus(b, d.transactions);
  expect(s.percent).toBeGreaterThan(100);
  expect(s.remaining).toBeLessThan(0);
});
it("migrates every legacy row and retains original category for review", () => {
  const legacy = [
    {
      id: "a",
      type: "Income",
      category: "Risparmi",
      amount: 12.5,
      date: "2020-11-13",
    },
  ];
  const m = migrate(JSON.stringify(legacy));
  expect(m.transactions[0]).toMatchObject({
    id: "a",
    cents: 1250,
    legacyCategory: "Risparmi",
    needsReview: true,
  });
  expect(totals(m.transactions).income).toBe(0);
});
it("backs up original before saving migration and never overwrites corrupt data", () => {
  const map = new Map([
    [
      "fs-bilancio-23",
      JSON.stringify([
        {
          id: "a",
          type: "Expense",
          category: "Auto",
          amount: 5,
          date: "2020-11-13",
        },
      ]),
    ],
  ]);
  const s = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  expect(load(s).migrated).toBe(true);
  expect(map.has(ORIGINAL)).toBe(true);
  map.set(KEY, "broken");
  expect(load(s).blocked).toBe(true);
  expect(map.get(KEY)).toBe("broken");
});
it("handles unavailable storage and migration quota failure", () => {
  const s = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
    removeItem() {
      throw Error();
    },
  };
  expect(load(s).warning).toBe(true);
  expect(save(s, empty())).toBe(false);
});
it("validates complete backups atomically", () => {
  expect(validateBackup(d)).toEqual(d);
  for (const bad of [
    null,
    { ...d, version: 1 },
    { ...d, transactions: [...d.transactions, d.transactions[0]] },
    { ...d, preferences: { language: "xx" } },
  ])
    expect(() => validateBackup(bad)).toThrow();
  expect(validTransaction({ ...d.transactions[0], cents: -1 })).toBe(false);
});
it("escapes CSV quotes, formula-like cells and missing content", () => {
  const tx = { ...d.transactions[0], description: '=HYPERLINK("x")' };
  const s = csv([tx], "en");
  expect(s).toContain("'=HYPERLINK");
  expect(s).toContain('""x""');
  expect(s).toContain("amount_eur");
});
it("parses English and Italian phrases with local relative dates", () => {
  expect(
    parsePhrase("expense groceries 24.50 yesterday", "2026-03-01"),
  ).toMatchObject({
    amount: "24.50",
    category: "groceries",
    date: "2026-02-28",
  });
  expect(
    parsePhrase("entrata stipendio 2500 oggi", "2026-11-12"),
  ).toMatchObject({ type: "income", date: "2026-11-12" });
  expect(parsePhrase("spesa alimentari 12,50 2026-11-10").amount).toBe("12.50");
});
it("rejects multiple amounts, contradictory types, dates and written numbers", () => {
  for (const s of [
    "expense groceries 20 30 today",
    "income groceries 20",
    "expense groceries twenty today",
    "expense groceries -20 today",
    "expense groceries 20 today yesterday",
    "expense groceries 20 2026-02-30",
  ])
    expect(() => parsePhrase(s)).toThrow();
});
it("preserves preference language in a backup", () => {
  expect(
    validateBackup({ ...d, preferences: { language: "it" } }).preferences
      .language,
  ).toBe("it");
});
it("keeps migration original intact when the recovery copy cannot be saved", () => {
  const original = JSON.stringify([
    {
      id: "old",
      type: "Income",
      category: "Depositi",
      amount: 100,
      date: "2020-11-13",
    },
  ]);
  const writes: string[] = [];
  const s = {
    getItem: (k: string) => (k === "fs-bilancio-23" ? original : null),
    setItem: (k: string) => {
      writes.push(k);
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
  };
  const result = load(s);
  expect(result.blocked).toBe(true);
  expect(result.raw).toBe(original);
  expect(writes).toEqual([ORIGINAL]);
});
it("rejects incompatible categories, malformed budgets and fractional cents atomically", () => {
  for (const tx of [
    { ...d.transactions[0], category: "removed-category" },
    { ...d.transactions[0], cents: 12.5 },
    { ...d.transactions[0], needsReview: "false" },
    { ...d.transactions[0], date: "2026-02-30" },
  ])
    expect(() => validateBackup({ ...d, transactions: [tx] })).toThrow();
  expect(() =>
    validateBackup({
      ...d,
      budgets: [{ month: "2026-11", category: "salary", cents: 100 }],
    }),
  ).toThrow();
  expect(() =>
    validateBackup({ ...d, budgets: [d.budgets[0], d.budgets[0]] }),
  ).toThrow();
});
it("handles empty periods, zero spending and immutable filtered sorting", () => {
  const before = JSON.stringify(d.transactions);
  expect(totals([])).toEqual({ income: 0, expense: 0, net: 0 });
  expect(monthly([])).toEqual([]);
  expect(
    budgetStatus(
      { month: "2025-01", category: "groceries", cents: 10000 },
      d.transactions,
    ),
  ).toEqual({ spent: 0, remaining: 10000, percent: 0 });
  filtered(d.transactions, { ...f, sort: "amount" });
  expect(JSON.stringify(d.transactions)).toBe(before);
});
