"""Parse SendGrid Inbound Parse webhook payloads.

SendGrid posts a multipart/form-data body. The fields we care about:
  to       — the recipient address(es), our reply+<lead_id>@reply.<domain>
  from     — the homeowner's email
  subject  — what they typed
  text     — plaintext body
  html     — html body (often present)
  headers  — full RFC headers, used to extract In-Reply-To / References

We extract lead_id from the sub-addressed To value (reply+ABC@reply.x.com → ABC),
fall back to In-Reply-To matching against MessageQueue.rfc_message_id if the
sub-address is missing or malformed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


SUBADDR_PATTERN = re.compile(r"reply\+([^@\s>]+)@", re.IGNORECASE)


@dataclass
class InboundEmail:
    raw_to: str
    from_email: str
    from_name: Optional[str]
    subject: str
    text: str
    html: str
    in_reply_to: Optional[str]
    references: list[str]
    extracted_lead_id: Optional[str]


def _strip_brackets(addr: str) -> str:
    addr = addr.strip()
    if "<" in addr and ">" in addr:
        m = re.search(r"<([^>]+)>", addr)
        if m:
            return m.group(1).strip()
    return addr


def _split_name_addr(value: str) -> tuple[str, Optional[str]]:
    """Returns (email, name)."""
    if not value:
        return "", None
    if "<" in value and ">" in value:
        name = value.split("<", 1)[0].strip().strip('"').strip()
        email = re.search(r"<([^>]+)>", value).group(1).strip()
        return email, name or None
    return value.strip(), None


def parse_payload(form: dict[str, str]) -> InboundEmail:
    """Convert a SendGrid inbound-parse form payload into InboundEmail."""
    raw_to = form.get("to", "") or form.get("To", "")
    raw_from = form.get("from", "") or form.get("From", "")
    subject = form.get("subject", "") or form.get("Subject", "")
    text = form.get("text", "") or ""
    html = form.get("html", "") or ""
    headers_blob = form.get("headers", "") or ""

    from_email, from_name = _split_name_addr(raw_from)

    in_reply_to = None
    references: list[str] = []
    if headers_blob:
        for line in headers_blob.splitlines():
            if line.lower().startswith("in-reply-to:"):
                in_reply_to = line.split(":", 1)[1].strip()
            elif line.lower().startswith("references:"):
                refs_blob = line.split(":", 1)[1].strip()
                references = re.findall(r"<[^>]+>", refs_blob)

    lead_id = None
    m = SUBADDR_PATTERN.search(_strip_brackets(raw_to))
    if m:
        lead_id = m.group(1)

    return InboundEmail(
        raw_to=raw_to,
        from_email=from_email,
        from_name=from_name,
        subject=subject,
        text=text,
        html=html,
        in_reply_to=in_reply_to,
        references=references,
        extracted_lead_id=lead_id,
    )
