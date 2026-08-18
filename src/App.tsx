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
import { RootNode } from './RootNode';
import { SuperblockNode, type SuperblockData } from './SuperblockNode';
import { MapContext } from './MapContext';
import { ServicesStrip, getWindowFromDrop, type WindowInfo } from './ServicesStrip';
import { TopBar } from './TopBar';
import JSON5 from 'json5';

const ROOT_ID = 'root';
const BLOCK_WIDTH = 180;
const BLOCK_HEIGHT = 160;
const SUPERBLOCK_PAD = 16;
const ROOT_WIDTH = 64;
const ROOT_HEIGHT = 40;

const nodeTypes: NodeTypes = {
  processBlock: ProcessBlockNode,
  root: RootNode,
  superblock: SuperblockNode,
};

const defaultEdges: Edge[] = [];
const BLOCK_GAP = 12;
const COLUMN_WIDTH = BLOCK_WIDTH + BLOCK_GAP;

type ViewportBounds = { x: number; y: number; width: number; height: number } | null;

function isUninitializedBlock(n: Node<ProcessBlockData>): boolean {
  return n.type === 'processBlock' && !(n.data?.hwnd) && (n.data?.label === 'New app' || !n.data?.label);
}

/** From first (up to) 3 titles, find common word(s) that tie for most occurrences; order by first appearance. */
function commonTermFromTitles(titles: string[]): string {
  const firstThree = titles.slice(0, 3).map((t) => t.trim()).filter(Boolean);
  if (firstThree.length === 0) return 'Group';
  const words: string[] = [];
  const count = new Map<string, number>();
  for (const t of firstThree) {
    const w = t.split(/\s+/).filter((s) => s.length > 0);
    for (const word of w) {
      const key = word.toLowerCase();
      count.set(key, (count.get(key) ?? 0) + 1);
      if (!words.includes(key)) words.push(key);
    }
  }
  const maxCount = Math.max(...count.values(), 0);
  const winners = words.filter((w) => count.get(w) === maxCount);
  if (winners.length === 0) return firstThree[0] || 'Group';
  return winners.join(' ');
}

/** Tile top-level nodes into columns (top-to-bottom, then left-to-right). Columns inferred from current x; when column is full, next column. */
function computeAutoalignPositions(
  nds: Node[],
  rootPos: { x: number; y: number } | null
): Map<string, { x: number; y: number }> {
  const topLevel = nds.filter((n) => n.id !== ROOT_ID && !n.parentId);
  const rootX = rootPos ? rootPos.x + ROOT_WIDTH + BLOCK_GAP : 100;
  const rootY = rootPos ? rootPos.y : 200;
  const result = new Map<string, { x: number; y: number }>();
  if (topLevel.length === 0) return result;
  const minX = Math.min(...topLevel.map((n) => n.position.x));
  const withCol = topLevel.map((n) => ({
    node: n,
    colIndex: Math.max(0, Math.floor((n.position.x - minX) / COLUMN_WIDTH)),
  }));
  const byCol = new Map<number, Node[]>();
  for (const { node, colIndex } of withCol) {
    const list = byCol.get(colIndex) ?? [];
    list.push(node);
    byCol.set(colIndex, list);
  }
  const sortedColIndices = [...byCol.keys()].sort((a, b) => a - b);
  let x = rootX;
  for (const colIndex of sortedColIndices) {
    const col = byCol.get(colIndex)!;
    const byY = [...col].sort((a, b) => a.position.y - b.position.y);
    let y = rootY;
    for (const n of byY) {
      result.set(n.id, { x, y });
      y += BLOCK_HEIGHT + BLOCK_GAP;
    }
    x += COLUMN_WIDTH;
  }
  return result;
}

function ensureRootInNodes(nds: Node[], rootPos: { x: number; y: number } | null): Node[] {
  if (!rootPos) return nds.filter((n) => n.id !== ROOT_ID);
  const withoutRoot = nds.filter((n) => n.id !== ROOT_ID);
  const rootNode: Node = {
    id: ROOT_ID,
    type: 'root',
    position: rootPos,
    data: {},
    draggable: false,
  };
  return [...withoutRoot, rootNode];
}

