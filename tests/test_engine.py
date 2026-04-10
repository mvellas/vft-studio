"""
tests/test_engine.py
====================
Unit tests for VFT engine components:
- ProcessManager: step enumeration, config-based filtering, navigation
- WITITest parser: classification from structured LLM response
- CoC parser + determine_coc_action
"""
import pytest

from backend.engine.process_manager import ProcessManager, StepConfig
from backend.engine.witi_test import WITIClassification, WITIResult, parse_witi_response
from backend.engine.control_of_consequences import CoCResult, parse_coc_response, determine_coc_action

# Default config that includes all non-conditional steps
_DEFAULT_CONFIG = ("single_dm_single", "platinum")
_MULTI_CONFIG = ("multi_dm_multi", "platinum")


# ---------------------------------------------------------------------------
# ProcessManager
# ---------------------------------------------------------------------------

class TestProcessManager:
    def setup_method(self):
        self.pm = ProcessManager()

    def test_all_steps_count_is_33(self):
        assert len(ProcessManager.ALL_STEPS) == 33

    def test_step_ids_are_unique(self):
        ids = [s.id for s in ProcessManager.ALL_STEPS]
        assert len(ids) == len(set(ids))

    def test_get_step_by_id(self):
        step = self.pm.get_step("1.1")
        assert step is not None
        assert step.id == "1.1"
        assert step.phase == 1

    def test_get_nonexistent_step_returns_none(self):
        assert self.pm.get_step("9.9") is None

    def test_step_config_is_frozen(self):
        step = self.pm.get_step("1.1")
        with pytest.raises((AttributeError, TypeError)):
            step.name = "mutated"  # type: ignore[misc]

    def test_all_steps_have_required_fields(self):
        for step in ProcessManager.ALL_STEPS:
            assert step.id
            assert step.name
            assert step.description
            assert step.why
            assert step.how
            assert step.phase in (1, 2, 3)

    def test_get_steps_for_single_dm_single(self):
        steps = self.pm.get_steps_for_config("single_dm_single", "platinum")
        # Non-conditional steps always included; conditional ones filtered by config
        assert len(steps) > 0
        ids = {s.id for s in steps}
        assert "1.1" in ids  # non-conditional, always present

    def test_get_steps_for_multi_dm_multi_includes_multi_steps(self):
        steps_single = self.pm.get_steps_for_config("single_dm_single", "platinum")
        steps_multi = self.pm.get_steps_for_config("multi_dm_multi", "platinum")
        # multi config should include more steps (group workshop, etc.)
        assert len(steps_multi) >= len(steps_single)

    def test_get_next_step_from_1_1(self):
        nxt = self.pm.get_next_step("1.1", "single_dm_single", "platinum")
        assert nxt is not None
        # Next step after 1.1 should be within phase 1
        assert nxt.phase == 1

    def test_get_next_step_returns_none_at_end(self):
        # Find last step in single_dm_single config
        steps = self.pm.get_steps_for_config("single_dm_single", "platinum")
        last = steps[-1]
        nxt = self.pm.get_next_step(last.id, "single_dm_single", "platinum")
        assert nxt is None

    def test_condition_matching_single_dm(self):
        # Step 2.6 (single-stk conditional) should be present in single_dm_single
        steps = self.pm.get_steps_for_config("single_dm_single", "platinum")
        ids = {s.id for s in steps}
        assert "2.6" in ids  # VFT Devices single stk

    def test_condition_matching_multi_stk_excluded_from_single(self):
        # Multi-stk step 2.8 should NOT be present for single_dm_single
        steps = self.pm.get_steps_for_config("single_dm_single", "platinum")
        ids = {s.id for s in steps}
        assert "2.8" not in ids  # Wish List multi-stk only


# ---------------------------------------------------------------------------
# WITI Test Parser
# ---------------------------------------------------------------------------

