from __future__ import annotations

from typing import Any


def extract_plain_text(node: Any) -> str:
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return " ".join(part for item in node for part in [extract_plain_text(item)] if part).strip()
    if not isinstance(node, dict):
        return ""

    pieces: list[str] = []
    if node.get("type") == "text":
        text = str(node.get("text", "")).strip()
        if text:
            pieces.append(text)
    for child in node.get("content", []) or []:
        text = extract_plain_text(child)
        if text:
            pieces.append(text)
    return " ".join(piece for piece in pieces if piece).strip()

