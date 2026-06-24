'use client';

import { BaseEdge, getSmoothStepPath, type EdgeProps } from 'reactflow';
import { EdgeLabelRenderer } from '@reactflow/core';

export function LabelAboveEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    style,
    markerEnd,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--color-surface)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-on-surface)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
