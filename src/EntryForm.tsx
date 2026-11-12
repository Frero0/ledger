import { useState, useEffect, useRef } from "react";
import { Mic, Square, ArrowRight } from "lucide-react";
import {
  categories,
  cents,
  civil,
  today,
  type Transaction,
  type Lang,
  type Kind,
} from "./model";
import { translator, type Key } from "./i18n";
import { parsePhrase } from "./parser";
import { speechConstructor, type Recognition } from "./voice";
export default function EntryForm({
  initial,
  duplicate,
  lang,
  onSave,
  onCancel,
}: {
  initial?: Transaction;
  duplicate?: boolean;
  lang: Lang;
  onSave: (t: Transaction) => void;
  onCancel: () => void;
}) {
  const t = translator(lang);
  const [type, setType] = useState<Kind>(initial?.type || "expense"),
    [amount, setAmount] = useState(initial ? String(initial.cents / 100) : ""),
    [category, setCategory] = useState(initial?.category || "groceries"),
    [date, setDate] = useState(initial?.date || today()),
    [description, setDescription] = useState(initial?.description || ""),
    [errors, setErrors] = useState<Record<string, Key>>({}),
    [phrase, setPhrase] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof parsePhrase> | null>(
      null,
    ),
    [voiceLang, setVoiceLang] = useState(lang),
    [listening, setListening] = useState(false),
    [voiceError, setVoiceError] = useState<Key | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const supported = !!speechConstructor();
  useEffect(() => {
    setVoiceLang(lang);
  }, [lang]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      recognition.current?.abort();
    },
    [],
  );
  function listen() {
    const C = speechConstructor();
    if (!C) return;
    const r = new C();
    recognition.current = r;
    r.lang = voiceLang === "it" ? "it-IT" : "en-GB";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      setPhrase(e.results[0][0].transcript);
      setPreview(null);
    };
    r.onerror = (e) => {
      clearTimeout(timer.current);
      setListening(false);
      setVoiceError(
        e.error === "not-allowed"
          ? "Microphone permission denied."
          : e.error === "no-speech"
            ? "No speech detected or recognition timed out."
            : "Recognition unavailable. Use typed input.",
      );
    };
    r.onend = () => {
      clearTimeout(timer.current);
      setListening(false);
    };
    setVoiceError(null);
    try {
      r.start();
      setListening(true);
    } catch {
      setVoiceError("Recognition unavailable. Use typed input.");
    }
    timer.current = setTimeout(() => {
      if (recognition.current === r) {
        setVoiceError("No speech detected or recognition timed out.");
        r.stop();
        setListening(false);
      }
    }, 15000);
  }
  return (
    <section className="editor panel">
      <div className="section-head">
        <h1 ref={heading} tabIndex={-1}>
          {t(
            duplicate
              ? "Review duplicate"
              : initial
                ? "Edit transaction"
                : "Add transaction",
          )}
        </h1>
        <button onClick={onCancel}>{t("Cancel")}</button>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const problems: Record<string, Key> = {};
          const n = cents(amount);
          if (n === null)
            problems.amount =
              "Enter a positive amount with at most two decimal places.";
          if (!civil(date))
            problems.date = "Enter a valid civil date (1900–2100).";
          if (!categories.some((c) => c.id === category && c.type === type))
            problems.category = "Choose a compatible category.";
          if (description.length > 300)
            problems.description = "Description is limited to 300 characters.";
          setErrors(problems);
          if (Object.keys(problems).length) {
            setTimeout(
              () =>
                document
                  .querySelector<HTMLInputElement>("[aria-invalid=true]")
                  ?.focus(),
              0,
            );
            return;
          }
          onSave({
            id: initial && !duplicate ? initial.id : crypto.randomUUID(),
            type,
            cents: n!,
            category,
            date,
            description,
            ...(category.startsWith("legacy")
              ? {
                  needsReview: true,
                  legacyCategory: initial?.legacyCategory || category,
                }
              : {}),
          });
        }}
      >
        <div className="fields">
          <label>
            {t("Type")}
            <select
              value={type}
              onChange={(e) => {
                const k = e.target.value as Kind;
                setType(k);
                setCategory(k === "income" ? "salary" : "groceries");
              }}
            >
              <option value="expense">{t("Expenses")}</option>
              <option value="income">{t("Income")}</option>
            </select>
          </label>
          <label>
            {t("Amount")} · EUR
            <input
              aria-label={t("Amount")}
              value={amount}
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "amount-error" : undefined}
            />
            {errors.amount && (
              <small className="error" id="amount-error">
                {t(errors.amount)}
              </small>
            )}
          </label>
          <label>
            {t("Category")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories
                .filter(
                  (c) =>
                    c.type === type &&
                    (!c.id.startsWith("legacy") || initial?.category === c.id),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c[lang]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {t("Date")}
            <input
              aria-label={t("Date")}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={!!errors.date}
            />
            {errors.date && <small className="error">{t(errors.date)}</small>}
          </label>
          <label className="wide">
            {t("Description")}
            <input
              value={description}
              maxLength={300}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <button className="primary">
          {t("Save")}
          <ArrowRight size={16} />
        </button>
      </form>
      <details className="voice">
        <summary>{t("Optional text or voice input")}</summary>
        <p>
          {t(
            "Your browser may send audio to its recognition service. No recording or transcript is stored by Ledger.",
          )}
        </p>
        <label>
          {t("Voice language")}
          <select
            value={voiceLang}
            onChange={(e) => setVoiceLang(e.target.value as Lang)}
          >
            <option value="en">English</option>
            <option value="it">Italiano</option>
          </select>
        </label>
        <textarea
          aria-label={t("Optional text or voice input")}
          value={phrase}
          placeholder={t("expense groceries 24.50 yesterday")}
          onChange={(e) => {
            setPhrase(e.target.value);
            setPreview(null);
          }}
        />
        <div className="actions">
          <button disabled={!supported || listening} onClick={listen}>
            <Mic size={16} />
            {t(listening ? "Listening" : "Start listening")}
          </button>
          <button
            disabled={!listening}
            onClick={() => recognition.current?.stop()}
          >
            <Square size={14} />
            {t("Stop")}
          </button>
          <button
            onClick={() => {
              try {
                setPreview(parsePhrase(phrase));
                setVoiceError(null);
              } catch {
                setPreview(null);
                setVoiceError(
                  "Phrase is ambiguous or incomplete. Correct it before applying.",
                );
              }
            }}
          >
            {t("Preview fields")}
          </button>
        </div>
        {!supported && (
          <p>{t("Speech not supported. Typed phrases still work.")}</p>
        )}
        {voiceError && (
          <p role="status" className="error">
            {t(voiceError)}
          </p>
        )}
        {preview && (
          <div className="phrase-preview">
            <p>
              {t(preview.type === "income" ? "Income" : "Expenses")} ·{" "}
              {categories.find((c) => c.id === preview.category)?.[lang]} ·{" "}
              {preview.amount} EUR · {preview.date}
            </p>
            <button
              onClick={() => {
                setType(preview.type);
                setCategory(preview.category);
                setAmount(preview.amount);
                setDate(preview.date);
              }}
            >
              {t("Apply to form")}
            </button>
          </div>
        )}
      </details>
    </section>
  );
}
