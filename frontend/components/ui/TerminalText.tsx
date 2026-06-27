'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TerminalTextProps {
  text: string;
  speed?: number;
  showCursor?: boolean;
  onComplete?: () => void;
  className?: string;
}

export default function TerminalText({
  text,
  speed = 30,
  showCursor = true,
  onComplete,
  className = '',
}: TerminalTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const typeText = useCallback(() => {
    let index = 0;
    setIsComplete(false);
    setDisplayedText('');

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  useEffect(() => {
    const cleanup = typeText();
    return cleanup;
  }, [typeText]);

  return (
    <span className={`font-mono ${className}`}>
      <span>{displayedText}</span>
      {showCursor && (
        <motion.span
          className="inline-block w-[2px] h-[1em] bg-pulseops-cyan ml-[1px] align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </span>
  );
}
