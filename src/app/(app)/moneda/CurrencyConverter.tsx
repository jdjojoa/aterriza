"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { CurrencyFlag } from "@/components/ui/CurrencyFlag";
import {
  BASE_CURRENCY,
  CURRENCIES,
  convert,
  formatAmount,
  parseAmount,
  type Currency,
  type RatesPerPen,
} from "@/lib/currency";

const QUICK_PEN_AMOUNTS = [1, 5, 10, 20, 50];
const INITIAL_AMOUNT = 10;

type Side = 0 | 1;
type Pair = [Currency, Currency];

type State = {
  codes: Pair;
  texts: [string, string];
  /** Side the user typed in last; the other side is derived from it. */
  anchor: Side;
};

const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);

/** Two linked fields with a currency selector each; converts through PEN. */
export function CurrencyConverter({
  rates,
  available,
  initialPair,
}: {
  rates: RatesPerPen;
  /** Currencies with a rate (always includes PEN), in display order. */
  available: Currency[];
  initialPair: Pair;
}) {
  const derive = (value: number | null, from: Currency, to: Currency) => {
    if (value === null) return "";
    const result = convert(value, from, to, rates);
    return result === null ? "" : formatAmount(result, to);
  };

  /** Recomputes the non-anchor side from the anchor's value. */
  const build = (codes: Pair, anchor: Side, value: number | null): State => {
    const texts: [string, string] = ["", ""];
    texts[anchor] = value === null ? "" : formatAmount(value, codes[anchor]);
    texts[otherSide(anchor)] = derive(value, codes[anchor], codes[otherSide(anchor)]);
    return { codes, texts, anchor };
  };

  const [state, setState] = useState<State>(() => build(initialPair, 0, INITIAL_AMOUNT));
  const { codes, texts, anchor } = state;

  function handleChange(side: Side, text: string) {
    const value = parseAmount(text, codes[side]);
    const next: [string, string] = ["", ""];
    next[side] = text;
    next[otherSide(side)] = derive(value, codes[side], codes[otherSide(side)]);
    setState({ codes, texts: next, anchor: side });
  }

  function handleBlur(side: Side) {
    const value = parseAmount(texts[side], codes[side]);
    if (value === null) return;
    const next: [string, string] = [...texts];
    next[side] = formatAmount(value, codes[side]);
    setState({ ...state, texts: next });
  }

  function handleCurrency(side: Side, currency: Currency) {
    const value = parseAmount(texts[anchor], codes[anchor]);
    const nextCodes: Pair = [...codes];
    // Picking the currency already on the other side swaps them.
    if (codes[otherSide(side)] === currency) {
      nextCodes[otherSide(side)] = codes[side];
    }
    nextCodes[side] = currency;
    setState(build(nextCodes, anchor, value));
  }

  function swap() {
    setState({
      codes: [codes[1], codes[0]],
      texts: [texts[1], texts[0]],
      anchor: otherSide(anchor),
    });
  }

  function setPen(value: number) {
    const side: Side = codes[0] === BASE_CURRENCY ? 0 : 1;
    setState(build(codes, side, value));
  }

  const [from, to] = codes;
  const unitRate = convert(1, from, to, rates);
  const showQuickAmounts = codes.includes(BASE_CURRENCY);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
        <AmountField
          side={0}
          currency={from}
          value={texts[0]}
          available={available}
          onChange={handleChange}
          onBlur={handleBlur}
          onCurrency={handleCurrency}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            aria-label={`Invertir: convertir de ${CURRENCIES[to].name} a ${CURRENCIES[from].name}`}
            className="inline-flex size-11 items-center justify-center rounded-full border-2 border-primary-edge bg-surface text-heading transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="swap" />
          </button>
        </div>
        <AmountField
          side={1}
          currency={to}
          value={texts[1]}
          available={available}
          onChange={handleChange}
          onBlur={handleBlur}
          onCurrency={handleCurrency}
        />
      </div>

      {unitRate !== null && (
        <p className="font-bold text-heading" aria-live="polite">
          1 {from} = {formatAmount(unitRate, to)} {to}
        </p>
      )}

      {showQuickAmounts && (
        <section aria-labelledby="quick-amounts" className="flex flex-col gap-2">
          <h2 id="quick-amounts" className="text-sm font-bold text-heading">
            Montos rápidos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {QUICK_PEN_AMOUNTS.map((value) => (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => setPen(value)}
                  className="min-h-11 rounded-full border border-border bg-surface px-4 font-bold text-heading transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  S/ {value}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AmountField({
  side,
  currency,
  value,
  available,
  onChange,
  onBlur,
  onCurrency,
}: {
  side: Side;
  currency: Currency;
  value: string;
  available: Currency[];
  onChange: (side: Side, text: string) => void;
  onBlur: (side: Side) => void;
  onCurrency: (side: Side, currency: Currency) => void;
}) {
  const id = useId();
  const selectId = `${id}-currency`;
  const inputId = `${id}-amount`;
  const { name, symbol } = CURRENCIES[currency];
  const role = side === 0 ? "De" : "A";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="sr-only">
        Moneda ({role.toLowerCase()})
      </label>
      <div className="relative flex min-h-11 items-center gap-2 rounded-xl px-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-hover">
        <CurrencyFlag currency={currency} />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-heading">
          {name} ({currency})
        </span>
        <span className="shrink-0 text-muted">
          <Icon name="chevron-down" size={20} />
        </span>
        <select
          id={selectId}
          value={currency}
          onChange={(e) => onCurrency(side, e.target.value as Currency)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        >
          {available.map((code) => (
            <option key={code} value={code}>
              {CURRENCIES[code].name} ({code})
            </option>
          ))}
        </select>
      </div>
      <label htmlFor={inputId} className="sr-only">
        Monto en {name}
      </label>
      <div className="flex min-h-14 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <span aria-hidden="true" className="text-lg font-bold text-muted">
          {symbol}
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(side, e.target.value)}
          onBlur={() => onBlur(side)}
          className="w-full min-w-0 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted"
        />
        <span aria-hidden="true" className="text-sm font-bold text-muted">
          {currency}
        </span>
      </div>
    </div>
  );
}
