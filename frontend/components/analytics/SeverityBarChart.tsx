'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface SeverityBarChartProps {
  data: { name: string; critical: number; high: number; medium: number; low: number }[];
}

export default function SeverityBarChart({ data }: SeverityBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2330" />
        <XAxis dataKey="name" tick={{ fill: '#6B7A99', fontSize: 10 }} axisLine={{ stroke: '#1E2330' }} tickLine={false} />
        <YAxis tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={{ stroke: '#1E2330' }} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#111318', border: '1px solid #1E2330', borderRadius: '8px', fontSize: '12px', color: '#E8EBF0' }}
          labelStyle={{ color: '#6B7A99' }}
        />
        <Legend wrapperStyle={{ fontSize: '11px', color: '#6B7A99' }} />
        <Bar dataKey="critical" fill="#FF3B5C" stackId="a" />
        <Bar dataKey="high" fill="#FFB020" stackId="a" />
        <Bar dataKey="medium" fill="#00D4FF" stackId="a" />
        <Bar dataKey="low" fill="#00E5A0" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
