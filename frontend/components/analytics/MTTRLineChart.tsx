'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface MTTRLineChartProps {
  data: { date: string; mttr: number }[];
}

export default function MTTRLineChart({ data }: MTTRLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2330" />
        <XAxis dataKey="date" tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={{ stroke: '#1E2330' }} tickLine={false} />
        <YAxis tick={{ fill: '#6B7A99', fontSize: 11 }} axisLine={{ stroke: '#1E2330' }} tickLine={false} unit="m" />
        <Tooltip
          contentStyle={{ backgroundColor: '#111318', border: '1px solid #1E2330', borderRadius: '8px', fontSize: '12px', color: '#E8EBF0' }}
          labelStyle={{ color: '#6B7A99' }}
        />
        <Line type="monotone" dataKey="mttr" stroke="#00D4FF" strokeWidth={2} dot={{ fill: '#00D4FF', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
