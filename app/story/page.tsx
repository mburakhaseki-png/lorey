'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Quiz from '@/components/Quiz';
import { FullPageLoader } from '@/components/Loader';
import Header from '@/components/Header';
import type { StoryData, Quiz as QuizType } from '@/utils/types';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function StoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [universe, setUniverse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [totalImagesToGenerate, setTotalImagesToGenerate] = useState(0);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [error, setError] = useState('');
  const imageGenerationStarted = useRef(false);
  const storyContentRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const animationsPlayedRef = useRef<Set<number>>(new Set());

  // Generate images for paragraphs that need them
  const generateImages = useCallback(async (initialData: StoryData, universeContext: string) => {
    if (!initialData.story || initialData.story.length === 0) return;

    const paragraphsNeedingImages = initialData.story.filter((p, idx) =>
      idx % 3 === 0 && p.imagePrompt && p.imagePrompt !== null && !p.imageUrl
    );

    if (paragraphsNeedingImages.length === 0) {
      console.log('✅ All images already generated');
      return;
    }

    console.log('🎨 Starting image generation for', paragraphsNeedingImages.length, 'paragraphs');
    setTotalImagesToGenerate(paragraphsNeedingImages.length);
    setIsGeneratingImages(true);

    let generatedCount = 0;
    let currentStoryData = { ...initialData };
    currentStoryData.story = [...initialData.story];

    for (let i = 0; i < initialData.story.length; i += 3) {
      const paragraph = initialData.story[i];
      const hasImageUrl = paragraph.imageUrl && paragraph.imageUrl !== '' && paragraph.imageUrl !== null && paragraph.imageUrl !== undefined;
      
      if (!paragraph.imagePrompt || paragraph.imagePrompt === null || hasImageUrl) {
        continue;
      }

      generatedCount++;
      console.log(`🖼️ Generating image ${generatedCount}/${paragraphsNeedingImages.length} (paragraph ${i})`);

      let imageGenerated = false;
      const maxRetries = 3;

      for (let retryAttempt = 1; retryAttempt <= maxRetries && !imageGenerated; retryAttempt++) {
        try {
          setCurrentImageIndex(generatedCount - 1);

          if (retryAttempt > 1) {
            const waitTime = Math.min(2000 * Math.pow(2, retryAttempt - 2), 4000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          apiUrl = apiUrl.trim().replace(/\/+$/, '');
          
          const response = await axios.post(`${apiUrl}/api/generate/image`, {
            prompt: paragraph.imagePrompt,
            universe: universeContext,
          });

          if (response.data?.imageUrl && response.data.imageUrl !== '') {
            const newImageUrl = response.data.imageUrl;
            
            currentStoryData.story[i] = { ...currentStoryData.story[i], imageUrl: newImageUrl };
            
            setStoryData((prevData) => {
              if (!prevData) {
                console.log(`⚠️ setStoryData: prevData is null for paragraph ${i}`);
                return prevData;
              }
              const updatedStory = { ...prevData };
              updatedStory.story = [...updatedStory.story];
              updatedStory.story[i] = { ...updatedStory.story[i], imageUrl: newImageUrl };
              console.log(`✅ State updated: paragraph ${i} now has imageUrl: ${newImageUrl.substring(0, 50)}...`);
              console.log(`📸 Updated story has ${updatedStory.story.length} paragraphs`);
              return updatedStory;
            });
            
            const storyId = sessionStorage.getItem('storyId');
            if (storyId && user) {
              supabase
                .from('stories')
                .update({ story_data: currentStoryData })
                .eq('id', storyId)
                .then(({ error }) => {
                  if (error) console.error('Error updating story:', error);
                });
            }
            
            imageGenerated = true;
            console.log(`✅ Image generated for paragraph ${i}`);
          } else {
            throw new Error('No imageUrl in response');
          }
        } catch (err) {
          console.error(`❌ Failed to generate image for paragraph ${i} (attempt ${retryAttempt}):`, err);
        }
      }
    }

    console.log(`✅ Image generation complete! Generated ${generatedCount} images`);
    setIsGeneratingImages(false);
  }, [user, supabase]);

  // Load story data
  useEffect(() => {
    if (imageGenerationStarted.current) return;

    const storedStoryData = sessionStorage.getItem('storyData');
    const storedUniverse = sessionStorage.getItem('universe');

    if (!storedStoryData || !storedUniverse) {
      router.push('/');
      return;
    }

    try {
      const data = JSON.parse(storedStoryData);
      setStoryData(data);
      setUniverse(storedUniverse);
      setIsLoading(false);

      const needsImageGeneration = data.story.some((p: any, idx: number) =>
        idx % 3 === 0 && p.imagePrompt && p.imagePrompt !== null && !p.imageUrl
      );

      if (needsImageGeneration) {
        imageGenerationStarted.current = true;
        generateImages(data, storedUniverse);
      }
    } catch (err) {
      console.error('Failed to load story data:', err);
      setError('Failed to load story. Please try again.');
      setIsLoading(false);
    }
  }, [router, generateImages]);

  // Update active image based on scroll position
  useEffect(() => {
    if (!storyData) {
      console.log('⚠️ Scroll listener: storyData is null');
      return;
    }
    
    if (!storyContentRef.current) {
      console.log('⚠️ Scroll listener: storyContentRef.current is null');
      return;
    }

    console.log('✅ Scroll listener: Setting up...');

    const updateActiveImage = () => {
      if (!storyContentRef.current) {
        console.log('⚠️ updateActiveImage: storyContentRef.current is null');
        return;
      }

      const paragraphs = storyContentRef.current.querySelectorAll('[data-paragraph-index]');
      console.log(`📊 Found ${paragraphs.length} paragraphs in updateActiveImage`);
      
      if (paragraphs.length === 0) {
        console.log('⚠️ No paragraphs found');
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let minDistance = Infinity;

      paragraphs.forEach((paragraph) => {
        const rect = paragraph.getBoundingClientRect();
        const paragraphCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - paragraphCenter);
        const index = parseInt(paragraph.getAttribute('data-paragraph-index') || '0');

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      // Calculate image index: paragraphs 0,1,2 → image 0, paragraphs 3,4,5 → image 3, etc.
      const imageIndex = Math.floor(closestIndex / 3) * 3;

      console.log(`🖼️ Scroll update: Paragraph ${closestIndex} → Image ${imageIndex}, current activeImageIndex: ${activeImageIndex}`);

      setActiveImageIndex((prev) => {
        if (prev !== imageIndex) {
          console.log(`✅ Changing image from index ${prev} to ${imageIndex}`);
          return imageIndex;
        }
        return prev;
      });
    };

    // Initial update
    console.log('⏰ Setting initial image update timeout...');
    const timeoutId = setTimeout(() => {
      console.log('⏰ Initial image update timeout fired');
      updateActiveImage();
    }, 500);

    // Scroll listener
    const handleScroll = () => {
      updateActiveImage();
    };

    console.log('📌 Adding scroll event listener...');
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      console.log('🧹 Cleaning up scroll listener...');
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
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
    sessionStorage.removeItem('storyData');
    sessionStorage.removeItem('universe');
    router.push('/');
  };

  if (isLoading) {
    return <FullPageLoader message="Loading your episode..." showSnake={true} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-rose-300">{error}</p>
          <button onClick={handleBackToHome} className="netflix-button">Back to Home</button>
        </div>
      </div>
    );
  }

  if (!storyData || !storyData.story) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">No story data found</p>
          <button onClick={handleBackToHome} className="netflix-button">Back to Home</button>
        </div>
      </div>
    );
  }

  // Get current image
  const safeImageIndex = activeImageIndex < storyData.story.length ? activeImageIndex : 0;
  const currentImageUrl = storyData.story[safeImageIndex]?.imageUrl || null;
  const currentImagePrompt = storyData.story[safeImageIndex]?.imagePrompt || null;
  
  // Debug: Log current image status
  useEffect(() => {
    console.log(`🖼️ RENDER: activeImageIndex=${activeImageIndex}, safeImageIndex=${safeImageIndex}`);
    console.log(`🖼️ Current image URL: ${currentImageUrl ? currentImageUrl.substring(0, 50) + '...' : 'null'}`);
    
    // Log all images
    const allImages = storyData.story
      .map((p: any, idx: number) => ({ index: idx, hasUrl: !!p.imageUrl, url: p.imageUrl?.substring(0, 30) || 'null' }))
      .filter((item: any) => item.index % 3 === 0);
    console.log('📸 All images in storyData:', allImages);
  }, [activeImageIndex, safeImageIndex, currentImageUrl, storyData]);

  return (
    <>
      <Header />
      
      <AnimatePresence>
        {isGeneratingImages && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-6 bg-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl z-50"
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <div className="text-sm">
                <p className="font-semibold text-white">Generating Images</p>
                <p className="text-white/60 text-xs mt-0.5">
                  {currentImageIndex + 1} / {totalImagesToGenerate}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen pt-20">
        {/* Left: Sticky Image */}
        <div className="hidden lg:block lg:w-1/2 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
          <div className="h-full flex items-center justify-center p-6 xl:p-8">
            {currentImageUrl ? (
              <motion.div
                key={`img-${safeImageIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative w-full max-w-xl aspect-square"
              >
                <div className="absolute inset-0 rounded-[32px] border border-white/15 bg-gradient-to-b from-white/10 via-white/0 to-white/5 opacity-80" />
                <div className="relative h-full w-full p-4">
                  <div className="relative h-full w-full rounded-[26px] overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center p-2">
                    <img
                      src={currentImageUrl}
                      alt={currentImagePrompt || `Scene ${Math.floor(safeImageIndex / 3) + 1}`}
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
              <div className="relative w-full max-w-xl aspect-square rounded-[32px] border border-white/15 bg-black/30 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <motion.div
                    className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full mx-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-white/50 text-lg font-medium">Image Generating...</p>
                  <p className="text-white/30 text-sm">Episode {Math.floor(safeImageIndex / 3) + 1}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Scrollable Content */}
        <div ref={storyContentRef} className="flex-1 lg:w-1/2">
          <section className="min-h-screen flex items-center justify-center px-4 py-20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <motion.span className="episode-badge text-sm">{universe || 'Your Story'}</motion.span>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                <span className="block text-gradient-red glow-red">
                  {storyData.title || `${universe} Learning Journey`}
                </span>
              </h1>
              {storyData.learningOutcomes && storyData.learningOutcomes.length > 0 && (
                <motion.div className="max-w-2xl mx-auto">
                  <p className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">
                    Learning Outcomes
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {storyData.learningOutcomes.map((outcome, index) => (
                      <motion.div
                        key={index}
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

          {storyData.story.map((paragraph: any, index: number) => {
            const imageIndex = Math.floor(index / 3) * 3;
            const imageUrl = storyData.story[imageIndex]?.imageUrl || null;
            const hasAnimated = animationsPlayedRef.current.has(index);
            
            return (
              <motion.section
                key={index}
                data-paragraph-index={index}
                initial={{ opacity: hasAnimated ? 1 : 0, y: hasAnimated ? 0 : 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={hasAnimated ? { duration: 0 } : { duration: 0.6, delay: index * 0.05 }}
                onAnimationComplete={() => {
                  if (!hasAnimated) animationsPlayedRef.current.add(index);
                }}
                className="min-h-screen flex items-center justify-center px-4 py-20"
              >
                <div className="max-w-3xl mx-auto w-full space-y-8">
                  {imageUrl && (
                    <motion.div className="lg:hidden relative aspect-square rounded-[28px] border border-white/15 bg-black/30 p-3">
                      <div className="relative h-full w-full rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center p-2">
                        <img src={imageUrl} alt={paragraph.imagePrompt || `Scene ${index + 1}`} className="w-full h-full object-contain" />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="episode-badge text-xs">EPISODE {Math.floor(index / 3) + 1}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {paragraph.paragraph && (
                    <motion.div className="bg-black/40 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-xl">
                      <p className="text-lg md:text-xl leading-relaxed text-white/90 whitespace-pre-wrap">
                        {paragraph.paragraph}
                      </p>
                    </motion.div>
                  )}

                  {paragraph.quiz && (
                    <motion.div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
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

          <footer className="min-h-screen flex items-center justify-center px-4 py-20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">Story Complete! 🎉</h2>
              <p className="text-white/60 text-lg">
                You've completed all {storyData.story.length} episodes. Ready to learn something new?
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToHome}
                className="netflix-button"
              >
                Create New Story
              </motion.button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
