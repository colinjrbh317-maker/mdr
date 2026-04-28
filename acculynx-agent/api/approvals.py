"""Approval routes — what the rep clicks from their email.

Routes:
  GET  /api/approvals/{message_id}/approve?token=XXX
  GET  /api/approvals/{message_id}/edit?token=XXX     -> renders edit form
  POST /api/approvals/{message_id}/edit?token=XXX     -> save edit + send
  GET  /api/approvals/{message_id}/skip?token=XXX     -> skip + advance cadence

Token is JWT-signed (24h expiry). Decision routes are GET so they work
straight from email links without JavaScript. POST is reserved for the
edit form submission.
"""

from __future__ import annotations

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse

from engine.approval_flow import (
    approve_and_send,
    get_pending_message,
    record_edit,
    skip,
    verify_token,
)

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def _page(title: str, body_html: str, color: str = "#1B1B1B") -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{title}</title>
<style>
  body {{ margin:0;background:#f7f7f5;font-family:-apple-system,Segoe UI,sans-serif;color:#1B1B1B;line-height:1.55; }}
  .wrap {{ max-width:600px;margin:60px auto;background:#fff;border:1px solid #E5E1DA;border-radius:12px;overflow:hidden; }}
  .head {{ background:{color};color:#fff;padding:18px 24px;border-bottom:4px solid #C0392B; }}
  .head h1 {{ margin:0;font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800; }}
  .body {{ padding:24px; }}
  pre {{ background:#FAFAF8;border:1px solid #E5E1DA;border-radius:8px;padding:14px;white-space:pre-wrap;font-family:-apple-system,sans-serif;font-size:14px; }}
  textarea, input {{ width:100%;padding:10px;border:1px solid #E5E1DA;border-radius:8px;font:inherit; }}
  textarea {{ min-height:240px;font-family:ui-monospace,monospace;font-size:13px; }}
  button, .btn {{ background:#C0392B;color:#fff;border:0;padding:12px 18px;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block; }}
  .btn.cancel {{ background:#fff;color:#1B1B1B;border:1px solid #E5E1DA; }}
</style></head><body><div class="wrap"><div class="head"><h1>{title}</h1></div><div class="body">{body_html}</div></div></body></html>"""


def _require(message_id: int, token: str):
    if not verify_token(message_id, token):
        raise HTTPException(403, "Invalid or expired token")


@router.get("/{message_id}/approve", response_class=HTMLResponse)
async def approve_endpoint(message_id: int, token: str = "") -> str:
    _require(message_id, token)
    msg = await get_pending_message(message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.status not in ("pending", "edited"):
        return _page("Already decided", f"<p>This draft was already <b>{msg.status}</b>. Nothing more to do.</p>")
    result = await approve_and_send(message_id)
    if result.get("dry_run"):
        body = f"""<p><b>DRY_RUN mode is on.</b> Send was simulated, no email actually delivered.</p>
        <p>External id: {result.get('external_message_id')}</p>
        <p>Status now: <b>{result.get('status')}</b></p>"""
    elif result.get("sent"):
        body = f"""<p>Approved and sent. ✓</p>
        <p>SendGrid id: {result.get('external_message_id')}</p>
        <p>An internal note was logged to AccuLynx.</p>"""
    else:
        body = f"""<p>Approval recorded but send failed: {result.get('error') or result.get('blocked_reason')}</p>"""
    return _page("Approved", body, color="#16a34a")


@router.get("/{message_id}/edit", response_class=HTMLResponse)
async def edit_form(message_id: int, token: str = "") -> str:
    _require(message_id, token)
    msg = await get_pending_message(message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.status not in ("pending", "edited"):
        return _page("Already decided", f"<p>This draft was already <b>{msg.status}</b>.</p>")
    body = msg.body_edited or msg.body or ""
    subject = msg.subject or ""
    form = f"""
      <form method="post" action="/api/approvals/{message_id}/edit?token={token}">
        {f'<label><b>Subject</b><input type="text" name="subject" value="{subject}"></label><br><br>' if msg.channel == 'email' else ''}
        <label><b>Body</b><textarea name="body" required>{body}</textarea></label>
        <br><br>
        <button type="submit">Save and Send</button>
        <a href="/api/approvals/{message_id}/approve?token={token}" class="btn cancel">Send original (no edit)</a>
      </form>
    """
    return _page("Edit before sending", form)


@router.post("/{message_id}/edit", response_class=HTMLResponse)
async def edit_submit(
    message_id: int,
    token: str = "",
    body: str = Form(...),
    subject: str = Form(""),
) -> str:
    _require(message_id, token)
    await record_edit(message_id, new_body=body, new_subject=subject or None)
    result = await approve_and_send(message_id)
    if result.get("sent") or result.get("dry_run"):
        return _page(
            "Edit saved and sent",
            f"<p>Your edited version went out. SendGrid id: {result.get('external_message_id') or '(dry_run)'}</p>",
            color="#16a34a",
        )
    return _page(
        "Edit saved, send failed",
        f"<p>Edit was saved but send failed: {result.get('error') or result.get('blocked_reason')}</p>",
        color="#dc2626",
    )


@router.get("/{message_id}/skip", response_class=HTMLResponse)
async def skip_endpoint(message_id: int, token: str = "") -> str:
    _require(message_id, token)
    msg = await get_pending_message(message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.status not in ("pending", "edited"):
        return _page("Already decided", f"<p>This draft was already <b>{msg.status}</b>.</p>")
    await skip(message_id, reason="rep clicked skip")
    return _page("Skipped", "<p>Got it. This draft will not be sent. Cadence advances normally.</p>", color="#6B7280")
