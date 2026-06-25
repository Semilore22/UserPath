'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlowCanvas, buildReactFlowNodes, buildReactFlowEdges, FlowErrorBoundary } from '@/components/features/flow-canvas';
import { JourneyTable } from '@/components/features/journey-table';
import { ExportButton } from '@/components/features/export-button';
import { Card } from '@/components/ui/Card';
import { useSession } from '@/components/hooks/useSession';
import type { Node, Edge, JourneyStep } from '@/types';
import type { ReactFlowInstance, Node as RFNode, Edge as RFEdge } from 'reactflow';
import type { NodeData } from '@/components/features/flow-canvas';
import { SESSION_HEADER } from '@/lib/constants';
import styles from './page.module.css';

interface FlowData {
  flowId: string;
  productName: string;
  nodes: Node[];
  edges: Edge[];
  userJourneySteps: JourneyStep[];
  createdAt: string;
}

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

export default function FlowPage() {
  const router = useRouter();
  const params = useParams();

  const rawFlowId = params.flowId;
  if (typeof rawFlowId !== 'string') {
    throw new Error('Invalid flow ID');
  }
  const flowId = rawFlowId;

  const { sessionId, ready: sessionReady, getHeaders } = useSession();
  const [flow, setFlow] = useState<FlowData | null>(null);
  const flowRef = useRef<FlowData | null>(null);

  useEffect(() => { flowRef.current = flow; }, [flow]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'journey' | 'summary'>('journey');
  const exportRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdCounter = useRef(0);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingRef = useRef(false);

  const [rfNodes, setRfNodes] = useState<RFNode<NodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<RFEdge[]>([]);
  const [renderError, setRenderError] = useState(false);
  const rfDataRef = useRef<{ nodes: RFNode<NodeData>[]; edges: RFEdge[] }>({ nodes: [], edges: [] });

  const handleRetryRender = () => {
    setRenderError(false);
    setRfNodes([]);
    setRfEdges([]);
    setTimeout(() => {
      const { nodes, edges } = rfDataRef.current;
      setRfNodes(nodes);
      setRfEdges(edges);
    }, 100);
  };

  // Load cached flow data immediately — no session needed
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`userpath-flow-${flowId}`);
      if (cached) {
        const cachedData = JSON.parse(cached) as FlowData;
        setFlow(cachedData);
        setLoading(false);
        try { localStorage.setItem('userpath-last-flow', flowId); } catch {}
      }
    } catch {}
  }, [flowId]);

  // Fetch fresh data from API — sessionId optional, GET works without it
  useEffect(() => {
    const abortController = new AbortController();

    const fetchFresh = async () => {
      if (!sessionReady || !sessionId) return;
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          [SESSION_HEADER]: sessionId,
        };

        const res = await fetch(`/api/flow/${flowId}`, {
          headers,
          signal: abortController.signal,
        });
        const responseData = await res.json();

        if (abortController.signal.aborted) return;

        if (responseData.notFound) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const freshData: FlowData = {
          flowId: responseData.flowId,
          productName: responseData.productName,
          nodes: responseData.nodes,
          edges: responseData.edges,
          userJourneySteps: responseData.userJourneySteps,
          createdAt: responseData.createdAt,
        };

        setFlow(freshData);
        setNetworkError(false);
        setLoading(false);
        try {
          localStorage.setItem(`userpath-flow-${flowId}`, JSON.stringify(freshData));
          localStorage.setItem('userpath-last-flow', flowId);
        } catch {}
      } catch {
        if (!abortController.signal.aborted) {
          // Don't override cached data — only set networkError if we have nothing
          setLoading(false);
        }
      }
    };

    fetchFresh();

    return () => { abortController.abort(); };
  }, [flowId, sessionId, sessionReady]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const handleNodeEdit = useCallback(
    async (nodeId: string, newLabel: string) => {
      const currentFlow = flowRef.current;
      if (!currentFlow || !sessionId) return;
      if (editingRef.current) return;

      const node = currentFlow.nodes.find((n) => n.nodeId === nodeId);
      if (!node) return;
      if (node.label === newLabel) return;

      setUndoStack(stack => {
        const newStack = [...stack, { nodes: [...currentFlow.nodes], edges: [...currentFlow.edges] }];
        if (newStack.length > 50) newStack.shift();
        return newStack;
      });
      setRedoStack([]);
      editingRef.current = true;
      setEditing(true);

      try {
        const res = await fetch(`/api/flow/${flowId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            editType: 'rename_node',
            sessionId,
            nodeId,
            previousValue: node.label,
            newValue: newLabel,
          }),
        });

        if (res.ok) {
          const updatedNodes = currentFlow.nodes.map((n) =>
            n.nodeId === nodeId ? { ...n, label: newLabel } : n,
          );
          setFlow({ ...currentFlow, nodes: updatedNodes });
        } else {
          setUndoStack(stack => stack.slice(0, -1));
        }
      } finally {
        editingRef.current = false;
        setEditing(false);
      }
    },
    [flowId, sessionId, getHeaders],
  );

  const saveSnapshot = useCallback((): Snapshot => {
    const currentFlow = flowRef.current;
    if (!currentFlow) return { nodes: [], edges: [] };
    return { nodes: [...currentFlow.nodes], edges: [...currentFlow.edges] };
  }, []);

  const handleEditToggle = () => {
    if (!editMode) {
      setEditMode(true);
      setUndoStack([]);
      setRedoStack([]);
      try {
        const dismissed = localStorage.getItem('userpath-edit-tooltip-dismissed');
        if (!dismissed) {
          setShowTooltip(true);
          tooltipTimer.current = setTimeout(() => setShowTooltip(false), 4000);
        }
      } catch {}
    } else {
      setEditMode(false);
      setShowTooltip(false);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    }
  };

  const dismissTooltip = () => {
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    try { localStorage.setItem('userpath-edit-tooltip-dismissed', 'true'); } catch {}
  };

  const restoreSnapshot = useCallback(async (snapshot: Snapshot) => {
    const currentFlow = flowRef.current;
    if (!currentFlow || !sessionId) return false;
    try {
      const res = await fetch(`/api/flow/${flowId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          editType: 'restore_state',
          sessionId,
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          previousValue: '',
          newValue: '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlow({
          ...currentFlow,
          nodes: data.nodes,
          edges: data.edges,
        });
        return true;
      }
    } catch (e) {
      console.error('[restoreSnapshot]', e);
    }
    return false;
  }, [flowId, sessionId, getHeaders]);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const snapshot = undoStack[undoStack.length - 1];
    setRedoStack(stack => {
      const newStack = [...stack, saveSnapshot()];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setUndoStack(stack => stack.slice(0, -1));
    await restoreSnapshot(snapshot);
  }, [undoStack, restoreSnapshot, saveSnapshot]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const snapshot = redoStack[redoStack.length - 1];
    setUndoStack(stack => {
      const newStack = [...stack, saveSnapshot()];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setRedoStack(stack => stack.slice(0, -1));
    await restoreSnapshot(snapshot);
  }, [redoStack, restoreSnapshot, saveSnapshot]);

  const handleDelete = useCallback(async (nodeId: string) => {
    const currentFlow = flowRef.current;
    if (!currentFlow || !sessionId) return;
    if (editingRef.current) return;

    const snapshot = saveSnapshot();
    setUndoStack(stack => {
      const newStack = [...stack, snapshot];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setRedoStack([]);
    editingRef.current = true;
    setEditing(true);

    try {
      const res = await fetch(`/api/flow/${flowId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          editType: 'remove_step',
          sessionId,
          nodeId,
          previousValue: '',
          newValue: '',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFlow({
          ...currentFlow,
          nodes: data.nodes,
          edges: data.edges,
        });
        toastIdCounter.current += 1;
        const toastId = toastIdCounter.current;
        setToast({ message: 'Step deleted', id: toastId });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
          setToast(prev => prev?.id === toastId ? null : prev);
        }, 4000);
      } else {
        setUndoStack(stack => stack.slice(0, -1));
      }
    } finally {
      editingRef.current = false;
      setEditing(false);
    }
  }, [flowId, sessionId, getHeaders, saveSnapshot]);

  // Build RF nodes/edges from flow data when it loads or changes
  useEffect(() => {
    if (!flow) return;

    const nodes = buildReactFlowNodes(flow.nodes, flow.edges, editMode, handleNodeEdit, handleDelete);
    const edges = buildReactFlowEdges(flow.edges, flow.nodes);

    if (nodes.length === 0) {
      console.error('[FlowPage] buildReactFlowNodes returned empty array', flow.nodes);
      setRenderError(true);
      return;
    }

    console.log(`[FlowPage] Rendering ${nodes.length} nodes, ${edges.length} edges`);
    rfDataRef.current = { nodes, edges };
    setRfNodes(nodes);
    setRfEdges(edges);
    setRenderError(false);
  }, [flow, editMode, handleNodeEdit, handleDelete]);

  const handleToastUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const snapshot = undoStack[undoStack.length - 1];
    setRedoStack(stack => {
      const newStack = [...stack, saveSnapshot()];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setUndoStack(stack => stack.slice(0, -1));
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    await restoreSnapshot(snapshot);
  }, [undoStack, restoreSnapshot, saveSnapshot]);

  useEffect(() => {
    if (!editMode) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode, handleUndo, handleRedo]);

  if (loading && !flow) {
    return (
      <div className={styles.root}>
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.skeleton} />
            <p className={styles.loadingText}>Loading flow...</p>
          </div>
        </main>
      </div>
    );
  }

  if (networkError && !flow) {
    return (
      <div className={styles.root}>
        <main className={styles.main}>
          <Card className={styles.notFound}>
            <h2 className={styles.notFoundTitle}>Could not load flow</h2>
            <p className={styles.notFoundText}>
              A network error occurred. Please check your connection and try again.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className={styles.root}>
        <main className={styles.main}>
          <Card className={styles.notFound}>
            <h2 className={styles.notFoundTitle}>Flow not found</h2>
            <p className={styles.notFoundText}>
              This flow does not exist or has expired.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  if (renderError) {
    return (
      <div className={styles.root}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backButton}
              onClick={() => router.push('/generate')}
              aria-label="Back to generator"
            >
              &larr;
            </button>
            <Link href="/" className={styles.logoLink}><span className={styles.logo}>UserPath</span></Link>
            <span className={styles.headerDivider} />
            <span className={styles.productName}>{flow.productName}</span>
          </div>
          <div className={styles.headerRight} />
        </header>
        <main className={styles.main}>
          <div className={styles.renderError}>
            <p>The diagram did not load correctly.</p>
            <button className={styles.renderErrorBtn} onClick={handleRetryRender}>
              Reload Diagram
            </button>
            <p className={styles.renderErrorHint}>
              Your flow data is safe — this just reloads the visual.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => router.push('/generate')}
            aria-label="Back to generator"
          >
            &larr;
          </button>
          <Link href="/" className={styles.logoLink}><span className={styles.logo}>UserPath</span></Link>
          <span className={styles.headerDivider} />
          <span className={styles.productName}>{flow.productName}</span>
        </div>
        <div className={styles.headerRight} />
      </header>

      {showTooltip && (
        <div className={styles.tooltipOverlay} onClick={dismissTooltip}>
          <div className={styles.tooltip} onClick={e => e.stopPropagation()}>
            <p className={styles.tooltipText}>
              Edit mode is on. Hover over a step to rename or delete it.
              Double-click a label to edit inline.
            </p>
            <button className={styles.tooltipDismiss} onClick={dismissTooltip}>Got it</button>
          </div>
        </div>
      )}

      <main className={styles.main}>
        <div className={styles.diagramWrapper}>
          <div className={styles.diagramHeader}>
            <div className={styles.diagramTitleArea}>
              <h2 className={styles.diagramTitle}>Visual Flow Diagram</h2>
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendHappyPath} /> Happy path
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendOther} /> Other paths
                </span>
              </div>
            </div>
            <div className={styles.topActions}>
              <button
                className={`${styles.editToggleBtn} ${editMode ? styles.editToggleBtnActive : ''}`}
                onClick={handleEditToggle}
                aria-pressed={editMode}
                aria-label="Toggle edit mode"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {editMode ? 'Editing' : 'Edit'}
              </button>
              {editMode && (
                <div className={styles.undoRedoGroup} role="group" aria-label="Undo and redo">
                  <button
                    className={`${styles.undoRedoPill} ${undoStack.length === 0 ? styles.undoRedoPillDisabled : ''}`}
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    aria-label="Undo (Ctrl+Z)"
                    title="Undo (Ctrl+Z)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Undo
                  </button>
                  <button
                    className={`${styles.undoRedoPill} ${redoStack.length === 0 ? styles.undoRedoPillDisabled : ''}`}
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    aria-label="Redo (Ctrl+Shift+Z)"
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Redo
                  </button>
                </div>
              )}
              <Link href="/generate" className={styles.newFlowBtn}>
                + New Flow
              </Link>
              <ExportButton
                canvasRef={exportRef}
                journeyRef={journeyRef}
                disabled={editing}
                productName={flow.productName}
                reactFlowRef={reactFlowRef}
              />
            </div>
          </div>
          <div className={`${styles.diagramSection} ${editMode ? styles.diagramSectionEdit : ''}`} ref={exportRef}>
            <FlowErrorBoundary onError={() => setRenderError(true)}>
              <FlowCanvas
                key={flow.flowId}
                nodes={rfNodes}
                edges={rfEdges}
                flowId={flow.flowId}
                editMode={editMode}
                onRetry={handleRetryRender}
                reactFlowRef={reactFlowRef}
              />
            </FlowErrorBoundary>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottomPanel}>
          <div className={styles.tabBar} role="tablist">
            <button
              className={`${styles.tab} ${activeTab === 'journey' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('journey')}
              role="tab"
              aria-selected={activeTab === 'journey'}
            >
              User Journey
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('summary')}
              role="tab"
              aria-selected={activeTab === 'summary'}
            >
              Flow Summary
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'journey' && (
              <div ref={journeyRef}>
                <JourneyTable steps={flow.userJourneySteps} />
              </div>
            )}
            {activeTab === 'summary' && (
              <div className={styles.summaryPanel}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Product Name</span>
                  <span className={styles.summaryValue}>{flow.productName}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Flow ID</span>
                  <span className={`${styles.summaryValue} ${styles.summaryValueMono}`}>{flow.flowId}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Created</span>
                  <span className={styles.summaryValue}>
                    {new Date(flow.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Steps</span>
                  <span className={styles.summaryValue}>{flow.nodes.length}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Decisions</span>
                  <span className={styles.summaryValue}>
                    {flow.nodes.filter((n) => n.type === 'decision').length}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Connections</span>
                  <span className={styles.summaryValue}>{flow.edges.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <div className={styles.toast} role="alert" aria-live="polite">
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            className={styles.toastUndo}
            onClick={handleToastUndo}
            disabled={editing}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
