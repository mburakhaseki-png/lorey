# Supabase Stories Setup Guide

Bu rehber, kullanıcıların oluşturduğu hikayeleri kaydetmek ve görüntülemek için Supabase'de yapılması gerekenleri anlatır.

## 📋 İçindekiler

1. [Database Table Oluşturma](#1-database-table-oluşturma)
2. [Row Level Security (RLS) Politikaları](#2-row-level-security-rls-politikaları)
3. [Test Etme](#3-test-etme)

---

## 1. Database Table Oluşturma

### Hızlı Yöntem: SQL Editor ile

1. Supabase Dashboard → **"SQL Editor"** → **"New query"**
2. Aşağıdaki SQL script'ini yapıştır ve çalıştır:

```sql
-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    universe TEXT NOT NULL,
    story_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_stories_updated_at ON public.stories;
CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON public.stories
    FOR EACH ROW
    EXECUTE FUNCTION update_stories_updated_at();
```

### Tablo Yapısı Açıklaması

| Column | Type | Açıklama |
|--------|------|----------|
| `id` | UUID | Primary key, otomatik oluşturulur |
| `user_id` | UUID | Hikayeyi oluşturan kullanıcı (foreign key) |
| `title` | TEXT | Hikaye başlığı |
| `universe` | TEXT | Hikaye evreni (örn: "Rick and Morty") |
| `story_data` | JSONB | Tüm hikaye verisi (title, learningOutcomes, story array) |
| `created_at` | TIMESTAMPTZ | Oluşturulma tarihi |
| `updated_at` | TIMESTAMPTZ | Güncellenme tarihi |

**JSONB kullanma nedeni**: Hikaye verisi karmaşık bir yapı (paragraphs, quizzes, images). JSONB formatında saklamak daha esnek ve performanslı.

---

## 2. Row Level Security (RLS) Politikaları

### Policy 1: Users can view their own stories

```sql
DROP POLICY IF EXISTS "Users can view their own stories" ON public.stories;
CREATE POLICY "Users can view their own stories"
    ON public.stories
    FOR SELECT
    USING (auth.uid() = user_id);
```

**Ne işe yarar**: Kullanıcılar sadece kendi hikayelerini görebilir.

### Policy 2: Users can insert their own stories

```sql
DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
CREATE POLICY "Users can insert their own stories"
    ON public.stories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

**Ne işe yarar**: Kullanıcılar kendi hikayelerini kaydedebilir.

### Policy 3: Users can update their own stories

```sql
DROP POLICY IF EXISTS "Users can update their own stories" ON public.stories;
CREATE POLICY "Users can update their own stories"
    ON public.stories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

**Ne işe yarar**: Kullanıcılar kendi hikayelerini güncelleyebilir (örneğin resimler yüklendikten sonra).

### Policy 4: Users can delete their own stories

```sql
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories"
    ON public.stories
    FOR DELETE
    USING (auth.uid() = user_id);
```

**Ne işe yarar**: Kullanıcılar kendi hikayelerini silebilir.

---

## 3. Tüm SQL Script'i (Tek Seferde)

Tüm tablo ve policy'leri tek seferde oluşturmak için:

```sql
-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    universe TEXT NOT NULL,
    story_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_stories_updated_at ON public.stories;
CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON public.stories
    FOR EACH ROW
    EXECUTE FUNCTION update_stories_updated_at();

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own stories" ON public.stories;
CREATE POLICY "Users can view their own stories"
    ON public.stories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
CREATE POLICY "Users can insert their own stories"
    ON public.stories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stories" ON public.stories;
CREATE POLICY "Users can update their own stories"
    ON public.stories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories"
    ON public.stories FOR DELETE
    USING (auth.uid() = user_id);
```

---

## 4. Test Etme

### 4.1 Tablo Kontrolü

1. Supabase Dashboard → **"Table Editor"** → **"stories"** tablosunu kontrol et
2. Kolonların doğru olduğundan emin ol

### 4.2 Policies Kontrolü

1. **"stories"** tablosunda **"Policies"** sekmesine git
2. 4 policy'nin olduğunu kontrol et

### 4.3 Frontend Testi

1. Giriş yap
2. Hikaye oluştur → Otomatik kaydedilmeli
3. Header'dan **"My Stories"** butonuna tıkla → Hikayeler listelenmeli
4. Bir hikayeye tıkla → Detay sayfası açılmalı

---

## 📝 Özet Checklist

- [ ] `stories` table oluşturuldu
- [ ] Tüm kolonlar eklendi (id, user_id, title, universe, story_data, created_at, updated_at)
- [ ] Indexes oluşturuldu (user_id, created_at)
- [ ] Foreign key constraint eklendi (user_id → auth.users.id)
- [ ] Updated_at trigger oluşturuldu
- [ ] RLS aktif edildi
- [ ] 4 RLS policy eklendi (SELECT, INSERT, UPDATE, DELETE)
- [ ] Test edildi

---

## 🔧 Sorun Giderme

### Hata: "relation 'stories' does not exist"
- SQL script'ini tekrar çalıştır
- Table Editor'de tablonun oluşturulduğunu kontrol et

### Hata: "permission denied"
- RLS policies'in doğru oluşturulduğundan emin ol
- Kullanıcının giriş yaptığından emin ol

### Hikayeler görünmüyor
- Browser console'da hata mesajlarını kontrol et
- Supabase Dashboard → Table Editor → stories → Verilerin olduğunu kontrol et
- RLS policies'in doğru olduğundan emin ol

---

**Tablo oluşturulduktan sonra hikaye kaydetme ve görüntüleme özellikleri çalışacak!**

