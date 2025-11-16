# Vercel API Klasör Yapısı - Son Kontrol

405 hatası için Vercel API yapısını kontrol et.

---

## 🔴 Sorun

Vercel'de `api/` klasöründeki dosyalar serverless function olarak çalışmalı ama 405 hatası alıyorsun.

---

## ✅ Vercel API Yapısı

Vercel'de `api/` klasöründeki her dosya bir endpoint olarak çalışır:

```
server/
├── api/
│   ├── extract/
│   │   ├── file.js      → /api/extract/file
│   │   ├── url.js       → /api/extract/url
│   │   └── youtube.js   → /api/extract/youtube
│   ├── generate/
│   │   ├── story.js      → /api/generate/story
│   │   ├── image.js      → /api/generate/image
│   │   └── quiz.js       → /api/generate/quiz
│   └── health.js         → /api/health
```

**ÖNEMLİ**: Root Directory = `server` olduğu için:
- `server/api/extract/file.js` → `https://your-backend.vercel.app/api/extract/file`

---

## 📋 Kontrol Listesi

### 1. Backend Projesi Ayarları

Vercel Dashboard → Backend Projesi → Settings → General:

- [ ] **Root Directory**: `server` ✅
- [ ] **Framework Preset**: `Other` ✅
- [ ] **Build Command**: Boş ✅
- [ ] **Output Directory**: Boş ✅
- [ ] **Install Command**: `npm install` ✅

### 2. Dosya Yapısı

- [ ] `server/api/extract/file.js` var mı?
- [ ] `server/api/extract/url.js` var mı?
- [ ] `server/api/extract/youtube.js` var mı?
- [ ] `server/api/generate/story.js` var mı?
- [ ] `server/api/generate/image.js` var mı?
- [ ] `server/api/generate/quiz.js` var mı?
- [ ] `server/api/health.js` var mı?

### 3. Her Dosya Doğru Format'ta mı?

Her dosya şu formatta olmalı:

```javascript
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Handler code
};
```

---

## 🔧 Sorun Devam Ederse

### Backend Loglarını Kontrol Et

1. Vercel Dashboard → Backend Projesi → **Deployments**
2. Son deployment → **"View Function Logs"**
3. Hata mesajlarını kontrol et

### Health Check Yap

```
https://lorey-backend-api.vercel.app/api/health
```

Beklenen yanıt:
```json
{
  "status": "ok",
  "message": "Lorey API is running"
}
```

Eğer health check çalışıyorsa ama diğer endpoint'ler çalışmıyorsa, sorun spesifik endpoint'lerde olabilir.

---

## 🚀 Sonuç

Tüm dosyalar oluşturuldu ve push edildi. Backend'i redeploy et ve test et!

---

**ÖNEMLİ**: Backend'i mutlaka redeploy et - yeni `api/` klasörü için!

