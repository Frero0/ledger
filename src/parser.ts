import { cents, civil, shift, today, type Kind } from "./model";
const aliases: Record<string, string[]> = {
  salary: ["salary", "stipendio"],
  business: ["business", "attività"],
  gifts: ["gift", "gifts", "regalo", "regali"],
  "other-income": ["other income", "altre entrate"],
  groceries: ["groceries", "food", "alimentari"],
  housing: ["rent", "housing", "affitto", "casa"],
  bills: ["bills", "bollette"],
  transport: ["transport", "trasporti"],
  health: ["health", "salute"],
  leisure: ["leisure", "svago"],
  "other-expense": ["other expense", "altre spese"],
};
export function parsePhrase(text: string, localToday = today()) {
  const s = text.toLocaleLowerCase();
  const dates = [...s.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
  const relative = [/\b(today|oggi)\b/.test(s), /\b(yesterday|ieri)\b/.test(s)];
  if (
    dates.length + relative.filter(Boolean).length > 1 ||
    dates.some((d) => !civil(d))
  )
    throw Error("Ambiguous phrase");
  if (/[-+]\s*\d/.test(s.replace(/\d{4}-\d{2}-\d{2}/g, "")))
    throw Error("Ambiguous phrase");
  const clean = s.replace(/\d{4}-\d{2}-\d{2}/g, "");
  const amounts = [...clean.matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map((m) => m[0]);
  if (amounts.length !== 1 || cents(amounts[0]) === null)
    throw Error("Ambiguous phrase");
  const cats = Object.entries(aliases)
    .filter(([, words]) =>
      words.some((w) =>
        new RegExp("(^|[^a-zà-ù])" + w + "($|[^a-zà-ù])").test(s),
      ),
    )
    .map(([id]) => id);
  if (cats.length !== 1) throw Error("Ambiguous phrase");
  const inferred: Kind = [
    "salary",
    "business",
    "gifts",
    "other-income",
  ].includes(cats[0])
    ? "income"
    : "expense";
  const income = /\b(income|entrata)\b/.test(s),
    expense = /\b(expense|spesa|uscita)\b/.test(s);
  if (
    (income && expense) ||
    (income && inferred !== "income") ||
    (expense && inferred !== "expense")
  )
    throw Error("Ambiguous phrase");
  return {
    type: inferred,
    category: cats[0],
    amount: amounts[0].replace(",", "."),
    date: dates[0] || (relative[1] ? shift(localToday, -1) : localToday),
  };
}
