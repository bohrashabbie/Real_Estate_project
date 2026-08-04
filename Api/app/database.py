from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models.base import Base

__all__ = ["Base", "engine", "SessionLocal", "get_db"]

# The database is local (Docker on the same machine), so connections are cheap.
# The pool is still sized to comfortably cover FastAPI's sync-route threadpool:
#   pool_pre_ping = True  — a stale connection surfaces as a 500 otherwise
#   pool_recycle = 1800   — stay under server-side idle timeouts
#   pool_timeout = 30     — fail with a clear pool-exhaustion error, not a hang
engine = create_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_timeout=30,
    connect_args={"prepare_threshold": None},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
