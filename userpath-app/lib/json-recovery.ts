import { DeepSeekApiError } from './errors';
import type { RawFlowOutput, Flow as FlowData } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function looseJsonParse(raw: string): any {
  let cleaned = raw.trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    cleaned = cleaned.replace(/\\(['"])/g, '\\$1');
    // Strip already-quoted strings before key matching to avoid corrupting values
    const placeholderMap = new Map<string, string>();
    let placeholderIndex = 0;
    const stripped = cleaned.replace(/"([^"\\]|\\.)*"/g, (match) => {
      const key = `__QS${placeholderIndex++}__`;
      placeholderMap.set(key, match);
      return key;
    });
    const reKeyed = stripped.replace(
      /(?:^|(?<=[\s,{]))([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:(?!:)/g,
      '"$1":',
    );
    // Restore quoted strings
    cleaned = reKeyed.replace(/__QS\d+__/g, (match) => placeholderMap.get(match) ?? match);
    cleaned = cleaned.replace(
      /:\s*'([^']*?)'\s*([,}\]])/g,
      ': "$1"$2',
    );
    cleaned = cleaned.replace(
      /,\s*'([^']*?)'\s*([,\]})])/g,
      ', "$1"$2',
    );
    return JSON.parse(cleaned);
  }
}

export async function parseDeepSeekResponse(
  data: unknown
): Promise<RawFlowOutput> {
  const body = data as {
    choices?: Array<{
      message?: { content?: string }
    }>
  };
  const content = body?.choices?.[0]?.message?.content;

  if (!content) {
    throw new DeepSeekApiError(
      500,
      'DeepSeek response missing content'
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = looseJsonParse(content) as Record<string, unknown>;
  } catch {
    throw new DeepSeekApiError(500, 'DeepSeek response contains malformed JSON');
  }

  if (
    !parsed.nodes ||
    !parsed.edges ||
    !parsed.user_journey_steps ||
    !Array.isArray(parsed.nodes) ||
    !Array.isArray(parsed.edges) ||
    !Array.isArray(parsed.user_journey_steps)
  ) {
    throw new DeepSeekApiError(
      500,
      'DeepSeek response missing required fields'
    );
  }

  // Expand type shortcode to full type name
  const expandType = (t: string): string => {
    const map: Record<string, string> = {
      p: 'process',
      d: 'decision',
      e: 'error',
      x: 'terminal',
    };
    return map[t] ?? 'process';
  };

  // Normalise nodes — handle both compressed
  // and uncompressed keys for safety
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalisedNodes = (parsed.nodes as any[]).map((n) => ({
    node_id: n.node_id ?? n.id ?? `node_${Math.random()}`,
    type: n.type ?? expandType(n.t ?? 'p'),
    label: n.label ?? n.l ?? 'Unnamed node',
    is_happy_path: n.is_happy_path ?? n.h ?? false,
    edge_case_type: n.edge_case_type ?? null,
  }));

  // Normalise edges — handle both compressed
  // and uncompressed keys for safety
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalisedEdges = (parsed.edges as any[]).map((e) => ({
    edge_id: e.edge_id ?? e.id ?? `edge_${Math.random()}`,
    from_node: e.from_node ?? e.s ?? '',
    to_node: e.to_node ?? e.t ?? '',
    label: e.label ?? e.l ?? '',
  }));

  // Normalise journey steps — handle both
  // compressed and uncompressed keys for safety
  const normalisedJourney = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed.user_journey_steps as any[]
  ).map((s) => ({
    step: s.step ?? s.n ?? 0,
    user_action: s.user_action ?? s.a ?? '',
    system_response: s.system_response ?? s.r ?? '',
    edge_case: s.edge_case ?? s.e ?? '',
    edge_case_response: s.edge_case_response ?? s.er ?? '',
  }));

  return {
    nodes: normalisedNodes,
    edges: normalisedEdges,
    user_journey_steps: normalisedJourney,
  };
}

export function storedFlowToRawOutput(stored: FlowData): RawFlowOutput {
  return {
    nodes: stored.nodes.map(n => ({
      node_id: n.nodeId,
      type: n.type,
      label: n.label,
      is_happy_path: n.isHappyPath,
      edge_case_type: n.edgeCaseType,
    })),
    edges: stored.edges.map(e => ({
      edge_id: e.edgeId,
      from_node: e.fromNode,
      to_node: e.toNode,
      label: e.label,
    })),
    user_journey_steps: stored.userJourneySteps.map(s => ({
      step: s.step,
      user_action: s.userAction,
      system_response: s.systemResponse,
      edge_case: s.edgeCase,
      edge_case_response: s.edgeCaseResponse,
    })),
  };
}
