import React from 'react';
import type { Node } from '@xyflow/react';
import type { ProcessBlockData } from './ProcessBlockNode';

type UpdateNodeData = (nodeId: string, data: Partial<ProcessBlockData>) => void;

export const MapContext = React.createContext<UpdateNodeData | null>(null);

export function useUpdateNodeData(): UpdateNodeData {
  const update = React.useContext(MapContext);
  if (!update) throw new Error('useUpdateNodeData used outside MapContext');
  return update;
}
