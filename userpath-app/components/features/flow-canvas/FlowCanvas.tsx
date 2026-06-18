'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  type ReactFlowInstance,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeTypes,
  type Viewport,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  type NodeProps,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import type { Node as FlowNode, Edge as FlowEdge } from '@/types';
import { buildStepMap, getNodeDimensions } from '@/lib/step-numbering';
import styles from './FlowCanvas.module.css';

// Dagre uses centre-point positioning — add generous padding so labels never clip
const DAGRE_NODE_W_PADDING = 40;
const DAGRE_NODE_H_PADDING = 40;

// ── Node data shape ───────────────────────────────────────────────────────────

interface NodeData {
  label: string;
  isHappyPath: boolean;
  stepNumber: string;
  nodeId: string;
  type: string;
  editMode: boolean;
  onRename?: (nodeId: string, newLabel: string) => void;
  onDelete?: (nodeId: string) => void;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function EditActions({ data, onRename }: { data: NodeData; onRename?: () => void }) {
  if (!data.editMode) return null;
  const isTerminal = data.type === 'terminal';

  return (
    <div className={styles.nodeActions}>
      <button
        className={styles.nodeActionBtn}
        onClick={onRename}
        aria-label="Rename step"
        title="Rename step"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        className={`${styles.nodeActionBtn} ${isTerminal ? styles.nodeActionDisabled : ''}`}
        onClick={isTerminal ? undefined : () => data.onDelete?.(data.nodeId)}
        aria-label="Delete step"
        title={isTerminal ? 'Start and end points cannot be deleted' : 'Delete step'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

function EditableLabel({ data, onStartRename, renaming, renameValue, onRenameChange, onConfirm, onCancel }: {
  data: NodeData;
  onStartRename: () => void;
  renaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  if (renaming) {
    return (
      <div className={styles.renameWrapper}>
        <input
          ref={inputRef}
          className={styles.renameInput}
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={onConfirm}
        />
      </div>
    );
  }

  return (
    <span onDoubleClick={onStartRename} style={{ cursor: data.editMode ? 'pointer' : 'default', flex: 1 }}>
      {data.label}
    </span>
  );
}

// ── Shared handles (all four directions so Dagre can route freely) ─────────────

function Handles() {
  const s = { background: 'transparent', border: 'none' };
  return (
    <>
      <Handle type="target" position={Position.Left} id="left" style={s} />
      <Handle type="target" position={Position.Top} id="top-in" style={s} />
      <Handle type="source" position={Position.Right} id="right" style={s} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={s} />
      <Handle type="source" position={Position.Top} id="top" style={s} />
    </>
  );
}

// ── Node components ───────────────────────────────────────────────────────────

function useRename(data: NodeData) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameVal] = useState(data.label);

  const start = () => { if (!data.editMode) return; setRenameVal(data.label); setRenaming(true); };
  const confirm = () => { if (!renameValue.trim()) return; data.onRename?.(data.nodeId, renameValue.trim()); setRenaming(false); };
  const cancel = () => { setRenameVal(data.label); setRenaming(false); };

  return { renaming, renameValue, setRenameVal, start, confirm, cancel };
}

function ProcessNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const cls = data.isHappyPath ? `${styles.nodeProcess} ${styles.nodeHappyPath}` : styles.nodeProcess;
  return (
    <div className={cls}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

function DecisionNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const cls = data.isHappyPath ? `${styles.nodeDecision} ${styles.nodeHappyPath}` : styles.nodeDecision;
  return (
    <div className={cls}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

function ErrorNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  return (
    <div className={styles.nodeError}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

function TerminalNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const cls = data.isHappyPath
    ? `${styles.nodeTerminal} ${styles.nodeTerminalSuccess}`
    : styles.nodeTerminal;
  return (
    <div className={cls}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

const nodeTypes: NodeTypes = { process: ProcessNode, decision: DecisionNode, error: ErrorNode, terminal: TerminalNode };

// Step numbering moved to lib/step-numbering.ts — imported above.

// ── React Flow node builder ───────────────────────────────────────────────────

function buildReactFlowNodes(
  fn: FlowNode[],
  fe: FlowEdge[],
  editMode: boolean,
  onRename?: (id: string, label: string) => void,
  onDelete?: (id: string) => void,
): RFNode<NodeData>[] {
  const stepMap = buildStepMap(fn, fe);

  return fn.map(n => ({
    id: n.nodeId,
    type: n.type,
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      isHappyPath: n.isHappyPath,
      stepNumber: stepMap.get(n.nodeId) ?? '–',
      nodeId: n.nodeId,
      type: n.type,
      editMode,
      onRename,
      onDelete,
    },
  }));
}

// ── React Flow edge builder ───────────────────────────────────────────────────

function buildReactFlowEdges(fe: FlowEdge[], fn: FlowNode[]): RFEdge[] {
  const nodeMap = new Map(fn.map(n => [n.nodeId, n]));

  return fe.map((e, index) => {
    const source = nodeMap.get(e.fromNode);
    const target = nodeMap.get(e.toNode);
    const isHappy = source?.isHappyPath && target?.isHappyPath;
    const isError = target?.type === 'error' || source?.type === 'error';

    return {
      id: `e-${e.fromNode}-${e.toNode}-${index}`,
      source: e.fromNode,
      target: e.toNode,
      label: e.label || undefined,
      type: 'smoothstep',
      animated: false,
      style: isHappy
        ? { stroke: 'var(--color-primary)', strokeWidth: 2.5, opacity: 0.85 }
        : isError
          ? { stroke: 'var(--color-error)', strokeWidth: 1.5, strokeDasharray: '5 4' }
          : { stroke: 'var(--color-outline)', strokeWidth: 1.5 },
      labelStyle: { fontSize: 11, fontWeight: 700, fill: 'var(--color-on-surface)' },
      labelBgStyle: { fill: 'var(--color-surface)', fillOpacity: 0.9 },
      labelBgPadding: [4, 8] as [number, number],
      labelBgBorderRadius: 4,
    };
  });
}

// ── Dagre layout ──────────────────────────────────────────────────────────────
// Full Dagre LR — no manual overrides. Let the algorithm handle everything.

function layoutNodes(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  const g = new dagre.graphlib.Graph({ compound: false });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranksep: 240,
    nodesep: 60,
    edgesep: 30,
    marginx: 150,
    marginy: 150,
  });

  nodes.forEach(node => {
    const dim = getNodeDimensions(node.type ?? 'process');
    g.setNode(node.id, {
      width: dim.width + DAGRE_NODE_W_PADDING,
      height: dim.height + DAGRE_NODE_H_PADDING,
    });
  });

  edges.forEach(edge => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  return nodes.map(node => {
    const pos = g.node(node.id);
    const dim = getNodeDimensions(node.type ?? 'process');
    return {
      ...node,
      position: {
        x: pos.x - dim.width / 2,
        y: pos.y - dim.height / 2,
      },
    };
  });
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  pathOptions: { borderRadius: 8 },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  flowId?: string;
  editMode?: boolean;
  onRename?: (nodeId: string, newLabel: string) => void;
  onDelete?: (nodeId: string) => void;
  onAddNode?: (sourceId: string, targetId: string) => void;
  reactFlowRef?: React.MutableRefObject<ReactFlowInstance | null>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FlowCanvas({
  nodes: flowNodes,
  edges: flowEdges,
  flowId,
  editMode,
  onRename,
  onDelete,
  onAddNode,
  reactFlowRef,
}: FlowCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const hasLayouted = useRef(false);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const isEditMode = editMode ?? false;
  const hasNodes = flowNodes.length > 0;

  const baseNodes = useMemo(
    () => buildReactFlowNodes(flowNodes, flowEdges, isEditMode, onRename, onDelete),
    [flowNodes, flowEdges, isEditMode, onRename, onDelete],
  );
  const baseEdges = useMemo(
    () => buildReactFlowEdges(flowEdges, flowNodes),
    [flowEdges, flowNodes],
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    instanceRef.current = instance;
    if (reactFlowRef) reactFlowRef.current = instance;
    setViewport(instance.getViewport());
  }, [reactFlowRef]);

  const rafRef = useRef<number | null>(null);
  const lastVpRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 });
  const onMove = useCallback((_event: unknown, vp: Viewport) => {
    lastVpRef.current = vp;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      setViewport(lastVpRef.current);
      rafRef.current = null;
    });
  }, []);

  // Layout on every data change so cached-then-fresh updates render
  useEffect(() => {
    if (baseNodes.length === 0) return;

    try {
      const laid = layoutNodes(baseNodes, baseEdges);
      setRfNodes(laid);
      setRfEdges(baseEdges);
    } catch {
      // dagre layout failed — render nodes at position (0,0) so user sees something
      setRfNodes(baseNodes);
      setRfEdges(baseEdges);
    }

    const t = setTimeout(() => {
      instanceRef.current?.fitView({ padding: 0.15, minZoom: 0.05, maxZoom: 1.2 });
    }, 60);
    return () => {
      clearTimeout(t);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [baseNodes, baseEdges, setRfNodes, setRfEdges]);

  useEffect(() => { hasLayouted.current = false; }, [flowId, baseNodes]);

  const handleAddNodeFromEdge = useCallback((source: string, target: string) => {
    onAddNode?.(source, target);
  }, [onAddNode]);

  // Edge + buttons (edit mode overlay)
  const edgeAddButtons = useMemo(() => {
    if (!isEditMode || rfNodes.length === 0) return [];
    return rfEdges
      .filter(edge => !hoveredEdgeId || edge.id === hoveredEdgeId)
      .map(edge => {
        const src = rfNodes.find(n => n.id === edge.source);
        const tgt = rfNodes.find(n => n.id === edge.target);
        if (!src || !tgt) return null;

        const sw = getNodeDimensions(src.type ?? 'process').width;
        const sh = getNodeDimensions(src.type ?? 'process').height;
        const th = getNodeDimensions(tgt.type ?? 'process').height;

        const fx = (src.position.x + sw + tgt.position.x) / 2;
        const fy = (src.position.y + sh / 2 + tgt.position.y + th / 2) / 2;

        return {
          id: `add-${edge.id}`,
          screenX: fx * viewport.zoom + viewport.x,
          screenY: fy * viewport.zoom + viewport.y,
          source: edge.source,
          target: edge.target,
        };
      })
      .filter(Boolean) as { id: string; screenX: number; screenY: number; source: string; target: string }[];
  }, [isEditMode, rfNodes, rfEdges, hoveredEdgeId, viewport]);

  if (!hasNodes) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing to show yet</p>
          <p className={styles.emptyText}>This flow doesn&rsquo;t have any steps to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onMove={onMove}
        onEdgeMouseEnter={(_e, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        style={{ width: '100%', height: '100%' }}
        attributionPosition="bottom-left"
        fitView={false}
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={isEditMode}
      >
        <Background />
        <Controls />

        {/* Edit-mode: add-node buttons on edges */}
        {isEditMode && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
            {edgeAddButtons.map(btn => (
              <g
                key={btn.id}
                className={styles.edgeAddBtnGroup}
                onClick={() => handleAddNodeFromEdge(btn.source, btn.target)}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
              >
                <circle cx={btn.screenX} cy={btn.screenY} r={10} className={styles.edgeAddBg} />
                <text x={btn.screenX} y={btn.screenY + 4} textAnchor="middle" className={styles.edgeAddText}>+</text>
              </g>
            ))}
          </svg>
        )}
      </ReactFlow>
    </div>
  );
}