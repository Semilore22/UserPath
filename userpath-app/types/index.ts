// ── Constants-as-const arrays ──────────────────────────────

export const FLOW_TYPES = [
  'onboarding',
  'checkout',
  'sign_up_login',
  'full_product_flow',
  'custom',
] as const;

export type FlowType = typeof FLOW_TYPES[number];

export const EDIT_TYPES = [
  'rename_node',
  'add_branch',
  'remove_step',
  'change_label',
  'restore_state',
] as const;

export type EditType = typeof EDIT_TYPES[number];

// ── Edge Case Types ────────────────────────────────────────

export const EDGE_CASE_TYPES = [
  'network_failure',
  'empty_state',
  'invalid_input',
  'session_timeout',
  'system_error',
] as const;

export type EdgeCaseType = typeof EDGE_CASE_TYPES[number] | null;

// ── Form Inputs ────────────────────────────────────────────

export interface DescriptionInput {
  sessionId: string;
  ipAddress: string;
  rawDescription: string;
  submittedAt: string;
}

export interface FormSubmission {
  sessionId: string;
  productName: string;
  flowType: FlowType;
  targetUsers: string[];
  keyAction: string;
  submittedAt: string;
}

// ── Generation ──────────────────────────────────────────────

export interface GenerateFlowInput {
  description: string;
  productName: string;
  flowType: FlowType;
  targetUsers: string[];
  keyAction: string;
  sessionId: string;
}

// ── Raw AI Output (snake_case) ─────────────────────────────

export interface RawNode {
  node_id: string;
  type: 'process' | 'decision' | 'error' | 'terminal';
  label: string;
  is_happy_path: boolean;
  edge_case_type: EdgeCaseType; // ← new
}

export interface RawEdge {
  edge_id: string;
  from_node: string;
  to_node: string;
  label: string;
}

export interface RawJourneyStep {
  step: number;
  user_action: string;
  system_response: string;
  edge_case: string;
  edge_case_response: string;
}

export interface RawFlowOutput {
  nodes: RawNode[];
  edges: RawEdge[];
  user_journey_steps: RawJourneyStep[];
}

// ── Validated / Transformed Types (camelCase) ──────────────

export interface Node {
  nodeId: string;
  type: 'process' | 'decision' | 'error' | 'terminal';
  label: string;
  isHappyPath: boolean;
  edgeCaseType: EdgeCaseType; // ← new
}

export interface Edge {
  edgeId: string;
  fromNode: string;
  toNode: string;
  label: string;
}

export interface JourneyStep {
  step: number;
  userAction: string;
  systemResponse: string;
  edgeCase: string;
  edgeCaseResponse: string;
}

export interface Flow {
  nodes: Node[];
  edges: Edge[];
  userJourneySteps: JourneyStep[];
}

// ── API Request / Response ─────────────────────────────────

export interface GenerateFlowResponse {
  flowId: string;
  productName: string;
  nodes: Node[];
  edges: Edge[];
  userJourneySteps: JourneyStep[];
  createdAt: string;
  lastEditedAt?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export interface FlowNotFound {
  notFound: true;
}

export type FlowFetchResponse = FlowNotFound | GenerateFlowResponse;

export interface EditRequest {
  editType: EditType;
  sessionId: string;
  nodeId: string;
  previousValue: string;
  newValue: string;
  branchData?: {
    newNode: Node;
    newEdge: Edge;
  };
}

export interface ApiError {
  error: string;
  retryAfter?: number;
}