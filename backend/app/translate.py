"""Chat message translation between English and Hindi via Claude.

Each message is translated once, at send time, into both supported languages and the
result is cached on the row. Readers get the version in their own language. Failures
never block sending; the message just shows untranslated.
"""

import json
import logging
from functools import lru_cache

from pydantic import BaseModel

from app.config import get_settings

log = logging.getLogger(__name__)

LANGS = ("en", "hi")

SYSTEM = """You translate short chat messages between a domestic worker and a household
in the San Francisco Bay Area. Users write in English, Hindi (Devanagari), or Hinglish
(Hindi in Latin letters, often mixed with English).

Return JSON with:
- "lang": the language the message is written in: "en" for English, "hi" for Hindi or
  Hinglish.
- "en": the message in natural, plain English.
- "hi": the message in natural, polite Hindi in Devanagari script.

Keep names, numbers, times, addresses, and phone numbers exactly as written. Preserve the
tone (casual stays casual). If the text is already in a language, return it unchanged for
that language. Do not add anything, do not explain."""

SCHEMA = {
    "type": "object",
    "properties": {
        "lang": {"type": "string", "enum": ["en", "hi"]},
        "en": {"type": "string"},
        "hi": {"type": "string"},
    },
    "required": ["lang", "en", "hi"],
    "additionalProperties": False,
}


class Translation(BaseModel):
    lang: str
    en: str
    hi: str


@lru_cache
def _client():
    import anthropic

    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


def translate(body: str) -> Translation | None:
    """Detect the language and produce both renderings. None if unavailable."""
    if not get_settings().anthropic_api_key:
        return None
    try:
        response = _client().beta.messages.create(
            model="claude-opus-5",
            max_tokens=1024,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": SCHEMA},
            },
            system=SYSTEM,
            messages=[{"role": "user", "content": body}],
        )
        if response.stop_reason == "refusal":
            log.warning("translation refused")
            return None
        text = next(b.text for b in response.content if b.type == "text")
        return Translation.model_validate(json.loads(text))
    except Exception:  # noqa: BLE001 - translation is best-effort
        log.exception("translation failed")
        return None
