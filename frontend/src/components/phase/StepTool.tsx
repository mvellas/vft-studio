/**
 * StepTool — routes form_type → the appropriate tool component.
 * Falls back to an ARIA chat prompt for unimplemented form types.
 */
import { BotMessageSquare } from 'lucide-react'
import type { StepConfig } from '../../types'
import { useUiStore } from '../../stores/uiStore'
import { useChatStore } from '../../stores/chatStore'
import { useChat } from '../../hooks/useChat'
import { usePhaseProgressStore } from '../../stores/phaseProgressStore'

// Phase 1 tools
import { StakeholderMapper } from '../phase1/StakeholderMapper'
import { DecisionFrameForm } from '../phase1/DecisionFrameForm'
import { DecisionStatement } from '../phase1/DecisionStatement'
import { WorkshopMode } from '../phase1/WorkshopMode'
import { DocumentIDF } from '../phase1/DocumentIDF'

// Phase 2 tools
import { TechniqueSelector } from '../phase2/TechniqueSelector'
import { ObjectivesList } from '../phase2/ObjectivesList'
import { OrgDocumentPanel } from '../phase2/OrgDocumentPanel'
import { VFTDevicePanel } from '../phase2/VFTDevicePanel'
import { MeansEndsNetwork } from '../phase2/MeansEndsNetwork'
import { ObjectivesHierarchy } from '../phase2/ObjectivesHierarchy'
import { CausalRelationsMap } from '../phase2/CausalRelationsMap'

// Phase 3 tool is handled at parent level

const ARIA = { name: 'ARIA', type: 'facilitator' }

interface StepToolProps {
  step: StepConfig
  projectId: string
  onStepComplete?: () => void
}

function ARIAPrompt({ step }: { step: StepConfig }) {
  const { setChatPanelOpen } = useUiStore()
  const { setActiveAgent } = useChatStore()
  const { sendMessage } = useChat()

  function handleStart() {
    setActiveAgent(ARIA.name, ARIA.type)
    setChatPanelOpen(true)
    sendMessage(
      `Estou no passo ${step.id} — "${step.name}". Por favor, me guie neste passo.`,
      { agentName: ARIA.name, agentType: ARIA.type }
    )
  }

  return (
    <div
      className="rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4"
      style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)', minHeight: '240px' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.2)' }}
      >
        <BotMessageSquare size={22} style={{ color: '#e879f9' }} />
      </div>
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: '#f1f5f9' }}>
          Este passo é conduzido com ARIA
        </p>
        <p className="text-xs" style={{ color: '#475569' }}>
          Use o chat para registrar suas respostas e avançar no processo.
        </p>
      </div>
      <button
        onClick={handleStart}
        className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        style={{
          background: 'rgba(232,121,249,0.12)',
          color: '#e879f9',
          border: '1px solid rgba(232,121,249,0.3)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,121,249,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,121,249,0.12)' }}
      >
        <BotMessageSquare size={15} />
        Iniciar com ARIA
      </button>
    </div>
  )
}

export function StepTool({ step, projectId, onStepComplete }: StepToolProps) {
  const { refresh } = usePhaseProgressStore()

  function handleComplete() {
    onStepComplete?.()
    refresh(projectId)
  }

  // Phase 1 routing
  if (step.form_type === 'stakeholder_mapper') {
    return <StakeholderMapper projectId={projectId} onStepComplete={handleComplete} />
  }

  if (step.form_type === 'decision_frame' || step.form_type === 'decision_frame_review') {
    const variant = step.id as '1.2' | '1.3' | '1.5'
    return <DecisionFrameForm projectId={projectId} variant={variant} onStepComplete={handleComplete} />
  }

  if (step.form_type === 'decision_statement') {
    return <DecisionStatement projectId={projectId} onStepComplete={handleComplete} />
  }

  if (step.form_type === 'workshop_mode') {
    return <WorkshopMode projectId={projectId} onStepComplete={handleComplete} />
  }

  if (step.form_type === 'document_analysis') {
    return <DocumentIDF projectId={projectId} onStepComplete={handleComplete} />
  }

  // Phase 2 routing
  if (step.form_type === 'technique_selector') {
    return <TechniqueSelector projectId={projectId} onSelect={handleComplete} />
  }

  if (
    step.form_type === 'value_to_objective' ||
    step.form_type === 'wish_list_single' ||
    step.form_type === 'wish_list_multi' ||
    step.form_type === 'value_to_objective_multi' ||
    step.form_type === 'collective_objectives' ||
    step.form_type === 'objective_categorizer' ||
    step.form_type === 'witi_test' ||
    step.form_type === 'control_of_consequences'
  ) {
    return (
      <ObjectivesList
        projectId={projectId}
        onWITI={() => {}}
        onCoC={() => {}}
      />
    )
  }

  if (step.form_type === 'questionnaire_builder') {
    return <OrgDocumentPanel projectId={projectId} />
  }

  if (step.form_type === 'vft_devices_single' || step.form_type === 'vft_devices_multi') {
    return <VFTDevicePanel projectId={projectId} stakeholderId={null} />
  }

  if (step.form_type === 'means_ends_network') {
    return <MeansEndsNetwork projectId={projectId} />
  }

  if (step.form_type === 'objectives_hierarchy') {
    return <ObjectivesHierarchy projectId={projectId} />
  }

  if (step.form_type === 'attribute_definer') {
    // AttributeDefiner requires selecting an objective first — show ObjectivesList
    return (
      <ObjectivesList
        projectId={projectId}
        onWITI={() => {}}
        onCoC={() => {}}
      />
    )
  }

  if (step.form_type === 'causal_relations') {
    return <CausalRelationsMap projectId={projectId} />
  }

  // Fallback: ARIA-guided step
  return <ARIAPrompt step={step} />
}