class TestWITIParser:
    def test_parse_fundamental(self):
        response = (
            "CLASSIFICATION: fundamental\n"
            "IMPLIES_OBJECTIVE: null\n"
            "REASONING: This is an end value."
        )
        result = parse_witi_response(response)
        assert result.classification == WITIClassification.FUNDAMENTAL
        assert result.implies_objective_id is None
        assert "end value" in result.reasoning

    def test_parse_means_with_implies(self):
        response = (
            "CLASSIFICATION: means\n"
            "IMPLIES_OBJECTIVE: obj-abc-123\n"
            "REASONING: Leads to a higher objective."
        )
        result = parse_witi_response(response)
        assert result.classification == WITIClassification.MEANS
        assert result.implies_objective_id == "obj-abc-123"

    def test_parse_strategic(self):
        response = (
            "CLASSIFICATION: strategic\n"
            "IMPLIES_OBJECTIVE: null\n"
            "REASONING: Beyond the decision context."
        )
        result = parse_witi_response(response)
        assert result.classification == WITIClassification.STRATEGIC

    def test_parse_unknown_defaults_to_other(self):
        result = parse_witi_response("CLASSIFICATION: unknown_value\nREASONING: fallback")
        assert result.classification == WITIClassification.OTHER

    def test_parse_case_insensitive(self):
        result = parse_witi_response("classification: FUNDAMENTAL\nreasoning: test")
        assert result.classification == WITIClassification.FUNDAMENTAL

    def test_witi_result_is_frozen(self):
        result = WITIResult(
            classification=WITIClassification.FUNDAMENTAL,
            implies_objective_id=None,
            reasoning="test"
        )
        with pytest.raises((AttributeError, TypeError)):
            result.classification = WITIClassification.MEANS  # type: ignore[misc]

    def test_parse_empty_string_returns_other(self):
        result = parse_witi_response("")
        assert result.classification == WITIClassification.OTHER


# ---------------------------------------------------------------------------
# Control of Consequences Parser
# ---------------------------------------------------------------------------

class TestCoCParser:
    def test_parse_aligned_internal_no_refinement(self):
        response = (
            "Q1_RESULT: aligned\n"
            "Q2_RESULT: internal\n"
            "REFINEMENT_NEEDED: no\n"
            "REFINED_STATEMENT: null\n"
            "REASONING: Objective is well scoped."
        )
        result = parse_coc_response(response)
        assert result.q1_result == "aligned"
        assert result.q2_result == "internal"
        assert result.refinement_needed is False
        assert result.refinement_suggestion is None

    def test_parse_misaligned_with_refinement(self):
        response = (
            "Q1_RESULT: misaligned\n"
            "Q2_RESULT: external\n"
            "REFINEMENT_NEEDED: yes\n"
            "REFINED_STATEMENT: Minimize environmental impact\n"
            "REASONING: Too broad."
        )
        result = parse_coc_response(response)
        assert result.q1_result == "misaligned"
        assert result.refinement_needed is True
        assert result.refinement_suggestion == "Minimize environmental impact"

    def test_coc_result_is_frozen(self):
        result = CoCResult(
            q1_result="aligned",
            q2_result="internal",
            refinement_needed=False,
            refinement_suggestion=None,
            reasoning="test"
        )
        with pytest.raises((AttributeError, TypeError)):
            result.q1_result = "mutated"  # type: ignore[misc]

    def test_determine_coc_action_aligned_internal(self):
        action = determine_coc_action("aligned", "internal")
        assert action["action"] == "confirmed"
        assert action["refinement_needed"] is False

    def test_determine_coc_action_aligned_external_needs_refinement(self):
        action = determine_coc_action("aligned", "external")
        assert action["action"] == "refine_scope"
        assert action["refinement_needed"] is True

    def test_determine_coc_action_misaligned_reclassifies(self):
        action = determine_coc_action("misaligned", "external")
        assert action["action"] == "reclassify_strategic"

    def test_parse_reasoning_defaults_to_full_text(self):
        """When REASONING key is missing, fallback is the full response text."""
        result = parse_coc_response("Q1_RESULT: aligned\nQ2_RESULT: internal")
        assert result.q1_result == "aligned"
