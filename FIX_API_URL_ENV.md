# 🔧 API URL Environment Variable Düzeltmesi

## 🔴 Sorun

Frontend'den yapılan istek URL'si yanlış:
```
POST https://lorey.vercel.app/lorey-backend-api.vercel.app/api/extract/file
```

İki domain birleşmiş! Doğru URL şöyle olmalı:
```
POST https://lorey-backend-api.vercel.app/api/extract/file
```

---

## ✅ Çözüm

### 1. Vercel Dashboard'a Git

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Frontend Projesi** (lorey)
2. **Settings** → **Environment Variables**

### 2. `NEXT_PUBLIC_API_URL` Değişkenini Kontrol Et

Şu an muhtemelen şöyle bir değer var:
```
❌ YANLIŞ: https://lorey.vercel.app/lorey-backend-api.vercel.app
❌ YANLIŞ: https://lorey.vercel.app/https://lorey-backend-api.vercel.app
❌ YANLIŞ: lorey-backend-api.vercel.app
```

### 3. Doğru Değeri Ayarla

**✅ DOĞRU:**
```
https://lorey-backend-api.vercel.app
```

**ÖNEMLİ:**
- ✅ `https://` ile başlamalı
- ✅ Trailing slash (`/`) OLMAMALI
- ✅ Sadece backend domain'i olmalı (frontend domain'i OLMAMALI)

### 4. Değişkeni Güncelle

1. `NEXT_PUBLIC_API_URL` değişkenini bul
2. **Edit** butonuna tıkla
3. Değeri şu şekilde güncelle:
   ```
   https://lorey-backend-api.vercel.app
   ```
4. **Save** butonuna tıkla

### 5. Redeploy Et

1. **Deployments** sekmesine git
2. Son deployment → **"..."** → **"Redeploy"**
3. Veya otomatik deploy olacak (birkaç dakika sürebilir)

---

## 🧪 Test Et

Redeploy sonrası:

1. Frontend'i aç: `https://lorey.vercel.app`
2. Browser Console'u aç (F12)
3. Network sekmesini aç
4. Bir dosya yükle veya URL gir
5. İstek URL'sini kontrol et:

**✅ DOĞRU:**
```
POST https://lorey-backend-api.vercel.app/api/extract/file
```

**❌ YANLIŞ:**
```
POST https://lorey.vercel.app/lorey-backend-api.vercel.app/api/extract/file
```

---

## 📋 Kontrol Listesi

- [ ] Vercel Dashboard → Frontend Projesi → Settings → Environment Variables
- [ ] `NEXT_PUBLIC_API_URL` değişkenini bul
- [ ] Değeri `https://lorey-backend-api.vercel.app` olarak ayarla
- [ ] Trailing slash (`/`) olmadığından emin ol
- [ ] Frontend domain'i (`lorey.vercel.app`) olmadığından emin ol
- [ ] Save butonuna tıkla
- [ ] Frontend'i redeploy et
- [ ] Browser Console'da Network sekmesini kontrol et
- [ ] İstek URL'sinin doğru olduğunu doğrula

---

## 🔍 Kodda Nasıl Kullanılıyor?

Frontend kodunda (`app/page.tsx`):

```typescript
let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
apiUrl = apiUrl.replace(/\/+$/, ''); // Remove trailing slashes
apiUrl = apiUrl.replace(/\/+/g, '/'); // Replace multiple slashes with single slash

const extractResponse = await axios.post(`${apiUrl}/api/extract/file`, formData);
```

Yani:
- `NEXT_PUBLIC_API_URL` = `https://lorey-backend-api.vercel.app`
- `${apiUrl}/api/extract/file` = `https://lorey-backend-api.vercel.app/api/extract/file` ✅

---

## ⚠️ Önemli Notlar

1. **Environment Variable'lar build time'da inject edilir**
   - Değişiklik yaptıktan sonra mutlaka redeploy et!

2. **Production ve Preview için ayrı ayrı ayarlanabilir**
   - Production için: `https://lorey-backend-api.vercel.app`
   - Preview için: `https://lorey-backend-api.vercel.app` (aynı)
   - Development için: `http://localhost:3001` (local)

3. **Backend URL'i doğru mu kontrol et**
   - Backend projesinin URL'ini Vercel Dashboard'da kontrol et
   - Muhtemelen: `https://lorey-backend-api.vercel.app`

---

## 🚀 Sonuç

Environment variable'ı düzelttikten ve redeploy ettikten sonra, frontend doğru backend URL'ine istek yapacak ve 405 hatası çözülecek!

