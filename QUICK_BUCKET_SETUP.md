# Hızlı Storage Bucket Kurulumu

"Bucket not found" hatasını çözmek için `avatars` bucket'ını oluştur.

## Adım 1: Supabase Dashboard'a Git

1. [Supabase Dashboard](https://app.supabase.com/) → Projeni seç
2. Sol menüden **"Storage"** seç

## Adım 2: Bucket Oluştur

1. **"New bucket"** butonuna tıkla
2. Şu bilgileri gir:
   - **Name**: `avatars` (tam olarak bu isim, küçük harf)
   - **Public bucket**: ✅ **MUTLAKA İŞARETLE** (profil resimlerinin görünmesi için)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp` (opsiyonel)
3. **"Create bucket"** butonuna tıkla

## Adım 3: Storage Policies Ekle (ÖNEMLİ!)

Bucket oluşturulduktan sonra **4 adet policy eklemen gerekiyor**:

1. **"avatars"** bucket'ına tıkla
2. **"Policies"** sekmesine git
3. Aşağıdaki **4 policy'yi sırayla ekle**:

### ✅ Policy 1: Upload (INSERT) - ZORUNLU

- **Policy name**: `Users can upload avatars`
- **Allowed operation**: `INSERT`
- **Policy definition**:

```sql
bucket_id = 'avatars'::text AND auth.role() = 'authenticated'
```

**Ne işe yarar**: Kullanıcıların profil fotoğrafı yüklemesine izin verir.

---

### ✅ Policy 2: Select (Public Read) - ZORUNLU

- **Policy name**: `Anyone can view avatars`
- **Allowed operation**: `SELECT`
- **Policy definition**:

```sql
bucket_id = 'avatars'::text
```

**Ne işe yarar**: Profil fotoğraflarının herkese açık görünmesini sağlar.

---

### ✅ Policy 3: Update - ZORUNLU

- **Policy name**: `Users can update avatars`
- **Allowed operation**: `UPDATE`
- **Policy definition**:

```sql
bucket_id = 'avatars'::text AND auth.role() = 'authenticated'
```

**Ne işe yarar**: Kullanıcıların profil fotoğraflarını güncellemesine (değiştirmesine) izin verir. **Bu olmadan fotoğraf değiştirme çalışmaz!**

---

### ✅ Policy 4: Delete - ZORUNLU

- **Policy name**: `Users can delete avatars`
- **Allowed operation**: `DELETE`
- **Policy definition**:

```sql
bucket_id = 'avatars'::text AND auth.role() = 'authenticated'
```

**Ne işe yarar**: Kullanıcıların eski profil fotoğraflarını silmesine izin verir. **Bu olmadan eski fotoğraflar silinmez ve storage dolabilir!**

---

**⚠️ ÖNEMLİ**: Bu 4 policy'nin **hepsini** eklemen gerekiyor. Sadece INSERT yeterli değil!

## Adım 4: Test Et

1. Tarayıcıda sayfayı yenile
2. Settings sayfasına git
3. Profil fotoğrafı yüklemeyi dene

## ⚠️ Önemli Notlar

- Bucket adı **tam olarak** `avatars` olmalı (küçük harf, çoğul)
- Bucket **mutlaka public** olmalı
- **4 policy'nin hepsi eklenmeli**: INSERT, SELECT, UPDATE, DELETE
- Sadece INSERT yeterli değil! UPDATE ve DELETE olmadan fotoğraf değiştirme ve silme çalışmaz

## 🔧 Hala Çalışmıyorsa

1. Bucket adını kontrol et: `avatars` (tam olarak)
2. Public bucket olduğundan emin ol
3. Policies'in eklendiğinden emin ol
4. Browser console'da hata mesajlarını kontrol et
5. Supabase Dashboard → Storage → avatars → Files sekmesinde dosyaların göründüğünü kontrol et

---

**Bucket oluşturulduktan sonra profil fotoğrafı yükleme çalışacak!**

