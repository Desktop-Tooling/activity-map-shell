import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export function RootNode({ selected }: NodeProps) {
  return (
    <div className="root-node" data-selected={selected}>
      <Handle type="target" position={Position.Right} className="node-handle" />
      <Handle type="source" position={Position.Top} className="node-handle" />
      <span className="root-node-label">Root</span>
    </div>
  );
}