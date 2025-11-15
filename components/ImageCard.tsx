'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

interface ImageCardProps {
  imageUrl?: string;
  paragraph: string;
  index: number;
}

export default function ImageCard({ imageUrl, paragraph, index }: ImageCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="glass-effect rounded-2xl overflow-hidden card-shadow"
    >
      {/* Image Section */}
      {imageUrl && !imageError ? (
        <div className="relative w-full aspect-video bg-gradient-dark border-b border-white/10">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-white/10 border-t-white/60 rounded-full animate-spin"></div>
            </div>
          )}
          <Image
            src={imageUrl}
            alt={`Scene ${index + 1}`}
            fill
            className="object-cover"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setImageError(true);
              setIsLoading(false);
            }}
            unoptimized
          />
          {/* Image overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="w-full aspect-video bg-gradient-violet flex items-center justify-center p-8 border-b border-white/10 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.3),transparent_50%)] animate-pulse" />
          </div>
          <div className="text-center relative z-10">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              🎬
            </motion.div>
            <p className="text-white font-semibold text-lg">
              {imageError ? 'Image unavailable' : 'Generating scene...'}
            </p>
          </div>
        </div>
      )}

      {/* Text Section */}
      <div className="p-8">
        <p className="text-white/90 leading-relaxed text-lg whitespace-pre-wrap">
          {paragraph}
        </p>
      </div>
    </motion.div>
  );
}
