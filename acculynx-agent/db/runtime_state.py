"""Runtime state — operator-controlled toggles persisted across restarts.

Backs the dashboard kill-switch (DRY_RUN override). Backing store is a small
JSON file at data/runtime_state.json. Reads happen on every send (must be
cheap and crash-proof); writes happen rarely (one per operator click).

Why a file and not a DB row: the messaging dispatch path needs zero async
state to consult this flag. Keeps the SMS branch synchronous.

Schema:
    {
        "kill_switch": false,
        "kill_switch_reason": "",
        "kill_switch_actor": "",
        "kill_switch_updated_at": "2026-05-17T22:00:00+00:00"
    }
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, TypedDict

from config.settings import PROJECT_ROOT

log = logging.getLogger(__name__)

STATE_PATH = Path(PROJECT_ROOT) / "data" / "runtime_state.json"


class RuntimeState(TypedDict, total=False):
    kill_switch: bool
    kill_switch_reason: str
    kill_switch_actor: str
    kill_switch_updated_at: str


DEFAULTS: RuntimeState = {
    "kill_switch": False,
    "kill_switch_reason": "",
    "kill_switch_actor": "",
    "kill_switch_updated_at": "",
}


def _read() -> RuntimeState:
    if not STATE_PATH.exists():
        return dict(DEFAULTS)  # type: ignore[return-value]
    try:
        with STATE_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        merged = dict(DEFAULTS)
        if isinstance(data, dict):
            merged.update(data)
        return merged  # type: ignore[return-value]
    except Exception as exc:
        log.warning("runtime_state read failed (%s); using defaults", exc)
        return dict(DEFAULTS)  # type: ignore[return-value]


def _atomic_write(state: RuntimeState) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        prefix=".runtime_state.", suffix=".json", dir=str(STATE_PATH.parent)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, STATE_PATH)
    except Exception:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass
        raise


def get_kill_switch() -> bool:
    """True when the operator has flipped the system to FROZEN. Hot-path safe."""
    return bool(_read().get("kill_switch", False))


def get_state() -> RuntimeState:
    """Full state snapshot for the dashboard."""
    return _read()


def set_kill_switch(*, value: bool, reason: str = "", actor: str = "") -> RuntimeState:
    """Flip the kill switch. `reason` and `actor` go into the audit trail."""
    state = _read()
    state["kill_switch"] = bool(value)
    state["kill_switch_reason"] = reason or ""
    state["kill_switch_actor"] = actor or ""
    state["kill_switch_updated_at"] = datetime.now(timezone.utc).isoformat()
    _atomic_write(state)
    log.warning(
        "KILL_SWITCH flipped → %s (actor=%s reason=%s)",
        "FROZEN" if value else "LIVE",
        actor or "?",
        reason or "(none)",
    )
    return state


__all__ = ["get_kill_switch", "get_state", "set_kill_switch", "RuntimeState"]
