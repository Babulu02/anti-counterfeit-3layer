"""
backend/app/database.py
========================
SQLAlchemy engine and session factory.

get_db() is a FastAPI dependency that yields a session and closes it
after the request, even if an exception occurs.

For tests, the TEST_DB_NAME database is used instead — see conftest.py.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from .config import get_settings

settings = get_settings()

_db_url_str = str(settings.db_url())
_connect_args = {"check_same_thread": False} if "sqlite" in _db_url_str else {}

# Echo=False in production; set to True locally to see SQL
engine = create_engine(
    settings.db_url(),
    connect_args=_connect_args,
    pool_pre_ping=True,   # detect stale connections
    pool_recycle=3600,    # recycle connections after 1 h
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a DB session, always close on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
