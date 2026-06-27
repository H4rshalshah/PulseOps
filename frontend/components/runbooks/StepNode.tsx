'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe, Terminal, MessageSquare, Cloud, Clock, GitFork } from 'lucide-react';

const nodeIcons = {
  http: Globe,
  shell: Terminal,
  slack: MessageSquare,
  aws: Cloud,
  wait: Clock,
  condition: GitFork,
};

const nodeColors = {
  http: '#00D4FF',
  shell: '#00E5A0',
  slack: '#FFB020',
  aws: '#FF3B5C',
  wait: '#6B7A99',
  condition: '#E8EBF0',
};

function StepNode({ data, selected }: NodeProps) {
  const type = data.type as keyof typeof nodeIcons;
  const Icon = nodeIcons[type] || Globe;
  const color = nodeColors[type] || '#6B7A99';

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 min-w-[180px] transition-all ${
        selected
          ? 'border-pulseops-cyan shadow-lg shadow-pulseops-cyan/20'
          : 'border-pulseops-border hover:border-pulseops-cyan/50'
      }`}
      style={{ backgroundColor: '#111318' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-pulseops-border !w-3 !h-3 !border-2 !border-pulseops-bg"
      />
      
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon size={16} color={color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-pulseops-text truncate">{data.label as string}</p>
          <p className="text-xs text-pulseops-muted capitalize">{type}</p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-pulseops-border !w-3 !h-3 !border-2 !border-pulseops-bg"
      />
    </div>
  );
}

export default memo(StepNode);
