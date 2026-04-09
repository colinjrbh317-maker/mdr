import { useState } from "react";

const TERM_OPTIONS = [3, 5, 7, 10, 12, 15];
const FINANCING_FEE = 0.10;

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function calculate(projectCost: number, apr: number, termYears: number) {
  const principal = projectCost * (1 + FINANCING_FEE);
  const monthlyRate = apr / 100 / 12;
  const n = termYears * 12;

  if (monthlyRate === 0) {
    const monthly = principal / n;
    return { monthly, total: principal, interest: principal - projectCost };
  }

  const monthly =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
    (Math.pow(1 + monthlyRate, n) - 1);
  const total = monthly * n;
  const interest = total - projectCost;

  return { monthly, total, interest };
}

export default function FinanceCalculator() {
  const [cost, setCost] = useState(15000);
  const [term, setTerm] = useState(10);
  const [apr, setApr] = useState(9.99);
  const [showTooltip, setShowTooltip] = useState(false);

  const { monthly, total, interest } = calculate(cost, apr, term);

  return (
    <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 md:p-8">
      <h3 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-6">
        Payment Calculator
      </h3>

      {/* Project Cost Slider */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-[var(--color-text-body)]">
            Project Cost
          </label>
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            {fmt.format(cost)}
          </span>
        </div>
        <input
          type="range"
          min={5000}
          max={50000}
          step={500}
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
        />
        <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
          <span>$5,000</span>
          <span>$50,000</span>
        </div>
      </div>

      {/* Loan Term Buttons */}
      <div className="mb-6">
        <label className="text-sm font-medium text-[var(--color-text-body)] block mb-2">
          Loan Term
        </label>
        <div className="flex flex-wrap gap-2">
          {TERM_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                term === t
                  ? "bg-[var(--color-accent)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              }`}
            >
              {t} yr
            </button>
          ))}
        </div>
      </div>

      {/* APR Slider */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-[var(--color-text-body)]">
            APR
          </label>
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            {apr.toFixed(2)}%
          </span>
        </div>
        <input
          type="range"
          min={5.99}
          max={17.99}
          step={0.5}
          value={apr}
          onChange={(e) => setApr(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
        />
        <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
          <span>5.99%</span>
          <span>17.99%</span>
        </div>
      </div>

      {/* Results */}
      <div className="bg-[var(--color-bg-light,#F7F7F5)] rounded-xl p-6 mb-6">
        <div className="text-center mb-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">
            Estimated Monthly Payment
          </p>
          <p className="text-4xl md:text-5xl font-bold text-[var(--color-accent)]">
            {fmt.format(monthly)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">/month</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">
              Total Cost of Loan
            </p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">
              {fmt.format(total)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">
              Total Interest Paid
            </p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">
              {fmt.format(interest)}
            </p>
          </div>
        </div>

        {/* Financing fee note */}
        <div className="flex items-center justify-center gap-1 mt-4 text-xs text-[var(--color-text-muted)]">
          <span>Includes 10% financing fee</span>
          <span
            className="relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-border)] text-[10px] font-bold cursor-pointer select-none"
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            i
            {showTooltip && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-[var(--color-bg-darker,#111)] text-white text-[11px] leading-snug z-10 shadow-lg">
                A 10% dealer fee is added to the project cost by the financing
                provider. This is standard for contractor financing and is
                included in your loan amount.
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        Estimated rates shown. Actual rates determined by your lender based on
        credit review. Default rate shown is a mid-range estimate — your actual
        rate may be lower based on your credit profile.
      </p>
    </div>
  );
}
