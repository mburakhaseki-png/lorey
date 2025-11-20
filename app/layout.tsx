import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lorey - Turn Lessons Into Stories',
  description: 'Transform any boring lesson into an interactive, fun, and story-based learning experience inside your favorite fictional universe.',
  keywords: ['education', 'learning', 'AI', 'storytelling', 'edutainment'],
  authors: [{ name: 'Lorey Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
        {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
