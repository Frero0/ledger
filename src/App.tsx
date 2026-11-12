import { useState, useEffect, lazy, Suspense } from "react";
import {
  Wallet,
  LayoutDashboard,
  List,
  ChartColumn,
  Settings,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Undo2,
  Pencil,
  Copy,
  Trash2,
  Target,
  ShieldCheck,
} from "lucide-react";
import {
  categories,
  empty,
  demo,
  totals,
  filtered,
  label,
  today,
  monthRange,
  previousMonth,
  previousRange,
  percentChange,
  budgetStatus,
  cents,
  civil,
  validateBackup,
  csv,
  type Dataset,
  type Transaction,
  type Filters,
  type Lang,
} from "./model";
import { load, save, wipe, ORIGINAL, type StorageLike } from "./persistence";
import { translator, money, formatDate, type Key } from "./i18n";
import EntryForm from "./EntryForm";
const Charts = lazy(() => import("./Charts"));
const storage: StorageLike = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
};
const views = [
  "overview",
  "transactions",
  "budgets",
  "insights",
  "settings",
] as const;
const viewNames = [
  "Overview",
  "Transactions",
  "Budgets",
  "Insights",
  "Settings",
] as const;
const icons = [LayoutDashboard, List, Target, ChartColumn, Settings];
function initialFilters(): Filters {
  return {
    ...monthRange(today().slice(0, 7)),
    type: "all",
    category: "all",
    q: "",
    sort: "newest",
  };
}
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [initial] = useState(() => load(storage));
  const [data, setData] = useState<Dataset | null>(initial.data),
    [blocked, setBlocked] = useState(initial.blocked),
    [warning, setWarning] = useState(initial.warning),
    [raw, setRaw] = useState(initial.raw),
    [saved, setSaved] = useState(true),
    [view, setView] = useState(() => {
      const v = new URLSearchParams(location.search).get("view");
      return views.includes(v as (typeof views)[number]) ? v! : "overview";
    }),
    [f, setF] = useState<Filters>(initialFilters),
    [page, setPage] = useState(0),
    [editing, setEditing] = useState<{
      value?: Transaction;
      duplicate?: boolean;
    } | null>(null),
    [undo, setUndo] = useState<Transaction | null>(null),
    [notice, setNotice] = useState<Key | null>(null),
    [restore, setRestore] = useState<Dataset | null>(null),
    [month, setMonth] = useState(today().slice(0, 7)),
    [budgetCat, setBudgetCat] = useState("groceries"),
    [budgetAmount, setBudgetAmount] = useState("");
  const lang = data?.preferences.language || "en",
    t = translator(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${t(viewNames[views.indexOf(view as (typeof views)[number])] || "Overview")} — Ledger`;
  }, [lang, view]);
  useEffect(() => {
    const pop = () => {
      const v = new URLSearchParams(location.search).get("view");
      setView(views.includes(v as (typeof views)[number]) ? v! : "overview");
      setEditing(null);
    };
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => setPage(0), [f]);
  function update(next: Dataset) {
    setData(next);
    const ok = save(storage, next);
    setSaved(ok);
    setWarning(!ok);
    if (!ok) setNotice("Session only — storage failed");
    return ok;
  }
  function navigate(v: string) {
    setEditing(null);
    setView(v);
    history.pushState(null, "", "?view=" + v);
  }
  function begin(mode: "demo" | "personal") {
    const d = mode === "demo" ? demo() : empty();
    update(d);
    if (mode === "demo") {
      setF({ ...initialFilters(), start: "2026-07-01", end: "2026-11-30" });
      setMonth("2026-11");
    }
  }
  function applyFilters(next: Filters) {
    setF(next);
  }
  let original: string | null = null;
  try {
    original = storage.getItem(ORIGINAL);
  } catch {
    /* storage warning is handled by load/save */
  }
  const items = data ? filtered(data.transactions, f) : [];
  const sum = totals(items);
  const prior = previousRange(f.start, f.end);
  const priorItems = data
    ? filtered(data.transactions, { ...f, ...prior })
    : [];
  const priorTotal = totals(priorItems);
  const change = priorItems.length
    ? percentChange(sum.expense, priorTotal.expense)
    : null;
  const rows = items.slice(page * 12, page * 12 + 12);
  function storeTransaction(tx: Transaction) {
    if (!data) return;
    const ok = update({
      ...data,
      transactions: [tx, ...data.transactions.filter((x) => x.id !== tx.id)],
    });
    setEditing(null);
    setNotice(ok ? "Saved" : "Session only — storage failed");
  }
  return (
    <>
      <a className="skip" href="#main">
        {t("Skip to content")}
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="?view=overview"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span>
            <Wallet size={23} />
          </span>
          ledger<span className="brand-dot">.</span>
        </a>
        <small className="brand-tag">PERSONAL FINANCE TRACKER</small>
        <nav>
          {views.map((v, i) => {
            const Icon = icons[i];
            return (
              <a
                key={v}
                href={"?view=" + v}
                aria-current={view === v ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(v);
                }}
              >
                <Icon size={18} />
                {t(viewNames[i])}
              </a>
            );
          })}
        </nav>
        <div className="privacy">
          <ShieldCheck size={24} />
          <strong>{t("EUR only")}</strong>
          <p>
            {t(
              "Data stays in this browser. It is not encrypted, password-protected or synced. Export backups regularly.",
            )}
          </p>
        </div>
        <small className="author">
          {t("A project by Federico Santorsola")}
        </small>
      </aside>
      <div className="shell">
        <header>
          <span>{t("Personal finance, in perspective.")}</span>
          <div>
            <span className="mode">
              {data
                ? t(data.mode === "demo" ? "Demo data" : "Personal data")
                : "Ledger"}
            </span>
            <select
              aria-label={t("Language")}
              value={lang}
              disabled={!data}
              onChange={(e) =>
                data &&
                update({
                  ...data,
                  preferences: { language: e.target.value as Lang },
                })
              }
            >
              <option value="en">English</option>
              <option value="it">Italiano</option>
            </select>
            {data && (
              <button className="primary" onClick={() => setEditing({})}>
                <Plus size={16} />
                {t("Add transaction")}
              </button>
            )}
          </div>
        </header>
        <main id="main">
          {warning && (
            <p role="status" className="warning">
              {t(
                "Storage unavailable or quota exceeded. Changes remain in memory.",
              )}
            </p>
          )}
          {blocked ? (
            <section className="panel welcome">
              <h1>
                {t(
                  "Original data needs recovery. It has not been overwritten.",
                )}
              </h1>
              <button
                onClick={() =>
                  raw !== null &&
                  download("ledger-recovery.txt", raw, "text/plain")
                }
              >
                {t("Export original")}
              </button>
              <p>
                {t(
                  "Unsaved recovery copy. Export the original before replacing data.",
                )}
              </p>
              <button
                onClick={() => {
                  if (
                    confirm(
                      t("Delete this app’s local data and recovery copy?"),
                    )
                  ) {
                    if (wipe(storage)) {
                      setBlocked(false);
                      setRaw(null);
                      setData(null);
                    } else setWarning(true);
                  }
                }}
              >
                {t("Delete local data")}
              </button>
            </section>
          ) : !data ? (
            <section className="panel welcome">
              <span className="welcome-icon">
                <Wallet size={38} />
              </span>
              <h1>{t("Choose how to begin")}</h1>
              <p>
                {t("Demo and personal records are never merged automatically.")}
              </p>
              <div className="actions">
                <button className="primary" onClick={() => begin("demo")}>
                  {t("Try demo")}
                </button>
                <button onClick={() => begin("personal")}>
                  {t("Start empty")}
                </button>
              </div>
            </section>
          ) : (
            <>
              {data.transactions.some((t) => t.needsReview) && (
                <p className="warning">
                  {t(
                    "Legacy categories require review and are excluded from all totals until confirmed.",
                  )}
                </p>
              )}
              {editing ? (
                <EntryForm
                  key={editing.value?.id || "new"}
                  initial={editing.value}
                  duplicate={editing.duplicate}
                  lang={lang}
                  onSave={storeTransaction}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        LEDGER /{" "}
                        {t(
                          viewNames[
                            views.indexOf(view as (typeof views)[number])
                          ] || "Overview",
                        )}
                      </span>
                      <h1>
                        {t(
                          view === "overview"
                            ? "Your money, clearly organised."
                            : view === "budgets"
                              ? "Monthly budgets"
                              : view === "transactions"
                                ? "Transactions"
                                : view === "insights"
                                  ? "Insights"
                                  : "Settings",
                        )}
                      </h1>
                    </div>
                    <span className="save-state">
                      {t(saved ? "Saved" : "Session only — storage failed")}
                    </span>
                  </div>
                  {(view === "overview" ||
                    view === "transactions" ||
                    view === "insights") && (
                    <>
                      <section className="filters panel">
                        <div className="shortcuts">
                          {(
                            [
                              "Current month",
                              "Previous month",
                              "Year",
                              "Custom",
                            ] as const
                          ).map((k) => (
                            <button
                              key={k}
                              onClick={() => {
                                const m = today().slice(0, 7);
                                applyFilters({
                                  ...f,
                                  ...(k === "Year"
                                    ? {
                                        start: today().slice(0, 4) + "-01-01",
                                        end: today().slice(0, 4) + "-12-31",
                                      }
                                    : k === "Custom"
                                      ? { start: f.start, end: f.end }
                                      : monthRange(
                                          k === "Previous month"
                                            ? previousMonth(m)
                                            : m,
                                        )),
                                });
                              }}
                            >
                              {t(k)}
                            </button>
                          ))}
                        </div>
                        <div className="filter-fields">
                          <label>
                            {t("From")}
                            <input
                              type="date"
                              value={f.start}
                              max={f.end}
                              onChange={(e) => {
                                if (
                                  civil(e.target.value) &&
                                  e.target.value <= f.end
                                )
                                  applyFilters({ ...f, start: e.target.value });
                              }}
                            />
                          </label>
                          <label>
                            {t("To")}
                            <input
                              type="date"
                              value={f.end}
                              min={f.start}
                              onChange={(e) => {
                                if (
                                  civil(e.target.value) &&
                                  e.target.value >= f.start
                                )
                                  applyFilters({ ...f, end: e.target.value });
                              }}
                            />
                          </label>
                          <label>
                            {t("Type")}
                            <select
                              value={f.type}
                              onChange={(e) =>
                                applyFilters({
                                  ...f,
                                  type: e.target.value,
                                  category: "all",
                                })
                              }
                            >
                              <option value="all">{t("All")}</option>
                              <option value="income">{t("Income")}</option>
                              <option value="expense">{t("Expenses")}</option>
                            </select>
                          </label>
                          <label>
                            {t("Category")}
                            <select
                              value={f.category}
                              onChange={(e) =>
                                applyFilters({ ...f, category: e.target.value })
                              }
                            >
                              <option value="all">{t("All")}</option>
                              {categories
                                .filter(
                                  (c) => f.type === "all" || c.type === f.type,
                                )
                                .map((c) => (
                                  <option value={c.id} key={c.id}>
                                    {c[lang]}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            {t("Search")}
                            <input
                              value={f.q}
                              onChange={(e) =>
                                applyFilters({ ...f, q: e.target.value })
                              }
                            />
                          </label>
                          <button onClick={() => setF(initialFilters())}>
                            {t("Reset")}
                          </button>
                        </div>
                      </section>
                      <div className="metrics">
                        {[
                          {
                            name: "Income" as Key,
                            value: sum.income,
                            icon: ArrowDownLeft,
                          },
                          {
                            name: "Expenses" as Key,
                            value: sum.expense,
                            icon: ArrowUpRight,
                          },
                          {
                            name: "Period net" as Key,
                            value: sum.net,
                            icon: Wallet,
                          },
                          {
                            name: "All recorded net" as Key,
                            value: totals(data.transactions).net,
                            icon: ChartColumn,
                          },
                        ].map((m, i) => (
                          <article
                            className={
                              "panel metric " + (i === 2 ? "accent" : "")
                            }
                            key={m.name}
                          >
                            <div>
                              <span>{t(m.name)}</span>
                              <m.icon size={17} />
                            </div>
                            <strong>{money(m.value, lang)}</strong>
                            <small>
                              {t(
                                i === 3
                                  ? "All reviewed records · not a bank balance"
                                  : "Selected period only",
                              )}
                            </small>
                          </article>
                        ))}
                      </div>
                      <p className="period-note">
                        {t("Previous equivalent period")}:{" "}
                        {formatDate(prior.start, lang)} —{" "}
                        {formatDate(prior.end, lang)} ·{" "}
                        {t("Change from previous")} ({t("Expenses")}):{" "}
                        {change === null
                          ? t("Not calculable")
                          : new Intl.NumberFormat(lang, {
                              maximumFractionDigits: 1,
                              signDisplay: "exceptZero",
                            }).format(change) + "%"}
                      </p>
                      {view !== "transactions" && (
                        <Suspense
                          fallback={<p role="status">{t("Loading chart…")}</p>}
                        >
                          <Charts items={items} lang={lang} />
                        </Suspense>
                      )}
                      <section className="panel transactions">
                        <div className="section-head">
                          <h2>
                            {t(
                              view === "overview"
                                ? "Recent transactions"
                                : "Transactions",
                            )}
                          </h2>
                          <div className="actions">
                            <select
                              aria-label={t("Sort")}
                              value={f.sort}
                              onChange={(e) =>
                                setF({ ...f, sort: e.target.value })
                              }
                            >
                              <option value="newest">{t("Newest")}</option>
                              <option value="oldest">{t("Oldest")}</option>
                              <option value="amount">{t("Highest")}</option>
                            </select>
                            <button
                              onClick={() =>
                                download(
                                  "ledger-selection.csv",
                                  csv(items, lang),
                                  "text/csv;charset=utf-8",
                                )
                              }
                            >
                              <Download size={14} />
                              {t("Export CSV")}
                            </button>
                          </div>
                        </div>
                        <p className="hint" role="status">
                          {items.length} {t("results")} ·{" "}
                          {formatDate(f.start, lang)} —{" "}
                          {formatDate(f.end, lang)}
                        </p>
                        {rows.length ? (
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>{t("Description")}</th>
                                  <th>{t("Category")}</th>
                                  <th>{t("Date")}</th>
                                  <th>{t("Amount")} · EUR</th>
                                  <th>{t("Edit")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((tx) => (
                                  <tr key={tx.id}>
                                    <th scope="row">
                                      <span
                                        className={
                                          "transaction-icon " + tx.type
                                        }
                                      >
                                        {tx.type === "income" ? (
                                          <ArrowDownLeft size={15} />
                                        ) : (
                                          <ArrowUpRight size={15} />
                                        )}
                                      </span>
                                      <span>
                                        {tx.description ||
                                          label(tx.category, lang)}
                                        <small>
                                          {t(
                                            tx.type === "income"
                                              ? "Income"
                                              : "Expenses",
                                          )}
                                          {tx.needsReview
                                            ? " · " + t("Review required")
                                            : ""}
                                        </small>
                                      </span>
                                    </th>
                                    <td>
                                      {label(tx.category, lang)}
                                      {tx.legacyCategory && (
                                        <small>{tx.legacyCategory}</small>
                                      )}
                                    </td>
                                    <td>{formatDate(tx.date, lang)}</td>
                                    <td className={tx.type}>
                                      {tx.type === "income" ? "+" : "−"}
                                      {money(tx.cents, lang)}
                                    </td>
                                    <td>
                                      <div className="row-actions">
                                        <button
                                          aria-label={
                                            t("Edit") + " " + tx.description
                                          }
                                          onClick={() =>
                                            setEditing({ value: tx })
                                          }
                                        >
                                          <Pencil size={14} />
                                        </button>
                                        <button
                                          aria-label={
                                            t("Duplicate") +
                                            " " +
                                            tx.description
                                          }
                                          onClick={() =>
                                            setEditing({
                                              value: tx,
                                              duplicate: true,
                                            })
                                          }
                                        >
                                          <Copy size={14} />
                                        </button>
                                        <button
                                          aria-label={
                                            t("Delete") + " " + tx.description
                                          }
                                          onClick={() => {
                                            update({
                                              ...data,
                                              transactions:
                                                data.transactions.filter(
                                                  (x) => x.id !== tx.id,
                                                ),
                                            });
                                            setUndo(tx);
                                          }}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="empty">
                            {t("No transactions in this selection.")}
                          </p>
                        )}
                        <div className="pagination">
                          <span>
                            {page + 1} /{" "}
                            {Math.max(1, Math.ceil(items.length / 12))}
                          </span>
                          <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                          >
                            {t("Previous")}
                          </button>
                          <button
                            disabled={(page + 1) * 12 >= items.length}
                            onClick={() => setPage(page + 1)}
                          >
                            {t("Next")}
                          </button>
                        </div>
                      </section>
                    </>
                  )}
                  {view === "budgets" && (
                    <>
                      <p className="hint">
                        {t(
                          "Budgets use the entire month, independent of transaction filters. They are plans, not available money.",
                        )}
                      </p>
                      <section className="panel budget-controls">
                        <label>
                          {t("Month")}
                          <input
                            type="month"
                            value={month}
                            onChange={(e) => {
                              if (civil(e.target.value + "-01"))
                                setMonth(e.target.value);
                            }}
                          />
                        </label>
                        <label>
                          {t("Category")}
                          <select
                            value={budgetCat}
                            onChange={(e) => setBudgetCat(e.target.value)}
                          >
                            {categories
                              .filter(
                                (c) =>
                                  c.type === "expense" &&
                                  !c.id.startsWith("legacy"),
                              )
                              .map((c) => (
                                <option value={c.id} key={c.id}>
                                  {c[lang]}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          {t("Planned")} · EUR
                          <input
                            aria-label={t("Planned")}
                            inputMode="decimal"
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value)}
                          />
                        </label>
                        <button
                          className="primary"
                          onClick={() => {
                            const n = cents(budgetAmount);
                            if (n === null) {
                              setNotice("Budget amount is invalid.");
                              return;
                            }
                            update({
                              ...data,
                              budgets: [
                                ...data.budgets.filter(
                                  (b) =>
                                    b.month !== month ||
                                    b.category !== budgetCat,
                                ),
                                { month, category: budgetCat, cents: n },
                              ],
                            });
                            setBudgetAmount("");
                          }}
                        >
                          {t("Set budget")}
                        </button>
                        <button
                          onClick={() => {
                            const previous = data.budgets.filter(
                              (b) => b.month === previousMonth(month),
                            );
                            if (!previous.length) {
                              setNotice("No previous budgets to copy.");
                              return;
                            }
                            if (
                              confirm(
                                t(
                                  "Replace this month’s budgets with the previous month?",
                                ),
                              )
                            )
                              update({
                                ...data,
                                budgets: [
                                  ...data.budgets.filter(
                                    (b) => b.month !== month,
                                  ),
                                  ...previous.map((b) => ({ ...b, month })),
                                ],
                              });
                          }}
                        >
                          {t("Copy previous month")}
                        </button>
                      </section>
                      <div className="budget-grid">
                        {categories
                          .filter(
                            (c) =>
                              c.type === "expense" &&
                              !c.id.startsWith("legacy"),
                          )
                          .map((c) => {
                            const b = data.budgets.find(
                                (b) => b.month === month && b.category === c.id,
                              ),
                              status = b
                                ? budgetStatus(b, data.transactions)
                                : null;
                            return (
                              <article className="panel budget-card" key={c.id}>
                                <h2>{c[lang]}</h2>
                                {b && status ? (
                                  <>
                                    <div className="budget-amount">
                                      <strong>
                                        {money(status.spent, lang)}
                                      </strong>
                                      <small>/ {money(b.cents, lang)}</small>
                                    </div>
                                    <progress
                                      max={Math.max(100, status.percent)}
                                      value={status.percent}
                                    />
                                    <p>
                                      {t("Used")}:{" "}
                                      {new Intl.NumberFormat(lang, {
                                        maximumFractionDigits: 1,
                                      }).format(status.percent)}
                                      %
                                    </p>
                                    <div
                                      className={
                                        status.remaining < 0 ? "over" : "income"
                                      }
                                    >
                                      {t(
                                        status.remaining < 0
                                          ? "Over"
                                          : "Remaining",
                                      )}
                                      :{" "}
                                      {money(Math.abs(status.remaining), lang)}
                                    </div>
                                    <div className="actions">
                                      <button
                                        onClick={() => {
                                          setBudgetCat(b.category);
                                          setBudgetAmount(
                                            String(b.cents / 100),
                                          );
                                          document
                                            .querySelector<HTMLInputElement>(
                                              ".budget-controls input[aria-label]",
                                            )
                                            ?.focus();
                                        }}
                                      >
                                        {t("Edit")}
                                      </button>
                                      <button
                                        onClick={() =>
                                          update({
                                            ...data,
                                            budgets: data.budgets.filter(
                                              (x) => x !== b,
                                            ),
                                          })
                                        }
                                      >
                                        {t("Delete")}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <p>{t("No budget")}</p>
                                )}
                              </article>
                            );
                          })}
                      </div>
                    </>
                  )}
                  {view === "settings" && (
                    <section className="panel settings">
                      <h2>{t("Backup JSON")}</h2>
                      <p>
                        {t(
                          "Data stays in this browser. It is not encrypted, password-protected or synced. Export backups regularly.",
                        )}
                      </p>
                      <button
                        onClick={() =>
                          download(
                            "ledger-backup-v2.json",
                            JSON.stringify(data, null, 2),
                            "application/json",
                          )
                        }
                      >
                        <Download size={15} />
                        {t("Backup JSON")}
                      </button>
                      {original && (
                        <button
                          onClick={() =>
                            download(
                              "ledger-original-legacy.txt",
                              original!,
                              "text/plain",
                            )
                          }
                        >
                          {t("Export original")}
                        </button>
                      )}
                      <h2>{t("Restore JSON")}</h2>
                      <input
                        aria-label={t("Restore JSON")}
                        type="file"
                        accept="application/json,.json"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          setRestore(null);
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            setNotice(
                              "Invalid or incompatible backup. Nothing was changed.",
                            );
                            return;
                          }
                          try {
                            setRestore(
                              validateBackup(JSON.parse(await file.text())),
                            );
                            setNotice(null);
                          } catch {
                            setRestore(null);
                            setNotice(
                              "Invalid or incompatible backup. Nothing was changed.",
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                      {restore && (
                        <div className="restore-preview">
                          <h3>{t("Preview restore")}</h3>
                          <p>
                            {restore.transactions.length} {t("Transactions")} ·{" "}
                            {restore.budgets.length} {t("Budgets")} ·{" "}
                            {t(
                              restore.mode === "demo"
                                ? "Demo data"
                                : "Personal data",
                            )}
                          </p>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  t(
                                    "Replace all current records, budgets and preferences?",
                                  ),
                                )
                              ) {
                                const next = restore;
                                update(next);
                                setRestore(null);
                                setUndo(null);
                                setF({
                                  ...initialFilters(),
                                  ...(next.transactions.length
                                    ? {
                                        start: next.transactions
                                          .map((x) => x.date)
                                          .sort()[0],
                                        end: next.transactions
                                          .map((x) => x.date)
                                          .sort()
                                          .at(-1)!,
                                      }
                                    : {}),
                                });
                              }
                            }}
                          >
                            {t("Replace dataset")}
                          </button>
                          <button onClick={() => setRestore(null)}>
                            {t("Cancel")}
                          </button>
                        </div>
                      )}
                      <h2>{t("Delete local data")}</h2>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              t(
                                "Delete this app’s local data and recovery copy?",
                              ),
                            )
                          ) {
                            if (wipe(storage)) {
                              setData(null);
                              setUndo(null);
                              setRestore(null);
                            } else setWarning(true);
                          }
                        }}
                      >
                        {t("Delete local data")}
                      </button>
                      <p>{t("Financial descriptions never enter URLs.")}</p>
                    </section>
                  )}
                </>
              )}
              {undo && (
                <div className="undo" role="status">
                  {t("Delete")}:{" "}
                  {undo.description || label(undo.category, lang)}
                  <button
                    onClick={() => {
                      update({
                        ...data,
                        transactions: [
                          undo,
                          ...data.transactions.filter((x) => x.id !== undo.id),
                        ],
                      });
                      setUndo(null);
                    }}
                  >
                    <Undo2 size={14} />
                    {t("Undo")}
                  </button>
                </div>
              )}
            </>
          )}
          {notice && (
            <div className="notice" role="status">
              {t(notice)}
              <button aria-label={t("Cancel")} onClick={() => setNotice(null)}>
                ×
              </button>
            </div>
          )}
          <footer>
            <span>
              Ledger · {t("EUR only")} ·{" "}
              <a href="https://github.com/Frero0">Federico Santorsola</a>
            </span>
            <span>{t("Financial descriptions never enter URLs.")}</span>
          </footer>
        </main>
      </div>
    </>
  );
}
