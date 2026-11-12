export type Lang = "en" | "it";
export type Kind = "income" | "expense";
export const categories = Object.freeze(
  [
    { id: "salary", type: "income", en: "Salary", it: "Stipendio" },
    { id: "business", type: "income", en: "Business", it: "Attività" },
    {
      id: "gifts",
      type: "income",
      en: "Gifts received",
      it: "Regali ricevuti",
    },
    {
      id: "other-income",
      type: "income",
      en: "Other income",
      it: "Altre entrate",
    },
    { id: "groceries", type: "expense", en: "Groceries", it: "Alimentari" },
    { id: "housing", type: "expense", en: "Housing", it: "Casa" },
    { id: "bills", type: "expense", en: "Bills", it: "Bollette" },
    { id: "transport", type: "expense", en: "Transport", it: "Trasporti" },
    { id: "health", type: "expense", en: "Health", it: "Salute" },
    { id: "leisure", type: "expense", en: "Leisure", it: "Svago" },
    {
      id: "other-expense",
      type: "expense",
      en: "Other expenses",
      it: "Altre spese",
    },
    {
      id: "legacy-income",
      type: "income",
      en: "Legacy income — review required",
      it: "Entrata legacy — da rivedere",
    },
    {
      id: "legacy-expense",
      type: "expense",
      en: "Legacy expense — review required",
      it: "Spesa legacy — da rivedere",
    },
  ].map((c) => Object.freeze(c)),
);
export interface Transaction {
  id: string;
  type: Kind;
  cents: number;
  category: string;
  date: string;
  description: string;
  legacyCategory?: string;
  needsReview?: boolean;
}
export interface Budget {
  month: string;
  category: string;
  cents: number;
}
export interface Dataset {
  version: 2;
  mode: "demo" | "personal";
  transactions: Transaction[];
  budgets: Budget[];
  preferences: { language: Lang };
}
export const empty = (language: Lang = "en"): Dataset => ({
  version: 2,
  mode: "personal",
  transactions: [],
  budgets: [],
  preferences: { language },
});
export function civil(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    v >= "1900-01-01" &&
    v <= "2100-12-31" &&
    Number.isFinite(Date.parse(v + "T12:00:00Z")) &&
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v
  );
}
export function cents(v: string) {
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(v.trim())) return null;
  const [a, b = ""] = v.trim().replace(",", ".").split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  return n > 0 && n <= 9999999999 ? n : null;
}
export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function shift(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function monthRange(month: string) {
  return {
    start: month + "-01",
    end: shift(
      new Date(
        Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1, 12),
      )
        .toISOString()
        .slice(0, 10),
      -1,
    ),
  };
}
export const previousMonth = (m: string) => shift(m + "-01", -1).slice(0, 7);
export const label = (id: string, lang: Lang) =>
  categories.find((c) => c.id === id)?.[lang] || id;