function ensureEdgesToRoot(nds: Node[], eds: Edge[]): Edge[] {
  const topLevel = nds.filter((n) => n.id !== ROOT_ID && !n.parentId);
  const existingTargets = new Set(eds.filter((e) => e.target === ROOT_ID).map((e) => e.source));
  const missing = topLevel.filter((n) => !existingTargets.has(n.id));
  if (missing.length === 0) return eds;
  const newEdges = missing.map((n) => ({ id: `e-${n.id}-root`, source: n.id, target: ROOT_ID }));
  return [...eds, ...newEdges];
}

function FlowWithContext() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [rootPosition, setRootPosition] = useState<{ x: number; y: number } | null>(null);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [firstApp, setFirstApp] = useState<{ name: string } | null>(null);
  const [dragState, setDragState] = useState<{ nodeId: string; position: { x: number; y: number }; data: ProcessBlockData } | null>(null);
  const [screenConfigOpen, setScreenConfigOpen] = useState(false);
  const [displayInfo, setDisplayInfo] = useState<{ index: number; isPrimary: boolean } | null>(null);
  const [openLauncherForNodeId, setOpenLauncherForNodeId] = useState<string | null>(null);
  const flowWrapperRef = useRef<HTMLDivElement>(null);
  const { setViewport, getViewport } = useReactFlow();

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (viewportBounds) {
        return {
          x: viewportBounds.x + clientX,
          y: viewportBounds.y + clientY,
        };
      }
      return { x: clientX, y: clientY };
    },
    [viewportBounds]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (openLauncherForNodeId === nodeId) setOpenLauncherForNodeId(null);
    },
    [setNodes, setEdges, openLauncherForNodeId]
  );

  useEffect(() => {
    const unsub = window.activityMapAPI.onDisplayInfo(setDisplayInfo);
    return unsub;
  }, []);

  const displayNodes = rootPosition
    ? ensureRootInNodes(dragState ? nodes.filter((n) => n.id !== 'ghost') : nodes, rootPosition)
    : ensureRootInNodes(nodes, null);
  const withGhost =
    dragState && displayNodes.some((n) => n.id === ROOT_ID)
      ? [
          ...displayNodes,
          {
            id: 'ghost',
            type: 'processBlock',
            position: dragState.position,
            data: { ...dragState.data, isGhost: true },
            draggable: false,
            selectable: false,
          } as Node<ProcessBlockData & { isGhost?: boolean }>,
        ]
      : displayNodes;
  const displayEdges = ensureEdgesToRoot(withGhost.filter((n) => n.id !== 'ghost'), edges).concat(
    dragState
      ? [{ id: 'e-ghost-root', source: 'ghost', target: ROOT_ID }]
      : []
  );

  useEffect(() => {
    window.activityMapAPI.getRootPosition().then(setRootPosition);
  }, [screenConfigOpen]);
  useEffect(() => {
    window.activityMapAPI.getRootPosition().then(setRootPosition);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.activityMapAPI.windowHide();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.activityMapAPI.getAppList().then((list) => {
      const first = (list as { name: string }[])[0];
      if (first) setFirstApp({ name: first.name });
    });
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: Partial<ProcessBlockData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }, [setNodes]);

  const addEdgeToRoot = useCallback(
    (sourceId: string) => {
      setEdges((eds) => {
        if (eds.some((e) => e.source === sourceId && e.target === ROOT_ID)) return eds;
        return [...eds, { id: `e-${sourceId}-root`, source: sourceId, target: ROOT_ID }];
      });
    },
    [setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNodeFromWindow = useCallback(
    (win: WindowInfo, flowX: number, flowY: number) => {
      const id = `block-${win.hwnd}-${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: 'processBlock',
          position: { x: flowX - BLOCK_WIDTH / 2, y: flowY - BLOCK_HEIGHT / 2 },
          data: {
            label: win.title || win.processName || 'New app',
            processName: win.processName,
            hwnd: win.hwnd,
            processId: win.processId,
            startTime: win.startTime,
          },
        },
      ]);
      addEdgeToRoot(id);
      window.activityMapAPI.captureWindowThumbnail(win.hwnd).then((dataUrl) => {
        if (dataUrl) updateNodeData(id, { screenshotDataUrl: dataUrl });
      }).catch(() => {});
    },
    [setNodes, updateNodeData, addEdgeToRoot]
  );

  const onPaneClick = useCallback(
    (ev: React.MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (!target.closest('.process-block') && !target.closest('.root-node') && !target.closest('.superblock-node') && !target.closest('.react-flow__controls') && !target.closest('.react-flow__panel')) {
        const hasUninitialized = nodes.some((n) => isUninitializedBlock(n as Node<ProcessBlockData>));
        if (hasUninitialized) return;
        const pos = clientToCanvas(ev.clientX, ev.clientY);
        const id = `block-${Date.now()}`;
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: 'processBlock',
            position: { x: pos.x - BLOCK_WIDTH / 2, y: pos.y - BLOCK_HEIGHT / 2 },
            data: { label: 'New app' },
          },
        ]);
        addEdgeToRoot(id);
        setOpenLauncherForNodeId(id);
      }
    },
    [nodes, setNodes, clientToCanvas, addEdgeToRoot]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const win = getWindowFromDrop(e.dataTransfer);
      if (!win) return;
      const pos = clientToCanvas(e.clientX, e.clientY);
      addNodeFromWindow(win, pos.x, pos.y);
    },
    [clientToCanvas, addNodeFromWindow]
  );

  const runAutoalign = useCallback(() => {
    const positions = computeAutoalignPositions(nodes, rootPosition);
    if (positions.size === 0) return;
    setNodes((nds) =>
      nds.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      })
    );
  }, [nodes, rootPosition, setNodes]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onNodeDragStart = useCallback((_e: React.MouseEvent, node: Node<ProcessBlockData>) => {
    if (node.id === ROOT_ID) return;
    setDragState({
      nodeId: node.id,
      position: node.position,
      data: node.data || { label: '' },
    });
  }, []);

  const onNodeDrag = useCallback((_e: React.MouseEvent, node: Node) => {
    if (dragState && node.id === dragState.nodeId) {
      setDragState((s) => (s ? { ...s, position: node.position } : null));
    }
  }, [dragState?.nodeId]);

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent, dropped: Node<ProcessBlockData>, nds: Node[]) => {
      setDragState(null);
      if (dropped.id === ROOT_ID) return;
      const topLevel = nds.filter((n) => n.id !== ROOT_ID && n.id !== 'ghost' && !n.parentId);
      const overlap = topLevel.find(
        (n) =>
          n.id !== dropped.id &&
          dropped.position.x < n.position.x + BLOCK_WIDTH + 20 &&
          dropped.position.x + BLOCK_WIDTH + 20 > n.position.x &&
          dropped.position.y < n.position.y + BLOCK_HEIGHT + 20 &&
          dropped.position.y + BLOCK_HEIGHT + 20 > n.position.y
      );
      if (!overlap) return;
      const nodeA = dropped;
      const nodeB = overlap as Node<ProcessBlockData>;
      const parentId = `super-${Date.now()}`;
      const px = Math.min(nodeA.position.x, nodeB.position.x);
      const py = Math.min(nodeA.position.y, nodeB.position.y);
      const childLabels = [nodeA.data?.label, nodeB.data?.label].filter(Boolean) as string[];
      const superLabel = commonTermFromTitles(childLabels) || nodeA.data?.label || nodeB.data?.label || 'Group';
      const superNode: Node<SuperblockData> = {
        id: parentId,
        type: 'superblock',
        position: { x: px - SUPERBLOCK_PAD, y: py - SUPERBLOCK_PAD },
        data: { label: superLabel, childCount: 2 },
        style: {
          width: BLOCK_WIDTH + SUPERBLOCK_PAD * 2,
          height: BLOCK_HEIGHT * 2 + SUPERBLOCK_PAD * 2 + 12,
        },
      };
      const childA = {
        ...nodeA,
        parentId,
        position: { x: SUPERBLOCK_PAD, y: SUPERBLOCK_PAD },
        extent: 'parent' as const,
      };
      const childB = {
        ...nodeB,
        parentId,
        position: { x: SUPERBLOCK_PAD, y: SUPERBLOCK_PAD + BLOCK_HEIGHT + 12 },
        extent: 'parent' as const,
      };
      setNodes((nds) => [
        ...nds.filter((n) => n.id !== nodeA.id && n.id !== nodeB.id),
        superNode,
        childA,
        childB,
      ]);
      setEdges((eds) => [
        ...eds.filter((e) => e.source !== nodeA.id && e.source !== nodeB.id),
        { id: `e-${parentId}-root`, source: parentId, target: ROOT_ID },
      ]);
    },
    [setNodes, setEdges]
  );

  const save = useCallback(() => {
    const nodesToSave = ensureRootInNodes(nodes, rootPosition);
    const edgesToSave = ensureEdgesToRoot(nodesToSave, edges);
    const payload = {
      nodes: nodesToSave.filter((n) => n.id !== ROOT_ID).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        parentId: n.parentId,
        data: n.data,
        style: n.style,
      })),
      edges: edgesToSave,
    };
    window.activityMapAPI.saveMap(JSON5.stringify(payload, null, 2));
  }, [nodes, edges, rootPosition]);

  useEffect(() => {
    window.activityMapAPI.getViewportBounds().then(setViewportBounds);
    const unsubscribe = window.activityMapAPI.onViewportBounds(setViewportBounds);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!viewportBounds) return;
    setViewport({
      x: -viewportBounds.x,
      y: -viewportBounds.y,
      zoom: 1,
    });
  }, [viewportBounds, setViewport]);

  useEffect(() => {
    const t = setInterval(save, 8000);
    return () => clearInterval(t);
  }, [save]);

  useEffect(() => {
    window.activityMapAPI.loadMap().then((loaded) => {
      const savedNodes = (loaded?.nodes ?? []) as Node[];
      const savedEdges = (loaded?.edges ?? []) as Edge[];
      const withoutRoot = (savedNodes as Node[]).filter((n) => n.id !== ROOT_ID);
      if (withoutRoot.length > 0) {
        setNodes(withoutRoot);
        setEdges(savedEdges);
      } else {
        window.activityMapAPI.getWindows().then((list: WindowInfo[]) => {
          const sorted = [...list].sort((a, b) => {
            const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
            const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
            return ta - tb;
          });
          const newNodes: Node<ProcessBlockData>[] = sorted.map((win, i) => ({
            id: `block-${win.hwnd}-${i}`,
            type: 'processBlock',
            position: { x: i * (BLOCK_WIDTH + 24), y: 80 },
            data: {
              label: win.title || win.processName || 'New app',
              processName: win.processName,
              hwnd: String(win.hwnd),
              processId: win.processId,
              startTime: win.startTime,
            },
          }));
          setNodes(newNodes);
          setEdges([]);
          newNodes.forEach((n) => {
            if (n.data.hwnd) {
              window.activityMapAPI.captureWindowThumbnail(n.data.hwnd).then((dataUrl) => {
                if (dataUrl) updateNodeData(n.id, { screenshotDataUrl: dataUrl });
              }).catch(() => {});
            }
          });
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mapContextValue = React.useMemo(
    () => ({
      updateNodeData,
      openLauncherForNodeId,
      setOpenLauncherForNodeId,
      removeNode,
    }),
    [updateNodeData, openLauncherForNodeId, removeNode]
  );

  return (
    <MapContext.Provider value={mapContextValue}>
      <div
        className="app-layout"
        onMouseEnter={() => window.activityMapAPI.setMouseOver(true)}
        onMouseLeave={() => window.activityMapAPI.setMouseOver(false)}
      >
        <TopBar
          displayLabel={displayInfo ? (displayInfo.isPrimary ? 'Main' : `Screen ${displayInfo.index}`) : 'Screen'}
          onScreenConfigClick={() => setScreenConfigOpen((o) => !o)}
          screenConfigOpen={screenConfigOpen}
        />
        {screenConfigOpen && (
          <ScreenConfigPanel onClose={() => setScreenConfigOpen(false)} />
        )}
        <div
          className="app-flow-wrapper"
          ref={flowWrapperRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onWheel={(e) => {
            e.preventDefault();
            const v = getViewport();
            setViewport({ ...v, x: v.x + e.deltaY * 0.8 });
          }}
          onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setMousePos(null)}
        >
          {mousePos && (
            <div
              className="app-ghost-icon"
              style={{ left: mousePos.x, top: mousePos.y }}
              aria-hidden
            >
              <span className="app-ghost-icon-letter">
                {firstApp ? firstApp.name.slice(0, 2).toUpperCase() : 'NA'}
              </span>
            </div>
          )}
          <ReactFlow
            nodes={withGhost}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            minZoom={0.2}
            maxZoom={1.5}
            zoomOnScroll={false}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            defaultEdgeOptions={{ type: 'step', style: { stroke: '#3f3f46', strokeWidth: 2 } }}
          >
            <Background color="#2d2d30" gap={16} size={1} />
            <Controls />
            <Panel position="top-left" className="panel-title">
              Activity Map ╬ô├ç├╢ drag block onto another to group Γö¼Γòû all connect to Root
            </Panel>
            <Panel position="bottom-center" className="panel-autoalign">
              <button type="button" className="app-autoalign-btn" onClick={runAutoalign}>
                Auto-align
              </button>
            </Panel>
          </ReactFlow>
        </div>
        <ServicesStrip />
      </div>
    </MapContext.Provider>
  );
}

function displayLabelWithSpatial(
  d: { bounds: { x: number; y: number }; primary: boolean },
  primary: { bounds: { x: number; y: number } } | undefined,
  index: number
): string {
  const name = d.primary ? 'Main' : `Screen ${index}`;
  if (!primary || d.primary) return name;
  const px = primary.bounds.x;
  const py = primary.bounds.y;
  const left = d.bounds.x < px - 10;
  const right = d.bounds.x > px + 10;
  const above = d.bounds.y < py - 10;
  const below = d.bounds.y > py + 10;
  const parts: string[] = [];
  if (left) parts.push('left');
  if (right) parts.push('right');
  if (above) parts.push('above');
  if (below) parts.push('below');
  const spatial = parts.length ? ` (${parts.join(', ')} of main)` : '';
  return name + spatial;
}

function ScreenConfigPanel({ onClose }: { onClose: () => void }) {
  const [displays, setDisplays] = useState<{ id: number; bounds: { x: number; y: number; width: number; height: number }; rotation: number; primary: boolean }[]>([]);

  useEffect(() => {
    window.activityMapAPI.getDisplays().then(setDisplays);
  }, []);

  const primary = displays.find((d) => d.primary);

  return (
    <div className="screen-config-overlay" onClick={onClose}>
      <div className="screen-config-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="screen-config-title">Display layout (2D position)</h3>
        <p className="screen-config-note">Spatial relationship of monitors. Root node is placed at middle-left of the display set as main.</p>
        <ul className="screen-config-list">
          {displays.map((d, index) => (
            <li key={d.id} className="screen-config-item">
              <span className="screen-config-bounds">
                {displayLabelWithSpatial(d, primary, index)} Γö¼Γòû ({d.bounds.x}, {d.bounds.y}) {d.bounds.width}Γö£├╣{d.bounds.height}
              </span>
              {d.primary && <span className="screen-config-badge">Main</span>}
              <button type="button" onClick={() => { window.activityMapAPI.setMainDisplay(d.id); onClose(); }}>Set as main</button>
            </li>
          ))}
        </ul>
        <button type="button" className="app-launcher-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-root">
      <ReactFlowProvider>
        <FlowWithContext />
      </ReactFlowProvider>
    </div>
  );
}
