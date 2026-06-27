'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pulseops-bg flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <Logo size={80} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-8xl font-heading font-bold text-pulseops-text mb-4"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-pulseops-muted mb-8 font-mono"
        >
          System offline — endpoint not found
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pulseops-cyan text-pulseops-bg font-semibold rounded-xl hover:bg-pulseops-cyan/90 transition-all"
          >
            Return to Dashboard
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 font-mono text-xs text-pulseops-muted"
        >
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 bg-pulseops-danger rounded-full animate-pulse" />
            <span>$ pulseops --status 404</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
