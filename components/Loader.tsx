'use client';

import { motion } from 'framer-motion';

interface LoaderProps {
  message?: string;
}

export default function Loader({ message = 'Loading...' }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      {/* Simple spinner */}
      <motion.div
        className="w-16 h-16 border-4 border-red-600/30 border-t-red-600 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />

      {/* Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <p className="text-lg font-medium text-white/90">{message}</p>
      </motion.div>
    </div>
  );
}

export function FullPageLoader({ message = 'Loading...' }: LoaderProps) {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center">
      <Loader message={message} />
    </div>
  );
}
