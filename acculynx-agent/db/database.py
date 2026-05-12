"""Database setup — creates tables and provides session factory.

Uses async SQLAlchemy with aiosqlite for non-blocking database access.
The database file lives at data/agent.db in the project root.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config.settings import settings
from db.models import Base

# Ensure data directory exists
data_dir = Path(settings.project_root) / "data"
data_dir.mkdir(exist_ok=True)

# Create async engine
engine = create_async_engine(settings.database_url, echo=False)

# Session factory — use this to get database sessions
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    """Create all tables if they don't exist, then run additive column migrations.

    SQLite doesn't support `CREATE TABLE IF NOT EXISTS` for *columns*, so we
    keep a small idempotent migration table here. Every entry runs `PRAGMA
    table_info` first to skip already-present columns. Drops + type changes
    are intentionally NOT handled here — those still need a manual ALTER.
    """
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        column_migrations = [
            ("approvals", "nudge_count", "INTEGER DEFAULT 0"),
            ("approvals", "last_nudge_at", "DATETIME"),
            ("approvals", "auto_sent_at_deadline", "BOOLEAN DEFAULT 0"),
            ("approvals", "auto_sent_at", "DATETIME"),
            ("leads", "rilla_transcript", "TEXT"),
            ("leads", "rilla_uploaded_at", "DATETIME"),
            ("message_queue", "scheduled_for", "DATETIME"),
        ]
        for table, col, decl in column_migrations:
            try:
                rows = (await conn.execute(text(f"PRAGMA table_info({table})"))).fetchall()
                existing = {r[1] for r in rows}
                if col not in existing:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {decl}"))
            except Exception:
                # Best-effort: a brand-new install creates the column via
                # Base.metadata.create_all already; PRAGMA-fail just means the
                # table doesn't exist yet, which is harmless.
                pass


async def get_session() -> AsyncSession:
    """Get a database session for use in API routes."""
    async with async_session() as session:
        yield session
