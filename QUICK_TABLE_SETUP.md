# Hızlı user_profiles Tablosu Kurulumu

"Could not find the table 'public.user_profiles'" hatasını çözmek için tabloyu oluştur.

## 🚀 Hızlı Yöntem: SQL Editor ile

### Adım 1: Supabase Dashboard'a Git

1. [Supabase Dashboard](https://app.supabase.com/) → Projeni seç
2. Sol menüden **"SQL Editor"** seç
3. **"New query"** butonuna tıkla

### Adım 2: SQL Script'ini Çalıştır

Aşağıdaki SQL script'ini kopyala ve SQL Editor'e yapıştır:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS Policies
-- Policy 1: Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own profile
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
CREATE POLICY "Users can delete their own profile"
    ON public.user_profiles
    FOR DELETE
    USING (auth.uid() = user_id);
```

4. **"Run"** butonuna tıkla (veya Ctrl+Enter)

### Adım 3: Kontrol Et

1. Sol menüden **"Table Editor"** seç
2. **"user_profiles"** tablosunun göründüğünü kontrol et
3. Tabloya tıkla ve kolonların doğru olduğunu kontrol et:
   - ✅ id (uuid, primary key)
   - ✅ user_id (uuid, unique, foreign key)
   - ✅ nickname (text, unique, nullable)
   - ✅ avatar_url (text, nullable)
   - ✅ created_at (timestamptz)
   - ✅ updated_at (timestamptz)

### Adım 4: Policies Kontrol Et

1. **"user_profiles"** tablosunda **"Policies"** sekmesine git
2. 4 policy'nin olduğunu kontrol et:
   - ✅ Users can view their own profile (SELECT)
   - ✅ Users can insert their own profile (INSERT)
   - ✅ Users can update their own profile (UPDATE)
   - ✅ Users can delete their own profile (DELETE)

## ✅ Tamamlandı!

Artık `user_profiles` tablosu hazır. Şimdi:

1. Tarayıcıda sayfayı yenile
2. Settings sayfasına git
3. Profil fotoğrafı ve nickname özelliklerini test et

## 🔧 Sorun Giderme

### Hata: "relation already exists"
- Tablo zaten var, bu normal. Script `CREATE TABLE IF NOT EXISTS` kullandığı için sorun olmaz.

### Hata: "permission denied"
- SQL Editor'de doğru projeyi seçtiğinden emin ol
- Admin yetkilerin olduğundan emin ol

### Hata: "foreign key constraint"
- `auth.users` tablosunun var olduğundan emin ol (Supabase otomatik oluşturur)
- Eğer hata devam ederse, foreign key constraint'i kaldırıp tekrar ekle

### Tablo görünmüyor
- Sayfayı yenile (F5)
- Table Editor'de "Refresh" butonuna tıkla
- SQL Editor'de şunu çalıştır:
```sql
SELECT * FROM public.user_profiles LIMIT 1;
```

---

**Tablo oluşturulduktan sonra profil özellikleri çalışacak!**

