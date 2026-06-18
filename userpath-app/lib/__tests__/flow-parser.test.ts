import { describe, it, expect } from 'vitest';
import { parseFlowOutput } from '@/lib/flow-parser';
import type { RawFlowOutput } from '@/types';

function makeValidRaw(): RawFlowOutput {
  return {
    nodes: [
      { node_id: 'n1', type: 'terminal', label: 'Start', is_happy_path: true, edge_case_type: null },
      { node_id: 'n2', type: 'process', label: 'User enters email', is_happy_path: true, edge_case_type: null },
      { node_id: 'n3', type: 'terminal', label: 'End', is_happy_path: true, edge_case_type: null },
    ],
    edges: [
      { edge_id: 'e1', from_node: 'n1', to_node: 'n2', label: '' },
      { edge_id: 'e2', from_node: 'n2', to_node: 'n3', label: '' },
    ],
    user_journey_steps: [
      { step: 1, user_action: 'Open app', system_response: 'Shows home', edge_case: '', edge_case_response: '' },
      { step: 2, user_action: 'Enter email', system_response: 'Validates', edge_case: 'Wrong format', edge_case_response: 'Show error' },
    ],
  };
}

describe('parseFlowOutput', () => {
  it('parses valid flow output successfully', () => {
    const raw = makeValidRaw();
    const result = parseFlowOutput(raw);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.userJourneySteps).toHaveLength(2);
    expect(result.nodes[0].nodeId).toBe('n1');
    expect(result.nodes[0].type).toBe('terminal');
  });

  it('throws on empty nodes', () => {
    const raw = { ...makeValidRaw(), nodes: [] };
    expect(() => parseFlowOutput(raw)).toThrow('Output must contain at least one node');
  });

  it('throws on empty edges', () => {
    const raw = { ...makeValidRaw(), edges: [] };
    expect(() => parseFlowOutput(raw)).toThrow('Output must contain at least one edge');
  });

  it('throws on empty journey steps', () => {
    const raw = { ...makeValidRaw(), user_journey_steps: [] };
    expect(() => parseFlowOutput(raw)).toThrow('Output must contain at least one journey step');
  });

  it('throws on node missing required fields', () => {
    const raw = makeValidRaw();
    raw.nodes[1] = { node_id: '', type: 'process', label: '', is_happy_path: false, edge_case_type: null };
    expect(() => parseFlowOutput(raw)).toThrow('Node missing required fields');
  });

  it('throws on invalid node type', () => {
    const raw = makeValidRaw();
    raw.nodes[1] = { node_id: 'n2', type: 'invalid' as 'process', label: 'Test', is_happy_path: false, edge_case_type: null };
    expect(() => parseFlowOutput(raw)).toThrow('Invalid node type "invalid"');
  });

  it('throws on duplicate node IDs', () => {
    const raw = makeValidRaw();
    raw.nodes.push({
      node_id: 'n1', type: 'process', label: 'Duplicate', is_happy_path: false, edge_case_type: null,
    });
    expect(() => parseFlowOutput(raw)).toThrow('Duplicate node IDs detected');
  });

  it('throws on edge referencing unknown from_node', () => {
    const raw = makeValidRaw();
    raw.edges[0] = { edge_id: 'e-bad', from_node: 'nonexistent', to_node: 'n2', label: '' };
    expect(() => parseFlowOutput(raw)).toThrow('Edge references unknown from_node "nonexistent"');
  });

  it('throws on edge referencing unknown to_node', () => {
    const raw = makeValidRaw();
    raw.edges[0] = { edge_id: 'e-bad', from_node: 'n1', to_node: 'nonexistent', label: '' };
    expect(() => parseFlowOutput(raw)).toThrow('Edge references unknown to_node "nonexistent"');
  });

  it('throws on duplicate edge IDs', () => {
    const raw = makeValidRaw();
    raw.edges.push({ edge_id: 'e1', from_node: 'n1', to_node: 'n2', label: '' });
    expect(() => parseFlowOutput(raw)).toThrow('Duplicate edge IDs detected');
  });

  it('throws on journey step missing required fields', () => {
    const raw = makeValidRaw();
    raw.user_journey_steps[0] = { step: 0 as unknown as number, user_action: '', system_response: '', edge_case: '', edge_case_response: '' };
    expect(() => parseFlowOutput(raw)).toThrow('Journey step missing required fields');
  });

  it('coerces unknown edge_case_type to null', () => {
    const raw = makeValidRaw();
    raw.nodes[1] = {
      node_id: 'n2', type: 'process', label: 'Test', is_happy_path: false,
      edge_case_type: 'unknown_value' as null,
    };
    const result = parseFlowOutput(raw);
    expect(result.nodes[1].edgeCaseType).toBeNull();
  });
});
