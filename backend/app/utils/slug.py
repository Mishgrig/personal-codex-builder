from __future__ import annotations

import re
import secrets
import string
from pathlib import Path

SLUG_PATTERN = re.compile(r"^card-[a-z0-9]{6}$")


def random_token(length: int = 6) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_card_slug() -> str:
    return f"card-{random_token(6)}"


def generate_uid() -> str:
    return f"uid-{random_token(10)}"


def validate_card_slug(slug: str) -> bool:
    return bool(SLUG_PATTERN.fullmatch(slug))


def slugify_name(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or Path(secrets.token_hex(3)).stem

