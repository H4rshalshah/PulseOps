'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import StepNode from './StepNode';
import { motion } from 'framer-motion';
import { Globe, Terminal, MessageSquare, Cloud, Clock, GitFork, Sparkles, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';

const nodeTypes: NodeTypes = {
  stepNode: StepNode,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'stepNode',
    position: { x: 250, y: 0 },
    data: { label: 'Start', type: 'condition' },
  },
  {
    id: 'end',
    type: 'stepNode',
    position: { x: 250, y: 300 },
    data: { label: 'End', type: 'condition' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-start-end', source: 'start', target: 'end', animated: true, style: { stroke: '#1E2330', strokeDasharray: '5 5' } },
];

interface RunbookBuilderProps {
  initialSteps?: Array<{ id: string; name: string; type: string; config: Record<string, unknown>; on_failure: string; timeout_ms: number }>;
  onSave?: (steps: unknown[]) => void;
}

const stepTypes = [
  { type: 'http', label: 'HTTP Request', icon: Globe, color: '#00D4FF' },
  { type: 'shell', label: 'Shell Command', icon: Terminal, color: '#00E5A0' },
  { type: 'slack', label: 'Slack Notify', icon: MessageSquare, color: '#FFB020' },
  { type: 'aws', label: 'AWS Action', icon: Cloud, color: '#FF3B5C' },
  { type: 'wait', label: 'Wait', icon: Clock, color: '#6B7A99' },
  { type: 'condition', label: 'Condition', icon: GitFork, color: '#E8EBF0' },
];

export default function RunbookBuilder({ initialSteps, onSave }: RunbookBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#00D4FF', strokeWidth: 2 } }, eds)),
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newId = `node_${Date.now()}`;
      const stepDef = stepTypes.find(s => s.type === type);
      const newNode: Node = {
        id: newId,
        type: 'stepNode',
        position,
        data: { label: stepDef?.label || type, type },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const autoLayout = () => {
    setNodes((nds) =>
      nds.map((node, i) => ({
        ...node,
        position: { x: 250, y: i * 150 },
      }))
    );
    toast.success('Layout optimized');
  };

  const deleteSelected = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  };

  const saveRunbook = () => {
    const steps = nodes
      .filter((n) => n.id !== 'start' && n.id !== 'end')
      .map((n) => ({
        id: n.id,
        name: n.data.label as string,
        type: n.data.type as string,
        config: {},
        on_failure: 'continue',
        timeout_ms: 5000,
      }));
    onSave?.(steps);
    toast.success('Runbook saved');
  };

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Toolbar */}
      <div className="w-48 space-y-2">
        <p className="text-xs font-medium text-pulseops-muted uppercase tracking-wider mb-3">Step Types</p>
        {stepTypes.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.type}
              draggable
              onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                e.dataTransfer.setData('application/reactflow', step.type);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="flex items-center gap-2 px-3 py-2 bg-pulseops-surface border border-pulseops-border rounded-lg cursor-grab active:cursor-grabbing hover:border-pulseops-cyan/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icon size={14} color={step.color} />
              <span className="text-xs text-pulseops-text">{step.label}</span>
            </div>
          );
        })}

        <div className="border-t border-pulseops-border pt-3 mt-4 space-y-2">
          <motion.button
            onClick={autoLayout}
            className="flex items-center gap-2 w-full px-3 py-2 bg-pulseops-cyan/10 text-pulseops-cyan rounded-lg text-xs hover:bg-pulseops-cyan/20 transition-colors"
            whileHover={{ scale: 1.02 }}
          >
            <Sparkles size={12} />
            Auto Layout
          </motion.button>
          {selectedNode && (
            <motion.button
              onClick={deleteSelected}
              className="flex items-center gap-2 w-full px-3 py-2 bg-pulseops-danger/10 text-pulseops-danger rounded-lg text-xs hover:bg-pulseops-danger/20 transition-colors"
              whileHover={{ scale: 1.02 }}
            >
              <Trash2 size={12} />
              Delete Node
            </motion.button>
          )}
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 bg-pulseops-bg border border-pulseops-border rounded-xl overflow-hidden" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          style={{ backgroundColor: '#0A0C10' }}
          defaultEdgeOptions={{
            style: { stroke: '#1E2330', strokeWidth: 2 },
          }}
        >
          <Controls
            className="!bg-pulseops-surface !border-pulseops-border !rounded-lg"
            style={{
              '--reactflow-control-bg': '#111318',
              '--reactflow-control-border': '#1E2330',
              '--reactflow-control-color': '#E8EBF0',
              '--reactflow-control-hover': '#1E2330',
            } as React.CSSProperties}
          />
          <MiniMap
            style={{ backgroundColor: '#0A0C10', border: '1px solid #1E2330', borderRadius: '8px' }}
            nodeColor="#1E2330"
            maskColor="#0A0C10CC"
          />
          <Background color="#1E2330" gap={20} />
        </ReactFlow>
      </div>
    </div>
  );
}
