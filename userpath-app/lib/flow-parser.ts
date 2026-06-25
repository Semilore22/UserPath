import { FlowParseError } from './errors';
import type { RawFlowOutput, Flow, Node, Edge, JourneyStep } from '@/types';

const VALID_NODE_TYPES = ['process', 'decision', 'error', 'terminal'] as const;
type ValidNodeType = typeof VALID_NODE_TYPES[number];

const VALID_EDGE_CASE_TYPES = [
  'network_failure',
  'empty_state',
  'invalid_input',
  'session_timeout',
  'system_error',
] as const;

type RawNode = RawFlowOutput['nodes'][number];
type RawEdge = RawFlowOutput['edges'][number];

function transformNode(raw: RawNode): Node {
  return {
    nodeId: raw.node_id,
    type: raw.type as ValidNodeType,
    label: raw.label,
    isHappyPath: raw.is_happy_path,
    edgeCaseType: VALID_EDGE_CASE_TYPES.includes(raw.edge_case_type as typeof VALID_EDGE_CASE_TYPES[number])
      ? raw.edge_case_type
      : null, // ← coerce unexpected values to null rather than erroring
  };
}

function transformEdge(raw: RawEdge): Edge {
  return {
    edgeId: raw.edge_id,
    fromNode: raw.from_node,
    toNode: raw.to_node,
    label: raw.label,
  };
}

function transformJourneyStep(
  raw: RawFlowOutput['user_journey_steps'][number],
): JourneyStep {
  return {
    step: raw.step,
    userAction: raw.user_action,
    systemResponse: raw.system_response,
    edgeCase: raw.edge_case,
    edgeCaseResponse: raw.edge_case_response,
  };
}

export function parseFlowOutput(raw: RawFlowOutput): Flow {
  if (!raw.nodes?.length) {
    throw new FlowParseError('Output must contain at least one node');
  }

  if (!raw.edges?.length) {
    throw new FlowParseError('Output must contain at least one edge');
  }

  if (!raw.user_journey_steps?.length) {
    throw new FlowParseError('Output must contain at least one journey step');
  }

  const nodes = raw.nodes.map((n: RawNode) => {
    if (!n.node_id || !n.type || !n.label) {
      throw new FlowParseError('Node missing required fields');
    }

    if (!VALID_NODE_TYPES.includes(n.type as ValidNodeType)) {
      throw new FlowParseError(
        `Invalid node type "${n.type}". Must be one of: ${VALID_NODE_TYPES.join(', ')}`,
      );
    }

    return transformNode(n);
  });

  const nodeIds = new Set(nodes.map((n) => n.nodeId));

  if (nodes.length !== nodeIds.size) {
    throw new FlowParseError('Duplicate node IDs detected');
  }

  const edges = raw.edges.map((e: RawEdge) => {
    if (!e.edge_id || !e.from_node || !e.to_node) {
      throw new FlowParseError('Edge missing required fields');
    }

    if (!nodeIds.has(e.from_node)) {
      throw new FlowParseError(
        `Edge references unknown from_node "${e.from_node}"`,
      );
    }

    if (!nodeIds.has(e.to_node)) {
      throw new FlowParseError(
        `Edge references unknown to_node "${e.to_node}"`,
      );
    }

    return transformEdge(e);
  });

  const edgeIds = new Set(edges.map((e) => e.edgeId));
  if (edges.length !== edgeIds.size) {
    throw new FlowParseError('Duplicate edge IDs detected');
  }

  const userJourneySteps = raw.user_journey_steps.map(
    (s: RawFlowOutput['user_journey_steps'][number]) => {
      if (typeof s.step !== 'number' || s.user_action === undefined || s.system_response === undefined) {
        throw new FlowParseError('Journey step missing required fields');
      }

      return transformJourneyStep(s);
    },
  );

  return { nodes, edges, userJourneySteps };
}