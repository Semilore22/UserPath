'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactFlow, {
  type ReactFlowInstance,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useStore,
  Handle,
  type NodeProps,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import type { Node as FlowNode, Edge as FlowEdge } from '@/types';
import { buildStepMap, getNodeDimensions } from '@/lib/step-numbering';
import { LabelAboveEdge } from './LabelAboveEdge';
import styles from './FlowCanvas.module.css';

// ── Render validation ─────────────────────────────────────────────────────────

function isFlowReady(
  nodes: RFNode<NodeData>[],
  edges: RFEdge[],
): boolean {
  if (!nodes || nodes.length === 0) {
    console.error('[FlowCanvas] No nodes to render');
    return false;
  }
  if (!edges || edges.length === 0) {
    console.warn('[FlowCanvas] No edges — flow may be disconnected');
  }
  const hasTerminal = nodes.some(
    n => n.type === 'terminal'
  );
  if (!hasTerminal) {
    console.error('[FlowCanvas] No terminal node found');
    return false;
  }
  return true;
}

// Dagre uses centre-point positioning — add generous padding so labels never clip
const DAGRE_NODE_W_PADDING = 40;
const DAGRE_NODE_H_PADDING = 40;

// ── Node data shape ───────────────────────────────────────────────────────────

export interface NodeData {
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
  const isTerminal = data.type === 'terminal';

