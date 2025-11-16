# Supabase Authentication Kurulum Rehberi

Bu rehber, Lorey projesine Supabase Authentication entegrasyonunu adım adım anlatır. Email/şifre, Gmail ve Apple ile giriş özelliklerini ekleyeceğiz.

## 📋 İçindekiler

1. [Supabase Projesi Kurulumu](#1-supabase-projesi-kurulumu)
2. [Environment Variables](#2-environment-variables)
3. [Paket Kurulumu](#3-paket-kurulumu)
4. [Supabase Client Yapılandırması](#4-supabase-client-yapılandırması)
5. [Authentication Provider Ayarları](#5-authentication-provider-ayarları)
6. [Frontend Bileşenleri](#6-frontend-bileşenleri)
7. [Auth Context/Provider](#7-auth-contextprovider)
8. [API Route'ları](#8-api-routeları)
9. [Header Güncellemesi](#9-header-güncellemesi)
10. [Kullanım](#10-kullanım)

---

## 1. Supabase Projesi Kurulumu

### 1.1 Supabase Dashboard'a Giriş

1. [https://supabase.com](https://supabase.com) adresine git
2. Hesabına giriş yap (veya yeni hesap oluştur)
3. Dashboard'a git

### 1.2 Yeni Proje Oluştur

1. **"New Project"** butonuna tıkla
2. Proje bilgilerini doldur:
   - **Name**: `lorey` (veya istediğin isim)
   - **Database Password**: Güçlü bir şifre oluştur (kaydet!)
   - **Region**: En yakın bölgeyi seç
   - **Pricing Plan**: Free tier yeterli (başlangıç için)
3. **"Create new project"** butonuna tıkla
4. Projenin oluşturulmasını bekle (2-3 dakika)

### 1.3 API Bilgilerini Al

1. Sol menüden **"Settings"** (⚙️) → **"API"** seçeneğine git
2. Şu bilgileri kopyala ve not al:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: (şimdilik gerekli değil, ama sakla)

---

## 2. Environment Variables

### 2.1 `.env.local` Dosyası Oluştur

Proje kök dizininde `.env.local` dosyası oluştur:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mevcut değişkenler (varsa)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
PORT=3001
```

**ÖNEMLİ**: 
- `NEXT_PUBLIC_` prefix'i kullan (client-side erişim için gerekli)
- `.env.local` dosyasını `.gitignore`'a ekle (zaten ekli olmalı)

### 2.2 `.gitignore` Kontrolü

`.gitignore` dosyasında şunların olduğundan emin ol:

```
.env.local
.env*.local
```

---

## 3. Paket Kurulumu

Terminal'de proje kök dizininde şu komutu çalıştır:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Bu paketler:
- `@supabase/supabase-js`: Supabase JavaScript client
- `@supabase/ssr`: Next.js Server-Side Rendering desteği

---

## 4. Supabase Client Yapılandırması

### 4.1 Client Utility Oluştur

`utils/supabase/client.ts` dosyası oluştur:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 4.2 Server Client Utility Oluştur

`utils/supabase/server.ts` dosyası oluştur:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### 4.3 Middleware Oluştur

`middleware.ts` dosyası oluştur (proje kök dizininde):

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 5. Authentication Provider Ayarları

### 5.1 Supabase Dashboard'da Provider Ayarları

Supabase Dashboard'da şu adımları takip et:

#### 5.1.1 Email/Password Provider

1. Sol menüden **"Authentication"** → **"Providers"** seç
2. **"Email"** provider'ı bul
3. **"Enable Email provider"** toggle'ını aç
4. **"Confirm email"** seçeneğini kapat (development için) veya açık bırak (production için)
5. **"Save"** butonuna tıkla

#### 5.1.2 Google Provider

1. **"Providers"** sayfasında **"Google"** provider'ı bul
2. **"Enable Google provider"** toggle'ını aç
3. Google Cloud Console'da OAuth 2.0 credentials oluştur:
   - [Google Cloud Console](https://console.cloud.google.com/) → **"APIs & Services"** → **"Credentials"**
   - **"Create Credentials"** → **"OAuth client ID"**
   - **Application type**: Web application
   - **Authorized redirect URIs**: 
     ```
     https://xxxxx.supabase.co/auth/v1/callback
     ```
   - Client ID ve Client Secret'i kopyala
4. Supabase'e dön ve şunları yapıştır:
   - **Client ID (for OAuth)**: Google'dan aldığın Client ID
   - **Client Secret (for OAuth)**: Google'dan aldığın Client Secret
5. **"Save"** butonuna tıkla

#### 5.1.3 Apple Provider

1. **"Providers"** sayfasında **"Apple"** provider'ı bul
2. **"Enable Apple provider"** toggle'ını aç
3. Apple Developer Console'da Service ID oluştur:
   - [Apple Developer](https://developer.apple.com/) → **"Certificates, Identifiers & Profiles"**
   - **"Identifiers"** → **"Services IDs"** → **"+"**
   - **Description**: Lorey App
   - **Identifier**: `com.lorey.app` (veya benzersiz bir ID)
   - **"Sign in with Apple"** checkbox'ını işaretle
   - **"Configure"** → **"Primary App ID"** seç
   - **Return URLs**: 
     ```
     https://xxxxx.supabase.co/auth/v1/callback
     ```
   - **"Save"** → **"Continue"** → **"Register"**
4. Key oluştur:
   - **"Keys"** → **"+"**
   - **Key Name**: Lorey Sign In Key
   - **"Sign in with Apple"** checkbox'ını işaretle
   - **"Configure"** → Primary App ID seç → **"Save"**
   - **"Continue"** → **"Register"**
   - **Key'i indir** (.p8 dosyası) - sadece bir kez indirilebilir!
5. Supabase'e dön ve şunları doldur:
   - **Services ID**: Oluşturduğun Service ID (örn: `com.lorey.app`)
   - **Secret Key**: İndirdiğin .p8 dosyasının içeriği
   - **Key ID**: Apple Developer'da oluşturduğun Key'in ID'si
   - **Team ID**: Apple Developer hesabının Team ID'si (sağ üst köşede)
6. **"Save"** butonuna tıkla

### 5.2 Redirect URL Ayarları

1. **"Authentication"** → **"URL Configuration"** seç
2. **"Site URL"**: `http://localhost:3000` (development) veya production URL'i
3. **"Redirect URLs"** altına şunları ekle:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```
4. **"Save"** butonuna tıkla

---

## 6. Frontend Bileşenleri

### 6.1 Auth Modal Bileşeni

`components/AuthModal.tsx` dosyası oluştur:

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Kayıt başarılı! Email doğrulama linkini kontrol et.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-black/95 border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">
              {mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
            </h2>
            <p className="text-white/60 text-sm">
              {mode === 'signin'
                ? 'Hesabına giriş yap ve devam et'
                : 'Yeni hesap oluştur ve başla'}
            </p>
          </div>

          {/* Error/Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-600/10 border border-red-600/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-600/10 border border-green-600/30 rounded-lg text-green-400 text-sm">
              {message}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google ile {mode === 'signin' ? 'Giriş' : 'Kayıt'}
            </button>

            <button
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple ile {mode === 'signin' ? 'Giriş' : 'Kayıt'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black/95 text-white/60">veya</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-red-600 focus:outline-none transition-all"
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-red-600 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full netflix-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Yükleniyor...' : mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm">
            <span className="text-white/60">
              {mode === 'signin' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
            </span>
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setMessage('');
              }}
              className="text-red-600 hover:text-red-500 font-medium"
            >
              {mode === 'signin' ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

### 6.2 Auth Callback Route

`app/auth/callback/route.ts` dosyası oluştur:

```typescript
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`)
}
```

---

## 7. Auth Context/Provider

### 7.1 Auth Context Oluştur

`contexts/AuthContext.tsx` dosyası oluştur:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 7.2 Layout'a Provider Ekle

`app/layout.tsx` dosyasını güncelle:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lorey - Turn Lessons Into Stories',
  description: 'Transform any boring lesson into an interactive, fun, and story-based learning experience inside your favorite fictional universe.',
  keywords: ['education', 'learning', 'AI', 'storytelling', 'edutainment'],
  authors: [{ name: 'Lorey Team' }],
  viewport: 'width=device-width, initial-scale=1',
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
      </body>
    </html>
  );
}
```

---

## 8. API Route'ları

### 8.1 User Profile API (Opsiyonel)

`app/api/user/route.ts` dosyası oluştur:

```typescript
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
```

---

## 9. Header Güncellemesi

`components/Header.tsx` dosyasını güncelle:

```typescript
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = () => {
    setAuthMode('signin');
    setAuthModalOpen(true);
  };

  const handleSignUp = () => {
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
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="text-sm text-white/70">
                      {user.email}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={signOut}
                      className="px-5 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                    >
                      Çıkış Yap
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSignIn}
                    className="hidden sm:block px-5 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                  >
                    Giriş Yap
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSignUp}
                    className="netflix-button text-sm px-6 py-2"
                  >
                    Başla
                  </motion.button>
                </>
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
```

---

## 10. Kullanım

### 10.1 Test Etme

1. Development server'ı başlat:
   ```bash
   npm run dev
   ```

2. Tarayıcıda `http://localhost:3000` adresine git

3. Header'daki **"Giriş Yap"** veya **"Başla"** butonuna tıkla

4. Şu yöntemleri test et:
   - **Email/Şifre**: Yeni hesap oluştur veya giriş yap
   - **Google**: Google hesabınla giriş yap
   - **Apple**: Apple ID ile giriş yap

### 10.2 Kullanıcı Bilgilerine Erişim

Herhangi bir component'te:

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Yükleniyor...</div>;
  if (!user) return <div>Giriş yapmamışsın</div>;

  return (
    <div>
      <p>Hoş geldin, {user.email}!</p>
      <button onClick={signOut}>Çıkış Yap</button>
    </div>
  );
}
```

---

## 🔒 Güvenlik Notları

1. **Environment Variables**: `.env.local` dosyasını asla commit etme
2. **API Keys**: `service_role` key'ini sadece server-side kullan
3. **Row Level Security (RLS)**: Supabase'de tablolar oluştururken RLS politikaları ekle
4. **Email Verification**: Production'da email doğrulamayı aç
5. **Rate Limiting**: Supabase'in built-in rate limiting'i kullan

---

## 🐛 Sorun Giderme

### "Invalid API key" hatası
- `.env.local` dosyasının doğru yerde olduğundan emin ol
- `NEXT_PUBLIC_` prefix'ini kontrol et
- Supabase Dashboard'dan key'leri tekrar kopyala

### OAuth redirect hatası
- Supabase Dashboard'da Redirect URL'leri kontrol et
- Google/Apple provider ayarlarında callback URL'leri doğru olduğundan emin ol

### Session kayboluyor
- Middleware'in doğru çalıştığından emin ol
- Cookie ayarlarını kontrol et

---

## 📚 Ek Kaynaklar

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [OAuth Providers](https://supabase.com/docs/guides/auth/social-login)

---

## ✅ Kontrol Listesi

- [ ] Supabase projesi oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] Paketler kuruldu
- [ ] Supabase client utilities oluşturuldu
- [ ] Middleware eklendi
- [ ] Email provider aktif
- [ ] Google provider yapılandırıldı
- [ ] Apple provider yapılandırıldı
- [ ] Redirect URL'ler ayarlandı
- [ ] AuthModal component'i oluşturuldu
- [ ] Auth callback route eklendi
- [ ] AuthContext oluşturuldu
- [ ] Layout'a provider eklendi
- [ ] Header güncellendi
- [ ] Test edildi

---

**Not**: Bu rehberi adım adım takip ederek Supabase Authentication'ı başarıyla entegre edebilirsin. Herhangi bir sorunla karşılaşırsan, Supabase Dashboard'daki Authentication logs'ları kontrol et.

