"""Strip em-dashes (—) and en-dashes (–) from SOP markdown files.

Replacement rules (chosen to read naturally for sales follow-up tone):
  • " — "  →  ", "      (most common spaced form, e.g. "no rush — just checking" → "no rush, just checking")
  • "—"    →  ","       (any remaining standalone em-dash)
  • " – "  →  ", "      (spaced en-dash, same rule)
  • "–"    →  "-"       (range/numeric en-dash → hyphen, e.g. "6–8 AM" → "6-8 AM")

Also strips horizontal-bar (―, U+2015) and minus-sign (−, U+2212) just in case.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SOPS = Path(__file__).resolve().parent.parent / "sops"

REPLACEMENTS: list[tuple[str, str]] = [
    (" — ", ", "),
    (" – ", ", "),
    ("—", ","),
    ("–", "-"),
    ("―", ","),
    ("−", "-"),
]


def strip_text(text: str) -> tuple[str, int]:
    out = text
    count = 0
    for src, dst in REPLACEMENTS:
        n = out.count(src)
        if n:
            count += n
            out = out.replace(src, dst)
    out = re.sub(r",,+", ",", out)
    out = re.sub(r"\s+,", ",", out)
    # Fix punctuation+comma artifacts ".," "?," "!," → ". " "? " "! "
    out = re.sub(r"([.!?]),", r"\1", out)
    # Collapse trailing ", ," patterns and standalone ", " at line end
    out = re.sub(r"^\s*,\s*", "", out, flags=re.MULTILINE)
    return out, count


def main() -> int:
    files = sorted(SOPS.glob("*.md"))
    total_replacements = 0
    for fp in files:
        original = fp.read_text(encoding="utf-8")
        cleaned, count = strip_text(original)
        if count:
            fp.write_text(cleaned, encoding="utf-8")
            total_replacements += count
            print(f"  {fp.name:55s}  {count} replacement(s)")
        else:
            print(f"  {fp.name:55s}  (clean)")
    print(f"\nTotal: {total_replacements} dashes replaced across {len(files)} files.")
    remaining = 0
    for fp in files:
        text = fp.read_text(encoding="utf-8")
        for src, _ in REPLACEMENTS:
            remaining += text.count(src)
    print(f"Remaining: {remaining}")
    return 0 if remaining == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
