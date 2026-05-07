"""Hearth financing resolver -- computes 'around $X/month' for Touch 3.

MDR's financing partner is Hearth. This module produces the monthly-payment
language the agent injects into the financing value-add email (Touch 3,
ESTIMATE_FOLLOWUP). Defaults: 12% APR, 10-year term (Good-credit tier).

Phrasing is intentionally approximate ('around $X') because the actual
homeowner rate depends on credit pull. Never quote an exact number.

Source: Hearth tier disclosures, hearth.com -- see the Hearth informational
docs the product owner pulled. Tier defaults can be overridden per-rep
or per-customer by passing apr_pct and term_months to the resolver.
"""

from __future__ import annotations

from typing import Optional

__all__ = [
    "compute_monthly_payment",
    "round_to_nearest",
    "format_monthly_phrase",
    "resolve_financing_phrase",
]


def compute_monthly_payment(
    estimate_total: float,
    apr_pct: float = 12.0,
    term_months: int = 120,
) -> float:
    """Return the standard amortizing monthly payment (raw float).

    Uses the PMT formula:
        r = (apr_pct / 100) / 12
        payment = P * r * (1 + r)**n / ((1 + r)**n - 1)

    For a 0% APR edge case returns a simple principal-divided payment.
    """
    r = (apr_pct / 100.0) / 12.0
    if r == 0:
        return estimate_total / term_months
    factor = (1.0 + r) ** term_months
    return estimate_total * r * factor / (factor - 1.0)


def round_to_nearest(value: float, nearest: int = 5) -> int:
    """Round value to the nearest dollar increment.

    Examples:
        round_to_nearest(213.7, 5)  -> 215
        round_to_nearest(212.4, 5)  -> 210
        round_to_nearest(217.5, 5)  -> 220
    """
    return int(round(value / nearest) * nearest)


def format_monthly_phrase(
    estimate_total: Optional[float],
    *,
    apr_pct: float = 12.0,
    term_months: int = 120,
) -> Optional[str]:
    """Return 'around $X/month' or None if inputs are unusable.

    Returns None when:
    - estimate_total is None or <= 0
    - the computed monthly payment is implausibly low (< $20) or high (> $5000)
      which guards against bad data flowing in from AccuLynx

    The returned string never contains cents, e.g. 'around $215/month'.
    """
    if estimate_total is None or estimate_total <= 0:
        return None

    monthly = compute_monthly_payment(estimate_total, apr_pct=apr_pct, term_months=term_months)

    if monthly < 20 or monthly > 5000:
        return None

    rounded = round_to_nearest(monthly, nearest=5)
    return f"around ${rounded}/month"


def resolve_financing_phrase(lead_context: dict) -> dict:
    """High-level entry point used by the drafter to get the financing phrase.

    Accepted estimate keys (checked in priority order):
      1. "estimate_total_cents"  -- integer cents, divided by 100
      2. "estimate_total"        -- dollars (float or int)
      3. "approved_estimate_amount" -- AccuLynx native field, dollars

    Returns a dict with:
      - {"phrase": str, "estimate_used": float, "apr_pct": float, "term_months": int}
        when a usable estimate is found, OR
      - {"phrase": None, "reason": str}
        when no usable estimate is available.

    The drafter substitutes phrase for $[X]/month in templates when present,
    or falls back to vaguer language when phrase is None.
    """
    apr_pct = 12.0
    term_months = 120

    estimate_total: Optional[float] = None

    cents = lead_context.get("estimate_total_cents")
    if cents is not None:
        try:
            estimate_total = float(cents) / 100.0
        except (TypeError, ValueError):
            estimate_total = None

    if estimate_total is None:
        raw = lead_context.get("estimate_total")
        if raw is not None:
            try:
                estimate_total = float(raw)
            except (TypeError, ValueError):
                estimate_total = None

    if estimate_total is None:
        raw = lead_context.get("approved_estimate_amount")
        if raw is not None:
            try:
                estimate_total = float(raw)
            except (TypeError, ValueError):
                estimate_total = None

    if estimate_total is None or estimate_total <= 0:
        return {"phrase": None, "reason": "no estimate amount in lead context"}

    phrase = format_monthly_phrase(estimate_total, apr_pct=apr_pct, term_months=term_months)

    if phrase is None:
        return {"phrase": None, "reason": "computed monthly payment outside plausible range"}

    return {
        "phrase": phrase,
        "estimate_used": estimate_total,
        "apr_pct": apr_pct,
        "term_months": term_months,
    }


if __name__ == "__main__":
    samples = [5_000, 10_000, 15_000, 20_000, 30_000]
    print("Hearth financing sanity check -- 12% APR / 120 months (Good-credit tier)")
    print(f"{'Estimate':>12}  {'Raw monthly':>14}  {'Phrase'}")
    print("-" * 52)
    for total in samples:
        raw = compute_monthly_payment(total)
        phrase = format_monthly_phrase(total)
        print(f"${total:>10,}  ${raw:>13.2f}  {phrase}")
