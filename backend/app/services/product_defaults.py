from __future__ import annotations

from typing import Any

PRODUCT_UI_PREFERENCES: dict[str, Any] = {
    "product_mode_labels": {
        "crud": "Prep",
        "play": "Play",
    },
    "workspace_display_name": "World",
    "chapter_display_name": "Chapter",
    "home_layout_preset": "worldbuilder",
}


def merge_product_ui_preferences(value: dict[str, Any] | None) -> dict[str, Any]:
    preferences = dict(value or {})
    product_mode_labels = dict(PRODUCT_UI_PREFERENCES["product_mode_labels"])
    product_mode_labels.update(
        preferences.get("product_mode_labels")
        if isinstance(preferences.get("product_mode_labels"), dict)
        else {}
    )
    return {
        **PRODUCT_UI_PREFERENCES,
        **preferences,
        "product_mode_labels": product_mode_labels,
    }
