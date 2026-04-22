import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "dramaforge.db")

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    from db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate():
    """Apply incremental schema changes that SQLite can't auto-detect."""
    with engine.connect() as conn:
        _add_column_if_missing(conn, "boards", "video_path", "TEXT")
        _add_column_if_missing(conn, "boards", "audio_path", "TEXT")
        conn.commit()


def _add_column_if_missing(conn, table: str, column: str, col_type: str):
    from sqlalchemy import text
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    existing = {r[1] for r in rows}
    if column not in existing:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