export function validTransaction(x: unknown): x is Transaction {
  if (!x || typeof x !== "object") return false;
  const t = x as Transaction;
  return (
    typeof t.id === "string" &&
    t.id.length > 0 &&
    t.id.length <= 150 &&
    Number.isSafeInteger(t.cents) &&
    t.cents > 0 &&
    t.cents <= 9999999999 &&
    civil(t.date) &&
    (t.needsReview === undefined || t.needsReview === true) &&
    (t.legacyCategory === undefined || typeof t.legacyCategory === "string") &&
    typeof t.description === "string" &&
    t.description.length <= 300 &&
    categories.some((c) => c.id === t.category && c.type === t.type) &&
    (!t.category.startsWith("legacy-") ||
      (t.needsReview === true &&
        typeof t.legacyCategory === "string" &&
        t.legacyCategory.length > 0 &&
        t.legacyCategory.length <= 150))
  );
}
export function validateBackup(raw: unknown): Dataset {
  if (!raw || typeof raw !== "object") throw Error("Invalid backup");
  const d = raw as Dataset;
  if (
    d.version !== 2 ||
    !["demo", "personal"].includes(d.mode) ||
    !Array.isArray(d.transactions) ||
    d.transactions.length > 50000 ||
    !d.transactions.every(validTransaction) ||
    new Set(d.transactions.map((t) => t.id)).size !== d.transactions.length ||
    !Array.isArray(d.budgets) ||
    d.budgets.length > 12000 ||
    !d.budgets.every(
      (b) =>
        b &&
        /^\d{4}-\d{2}$/.test(b.month) &&
        civil(b.month + "-01") &&
        categories.some(
          (c) =>
            c.id === b.category &&
            c.type === "expense" &&
            !c.id.startsWith("legacy"),
        ) &&
        Number.isSafeInteger(b.cents) &&
        b.cents > 0 &&
        b.cents <= 9999999999,
    ) ||
    new Set(d.budgets.map((b) => b.month + ":" + b.category)).size !==
      d.budgets.length ||
    !["en", "it"].includes(d.preferences?.language)
  )
    throw Error("Invalid backup");
  return structuredClone(d);
}
export function totals(items: Transaction[]) {
  const clean = items.filter((t) => !t.needsReview);
  const income = clean
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.cents, 0),
    expense = clean
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.cents, 0);
  return { income, expense, net: income - expense };
}
export interface Filters {
  start: string;
  end: string;
  type: string;
  category: string;
  q: string;
  sort: string;
}
export function filtered(items: Transaction[], f: Filters) {
  return items
    .filter(
      (t) =>
        t.date >= f.start &&
        t.date <= f.end &&
        (f.type === "all" || t.type === f.type) &&
        (f.category === "all" || t.category === f.category) &&
        t.description.toLocaleLowerCase().includes(f.q.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      f.sort === "amount"
        ? b.cents - a.cents
        : f.sort === "oldest"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
    );
}
export function monthly(items: Transaction[]) {
  const months = [...new Set(items.map((t) => t.date.slice(0, 7)))].sort();
  return months.map((month) => ({
    month,
    ...totals(items.filter((t) => t.date.startsWith(month))),
  }));
}
export function distribution(items: Transaction[]) {
  return categories
    .filter((c) => c.type === "expense" && !c.id.startsWith("legacy"))
    .map((c) => ({
      category: c.id,
      cents: items
        .filter((t) => t.category === c.id && !t.needsReview)
        .reduce((s, t) => s + t.cents, 0),
    }))
    .filter((v) => v.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}
export function budgetStatus(b: Budget, items: Transaction[]) {
  const spent = items
    .filter(
      (t) =>
        t.type === "expense" &&
        t.category === b.category &&
        t.date.startsWith(b.month) &&
        !t.needsReview,
    )
    .reduce((s, t) => s + t.cents, 0);
  return {
    spent,
    remaining: b.cents - spent,
    percent: (spent / b.cents) * 100,
  };
}
export function previousRange(start: string, end: string) {
  const days =
    Math.round(
      (Date.parse(end + "T12:00Z") - Date.parse(start + "T12:00Z")) / 86400000,
    ) + 1;
  return { start: shift(start, -days), end: shift(start, -1) };
}
export const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / previous) * 100;
export function csv(items: Transaction[], lang: Lang) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows: unknown[][] = [
    lang === "en"
      ? [
          "id",
          "type",
          "amount_eur",
          "category",
          "date",
          "description",
          "review_required",
        ]
      : [
          "id",
          "tipo",
          "importo_eur",
          "categoria",
          "data",
          "descrizione",
          "da_rivedere",
        ],
  ];
  for (const t of items)
    rows.push([
      t.id,
      t.type,
      (t.cents / 100).toFixed(2),
      t.legacyCategory || label(t.category, lang),
      t.date,
      t.description,
      !!t.needsReview,
    ]);
  return "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}
export function demo(): Dataset {
  const d = empty();
  d.mode = "demo";
  for (let m = 7; m <= 11; m++) {
    const month = `2026-${String(m).padStart(2, "0")}`;
    const rows: [string, Kind, number, string, number][] = [
      ["salary", "income", 285000, "Monthly salary", 1],
      ["business", "income", 35000, "Freelance project", 8],
      ["housing", "expense", 92000, "Apartment rent", 2],
      ["groceries", "expense", 23500 + m * 700, "Weekly groceries", 6],
      ["bills", "expense", 14500, "Utilities", 9],
      ["transport", "expense", 7200, "Transit pass", 3],
      ["leisure", "expense", 12500 + m * 1000, "Books and meals", 11],
      ["health", "expense", 4800, "Pharmacy", 10],
    ];
    for (const [cat, type, amount, description, day] of rows)
      d.transactions.push({
        id: `demo-${month}-${cat}`,
        type,
        cents: amount,
        category: cat,
        date: `${month}-${String(day).padStart(2, "0")}`,
        description,
      });
    for (const [category, amount] of [
      ["groceries", 30000],
      ["leisure", 20000],
      ["transport", 10000],
    ] as const)
      d.budgets.push({ month, category, cents: amount });
  }
  return d;
}
