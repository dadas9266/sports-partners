import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası - SporPartner",
  description: "SporPartner gizlilik politikası, kişisel verilerin korunması ve KVKK uyumu.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 prose prose-sm dark:prose-invert max-w-none">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Gizlilik Politikası
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Son güncelleme: 6 Haziran 2025
        </p>

        <p>
          SporPartner (&quot;Uygulama&quot;, &quot;biz&quot;, &quot;bizim&quot;) olarak kişisel
          verilerinizin korunmasına büyük önem veriyoruz. Bu Gizlilik Politikası, hangi verileri
          topladığımızı, nasıl kullandığımızı ve haklarınızı açıklamaktadır.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">1. Topladığımız Veriler</h2>
        <p>Uygulamamızı kullanırken aşağıdaki bilgileri toplayabiliriz:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Hesap Bilgileri:</strong> Ad, e-posta adresi, doğum tarihi, cinsiyet, profil
            fotoğrafı, şehir/ilçe bilgisi.
          </li>
          <li>
            <strong>Profil Bilgileri:</strong> Spor tercihleri, seviye, biyografi, sosyal medya
            bağlantıları.
          </li>
          <li>
            <strong>Kullanıcı İçerikleri:</strong> İlanlar, mesajlar, gönderiler, yorumlar,
            değerlendirmeler.
          </li>
          <li>
            <strong>Konum Bilgileri:</strong> Şehir ve ilçe bazında konum (GPS koordinatları yalnızca
            harita özelliği için kullanılır).
          </li>
          <li>
            <strong>Cihaz Bilgileri:</strong> Tarayıcı türü, işletim sistemi, IP adresi (güvenlik
            amaçlı).
          </li>
          <li>
            <strong>Kullanım Verileri:</strong> Sayfa görüntülemeleri, tıklamalar, oturum süreleri
            (Sentry hata izleme aracılığıyla).
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Verilerin Kullanım Amaçları</h2>
        <p>Topladığımız verileri aşağıdaki amaçlarla kullanırız:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Hesabınızı oluşturmak ve yönetmek</li>
          <li>Spor partneri eşleştirme hizmetini sunmak</li>
          <li>İlan, mesaj ve sosyal özelliklerini sağlamak</li>
          <li>Bildirimler göndermek (push bildirimleri dahil)</li>
          <li>Platformun güvenliğini sağlamak ve kötüye kullanımı önlemek</li>
          <li>Hizmet kalitesini iyileştirmek</li>
          <li>Yasal yükümlülüklerimizi yerine getirmek</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Verilerin Paylaşımı</h2>
        <p>Kişisel verileriniz aşağıdaki durumlar dışında üçüncü kişilerle paylaşılmaz:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Hizmet Sağlayıcılar:</strong> Vercel (barındırma), Supabase (dosya depolama),
            Upstash (önbellek), Sentry (hata izleme), Google/GitHub (kimlik doğrulama).
          </li>
          <li>
            <strong>Yasal Gereklilikler:</strong> Mahkeme kararı veya yasal zorunluluk halinde yetkili
            makamlarla paylaşılabilir.
          </li>
          <li>
            <strong>Diğer Kullanıcılar:</strong> Profilinizde herkese açık olarak paylaştığınız
            bilgiler (ad, şehir, spor tercihleri vb.) diğer kullanıcılar tarafından görülebilir.
            Gizlilik ayarlarınızdan görünürlüğü yönetebilirsiniz.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. Verilerin Saklanması</h2>
        <p>
          Kişisel verileriniz, hesabınız aktif olduğu sürece saklanır. Hesabınızı sildiğinizde
          verileriniz 30 gün içinde kalıcı olarak silinir. Yasal zorunluluklar nedeniyle bazı
          veriler daha uzun süre saklanabilir.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">5. Veri Güvenliği</h2>
        <p>
          Verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz: HTTPS
          şifreleme, güvenli oturum yönetimi (JWT), şifreli veritabanı bağlantıları ve düzenli
          güvenlik güncellemeleri.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">6. Çerezler ve Yerel Depolama</h2>
        <p>
          Uygulamada oturum yönetimi için çerezler, tema tercihi ve önbellek için yerel depolama
          (localStorage) kullanılmaktadır. Bu veriler yalnızca uygulamanın düzgün çalışması için
          gereklidir.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">7. Push Bildirimleri</h2>
        <p>
          Push bildirimleri alabilmek için tarayıcınızın bildirim iznini vermeniz gerekmektedir.
          Bu izni istediğiniz zaman tarayıcı ayarlarından geri alabilirsiniz.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">8. Haklarınız (KVKK Madde 11)</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>
          <li>
            KVKK&apos;nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini
            isteme
          </li>
          <li>
            İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle
            aleyhinize bir sonucun ortaya çıkmasına itiraz etme
          </li>
          <li>
            Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini
            talep etme
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">9. Çocukların Gizliliği</h2>
        <p>
          SporPartner, 13 yaşından küçük kişilerin kullanımına yönelik değildir. 13 yaşından küçük
          kişilerden bilerek kişisel veri toplamıyoruz. Böyle bir durum tespit edilirse ilgili
          veriler derhal silinir.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">10. Değişiklikler</h2>
        <p>
          Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler yapıldığında
          uygulama içinden bildirim gönderilecektir. Güncel tarih her zaman bu sayfanın üst
          kısmında yer alır.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">11. İletişim</h2>
        <p>
          Gizlilik politikamızla ilgili sorularınız veya talepleriniz için bizimle iletişime
          geçebilirsiniz:
        </p>
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
