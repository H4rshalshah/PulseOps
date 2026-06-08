'use client';

import { motion } from 'framer-motion';

interface PulseRingProps {
  severity?: 'critical' | 'high' | 'medium' | 'low';
  size?: number;
  className?: string;
}

const severityColors = {
  critical: '#FF3B5C',
  high: '#FFB020',
  medium: '#00D4FF',
  low: '#00E5A0',
};

export default function PulseRing({ severity = 'medium', size = 12, className = '' }: PulseRingProps) {
  const color = severityColors[severity];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <motion.span
        className="absolute inline-flex rounded-full opacity-75"
        style={{
          width: size * 2,
          height: size * 2,
          backgroundColor: color,
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}40`,
        }}
      />
    </div>
  );
}
