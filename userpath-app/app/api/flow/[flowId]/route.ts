import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { EDIT_TYPES, type EditType } from '@/types';
import { SESSION_HEADER } from '@/lib/constants';


function isValidNode(n: unknown): n is Record<string, unknown> {
  if (typeof n !== 'object' || n === null) return false;
  if (typeof (n as Record<string, unknown>).nodeId !== 'string') return false;
  if (typeof (n as Record<string, unknown>).type !== 'string') return false;
  if (typeof (n as Record<string, unknown>).label !== 'string') return false;
  return true;
}

function isValidEdge(e: unknown): e is Record<string, unknown> {
  if (typeof e !== 'object' || e === null) return false;
  if (typeof (e as Record<string, unknown>).edgeId !== 'string') return false;
  if (typeof (e as Record<string, unknown>).fromNode !== 'string') return false;
  if (typeof (e as Record<string, unknown>).toNode !== 'string') return false;
  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
): Promise<NextResponse> {
  try {
    const db = await getDb();
    const { flowId } = await params;

    const flow = await db.flow.findUnique({ where: { id: flowId } });

    if (!flow) {
      return NextResponse.json({ notFound: true }, { status: 404 });
    }

    return NextResponse.json({
      flowId: flow.id,
      productName: flow.productName,
      nodes: flow.nodes,
      edges: flow.edges,
      userJourneySteps: flow.userJourneySteps,
      createdAt: flow.createdAt,
      lastEditedAt: flow.lastEditedAt,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'ERR_INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
): Promise<NextResponse> {
  try {
    const db = await getDb();
    const { flowId } = await params;
    const sessionId = req.headers.get(SESSION_HEADER);

    if (!sessionId) {
      return NextResponse.json({ error: 'ERR_MISSING_SESSION' }, { status: 401 });
    }

    const flow = await db.flow.findUnique({ where: { id: flowId } });

    if (!flow) {
      return NextResponse.json({ notFound: true }, { status: 404 });
    }

    if (flow.sessionId !== sessionId) {
      return NextResponse.json({ error: 'ERR_FORBIDDEN' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'ERR_MALFORMED_JSON' },
        { status: 400 },
      );
    }

    if (body.sessionId && body.sessionId !== sessionId) {
      return NextResponse.json({ error: 'ERR_FORBIDDEN' }, { status: 403 });
    }

    const { editType, nodeId, previousValue, newValue } = body as {
      editType?: string;
      nodeId?: string;
      previousValue?: string;
      newValue?: string;
    };

    if (!editType || !EDIT_TYPES.includes(editType as EditType)) {
      return NextResponse.json(
        { error: 'ERR_INVALID_EDIT_TYPE' },
        { status: 400 },
      );
    }

    const result = await db.$transaction(async (tx) => {
      const currentFlow = await tx.flow.findUnique({ where: { id: flowId } });
      if (!currentFlow) {
        return { error: 'ERR_NOT_FOUND', status: 404 as const };
      }
      if (currentFlow.sessionId !== sessionId) {
        return { error: 'ERR_FORBIDDEN', status: 403 as const };
      }

      let nodes: Array<Record<string, unknown>>;
      let edges: Array<Record<string, unknown>>;
      try {
        nodes = JSON.parse(currentFlow.nodes) as Array<Record<string, unknown>>;
        edges = JSON.parse(currentFlow.edges) as Array<Record<string, unknown>>;
      } catch {
        return { error: 'ERR_CORRUPTED_FLOW_DATA', status: 500 as const };
      }

      let logPrevious = previousValue ?? '';
      let logNew = newValue ?? '';

      if (editType === 'rename_node') {
        if (typeof newValue !== 'string' || !newValue.trim()) {
          return { error: 'ERR_FORM_INCOMPLETE', status: 400 as const };
        }
        const node = nodes.find((n) => n.nodeId === nodeId);
        if (!node) {
          return { error: 'ERR_NODE_NOT_FOUND', status: 404 as const };
        }
        logPrevious = String(node.label ?? '');
        node.label = newValue;
        logNew = newValue;
      } else if (editType === 'remove_step') {
        const idx = nodes.findIndex((n) => n.nodeId === nodeId);
        if (idx === -1) {
          return { error: 'ERR_NODE_NOT_FOUND', status: 404 as const };
        }

        const incomingEdges = edges.filter((e) => e.toNode === nodeId);
        const outgoingEdges = edges.filter((e) => e.fromNode === nodeId);

        const remainingEdges = edges.filter(
          (e) => e.fromNode !== nodeId && e.toNode !== nodeId,
        );

        if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
          remainingEdges.push({
            edgeId: `${incomingEdges[0].edgeId}-reconnect`,
            fromNode: incomingEdges[0].fromNode,
            toNode: outgoingEdges[0].toNode,
            label: incomingEdges[0].label,
          });
        }

        nodes.splice(idx, 1);
        edges.length = 0;
        edges.push(...remainingEdges);
      } else if (editType === 'add_branch') {
        const addData = body as {
          nodes?: Array<Record<string, unknown>>;
          edges?: Array<Record<string, unknown>>;
        };
        if (
          !Array.isArray(addData.nodes) ||
          !Array.isArray(addData.edges) ||
          !addData.nodes.every(isValidNode) ||
          !addData.edges.every(isValidEdge)
        ) {
          return { error: 'ERR_MISSING_RESTORE_DATA', status: 400 as const };
        }
        logPrevious = `nodes:${nodes.length},edges:${edges.length}`;
        nodes.length = 0;
        edges.length = 0;
        nodes.push(...addData.nodes);
        edges.push(...addData.edges);
        logNew = `nodes:${nodes.length},edges:${edges.length}`;
      } else if (editType === 'restore_state') {
        const restoreData = body as {
          nodes?: Array<Record<string, unknown>>;
          edges?: Array<Record<string, unknown>>;
        };
        if (
          !Array.isArray(restoreData.nodes) ||
          !Array.isArray(restoreData.edges) ||
          !restoreData.nodes.every(isValidNode) ||
          !restoreData.edges.every(isValidEdge)
        ) {
          return { error: 'ERR_MISSING_RESTORE_DATA', status: 400 as const };
        }
        logPrevious = `nodes:${nodes.length},edges:${edges.length}`;
        nodes.length = 0;
        edges.length = 0;
        nodes.push(...restoreData.nodes);
        edges.push(...restoreData.edges);
        logNew = `nodes:${nodes.length},edges:${edges.length}`;
      } else if (editType === 'change_label') {
        if (typeof newValue !== 'string') {
          return { error: 'ERR_FORM_INCOMPLETE', status: 400 as const };
        }
        const edge = edges.find((e) => e.edgeId === nodeId);
        if (!edge) {
          return { error: 'ERR_EDGE_NOT_FOUND', status: 404 as const };
        }
        logPrevious = String(edge.label ?? '');
        edge.label = newValue;
        logNew = newValue;
      }

      await tx.flow.update({
        where: { id: flowId },
        data: {
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        },
      });
      await tx.editLog.create({
        data: {
          flowId,
          sessionId,
          editType: editType as EditType,
          previousValue: logPrevious,
          newValue: logNew,
        },
      });

      const updatedFlow = await tx.flow.findUnique({ where: { id: flowId } });
      if (!updatedFlow) {
        return { error: 'ERR_INTERNAL_ERROR', status: 500 as const };
      }

      return {
        flowId: updatedFlow.id,
        productName: updatedFlow.productName,
        nodes: updatedFlow.nodes,
        edges: updatedFlow.edges,
        userJourneySteps: updatedFlow.userJourneySteps,
        createdAt: updatedFlow.createdAt,
        lastEditedAt: updatedFlow.lastEditedAt,
      };
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'ERR_INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
