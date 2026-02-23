# 🏆 SporPartner — Spor Partneri & Rakip Bulma Platformu

Mobil öncelikli, konum bazlı spor partner ve rakip bulma web uygulaması (MVP).

## ✨ Özellikler

- **Kimlik Doğrulama**: Kayıt ol, giriş yap, çıkış yap (bcrypt + JWT)
- **İlan Oluşturma**: Rakip arıyorum / Partner arıyorum ilanları
- **Konum Bazlı Filtreleme**: Ülke → Şehir → İlçe kademeli seçim
- **Spor & Seviye Filtreleme**: Futbol, basketbol, tenis vb. + Başlangıç/Orta/İleri
- **Mekan Seçimi**: İlçeye göre dinamik mekan dropdown
- **Karşılık Sistemi**: İlana mesajlı karşılık verme
- **Kabul/Red**: İlan sahibi karşılıkları kabul veya reddedebilir
- **Eşleşme (Match)**: Kabul edilen karşılık otomatik Match oluşturur
- **Profil Sayfası**: İlanlarım, karşılıklarım, eşleşmelerim
- **Rate Limiting**: Günde max 5 ilan oluşturma limiti
- **Karanlık Mod**: Tam karanlık mod desteği (localStorage ile kalıcı)
- **SEO**: Dinamik sitemap, robots.txt, OpenGraph meta
- **Test Altyapısı**: Vitest + React Testing Library (55 test)
- **Mobil Uyumlu**: Responsive, mobil öncelikli tasarım

## 🛠 Teknoloji Stack

| Teknoloji | Kullanım |
|-----------|----------|
| Next.js 16 (App Router) | Full-stack framework |
| TypeScript | Tip güvenliği |
| Tailwind CSS | UI/Styling |
| Prisma 5 | ORM |
| PostgreSQL | Veritabanı |
| NextAuth v4 | Kimlik doğrulama |
| Zod v4 | Form/API validasyonu |
| Vitest | Test framework |
| React Testing Library | Bileşen testleri |
| React Hot Toast | Bildirimler |

## 📋 Ön Gereksinimler

- Node.js 18+
- Docker Desktop (PostgreSQL için) **veya** local PostgreSQL kurulumu
- npm

## 🚀 Kurulum

### 1. Bağımlılıkları Kur
```bash
npm install
```

### 2. Environment Değişkenleri
`.env.example` dosyasını `.env` olarak kopyalayın:
```bash
cp .env.example .env
```

`.env` dosyasındaki değişkenler:
| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `DATABASE_URL` | PostgreSQL bağlantı URL'si | `postgresql://postgres:postgres@localhost:5432/sports_partner?schema=public` |
| `NEXTAUTH_SECRET` | NextAuth şifreleme anahtarı | `super-secret-key-change-in-production` |
| `NEXTAUTH_URL` | Uygulama URL'si | `http://localhost:3000` |

### 3. PostgreSQL Veritabanını Başlat
Docker ile:
```bash
docker compose up -d
```

> Alternatif: Local PostgreSQL kuruluysa `.env` dosyasındaki `DATABASE_URL`'i ayarlayın.

### 4. Migration & Seed
```bash
# Veritabanı tablolarını oluştur
npx prisma migrate dev --name init

# Prisma Client oluştur
npx prisma generate

# Örnek verileri yükle
npm run seed
```

