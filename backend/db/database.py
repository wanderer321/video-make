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
    from sqlalchemy import text
    with engine.connect() as conn:
        _add_column_if_missing(conn, "boards", "video_path", "TEXT")
        _add_column_if_missing(conn, "boards", "audio_path", "TEXT")
        _add_column_if_missing(conn, "boards", "has_video", "INTEGER DEFAULT 0")
        _add_column_if_missing(conn, "boards", "prompt_en", "TEXT")
        _add_column_if_missing(conn, "projects", "workflow_step", "INTEGER DEFAULT 1")
        _add_column_if_missing(conn, "projects", "breakdown_result", "JSON")
        _add_column_if_missing(conn, "shots", "prompt_en", "TEXT")
        _add_column_if_missing(conn, "shots", "characters", "JSON")
        # Create shots table if not exists
        _create_shots_table_if_missing(conn)
        conn.commit()


def _create_shots_table_if_missing(conn):
    """Create shots table for segment→shot architecture."""
    from sqlalchemy import text
    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='shots'"))
    if not result.fetchone():
        conn.execute(text("""
            CREATE TABLE shots (
                id TEXT PRIMARY KEY,
                board_id TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                prompt TEXT,
                shot_size TEXT DEFAULT '中景',
                camera_angle TEXT DEFAULT '固定',
                duration_sec REAL DEFAULT 2.0,
                image_path TEXT,
                has_image INTEGER DEFAULT 0,
                FOREIGN KEY (board_id) REFERENCES boards(id)
            )
        """))
        conn.execute(text("CREATE INDEX idx_shots_board_id ON shots(board_id)"))


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
