"""Follow-up cadence definitions — the timing rules for every pipeline layer.

The system is organized into 11 layers. Each layer represents a stage in the
lead lifecycle. Touch day_offsets are relative to when the lead ENTERED that
layer (not when they entered the overall pipeline).

Each Layer has:
- name: unique identifier (e.g., "FIRST_CONTACT")
- touches: ordered list of Touch objects
- tone: brief description of the emotional register
- goal: what success looks like for this layer
- exit_conditions: human-readable list of how leads leave this layer
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Touch:
    """A single follow-up touchpoint in a layer sequence."""
    day_offset: int
    channel: str           # "text" or "email"
    content_type: str      # description of what this message should accomplish
    autonomous_ok: bool    # can be sent without rep approval (after hours / stale)


@dataclass
class Layer:
    """A pipeline stage with its own touch sequence and behavioral rules."""
    name: str
    touches: list[Touch]
    tone: str
    goal: str
    exit_conditions: list[str]


# ── Layer 1: FIRST_CONTACT ──────────────────────────────────────────────────
# New lead assigned. Goal: make contact and get appointment scheduled.
LAYER_FIRST_CONTACT = Layer(
    name="FIRST_CONTACT",
    tone="Warm, quick, professional",
    goal="Make contact, qualify, get appointment scheduled",
    exit_conditions=[
        "Appointment scheduled → PRE_APPOINTMENT",
        "No response after 3 touches → GOING_COLD",
    ],
    touches=[
        Touch(0, "text", "initial_outreach", autonomous_ok=False),
        Touch(0, "email", "intro_with_rep_info", autonomous_ok=True),
        Touch(1, "text", "follow_up_no_answer", autonomous_ok=True),
    ],
)

# ── Layer 2: PRE_APPOINTMENT ────────────────────────────────────────────────
# Appointment is set. AccuLynx handles primary automations. AI monitors
# and fires only if appointment is unconfirmed 2 hours before.
LAYER_PRE_APPOINTMENT = Layer(
    name="PRE_APPOINTMENT",
    tone="Friendly, helpful, logistical",
    goal="Confirm appointment, reduce no-shows",
    exit_conditions=[
        "Appointment happens → POST_INSPECTION",
        "No-show → GOING_COLD",
        "Cancels → FIRST_CONTACT (reschedule) or GOING_COLD",
    ],
    touches=[
        # AI fires only if not confirmed 2h before — single gap-fill touch
        Touch(0, "text", "appointment_confirm_gap_fill", autonomous_ok=True),
    ],
)

# ── Layer 3: POST_INSPECTION ────────────────────────────────────────────────
# Rep has inspected. AccuLynx sends thank-you email. AI gap-fills if
# estimate is not sent within 24 hours.
LAYER_POST_INSPECTION = Layer(
    name="POST_INSPECTION",
    tone="Professional, confident, grateful",
    goal="Deliver estimate, set expectations",
    exit_conditions=[
        "Estimate delivered → ESTIMATE_FOLLOWUP",
        "Rep marks no-damage / not a fit → CLOSED",
    ],
    touches=[
        # Gap-fill: only fires if AccuLynx automation didn't send within 24h
        Touch(1, "email", "estimate_delivery_gap_fill", autonomous_ok=True),
    ],
)

# ── Layer 4: ESTIMATE_FOLLOWUP — THE MONEY ZONE ────────────────────────────
# Estimate has been sent. This is the highest-value layer. AI owns this.
LAYER_ESTIMATE_FOLLOWUP = Layer(
    name="ESTIMATE_FOLLOWUP",
    tone="Helpful, patient, value-focused — NOT pushy",
    goal="Answer questions, overcome objections, get signature",
    exit_conditions=[
        "Signs contract → PRE_INSTALL",
        "Says getting other estimates or needs more time → NURTURE",
        "No response after 4 touches → NURTURE",
        "Says went with someone else → CLOSED",
    ],
    touches=[
        Touch(2,  "text",  "check_in_questions_about_estimate", autonomous_ok=True),
        Touch(5,  "text",  "checking_in_on_proposal",           autonomous_ok=True),
        Touch(10, "email", "value_add_financing_warranty",       autonomous_ok=True),
        Touch(14, "text",  "no_pressure_still_here",             autonomous_ok=True),
    ],
)

# ── Layer 5: NURTURE ────────────────────────────────────────────────────────
# Lead is undecided / going quiet. Wide spacing, low pressure.
LAYER_NURTURE = Layer(
    name="NURTURE",
    tone="Patient, low-pressure, value-driven",
    goal="Stay top-of-mind, provide value, don't lose them",
    exit_conditions=[
        "Re-engages (replies, calls) → ESTIMATE_FOLLOWUP",
        "Signs contract → PRE_INSTALL",
        "No response after 4 touches → GOING_COLD",
        "Explicitly declines → CLOSED",
    ],
    touches=[
        Touch(21, "email", "soft_urgency_scheduling_availability", autonomous_ok=True),
        Touch(30, "text",  "staying_in_touch",                     autonomous_ok=True),
        Touch(38, "email", "social_proof_reviews_photos",           autonomous_ok=True),
        Touch(45, "text",  "reengagement_things_change",            autonomous_ok=True),
    ],
)

# ── Layer 6: GOING_COLD ─────────────────────────────────────────────────────
# Last chance before closing the file.
LAYER_GOING_COLD = Layer(
    name="GOING_COLD",
    tone="Respectful, final, leave the door open",
    goal="Last chance before closing the file",
    exit_conditions=[
        "Re-engages → ESTIMATE_FOLLOWUP or NURTURE",
        "Signs → PRE_INSTALL",
        "No response after 3 touches → CLOSED",
        "90 days pass → RE_ENGAGEMENT",
    ],
    touches=[
        Touch(52, "email", "value_pitch_what_sets_mdr_apart",  autonomous_ok=True),
        Touch(60, "text",  "last_check_in_closing_file",       autonomous_ok=True),
        Touch(67, "email", "final_close_reach_out_anytime",    autonomous_ok=True),
    ],
)

# ── Layer 7: PRE_INSTALL ────────────────────────────────────────────────────
# Contract signed. AccuLynx handles welcome/reminder automations. AI
# fills gaps for weather delays, scheduling issues, unscheduled jobs.
LAYER_PRE_INSTALL = Layer(
    name="PRE_INSTALL",
    tone="Excited, reassuring, organized",
    goal="Keep customer informed, reduce anxiety, prep for install",
    exit_conditions=[
        "Install complete → POST_INSTALL",
    ],
    touches=[
        Touch(14, "text",  "scheduling_check_if_no_date_set",    autonomous_ok=False),
        Touch(21, "email", "scheduling_reminder_no_date",         autonomous_ok=False),
    ],
)

# ── Layer 8: POST_INSTALL ───────────────────────────────────────────────────
# Install done. Satisfaction check + review request.
LAYER_POST_INSTALL = Layer(
    name="POST_INSTALL",
    tone="Grateful, warm, brief",
    goal="Satisfaction check, collect review, close out cleanly",
    exit_conditions=[
        "Invoice paid → DRIP",
    ],
    touches=[
        Touch(7, "text",  "post_install_satisfaction_check", autonomous_ok=True),
        Touch(9, "email", "review_request_link",              autonomous_ok=True),
    ],
)

# ── Layer 9: DRIP ───────────────────────────────────────────────────────────
# Post-close. Long-term upsell and referral drip. AI owns this.
LAYER_DRIP = Layer(
    name="DRIP",
    tone="Casual, appreciative, non-pushy",
    goal="Stay front-of-mind, upsell services, generate referrals",
    exit_conditions=[
        "Refers someone → new lead enters FIRST_CONTACT",
        "Wants more work → new job enters FIRST_CONTACT",
        "Drip complete (1 year) → done",
    ],
    touches=[
        Touch(30,  "text",  "satisfaction_check_in",          autonomous_ok=True),
        Touch(90,  "email", "seasonal_checkup_cross_sell",    autonomous_ok=True),
        Touch(180, "email", "referral_program_ask",           autonomous_ok=True),
        Touch(365, "email", "anniversary_maintenance_offer",  autonomous_ok=True),
    ],
)

# ── Layer 10: CLOSED ────────────────────────────────────────────────────────
# Dead, lost, or unresponsive. No active messaging.
LAYER_CLOSED = Layer(
    name="CLOSED",
    tone="N/A — no active messaging",
    goal="File stored, door left open for future contact",
    exit_conditions=[
        "90 days pass (unresponsive sub-type) → RE_ENGAGEMENT",
        "Customer requested no contact → permanent stop",
    ],
    touches=[],  # No scheduled touches — close message was sent on entry
)

# ── Layer 11: RE_ENGAGEMENT ─────────────────────────────────────────────────
# Dead lead revived 90 days after closing. One last shot.
LAYER_RE_ENGAGEMENT = Layer(
    name="RE_ENGAGEMENT",
    tone="Casual, low-key, just checking in",
    goal="One last shot at reviving a dead lead",
    exit_conditions=[
        "Re-engages → ESTIMATE_FOLLOWUP",
        "No response after 3 touches → permanently closed (never contact again)",
    ],
    touches=[
        Touch(0,  "text",  "gentle_reengagement_check_in",   autonomous_ok=True),
        Touch(7,  "email", "reengagement_value_offer",        autonomous_ok=True),
        Touch(14, "text",  "final_reengagement_attempt",      autonomous_ok=True),
    ],
)


# ── LAYER_MAP: name → Layer object ─────────────────────────────────────────
LAYER_MAP: dict[str, Layer] = {
    "FIRST_CONTACT":      LAYER_FIRST_CONTACT,
    "PRE_APPOINTMENT":    LAYER_PRE_APPOINTMENT,
    "POST_INSPECTION":    LAYER_POST_INSPECTION,
    "ESTIMATE_FOLLOWUP":  LAYER_ESTIMATE_FOLLOWUP,
    "NURTURE":            LAYER_NURTURE,
    "GOING_COLD":         LAYER_GOING_COLD,
    "PRE_INSTALL":        LAYER_PRE_INSTALL,
    "POST_INSTALL":       LAYER_POST_INSTALL,
    "DRIP":               LAYER_DRIP,
    "CLOSED":             LAYER_CLOSED,
    "RE_ENGAGEMENT":      LAYER_RE_ENGAGEMENT,
}


# ── MILESTONE_TO_LAYER: AccuLynx milestone → default starting layer ─────────
# Used when a milestone change is detected in sync. This is the ENTRY point
# for a given milestone — the AI may subsequently move to sub-layers
# (e.g., Prospect can be ESTIMATE_FOLLOWUP, NURTURE, or GOING_COLD).
MILESTONE_TO_LAYER: dict[str, str] = {
    "Lead":       "FIRST_CONTACT",
    "Prospect":   "ESTIMATE_FOLLOWUP",  # Estimate sent — the money zone
    "Approved":   "PRE_INSTALL",
    "Completed":  "POST_INSTALL",
    "Invoiced":   "POST_INSTALL",
    "Closed":     "DRIP",
    "Dead":       "CLOSED",
    "Cancelled":  "CLOSED",
}


def determine_layer(milestone: str, days_since_activity: int = 0) -> str:
    """Determine the correct layer for a lead given milestone + activity age.

    For most milestones this is a direct lookup. For Prospect leads,
    we use days_since_activity to place them in the right sub-layer:
    - 0–14 days:  ESTIMATE_FOLLOWUP
    - 15–51 days: NURTURE
    - 52+ days:   GOING_COLD

    Args:
        milestone: AccuLynx milestone string (e.g., "Prospect")
        days_since_activity: days since the lead last had activity or
                             since their layer_entered_date

    Returns:
        Layer name string (key in LAYER_MAP)
    """
    if milestone == "Prospect":
        if days_since_activity <= 14:
            return "ESTIMATE_FOLLOWUP"
        elif days_since_activity <= 51:
            return "NURTURE"
        else:
            return "GOING_COLD"

    return MILESTONE_TO_LAYER.get(milestone, "FIRST_CONTACT")


# ── LAYER_SOP_MAP: layer name → SOP files to load ──────────────────────────
# Tells Claude which SOP files to load when drafting messages for a layer.
LAYER_SOP_MAP: dict[str, list[str]] = {
    "FIRST_CONTACT": [
        "01_lead_intake_and_qualification.md",
        "02_appointment_scheduling_and_confirmation.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "PRE_APPOINTMENT": [
        "02_appointment_scheduling_and_confirmation.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "POST_INSPECTION": [
        "03_post_inspection_followup.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "ESTIMATE_FOLLOWUP": [
        "03_post_inspection_followup.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "NURTURE": [
        "10_tone_voice_and_communication_standards.md",
    ],
    "GOING_COLD": [
        "05_going_cold_and_closing_file.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "PRE_INSTALL": [
        "06_approved_to_install.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "POST_INSTALL": [
        "07_post_install_and_review.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "DRIP": [
        "08_post_close_drip_campaigns.md",
        "10_tone_voice_and_communication_standards.md",
    ],
    "CLOSED": [
        "10_tone_voice_and_communication_standards.md",
    ],
    "RE_ENGAGEMENT": [
        "11_re_engagement_dead_leads.md",
        "10_tone_voice_and_communication_standards.md",
    ],
}

# SOP files always loaded regardless of layer (safety rails)
ALWAYS_LOAD_SOPS = [
    "09_escalation_rules_and_safety.md",
    "12_crm_workflow_and_status_rules.md",
]


# ── Backward-compatibility shims ────────────────────────────────────────────
# Simulation scripts and other callers that import MILESTONE_CADENCE_MAP
# or MILESTONE_SOP_MAP still work without changes.

MILESTONE_CADENCE_MAP: dict[str, list] = {
    milestone: LAYER_MAP[layer_name].touches
    for milestone, layer_name in MILESTONE_TO_LAYER.items()
    if LAYER_MAP[layer_name].touches
}

MILESTONE_SOP_MAP: dict[str, list] = {
    milestone: LAYER_SOP_MAP.get(layer_name, [])
    for milestone, layer_name in MILESTONE_TO_LAYER.items()
}