### 5. Uygulamayı Başlat
```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresine gidin.

## 🧪 Test Hesapları

Seed sonrası kullanılabilir test hesapları:

| E-posta | Şifre | İsim |
|---------|-------|------|
| ahmet@test.com | Test123! | Ahmet Yılmaz |
| mehmet@test.com | Test123! | Mehmet Kaya |
| ayse@test.com | Test123! | Ayşe Demir |

## 📂 Proje Yapısı

```
src/
├── app/
│   ├── api/               # API Route'ları
│   │   ├── auth/          # Kayıt, giriş (NextAuth)
│   │   ├── listings/      # İlan CRUD + filtreleme
│   │   ├── locations/     # Ülke/Şehir/İlçe verileri
│   │   ├── profile/       # Profil verileri
│   │   ├── responses/     # Karşılık gönder, kabul/red
│   │   ├── sports/        # Spor dalları
│   │   └── venues/        # Mekanlar
│   ├── auth/              # Giriş & Kayıt sayfaları
│   ├── ilan/              # İlan oluştur & detay
│   └── profil/            # Profil sayfası
├── components/            # Ortak UI bileşenleri
│   ├── ui/                # Button, Badge, Modal, Select, Pagination
│   ├── ErrorBoundary.tsx   # Hata sınıfı (React Error Boundary)
│   ├── FilterBar.tsx       # Filtreleme bileşeni
│   ├── ListingCard.tsx     # İlan kartı
│   ├── Navbar.tsx          # Navigasyon + karanlık mod toggle
│   └── Providers.tsx       # SessionProvider + ErrorBoundary
├── hooks/                 # Custom React hook'ları
│   ├── useDebounce.ts     # Arama debounce
│   ├── useListings.ts     # İlan çekme + filtreleme
│   ├── useLocations.ts    # Konum, spor, mekan hook'ları
│   └── useProfile.ts      # Profil verisi hook'u
├── services/              # API istemci katmanı
│   └── api.ts             # Tipli fetch fonksiyonları
├── __tests__/             # Test dosyaları
│   ├── setup.ts           # Vitest setup
│   ├── validations.test.ts # Zod şema testleri
│   ├── components.test.tsx # UI bileşen testleri
│   └── types.test.ts      # Tip sabitleri testleri
├── lib/                   # Yardımcı kütüphaneler
│   ├── auth.ts            # NextAuth konfigürasyonu
│   ├── prisma.ts          # Prisma Client singleton
│   ├── validations.ts     # Zod şemaları
│   ├── api-utils.ts       # API yardımcıları
│   └── rate-limit.ts      # Rate limiter
└── types/                 # TypeScript tip tanımları
prisma/
├── schema.prisma          # Veritabanı şeması
├── seed.ts                # Seed script
└── migrations/            # Migration dosyaları
```

## 📊 Veritabanı Modelleri

- **User**: Kullanıcı hesabı
- **Sport**: Spor dalları (Futbol, Basketbol, Tenis vb.)
- **Country / City / District**: Konum hiyerarşisi
- **Venue**: Spor mekanları (ilçeye bağlı)
- **Listing**: Spor ilanları (tip, spor, konum, tarih, seviye)
- **Response**: İlanlara gelen karşılıklar
- **Match**: Kabul edilen karşılıklardan oluşan eşleşmeler

## 🎯 MVP Akışı

1. Kullanıcı kayıt olur / giriş yapar
2. "İlan Oluştur" ile yeni ilan açar (spor, konum, tarih, seviye seçer)
3. Diğer kullanıcılar ana sayfada filtreleyerek ilanları görür
4. Beğendiği ilana "Karşılık Ver" ile mesajlı talep gönderir
5. İlan sahibi gelen karşılıkları görür → Kabul veya Reddet
6. Kabul edilen karşılık → Match oluşur → İki taraf birbirinin bilgilerini görür

## 🧪 Testler

```bash
# Testleri çalıştır
npm test

# Watch modunda çalıştır
npm run test:watch

# Coverage raporu
npm run test:coverage
```

Mevcut testler:
- **Validasyon testleri** (35 test): Zod şema doğrulamaları
- **Bileşen testleri** (13 test): Button, Badge render testleri
- **Tip testleri** (7 test): Sabit değer ve etiket doğrulamaları

## 🔮 Sonraki Faz (Post-MVP)

- [ ] Gerçek zamanlı bildirimler (WebSocket / SSE)
- [ ] Mesajlaşma sistemi (match sonrası chat)
- [ ] Kullanıcı değerlendirme ve puanlama
- [ ] Harita entegrasyonu (mekan konumları)
- [ ] Profil fotoğrafı yükleme
- [ ] Sosyal giriş (Google, GitHub)
- [ ] Takım oluşturma ve turnuva sistemi
- [ ] Push notification (mobil)
- [ ] i18n çoklu dil desteği
- [ ] Admin paneli
- [ ] E2E testler (Playwright)
- [ ] Vercel / Docker deployment

## 📝 Lisans

MIT
