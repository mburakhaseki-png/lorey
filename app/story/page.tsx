'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Quiz from '@/components/Quiz';
import { FullPageLoader } from '@/components/Loader';
import Header from '@/components/Header';
import type { StoryData, Quiz as QuizType } from '@/utils/types';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const animationsPlayedRef = useRef<Set<number>>(new Set());

  // Find which image should be displayed for a given paragraph index
  // Algorithm: Images are at indices 0, 3, 6, 9, ...
  // Image at index X covers paragraphs X, X+1, X+2, X+3 (4 paragraphs total)
  // So: image 0 covers 0-3, image 3 covers 3-6, image 6 covers 6-9, etc.
  const getImageForParagraph = (paragraphIndex: number): number | null => {
    if (!storyData) return null;
    
    // Calculate which image index should be shown for this paragraph
    // Formula: Math.floor(paragraphIndex / 3) * 3
    // Examples:
    //   paragraphIndex 0, 1, 2 → imageIndex 0
    //   paragraphIndex 3, 4, 5 → imageIndex 3
    //   paragraphIndex 6, 7, 8 → imageIndex 6
    const imageIndex = Math.floor(paragraphIndex / 3) * 3;
    
    // Check if this image exists in the story data
    if (imageIndex < storyData.story.length) {
      const paragraph = storyData.story[imageIndex];
      if (paragraph?.imageUrl || paragraph?.imagePrompt) {
        return imageIndex;
      }
    }
    
    return null;
  };

  // Get the image URL for a paragraph index
  const getImageUrl = (paragraphIndex: number): string | null => {
    const imageIndex = getImageForParagraph(paragraphIndex);
    if (imageIndex === null || !storyData) return null;
    
    const paragraph = storyData.story[imageIndex];
    return paragraph?.imageUrl || null;
  };

  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current || !storyData) return;
    setIsGeneratingPDF(true);
    // PDF generation code remains the same
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.save(`${universe || 'Story'}_Lorey.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadImages = () => {
    if (!storyData) return;

    // Get all images that have been generated
    const imagesWithUrls = storyData.story
      .map((p, idx) => ({ ...p, index: idx }))
      .filter(item => item.imageUrl && item.index % 3 === 0);

    if (imagesWithUrls.length === 0) {
      alert('No images available to download yet. Please wait for image generation to complete.');
      return;
    }

    // Download each image
    imagesWithUrls.forEach((item, i) => {
      const link = document.createElement('a');
      link.href = item.imageUrl!;
      link.download = `${universe || 'Story'}_Image_${item.index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

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
    // Keep track of updated story data as we generate images
    let currentStoryData = { ...initialData };
    currentStoryData.story = [...initialData.story];

    for (let i = 0; i < initialData.story.length; i += 3) {
      const paragraph = initialData.story[i];

      // Skip if no imagePrompt or if imageUrl already exists
      const hasImageUrl = paragraph.imageUrl && paragraph.imageUrl !== '' && paragraph.imageUrl !== null && paragraph.imageUrl !== undefined;
      if (!paragraph.imagePrompt || paragraph.imagePrompt === null || hasImageUrl) {
        console.log(`⏭️ Skipping paragraph ${i} - ${hasImageUrl ? 'image already exists' : 'no imagePrompt'}`);
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
            console.log(`🔄 Retrying image generation for paragraph ${i} (attempt ${retryAttempt}/${maxRetries})...`);
            const waitTime = Math.min(2000 * Math.pow(2, retryAttempt - 2), 4000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          // Get API URL and clean it (remove trailing slashes)
          let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          // Remove trailing slashes only (don't touch protocol slashes)
          apiUrl = apiUrl.trim().replace(/\/+$/, '');
          
          const response = await axios.post(`${apiUrl}/api/generate/image`, {
            prompt: paragraph.imagePrompt,
            universe: universeContext,
          });

          if (response.data?.imageUrl && response.data.imageUrl !== '') {
            const newImageUrl = response.data.imageUrl;
            
            // Update local copy first
            currentStoryData.story[i] = { ...currentStoryData.story[i], imageUrl: newImageUrl };
            
            // Update state using functional update
            setStoryData((prevData) => {
              if (!prevData) return prevData;
              const updatedStory = { ...prevData };
              updatedStory.story = [...updatedStory.story];
              updatedStory.story[i] = { ...updatedStory.story[i], imageUrl: newImageUrl };
              return updatedStory;
            });
            
            // Update in Supabase if story ID exists - use currentStoryData which is always up to date
            const storyId = sessionStorage.getItem('storyId');
            if (storyId && user) {
              // Don't await - let it run in background
              supabase
                .from('stories')
                .update({
                  story_data: currentStoryData,
                })
                .eq('id', storyId)
                .catch((err: any) => {
                  console.error('Error updating story in database:', err);
                });
            }
            
            imageGenerated = true;
            console.log(`✅ Image generated successfully for paragraph ${i}: ${newImageUrl.substring(0, 50)}...`);
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
    setIsGeneratingImages(false);
  }, []);

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
      console.log('📚 Loaded story data:', {
        hasTitle: !!data.title,
        title: data.title,
        hasLearningOutcomes: !!data.learningOutcomes,
        learningOutcomes: data.learningOutcomes,
        totalParagraphs: data.story?.length || 0,
        paragraphsWithImages: data.story?.filter((p: any, idx: number) => idx % 3 === 0 && p.imagePrompt).length || 0
      });
      setStoryData(data);
      setUniverse(storedUniverse);
      setIsLoading(false);

      const needsImageGeneration = data.story.some((p: any, idx: number) =>
        idx % 3 === 0 && p.imagePrompt && p.imagePrompt !== null && !p.imageUrl
      );

      if (needsImageGeneration) {
        console.log('🎨 Some images missing, starting image generation');
        imageGenerationStarted.current = true;
        generateImages(data, storedUniverse);
      } else {
        console.log('✅ All images already generated, skipping');
      }
    } catch (err) {
      console.error('Failed to load story data:', err);
      setError('Failed to load story. Please try again.');
      setIsLoading(false);
    }
  }, [router, generateImages]);

  // Update active image based on scroll position using scroll event listener
  useEffect(() => {
    if (!storyData || !storyContentRef.current) return;

    const updateActiveImage = () => {
      const container = storyContentRef.current;
      if (!container) return;

      const paragraphs = container.querySelectorAll('[data-paragraph-index]');
      if (paragraphs.length === 0) return;

      const viewportHeight = window.innerHeight;
      const viewportCenter = window.scrollY + viewportHeight / 2;

      let closestParagraph: { index: number; distance: number } | null = null;

      paragraphs.forEach((paragraph) => {
        const rect = paragraph.getBoundingClientRect();
        const paragraphCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - paragraphCenter);

        if (!closestParagraph || distance < closestParagraph.distance) {
          const index = parseInt(paragraph.getAttribute('data-paragraph-index') || '0');
          const imageIndex = Math.floor(index / 3) * 3;
          closestParagraph = { index: imageIndex, distance };
        }
      });

      if (closestParagraph) {
        setActiveImageIndex((prev) => {
          if (prev !== closestParagraph!.index) {
            console.log(`🖼️ Active image changed to index ${closestParagraph!.index}`);
            return closestParagraph!.index;
          }
          return prev;
        });
      }
    };

    // Set initial active image
    const timeoutId = setTimeout(() => {
      const paragraphs = storyContentRef.current?.querySelectorAll('[data-paragraph-index]');
      if (paragraphs && paragraphs.length > 0) {
        const firstIndex = parseInt(paragraphs[0].getAttribute('data-paragraph-index') || '0');
        const firstImageIndex = Math.floor(firstIndex / 3) * 3;
        setActiveImageIndex(firstImageIndex);
        console.log(`🖼️ Setting initial active image to index ${firstImageIndex}`);
      }
      updateActiveImage();
    }, 200);

    // Add scroll listener to window
    window.addEventListener('scroll', updateActiveImage, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', updateActiveImage);
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
          <button onClick={handleBackToHome} className="netflix-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!storyData || !storyData.story) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">No story data found</p>
          <button onClick={handleBackToHome} className="netflix-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Get current active image URL - activeImageIndex is already the image index (0, 3, 6, 9...)
  const safeImageIndex = activeImageIndex < storyData.story.length ? activeImageIndex : 0;
  const currentImageUrl = storyData.story[safeImageIndex]?.imageUrl || null;
  const currentImagePrompt = storyData.story[safeImageIndex]?.imagePrompt || null;
  
  // Debug: Log current image status
  useEffect(() => {
    if (storyData && safeImageIndex < storyData.story.length) {
      const paragraph = storyData.story[safeImageIndex];
      console.log(`🖼️ Current image status - Index: ${safeImageIndex}, Has URL: ${!!paragraph?.imageUrl}, URL: ${paragraph?.imageUrl?.substring(0, 50) || 'null'}...`);
    }
  }, [safeImageIndex, storyData]);

  return (
    <>
      <Header />
      
      {/* Image Generation Progress */}
      <AnimatePresence>
        {isGeneratingImages && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-6 bg-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl z-50 shadow-2xl"
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

      {/* Main Layout: 50/50 Split - Sticky Image Left + Scrollable Content Right */}
      <div className="flex min-h-screen pt-20">
        {/* Left: Sticky Full-Height Image (framed) */}
        <div className="hidden lg:block lg:w-1/2 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
          <div className="h-full flex items-center justify-center p-6 xl:p-8">
            {currentImageUrl && currentImageUrl !== '' ? (
              <motion.div
                key={`image-${safeImageIndex}-${currentImageUrl.substring(0, 20)}`}
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
                      alt={currentImagePrompt || `Scene ${Math.floor(safeImageIndex / 3) + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error(`❌ Image failed to load: ${currentImageUrl}`);
                        e.currentTarget.style.display = 'none';
                      }}
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
              <motion.div
                key={`no-image-${safeImageIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative w-full max-w-xl xl:max-w-2xl aspect-square rounded-[32px] border border-white/15 bg-black/30 flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full mx-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-white/50 text-lg font-medium">Image Generating...</p>
                  <p className="text-white/30 text-sm">Episode {Math.floor(safeImageIndex / 3) + 1}</p>
                </div>
              </motion.div>
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
                  {imageUrl && (
                    <motion.div
                      initial={{ opacity: hasAnimated ? 1 : 0 }}
                      animate={{ opacity: 1 }}
                      transition={hasAnimated ? { duration: 0 } : { duration: 0.4, delay: index * 0.05 + 0.1 }}
                      className="lg:hidden relative aspect-square rounded-[28px] border border-white/15 bg-black/30 p-3 shadow-lg"
                    >
                      <div className="relative h-full w-full rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center p-2">
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
                Create New Story
              </motion.button>
            </div>
          </footer>
        </div>
      </div>

      {/* Hidden PDF Content */}
      <div ref={pdfContentRef} className="hidden">
        {storyData.story.map((paragraph: any, index: number) => (
          <div key={index} className="space-y-8 mb-12" style={{ fontFamily: '"Kalam", cursive' }}>
            {paragraph.imagePrompt && paragraph.imagePrompt !== null && paragraph.imageUrl && index % 3 === 0 && (
              <div
                className="bg-white/80 border-2 border-gray-300 p-4 relative"
                style={{
                  aspectRatio: '1/1',
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                  boxShadow: '3px 3px 0px rgba(0,0,0,0.1)',
                  transform: 'rotate(-0.5deg)',
                  overflow: 'hidden'
                }}
              >
                <div
                  className="absolute -top-3 left-1/4 w-24 h-6 bg-white/90 border border-gray-400"
                  style={{
                    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                    transform: 'rotate(-3deg)',
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.1)'
                  }}
                />
                <img
                  src={paragraph.imageUrl}
                  alt={paragraph.imagePrompt}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {paragraph.paragraph && (
              <div
                className="bg-yellow-50/50 border-2 border-gray-300 p-6"
                style={{
                  borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                  boxShadow: '2px 2px 0px rgba(0,0,0,0.1)',
                  transform: 'rotate(0.3deg)'
                }}
              >
                <p
                  className="text-lg leading-relaxed text-gray-900"
                  style={{
                    fontFamily: '"Kalam", cursive',
                    lineHeight: '1.8'
                  }}
                >
                  {paragraph.paragraph}
                </p>
              </div>
            )}

            {paragraph.quiz && (
              <div className="mt-6 space-y-3" style={{ fontFamily: '"Kalam", cursive' }}>
                <p className="text-lg font-bold text-gray-900 mb-4">
                  🎯 {paragraph.quiz.question}
                </p>
                <div className="space-y-2 ml-4">
                  {paragraph.quiz.options.map((option: string, idx: number) => (
                    <p key={idx} className="text-base text-gray-900">
                      {option}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
