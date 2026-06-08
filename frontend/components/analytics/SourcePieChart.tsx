'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface SourcePieChartProps {
  data: { source: string; count: number }[];
  colors: string[];
}

export default function SourcePieChart({ data, colors }: SourcePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="count"
          nameKey="source"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#111318', border: '1px solid #1E2330', borderRadius: '8px', fontSize: '12px', color: '#E8EBF0' }}
          labelStyle={{ color: '#6B7A99' }}
        />
        <Legend wrapperStyle={{ fontSize: '11px', color: '#6B7A99' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
