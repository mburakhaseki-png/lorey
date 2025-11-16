# Vercel Deployment Rehberi

Bu rehber, Lorey projesini Vercel'e deploy etmek için gereken adımları anlatır.

## 🔴 Hata: "Your project's URL and API key are required"

Bu hata, Vercel'de Supabase environment variables'larının ayarlanmadığı anlamına gelir.

---

## Adım 1: Vercel Dashboard'a Git

1. [Vercel Dashboard](https://vercel.com/dashboard) → Projeni seç
2. **"Settings"** → **"Environment Variables"** seç

## Adım 2: Environment Variables Ekle

Aşağıdaki environment variables'ları ekle:

### 1. Supabase Variables

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

**ÖNEMLİ**: 
- `xxxxx` yerine kendi Supabase proje URL'ini yaz
- Tüm environment'lar için ekle (Production, Preview, Development)

### 2. Backend Variables (Eğer backend'i de deploy ediyorsan)

| Name | Value | Environment |
|------|-------|-------------|
| `OPENROUTER_API_KEY` | `sk-or-v1-xxxxxxxxxxxxx` | Production, Preview, Development |
| `PORT` | `3001` | Production, Preview, Development |

## Adım 3: Environment Variables'ları Kontrol Et

1. Tüm variables'ların eklendiğinden emin ol
2. **"Save"** butonuna tıkla
3. **"Redeploy"** butonuna tıkla (veya yeni bir commit push et)

---

## 🔧 Sorun Giderme

### Hata: "Missing Supabase environment variables"
- Vercel Dashboard'da environment variables'ların eklendiğinden emin ol
- Variable isimlerinin doğru olduğundan emin ol (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Tüm environment'lar için eklendiğinden emin ol

### Hata: "prerender error"
- Sayfalar `'use client'` ile işaretlenmiş olmalı (zaten öyle)
- Middleware environment variables kontrolü yapıyor (düzeltildi)

### Build başarılı ama runtime'da hata
- Environment variables'ların doğru olduğundan emin ol
- Vercel'de **"Redeploy"** yap

---

## 📝 Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` eklendi
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` eklendi
- [ ] Tüm environment'lar için eklendi (Production, Preview, Development)
- [ ] Variables kaydedildi
- [ ] Redeploy yapıldı

---

## 🚀 Sonraki Adımlar

1. Environment variables'ları ekle
2. Redeploy yap
3. Build'in başarılı olduğunu kontrol et
4. Production URL'ini test et

---

**Environment variables eklendikten sonra build başarılı olacak!**

