'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LogoProps {
  size?: number;
  critical?: boolean;
  animated?: boolean;
}

export default function Logo({ size = 32, critical = false, animated = true }: LogoProps) {
  const router = useRouter();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (critical && animated) {
      const interval = setInterval(() => {
        setPulse(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [critical, animated]);

  return (
    <motion.button
      onClick={() => router.push('/')}
      className="relative flex items-center gap-2 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-colors duration-300 ${critical ? 'text-deadman-danger' : 'text-deadman-cyan'}`}
      >
        {/* Flatline to pulse EKG */}
        <motion.path
          d="M4 20 L12 20 L14 14 L18 26 L22 10 L26 22 L28 18 L32 20 L36 20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={
            animated
              ? { pathLength: pulse ? [0, 1, 0] : 1 }
              : { pathLength: 1 }
          }
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
        {/* Pulse dot */}
        <motion.circle
          cx="22"
          cy="10"
          r="2"
          fill="currentColor"
          animate={critical ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
        {/* Background ring */}
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      </svg>

      {/* Glow effect on hover */}
      {critical && (
        <motion.div
          className="absolute inset-0 rounded-full bg-deadman-danger/20 blur-md"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <span className={`font-heading font-bold text-lg ${
        critical ? 'text-deadman-danger' : 'text-deadman-cyan'
      }`}>
        DeadMan
      </span>
    </motion.button>
  );
}
