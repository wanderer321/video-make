"""Simple symmetric encryption for API keys stored in SQLite."""
import os
import json
import base64
import hashlib
from cryptography.fernet import Fernet

KEY_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    ".keyfile",
)


def _get_or_create_key() -> bytes:
    os.makedirs(os.path.dirname(KEY_FILE), exist_ok=True)
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as f:
            return f.read()
    key = Fernet.generate_key()
    with open(KEY_FILE, "wb") as f:
        f.write(key)
    return key


def encrypt(data: dict) -> str:
    key = _get_or_create_key()
    f = Fernet(key)
    raw = json.dumps(data).encode()
    return f.encrypt(raw).decode()


def decrypt(token: str) -> dict:
    key = _get_or_create_key()
    f = Fernet(key)
    raw = f.decrypt(token.encode())
    return json.loads(raw)
