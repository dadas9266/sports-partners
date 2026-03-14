import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Şartları - SporPartner",
  description: "SporPartner kullanım şartları, hizmet koşulları ve topluluk kuralları.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 prose prose-sm dark:prose-invert max-w-none">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Kullanım Şartları
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Son güncelleme: 6 Haziran 2025
        </p>

        <p>
          SporPartner uygulamasını (&quot;Uygulama&quot;, &quot;Platform&quot;) kullanarak aşağıdaki
          şartları kabul etmiş sayılırsınız. Lütfen bu şartları dikkatlice okuyunuz.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">1. Hizmet Tanımı</h2>
        <p>
          SporPartner, kullanıcıların spor partneri, rakip veya eğitmen bulmalarını sağlayan bir
          sosyal platformdur. Kullanıcılar ilan oluşturabilir, eşleşebilir, mesajlaşabilir,
          topluluklara ve gruplara katılabilir.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Hesap Oluşturma</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Uygulamayı kullanmak için 13 yaşından büyük olmanız gerekmektedir.</li>
          <li>
            Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olması sizin
            sorumluluğunuzdadır.
          </li>
          <li>Hesabınızın güvenliğinden siz sorumlusunuz.</li>
          <li>Başka birinin hesabını kullanmanız yasaktır.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Kullanıcı İçerikleri (UGC)</h2>
        <p>
          Kullanıcılar Platform üzerinde ilan, gönderi, yorum, mesaj ve değerlendirme gibi içerikler
          oluşturabilir. Bu içeriklerle ilgili sorumluluk tamamen içeriği oluşturan kullanıcıya
          aittir.
        </p>
        <p className="font-semibold mt-3">Aşağıdaki içerikler kesinlikle yasaktır:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nefret söylemi, ırkçılık, ayrımcılık içeren ifadeler</li>
          <li>Taciz, zorbalık, tehdit veya şiddet içeren içerikler</li>
          <li>Müstehcen, cinsel veya uygunsuz materyaller</li>
          <li>Spam, dolandırıcılık veya yanıltıcı bilgiler</li>
          <li>Başkalarının kişisel bilgilerini izinsiz paylaşma</li>
          <li>Sahte profiller ve kimlik taklidi</li>
          <li>Telif hakkı veya fikri mülkiyet ihlalleri</li>
          <li>Yasa dışı faaliyetleri teşvik eden içerikler</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. İçerik Denetimi ve Şikayet</h2>
        <p>
          SporPartner, uygunsuz içerikleri tespit etmek ve kaldırmak için moderasyon sistemi
          kullanmaktadır:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Kullanıcılar, uygunsuz içerik veya davranışları <strong>Şikayet Et (🚩)</strong>{" "}
            butonu aracılığıyla bildirebilir.
          </li>
          <li>
            Kullanıcılar, istemedikleri kişileri <strong>Engelle (🚫)</strong> veya{" "}
            <strong>Kısıtla (🔇)</strong> seçenekleri ile engelleyebilir.
          </li>
          <li>Şikayetler en kısa sürede incelenir ve gerekli işlemler yapılır.</li>
          <li>
            Kurallara tekrar tekrar aykırı davranan kullanıcıların hesapları geçici veya kalıcı
            olarak askıya alınabilir.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">5. Eşleşme ve Buluşma</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            SporPartner yalnızca kullanıcıları buluşturan bir platformdur. Eşleşme sonrası
            gerçekleşen buluşmalardan SporPartner sorumlu değildir.
          </li>
          <li>Buluşmalarınızda kişisel güvenliğinize dikkat etmeniz önerilir.</li>
          <li>
            Diğer kullanıcılarla olan anlaşmazlıklarınızı şikayet sistemi üzerinden
            bildirebilirsiniz.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">6. Fikri Mülkiyet</h2>
        <p>
          SporPartner&apos;ın logosu, tasarımı, yazılımı ve özgün içerikleri üzerindeki tüm haklar
          saklıdır. Platform üzerinde oluşturduğunuz içerikler üzerindeki haklarınız size aittir;
          ancak bu içerikleri Platform&apos;da yayınlayarak SporPartner&apos;a hizmeti sunmak
          amacıyla kullanma lisansı vermiş olursunuz.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">7. Hizmetin Değiştirilmesi veya Sonlandırılması</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            SporPartner, hizmeti önceden bildirim yaparak değiştirebilir veya sonlandırabilir.
          </li>
          <li>
            Kullanım şartlarını ihlal eden hesaplar uyarı yapılmaksızın askıya alınabilir.
          </li>
          <li>
            Hesabınızı dilediğiniz zaman ayarlar sayfasından silebilirsiniz.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">8. Sorumluluk Reddi</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Platform &quot;olduğu gibi&quot; sunulmaktadır. Kesintisiz veya hatasız çalışma garantisi
            verilmemektedir.
          </li>
          <li>
            Kullanıcılar arası anlaşmazlıklardan veya buluşmalardan doğan sorunlardan SporPartner
            sorumlu tutulamaz.
          </li>
          <li>
            Kullanıcıların paylaştığı içeriklerin doğruluğu garanti edilmez.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">9. Uygulanacak Hukuk</h2>
        <p>
          Bu kullanım şartları Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıklarda Türkiye
          mahkemeleri yetkilidir.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">10. Değişiklikler</h2>
        <p>
          Bu kullanım şartları zaman zaman güncellenebilir. Önemli değişiklikler yapıldığında
          uygulama içinden bildirim gönderilecektir.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">11. İletişim</h2>
        <p>Sorularınız için bizimle iletişime geçebilirsiniz:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            E-posta:{" "}
            <a href="mailto:destek@sporpartner.co" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              destek@sporpartner.co
            </a>
          </li>
        </ul>
      </article>
    </div>
  );
}
