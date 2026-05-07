"""Write internal notes back to AccuLynx after the agent sends a message.

This is the audit trail that lets reps see what the agent did from inside
AccuLynx (so a rep opening a job sees both their own actions AND any AI
follow-ups in one timeline).

Every note is prefixed with [AI Agent] so it's visually distinct AND so the
collision-detection logic in engine/sync.check_recent_activity() can tell
agent activity apart from human activity.
"""

from __future__ import annotations

import logging
from typing import Optional

from acculynx import client

log = logging.getLogger(__name__)

AI_PREFIX = "[AI Agent]"


def _build_message_note(
    *,
    channel: str,
    contact_name: str,
    subject: Optional[str],
    body_preview: str,
    sent_via: str,
) -> str:
    """Format a single-line note describing what the agent sent."""
    preview = body_preview.strip().replace("\n", " ")
    if len(preview) > 200:
        preview = preview[:197] + "..."
    parts = [f"{AI_PREFIX} {channel.upper()} sent to {contact_name} via {sent_via}"]
    if subject:
        parts.append(f"Subject: {subject}")
    parts.append(f"Body: {preview}")
    return " | ".join(parts)


async def log_send_to_acculynx(
    *,
    job_id: str,
    channel: str,
    contact_name: str,
    body: str,
    subject: Optional[str] = None,
    sent_via: str = "SendGrid",
) -> bool:
    """Post an internal note on the AccuLynx job timeline. Returns True on success."""
    note = _build_message_note(
        channel=channel,
        contact_name=contact_name or "Homeowner",
        subject=subject,
        body_preview=body,
        sent_via=sent_via,
    )
    # Land the note in the AccuLynx Communications tab via the internal v4
    # endpoint. The public REST API does not have a "create note/message"
    # path — verified empirically. The internal-API Comment POST is the
    # only path reps actually see. Cookie-dependent; degrades gracefully
    # if cookies expire.
    from acculynx.internal_api import post_comment
    new_id = await post_comment(job_id, note)
    if new_id:
        log.info("AccuLynx note posted to job %s (comment_id=%s)", job_id, new_id)
        return True
    log.warning("AccuLynx note write failed for %s (cookies expired or network)", job_id)
    return False
