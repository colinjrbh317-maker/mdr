"""Inbound-reply classifier.

Reads a homeowner's email/SMS reply, returns intent + confidence + category so
the webhook handler can decide:
  - high-confidence objective question  -> auto-reply after 2-3 min delay
  - dead lead / change of plans         -> empathy + door-open, pause cadence
  - objection / complaint / pricing     -> escalate to assigned rep + CC Sierra
  - everything else                     -> pause + email rep for manual reply

Uses Claude. Returns a strict JSON shape; on parse failure or low confidence,
falls back to intent=other so the caller routes to the safe manual path.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

from anthropic import Anthropic

from config.settings import settings

log = logging.getLogger(__name__)

_client: Optional[Anthropic] = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


# Intents the auto-reply tree understands. "other" is the safe-fallback bucket
# that routes through the original "pause + email rep" path.
INTENTS = (
    "objective_question",
    "scheduling",
    "objection",
    "complaint",
    "dead_lead",
    "other",
)

# Categories used inside objective_question. Only these get auto-replied to
# (configured in webhook handler); everything else pauses cadence for the rep.
SAFE_AUTO_REPLY_CATEGORIES = ("warranty", "financing", "hours", "process")


@dataclass
class InboundClassification:
    intent: str
    category: Optional[str]
    confidence: float
    reasoning: str
    raw_response: str


SYSTEM_PROMPT = """You classify inbound homeowner replies for a roofing contractor's AI sales agent.

Output: STRICT JSON, no preamble, no markdown fences. Schema:
{
  "intent": "objective_question" | "scheduling" | "objection" | "complaint" | "dead_lead" | "other",
  "category": "warranty" | "financing" | "hours" | "process" | "pricing" | "other" | null,
  "confidence": 0.0-1.0,
  "reasoning": "one short sentence"
}

DEFINITIONS:
- objective_question: homeowner asks a factual question with a knowable answer ("what's your warranty?", "are you GAF certified?", "how does the financing work?"). category names the topic.
- scheduling: homeowner wants to book/move/confirm an appointment. category=null.
- objection: homeowner is pushing back on price, timing, or details ("can you come down on price?", "the other quote was cheaper", "I'm not sure I want to do this yet"). category="pricing" when about price.
- complaint: homeowner is unhappy with something MDR did or said. category=null.
- dead_lead: homeowner is opting out / no longer interested ("we're selling", "we decided to go with someone else", "take us off the list", "we changed our minds"). category=null.
- other: anything else, OR you're unsure. Set low confidence.

CONFIDENCE GUIDANCE:
- 0.95+: textbook example of the intent, no ambiguity
- 0.85-0.94: clear but minor wording ambiguity
- 0.70-0.84: probably right but a rep should double-check
- <0.70: uncertain; the system will route to the rep regardless

PRIVACY: ignore signatures, email footers, quoted prior emails. Classify the homeowner's NEW message only.
"""


def _parse_json_response(text: str) -> dict:
    """Pull the first JSON object out of Claude's reply. Tolerant of extra prose."""
    text = text.strip()
    # Direct parse first
    try:
        return json.loads(text)
    except Exception:
        pass
    # Pull JSON object out of mixed text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


async def classify_inbound(
    *,
    homeowner_text: str,
    rep_first_name: Optional[str] = None,
    lead_name: Optional[str] = None,
) -> InboundClassification:
    """Classify a homeowner reply. Synchronous Anthropic call wrapped in a thread."""
    if not (homeowner_text or "").strip():
        return InboundClassification("other", None, 0.0, "empty body", "")

    user_prompt = f"""HOMEOWNER REPLY:
\"\"\"
{homeowner_text.strip()[:4000]}
\"\"\"

Context: this is a reply to a follow-up the assigned rep ({rep_first_name or 'a rep'}) sent about a roofing job for {lead_name or 'this homeowner'}.

Output the JSON now."""

    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.claude_model,
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    except Exception as exc:
        log.exception("inbound classifier API call failed")
        return InboundClassification("other", None, 0.0, f"api error: {exc}", "")

    parsed = _parse_json_response(raw)
    intent = parsed.get("intent") or "other"
    if intent not in INTENTS:
        intent = "other"
    try:
        confidence = float(parsed.get("confidence") or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))
    category = parsed.get("category") or None
    if isinstance(category, str):
        category = category.strip().lower() or None
    reasoning = (parsed.get("reasoning") or "")[:280]

    return InboundClassification(
        intent=intent,
        category=category,
        confidence=confidence,
        reasoning=reasoning,
        raw_response=raw,
    )
