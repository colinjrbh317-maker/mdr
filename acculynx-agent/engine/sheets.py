"""Google Sheets Integration — writes simulation & shadow mode reports to a shared sheet.

Creates a Google Sheet called "MDR AI Agent — Testing Dashboard" with tabs:
  - Layer 1: Simulation (dry runs)
  - Layer 2: Shadow Mode (what AI would have sent vs what reps did)
  - Summary (aggregate stats across runs)

Usage:
    from engine.sheets import SheetsReporter
    reporter = SheetsReporter()
    reporter.ensure_sheet_exists()
    reporter.write_simulation_run(results)
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import google.auth
import google.auth.transport.requests
from googleapiclient.discovery import build

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SHEET_TITLE = "MDR AI Agent — Testing Dashboard"

# File to store the spreadsheet ID so we reuse the same sheet
SHEET_ID_FILE = PROJECT_ROOT / "data" / "sheet_id.txt"


def _get_creds():
    """Use Application Default Credentials from gcloud CLI. No service account needed."""
    creds, project = google.auth.default(scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds


class SheetsReporter:
    """Manages the Google Sheet for test reporting."""

    def __init__(self):
        creds = _get_creds()
        self.sheets = build("sheets", "v4", credentials=creds)
        self.drive = build("drive", "v3", credentials=creds)
        self.spreadsheet_id = self._load_sheet_id()

    def _load_sheet_id(self) -> Optional[str]:
        if SHEET_ID_FILE.exists():
            return SHEET_ID_FILE.read_text().strip()
        return None

    def _save_sheet_id(self, sheet_id: str):
        SHEET_ID_FILE.parent.mkdir(exist_ok=True)
        SHEET_ID_FILE.write_text(sheet_id)
        self.spreadsheet_id = sheet_id

    def ensure_sheet_exists(self) -> str:
        """Create the sheet if it doesn't exist. Returns spreadsheet ID."""
        if self.spreadsheet_id:
            try:
                self.sheets.spreadsheets().get(
                    spreadsheetId=self.spreadsheet_id
                ).execute()
                return self.spreadsheet_id
            except Exception:
                pass  # Sheet was deleted, recreate

        # Create new spreadsheet with 3 tabs
        body = {
            "properties": {"title": SHEET_TITLE},
            "sheets": [
                {
                    "properties": {
                        "title": "Layer 1 — Simulation",
                        "gridProperties": {"frozenRowCount": 1},
                    }
                },
                {
                    "properties": {
                        "title": "Layer 2 — Shadow Mode",
                        "gridProperties": {"frozenRowCount": 1},
                    }
                },
                {
                    "properties": {
                        "title": "Summary",
                        "gridProperties": {"frozenRowCount": 1},
                    }
                },
            ],
        }

        result = self.sheets.spreadsheets().create(body=body).execute()
        sheet_id = result["spreadsheetId"]
        self._save_sheet_id(sheet_id)

        # Share with Colin so he can see it
        self._share_sheet(sheet_id)

        # Write headers for each tab
        self._write_simulation_headers()
        self._write_shadow_headers()
        self._write_summary_headers()

        # Format headers bold
        self._format_headers(sheet_id)

        print(f"📊 Created Google Sheet: https://docs.google.com/spreadsheets/d/{sheet_id}")
        return sheet_id

    def _share_sheet(self, sheet_id: str):
        """Make the sheet accessible to anyone with the link (editor access)."""
        try:
            self.drive.permissions().create(
                fileId=sheet_id,
                body={
                    "type": "anyone",
                    "role": "writer",
                },
            ).execute()
            print("📤 Sheet shared: anyone with the link can edit")
        except Exception as e:
            print(f"⚠️ Could not share sheet: {e}")

    def _write_simulation_headers(self):
        headers = [[
            "Run ID", "Timestamp", "Lead Name", "Job #", "Milestone",
            "Phone", "Email", "Touch #", "Channel", "Content Type",
            "Days in Cadence", "Total Attempts",
            "Preflight Result", "Blocked Reason",
            "Human Activity (24h)", "Draft Generated",
            "Message Preview (first 200 chars)", "Escalation",
            "Notes"
        ]]
        self.sheets.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range="'Layer 1 — Simulation'!A1",
            valueInputOption="RAW",
            body={"values": headers},
        ).execute()

    def _write_shadow_headers(self):
        headers = [[
            "Date", "Lead Name", "Job #", "Milestone",
            "AI Would Send (Channel)", "AI Draft Message",
            "Rep Actually Did", "Rep Message (if any)",
            "AI vs Rep Match", "Quality Score (1-10)",
            "Notes"
        ]]
        self.sheets.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range="'Layer 2 — Shadow Mode'!A1",
            valueInputOption="RAW",
            body={"values": headers},
        ).execute()

    def _write_summary_headers(self):
        headers = [[
            "Run ID", "Timestamp", "Type", "Leads Evaluated",
            "Approved", "Blocked", "Texts Drafted", "Emails Drafted",
            "Escalations", "Avg Preflight Pass Rate",
            "Top Block Reason", "Notes"
        ]]
        self.sheets.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range="'Summary'!A1",
            valueInputOption="RAW",
            body={"values": headers},
        ).execute()

    def _format_headers(self, sheet_id: str):
        """Bold + freeze the header row on all tabs."""
        # Get actual sheet/tab IDs from the spreadsheet
        meta = self.sheets.spreadsheets().get(spreadsheetId=sheet_id).execute()
        tab_ids = [s["properties"]["sheetId"] for s in meta.get("sheets", [])]

        requests = []
        for tab_id in tab_ids:
            requests.append({
                "repeatCell": {
                    "range": {
                        "sheetId": tab_id,
                        "startRowIndex": 0,
                        "endRowIndex": 1,
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "textFormat": {"bold": True},
                            "backgroundColor": {
                                "red": 0.9, "green": 0.9, "blue": 0.9,
                            },
                        }
                    },
                    "fields": "userEnteredFormat(textFormat,backgroundColor)",
                }
            })
        if requests:
            self.sheets.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={"requests": requests},
            ).execute()

    def write_simulation_run(self, results: list, run_id: str = ""):
        """Write a full simulation run to the Layer 1 tab.

        Args:
            results: List of per-lead result dicts from SimulationReport.results
            run_id: Unique identifier for this run (auto-generated if empty)
        """
        if not self.spreadsheet_id:
            self.ensure_sheet_exists()

        if not run_id:
            run_id = datetime.now().strftime("SIM-%Y%m%d-%H%M%S")

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        rows = []

        approved_count = 0
        blocked_count = 0
        texts = 0
        emails = 0
        escalations = 0
        block_reasons = {}

        for r in results:
            lead = r["lead"]
            enrichment = r.get("enrichment") or {}
            pf = r["preflight"]
            draft = r.get("draft") or {}
            activity = r.get("activity") or {}

            name = enrichment.get("name") or lead.get("contact_name", "Unknown")
            phone = enrichment.get("phone", "N/A")
            email = enrichment.get("email", "N/A")

            preflight_result = "APPROVED" if pf["approved"] else "BLOCKED"
            blocked_reason = ""
            if not pf["approved"]:
                failed = [k for k, v in pf["check_results"].items() if not v]
                blocked_reason = ", ".join(failed)
                blocked_count += 1
                for f in failed:
                    block_reasons[f] = block_reasons.get(f, 0) + 1
            else:
                approved_count += 1

            human_activity = "Yes" if activity.get("has_human_activity") else "No"

            draft_generated = "No"
            message_preview = ""
            escalation = ""
            if draft:
                if draft.get("escalation"):
                    escalation = draft["escalation"]
                    escalations += 1
                    draft_generated = "Escalation"
                elif draft.get("body"):
                    draft_generated = "Yes"
                    message_preview = draft["body"][:200]
                    if draft.get("channel") == "text":
                        texts += 1
                    else:
                        emails += 1

            rows.append([
                run_id,
                timestamp,
                name,
                lead.get("job_number", ""),
                lead.get("milestone", ""),
                phone,
                email,
                lead.get("touch_index", 0) + 1,
                lead.get("touch", {}).get("channel", ""),
                lead.get("touch", {}).get("content_type", ""),
                lead.get("days_since_cadence_start", ""),
                lead.get("total_attempts", 0),
                preflight_result,
                blocked_reason,
                human_activity,
                draft_generated,
                message_preview,
                escalation,
                "",  # Notes column — for manual review
            ])

        # Append rows to Layer 1 tab
        if rows:
            self.sheets.spreadsheets().values().append(
                spreadsheetId=self.spreadsheet_id,
                range="'Layer 1 — Simulation'!A2",
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": rows},
            ).execute()

        # Write summary row
        top_block = max(block_reasons, key=block_reasons.get) if block_reasons else "N/A"
        pass_rate = f"{approved_count * 100 // max(len(results), 1)}%"

        summary_row = [[
            run_id, timestamp, "Simulation", len(results),
            approved_count, blocked_count, texts, emails,
            escalations, pass_rate, top_block, ""
        ]]
        self.sheets.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range="'Summary'!A2",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": summary_row},
        ).execute()

        print(f"📊 Wrote {len(rows)} rows to Google Sheet (Run: {run_id})")
        return run_id

    def write_shadow_entry(self, lead_name: str, job_number: str,
                           milestone: str, ai_channel: str, ai_draft: str,
                           rep_action: str = "", rep_message: str = "",
                           match: str = "", quality_score: str = "",
                           notes: str = ""):
        """Write a single shadow mode comparison entry."""
        if not self.spreadsheet_id:
            self.ensure_sheet_exists()

        row = [[
            datetime.now().strftime("%Y-%m-%d %H:%M"),
            lead_name, job_number, milestone,
            ai_channel, ai_draft[:500],
            rep_action, rep_message[:500],
            match, quality_score, notes,
        ]]
        self.sheets.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range="'Layer 2 — Shadow Mode'!A2",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": row},
        ).execute()

    def get_sheet_url(self) -> str:
        if self.spreadsheet_id:
            return f"https://docs.google.com/spreadsheets/d/{self.spreadsheet_id}"
        return ""
