# Lorey - Lemon Squeezy Abonelik Sistemi Kurulum Rehberi

Bu rehber, Lorey uygulamasına Lemon Squeezy abonelik sistemini entegre etmek için gerekli adımları içerir.

## 📋 İçindekiler

1. [Supabase Kurulumu](#1-supabase-kurulumu)
2. [Lemon Squeezy Kurulumu](#2-lemon-squeezy-kurulumu)
3. [Environment Variables](#3-environment-variables)
4. [Lemon Squeezy Webhook Kurulumu](#4-lemon-squeezy-webhook-kurulumu)
5. [Test Etme](#5-test-etme)
6. [Production'a Geçiş](#6-productiona-geçiş)

---

## 1. Supabase Kurulumu

### Adım 1.1: SQL Migration'ı Çalıştır

1. Supabase Dashboard'a git: https://vmokajpmvbsowziyffzv.supabase.co
2. Sol menüden **SQL Editor**'ı aç
3. `supabase_migrations/001_add_subscriptions.sql` dosyasının içeriğini kopyala
4. SQL Editor'a yapıştır ve **Run** butonuna tıkla

✅ Bu migration aşağıdakileri oluşturur:
- `subscriptions` tablosu
- Row Level Security (RLS) policy'leri
- Helper fonksiyonlar:
  - `can_user_create_story(user_id)` - Kullanıcı hikaye oluşturabilir mi?
  - `increment_story_usage(user_id)` - Hikaye kullanımını artır
  - `get_user_subscription(user_id)` - Abonelik bilgilerini getir

### Adım 1.2: Service Role Key'i Al

1. Supabase Dashboard > Settings > API
2. **service_role** key'ini kopyala (⚠️ Bu key'i GİZLİ tut!)
3. `.env` dosyasına ekle:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 2. Lemon Squeezy Kurulumu

### Adım 2.1: Lemon Squeezy Hesabı

1. https://lemonsqueezy.com adresine git
2. Hesap oluştur veya giriş yap
3. **Test Mode**'u aktif et (sağ üst köşe)

### Adım 2.2: Store ID'sini Al

1. Dashboard > Settings > Store
2. **Store ID**'yi kopyala
3. `.env` dosyasına ekle:
```bash
LEMONSQUEEZY_STORE_ID=your_store_id_here
```

### Adım 2.3: Ürünleri Oluştur

Her plan için ayrı ürün oluştur:

#### Slacker Plan
1. Dashboard > Products > New Product
2. İsim: **Lorey Slacker**
3. Price: **$15.00/month**
4. Recurring: ✅ Monthly
5. Description: 10 stories per month
6. Save

#### Student Plan
1. Dashboard > Products > New Product
2. İsim: **Lorey Student**
3. Price: **$25.00/month**
4. Recurring: ✅ Monthly
5. Description: 30 stories per month - Best for regular studying
6. Save

#### Nerd Plan
1. Dashboard > Products > New Product
2. İsim: **Lorey Nerd**
3. Price: **$45.00/month**
4. Recurring: ✅ Monthly
5. Description: 50 stories per month - For serious learners
6. Save

### Adım 2.4: Variant ID'lerini Al

Her ürün için:
1. Products > Ürünü seç > Variants
2. **Variant ID**'yi kopyala
3. `.env` dosyasına ekle:

```bash
LEMONSQUEEZY_SLACKER_VARIANT_ID=slacker_variant_id_here
LEMONSQUEEZY_STUDENT_VARIANT_ID=student_variant_id_here
LEMONSQUEEZY_NERD_VARIANT_ID=nerd_variant_id_here
```

---

## 3. Environment Variables

`.env` dosyanı kontrol et - şu değişkenler olmalı:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://vmokajpmvbsowziyffzv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ⚠️ GİZLİ

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=your_test_api_key  # Zaten mevcut
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_SLACKER_VARIANT_ID=slacker_variant_id
LEMONSQUEEZY_STUDENT_VARIANT_ID=student_variant_id
LEMONSQUEEZY_NERD_VARIANT_ID=nerd_variant_id
LEMONSQUEEZY_WEBHOOK_SECRET=  # Opsiyonel (Adım 4'te eklenecek)
```

---

## 4. Lemon Squeezy Webhook Kurulumu

Webhooklar, başarılı ödemeleri otomatik olarak Supabase'e kaydeder.

### Adım 4.1: Webhook URL'i Belirle

**Local Development (ngrok ile test):**
```bash
# ngrok kur
npm install -g ngrok

# ngrok'u başlat
ngrok http 3000

# Output'tan HTTPS URL'i kopyala (örn: https://abc123.ngrok.io)
```

**Production:**
```
https://your-vercel-domain.vercel.app
```

### Adım 4.2: Webhook Oluştur

1. Lemon Squeezy Dashboard > Settings > Webhooks > Create Webhook
2. **URL**: `https://your-domain.com/api/webhooks/lemonsqueezy`
3. **Events** - Aşağıdakileri seç:
   - ✅ `order_created`
   - ✅ `subscription_created`
   - ✅ `subscription_updated`
   - ✅ `subscription_cancelled`
   - ✅ `subscription_expired`
   - ✅ `subscription_payment_success`
4. **Save**
5. **Signing Secret**'i kopyala
6. `.env` dosyasına ekle:
```bash
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## 5. Test Etme

### Adım 5.1: Uygulamayı Başlat

```bash
npm run dev
```

### Adım 5.2: Test Kullanıcısı Oluştur

1. http://localhost:3000 adresine git
2. "Get Started" butonuna tıkla
3. Test email ile kayıt ol

### Adım 5.3: Pricing Sayfasını Kontrol Et

1. Ana sayfada aşağı kaydır
2. **Pricing** bölümünü gör
3. 3 plan olmalı: Slacker ($15), Student ($25), Nerd ($45)

### Adım 5.4: Test Satın Alma

1. Bir plana "Get Started" butonuna tıkla
2. Lemon Squeezy checkout sayfasına yönlendirileceksin
3. **Test Mode** olduğundan test kart bilgileri kullan:
   - Card: `4242 4242 4242 4242`
   - Expiry: Gelecekteki herhangi bir tarih
   - CVC: Herhangi 3 rakam

### Adım 5.5: Webhook'u Test Et

1. Ödemeyi tamamla
2. Lemon Squeezy Dashboard > Webhooks > Your Webhook > Recent Deliveries
3. Webhook çağrılarını gör (200 status olmalı)
4. Supabase Dashboard > Table Editor > subscriptions
5. Yeni subscription kaydını gör

### Adım 5.6: Hikaye Oluşturmayı Test Et

1. Ana sayfaya dön
2. Dosya yükle ve universe seç
3. "Start episode" butonuna tıkla
4. ✅ Hikaye oluşturulmalı
5. Header'da kalan hikaye limitini gör (örn: "9 / 10")

### Adım 5.7: Limit Kontrolünü Test Et

1. Plan limitine ulaşana kadar hikaye oluştur (Slacker = 10)
2. Limit dolunca hata mesajı görmeli ve pricing'e yönlendirilmelisin

---

## 6. Production'a Geçiş

### Adım 6.1: Lemon Squeezy'de Live Mode'a Geç

1. Lemon Squeezy Dashboard > Sağ üst > **Live Mode**'a geç
2. Ürünleri ve fiyatları tekrar kontrol et

### Adım 6.2: Production API Key'i Al

1. Dashboard > Settings > API
2. **Production API Key** oluştur
3. Production `.env` dosyasına ekle

### Adım 6.3: Webhook'u Güncelle

1. Dashboard > Settings > Webhooks
2. Production URL'i ekle: `https://your-vercel-domain.vercel.app/api/webhooks/lemonsqueezy`
3. Signing Secret'i güncelle

### Adım 6.4: Environment Variables'ı Vercel'e Ekle

1. Vercel Dashboard > Your Project > Settings > Environment Variables
2. Tüm env variables'ları ekle:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LEMONSQUEEZY_API_KEY` (Production key)
   - `LEMONSQUEEZY_STORE_ID`
   - `LEMONSQUEEZY_SLACKER_VARIANT_ID`
   - `LEMONSQUEEZY_STUDENT_VARIANT_ID`
   - `LEMONSQUEEZY_NERD_VARIANT_ID`
   - `LEMONSQUEEZY_WEBHOOK_SECRET`

---

## 📊 Abonelik Planları

| Plan    | Fiyat | Hikaye Limiti | Özellikler                                                                 |
|---------|-------|---------------|---------------------------------------------------------------------------|
| Slacker | $15   | 10/ay         | Tüm evrenler, Quizler, HD görseller                                      |
| Student | $25   | 30/ay         | Tüm evrenler, Quizler, HD görseller, Öncelikli destek                    |
| Nerd    | $45   | 50/ay         | Tüm evrenler, Quizler, HD görseller, Öncelikli destek, Erken erişim      |

---

## 🔧 Sorun Giderme

### Webhook çalışmıyor
- Lemon Squeezy Dashboard > Webhooks > Recent Deliveries'i kontrol et
- Status code 200 dışında bir şey görüyorsan, server loglarını kontrol et
- `SUPABASE_SERVICE_ROLE_KEY` doğru mu kontrol et

### Checkout sayfası açılmıyor
- Variant ID'lerin doğru olduğundan emin ol
- Lemon Squeezy'de Test Mode aktif mi kontrol et
- Browser console'da hata var mı kontrol et

### Subscription oluşturuluyor ama veritabanına kaydedilmiyor
- Webhook URL'inin doğru olduğundan emin ol
- Webhook events'lerin seçili olduğundan emin ol
- Supabase RLS policy'lerinin doğru olduğundan emin ol

### Stories limit çalışmıyor
- Supabase'de subscription kaydının `status = 'active'` olduğundan emin ol
- `current_period_end` tarihinin gelecekte olduğundan emin ol
- Browser console'da subscription fetch hatası var mı kontrol et

---

## 🎉 Tamamlandı!

Artık Lorey uygulamanızda tam fonksiyonel bir abonelik sistemi var!

**Yapılan İşler:**
- ✅ 3 farklı abonelik planı (Slacker, Student, Nerd)
- ✅ Otomatik ödeme altyapısı (Lemon Squeezy)
- ✅ Hikaye oluşturma limitleri
- ✅ Gerçek zamanlı limit göstergesi (Header)
- ✅ Abonelik yönetimi (Settings sayfası)
- ✅ Otomatik yenileme ve faturalandırma
- ✅ Webhook entegrasyonu

**Yeni Özellikler:**
- Kullanıcılar artık abonelik olmadan hikaye oluşturamaz
- Her plan kendi hikaye limitine sahip
- Limitler her ay otomatik sıfırlanır
- Kullanıcılar header'da kalan limitlerini görebilir
- Settings sayfasında abonelik detaylarını görebilir
