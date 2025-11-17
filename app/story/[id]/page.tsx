'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import Quiz from '@/components/Quiz';
import { FullPageLoader } from '@/components/Loader';
import Header from '@/components/Header';
import type { StoryData, Quiz as QuizType } from '@/utils/types';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function StoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const storyId = params.id as string;
  const { user } = useAuth();
  const supabase = createClient();
  
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [universe, setUniverse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const storyContentRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const animationsPlayedRef = useRef<Set<number>>(new Set());

  const { scrollYProgress } = useScroll({
    container: storyContentRef,
  });

  // Helper function to get image URL for a paragraph index
  const getImageUrl = useCallback((paragraphIndex: number) => {
    if (!storyData) return null;
    // Images are at indices 0, 3, 6, 9, ...
    // For paragraph index, find the corresponding image index
    const imageIndex = Math.floor(paragraphIndex / 3) * 3;
    if (imageIndex < storyData.story.length && imageIndex % 3 === 0) {
      const imageUrl = storyData.story[imageIndex]?.imageUrl;
      // Return null if imageUrl is empty, null, or undefined
      return imageUrl && imageUrl !== '' ? imageUrl : null;
    }
    return null;
  }, [storyData]);

  const handleQuizRegenerate = (index: number) => (newQuiz: QuizType) => {
    setStoryData((prevData) => {
      if (!prevData) return prevData;
      const newStory = [...prevData.story];
      newStory[index] = { ...newStory[index], quiz: newQuiz };
      return { ...prevData, story: newStory };
    });
  };

  const handleBackToHome = () => {
    router.push('/my-stories');
  };

  // Generate images for paragraphs that need them
  const generateImages = useCallback(async (data: StoryData, universeContext: string) => {
    if (!data.story || data.story.length === 0) return;

    const paragraphsNeedingImages = data.story.filter((p, idx) =>
      idx % 3 === 0 && p.imagePrompt && p.imagePrompt !== null && (!p.imageUrl || p.imageUrl === '')
    );

    if (paragraphsNeedingImages.length === 0) {
      console.log('✅ All images already generated');
      return;
    }

    console.log('🎨 Starting image generation for', paragraphsNeedingImages.length, 'paragraphs');

    let generatedCount = 0;

    for (let i = 0; i < data.story.length; i += 3) {
      const paragraph = data.story[i];

      if (!paragraph.imagePrompt || paragraph.imagePrompt === null || (paragraph.imageUrl && paragraph.imageUrl !== '')) {
        continue;
      }

      generatedCount++;
      console.log(`🖼️ Generating image ${generatedCount}/${paragraphsNeedingImages.length} (paragraph ${i})`);

      let imageGenerated = false;
      const maxRetries = 3;

      for (let retryAttempt = 1; retryAttempt <= maxRetries && !imageGenerated; retryAttempt++) {
        try {
          if (retryAttempt > 1) {
            console.log(`🔄 Retrying image generation for paragraph ${i} (attempt ${retryAttempt}/${maxRetries})...`);
            const waitTime = Math.min(2000 * Math.pow(2, retryAttempt - 2), 4000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          // Get API URL and clean it (remove trailing slashes)
          let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          apiUrl = apiUrl.trim().replace(/\/+$/, '');

          const response = await axios.post(`${apiUrl}/api/generate/image`, {
            prompt: paragraph.imagePrompt,
            universe: universeContext,
          });

          if (response.data?.imageUrl && response.data.imageUrl !== '') {
            // Update state using functional update to ensure we have the latest state
            setStoryData((prevData) => {
              if (!prevData) return prevData;
              const updatedStory = { ...prevData };
              updatedStory.story = [...updatedStory.story];
              updatedStory.story[i] = { ...updatedStory.story[i], imageUrl: response.data.imageUrl };
              
              // Update in Supabase (async, don't await in setState)
              if (user && storyId) {
                (async () => {
                  try {
                    const { error } = await supabase
                      .from('stories')
                      .update({
                        story_data: updatedStory,
                      })
                      .eq('id', storyId)
                      .eq('user_id', user.id);
                    
                    if (error) {
                      console.error('Error updating story in database:', error);
                    } else {
                      console.log(`✅ Story updated in database for paragraph ${i}`);
                    }
                  } catch (err: any) {
                    console.error('Error updating story in database:', err);
                  }
                })();
              }
              
              return updatedStory;
            });
            
            imageGenerated = true;
            console.log(`✅ Image generated successfully for paragraph ${i}: ${response.data.imageUrl}`);
          } else {
            throw new Error('No imageUrl in response');
          }
        } catch (err) {
          console.error(`❌ Failed to generate image for paragraph ${i} (attempt ${retryAttempt}/${maxRetries}):`, err);
          if (retryAttempt === maxRetries) {
            console.error(`❌ All ${maxRetries} attempts failed for paragraph ${i}. Skipping...`);
          }
        }
      }
    }

    console.log(`✅ Image generation complete! Generated ${generatedCount} images`);
  }, [user, storyId, supabase]);

  useEffect(() => {
    const loadStory = async () => {
      if (!user || !storyId) {
        router.push('/my-stories');
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('stories')
          .select('*')
          .eq('id', storyId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          router.push('/my-stories');
          return;
        }

        const loadedStoryData = data.story_data as StoryData;
        setStoryData(loadedStoryData);
        setUniverse(data.universe);
        setIsLoading(false);

        // Check if images need to be generated
        const needsImageGeneration = loadedStoryData.story.some(
          (p: any, idx: number) => idx % 3 === 0 && p.imagePrompt && (!p.imageUrl || p.imageUrl === '')
        );

        if (needsImageGeneration) {
          console.log('🖼️ Some images are missing, generating them...');
          generateImages(loadedStoryData, data.universe);
        }
      } catch (err: any) {
        console.error('Error loading story:', err);
        setError(err.message || 'Failed to load story');
        setIsLoading(false);
      }
    };

    if (user) {
      loadStory();
    }
  }, [user, storyId, router, supabase, generateImages]);

  // Update active image based on scroll position (throttled for better performance)
  useEffect(() => {
    if (!storyData) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!storyContentRef.current) {
            ticking = false;
            return;
          }

          const paragraphs = storyContentRef.current.querySelectorAll('[data-paragraph-index]');
          const scrollPosition = window.scrollY + window.innerHeight / 2;

          for (let i = 0; i < paragraphs.length; i++) {
            const element = paragraphs[i] as HTMLElement;
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const elementBottom = elementTop + rect.height;

            if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
              const paragraphIndex = parseInt(element.getAttribute('data-paragraph-index') || '0');
              const imageIndex = Math.floor(paragraphIndex / 3) * 3;
              
              if (imageIndex < storyData.story.length && imageIndex !== activeImageIndex) {
                setActiveImageIndex(imageIndex);
              }
              ticking = false;
              return;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [storyData, activeImageIndex]);

  if (isLoading) {
    return <FullPageLoader message="Loading your episode..." showSnake={false} />;
  }

  if (error || !storyData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-rose-300">{error || 'Story not found'}</p>
          <button onClick={handleBackToHome} className="netflix-button">
            Back to My Stories
          </button>
        </div>
      </div>
    );
  }

  // Get current active image URL - ensure index is valid
  const safeImageIndex = activeImageIndex < storyData.story.length ? activeImageIndex : 0;
  const currentImageUrl = storyData.story[safeImageIndex]?.imageUrl || null;
  const currentImagePrompt = storyData.story[safeImageIndex]?.imagePrompt || null;

  return (
    <>
      <Header />
      
      {/* Main Layout: 50/50 Split - Sticky Image Left + Scrollable Content Right */}
      <div className="flex min-h-screen pt-20">
        {/* Left: Sticky Full-Height Image (framed) */}
        <div className="hidden lg:block lg:w-1/2 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
          <div className="h-full flex items-center justify-center p-6 xl:p-8">
            {currentImageUrl ? (
              <motion.div
                key={safeImageIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-xl xl:max-w-2xl aspect-square"
              >
                {/* Outer frame */}
                <div className="absolute inset-0 rounded-[32px] border border-white/15 bg-gradient-to-b from-white/10/ via-white/0 to-white/5 opacity-80" />
                <div className="absolute inset-0 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.35)]" />

                <div className="relative h-full w-full p-4">
                  <div className="relative h-full w-full rounded-[26px] overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center p-2">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
                    <img
                      src={currentImageUrl}
                      alt={currentImagePrompt || `Scene ${safeImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 z-20">
                      <span className="episode-badge text-xs">
                        EPISODE {Math.floor(safeImageIndex / 3) + 1}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="relative w-full max-w-xl xl:max-w-2xl aspect-square rounded-[32px] border border-white/15 bg-black/30 flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-2">🖼️</div>
                  <p className="text-white/50 text-lg font-medium">No Image</p>
                  <p className="text-white/30 text-sm">Image not available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Scrollable Story Content (50% width) */}
        <div ref={storyContentRef} className="flex-1 lg:w-1/2">
          {/* Hero Section */}
          <section className="min-h-screen flex items-center justify-center px-4 py-20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="episode-badge text-sm"
              >
                {universe || 'Your Story'}
              </motion.span>

              <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                <span className="block text-gradient-red glow-red">
                  {storyData.title || `${universe} Learning Journey`}
                </span>
              </h1>

              {/* Learning Outcomes */}
              {storyData.learningOutcomes && storyData.learningOutcomes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-2xl mx-auto"
                >
                  <p className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">
                    Learning Outcomes
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {storyData.learningOutcomes.map((outcome, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/80"
                      >
                        {outcome}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

            </div>
          </section>

          {/* Story Paragraphs */}
          {storyData.story.map((paragraph: any, index: number) => {
            const imageUrl = getImageUrl(index);
            const hasAnimated = animationsPlayedRef.current.has(index);
            
            return (
              <motion.section
                key={index}
                data-paragraph-index={index}
                initial={{ opacity: hasAnimated ? 1 : 0, y: hasAnimated ? 0 : 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={hasAnimated ? { duration: 0 } : { duration: 0.6, delay: index * 0.05 }}
                onAnimationComplete={() => {
                  if (!hasAnimated) {
                    animationsPlayedRef.current.add(index);
                  }
                }}
                className="min-h-screen flex items-center justify-center px-4 py-20"
              >
                <div className="max-w-3xl mx-auto w-full space-y-8">
                  {/* Mobile Image */}
                  {index % 3 === 0 && (
                    <motion.div
                      initial={{ opacity: hasAnimated ? 1 : 0 }}
                      animate={{ opacity: 1 }}
                      transition={hasAnimated ? { duration: 0 } : { duration: 0.4, delay: index * 0.05 + 0.1 }}
                      className="lg:hidden relative aspect-square rounded-[28px] border border-white/15 bg-black/30 p-3 shadow-lg"
                    >
                      <div className="relative h-full w-full rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center p-2">
                        {imageUrl ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
                            <img
                              src={imageUrl}
                              alt={paragraph.imagePrompt || `Scene ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute top-4 left-4 z-20">
                              <span className="episode-badge text-xs">
                                EPISODE {Math.floor(index / 3) + 1}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center space-y-2">
                            <div className="text-4xl mb-2">🖼️</div>
                            <p className="text-white/50 text-sm font-medium">No Image</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Paragraph Text */}
                  {paragraph.paragraph && (
                    <motion.div
                      initial={{ opacity: hasAnimated ? 1 : 0, y: hasAnimated ? 0 : 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={hasAnimated ? { duration: 0 } : { duration: 0.5, delay: index * 0.05 + 0.2 }}
                      className="bg-black/40 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-xl"
                    >
                      <p className="text-lg md:text-xl leading-relaxed text-white/90 whitespace-pre-wrap">
                        {paragraph.paragraph}
                      </p>
                    </motion.div>
                  )}

                  {/* Quiz */}
                  {paragraph.quiz && (
                    <motion.div
                      initial={{ opacity: hasAnimated ? 1 : 0, y: hasAnimated ? 0 : 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={hasAnimated ? { duration: 0 } : { duration: 0.5, delay: index * 0.05 + 0.3 }}
                      className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
                    >
                      <Quiz
                        quiz={paragraph.quiz}
                        concept={paragraph.paragraph?.substring(0, 100) || ''}
                        universe={universe}
                        onRegenerate={handleQuizRegenerate(index)}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.section>
            );
          })}

          {/* Footer */}
          <footer className="min-h-screen flex items-center justify-center px-4 py-20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Story Complete! 🎉
              </h2>
              <p className="text-white/60 text-lg">
                You've completed all {storyData.story.length} episodes. Ready to learn something new?
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToHome}
                className="netflix-button"
              >
                Back to My Stories
              </motion.button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