  return (
    <div className={`${styles.nodeActions} ${data.editMode ? '' : styles.nodeActionsHidden}`}>
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

function useScaledFontSize() {
  const zoom = useStore((s) => s.transform[2]);
  const baseFontSize = 14;
  const scaledFontSize = Math.min(baseFontSize / zoom, 22);
  const finalFontSize = Math.max(scaledFontSize, 12);
  return finalFontSize;
}

function ProcessNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const fontSize = useScaledFontSize();
  const cls = data.isHappyPath ? `${styles.nodeProcess} ${styles.nodeHappyPath}` : styles.nodeProcess;
  return (
    <div className={cls} style={{ fontSize, width: 'auto', minWidth: '180px', maxWidth: '360px', padding: '12px 24px' }}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

function DecisionNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const fontSize = useScaledFontSize();
  const cls = data.isHappyPath ? `${styles.nodeDecision} ${styles.nodeHappyPath}` : styles.nodeDecision;
  return (
    <div
      className={cls}
      style={{
        width: '250px', height: '250px', transform: 'rotate(45deg)',
        background: 'hsl(287, 20%, 16%)', border: '1.5px solid hsl(287, 95%, 53%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Handles />
      <div
        style={{
          transform: 'rotate(-45deg)', width: '204px', textAlign: 'center',
          fontWeight: 500, color: 'white', lineHeight: 1.3, fontSize,
          padding: '4px', whiteSpace: 'normal',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span className={styles.stepBadge}>{data.stepNumber}</span>
        <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
        <EditActions data={data} onRename={start} />
      </div>
    </div>
  );
}

function ErrorNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const fontSize = useScaledFontSize();
  return (
    <div className={styles.nodeError} style={{ fontSize, width: 'auto', minWidth: '180px', maxWidth: '360px', padding: '12px 24px' }}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

function TerminalNode({ data }: NodeProps<NodeData>) {
  const { renaming, renameValue, setRenameVal, start, confirm, cancel } = useRename(data);
  const fontSize = useScaledFontSize();
  const cls = data.isHappyPath
    ? `${styles.nodeTerminal} ${styles.nodeTerminalSuccess}`
    : styles.nodeTerminal;
  return (
    <div className={cls} style={{ fontSize, width: 'auto', minWidth: '180px', maxWidth: '360px', padding: '12px 24px' }}>
      <Handles />
      <span className={styles.stepBadge}>{data.stepNumber}</span>
      <EditableLabel data={data} onStartRename={start} renaming={renaming} renameValue={renameValue} onRenameChange={setRenameVal} onConfirm={confirm} onCancel={cancel} />
      <EditActions data={data} onRename={start} />
    </div>
  );
}

const nodeTypes: NodeTypes = { process: ProcessNode, decision: DecisionNode, error: ErrorNode, terminal: TerminalNode };
const edgeTypes: EdgeTypes = { labelAbove: LabelAboveEdge };

// Step numbering moved to lib/step-numbering.ts — imported above.

// ── React Flow node builder ───────────────────────────────────────────────────

export function buildReactFlowNodes(
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

export function buildReactFlowEdges(fe: FlowEdge[], fn: FlowNode[]): RFEdge[] {
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
      type: 'labelAbove',
      animated: false,
      style: isHappy
        ? { stroke: 'var(--color-primary)', strokeWidth: 2.5, opacity: 0.85 }
        : isError
          ? { stroke: 'var(--color-error)', strokeWidth: 1.5, strokeDasharray: '5 4' }
          : { stroke: 'var(--color-outline)', strokeWidth: 1.5 },
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
    nodesep: 80,
    ranksep: 200,
    edgesep: 100,
    marginx: 100,
    marginy: 100,
  });

  const DECISION_EXTRA_PAD = 64;
  nodes.forEach(node => {
    const dim = getNodeDimensions(node.type ?? 'process');
    const isDecision = node.type === 'decision';
    g.setNode(node.id, {
      width: dim.width + DAGRE_NODE_W_PADDING + (isDecision ? DECISION_EXTRA_PAD : 0),
      height: dim.height + DAGRE_NODE_H_PADDING + (isDecision ? DECISION_EXTRA_PAD : 0),
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
  type: 'labelAbove',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface FlowCanvasProps {
  nodes: RFNode<NodeData>[];
  edges: RFEdge[];
  flowId?: string;
  editMode?: boolean;
  onRetry?: () => void;
  reactFlowRef?: React.MutableRefObject<ReactFlowInstance | null>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FlowCanvas({
  nodes,
  edges,
  flowId,
  editMode,
  onRetry,
  reactFlowRef,
}: FlowCanvasProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const instanceRef = useRef<ReactFlowInstance | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const isEditMode = editMode ?? false;
  const hasLayouted = useRef(false);
  const [isRendering, setIsRendering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mounted = useRef(false);

  const handleFullscreen = useCallback(async () => {
    const diagramContainer = document.getElementById('flow-diagram-container');
    if (!diagramContainer) return;
    if (!document.fullscreenElement) {
      await diagramContainer.requestFullscreen();
      setTimeout(() => {
        instanceRef.current?.fitView({
          padding: 0.15,
          duration: 0,
        });
      }, 100);
    } else {
      await document.exitFullscreen();
      setTimeout(() => {
        instanceRef.current?.fitView({
          padding: 0.15,
          duration: 0,
        });
      }, 100);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Escape key exits fullscreen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reset layout and rendering state when a new flow loads
  useEffect(() => {
    hasLayouted.current = false;
    setIsRendering(true);
    mounted.current = false;
  }, [flowId]);

  // Layout on first run; sync data (labels, editMode, etc.) on subsequent prop changes
  useEffect(() => {
    if (nodes.length === 0) return;

    if (hasLayouted.current) {
      setRfNodes(prev => {
        const posMap = new Map(prev.map(n => [n.id, n]));
        return nodes.map(n => {
          const existing = posMap.get(n.id);
          return existing ? { ...existing, data: n.data } : n;
        });
      });
      setRfEdges(edges);
      return;
    }

    try {
      const laid = layoutNodes(nodes, edges);
      if (!laid || laid.length === 0) {
        console.error('[FlowCanvas] Layout produced no nodes');
        setRfNodes(nodes);
        setRfEdges(edges);
        hasLayouted.current = true;
        setIsRendering(false);
        return;
      }
      setRfNodes(laid);
    } catch {
      setRfNodes(nodes);
    }
    setRfEdges(edges);
    hasLayouted.current = true;
    setIsRendering(false);

    const timer = setTimeout(() => {
      instanceRef.current?.fitView({
        padding: 0.15,
        minZoom: 0.1,
        maxZoom: 1,
        includeHiddenNodes: false,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes, edges, flowId, setRfNodes, setRfEdges]);

  // Sync editMode changes onto already-positioned internal nodes
  useEffect(() => {
    setRfNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, editMode: isEditMode },
    })));
  }, [isEditMode, setRfNodes]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    mounted.current = true;
    instanceRef.current = instance;
    if (reactFlowRef) reactFlowRef.current = instance;
    setViewport(instance.getViewport());
    setTimeout(() => {
      instance.fitView({
        padding: 0.15,
        minZoom: 0.1,
        maxZoom: 1,
        includeHiddenNodes: false,
      });
    }, 300);
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

  // Render ReactFlow unconditionally so onInit sets instanceRef on first mount.
  // Spinner / empty / error overlays sit on top.
  return (
    <div
      className={`${styles.root} ${isFullscreen ? styles.rootFullscreen : ''}`}
      id="flow-diagram-container"
    >
      {isRendering && (
        <div className={styles.renderingState}>
          <div className={styles.spinner} />
          <p>Rendering your flow...</p>
        </div>
      )}
      {!isRendering && nodes.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing to show yet</p>
          <p className={styles.emptyText}>This flow doesn&rsquo;t have any steps to display.</p>
        </div>
      )}
      {!isRendering && nodes.length > 0 && !isFlowReady(nodes, edges) && (
        <div className={styles.errorState}>
          <p>Flow could not be rendered.</p>
          {onRetry && (
            <button
              className={styles.retryBtn}
              onClick={onRetry}
            >
              Try Again
            </button>
          )}
        </div>
      )}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onMove={onMove}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        attributionPosition="bottom-left"
        fitView={false}
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={isEditMode}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        preventScrolling={true}
        panActivationKeyCode={null}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <button
        className={`${styles.fullscreenBtn} ${isFullscreen ? styles.fullscreenBtnActive : ''}`}
        onClick={handleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? '✕ Exit Fullscreen' : '⛶ Fullscreen'}
      </button>
    </div>
  );
}