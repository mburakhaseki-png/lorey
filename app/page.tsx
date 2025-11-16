'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { validateLessonText } from '@/utils/parseLesson';
import Loader from '@/components/Loader';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { StoryData } from '@/utils/types';

type UploadType = 'file' | 'url' | 'youtube' | null;

const heroQuotes = [
  "My mom never realizes I'm studying.",
  "From boring class notes to a Rick and Morty episode.",
  "Study like a binge session.",
  "Homework… but it slaps."
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [universe, setUniverse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [currentQuote, setCurrentQuote] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

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


    if (!uploadType || (!file && !url)) {
      setError('Please select an upload method and provide content');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let lessonText = extractedText;

      if (!lessonText) {
        // Get API URL and clean it (remove trailing slashes and ensure no double slashes)
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        apiUrl = apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
        apiUrl = apiUrl.replace(/\/+/g, '/'); // Replace multiple slashes with single slash
        
        if (uploadType === 'file' && file) {
          const formData = new FormData();
          formData.append('file', file);
          const extractResponse = await axios.post(`${apiUrl}/api/extract/file`, formData);
          lessonText = extractResponse.data.text;
        } else if ((uploadType === 'url' || uploadType === 'youtube') && url) {
          const extractResponse = await axios.post(`${apiUrl}/api/extract/url`, { url });
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

      // Get API URL and clean it (remove trailing slashes and ensure no double slashes)
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      apiUrl = apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
      apiUrl = apiUrl.replace(/\/+/g, '/'); // Replace multiple slashes with single slash
      
      const response = await axios.post(`${apiUrl}/api/generate/story`, {
        lessonText,
        universe: universe || 'Rick and Morty'
      });

      const storyData: StoryData = response.data;
      const storyUniverse = universe || 'Rick and Morty';

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Creating your episode..." />
      </div>
    );
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8 lg:sticky lg:top-24"
            >
              {/* Rotating Quote */}
              <div className="space-y-4">
                <motion.p
                  key={currentQuote}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
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
                  <span className="font-semibold">148</span> universes
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="cinematic-card p-8 space-y-6"
            >
              <div>
                <h2 className="text-2xl font-semibold mb-2">Start your episode</h2>
                <p className="text-white/60 text-sm">Drop your content, pick a universe.</p>
              </div>

              <div className="space-y-6">
                  {/* Upload Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-3">
                      1. Choose source
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { type: 'file' as UploadType, icon: '📄', label: 'File' },
                        { type: 'url' as UploadType, icon: '🌐', label: 'URL' },
                        { type: 'youtube' as UploadType, icon: '🎥', label: 'YouTube' },
                      ].map((option) => (
                        <motion.button
                          key={option.type}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setUploadType(option.type);
                            setError('');
                          }}
                          className={`p-4 rounded-lg border transition-all ${
                            uploadType === option.type
                              ? 'border-red-600 bg-red-600/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="text-2xl mb-1">{option.icon}</div>
                          <div className="text-xs font-medium">{option.label}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* File Upload */}
                  {uploadType === 'file' && (
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
                  )}

                  {/* URL Input */}
                  {(uploadType === 'url' || uploadType === 'youtube') && (
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={uploadType === 'youtube' ? 'YouTube URL' : 'Website URL'}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-red-600 focus:outline-none transition-all"
                    />
                  )}

                  {/* Universe Input */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-3">
                      2. Pick universe
                    </label>
                    <input
                      type="text"
                      value={universe}
                      onChange={(e) => setUniverse(e.target.value)}
                      placeholder="e.g., Rick and Morty, Harry Potter..."
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateStory}
                disabled={!uploadType || (!file && !url) || isLoading}
                className="w-full netflix-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start episode
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Minimal 3 Steps */}
      <section className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">How it works</span>
            </h2>
            <p className="text-white/70 text-lg">Three simple steps to binge-worthy studying</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Drop the source',
                description: 'TXT, PDF, URL, or YouTube captions.'
              },
              {
                step: '02',
                title: 'Pick your world',
                description: 'Rick & Morty? Hogwarts? Your choice.'
              },
              {
                step: '03',
                title: 'Binge the episode',
                description: 'Scenes, quizzes, visuals—all automatic.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="cinematic-card p-6 space-y-3"
              >
                <div className="text-3xl font-bold text-white/20">{item.step}</div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Works - Simple Explanation */}
      <section className="relative py-20 px-4 bg-black/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Your brain loves stories more than textbooks.
              </h2>
              <p className="text-white/70 text-lg">
                Stories trigger memory anchors. Dialog beats bullet points. Micro-choices force recall without feeling like tests.
              </p>
            </div>
            <div className="space-y-4">
              {[
                'Stories trigger memory anchors',
                'Dialog beats bullet points',
                'Micro-choices force recall'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                  </div>
                  <p className="text-white/80">{item}</p>
                </div>
              ))}
            </div>
          </div>
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
