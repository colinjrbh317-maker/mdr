"""SOP Loader — reads the right knowledge files for a given lead's layer.

When Claude needs to draft a message, it needs context:
1. Layer-specific rules (e.g., ESTIMATE_FOLLOWUP or NURTURE)
2. Universal tone/voice guide (loaded every time)
3. Safety rails (loaded every time)
4. Real message examples (for voice calibration)

This module loads the right combination based on the lead's layer name.
Milestone names (old-style) are accepted for backward compatibility —
they are mapped through MILESTONE_TO_LAYER automatically.
"""

from __future__ import annotations

from pathlib import Path

from config.cadence import ALWAYS_LOAD_SOPS, LAYER_SOP_MAP, MILESTONE_TO_LAYER
from config.settings import settings


def load_sops_for_layer(layer_name: str) -> str:
    """Load and combine all relevant SOP content for a pipeline layer.

    Accepts either a layer name (e.g., "ESTIMATE_FOLLOWUP") or a legacy
    AccuLynx milestone name (e.g., "Prospect") — milestones are mapped
    to their default entry layer automatically.

    Returns a single string with all SOP text concatenated, ready to be
    included in a Claude prompt.
    """
    sops_dir = Path(settings.sops_directory)

    # If caller passed a milestone name, translate it to a layer name
    resolved_layer = MILESTONE_TO_LAYER.get(layer_name, layer_name)

    files = list(LAYER_SOP_MAP.get(resolved_layer, [])) + ALWAYS_LOAD_SOPS

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_files: list[str] = []
    for f in files:
        if f not in seen:
            seen.add(f)
            unique_files.append(f)

    sections = []
    for filename in unique_files:
        filepath = sops_dir / filename
        if filepath.exists():
            content = filepath.read_text(encoding="utf-8")
            sections.append(f"--- SOP: {filename} ---\n{content}")
        else:
            sections.append(f"--- SOP: {filename} --- [FILE NOT FOUND]")

    return "\n\n".join(sections)


# Backward-compatible alias — old callers use load_sops_for_milestone
def load_sops_for_milestone(milestone: str) -> str:
    """Load SOPs for a given AccuLynx milestone (backward-compatible wrapper).

    Internally maps the milestone to its default layer and delegates to
    load_sops_for_layer. New code should call load_sops_for_layer directly.
    """
    return load_sops_for_layer(milestone)


def load_real_message_samples(max_chars: int = 8000) -> str:
    """Load real message examples for voice calibration.

    Truncates to max_chars to avoid blowing up the context window
    on large sample files.
    """
    samples_path = Path(settings.sops_directory) / "real_message_samples.md"
    if not samples_path.exists():
        return ""

    content = samples_path.read_text(encoding="utf-8")
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[... truncated for context window ...]"

    return f"--- REAL MESSAGE EXAMPLES (for voice calibration) ---\n{content}"
