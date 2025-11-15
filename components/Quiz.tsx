'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import type { Quiz as QuizType } from '@/utils/types';

interface QuizProps {
  quiz: QuizType;
  concept?: string;
  universe?: string;
  onRegenerate?: (newQuiz: QuizType) => void;
}

export default function Quiz({ quiz, concept, universe, onRegenerate }: QuizProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
  };

  const handleRegenerate = async () => {
    if (!concept) return;
    setIsRegenerating(true);
    try {
      const response = await axios.post('http://localhost:3001/api/generate/quiz', {
        concept,
        universe
      });
      if (onRegenerate && response.data) {
        onRegenerate(response.data);
        setSelectedAnswer(null);
      }
    } catch (error) {
      console.error('Failed to regenerate quiz:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const isCorrect = selectedAnswer === quiz.answer;

  // Letters for options: A, B, C, D, E
  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Playful floating shapes in background */}
      <div className="absolute -inset-4 opacity-20 pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-20 h-20 border-2 border-red-500/30 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-0 left-0 w-16 h-16 border-2 border-red-500/20 rounded-lg"
        />
      </div>

      <div className="relative space-y-6">
        {/* Header - Disguised as a fun interaction */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-full"
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-lg"
              >
                🎮
              </motion.span>
              <span className="text-xs font-bold uppercase tracking-wide text-red-400">
                Quick Pick
              </span>
            </motion.div>
            <h3 className="text-2xl font-bold text-white leading-tight">
              {quiz.question}
            </h3>
          </div>
          {concept && onRegenerate && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="p-3 bg-black/40 border border-white/10 rounded-xl hover:border-red-500/50 transition-all disabled:opacity-50 group"
              title="New challenge"
            >
              <motion.div
                animate={isRegenerating ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: isRegenerating ? Infinity : 0, ease: 'linear' }}
                className="text-lg group-hover:scale-110 transition-transform"
              >
                🔄
              </motion.div>
            </motion.button>
          )}
        </div>

        {/* Options - Game-style cards */}
        <div className="grid gap-3">
          {quiz.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isAnswer = option === quiz.answer;
            const showResult = selectedAnswer !== null;
            const isHovered = hoveredOption === index;

            let bgClass = 'bg-black/30';
            let borderClass = 'border-white/10';
            let textClass = 'text-white/90';

            if (showResult) {
              if (isAnswer) {
                bgClass = 'bg-gradient-to-r from-green-600/20 to-emerald-600/20';
                borderClass = 'border-green-500/60';
              } else if (isSelected && !isCorrect) {
                bgClass = 'bg-gradient-to-r from-red-600/20 to-rose-600/20';
                borderClass = 'border-red-500/60';
              }
            } else if (isSelected) {
              bgClass = 'bg-gradient-to-r from-red-600/30 to-orange-600/30';
              borderClass = 'border-red-500/60';
            } else if (isHovered) {
              bgClass = 'bg-white/5';
              borderClass = 'border-red-500/40';
            }

            return (
              <motion.button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                onHoverStart={() => setHoveredOption(index)}
                onHoverEnd={() => setHoveredOption(null)}
                disabled={selectedAnswer !== null}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative w-full px-5 py-4 ${bgClass} border ${borderClass} rounded-xl text-left transition-all group overflow-hidden`}
                whileHover={selectedAnswer === null ? { x: 4, scale: 1.02 } : {}}
                whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
              >
                {/* Hover effect gradient */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />

                <div className="relative flex items-center gap-4">
                  {/* Playful icon instead of letter */}
                  <motion.div
                    className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-lg ${
                      showResult && isAnswer
                        ? 'bg-green-500/30 border-2 border-green-500'
                        : showResult && isSelected && !isCorrect
                        ? 'bg-red-500/30 border-2 border-red-500'
                        : 'bg-white/10 border-2 border-white/20'
                    }`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {!showResult && (
                      <motion.span
                        animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.5 }}
                        className="text-white font-bold"
                      >
                        {optionLetters[index % optionLetters.length]}
                      </motion.span>
                    )}
                    {showResult && isAnswer && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.6 }}
                        className="text-green-400"
                      >
                        ✓
                      </motion.span>
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.6 }}
                        className="text-red-400"
                      >
                        ✗
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Option text */}
                  <span className={`flex-1 font-medium ${textClass}`}>
                    {option}
                  </span>

                  {/* Subtle arrow on hover */}
                  {!showResult && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                      className="text-red-400 text-xl"
                    >
                      →
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Result - Celebration or encouragement */}
        <AnimatePresence mode="wait">
          {selectedAnswer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="relative overflow-hidden"
            >
              {isCorrect ? (
                // Celebration
                <div className="relative p-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/40 rounded-2xl">
                  {/* Confetti effect */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2 }}
                  >
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-green-400 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: '50%'
                        }}
                        animate={{
                          y: [-20, -60],
                          x: [(Math.random() - 0.5) * 100],
                          opacity: [1, 0],
                          scale: [1, 0]
                        }}
                        transition={{
                          duration: 1,
                          delay: i * 0.05
                        }}
                      />
                    ))}
                  </motion.div>

                  <div className="relative flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                      className="text-4xl"
                    >
                      🎉
                    </motion.div>
                    <div>
                      <p className="text-xl font-bold text-green-400 mb-1">
                        Nailed it!
                      </p>
                      <p className="text-sm text-white/70">
                        You're on fire 🔥
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Encouragement
                <div className="relative p-6 bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border-2 border-orange-500/40 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="text-4xl"
                    >
                      💡
                    </motion.div>
                    <div>
                      <p className="text-xl font-bold text-orange-400 mb-1">
                        Almost there!
                      </p>
                      <p className="text-sm text-white/70">
                        Check the highlighted answer above
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
