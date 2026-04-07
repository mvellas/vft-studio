"""ProcessManager — defines all 33 VFT StepConfigs and provides filtering/navigation.

Conditions reference:
  stakeholder_config: 'single_dm_single' | 'single_dm_multi' | 'multi_dm_multi'
  qualitative_modeling_tech: 'platinum' | 'gold' | 'silver' | 'combined'

"single stk" steps  → applies to single_dm_single OR single_dm_multi
"multi stk" steps   → applies to single_dm_multi OR multi_dm_multi
"multi_dm_multi"    → applies only when multi_dm_multi
"gold/combined"     → applies when tech is gold OR combined
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class StepConfig:
    id: str
    phase: int
    name: str
    description: str
    why: str
    how: str
    reference: str
    form_type: str
    requires_ai: bool
    is_conditional: bool
    condition: str | None
    completion_criteria: list[str] = field(default_factory=list)


_STEPS: list[StepConfig] = [
    # ────────────────────────────── FASE 1 (7 passos) ─────────────────────────────
    StepConfig(
        id="1.1", phase=1,
        name="Map Stakeholders",
        description="Identify all stakeholders relevant to the decision: decision makers, customers, owners, users, and consumers.",
        why="Stakeholder identification is the foundation of VFT. Without knowing who is affected, value elicitation is incomplete. (Vieira et al., 2024, §3.1)",
        how="List every individual or group that can affect or is affected by the decision. Classify each as DM (Decision Maker) or non-DM. Determine the configuration: single DM + single stk, single DM + multi stk, or multi DM + multi stk.",
        reference="Vieira et al. (2024), §3.1; Keeney (1992), Ch.2",
        form_type="stakeholder_mapper",
        requires_ai=False,
        is_conditional=False,
        condition=None,
        completion_criteria=["stakeholders_count >= 1", "stakeholder_config_set"],
    ),
    StepConfig(
        id="1.2", phase=1,
        name="Identify IDF - Single Stakeholder",
        description="Elicit the Initial Decision Frame directly with the single stakeholder through a structured interview.",
        why="The IDF (purpose, perspective, scope) frames the entire decision. With a single stakeholder, direct elicitation is efficient. (Vieira et al., 2024, §3.2.1)",
        how="Conduct a structured interview with the single stakeholder. Ask: What is the decision about? What is your perspective? What are the boundaries?",
        reference="Vieira et al. (2024), §3.2.1",
        form_type="decision_frame",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["idf_purpose_set", "idf_perspective_set", "idf_scope_set"],
    ),
    StepConfig(
        id="1.3", phase=1,
        name="Identify IDF - Single DM / Multi Stk",
        description="Elicit the IDF with the single Decision Maker, taking into account multiple stakeholder perspectives.",
        why="When stakeholders are multiple but DM is single, the DM synthesizes competing perspectives into a unified frame. (Vieira et al., 2024, §3.2.2)",
        how="Interview the DM. Present a summary of stakeholder interests gathered prior. Ask the DM to define purpose, perspective, and scope considering all parties.",
        reference="Vieira et al. (2024), §3.2.2",
        form_type="decision_frame",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_multi'",
        completion_criteria=["idf_purpose_set", "idf_perspective_set", "idf_scope_set"],
    ),
    StepConfig(
        id="1.4", phase=1,
        name="Workshop for IDF - Multiple DMs",
        description="Facilitate a workshop with all Decision Makers to reach a shared understanding of the decision frame.",
        why="Multiple DMs may have conflicting views. A structured workshop surfaces disagreements and builds consensus. (Vieira et al., 2024, §3.2.3)",
        how="Organize a workshop session. Present each DM's preliminary views. Use facilitated discussion to converge on a shared purpose, perspective, and scope.",
        reference="Vieira et al. (2024), §3.2.3",
        form_type="workshop_mode",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'multi_dm_multi'",
        completion_criteria=["workshop_conducted"],
    ),
    StepConfig(
        id="1.5", phase=1,
        name="Identify IDF - Multi DM / Multi Stk",
        description="Consolidate the IDF after the multi-DM workshop, reflecting the collective decision frame.",
        why="After the workshop, the agreed-upon frame must be formally documented to guide subsequent phases. (Vieira et al., 2024, §3.2.3)",
        how="Using workshop outputs, write the consolidated purpose, perspective, and scope. Confirm with all DMs before proceeding.",
        reference="Vieira et al. (2024), §3.2.3",
        form_type="decision_frame",
        requires_ai=False,
        is_conditional=True,
        condition="stakeholder_config == 'multi_dm_multi'",
        completion_criteria=["idf_purpose_set", "idf_perspective_set", "idf_scope_set"],
    ),
    StepConfig(
        id="1.6", phase=1,
        name="Document Initial Decision Frame",
        description="Formally record the IDF (purpose, perspective, scope) in the system for use throughout the process.",
        why="A documented IDF serves as the anchor for all subsequent value elicitation and objective structuring. (Vieira et al., 2024, §3.3)",
        how="Review the IDF fields captured in steps 1.2–1.5. Finalize the text, confirm accuracy, and mark as documented.",
        reference="Vieira et al. (2024), §3.3",
        form_type="decision_frame_review",
        requires_ai=False,
        is_conditional=False,
        condition=None,
        completion_criteria=["idf_documented"],
    ),
    StepConfig(
        id="1.7", phase=1,
        name="Define Decision Statement",
        description="Formulate a concise decision statement that encapsulates the purpose, perspective, and scope of the decision.",
        why="A clear decision statement prevents scope creep and keeps value elicitation focused. (Vieira et al., 2024, §3.4)",
        how="Draft a statement in the format: 'The decision is about [X] from the perspective of [Y] within the scope of [Z].' Optionally use AI to generate a candidate statement.",
        reference="Vieira et al. (2024), §3.4",
        form_type="decision_statement",
        requires_ai=True,
        is_conditional=False,
        condition=None,
        completion_criteria=["decision_statement_set", "decision_statement_validated"],
    ),

    # ────────────────────────────── FASE 2 (18 passos) ────────────────────────────
    StepConfig(
        id="2.1", phase=2,
        name="Plan Qualitative Value Modeling",
        description="Select the qualitative modeling technique (Platinum, Gold, Silver, or Combined) based on available resources and decision complexity.",
        why="The choice of technique determines which elicitation activities will be performed. (Vieira et al., 2024, §4.1)",
        how="Review the four techniques: Platinum (full individual interviews + workshops), Gold (documents + interviews), Silver (interviews only), Combined. Select based on time, budget, and stakeholder availability.",
        reference="Vieira et al. (2024), §4.1",
        form_type="technique_selector",
        requires_ai=False,
        is_conditional=False,
        condition=None,
        completion_criteria=["modeling_technique_selected"],
    ),
    StepConfig(
        id="2.2", phase=2,
        name="Identify org values from documents",
        description="Extract organizational values from existing documents (mission statements, strategic plans, policies).",
        why="Organizational documents contain implicit values that inform the objective hierarchy. (Vieira et al., 2024, §4.2)",
        how="Upload or paste document texts. Use AI to extract value-laden statements. Review and curate the extracted values.",
        reference="Vieira et al. (2024), §4.2",
        form_type="document_analysis",
        requires_ai=True,
        is_conditional=True,
        condition="qualitative_modeling_tech in ('gold', 'combined')",
        completion_criteria=["org_documents_analyzed"],
    ),
    StepConfig(
        id="2.3", phase=2,
        name="Convert org values into objectives",
        description="Transform the organizational values extracted from documents into structured objective statements.",
        why="Raw values must be converted into actionable objectives before structuring. (Vieira et al., 2024, §4.2)",
        how="For each extracted value, formulate an objective in 'Verb + Object' format (e.g., 'Minimize costs'). Use AI assistance to suggest formulations.",
        reference="Vieira et al. (2024), §4.2",
        form_type="value_to_objective",
        requires_ai=True,
        is_conditional=True,
        condition="qualitative_modeling_tech in ('gold', 'combined')",
        completion_criteria=["org_values_converted"],
    ),
    StepConfig(
        id="2.4", phase=2,
        name="Prepare questionnaire for objectives ID",
        description="Create a customized questionnaire to guide stakeholder interviews for objective identification.",
        why="A structured questionnaire ensures consistency across stakeholder interviews and covers all relevant value dimensions. (Vieira et al., 2024, §4.3)",
        how="Use the IDF and VFT devices as templates. Customize questions to the decision context. Include wish list prompts and value stimulation techniques.",
        reference="Vieira et al. (2024), §4.3",
        form_type="questionnaire_builder",
        requires_ai=True,
        is_conditional=False,
        condition=None,
        completion_criteria=["questionnaire_prepared"],
    ),
    StepConfig(
        id="2.5", phase=2,
        name="Wish List - Single Stakeholder",
        description="Conduct the wish list elicitation with the single stakeholder.",
        why="The wish list technique (Keeney, 1992) prompts stakeholders to articulate their ideal outcomes unconstrained by feasibility. (Vieira et al., 2024, §4.4)",
        how="Ask the stakeholder: 'If you could have anything you wanted in this decision, what would it be?' Record all wishes. Do not filter during elicitation.",
        reference="Vieira et al. (2024), §4.4; Keeney (1992), Ch.3",
        form_type="wish_list_single",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["wish_list_completed"],
    ),
    StepConfig(
        id="2.6", phase=2,
        name="VFT Devices / Value Stim - Single Stk",
        description="Apply VFT elicitation devices and value stimulation techniques with the single stakeholder.",
        why="VFT devices (Keeney, 1992) and value stimulation techniques (Dyer & Dyer, 2020) uncover deeper values beyond the initial wish list. (Vieira et al., 2024, §4.5)",
        how="Work through the 10 VFT devices and 8 value stimulation techniques. For each, prompt the stakeholder and record any new values identified.",
        reference="Vieira et al. (2024), §4.5; Keeney (1992); Dyer & Dyer (2020)",
        form_type="vft_devices_single",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["vft_devices_applied"],
    ),
    StepConfig(
        id="2.7", phase=2,
        name="Convert Values into Objectives",
        description="Convert all elicited values from the single stakeholder into structured objective statements.",
        why="Raw values must be converted to objectives before they can be structured and tested. (Vieira et al., 2024, §4.6)",
        how="For each value, formulate as 'Verb + Object'. Use AI to suggest formulations. Review and confirm with the stakeholder.",
        reference="Vieira et al. (2024), §4.6",
        form_type="value_to_objective",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["values_converted_to_objectives"],
    ),
    StepConfig(
        id="2.8", phase=2,
        name="Wish List - Multiple Stakeholders",
        description="Conduct wish list elicitation with each stakeholder individually.",
        why="Individual elicitation before group activities prevents anchoring and social influence bias. (Vieira et al., 2024, §4.4)",
        how="Conduct separate sessions with each stakeholder. Use the prepared questionnaire. Record each stakeholder's wishes independently.",
        reference="Vieira et al. (2024), §4.4",
        form_type="wish_list_multi",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["all_stakeholders_wish_list_completed"],
    ),
    StepConfig(
        id="2.9", phase=2,
        name="VFT Devices / Value Stim - Multi Stk",
        description="Apply VFT devices and value stimulation techniques with each stakeholder individually.",
        why="Individual application of VFT devices surfaces stakeholder-specific values that may be suppressed in group settings. (Vieira et al., 2024, §4.5)",
        how="For each stakeholder, work through the VFT devices and value stimulation techniques. Record results per stakeholder.",
        reference="Vieira et al. (2024), §4.5",
        form_type="vft_devices_multi",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["all_stakeholders_vft_devices_applied"],
    ),
    StepConfig(
        id="2.10", phase=2,
        name="Convert Individual Values - Multi Stk",
        description="Convert each stakeholder's elicited values into structured objective statements.",
        why="Individual conversion preserves each stakeholder's perspective before collective synthesis. (Vieira et al., 2024, §4.6)",
        how="For each stakeholder, convert their wishes and values to 'Verb + Object' objectives. Tag each objective with its source stakeholder.",
        reference="Vieira et al. (2024), §4.6",
        form_type="value_to_objective_multi",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["all_individual_values_converted"],
    ),
    StepConfig(
        id="2.11", phase=2,
        name="Workshop to identify collective objectives",
        description="Facilitate a group workshop to surface collective objectives from the aggregated individual objectives.",
        why="Collective objectives emerge from synthesis of individual perspectives and may not be visible to any single stakeholder. (Vieira et al., 2024, §4.7)",
        how="Present all individual objectives. Facilitate discussion to identify patterns and collective objectives not yet captured.",
        reference="Vieira et al. (2024), §4.7",
        form_type="workshop_mode",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["workshop_conducted"],
    ),
    StepConfig(
        id="2.12", phase=2,
        name="Present individual + identify collective",
        description="Present individual objectives to all stakeholders and collectively identify additional shared objectives.",
        why="Sharing individual perspectives can trigger recognition of shared values and reveal overlooked objectives. (Vieira et al., 2024, §4.7)",
        how="Show each stakeholder's objectives (anonymized if appropriate). Ask the group: What objectives are shared? What is missing?",
        reference="Vieira et al. (2024), §4.7",
        form_type="collective_objectives",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["collective_objectives_identified"],
    ),
    StepConfig(
        id="2.13", phase=2,
        name="Categorize Objectives",
        description="Classify all objectives as Strategic, Fundamental, or Means objectives.",
        why="Categorization is essential before applying the WITI test and structuring the objective hierarchy. (Vieira et al., 2024, §4.8)",
        how="For each objective, apply preliminary categorization: Is it aspirational (strategic)? Is it an end-state (fundamental candidate)? Is it a means to another objective?",
        reference="Vieira et al. (2024), §4.8",
        form_type="objective_categorizer",
        requires_ai=True,
        is_conditional=False,
        condition=None,
        completion_criteria=["all_objectives_categorized"],
    ),
    StepConfig(
        id="2.14", phase=2,
        name="Map Causal Relations (WITI Test)",
        description="Apply the WITI Test ('Why Is That Important?') to identify causal relations between objectives.",
        why="The WITI test (Keeney, 1992) distinguishes fundamental objectives from means objectives by tracing causal chains. (Vieira et al., 2024, §4.9)",
        how="For each objective, ask 'Why is [objective] important in this decision context?' If the answer is another objective, a causal link exists. Map all causal relations.",
        reference="Vieira et al. (2024), §4.9; Keeney (1992), Ch.4",
        form_type="witi_test",
        requires_ai=True,
        is_conditional=False,
        condition=None,
        completion_criteria=["witi_test_applied_to_all"],
    ),
    StepConfig(
        id="2.15", phase=2,
        name="Apply Control of Consequences",
        description="Apply the Control of Consequences (CoC) test to refine fundamental objective candidates.",
        why="CoC (Keeney, 1992) validates that fundamental objectives are truly fundamental — not means — and are within the decision's scope. (Vieira et al., 2024, §4.10)",
        how="For each fundamental candidate, ask Q1: 'Can you control the consequences of this objective?' and Q2: 'Is this objective an end in itself, not a means?' Refine statements as needed.",
        reference="Vieira et al. (2024), §4.10; Keeney (1992), Ch.4",
        form_type="control_of_consequences",
        requires_ai=True,
        is_conditional=False,
        condition=None,
        completion_criteria=["coc_applied_to_all_candidates"],
    ),
    StepConfig(
        id="2.16", phase=2,
        name="Define Means-Ends Objectives Network",
        description="Construct the means-ends objectives network from the WITI causal links.",
        why="The means-ends network visually represents how means objectives contribute to fundamental objectives. (Vieira et al., 2024, §4.11)",
        how="Using the WITI causal links, build a directed network diagram: means objectives point to the fundamental objectives they support.",
        reference="Vieira et al. (2024), §4.11",
        form_type="means_ends_network",
        requires_ai=False,
        is_conditional=False,
        condition=None,
        completion_criteria=["means_ends_network_defined"],
    ),
    StepConfig(
        id="2.17", phase=2,
        name="Build Fundamental Objectives Hierarchy",
        description="Organize all confirmed fundamental objectives into a hierarchical tree structure.",
        why="The hierarchy reveals the structure of values and enables systematic attribute definition. (Vieira et al., 2024, §4.12)",
        how="Group fundamental objectives by category. Identify parent-child relationships. Build a tree where general objectives decompose into more specific ones.",
        reference="Vieira et al. (2024), §4.12; Keeney (1992), Ch.5",
        form_type="objectives_hierarchy",
        requires_ai=False,
        is_conditional=False,
        condition=None,
        completion_criteria=["hierarchy_constructed"],
    ),
    StepConfig(
        id="2.18", phase=2,
        name="Define Attributes for Fundamental Objectives",
        description="Define measurable attributes (natural, constructed, or proxy) for each fundamental objective.",
        why="Attributes operationalize objectives — they make it possible to evaluate alternatives against each objective. (Vieira et al., 2024, §4.13)",
        how="For each fundamental objective, define: type (natural/constructed/proxy), description, scale, and 3–5 levels with descriptions. Verify the 5 attribute properties: unambiguous, comprehensive, direct, operational, understandable.",
        reference="Vieira et al. (2024), §4.13; Keeney (1992), Ch.6",
        form_type="attribute_definer",
        requires_ai=True,
        is_conditional=False,
        condition=None,
        completion_criteria=["all_fundamentals_have_attributes"],
    ),

    # ────────────────────────────── FASE 3 (8 passos) ─────────────────────────────
    StepConfig(
        id="3.1", phase=3,
        name="Depict initial alternatives - Single Stk",
        description="List the initial set of alternatives as currently conceived by the single stakeholder.",
        why="Documenting initial alternatives provides a baseline before elicitation of new creative options. (Vieira et al., 2024, §5.1)",
        how="Ask the stakeholder to list all alternatives they have already considered. Record without filtering.",
        reference="Vieira et al. (2024), §5.1",
        form_type="alternatives_list",
        requires_ai=False,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["initial_alternatives_listed"],
    ),
    StepConfig(
        id="3.2", phase=3,
        name="Elicit new alternatives - Single Stk",
        description="Use VFT-based techniques to elicit new alternatives with the single stakeholder.",
        why="VFT generates alternatives from objectives rather than constraints, leading to more creative and value-aligned options. (Vieira et al., 2024, §5.2)",
        how="For each fundamental objective, ask: 'What alternatives would best achieve [objective]?' Use AI to suggest alternatives the stakeholder may not have considered.",
        reference="Vieira et al. (2024), §5.2; Keeney (1992), Ch.8",
        form_type="alternatives_elicitation_single",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["new_alternatives_elicited"],
    ),
    StepConfig(
        id="3.3", phase=3,
        name="Organize final alternatives - Single Stk",
        description="Review, refine, and finalize the complete list of alternatives for the single stakeholder.",
        why="A clean, well-described final list of alternatives is required before consequence assessment. (Vieira et al., 2024, §5.3)",
        how="Combine initial and elicited alternatives. Remove duplicates. Ensure each alternative is clearly described. Confirm the final set with the stakeholder.",
        reference="Vieira et al. (2024), §5.3",
        form_type="alternatives_organizer",
        requires_ai=False,
        is_conditional=True,
        condition="stakeholder_config == 'single_dm_single'",
        completion_criteria=["final_alternatives_organized"],
    ),
    StepConfig(
        id="3.4", phase=3,
        name="Depict initial alternatives - Multi Stk",
        description="Collect the initial set of alternatives from all stakeholders individually.",
        why="Individual collection prevents anchoring — stakeholders see their own list before group synthesis. (Vieira et al., 2024, §5.1)",
        how="For each stakeholder, record their initial alternatives independently. Do not share across stakeholders at this stage.",
        reference="Vieira et al. (2024), §5.1",
        form_type="alternatives_list_multi",
        requires_ai=False,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["all_stakeholder_initial_alternatives_listed"],
    ),
    StepConfig(
        id="3.5", phase=3,
        name="Elicit new alternatives - Multi Stk",
        description="Elicit new alternatives from each stakeholder using VFT-based techniques.",
        why="Individual VFT-based elicitation surfaces alternatives aligned with each stakeholder's values. (Vieira et al., 2024, §5.2)",
        how="Repeat the VFT elicitation (from fundamental objectives) with each stakeholder individually. Record per-stakeholder.",
        reference="Vieira et al. (2024), §5.2",
        form_type="alternatives_elicitation_multi",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["all_stakeholder_new_alternatives_elicited"],
    ),
    StepConfig(
        id="3.6", phase=3,
        name="Workshop to define alternatives",
        description="Facilitate a group workshop to review individual alternatives and identify additional collective alternatives.",
        why="Group synthesis can reveal alternatives that satisfy multiple stakeholders and may not emerge from individual elicitation. (Vieira et al., 2024, §5.4)",
        how="Present the aggregated individual alternatives. Facilitate discussion to identify: (a) shared alternatives, (b) alternatives that satisfy multiple objectives, (c) new collective alternatives.",
        reference="Vieira et al. (2024), §5.4",
        form_type="workshop_mode",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["workshop_conducted"],
    ),
    StepConfig(
        id="3.7", phase=3,
        name="Present + elicit collective alternatives",
        description="Present individual alternatives to all stakeholders and collectively identify additional shared alternatives.",
        why="Sharing individual alternatives can stimulate recognition of additional options that serve collective interests. (Vieira et al., 2024, §5.4)",
        how="Show all stakeholders the combined list of alternatives. Ask: What alternatives are missing? What combinations could work?",
        reference="Vieira et al. (2024), §5.4",
        form_type="collective_alternatives",
        requires_ai=True,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["collective_alternatives_identified"],
    ),
    StepConfig(
        id="3.8", phase=3,
        name="Organize final alternatives - Multi Stk",
        description="Consolidate, deduplicate, and finalize the complete list of alternatives from all stakeholders.",
        why="A clean, comprehensive final alternatives list is the prerequisite for consequence assessment and decision analysis. (Vieira et al., 2024, §5.5)",
        how="Merge all individual and collective alternatives. Remove duplicates. Ensure clear descriptions. Confirm the final set with all DMs.",
        reference="Vieira et al. (2024), §5.5",
        form_type="alternatives_organizer",
        requires_ai=False,
        is_conditional=True,
        condition="stakeholder_config in ('single_dm_multi', 'multi_dm_multi')",
        completion_criteria=["final_alternatives_organized"],
    ),
]


class ProcessManager:
    """Manages all 33 VFT StepConfigs and provides filtering and navigation."""

    ALL_STEPS: list[StepConfig] = _STEPS

    def get_steps_for_config(
        self,
        stakeholder_config: str,
        modeling_tech: str,
    ) -> list[StepConfig]:
        """Return steps applicable to the given project configuration.

        Conditional steps are included only when their condition matches.
        Non-conditional steps are always included.
        """
        result: list[StepConfig] = []
        for step in self.ALL_STEPS:
            if not step.is_conditional:
                result.append(step)
                continue
            if self._condition_matches(step.condition, stakeholder_config, modeling_tech):
                result.append(step)
        return result

    def get_step(self, step_id: str) -> StepConfig | None:
        """Look up a step by its id (e.g. '1.1', '2.14')."""
        for step in self.ALL_STEPS:
            if step.id == step_id:
                return step
        return None

    def get_next_step(
        self,
        current_step_id: str,
        stakeholder_config: str,
        modeling_tech: str,
    ) -> StepConfig | None:
        """Return the next applicable step after the given step, or None if at end."""
        applicable = self.get_steps_for_config(stakeholder_config, modeling_tech)
        for i, step in enumerate(applicable):
            if step.id == current_step_id:
                if i + 1 < len(applicable):
                    return applicable[i + 1]
                return None
        return None

    # ──────────────────────────── private helpers ──────────────────────────────

    @staticmethod
    def _condition_matches(
        condition: str | None,
        stakeholder_config: str,
        modeling_tech: str,
    ) -> bool:
        """Evaluate the condition string against the project configuration.

        Supported condition patterns:
          "stakeholder_config == 'value'"
          "stakeholder_config in ('v1', 'v2')"
          "qualitative_modeling_tech in ('v1', 'v2')"
        """
        if condition is None:
            return True
        try:
            return bool(eval(  # noqa: S307  # safe: controlled input, no user data
                condition,
                {"__builtins__": {}},
                {
                    "stakeholder_config": stakeholder_config,
                    "qualitative_modeling_tech": modeling_tech,
                },
            ))
        except Exception:
            return False
