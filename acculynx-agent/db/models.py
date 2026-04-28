"""Database models — the agent's memory.

Four tables:
1. leads        - Mirrors AccuLynx pipeline + tracks cadence position
2. actions      - Log of every action the AI takes (audit trail)
3. message_queue - Outbound messages waiting to be sent or approved
4. approvals    - Rep approve/edit/skip decisions
"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Lead(Base):
    """Tracks each lead's state in our system.

    Synced from AccuLynx every 15 minutes. The cadence fields
    track where this lead is in the follow-up sequence.
    """

    __tablename__ = "leads"

    id = Column(String, primary_key=True)  # AccuLynx job ID (GUID)
    job_number = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    address = Column(String, nullable=True)

    # AccuLynx data
    milestone = Column(String, nullable=False, index=True)  # Lead, Prospect, Approved, etc.
    previous_milestone = Column(String, nullable=True)       # For oscillation detection
    assigned_rep_id = Column(String, nullable=True)
    assigned_rep_name = Column(String, nullable=True)
    lead_source = Column(String, nullable=True)
    work_type = Column(String, nullable=True)
    sms_opt_out = Column(Boolean, default=False)
    twilio_stop = Column(Boolean, default=False)  # Customer replied STOP via Twilio

    # Timestamps from AccuLynx
    acculynx_created_date = Column(DateTime, nullable=True)
    acculynx_modified_date = Column(DateTime, nullable=True)
    milestone_changed_date = Column(DateTime, nullable=True)

    # Cadence tracking — where is this lead in the follow-up sequence?
    # layer_name is the canonical field going forward (e.g., "ESTIMATE_FOLLOWUP").
    # cadence_name is kept as a backward-compatible alias pointing to the same value.
    layer_name = Column(String, nullable=True, index=True)         # e.g., "ESTIMATE_FOLLOWUP"
    layer_entered_date = Column(DateTime, nullable=True)           # when this layer was entered
    cadence_name = Column(String, nullable=True, index=True)       # alias for layer_name (legacy)
    cadence_start_date = Column(DateTime, nullable=True)           # alias for layer_entered_date (legacy)
    cadence_touch_index = Column(Integer, default=0)               # which touch we're on (0-indexed)
    total_contact_attempts = Column(Integer, default=0)            # running total across all layers
    last_contact_date = Column(DateTime, nullable=True)
    last_contact_channel = Column(String, nullable=True)           # "text", "email", "phone"

    # Status flags
    is_active = Column(Boolean, default=True, index=True)  # False if Dead or Closed+drip complete
    is_paused = Column(Boolean, default=False)              # Paused (escalation, manual hold)
    is_escalated = Column(Boolean, default=False)           # Escalation triggered
    pause_reason = Column(String, nullable=True)

    # Enrichment cache
    enriched_at = Column(DateTime, nullable=True)  # When contact data was last fetched

    # Our timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    actions = relationship("Action", back_populates="lead")
    messages = relationship("MessageQueue", back_populates="lead")


class Action(Base):
    """Audit log — every single thing the AI agent does.

    This is the full record Austin/Colin can review to see
    exactly what the AI did and why.
    """

    __tablename__ = "actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)
    action_type = Column(String, nullable=False)
    # Types: "message_drafted", "message_sent", "message_approved",
    #        "message_edited", "message_skipped", "escalation_triggered",
    #        "cadence_advanced", "cadence_paused", "lead_synced",
    #        "rep_notified", "acculynx_logged"

    channel = Column(String, nullable=True)     # "text", "email", "internal_note"
    description = Column(Text, nullable=True)   # Human-readable summary
    message_content = Column(Text, nullable=True)  # The actual message text (if applicable)
    metadata_json = Column(Text, nullable=True)  # Extra data as JSON string

    created_at = Column(DateTime, default=func.now())

    lead = relationship("Lead", back_populates="actions")


class MessageQueue(Base):
    """Outbound messages waiting to be sent or awaiting rep approval.

    Lifecycle: pending → approved/auto_approved → sent → logged_to_acculynx
    Or: pending → edited → sent → logged_to_acculynx
    Or: pending → skipped
    """

    __tablename__ = "message_queue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)

    # Message content
    channel = Column(String, nullable=False)         # "text" or "email"
    recipient_phone = Column(String, nullable=True)
    recipient_email = Column(String, nullable=True)
    subject = Column(String, nullable=True)          # Email subject line
    body = Column(Text, nullable=False)              # The message text
    body_edited = Column(Text, nullable=True)        # Rep's edited version (if modified)

    # Cadence info
    cadence_name = Column(String, nullable=True)
    touch_index = Column(Integer, nullable=True)
    content_type = Column(String, nullable=True)     # e.g., "check_in_questions_about_estimate"

    # Status
    status = Column(String, default="pending")
    # Values: "pending", "approved", "auto_approved", "edited", "sent",
    #         "skipped", "failed", "logged_to_acculynx"

    # Who approved/skipped
    approved_by = Column(String, nullable=True)      # Rep name
    skip_reason = Column(String, nullable=True)

    # Delivery tracking
    sent_at = Column(DateTime, nullable=True)
    delivery_status = Column(String, nullable=True)  # Twilio/SendGrid delivery status
    external_message_id = Column(String, nullable=True)  # Twilio SID or SendGrid ID

    # Email threading (RFC 2822). Lets reply chains correlate back to outbound.
    rfc_message_id = Column(String, nullable=True)   # Message-ID we set on send
    in_reply_to = Column(String, nullable=True)      # Set when threading a reply
    direction = Column(String, default="outbound")   # "outbound" | "inbound"

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    lead = relationship("Lead", back_populates="messages")


class Approval(Base):
    """Tracks rep approval decisions for reporting.

    One row per approval request sent to a rep.
    """

    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(Integer, ForeignKey("message_queue.id"), nullable=False)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)

    # Rep info
    rep_email = Column(String, nullable=False)
    rep_name = Column(String, nullable=True)

    # Approval token (for email link auth)
    token = Column(String, nullable=False, unique=True)

    # Decision
    decision = Column(String, nullable=True)  # "approved", "edited", "skipped", None (pending)
    decided_at = Column(DateTime, nullable=True)

    # Escalation
    escalated = Column(Boolean, default=False)
    escalated_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
