"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  CURRENCIES,
  formatAmount,
  parseAmount,
  type Currency,
} from "@/lib/currency";

const QUICK_PEN_AMOUNTS = [1, 5, 10, 20, 50];

type Amounts = Record<Currency, string>;

/** Two linked fields (S/ and COP) that convert in both directions. */
export function CurrencyConverter({ rate }: { rate: number }) {
  const [order, setOrder] = useState<[Currency, Currency]>(["PEN", "COP"]);
  const [amounts, setAmounts] = useState<Amounts>(() => ({
    PEN: formatAmount(10, "PEN"),
    COP: formatAmount(10 * rate, "COP"),
  }));

  const convert = (value: number, from: Currency) =>
    from === "PEN" ? value * rate : value / rate;

  function handleChange(currency: Currency, text: string) {
    const other: Currency = currency === "PEN" ? "COP" : "PEN";
    const value = parseAmount(text, currency);
    setAmounts({
      [currency]: text,
      [other]: value === null ? "" : formatAmount(convert(value, currency), other),
    } as Amounts);
  }

  function handleBlur(currency: Currency) {
    const value = parseAmount(amounts[currency], currency);
    if (value !== null) {
      setAmounts((prev) => ({ ...prev, [currency]: formatAmount(value, currency) }));
    }
  }

  function setPen(value: number) {
    setAmounts({
      PEN: formatAmount(value, "PEN"),
      COP: formatAmount(convert(value, "PEN"), "COP"),
    });
  }

  const [top, bottom] = order;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
        <AmountField
          currency={top}
          value={amounts[top]}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setOrder([bottom, top])}
            aria-label={`Invertir: convertir de ${CURRENCIES[bottom].label} a ${CURRENCIES[top].label}`}
            className="inline-flex size-11 items-center justify-center rounded-full border-2 border-primary-edge bg-surface text-heading transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="swap" />
          </button>
        </div>
        <AmountField
          currency={bottom}
          value={amounts[bottom]}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </div>

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
    </div>
  );
}

function AmountField({
  currency,
  value,
  onChange,
  onBlur,
}: {
  currency: Currency;
  value: string;
  onChange: (currency: Currency, text: string) => void;
  onBlur: (currency: Currency) => void;
}) {
  const { label, symbol } = CURRENCIES[currency];
  const id = `amount-${currency.toLowerCase()}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-heading">
        {label}
      </label>
      <div className="flex min-h-14 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <span aria-hidden="true" className="text-lg font-bold text-muted">
          {symbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(currency, e.target.value)}
          onBlur={() => onBlur(currency)}
          className="w-full min-w-0 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted"
        />
        <span aria-hidden="true" className="text-sm font-bold text-muted">
          {currency}
        </span>
      </div>
    </div>
  );
}
