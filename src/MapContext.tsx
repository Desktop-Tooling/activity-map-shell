import React from 'react';
import type { ProcessBlockData } from './ProcessBlockNode';

type UpdateNodeData = (nodeId: string, data: Partial<ProcessBlockData>) => void;

export interface MapContextValue {
  updateNodeData: UpdateNodeData;
  openLauncherForNodeId: string | null;
  setOpenLauncherForNodeId: (id: string | null) => void;
  removeNode: (nodeId: string) => void;
}

export const MapContext = React.createContext<MapContextValue | null>(null);

export function useUpdateNodeData(): UpdateNodeData {
  const ctx = React.useContext(MapContext);
  if (!ctx) throw new Error('useUpdateNodeData used outside MapContext');
  return ctx.updateNodeData;
}

export function useMapContext(): MapContextValue {
  const ctx = React.useContext(MapContext);
  if (!ctx) throw new Error('useMapContext used outside MapContext');
  return ctx;
}
