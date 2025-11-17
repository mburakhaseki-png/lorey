'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LoaderProps {
  message?: string;
  showSnake?: boolean;
}

// Sound effects using Web Audio API
function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Load from localStorage, default to true
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snakeSoundEnabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine') => {
    if (!audioContextRef.current || !soundEnabled) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, [soundEnabled]);

  const playEatSound = useCallback(() => {
    playSound(800, 0.1, 'sine');
    setTimeout(() => playSound(1000, 0.1, 'sine'), 50);
  }, [playSound]);

  const playGameOverSound = useCallback(() => {
    playSound(200, 0.3, 'sawtooth');
    setTimeout(() => playSound(150, 0.3, 'sawtooth'), 100);
    setTimeout(() => playSound(100, 0.4, 'sawtooth'), 200);
  }, [playSound]);

  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('snakeSoundEnabled', String(newValue));
  }, [soundEnabled]);

  return { playEatSound, playGameOverSound, soundEnabled, toggleSound };
}

// Snake Game Component
function SnakeGame() {
  const GRID_SIZE = 20;
  const CELL_SIZE = 24;
  const INITIAL_SNAKE = [{ x: 10, y: 10 }];
  const INITIAL_DIRECTION = { x: 1, y: 0 };
  const GAME_SPEED = 120;

  const { user } = useAuth();
  const supabase = createClient();
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState(() => {
    // Initial food position (not on snake)
    let initialFood = { x: 15, y: 15 };
    if (initialFood.x === INITIAL_SNAKE[0].x && initialFood.y === INITIAL_SNAKE[0].y) {
      initialFood = { x: 5, y: 5 };
    }
    return initialFood;
  });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [justAte, setJustAte] = useState(false);
  const [loadingHighScore, setLoadingHighScore] = useState(true);
  const directionRef = useRef(INITIAL_DIRECTION);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const { playEatSound, playGameOverSound, soundEnabled, toggleSound } = useSoundEffects();

  // Load high score from database on mount
  useEffect(() => {
    const loadHighScore = async () => {
      if (!user) {
        setLoadingHighScore(false);
        setHighScore(0);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('snake_high_score')
          .eq('user_id', user.id)
          .single();

        // Handle different error cases
        if (error) {
          // PGRST116 = no rows returned (user profile doesn't exist yet)
          // 42703 = column does not exist (snake_high_score column not added yet)
          if (error.code === 'PGRST116' || error.code === '42703') {
            // Column doesn't exist or profile doesn't exist - set to 0 silently
            setHighScore(0);
          } else {
            // Other errors - log but don't break
            console.warn('Could not load high score:', error.message);
            setHighScore(0);
          }
        } else if (data?.snake_high_score !== undefined && data.snake_high_score !== null) {
          setHighScore(data.snake_high_score);
        } else {
          setHighScore(0);
        }
      } catch (err: any) {
        // Silently handle errors - column might not exist yet
        if (err?.code !== '42703') {
          console.warn('Could not load high score:', err?.message || err);
        }
        setHighScore(0);
      } finally {
        setLoadingHighScore(false);
      }
    };

    loadHighScore();
  }, [user, supabase]);

  // Save high score to database when it changes
  const saveHighScore = useCallback(async (newHighScore: number) => {
    if (!user || newHighScore <= 0) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          snake_high_score: newHighScore,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        // 42703 = column does not exist - silently ignore
        if (error.code !== '42703') {
          console.warn('Could not save high score:', error.message);
        }
      }
    } catch (err: any) {
      // Silently handle errors - column might not exist yet
      if (err?.code !== '42703') {
        console.warn('Could not save high score:', err?.message || err);
      }
    }
  }, [user, supabase]);

  // Generate random food position (not on snake)
  const generateFood = useCallback((currentSnake: typeof snake) => {
    let newFood: { x: number; y: number };
    let attempts = 0;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (
      currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y) &&
      attempts < 100
    );
    return newFood;
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const currentDir = directionRef.current;

      if (key === 'arrowup' || key === 'w') {
        if (currentDir.y === 0) {
          directionRef.current = { x: 0, y: -1 };
          setDirection({ x: 0, y: -1 });
        }
      } else if (key === 'arrowdown' || key === 's') {
        if (currentDir.y === 0) {
          directionRef.current = { x: 0, y: 1 };
          setDirection({ x: 0, y: 1 });
        }
      } else if (key === 'arrowleft' || key === 'a') {
        if (currentDir.x === 0) {
          directionRef.current = { x: -1, y: 0 };
          setDirection({ x: -1, y: 0 });
        }
      } else if (key === 'arrowright' || key === 'd') {
        if (currentDir.x === 0) {
          directionRef.current = { x: 1, y: 0 };
          setDirection({ x: 1, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };
        const newHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y,
        };

        // Check wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          playGameOverSound();
          setGameOver(true);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          playGameOverSound();
          setGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((prevScore) => {
            const newScore = prevScore + 1;
            setHighScore((prevHighScore) => {
              const currentHigh = prevHighScore ?? 0;
              if (newScore > currentHigh) {
                saveHighScore(newScore);
                return newScore;
              }
              return prevHighScore;
            });
            return newScore;
          });
          setJustAte(true);
          setTimeout(() => setJustAte(false), 200);
          playEatSound();
          setFood(generateFood(newSnake));
          return newSnake;
        }

        // Remove tail
        newSnake.pop();
        return newSnake;
      });
    };

    gameLoopRef.current = setInterval(moveSnake, GAME_SPEED);
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [food, gameOver, generateFood, playEatSound, playGameOverSound, saveHighScore]);

  // Reset game when game over
  useEffect(() => {
    if (gameOver) {
      setTimeout(() => {
        const resetSnake = INITIAL_SNAKE;
        setSnake(resetSnake);
        setDirection(INITIAL_DIRECTION);
        directionRef.current = INITIAL_DIRECTION;
        setFood(generateFood(resetSnake));
        setGameOver(false);
        setScore(0);
      }, 2000);
    }
  }, [gameOver, generateFood]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Score Display */}
      <div className="flex items-center gap-6">
        <motion.div
          initial={{ scale: justAte ? 1.2 : 1 }}
          animate={{ scale: justAte ? 1.2 : 1 }}
          className="px-6 py-3 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-full backdrop-blur-sm text-center"
        >
          <div className="text-white/90 text-sm font-semibold">Score</div>
          <div className="text-red-400 text-2xl font-bold flex items-center justify-center">{score}</div>
        </motion.div>
        {!loadingHighScore && highScore !== null && (
          <div className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full backdrop-blur-sm text-center">
            <div className="text-white/70 text-xs font-semibold">Best</div>
            <div className="text-purple-400 text-xl font-bold flex items-center justify-center">{highScore}</div>
          </div>
        )}
        {/* Sound Toggle Button */}
        <button
          onClick={toggleSound}
          className="px-4 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-full backdrop-blur-sm hover:from-blue-600/30 hover:to-cyan-600/30 transition-all"
          title={soundEnabled ? 'Disable sound' : 'Enable sound'}
        >
          {soundEnabled ? (
            <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-14.5-14.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Game Board */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
        style={{
          width: GRID_SIZE * CELL_SIZE + 8,
          height: GRID_SIZE * CELL_SIZE + 8,
        }}
      >
        {/* Outer Glow */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.2))',
            boxShadow: '0 0 40px rgba(239,68,68,0.4), inset 0 0 20px rgba(0,0,0,0.5)',
            padding: '4px',
          }}
        >
          {/* Inner Board */}
          <div
            className="relative w-full h-full rounded-xl overflow-hidden"
            style={{
              backgroundColor: '#0a0a0a',
              backgroundImage: `
                linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          >
            {/* Food with pulsing animation */}
            <motion.div
              key={`${food.x}-${food.y}`}
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{ 
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className="absolute rounded-full"
              style={{
                left: food.x * CELL_SIZE + 2,
                top: food.y * CELL_SIZE + 2,
                width: CELL_SIZE - 4,
                height: CELL_SIZE - 4,
                background: 'radial-gradient(circle, #ef4444 0%, #dc2626 50%, #991b1b 100%)',
                boxShadow: '0 0 15px rgba(239,68,68,0.8), inset 0 0 10px rgba(255,255,255,0.3)',
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
            </motion.div>

            {/* Snake with gradient */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              return (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className="absolute rounded-lg"
                  style={{
                    left: segment.x * CELL_SIZE + 1,
                    top: segment.y * CELL_SIZE + 1,
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    background: isHead
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)'
                      : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                    boxShadow: isHead
                      ? '0 0 20px rgba(239,68,68,0.6), inset 0 0 10px rgba(255,255,255,0.2)'
                      : '0 0 8px rgba(220,38,38,0.4), inset 0 0 5px rgba(255,255,255,0.1)',
                    zIndex: GRID_SIZE - index,
                  }}
                >
                  {isHead && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white/80" />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Game Over Overlay */}
            <AnimatePresence>
              {gameOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center rounded-xl"
                >
                  <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="text-center space-y-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="text-6xl"
                    >
                      💀
                    </motion.div>
                    <div className="text-white text-2xl font-bold">Game Over!</div>
                    <div className="text-white/70 text-sm">Restarting in 2 seconds...</div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Controls Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 text-white/50 text-xs"
      >
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">↑↓←→</div>
        <span>or</span>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">W A S D</div>
      </motion.div>
    </div>
  );
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

export function FullPageLoader({ message = 'Loading...', showSnake = false }: LoaderProps) {
  // Explicitly check showSnake prop to prevent snake game from showing
  const shouldShowSnake = showSnake === true;
  
  // Check if message is "Creating your episode..." to show additional text
  const showAdditionalMessage = message === 'Creating your episode...';
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-8">
      {/* Snake Game - only show if showSnake is explicitly true */}
      {shouldShowSnake ? <SnakeGame /> : null}

      {/* Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center px-4"
      >
        <p className="text-lg font-medium text-white/90">{message}</p>
        {showAdditionalMessage && (
          <p className="text-sm text-white/60 mt-2">
            (This takes about 2 minutes on average, so I've prepared a game for you to keep you entertained :D)
          </p>
        )}
      </motion.div>
    </div>
  );
}
