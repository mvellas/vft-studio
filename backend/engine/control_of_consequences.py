"""
backend/engine/control_of_consequences.py
==========================================
Control of Consequences (CoC) data types and response parser.

Provides:
  - CoCResult frozen dataclass: q1_result, q2_result, refinement_needed, refinement_suggestion, reasoning
  - parse_coc_response: parses structured LLM response into CoCResult
  - determine_coc_action: maps (q1, q2) combination to action dict
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CoCResult:
    """Immutable result of a Control of Consequences evaluation."""

    q1_result: str  # "aligned" | "misaligned"
    q2_result: str  # "internal" | "external"
    refinement_needed: bool
    refinement_suggestion: str | None
    reasoning: str


def parse_coc_response(response_text: str) -> CoCResult:
    """
    Parse a structured LLM CoC response into a CoCResult.

    Expected format:
        Q1_RESULT: aligned|misaligned
        Q2_RESULT: internal|external
        REFINEMENT_NEEDED: yes|no
        REFINED_STATEMENT: {suggested text, or null}
        REASONING: {concise explanation}

    Parsing is case-insensitive on keys and tolerant of extra whitespace.
    Missing fields default to safe values.
    """
    q1_result: str = "aligned"
    q2_result: str = "internal"
    refinement_needed: bool = False
    refinement_suggestion: str | None = None
    reasoning: str = response_text.strip()

    for line in response_text.splitlines():
        stripped = line.strip()
        upper = stripped.upper()

        if upper.startswith("Q1_RESULT:"):
            val = stripped.split(":", 1)[-1].strip().lower()
            if val in ("aligned", "misaligned"):
                q1_result = val

        elif upper.startswith("Q2_RESULT:"):
            val = stripped.split(":", 1)[-1].strip().lower()
            if val in ("internal", "external"):
                q2_result = val

        elif upper.startswith("REFINEMENT_NEEDED:"):
            val = stripped.split(":", 1)[-1].strip().lower()
            refinement_needed = val == "yes"

        elif upper.startswith("REFINED_STATEMENT:"):
            val = stripped.split(":", 1)[-1].strip()
            refinement_suggestion = None if val.lower() in ("null", "none", "") else val

        elif upper.startswith("REASONING:"):
            reasoning = stripped.split(":", 1)[-1].strip()

    return CoCResult(
        q1_result=q1_result,
        q2_result=q2_result,
        refinement_needed=refinement_needed,
        refinement_suggestion=refinement_suggestion,
        reasoning=reasoning,
    )


def determine_coc_action(q1_result: str, q2_result: str) -> dict:
    """
    Determine the CoC action based on Q1 and Q2 answers.

    Decision matrix:
      aligned   + internal → confirmed fundamental — no refinement
      aligned   + external → fundamental but scope too broad — refine
      misaligned + internal → out of scope — reclassify as strategic
      misaligned + external → double problem — reclassify as strategic
    """
    if q1_result == "aligned" and q2_result == "internal":
        return {"action": "confirmed", "refinement_needed": False}
    if q1_result == "aligned" and q2_result == "external":
        return {"action": "refine_scope", "refinement_needed": True}
    # misaligned + internal or misaligned + external → reclassify
    return {"action": "reclassify_strategic", "refinement_needed": False}
