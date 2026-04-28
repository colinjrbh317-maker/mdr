"""Rep mapping loader.

Reads config/reps.yaml and resolves an AccuLynx user_id (or empty/None for
solo-sender mode) to the rep's send identity (name, email, sender_email,
title, phone).

The yaml schema:
    default_rep_email: <email>
    reps:
      - rep_id: "*" or "<acculynx-user-id>"
        name: "<display name>"
        first_name: "<first name>"
        email: "<rep's real inbox>"
        title: "<position>"
        signature_phone: "<phone>"
        sendgrid_sender_email: "<verified SendGrid sender>"
"""

from __future__ import annotations

import functools
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import yaml

from config.settings import settings

REPS_YAML = Path(__file__).resolve().parent / "reps.yaml"


@dataclass
class Rep:
    rep_id: str
    name: str
    first_name: str
    email: str
    title: str
    signature_phone: str
    sendgrid_sender_email: str

    @property
    def display(self) -> str:
        return f"{self.name} <{self.sendgrid_sender_email}>"


@functools.lru_cache(maxsize=1)
def _load_reps_yaml() -> dict:
    if not REPS_YAML.exists():
        return {"reps": [], "default_rep_email": settings.sendgrid_from_email}
    with REPS_YAML.open() as fp:
        return yaml.safe_load(fp) or {}


def _row_to_rep(row: dict) -> Rep:
    return Rep(
        rep_id=str(row.get("rep_id", "*")),
        name=row.get("name", "").strip() or "Modern Day Roofing",
        first_name=(row.get("first_name") or row.get("name", "").split()[0] if row.get("name") else "").strip(),
        email=row.get("email", "").strip(),
        title=row.get("title", "").strip(),
        signature_phone=row.get("signature_phone", "540-553-6007").strip(),
        sendgrid_sender_email=(
            row.get("sendgrid_sender_email")
            or row.get("email")
            or settings.sendgrid_from_email
        ).strip(),
    )


def resolve_rep(acculynx_user_id: Optional[str] = None) -> Rep:
    """Return the Rep that should sign / send for this lead.

    Solo-sender mode: always returns the wildcard rep.
    Otherwise: matches by acculynx_user_id, falling back to wildcard, then
    a default constructed from settings.
    """
    data = _load_reps_yaml()
    rows = data.get("reps", []) or []

    if settings.solo_sender_mode:
        for row in rows:
            if str(row.get("rep_id")) == "*":
                return _row_to_rep(row)

    if acculynx_user_id:
        for row in rows:
            if str(row.get("rep_id")) == str(acculynx_user_id):
                return _row_to_rep(row)

    for row in rows:
        if str(row.get("rep_id")) == "*":
            return _row_to_rep(row)

    return Rep(
        rep_id="default",
        name=settings.sendgrid_from_name,
        first_name=settings.sendgrid_from_name.split()[0] if settings.sendgrid_from_name else "",
        email=settings.sendgrid_from_email,
        title="",
        signature_phone="540-553-6007",
        sendgrid_sender_email=settings.sendgrid_from_email,
    )


def all_reps() -> list[Rep]:
    """All configured reps (used for the review web app's rep picker)."""
    data = _load_reps_yaml()
    return [_row_to_rep(r) for r in (data.get("reps") or [])]


__all__ = ["Rep", "resolve_rep", "all_reps"]
