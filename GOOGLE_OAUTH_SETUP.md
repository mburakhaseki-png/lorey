# Google OAuth Kurulum Rehberi

Bu rehber, Supabase'de Google ile giriş özelliğini aktif etmek için gereken adımları anlatır.

## 🔴 Hata: "Unsupported provider: provider is not enabled"

Bu hata, Supabase Dashboard'da Google provider'ının aktif edilmediği veya Google Cloud Console'da OAuth credentials'larının oluşturulmadığı anlamına gelir.

---

## Adım 1: Google Cloud Console'da Proje Oluştur

1. [Google Cloud Console](https://console.cloud.google.com/) adresine git
2. Üst kısımdan bir proje seç veya **"Select a project"** → **"New Project"** ile yeni proje oluştur
3. Proje adını gir (örn: "Lorey App") ve **"Create"** butonuna tıkla

---

## Adım 2: OAuth Consent Screen Yapılandır

1. Sol menüden **"APIs & Services"** → **"OAuth consent screen"** seç
2. **User Type** seç:
   - **External** (genel kullanıcılar için) - Önerilen
   - **Internal** (sadece Google Workspace kullanıcıları için)
3. **"Create"** butonuna tıkla
4. **App information** doldur:
   - **App name**: `Lorey` (veya istediğin isim)
   - **User support email**: Kendi email'ini seç
   - **App logo**: (Opsiyonel) Logo yükle
   - **App domain**: (Şimdilik boş bırakabilirsin)
   - **Developer contact information**: Email adresin
5. **"Save and Continue"** butonuna tıkla
6. **Scopes** sayfasında:
   - **"Add or Remove Scopes"** butonuna tıkla
   - Varsayılan scope'ları kabul et (email, profile, openid)
   - **"Update"** → **"Save and Continue"**
7. **Test users** sayfasında (External seçtiysen):
   - Test için kendi email'ini ekle (opsiyonel)
   - **"Save and Continue"**
8. **Summary** sayfasında bilgileri kontrol et ve **"Back to Dashboard"** tıkla

---

## Adım 3: OAuth 2.0 Credentials Oluştur

1. Sol menüden **"APIs & Services"** → **"Credentials"** seç
2. Üst kısımdan **"+ CREATE CREDENTIALS"** → **"OAuth client ID"** seç
3. **Application type**: **"Web application"** seç
4. **Name**: `Lorey Web Client` (veya istediğin isim)
5. **Authorized JavaScript origins** altına ekle:
   ```
   http://localhost:3000
   https://xxxxx.supabase.co
   ```
   (xxxxx yerine kendi Supabase proje URL'ini yaz)
6. **Authorized redirect URIs** altına ekle:
   ```
   https://xxxxx.supabase.co/auth/v1/callback
   ```
   (xxxxx yerine kendi Supabase proje URL'ini yaz)
   
   **ÖNEMLİ**: Bu URL'i tam olarak yazmalısın! Örnek:
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```
7. **"Create"** butonuna tıkla
8. Bir popup açılacak:
   - **Client ID**'yi kopyala (uzun bir string, örn: `123456789-abc...`)
   - **Client Secret**'i kopyala (daha kısa bir string, örn: `GOCSPX-abc...`)
   - **"OK"** butonuna tıkla

**⚠️ UYARI**: Client Secret'i sadece bir kez gösterilir! Kopyaladığından emin ol.

---

## Adım 4: Supabase Dashboard'da Google Provider'ı Aktif Et

1. [Supabase Dashboard](https://app.supabase.com/) → Projeni seç
2. Sol menüden **"Authentication"** → **"Providers"** seç
3. **"Google"** provider'ını bul
4. **"Enable Google provider"** toggle'ını **AÇ** (sağa kaydır)
5. Şu alanları doldur:
   - **Client ID (for OAuth)**: Google Cloud Console'dan kopyaladığın Client ID'yi yapıştır
   - **Client Secret (for OAuth)**: Google Cloud Console'dan kopyaladığın Client Secret'i yapıştır
6. **"Save"** butonuna tıkla

---

## Adım 5: Redirect URL'leri Kontrol Et

1. Supabase Dashboard'da **"Authentication"** → **"URL Configuration"** seç
2. **"Redirect URLs"** bölümünde şunların olduğundan emin ol:
   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   ```
   (Production için de domain'ini ekle)
3. **"Save"** butonuna tıkla

---

## Adım 6: Test Et

1. Uygulamanda **"Google ile Giriş"** butonuna tıkla
2. Google hesabını seç
3. İzinleri onayla
4. Başarılı bir şekilde giriş yapmalısın!

---

## 🔧 Sorun Giderme

### Hata: "redirect_uri_mismatch"
- Google Cloud Console'da **Authorized redirect URIs**'de şu URL'in olduğundan emin ol:
  ```
  https://xxxxx.supabase.co/auth/v1/callback
  ```
- Supabase proje URL'ini doğru yazdığından emin ol

### Hata: "access_denied"
- OAuth Consent Screen'de test kullanıcısı eklediysen, sadece o email ile giriş yapabilirsin
- Production için OAuth Consent Screen'i **"Publish"** etmen gerekir

### Hata: "invalid_client"
- Client ID ve Client Secret'i doğru kopyaladığından emin ol
- Supabase Dashboard'da boşluk veya fazladan karakter olmadığından emin ol

### Provider hala aktif değil
- Supabase Dashboard'da **"Save"** butonuna tıkladığından emin ol
- Sayfayı yenile ve tekrar kontrol et
- Browser cache'ini temizle

---

## 📝 Özet Checklist

- [ ] Google Cloud Console'da proje oluşturuldu
- [ ] OAuth Consent Screen yapılandırıldı
- [ ] OAuth 2.0 Client ID oluşturuldu
- [ ] Authorized redirect URI eklendi: `https://xxxxx.supabase.co/auth/v1/callback`
- [ ] Client ID ve Client Secret kopyalandı
- [ ] Supabase Dashboard'da Google provider aktif edildi
- [ ] Client ID ve Client Secret Supabase'e eklendi
- [ ] Redirect URL'ler kontrol edildi
- [ ] Test edildi

---

## 🚀 Production İçin Notlar

1. **OAuth Consent Screen'i Publish Et**:
   - Google Cloud Console → OAuth Consent Screen → **"PUBLISH APP"**
   - Bu işlem birkaç gün sürebilir (Google review)

2. **Production Domain Ekle**:
   - Google Cloud Console → Credentials → OAuth Client → **Authorized JavaScript origins** ve **Authorized redirect URIs**'e production domain'ini ekle
   - Supabase Dashboard → URL Configuration → **Redirect URLs**'e production domain'ini ekle

3. **Environment Variables**:
   - Production'da `.env.local` yerine hosting platform'unun environment variables kullan (Vercel, Netlify, vb.)

---

**Sorun yaşarsan, yukarıdaki adımları tek tek kontrol et ve her adımın tamamlandığından emin ol!**

