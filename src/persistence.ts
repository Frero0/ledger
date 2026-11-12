import {
  empty,
  validateBackup,
  validTransaction,
  cents,
  type Dataset,
  type Transaction,
} from "./model";
export const KEY = "ledger:v2",
  LEGACY = "fs-bilancio-23",
  ORIGINAL = "ledger:original-legacy";
export function migrate(raw: string): Dataset {
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw Error("Invalid legacy data");
  const transactions: Transaction[] = rows.map((t) => {
    if (
      !t ||
      !["Income", "Expense"].includes(t.type) ||
      typeof t.category !== "string" ||
      typeof t.id !== "string"
    )
      throw Error("Invalid legacy row");
    return {
      id: t.id,
      type: t.type === "Income" ? "income" : "expense",
      cents: cents(String(t.amount))!,
      category: t.type === "Income" ? "legacy-income" : "legacy-expense",
      date: t.date,
      description: typeof t.description === "string" ? t.description : "",
      legacyCategory: t.category,
      needsReview: true,
    };
  });
  if (!transactions.every(validTransaction)) throw Error("Invalid legacy row");
  return validateBackup({ ...empty(), transactions });
}
export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}
export function load(storage: StorageLike): {
  data: Dataset | null;
  raw: string | null;
  blocked: boolean;
  warning: boolean;
  migrated: boolean;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(KEY);
    if (raw !== null)
      return {
        data: validateBackup(JSON.parse(raw)),
        raw: null,
        blocked: false,
        warning: false,
        migrated: false,
      };
    raw = storage.getItem(LEGACY);
    if (raw !== null) {
      const data = migrate(raw);
      storage.setItem(ORIGINAL, raw);
      storage.setItem(KEY, JSON.stringify(data));
      return {
        data,
        raw: null,
        blocked: false,
        warning: false,
        migrated: true,
      };
    }
    return {
      data: null,
      raw: null,
      blocked: false,
      warning: false,
      migrated: false,
    };
  } catch {
    return {
      data: null,
      raw,
      blocked: raw !== null,
      warning: raw === null,
      migrated: false,
    };
  }
}
export function save(storage: StorageLike, data: Dataset) {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function wipe(storage: StorageLike) {
  try {
    for (const key of [KEY, LEGACY, ORIGINAL]) storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
