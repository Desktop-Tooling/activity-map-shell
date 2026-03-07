import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ProcessBlockNode, { type ProcessBlockData } from './ProcessBlockNode';
import { MapContext } from './MapContext';
import JSON5 from 'json5';

const nodeTypes: NodeTypes = { processBlock: ProcessBlockNode };

const defaultNodes: Node<ProcessBlockData>[] = [
  {
    id: 'welcome',
    type: 'processBlock',
    position: { x: 200, y: 150 },
    data: { label: 'Click canvas to add block · Click block for launcher' },
  },
];

const defaultEdges: Edge[] = [];

function FlowWithContext() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ProcessBlockData>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const updateNodeData = useCallback((nodeId: string, data: Partial<ProcessBlockData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }, [setNodes]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onPaneClick = useCallback(
    (ev: React.MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (!target.closest('.process-block') && !target.closest('.react-flow__controls') && !target.closest('.react-flow__panel')) {
        const id = `block-${Date.now()}`;
        const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        setNodes((nds) => [
          ...nds.filter((n) => n.id !== 'welcome'),
          {
            id,
            type: 'processBlock',
            position: { x: pos.x - 80, y: pos.y - 50 },
            data: { label: 'New block' },
          },
        ]);
      }
    },
    [setNodes, screenToFlowPosition]
  );

  // Persist to JSON5
  const save = useCallback(() => {
    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges,
    };
    window.activityMapAPI.saveMap(JSON5.stringify(payload, null, 2));
  }, [nodes, edges]);

  useEffect(() => {
    const t = setInterval(save, 8000);
    return () => clearInterval(t);
  }, [save]);

  useEffect(() => {
    window.activityMapAPI.loadMap().then((loaded) => {
      if (loaded?.nodes?.length) {
        setNodes(loaded.nodes as Node<ProcessBlockData>[]);
        setEdges(loaded.edges || []);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContext.Provider value={updateNodeData}>
      <ReactFlow
        ref={reactFlowRef}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#2d2d30" gap={16} size={1} />
        <Controls />
        <Panel position="top-left" className="panel-title">
          Activity Map — click canvas to add block
        </Panel>
      </ReactFlow>
    </MapContext.Provider>
  );
}

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <FlowWithContext />
      </ReactFlowProvider>
    </div>
  );
}
