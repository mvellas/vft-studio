export interface Project {
  id: string
  name: string
  description: string
  context_notes: string
  created_at: string
  updated_at: string
  phase_status: number  // 1, 2, 3
  current_step: string  // "1.1", "2.14", etc.
  qualitative_modeling_tech: string
  stakeholder_config: string
  idf_purpose: string
  idf_perspective: string
  idf_scope: string
  idf_documented_at: string | null
  decision_statement: string
  decision_statement_validated: number
  phase1_completed: number
  phase2_completed: number
  phase3_completed: number
  archived: number
  archived_at: string | null
}

export interface ProjectCreate {
  name: string
  description?: string
  context_notes?: string
}

export interface Stakeholder {
  id: string
  project_id: string
  name: string
  role: 'decision_authority' | 'customer' | 'owner' | 'user' | 'consumer'
  is_decision_maker: number
  profile: string
  interests: string
  elicitation_mode: 'interview' | 'document_analysis' | 'simulated'
  interview_status: string
  interview_notes: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface StepConfig {
  id: string
  phase: number
  name: string
  description: string
  why: string
  how: string
  reference: string
  form_type: string
  requires_ai: boolean
}

export interface CurrentStep {
  step: StepConfig
  completed_steps: string[]
  total_steps: number
  progress_percent: number
}

export interface ChatMessage {
  id: string
  session_id: string
  project_id: string
  timestamp: string
  role: string
  agent_name: string
  content: string
  phase: number | null
  step: string | null
}
