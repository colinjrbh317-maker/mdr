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
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Get a database session for use in API routes."""
    async with async_session() as session:
        yield session
