'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { validateLessonText } from '@/utils/parseLesson';
import { FullPageLoader } from '@/components/Loader';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
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

  // Simplified animation props for mobile
  const mobileAnimationProps = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    whileInView: { opacity: 1 },
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
      return { ...mobileAnimationProps, ...customProps };
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
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const handleGenerateStory = async () => {
    // Kullanıcı giriş yapmamışsa auth modalını aç
    if (!authLoading && !user) {
      setAuthMode('signup');
      setAuthModalOpen(true);
      return;
    }


    if (!uploadType || !file) {
      setError('Please upload a file');
      return;
    }

    setIsLoading(true);
    setError('');

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
          throw new Error('Failed to extract text from source');
        }
        setExtractedText(lessonText);
      }

      const validation = validateLessonText(lessonText);
      if (!validation.isValid) {
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
      setError(err.response?.data?.error || 'Failed to generate story');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <FullPageLoader message="Creating your episode..." showSnake={true} />;
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
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-20 overflow-hidden">
        {/* Hero Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-800/20 rounded-full blur-[120px] opacity-60" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[140px] opacity-40" />
        </div>
        <div className="max-w-5xl w-full mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
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
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="block text-white">Homework…</span>
                  <span className="block text-gradient-red glow-red">but it slaps.</span>
                </h1>
                <p className="text-xl text-white/70 leading-relaxed">
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
              className="cinematic-card p-8 space-y-6"
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
                      <p className="text-xs text-white/50">TXT or PDF (max 10MB)</p>
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

      {/* Lorey Loop */}
      <section className="relative py-24 px-4 border-t border-white/10 bg-black/40">
        <div className="max-w-6xl mx-auto space-y-16">
          <motion.div
            {...getAnimationProps({ viewport: { once: true } })}
            className="text-center space-y-4"
          >
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Lorey Originals</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">From notes to red-carpet episodes.</h2>
            <p className="text-white/60 text-lg max-w-3xl mx-auto">
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
      <section className="relative py-24 px-4 bg-black/60 border-y border-white/5 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-10 left-1/3 w-72 h-72 bg-red-600/30 blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/30 blur-[180px]" />
        </div>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            {...getAnimationProps({ 
              initial: isMobile ? { opacity: 1 } : { opacity: 0, x: -30 },
              whileInView: isMobile ? { opacity: 1 } : { opacity: 1, x: 0 },
              viewport: { once: true }
            })}
            className="space-y-6"
          >
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Why Lorey</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              The learning pipeline
              <span className="block text-gradient-red">built like a streaming platform.</span>
              </h2>
              <p className="text-white/70 text-lg">
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
      <section className="relative py-16 px-4 bg-black/30 border-b border-white/5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-6 text-center">
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
      <section className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Fans of binge-learning</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">“It feels illegal to study this way.”</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: 'Lorey turned my pharmacology notes into a gritty medical drama. I stopped zoning out.',
                author: 'Leyla · Med Student',
              },
              {
                quote: 'I watch a “lesson” before sleep the way I used to watch trailers. Grades went up.',
                author: 'Arda · High School Senior',
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

      {/* Final CTA - Minimal */}
      <section className="relative py-24 px-4 bg-gradient-to-b from-black/30 to-black border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Ready?</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Press play on your next study session.
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-white/50 text-sm">
            © 2025 Lorey. Turning homework into cliffhangers.
          </p>
        </div>
      </footer>
    </>
  );
}
