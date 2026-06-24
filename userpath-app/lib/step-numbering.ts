import type { Node as FlowNode, Edge as FlowEdge } from '@/types';

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 56;
export const DIAMOND_WIDTH = 250;
export const DIAMOND_HEIGHT = 250;
export const TERMINAL_WIDTH = 220;
export const TERMINAL_HEIGHT = 52;

export function getNodeDimensions(type: string): { width: number; height: number } {
  switch (type) {
    case 'decision': return { width: DIAMOND_WIDTH, height: DIAMOND_HEIGHT };
    case 'terminal': return { width: TERMINAL_WIDTH, height: TERMINAL_HEIGHT };
    default: return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }
}

export function buildStepMap(fn: FlowNode[], fe: FlowEdge[]): Map<string, string> {
  const stepMap = new Map<string, string>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  fn.forEach(n => { inDegree.set(n.nodeId, 0); adjList.set(n.nodeId, []); });
  fe.forEach(e => {
    adjList.get(e.fromNode)?.push(e.toNode);
    inDegree.set(e.toNode, (inDegree.get(e.toNode) ?? 0) + 1);
  });

  // BFS topological order over happy-path nodes only
  const happyIds = new Set(fn.filter(n => n.isHappyPath).map(n => n.nodeId));
  const queue: string[] = [];
  fn.forEach(n => { if (n.isHappyPath && inDegree.get(n.nodeId) === 0) queue.push(n.nodeId); });

  // fallback: if no zero-indegree happy node, pick the terminal-free start
  if (queue.length === 0) {
    const firstHappy = fn.find(n => n.isHappyPath && n.type === 'terminal' && !fe.some(e => e.toNode === n.nodeId));
    const fallback = fn.find(n => n.isHappyPath);
    if (firstHappy) queue.push(firstHappy.nodeId);
    else if (fallback) queue.push(fallback.nodeId);
  }

  let happyCounter = 1;
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (happyIds.has(id)) {
      stepMap.set(id, String(happyCounter++));
      adjList.get(id)?.forEach(nxt => { if (happyIds.has(nxt) && !visited.has(nxt)) queue.push(nxt); });
    }
  }

  // Second pass: any happy-path node missed (reversed edge, disconnected sub-graph)
  const unvisited = fn.filter(n => n.isHappyPath && !visited.has(n.nodeId)).sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  if (unvisited.length > 0) {
    queue.push(unvisited[0].nodeId);
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (happyIds.has(id)) {
        stepMap.set(id, String(happyCounter++));
        adjList.get(id)?.forEach(nxt => { if (happyIds.has(nxt) && !visited.has(nxt)) queue.push(nxt); });
      }
    }
  }

  // Branch nodes: letter suffix off nearest happy-path ancestor
  const branchCounters = new Map<string, number>();
  fn.filter(n => !n.isHappyPath).forEach(n => {
    const parentEdge = fe.find(e => e.toNode === n.nodeId && stepMap.has(e.fromNode));
    if (parentEdge) {
      const parentStep = stepMap.get(parentEdge.fromNode)!;
      const count = branchCounters.get(parentEdge.fromNode) ?? 0;
      branchCounters.set(parentEdge.fromNode, count + 1);
      stepMap.set(n.nodeId, `${parentStep}${String.fromCharCode(97 + count)}`);
    } else {
      stepMap.set(n.nodeId, '–');
    }
  });

  return stepMap;
}
