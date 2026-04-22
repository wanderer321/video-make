from typing import Generator
from sqlalchemy.orm import Session
from db.database import get_db
from fastapi import Depends


def get_session() -> Generator[Session, None, None]:
    yield from get_db()


DbSession = Depends(get_session)
