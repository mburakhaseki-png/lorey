'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';
import { getUserSubscription, UserSubscription } from '@/utils/subscription';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch subscription data
  useEffect(() => {
    if (user) {
      getUserSubscription(user.id).then(setSubscription);
    } else {
      setSubscription(null);
    }
  }, [user]);

  const handleGetStarted = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  return (
    <>
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all ${
          scrolled ? 'bg-black/95 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="group">
            <motion.h1
              whileHover={{ scale: 1.05 }}
              className="text-3xl font-bold"
            >
              <span className="text-gradient-red glow-red">LOREY</span>
            </motion.h1>
          </Link>

          <div className="flex items-center gap-4">
              {loading ? (
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              ) : user ? (
                <>
                  {/* Story Limit Indicator */}
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs font-medium text-white/80">
                      {subscription ? `${subscription.stories_remaining} / ${subscription.story_limit}` : '0 / 0'}
                    </span>
                  </div>

                  <Link href="/my-stories">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
                      My Stories
            </motion.button>
                  </Link>
                  <UserMenu />
                </>
              ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
              className="netflix-button text-sm px-6 py-2"
            >
              Get Started
            </motion.button>
              )}
          </div>
        </div>
      </div>
    </motion.header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
