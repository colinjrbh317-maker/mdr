"""Centralized settings loaded from .env, the single source of truth for all config."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent
# Two-pass dotenv load:
# 1. Override env vars that are explicitly EMPTY in the shell (the bug case
#    where a parent shell exported `KEY=`). Preserves real shell overrides.
# 2. Load normally for unset keys.
import os as _os
from dotenv import dotenv_values as _dotenv_values
_env_file = PROJECT_ROOT / ".env"
if _env_file.exists():
    for k, v in (_dotenv_values(_env_file) or {}).items():
        if v is None:
            continue
        existing = _os.environ.get(k)
        if existing is None or existing == "":
            _os.environ[k] = v


class Settings(BaseSettings):
    """All configuration for the MDR AI Sales Agent."""

    # ── AccuLynx ──
    acculynx_api_key: str = Field(default="", description="AccuLynx API v2 Bearer token")
    acculynx_base_url: str = "https://api.acculynx.com/api/v2"
    acculynx_poll_interval_minutes: int = 15

    # ── Anthropic (Claude) ──
    anthropic_api_key: str = Field(default="", description="Claude API key for message drafting")
    claude_model: str = "claude-sonnet-4-6"

    # ── Twilio (SMS), gated off until A2P approval ──
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # ── SendGrid (Email) ──
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "colin@socialtheorymedia.com"
    sendgrid_from_name: str = "Modern Day Roofing"
    sendgrid_reply_subdomain: str = "reply.socialtheorymedia.com"
    reply_to_override: str = ""

    # ── Channel routing ──
    # Comma-separated. SMS deferred until Twilio A2P. Flip to "email,sms" later.
    messaging_channels: str = "email"

    # ── Solo-sender mode (MVP bootstrap) ──
    # When true, every approval routes to the default rep regardless of AccuLynx assignment.
    # Flip to false after Austin onboards the team and reps.yaml has real per-rep entries.
    solo_sender_mode: bool = True

    # ── Safety: dry run ──
    # When true, drafts are produced but no outbound mail is sent. Default safe.
    dry_run: bool = True

    # ── Test allowlist ──
    # Comma-separated AccuLynx job IDs. When set, ONLY these leads can receive real sends.
    test_lead_allowlist: str = ""

    # ── Business Hours ──
    business_hours_start: int = 8
    business_hours_end: int = 18
    business_days: list[str] = ["mon", "tue", "wed", "thu", "fri", "sat"]

    # ── Stale Lead Thresholds ──
    stale_threshold_hours: int = 48
    max_contact_attempts: int = 12

    # ── Database ──
    database_url: str = f"sqlite+aiosqlite:///{PROJECT_ROOT / 'data' / 'agent.db'}"

    # ── Paths ──
    sops_directory: str = str(PROJECT_ROOT / "sops")
    project_root: str = str(PROJECT_ROOT)

    # ── Rep Approval ──
    approval_timeout_hours: int = 4
    escalation_email: str = ""
    jwt_secret: str = ""

    # ── App URL (Railway/local) for magic links ──
    app_base_url: str = "http://localhost:8000"

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
