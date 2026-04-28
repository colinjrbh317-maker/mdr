"""FastAPI application — the MDR AI Sales Agent server.

This is the central hub that ties everything together:
- Webhook receiver (AccuLynx sends events here)
- Approval endpoints (reps click approve/edit/skip from email links)
- Dashboard API (serves metrics for the management dashboard)
- Health check (proves the server is running)

Start with: uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from api.approvals import router as approvals_router
from api.review import router as review_router
from api.webhooks import router as webhooks_router
from config.settings import settings
from db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""
    # ── Startup ──
    print("🚀 MDR AI Sales Agent starting up...")
    await init_db()
    print("✅ Database initialized")
    print(f"📡 AccuLynx polling every {settings.acculynx_poll_interval_minutes} minutes")
    print(f"🕐 Business hours: {settings.business_hours_start}:00-{settings.business_hours_end}:00")
    print(f"📂 SOPs loaded from: {settings.sops_directory}")
    print(f"🛡  DRY_RUN: {settings.dry_run}  MESSAGING_CHANNELS: {settings.messaging_channels}  SOLO_SENDER: {settings.solo_sender_mode}")

    # Start the scheduler unless disabled (e.g., during local testing)
    import os
    if os.environ.get("DISABLE_SCHEDULER", "").lower() not in ("1", "true", "yes"):
        from engine.scheduler import start_scheduler
        start_scheduler()
        print("⏱  Scheduler started (sync 15m, cadence 5m, escalation 30m)")
    else:
        print("⏱  Scheduler DISABLED via DISABLE_SCHEDULER env")

    yield

    # ── Shutdown ──
    from engine.scheduler import stop_scheduler
    stop_scheduler()
    print("👋 MDR AI Sales Agent shutting down...")


app = FastAPI(
    title="MDR AI Sales Agent",
    description="AI-powered sales follow-up system for Modern Day Roofing",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow CORS for dashboard frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(review_router)
app.include_router(approvals_router)
app.include_router(webhooks_router)


@app.get("/")
async def root():
    return RedirectResponse(url="/review")


# ── Health Check ──

@app.get("/health")
async def health():
    """Proves the server is alive. Hit this to verify deployment."""
    return {
        "status": "healthy",
        "service": "mdr-ai-sales-agent",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "config": {
            "poll_interval_min": settings.acculynx_poll_interval_minutes,
            "business_hours": f"{settings.business_hours_start}:00-{settings.business_hours_end}:00",
            "stale_threshold_hours": settings.stale_threshold_hours,
            "max_contact_attempts": settings.max_contact_attempts,
            "acculynx_connected": bool(settings.acculynx_api_key),
            "twilio_configured": bool(settings.twilio_account_sid),
            "sendgrid_configured": bool(settings.sendgrid_api_key),
            "claude_configured": bool(settings.anthropic_api_key),
        },
    }


# ── Placeholder routes (built out in later phases) ──

@app.get("/api/pipeline")
async def get_pipeline():
    """Returns current pipeline summary from local database."""
    return {"message": "Pipeline endpoint — coming in Phase 2B"}


@app.get("/api/dashboard/metrics")
async def dashboard_metrics():
    """Returns metrics for the management dashboard."""
    return {"message": "Dashboard metrics — coming in Phase 2E"}
