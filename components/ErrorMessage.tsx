'use client';

import { motion } from 'framer-motion';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-rose-500/10 border border-rose-400/30 rounded-2xl p-4 flex items-start gap-3"
    >
      <span className="text-2xl flex-shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-rose-200 text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="tap-target flex-shrink-0 text-rose-200/60 hover:text-rose-200 transition-colors"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}
