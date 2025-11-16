'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import Header from '@/components/Header';
import Loader from '@/components/Loader';

interface Story {
  id: string;
  title: string;
  universe: string;
  created_at: string;
}

export default function MyStoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      fetchStories();
    }
  }, [user, authLoading, router]);

  const fetchStories = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('stories')
        .select('id, title, universe, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setStories(data || []);
    } catch (err: any) {
      console.error('Error fetching stories:', err);
      setError(err.message || 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (storyId: string) => {
    router.push(`/story/${storyId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Loading your stories..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-2">My Stories</h1>
            <p className="text-white/60 text-lg">All your created stories</p>
          </motion.div>

          {error && (
            <div className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {stories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="cinematic-card p-12 text-center"
            >
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-semibold mb-2">No stories yet</h2>
              <p className="text-white/60 mb-6">
                Create your first story to see it here!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="netflix-button"
              >
                Create Story
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleStoryClick(story.id)}
                  className="cinematic-card p-6 cursor-pointer hover:border-red-600/50 transition-all group"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-red-600 transition-colors">
                      {story.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span className="px-2 py-1 bg-red-600/20 border border-red-600/40 rounded text-red-400 text-xs">
                        {story.universe}
                      </span>
                      <span>•</span>
                      <span>{formatDate(story.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70 group-hover:text-white transition-colors">
                    <span>View story</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

