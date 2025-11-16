# Supabase Profile Setup Guide

Bu rehber, kullanıcı profil özelliklerini (avatar ve nickname) çalıştırmak için Supabase'de yapılması gerekenleri anlatır.

## 📋 İçindekiler

1. [Database Table Oluşturma](#1-database-table-oluşturma)
2. [Storage Bucket Oluşturma](#2-storage-bucket-oluşturma)
3. [Row Level Security (RLS) Politikaları](#3-row-level-security-rls-politikaları)
4. [Test Etme](#4-test-etme)

---

## 1. Database Table Oluşturma

### 1.1 Supabase Dashboard'da Table Oluştur

1. Supabase Dashboard → Projeni seç
2. Sol menüden **"Table Editor"** → **"New Table"** tıkla
3. Table bilgilerini doldur:
   - **Name**: `user_profiles`
   - **Description**: `User profile information`
   - **Enable Row Level Security**: ✅ İşaretle

### 1.2 Columns Ekle

Aşağıdaki kolonları ekle:

| Column Name | Type | Default Value | Nullable | Unique |
|-------------|------|---------------|----------|--------|
| `id` | `uuid` | `gen_random_uuid()` | ❌ | ✅ |
| `user_id` | `uuid` | - | ❌ | ✅ |
| `nickname` | `text` | - | ✅ | ✅ |
| `avatar_url` | `text` | - | ✅ | ❌ |
| `created_at` | `timestamptz` | `now()` | ❌ | ❌ |
| `updated_at` | `timestamptz` | `now()` | ❌ | ❌ |

**Adım adım:**

1. **id** kolonu:
   - Type: `uuid`
   - Default value: `gen_random_uuid()`
   - Is Primary Key: ✅
   - Is Nullable: ❌

2. **user_id** kolonu:
   - Type: `uuid`
   - Is Nullable: ❌
   - Is Unique: ✅
   - Foreign Key: 
     - Table: `auth.users`
     - Column: `id`
     - On Delete: `CASCADE`

3. **nickname** kolonu:
   - Type: `text`
   - Is Nullable: ✅
   - Is Unique: ✅

4. **avatar_url** kolonu:
   - Type: `text`
   - Is Nullable: ✅

5. **created_at** kolonu:
   - Type: `timestamptz`
   - Default value: `now()`
   - Is Nullable: ❌

6. **updated_at** kolonu:
   - Type: `timestamptz`
   - Default value: `now()`
   - Is Nullable: ❌

### 1.3 Updated_at Trigger Oluştur

`updated_at` kolonunun otomatik güncellenmesi için trigger oluştur:

1. Sol menüden **"SQL Editor"** seç
2. Yeni bir query oluştur ve şunu yapıştır:

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles table
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

3. **"Run"** butonuna tıkla

---

## 2. Storage Bucket Oluşturma

### 2.1 Storage Bucket Oluştur

1. Sol menüden **"Storage"** seç
2. **"New bucket"** butonuna tıkla
3. Bucket bilgilerini doldur:
   - **Name**: `avatars`
   - **Public bucket**: ✅ İşaretle (profil resimlerinin herkese açık olması için)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp`
4. **"Create bucket"** butonuna tıkla

### 2.2 Storage Policies Oluştur

1. **"avatars"** bucket'ına tıkla
2. **"Policies"** sekmesine git
3. **"New Policy"** butonuna tıkla

#### Policy 1: Upload Policy

- **Policy name**: `Users can upload their own avatars`
- **Allowed operation**: `INSERT`
- **Policy definition**:

```sql
(bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
```

Bu policy, kullanıcıların sadece kendi klasörlerine (user_id) dosya yüklemelerine izin verir.

#### Policy 2: Update Policy

- **Policy name**: `Users can update their own avatars`
- **Allowed operation**: `UPDATE`
- **Policy definition**:

```sql
(bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
```

#### Policy 3: Delete Policy

- **Policy name**: `Users can delete their own avatars`
- **Allowed operation**: `DELETE`
- **Policy definition**:

```sql
(bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
```

#### Policy 4: Select Policy (Public Read)

- **Policy name**: `Anyone can view avatars`
- **Allowed operation**: `SELECT`
- **Policy definition**:

```sql
bucket_id = 'avatars'::text
```

Bu policy, profil resimlerinin herkese açık olmasını sağlar.

---

## 3. Row Level Security (RLS) Politikaları

### 3.1 user_profiles Table için RLS Politikaları

1. **"Table Editor"** → **"user_profiles"** tablosuna git
2. **"Policies"** sekmesine tıkla
3. **"New Policy"** butonuna tıkla

#### Policy 1: Users can view their own profile

- **Policy name**: `Users can view their own profile`
- **Allowed operation**: `SELECT`
- **Policy definition**:

```sql
auth.uid() = user_id
```

#### Policy 2: Users can insert their own profile

- **Policy name**: `Users can insert their own profile`
- **Allowed operation**: `INSERT`
- **Policy definition**:

```sql
auth.uid() = user_id
```

#### Policy 3: Users can update their own profile

- **Policy name**: `Users can update their own profile`
- **Allowed operation**: `UPDATE`
- **Policy definition**:

```sql
auth.uid() = user_id
```

#### Policy 4: Users can delete their own profile

- **Policy name**: `Users can delete their own profile`
- **Allowed operation**: `DELETE`
- **Policy definition**:

```sql
auth.uid() = user_id
```

---

## 4. Test Etme

### 4.1 Frontend'i Test Et

1. Development server'ı başlat:
   ```bash
   npm run dev
   ```

2. Tarayıcıda `http://localhost:3000` adresine git

3. Giriş yap

4. Sağ üstteki profil avatar'ına tıkla

5. **"Settings"** butonuna tıkla

6. Şunları test et:
   - ✅ Profil fotoğrafı yükleme
   - ✅ Nickname oluşturma
   - ✅ Aynı nickname'i kullanan başka bir kullanıcı varsa hata mesajı gösterilmesi
   - ✅ Avatar'ın header'da görünmesi

### 4.2 Database'i Kontrol Et

1. Supabase Dashboard → **"Table Editor"** → **"user_profiles"**
2. Kullanıcı profilinin oluşturulduğunu kontrol et
3. `nickname` ve `avatar_url` değerlerinin doğru olduğunu kontrol et

### 4.3 Storage'ı Kontrol Et

1. Supabase Dashboard → **"Storage"** → **"avatars"**
2. Yüklenen profil resimlerini kontrol et
3. Dosya yollarının `avatars/{user_id}-{timestamp}.{ext}` formatında olduğunu kontrol et

---

## 🔧 Sorun Giderme

### Hata: "relation 'user_profiles' does not exist"
- Table'ın oluşturulduğundan emin ol
- Table adının doğru yazıldığından emin ol (`user_profiles`)

### Hata: "new row violates row-level security policy"
- RLS politikalarının doğru oluşturulduğundan emin ol
- Kullanıcının giriş yaptığından emin ol

### Hata: "duplicate key value violates unique constraint"
- Nickname'in zaten kullanıldığını kontrol et
- Farklı bir nickname dene

### Avatar yüklenmiyor
- Storage bucket'ının oluşturulduğundan emin ol
- Storage policies'in doğru olduğundan emin ol
- Bucket'ın public olduğundan emin ol

### Avatar görünmüyor
- Avatar URL'inin doğru olduğundan emin ol
- Browser console'da hata mesajlarını kontrol et
- Storage bucket'ının public olduğundan emin ol

---

## 📝 Özet Checklist

- [ ] `user_profiles` table oluşturuldu
- [ ] Tüm kolonlar eklendi (id, user_id, nickname, avatar_url, created_at, updated_at)
- [ ] Foreign key constraint eklendi (user_id → auth.users.id)
- [ ] Unique constraint eklendi (nickname)
- [ ] Updated_at trigger oluşturuldu
- [ ] `avatars` storage bucket oluşturuldu
- [ ] Storage policies eklendi (INSERT, UPDATE, DELETE, SELECT)
- [ ] RLS policies eklendi (SELECT, INSERT, UPDATE, DELETE)
- [ ] Test edildi

---

## 🚀 Ek Notlar

### Nickname Validasyonu

- Minimum 3 karakter
- Maksimum 20 karakter
- Unique olmalı (aynı nickname'i başka bir kullanıcı kullanamaz)

### Avatar Validasyonu

- Desteklenen formatlar: JPG, PNG, GIF, WebP
- Maksimum dosya boyutu: 5MB
- Otomatik olarak `avatars/{user_id}-{timestamp}.{ext}` formatında saklanır

### Güvenlik

- Kullanıcılar sadece kendi profillerini görüntüleyebilir ve düzenleyebilir
- Storage'da kullanıcılar sadece kendi klasörlerine dosya yükleyebilir
- Avatar'lar public olarak erişilebilir (profil resimleri için normal)

---

**Sorun yaşarsan, yukarıdaki adımları tek tek kontrol et ve her adımın tamamlandığından emin ol!**

