import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  monthly,
  distribution,
  label,
  type Transaction,
  type Lang,
} from "./model";
import { translator, money } from "./i18n";
export default function Charts({
  items,
  lang,
}: {
  items: Transaction[];
  lang: Lang;
}) {
  const t = translator(lang),
    months = monthly(items),
    dist = distribution(items);
  return (
    <div className="charts">
      <section className="panel">
        <div className="section-head">
          <h2>{t("Monthly cash flow")}</h2>
          <small>EUR</small>
        </div>
        <p className="hint">
          {t(
            "Recorded flows only; the current month and boundary months may be partial.",
          )}
        </p>
        {months.length ? (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={months}
                margin={{ left: -15, right: 10, top: 10, bottom: 0 }}
                accessibilityLayer
              >
                <defs>
                  <pattern
                    id="ledger-expense-stripe"
                    patternUnits="userSpaceOnUse"
                    width="6"
                    height="6"
                  >
                    <rect width="6" height="6" fill="#bea26b" />
                    <path
                      d="M-1 1L1 -1M0 6L6 0M5 7L7 5"
                      stroke="#a08042"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <CartesianGrid
                  stroke="#e5ebe7"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => String(v / 100)}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(v) => money(Number(v), lang)} />
                <Legend iconType="square" />
                <Bar
                  name={t("Income")}
                  dataKey="income"
                  fill="#3f7767"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  name={t("Expenses")}
                  dataKey="expense"
                  fill="url(#ledger-expense-stripe)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty">{t("No data yet")}</p>
        )}
        <details>
          <summary>{t("Data table")}</summary>
          <table>
            <thead>
              <tr>
                <th>{t("Month")}</th>
                <th>{t("Income")}</th>
                <th>{t("Expenses")}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th>{m.month}</th>
                  <td>{money(m.income, lang)}</td>
                  <td>{money(m.expense, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <section className="panel">
        <div className="section-head">
          <h2>{t("Expenses by category")}</h2>
          <small>EUR</small>
        </div>
        {dist.length ? (
          dist.map((d, i) => (
            <div className="category-row" key={d.category}>
              <span className="category-number">{i + 1}</span>
              <div>
                <span>{label(d.category, lang)}</span>
                <progress max={dist[0].cents} value={d.cents} />
              </div>
              <strong>{money(d.cents, lang)}</strong>
            </div>
          ))
        ) : (
          <p className="empty">{t("No data yet")}</p>
        )}
      </section>
    </div>
  );
}
