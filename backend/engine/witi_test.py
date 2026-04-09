"""
backend/engine/witi_test.py
============================
WITI Test classification data types and response parser.

Provides:
  - WITIClassification enum: means | fundamental | strategic | other
  - WITIResult frozen dataclass
  - parse_witi_response: parses structured LLM response into WITIResult
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class WITIClassification(str, Enum):
    """Classification result of the WITI Test applied to an objective."""
    MEANS = "means"
    FUNDAMENTAL = "fundamental"
    STRATEGIC = "strategic"
    OTHER = "other"


@dataclass(frozen=True)
class WITIResult:
    """Immutable result of a WITI Test classification."""
    classification: WITIClassification
    implies_objective_id: str | None
    reasoning: str


def parse_witi_response(response_text: str) -> WITIResult:
    """
    Parse a structured LLM WITI Test response into a WITIResult.

    Expected format:
        CLASSIFICATION: means|fundamental|strategic|other
        IMPLIES_OBJECTIVE: {id or null}
        REASONING: {concise explanation}

    Parsing is case-insensitive on keys and tolerant of extra whitespace.
    Unknown classification values default to OTHER.
    Missing fields default to safe values (OTHER, None, raw response text).
    """
    classification: WITIClassification = WITIClassification.OTHER
    implies_id: str | None = None
    reasoning: str = response_text.strip()

    for line in response_text.splitlines():
        stripped = line.strip()
        upper = stripped.upper()

        if upper.startswith("CLASSIFICATION:"):
            raw_value = stripped.split(":", 1)[-1].strip().lower()
            try:
                classification = WITIClassification(raw_value)
            except ValueError:
                classification = WITIClassification.OTHER

        elif upper.startswith("IMPLIES_OBJECTIVE:"):
            val = stripped.split(":", 1)[-1].strip()
            implies_id = None if val.lower() in ("null", "none", "") else val

        elif upper.startswith("REASONING:"):
            reasoning = stripped.split(":", 1)[-1].strip()

    return WITIResult(
        classification=classification,
        implies_objective_id=implies_id,
        reasoning=reasoning,
    )
