"""Drip eligibility gate -- blocks post-close nurture messages when the
job has unresolved issues.

A drip touch is only eligible if ALL of these are true:
  1. Job invoiced AND payment received in full (zero balance owed)
  2. Zero open punch-list items
  3. No unresolved disputes / active change orders

If any condition fails, the calling code skips the drip touch and may
notify the rep (escalation path is the caller's responsibility).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from acculynx import client as acculynx

__all__ = [
    "EligibilityResult",
    "check_drip_eligibility",
    "is_drip_content_type",
]

log = logging.getLogger(__name__)

# Content-type prefixes that require the drip safety gate.
_DRIP_PREFIXES = ("drip_t1_", "drip_t2_", "drip_t3_", "drip_t4_")

# Statuses that indicate an item is NOT resolved/closed.
_OPEN_STATUSES = frozenset({"open", "pending", "active", "in progress", "in_progress"})
# Statuses considered "done" -- anything NOT in here and NOT in APPROVED_STATUSES
# is treated as unresolved for change orders.
_DONE_STATUSES = frozenset({"approved", "complete", "completed", "closed", "paid", "voided"})


@dataclass
class EligibilityResult:
    ok: bool
    reasons: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _status_is_open(status: str | None) -> bool:
    """Return True if the status string represents an unresolved item."""
    if not status:
        return False  # no status -- can't tell; conservative = don't block
    s = status.strip().lower()
    if s in _OPEN_STATUSES:
        return True
    if s in _DONE_STATUSES:
        return False
    # Unknown status -- treat as open (conservative)
    return True


async def _check_balance(job: dict) -> str | None:
    """Return a reason string if balance is non-zero, None if fully paid.

    BLOCKING fallback: if balance cannot be determined at all, returns a
    blocking reason so money-related ambiguity never silently passes.
    """
    # Strategy 1: explicit outstandingBalance field
    outstanding = job.get("outstandingBalance")
    if outstanding is not None:
        try:
            if float(outstanding) > 0:
                return f"open balance: ${float(outstanding):,.2f}"
            return None  # paid in full
        except (TypeError, ValueError):
            log.warning("drip_safety: outstandingBalance unparseable: %r", outstanding)

    # Strategy 2: derive from totalAmount - paidAmount
    total = job.get("totalAmount")
    paid = job.get("paidAmount")
    if total is not None and paid is not None:
        try:
            balance = float(total) - float(paid)
            if balance > 0:
                return f"open balance: ${balance:,.2f}"
            return None
        except (TypeError, ValueError):
            log.warning(
                "drip_safety: totalAmount/paidAmount unparseable: total=%r paid=%r",
                total, paid,
            )

    # Strategy 3: check financials sub-object (AccuLynx v2 sometimes nests it)
    financials = job.get("financials") or {}
    if isinstance(financials, dict):
        outstanding = financials.get("outstandingBalance") or financials.get("balanceDue")
        if outstanding is not None:
            try:
                if float(outstanding) > 0:
                    return f"open balance: ${float(outstanding):,.2f}"
                return None
            except (TypeError, ValueError):
                log.warning("drip_safety: financials.outstandingBalance unparseable: %r", outstanding)

    # No usable balance data found -- BLOCK (never silently pass money check)
    log.warning(
        "drip_safety: job %s has no parseable balance fields; defaulting to BLOCK",
        job.get("id") or job.get("jobId") or "unknown",
    )
    return "balance unknown (no parseable financial fields in AccuLynx response)"


async def _check_punch_list(job_id: str) -> str | None:
    """Return a reason string if there are open punch-list items, else None.

    Tries /jobs/{id}/punch-list-items first, falls back to /jobs/{id}/work-items.
    404 / missing endpoint = no data = don't block (logs warning).
    """
    for path in (f"/jobs/{job_id}/punch-list-items", f"/jobs/{job_id}/work-items"):
        try:
            data = await acculynx.get_json(path)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                log.warning("drip_safety: endpoint not found: %s (skipping)", path)
                continue
            log.warning("drip_safety: HTTP %s on %s: %s", exc.response.status_code, path, exc)
            continue
        except Exception as exc:
            log.warning("drip_safety: failed to fetch %s: %s", path, exc)
            continue

        items = data if isinstance(data, list) else data.get("items", data.get("results", []))
        if not isinstance(items, list):
            log.warning("drip_safety: unexpected shape from %s: %r", path, type(items))
            continue

        open_items = [
            item for item in items
            if isinstance(item, dict) and _status_is_open(
                item.get("status") or item.get("Status")
            )
        ]
        if open_items:
            return f"{len(open_items)} open punch-list item(s)"
        # Endpoint responded successfully with no open items -- stop trying
        return None

    # No endpoint succeeded (both 404 or errored) -- don't block, just warn
    log.warning(
        "drip_safety: could not verify punch-list for job %s; assuming none", job_id
    )
    return None


async def _check_change_orders(job_id: str) -> str | None:
    """Return a reason string if there are unresolved change orders, else None.

    404 / missing endpoint = no data = don't block (logs warning).
    """
    path = f"/jobs/{job_id}/change-orders"
    try:
        data = await acculynx.get_json(path)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            log.warning("drip_safety: change-orders endpoint not found for job %s (skipping)", job_id)
            return None
        log.warning("drip_safety: HTTP %s on %s: %s", exc.response.status_code, path, exc)
        return None
    except Exception as exc:
        log.warning("drip_safety: failed to fetch change-orders for job %s: %s", job_id, exc)
        return None

    items = data if isinstance(data, list) else data.get("items", data.get("results", []))
    if not isinstance(items, list):
        log.warning("drip_safety: unexpected change-orders shape for job %s: %r", job_id, type(items))
        return None

    unresolved = [
        item for item in items
        if isinstance(item, dict) and (
            item.get("status") or item.get("Status") or ""
        ).strip().lower() not in _DONE_STATUSES
    ]
    if unresolved:
        return f"{len(unresolved)} unresolved change order(s)"
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def check_drip_eligibility(job_id: str) -> EligibilityResult:
    """Check whether a drip touch is eligible to send for the given job.

    Pulls job detail from AccuLynx public API v2, then cross-checks
    punch-list and change-order sub-endpoints.

    Returns EligibilityResult(ok=True) only when ALL three conditions pass:
      1. Balance is zero (invoiced and paid in full)
      2. No open punch-list items
      3. No unresolved change orders

    If the balance check itself throws a network/parse error, the gate
    defaults to BLOCK (ok=False) -- money ambiguity is never silently passed.
    """
    reasons: list[str] = []

    # -- Fetch core job record --------------------------------------------------
    try:
        job = await acculynx.get_json(f"/jobs/{job_id}")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            log.warning("drip_safety: job %s not found in AccuLynx (404); blocking drip", job_id)
            return EligibilityResult(ok=False, reasons=["job not found in AccuLynx (404)"])
        log.warning("drip_safety: HTTP %s fetching job %s; blocking drip", exc.response.status_code, job_id)
        return EligibilityResult(ok=False, reasons=[f"AccuLynx HTTP {exc.response.status_code} fetching job"])
    except Exception as exc:
        log.error("drip_safety: network error fetching job %s: %s; blocking drip", job_id, exc)
        return EligibilityResult(ok=False, reasons=[f"network error fetching job: {exc}"])

    # -- Check 1: balance -------------------------------------------------------
    # _check_balance itself returns a blocking reason if fields are missing/unparseable
    balance_reason = await _check_balance(job)
    if balance_reason:
        reasons.append(balance_reason)

    # -- Check 2: punch-list ----------------------------------------------------
    pl_reason = await _check_punch_list(job_id)
    if pl_reason:
        reasons.append(pl_reason)

    # -- Check 3: change orders -------------------------------------------------
    co_reason = await _check_change_orders(job_id)
    if co_reason:
        reasons.append(co_reason)

    return EligibilityResult(ok=len(reasons) == 0, reasons=reasons)


def is_drip_content_type(content_type: str) -> bool:
    """Return True if content_type belongs to a drip-campaign touch.

    Matches: drip_t1_*, drip_t2_*, drip_t3_*, drip_t4_*
    """
    ct = (content_type or "").strip().lower()
    return any(ct.startswith(prefix) for prefix in _DRIP_PREFIXES)
