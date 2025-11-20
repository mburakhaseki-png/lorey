'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Image from 'next/image';
import { validateLessonText, countWords } from '@/utils/parseLesson';
import { FullPageLoader } from '@/components/Loader';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { getUserSubscription, type UserSubscription } from '@/utils/subscription';
import type { StoryData } from '@/utils/types';

type UploadType = 'file' | null;

// Hook to detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check if window width is less than 768px (mobile breakpoint)
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

const heroQuotes = [
  "My mom never realizes I'm studying.",
  "From boring class notes to an epic episode.",
  "Study like a binge session.",
  "Homework… but it slaps."
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [uploadType, setUploadType] = useState<UploadType>('file');
  const [file, setFile] = useState<File | null>(null);
  const [universe, setUniverse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [currentQuote, setCurrentQuote] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Simplified animation props for mobile - no animations on mobile
  const mobileAnimationProps = {
    initial: { opacity: 1, y: 0, x: 0, scale: 1 },
    animate: { opacity: 1, y: 0, x: 0, scale: 1 },
    whileInView: { opacity: 1, y: 0, x: 0, scale: 1 },
    transition: { duration: 0 },
  };

  const desktopAnimationProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const getAnimationProps = (customProps?: any) => {
    if (isMobile) {
      // On mobile, always return no animation regardless of custom props
      return mobileAnimationProps;
    }
    return { ...desktopAnimationProps, ...customProps };
  };

  // Auto-rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % heroQuotes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (user && !authLoading) {
        setSubscriptionLoading(true);
        try {
          const sub = await getUserSubscription(user.id);
          setSubscription(sub);
        } catch (error) {
          console.error('Error fetching subscription:', error);
        } finally {
          setSubscriptionLoading(false);
        }
      } else {
        setSubscription(null);
      }
    };

    fetchSubscription();
  }, [user, authLoading]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false
  });

  const handleGenerateStory = async () => {
    // Kullanıcı giriş yapmamışsa auth modalını aç
    if (!authLoading && !user) {
      setAuthMode('signup');
      setAuthModalOpen(true);
      return;
    }

    // Check if user has active subscription
    if (user) {
      try {
        const response = await fetch('/api/subscription/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });

        const { canCreate, error: checkError } = await response.json();

        if (!canCreate) {
          setError(checkError || 'No active subscription or story limit reached');
          // Scroll to pricing section
          const pricingSection = document.getElementById('pricing');
          if (pricingSection) {
            pricingSection.scrollIntoView({ behavior: 'smooth' });
          }
          return;
        }
      } catch (err) {
        console.error('Subscription check failed:', err);
        setError('Failed to verify subscription. Please try again.');
        return;
      }
    }

    if (!uploadType || !file) {
      setError('Please upload a file');
      return;
    }

    setIsLoading(true);
    setError('');

    // Increment story usage IMMEDIATELY when button is clicked (before story generation)
    let usageIncremented = false;
    if (user) {
      try {
        const incrementResponse = await fetch('/api/subscription/increment-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const incrementResult = await incrementResponse.json();
        if (incrementResult.success) {
          usageIncremented = true;
        } else {
          setError(incrementResult.error || 'Failed to reserve story slot');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to increment story usage:', err);
        setError('Failed to reserve story slot. Please try again.');
        setIsLoading(false);
        return;
      }
    }

    try {
      let lessonText = extractedText;

      if (!lessonText) {
        // Get API URL and clean it (remove trailing slashes)
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        // Remove trailing slashes only (don't touch protocol slashes)
        apiUrl = apiUrl.trim().replace(/\/+$/, '');
        
        // Ensure it's a full URL
        if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
          console.error('❌ ERROR: API URL is not a full URL:', apiUrl);
          apiUrl = 'https://lorey-backend-api.vercel.app';
        }
        
        const finalUrl = `${apiUrl}/api/extract/file`;
        
        if (uploadType === 'file' && file) {
          const formData = new FormData();
          formData.append('file', file);
          const extractResponse = await axios.post(finalUrl, formData);
          lessonText = extractResponse.data.text;
        }

        if (!lessonText) {
          // Decrement usage if extraction failed
          if (usageIncremented && user) {
            try {
              await fetch('/api/subscription/decrement-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
            } catch (decrementErr) {
              console.error('Failed to decrement usage after extraction error:', decrementErr);
            }
          }
          throw new Error('Failed to extract text from source');
        }
        setExtractedText(lessonText);
      }

      // Check word count limit (15,000 words)
      const wordCount = countWords(lessonText);
      const MAX_WORDS = 15000;
      
      if (wordCount > MAX_WORDS) {
        // Decrement usage if word count exceeds limit
        if (usageIncremented && user) {
          try {
            await fetch('/api/subscription/decrement-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (decrementErr) {
            console.error('Failed to decrement usage after word count error:', decrementErr);
          }
        }
        setError(`Dosya çok uzun. Maksimum 15.000 kelime kabul edilir. Dosyanızda ${wordCount.toLocaleString('tr-TR')} kelime var.`);
        setIsLoading(false);
        return;
      }

      const validation = validateLessonText(lessonText);
      if (!validation.isValid) {
        // Decrement usage if validation failed
        if (usageIncremented && user) {
          try {
            await fetch('/api/subscription/decrement-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (decrementErr) {
            console.error('Failed to decrement usage after validation error:', decrementErr);
          }
        }
        setError(validation.error || 'Invalid lesson content');
        setIsLoading(false);
        return;
      }

      // Get API URL and clean it (remove trailing slashes)
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Remove trailing slashes only (don't touch protocol slashes)
      apiUrl = apiUrl.trim().replace(/\/+$/, '');
      
      // Ensure it's a full URL
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        console.error('❌ ERROR: API URL is not a full URL:', apiUrl);
        apiUrl = 'https://lorey-backend-api.vercel.app';
      }
      
      const finalUrl = `${apiUrl}/api/generate/story`;
      
      const response = await axios.post(finalUrl, {
        lessonText,
        universe: universe || 'Custom Universe'
      });

      const storyData: StoryData = response.data;
      const storyUniverse = universe || 'Custom Universe';

      // Usage was already incremented at the start, no need to increment again

      // Save to sessionStorage for immediate viewing
      sessionStorage.setItem('storyData', JSON.stringify(storyData));
      sessionStorage.setItem('universe', storyUniverse);

      // Save to Supabase if user is logged in
      if (user) {
        try {
          const { data: savedStory, error: saveError } = await supabase
            .from('stories')
            .insert({
              user_id: user.id,
              title: storyData.title,
              universe: storyUniverse,
              story_data: storyData,
            })
            .select()
            .single();

          if (saveError) {
            console.error('Error saving story to database:', saveError);
            // Continue anyway, story is saved in sessionStorage
          } else if (savedStory) {
            // Save story ID to sessionStorage for later updates
            sessionStorage.setItem('storyId', savedStory.id);
          }
        } catch (err) {
          console.error('Error saving story:', err);
          // Continue anyway, story is saved in sessionStorage
        }
      }

      router.push('/story');
    } catch (err: any) {
      // Decrement usage if story generation failed
      if (usageIncremented && user) {
        try {
          await fetch('/api/subscription/decrement-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (decrementErr) {
          console.error('Failed to decrement usage after story generation error:', decrementErr);
        }
      }
      setError(err.response?.data?.error || 'Failed to generate story');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <FullPageLoader message="Creating your episode..." showSnake={true} />;
  }

  if (isCheckoutLoading) {
    return <FullPageLoader message="Redirecting to checkout..." showSnake={false} />;
  }

  return (
    <>
      <Header />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Hero Section - Minimal & Bold */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-24 pb-20 overflow-x-hidden">
        {/* Hero Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-red-600/20 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-red-800/20 rounded-full blur-[120px] opacity-60" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-red-500/10 rounded-full blur-[140px] opacity-40" />
        </div>
        <div className="max-w-5xl w-full mx-auto relative z-10 px-0">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left: Hero Content */}
            <motion.div
              {...getAnimationProps()}
              className="space-y-8 lg:sticky lg:top-24"
            >
              {/* Rotating Quote */}
              <div className="space-y-4">
                <motion.p
                  key={currentQuote}
                  initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={isMobile ? { duration: 0 } : { duration: 0.3 }}
                  className="text-lg text-white/70 italic"
                >
                  "{heroQuotes[currentQuote]}"
                </motion.p>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight break-words">
                  <span className="block text-white">Homework…</span>
                  <span className="block text-gradient-red glow-red">but it slaps.</span>
                </h1>
                <p className="text-base sm:text-xl text-white/70 leading-relaxed break-words">
                  Drop your notes, pick a universe, stream your studying like a brand-new series.
                </p>
              </div>

              {/* Stats Pills */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm">
                  <span className="font-semibold">∞</span> universes
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm">
                  <span className="font-semibold">42 min</span> avg session
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm">
                  <span className="font-semibold">92%</span> quiz sync
                </div>
              </div>
            </motion.div>

            {/* Right: Upload Form */}
            <motion.div
              {...getAnimationProps({ transition: { duration: isMobile ? 0 : 0.6, delay: isMobile ? 0 : 0.2 } })}
              className="cinematic-card p-6 sm:p-8 space-y-6 w-full"
            >
              <div>
                <h2 className="text-2xl font-semibold mb-2">Start your episode</h2>
                <p className="text-white/60 text-sm">Drop your content, pick a universe.</p>
              </div>

                <div className="space-y-6">
                  {/* File Upload */}
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        isDragActive
                          ? 'border-red-600 bg-red-600/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="text-4xl mb-3">📁</div>
                      <p className="text-white/80 mb-1 font-medium">
                        {isDragActive ? 'Drop the file' : 'Drag & drop or click'}
                      </p>
                      <p className="text-xs text-white/50">TXT or PDF (max 50MB)</p>
                      {file && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-sm text-white">✓ {file.name}</p>
                        </div>
                      )}
                    </div>

                  {/* Universe Input */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-3">
                      2. Pick universe
                      <span className="ml-2 text-xs text-white/50 font-normal italic">
                        (works better with animated universes)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={universe}
                      onChange={(e) => setUniverse(e.target.value)}
                      placeholder="Enter your favorite universe..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-red-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-lg text-red-400 text-sm">
                  ❌ {error}
                </div>
              )}

              {/* Generate Button */}
              <motion.button
                whileHover={isMobile ? {} : { scale: 1.02 }}
                whileTap={isMobile ? {} : { scale: 0.98 }}
                onClick={handleGenerateStory}
                disabled={!uploadType || !file || isLoading}
                className="w-full netflix-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start episode
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Marketing Section - Transform Section */}
      <section className="relative py-24 px-4 sm:px-6 overflow-x-hidden bg-gradient-to-b from-black/50 via-black/60 to-black/50 border-t border-white/10">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-red-600/30 via-pink-600/20 to-purple-600/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, -40, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-blue-600/20 via-cyan-600/20 to-teal-600/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 rounded-full blur-[140px]"
          />
        </div>

        <div className="max-w-7xl w-full mx-auto relative z-10">
          <motion.div
            {...getAnimationProps({ viewport: { once: true } })}
            className="text-center space-y-6 mb-16"
          >
            <motion.div
              initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-block"
            >
              <span className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-full text-sm text-red-400 font-semibold uppercase tracking-wider">
                ✨ Magic Happens Here
              </span>
            </motion.div>
            <motion.h2
              initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={isMobile ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold break-words px-2"
            >
              <span className="text-white">Transform your </span>
              <span className="text-gradient-red glow-red">boring</span>
              <span className="text-white"> lesson notes into a </span>
              <span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">story</span>
              <span className="text-white"> from your favorite </span>
              <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">universe</span>
            </motion.h2>
          </motion.div>

          <motion.div
            {...getAnimationProps({ 
              viewport: { once: true },
              transition: { delay: isMobile ? 0 : 0.2 }
            })}
            className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"
          >
            {/* Left Image - Vertical (9:16) */}
            <motion.div
              initial={isMobile ? { opacity: 1, scale: 1 } : { opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: isMobile ? 0 : 0.3 }}
              whileHover={isMobile ? {} : { scale: 1.05, y: -10 }}
              className="relative flex-shrink-0 w-full sm:w-[180px] md:w-[200px] lg:w-[220px]"
            >
              <div className="relative rounded-3xl overflow-hidden border-2 border-gradient-to-br from-red-500/30 via-pink-500/20 to-purple-500/20 shadow-2xl bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm" style={{ aspectRatio: '9/16' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-purple-600/10 pointer-events-none z-10" />
                <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none z-10" />
                <Image
                  src="https://i.ibb.co/Kxm5KS6Y/note.png"
                  alt="Lesson notes"
                  fill
                  className="object-contain transition-transform duration-300"
                  quality={95}
                  sizes="(max-width: 640px) 180px, (max-width: 768px) 200px, 220px"
                  unoptimized={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-10" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-3xl bg-red-600/20 blur-2xl -z-10 opacity-50" />
            </motion.div>

            {/* Animated Arrow - Center */}
            <motion.div
              initial={isMobile ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: isMobile ? 0 : 0.5 }}
              className="flex-shrink-0 relative"
            >
              <motion.div
                animate={isMobile ? {} : {
                  x: [0, 10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8
                }}
                className="relative"
              >
                <div className="absolute inset-0 bg-red-600/30 blur-xl rounded-full" />
                <svg
                  className="relative w-12 h-12 lg:w-20 lg:h-20 text-red-600 rotate-90 lg:rotate-0 drop-shadow-lg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.div>
            </motion.div>

            {/* Right Image - Horizontal (16:9) */}
            <motion.div
              initial={isMobile ? { opacity: 1, scale: 1 } : { opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: isMobile ? 0 : 0.4 }}
              whileHover={isMobile ? {} : { scale: 1.05, y: -10 }}
              className="relative flex-shrink-0 w-full sm:w-[320px] md:w-[380px] lg:w-[440px]"
            >
              <div className="relative rounded-3xl overflow-hidden border-2 border-gradient-to-br from-blue-500/30 via-cyan-500/20 to-teal-500/20 shadow-2xl bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-teal-600/10 pointer-events-none z-10" />
                <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none z-10" />
                <Image
                  src="https://i.ibb.co/rGr96TKb/Ekran-g-r-nt-s-2025-11-20-175542.png"
                  alt="Story transformation"
                  fill
                  className="object-contain transition-transform duration-300"
                  quality={95}
                  sizes="(max-width: 640px) 320px, (max-width: 768px) 380px, 440px"
                  unoptimized={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-10" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-3xl bg-blue-600/20 blur-2xl -z-10 opacity-50" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Lorey Loop */}
      <section className="relative py-24 px-4 sm:px-6 overflow-x-hidden border-t border-white/10 bg-black/40">
        <div className="max-w-6xl w-full mx-auto space-y-16">
          <motion.div
            {...getAnimationProps({ viewport: { once: true } })}
            className="text-center space-y-4"
          >
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Lorey Originals</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white break-words px-2">From notes to red-carpet episodes.</h2>
            <p className="text-white/60 text-base sm:text-lg max-w-3xl mx-auto break-words px-2">
              Swipe through your study session like it just premiered. Minimal effort, maximum retention.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Upload + forget',
                description: 'TXT or PDF. We scrub, clean, and prep it like a show runner.',
                tag: 'Step 01',
              },
              {
                title: 'Pick the universe',
                description: 'Choose any universe you love. Your own fan fiction works too. Tone + visuals adapt instantly.',
                tag: 'Step 02',
              },
              {
                title: 'Hit play',
                description: 'Episode drops with scenes, quizzes, cliffhangers. You binge, you learn.',
                tag: 'Step 03',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                {...getAnimationProps({ 
                  viewport: { once: true },
                  transition: { delay: isMobile ? 0 : index * 0.1 }
                })}
                className="relative p-6 border border-white/10 rounded-3xl bg-white/5 backdrop-blur"
              >
                <div className="text-white/40 text-xs uppercase tracking-[0.3em] mb-4">{item.tag}</div>
                <h3 className="text-2xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </motion.div>
            ))}
          </div>

          <motion.div
            {...getAnimationProps({ viewport: { once: true } })}
            className="flex flex-wrap justify-center gap-4 text-xs text-white/50 uppercase tracking-[0.4em]"
          >
            {['No PDFs to format', 'No templates', 'No boring slides'].map((text) => (
              <span key={text} className="px-4 py-2 border border-white/10 rounded-full">
                {text}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Billboard */}
      <section className="relative py-24 px-4 sm:px-6 bg-black/60 border-y border-white/5 overflow-x-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 left-1/3 w-48 h-48 sm:w-72 sm:h-72 bg-red-600/30 blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-56 h-56 sm:w-80 sm:h-80 bg-purple-600/30 blur-[180px]" />
        </div>
        <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
          <motion.div
            {...getAnimationProps({ 
              initial: isMobile ? { opacity: 1 } : { opacity: 0, x: -30 },
              whileInView: isMobile ? { opacity: 1 } : { opacity: 1, x: 0 },
              viewport: { once: true }
            })}
            className="space-y-6"
          >
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Why Lorey</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight break-words">
              The learning pipeline
              <span className="block text-gradient-red">built like a streaming platform.</span>
              </h2>
              <p className="text-white/70 text-base sm:text-lg break-words">
              Every touchpoint is designed to feel premium, modern, fast. No dashboards. No clutter. Just cinematic focus.
              </p>

            <div className="space-y-4">
              {[
                {
                  title: 'Cinematic engine',
                  detail: 'AI art direction tuned for bold colors, dramatic lighting, and universe accuracy.',
                },
                {
                  title: 'Quiz scripting',
                  detail: 'Micro-interactions replace traditional tests. You barely notice you\'re being assessed.',
                },
                {
                  title: 'Session pacing',
                  detail: 'Episodes clock in at ~8 minutes with cliffhangers to push you forward.',
                },
              ].map((item, index) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="text-white/50 text-sm mt-1">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <p className="text-white font-semibold">{item.title}</p>
                    <p className="text-white/60 text-sm">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...getAnimationProps({ 
              initial: isMobile ? { opacity: 1 } : { opacity: 0, x: 30 },
              whileInView: isMobile ? { opacity: 1 } : { opacity: 1, x: 0 },
              viewport: { once: true }
            })}
            className="relative border border-white/10 rounded-[32px] overflow-hidden bg-black/50 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent" />
            <div className="relative p-8 space-y-6">
              <div className="flex items-center justify-between text-sm text-white/60 uppercase tracking-[0.3em]">
                <span>Episode Builder</span>
                <span>Live</span>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
                  <p className="text-white text-sm uppercase tracking-[0.3em] mb-1">Universe</p>
                  <p className="text-white text-2xl font-semibold">"Your Universe"</p>
                  <p className="text-white/60 text-xs">Season 02 · Episode 07</p>
                </div>
                <div className="space-y-3">
                  {['Scene visuals', 'Dialogue beats', 'Quiz moments'].map((label, idx) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <p className="text-white/70 text-sm">{label}</p>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                          style={{ width: `${40 + idx * 20}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Proof Strip */}
      <section className="relative py-16 px-4 sm:px-6 overflow-x-hidden bg-black/30 border-b border-white/5">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {[
            { label: 'Retention lift', value: '10x' },
            { label: 'Average watch time', value: '42 min' },
            { label: 'Students who finish', value: '91%' },
            { label: 'Universes available', value: '∞' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              {...getAnimationProps({ 
                viewport: { once: true },
                transition: { delay: isMobile ? 0 : index * 0.1 }
              })}
              className="space-y-2"
            >
              <p className="text-4xl font-bold text-white">{item.value}</p>
              <p className="text-white/50 text-sm uppercase tracking-[0.3em]">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-24 px-4 sm:px-6 overflow-x-hidden">
        <div className="max-w-5xl w-full mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Fans of binge-learning</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">“It feels illegal to study this way.”</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: 'Lorey turned my pharmacology notes into a gritty medical drama. I stopped zoning out.',
                author: 'Sarah · Med Student',
              },
              {
                quote: 'I watch a “lesson” before sleep the way I used to watch trailers. Grades went up.',
                author: 'Jake · High School Senior',
              },
            ].map((item, index) => (
              <motion.div
                key={item.author}
                {...getAnimationProps({ 
                  viewport: { once: true },
                  transition: { delay: isMobile ? 0 : index * 0.1 }
                })}
                className="p-6 border border-white/10 rounded-3xl bg-white/5"
              >
                <p className="text-white/90 text-lg leading-relaxed">“{item.quote}”</p>
                <p className="text-white/50 text-sm mt-4">{item.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Only show if user doesn't have active subscription */}
      {(!subscription || subscription.status !== 'active') && (
      <section id="pricing" className="relative py-24 px-4 sm:px-6 overflow-x-hidden bg-black/60 border-y border-white/5">
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-red-600/30 blur-[140px]" />
          <div className="absolute bottom-1/3 right-1/4 w-56 h-56 sm:w-80 sm:h-80 bg-purple-600/30 blur-[180px]" />
        </div>
        <div className="max-w-6xl w-full mx-auto relative z-10">
          <motion.div
            {...getAnimationProps({ viewport: { once: true } })}
            className="text-center space-y-4 mb-16"
          >
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Pricing</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Pick your binge plan</h2>
            <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto">
              Monthly subscriptions. Cancel anytime. All plans include full access to all universes and features.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Slacker',
                planKey: 'slacker',
                price: 15,
                stories: 10,
                description: 'Perfect for casual learners',
                features: [
                  '10 stories per month',
                  'All universes',
                  'Interactive quizzes',
                  'HD image generation'
                ],
                highlighted: false
              },
              {
                name: 'Student',
                planKey: 'student',
                price: 25,
                stories: 30,
                description: 'Best for regular studying',
                features: [
                  '30 stories per month',
                  'All universes',
                  'Interactive quizzes',
                  'HD image generation',
                  'Priority support'
                ],
                highlighted: true
              },
              {
                name: 'Nerd',
                planKey: 'nerd',
                price: 45,
                stories: 50,
                description: 'For serious learners',
                features: [
                  '50 stories per month',
                  'All universes',
                  'Interactive quizzes',
                  'HD image generation',
                  'Priority support',
                  'Early access to features'
                ],
                highlighted: false
              }
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                {...getAnimationProps({
                  viewport: { once: true },
                  transition: { delay: isMobile ? 0 : index * 0.1 }
                })}
                className={`relative p-8 rounded-3xl backdrop-blur-xl flex flex-col ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-red-600/20 to-red-900/10 border-2 border-red-600/50 shadow-[0_0_50px_rgba(220,38,38,0.3)]'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-white/60 text-sm">{plan.description}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">${plan.price}</span>
                      <span className="text-white/50 text-sm">/month</span>
                    </div>
                    <span className="text-white/40 text-xs">${(plan.price * 1.20).toFixed(2)} with 20% VAT</span>
                  </div>
                  <ul className="space-y-3 pb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-white/80 text-sm">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <motion.button
                    whileHover={isMobile ? {} : { scale: 1.02 }}
                    whileTap={isMobile ? {} : { scale: 0.98 }}
                    onClick={async () => {
                      if (!authLoading && !user) {
                        setAuthMode('signup');
                        setAuthModalOpen(true);
                      } else {
                        try {
                          setIsCheckoutLoading(true);
                          console.log('🛒 Checkout request:', { planName: plan.name, planKey: plan.planKey });
                          const response = await fetch('/api/subscription/create-checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ planName: plan.planKey })
                          });

                          const data = await response.json();

                          if (data.checkoutUrl) {
                            window.location.href = data.checkoutUrl;
                          } else {
                            setError(data.error || 'Failed to create checkout session');
                            setIsCheckoutLoading(false);
                          }
                        } catch (err) {
                          console.error('Checkout error:', err);
                          setError('Failed to start checkout. Please try again.');
                          setIsCheckoutLoading(false);
                        }
                      }
                    }}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      plan.highlighted
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }`}
                  >
                    Get Started
                  </motion.button>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...getAnimationProps({ viewport: { once: true } })}
            className="mt-12 text-center space-y-4"
          >
            <p className="text-white/50 text-sm">
              All plans renew monthly. Cancel anytime from your settings.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-white/40">
              <span>✓ No hidden fees</span>
              <span>✓ Secure checkout</span>
              <span>✓ Instant access</span>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Final CTA - Minimal */}
      <section className="relative py-24 px-4 sm:px-6 overflow-x-hidden bg-gradient-to-b from-black/30 to-black border-y border-white/5">
        <div className="max-w-4xl w-full mx-auto text-center space-y-8">
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Ready?</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white break-words px-2">
            Press play on your next study session.
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto break-words px-2">
            Build your first episode in under two minutes. No credit card. No templates. Just premium learning vibes.
          </p>
          <motion.button
            whileHover={isMobile ? {} : { scale: 1.05 }}
            whileTap={isMobile ? {} : { scale: 0.95 }}
            onClick={() => {
              if (!authLoading && !user) {
                setAuthMode('signup');
                setAuthModalOpen(true);
              } else {
                // Prevent auto-scroll on mobile
                if (!isMobile) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }
            }}
            className="netflix-button text-lg px-10 py-4"
          >
            Launch Lorey
          </motion.button>
          <p className="text-white/40 text-xs uppercase tracking-[0.4em]">No strings attached</p>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-12 px-4 sm:px-6 overflow-x-hidden border-t border-white/10">
        <div className="max-w-5xl w-full mx-auto text-center">
          <p className="text-white/50 text-sm">
            © 2025 Lorey. Turning homework into cliffhangers.
          </p>
        </div>
      </footer>
    </>
  );
}
