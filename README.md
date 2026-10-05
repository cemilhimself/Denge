# Denge — ücretsiz bulut ve iPhone kurulumu

Denge tarayıcıda çalışır. Kayıtlar önce kullandığın tarayıcıda tutulur; Supabase hesabına e-posta bağlantısıyla giriş yaptıktan sonra aynı bütçe bilgisini bilgisayar ve iPhone arasında eşitler. Veritabanında her hesap için tek bir JSON yedeği bulunur ve Row Level Security (RLS) yalnızca o hesaba erişim verir.

## 1. Ücretsiz Supabase projesi oluştur

1. [supabase.com](https://supabase.com) adresinde hesap aç veya giriş yap ve **New project** seç.
2. Organizasyon seç, projeye `denge` gibi bir ad ver, veritabanı parolasını belirle. Parolayı bir parola yöneticisinde sakla; Denge uygulamasına yazma.
3. Bölge olarak sana yakın bir bölge seç (Güney Kore için Seoul varsa onu seçebilirsin). Plan ekranında **Free** seç.
4. Proje hazır olunca **SQL Editor** bölümünü aç; `supabase/schema.sql` dosyasının tamamını çalıştır. Bu, kullanıcının sadece kendi kaydını okuyup yazabildiği tablo ve politikaları oluşturur.
5. **Project Settings → API Keys** (veya **Connect**) ekranından Project URL ve publishable public key değerini al.
6. `supabase-config.js` dosyasındaki `url` ve `publishableKey` alanlarına bu iki değeri yaz. `service_role` veya secret key kullanma; bu dosya herkese açık web uygulamasının parçasıdır.
7. **Authentication → URL Configuration** altında uygulamanın yayınlanacağı adresi **Site URL** olarak, aynı adresi **Redirect URLs** listesine ekle. E-posta giriş bağlantısı bu adrese geri döner.
8. **Authentication → Providers → Email** bölümünde e-posta girişinin açık olduğundan emin ol. Supabase’in varsayılan e-posta gönderimi deneme amaçlı ve kısıtlı olabilir; gönderim sınırına ulaşırsan SMTP ayarları gerekir.

## 2. GitHub Pages ile ücretsiz yayınla

GitHub Desktop dosyaları GitHub depona aktarır; Pages yayını GitHub.com'daki depo ayarlarından açılır. Kişisel GitHub Free hesaplarında Pages için depo herkese açık olmalıdır. Yani uygulamanın kaynak dosyaları ve sayfası internetten görülebilir; bütçe kayıtları dosyalarda değil Supabase'te tutulur ve RLS politikalarıyla hesaplara ayrılır. Yine de herkese açık siteyi istemiyorsan GitHub Pages'i kullanma.

1. GitHub Desktop'ta **File → Add local repository** ile bu klasörü ekle. Henüz Git deposu değilse **create a repository** seçip klasör olarak `C:\Codex\Denge` kullan.
2. **Publish repository** ile GitHub hesabına gönder. GitHub Pages ücretsiz kullanımı için depo görünürlüğü **Public** olmalı. Yalnızca uygulama kodu ve `supabase-config.js` içindeki Project URL/publishable key yayınlanır; parola veya secret/service-role key ekleme.
3. GitHub.com'da depo sayfasını aç; **Settings → Pages → Build and deployment** bölümünde **Deploy from a branch** ve `main` / `/(root)` seçip **Save**'e bas. Bu seçenek görünmüyorsa **GitHub Actions**'ı seç; `.github/workflows/pages.yml` uygulamanın statik dosyalarını yayınlar. Önce bu workflow dosyasını GitHub'a commit edip push et.
4. GitHub'ın verdiği `https://<kullanıcı-adı>.github.io/Denge/` adresini bekle. Ana sayfa `index.html` üzerinden Denge'yi açar. Bu adresi Supabase **Authentication → URL Configuration** kısmındaki Site URL ve Redirect URLs'e ekle.

GitHub Desktop tek başına Supabase veritabanını veya Auth'i ayarlamaz; `supabase/schema.sql` Supabase SQL Editor'da ayrıca çalıştırılmalı. `index.html`, `manifest.webmanifest` ve service worker proje alt yolu (`/Denge/`) için düzenlenmiştir.

Şimdilik uygulamayı doğrudan `ButceTakip.html` dosyasına çift tıklayarak açabilirsin; bu modda mevcut tarayıcıdaki yerel kayıt ve JSON yedekleme çalışır. `file://` adresinde service worker, kurulum simgesi ve bulut oturumu tarayıcı kısıtları nedeniyle çalışmaz.

## 3. İlk eşitleme ve iPhone

1. Yayınlanan HTTPS adresini bilgisayarda aç; **Bulut hesabı** seçeneğine e-posta adresini yaz ve gelen bağlantıyla giriş yap.
2. Bilgisayarda eski bütçe varsa ve bulut boşsa otomatik olarak ilk kayıt olarak yüklenir. Her iki tarafta da farklı veriler varsa Denge hangi kaydı kullanacağını sorar. “Bu cihazdakini yükle” bulut kaydının yerini alır; istersen önce **Yedeği indir** ile ayrıca kopya sakla.
3. iPhone’da aynı HTTPS adresini Safari’de açıp aynı e-posta bağlantısıyla giriş yap. Paylaş düğmesi → **Ana Ekrana Ekle** ile uygulama simgesi oluştur. Her cihazın Safari/Chrome yerel deposu ayrı olduğundan cihazlar arasında ortak kullanım için bulut girişi gerekir.

## Verinin konumu ve anahtarlar

- Yerel kopya her cihazın tarayıcı depolamasında; eşitlenen kopya Supabase projesinin seçilen bölgesindeki veritabanında saklanır.
- `supabase-config.js` içinde yalnızca Project URL ve publishable key bulunabilir. Tablo politikaları erişimi kullanıcı kimliğiyle sınırlar.
- Veritabanı parolasını, `service_role` anahtarını veya başka bir secret key'i web dosyalarına, Git deposuna ya da sohbete koyma.
- Supabase Free katmanında projenin kullanım/uyku sınırları olabilir. Denge kişisel kullanım içindir; dışa aktarılan JSON yedeğini ara sıra indirip sakla.
