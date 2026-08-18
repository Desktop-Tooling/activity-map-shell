import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export interface SuperblockData {
  label?: string;
  childCount?: number;
}

export function SuperblockNode({ data, selected }: NodeProps<SuperblockData>) {
  return (
    <div className="superblock-node" data-selected={selected}>
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />
      <div className="superblock-node-inner">
        <span className="superblock-node-label">
          {data?.label || 'Group'}
          {data?.childCount != null && ` (${data.childCount})`}
        </span>
      </div>
    </div>
  );
}