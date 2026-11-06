# ReboundOps engine

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## rebound-ops senin için ne yapar

Bir ilan yapıştır. O akşama değip değmeyeceğini söyler.

- **Hâlâ açık mı?** Tek kelime yazmadan önce ilanın hâlâ yayında olduğunu kontrol eder.
- **Sana göre değil mi?** Rolü gerçek CV'ne göre puanlar ve zayıf eşleşmeyi atlamanı söyler. Kararı geçersiz kılabilirsin.
- **Değer mi?** CV'yi, ön yazıyı ve cevapları taslak olarak hazırlar. Sen okursun. Sen gönderirsin.
- **Kiminle konuşmalıyım?** Kişiyi bulur ve notu taslak olarak yazar. Asla göndermez.
- **Bunların hepsi nereye gidiyor?** Her başvuru senin makinende kalır. Bize hiçbir şey yüklenmez.
- **Ne öğrenmeliyim?** Bir dizi ret sonrasında eksiği adıyla söyler.

İlk çalıştırmalar kabadır. Seni henüz tanımıyor. Onunla konuş: CV'n, ne istediğin, neyi reddettiğin. Bunu bir işe alım uzmanının ilk haftası gibi düşün.

İlk açılışta bunların hepsini sohbette sorar. Elle yapılandırılacak bir şey yok.

## rebound-ops'un yapmadıkları

- **Başvuruyu otomatik göndermek.** Her alan için cevabı taslak olarak hazırlar; sen kontrol eder ve Gönder'e tıklarsın. Betik asla POST yapmaz (`prepare-application.mjs`).
- **E-posta göndermek.** Yalnızca taslak. Bu kod tabanının hiçbir yerinde posta gönderimi yok.
- **Eve rapor vermek.** Telemetri yok, bize ait bir arka uç yok. CV'n senin makinenden seçtiğin yapay zekâ sağlayıcısına gider, başka hiçbir yere gitmez. Tek kamuya açık kayıt bu depo: `HIRED.md` ve issue'ları.
- **Seni 4,0/5 altına başvurmaya itmek.** Başvurma der. Yok sayabilirsin, o da bunu söyler.

CV'ni yeniden ifade eder; asla uydurmamalıdır. Koddaki bir denetim, CV'nde de article digest'inde de bulunmayan sayı veya bilgi içeren bir PDF'i durdurur, ama henüz her ifade değişikliğini değerlendiremez. Göndermeden önce her CV'yi oku. Ayrıntılar [SSS](#sss) bölümünde.

## Özellikler

| Özellik                  | Açıklama                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H Değerlendirmesi**  | Rol özeti, CV uyumu (her gereksinimin bu ilan için ne kadar önemli olduğu ve bu ağırlığın iş tanımının kendi ifadesinden mi, yapısından mı yoksa bir tahminden mi geldiği gereksinim başına etiketlenir; bir tahmin asla en üst banda çıkamaz), seviye stratejisi, maaş araştırması, kişiselleştirme, mülakat hazırlığı (STAR+R), ayrıca G bloğu meşruiyet kontrolü (hâlâ açık mı, yeniden yayınlanmış mı: gözlemler, hüküm değil) ve vize sponsorluğu olmadığını açıkça belirten bir iş tanımını kesin engel olarak işaretleyen çalışma izni sinyali |
| **Human-in-the-Loop**    | Yapay zekâ değerlendirir ve önerir, sen karar verir ve harekete geçersin. Sistem asla başvuru göndermez: son söz her zaman sende <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS PDF Üretimi**      | Space Grotesk + DM Sans tasarımıyla, kendi deneyiminden yola çıkarak her iş tanımına uyarlanmış, ATS'nin okuyabildiği CV'ler                                                                |
| **Ön Yazı Üretici**      | Araştırmaya dayalı ön yazılar: anahtar kelime yansıtma, dört etkileşimli açı sorusu (neden/sorunlar/yaklaşım/ton), sohbette taslak onayı ve CV'lerle aynı HTML + Playwright hattı üzerinden A4 PDF. Her değerlendirmede otomatik taslak yazar; istediğinde `/rebound-ops cover` ile tamamla ve üret |
| **CV'nin Ötesi**         | Şirket araştırması ([`deep`](modes/deep.md)) yapay zekâ stratejisini, son hamleleri, mühendislik kültürünü ve profilinin alması gereken açıyı ortaya çıkarır. Kişi keşfi ([`contacto`](modes/contacto.md)) ulaşmaya değer işe alım yöneticisini, işe alım uzmanını veya ekip arkadaşını belirler ve her kişi tipine göre ayarlanmış ≤300 karakterlik bir LinkedIn mesajı taslağı yazar. Resmî başvuru e-postası taslakları ([`email`](modes/email.md)) değerlendirilmiş bir raporu veya yapıştırılan iş tanımını hiçbir şey göndermeden, iletmeden veya tıklamadan konu satırına, gövdeye ve ek listesine dönüştürür. Başvuru seni kuyruğa sokar; araştırma sana bir sohbet kazandırır. |
| **Örüntü Analizi**       | Ret örüntüleri ve ATS kanalı başına ilerleme oranları (`analyze-patterns.mjs`), tüm arayışın huni istatistikleri (`stats.mjs`), hayalet ilana işaret edebilecek yeniden yayınların tespiti (`detect-reposts.mjs`) |

<details>
<summary><b>Yaptığı diğer her şey</b></summary>

| Özellik                  | Açıklama                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Otomatik Hat**         | Bir URL yapıştır; tam değerlendirme + PDF + takipçi kaydı al                                                                             |
| **Mülakat Hikâye Bankası** | Değerlendirmeler boyunca STAR+Refleksiyon hikâyeleri biriktirir: karşına çıkan davranışsal sorulara uyarlayabileceğin 5-10 ana hikâye                    |
| **Pazarlık Senaryoları** | Maaş pazarlığı çerçeveleri, coğrafi indirime karşı duruş, rakip tekliflerden kaldıraç                                                    |
| **Başvuru E-postası Taslakları** | Bir rapordan veya yapıştırılan iş tanımından işe alım uzmanına, referansla ya da soğuk başvuru için resmî e-postalar: konu satırı, ek listesi, kaynaklı uyum noktaları ve profilden gelen iletişim bloğu ile. Yalnızca taslak: rebound-ops asla göndermez, iletmez veya hiçbir şeye tıklamaz. |
| **Portal Tarayıcı**      | 100+ önceden yapılandırılmış şirket (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + Ashby, Greenhouse, Lever, Wellfound üzerinde özel web arama sorguları |
| **Yatırım Almış Şirket Keşfi** | Önce incele yaklaşımlı `company:funded` komutu, yapılandırılmış açık akışlardan yakın zamanda yatırım almış şirketleri ve kaynak tanılamalarını verilerini düzenlemeden ortaya çıkarır |
| **Toplu İşleme**         | Başsız CLI işçileriyle paralel değerlendirme (`claude -p` / `opencode run`)                                                              |
| **Dashboard TUI**        | Hattını gezmek, filtrelemek ve sıralamak için terminal arayüzü                                                                           |
| **Hat Bütünlüğü**        | Otomatik birleştirme, tekilleştirme, durum normalleştirme, sağlık kontrolleri                                                            |
| **Mülakat Paketi**       | Zaman bloklu hazırlık planları, geri bildirimli pratik oturumları, mülakat sonrası değerlendirmeler ([`interview/`](modes/interview/README.md)) ve şirket kırmızı bayrak dedektörü ([`interview-redflag`](modes/interview-redflag.md)) |
| **Teklif Aşaması**       | Sözleşme okuma yoldaşı: madde madde geçiş artı avukata soru listesi ([`offer-prep`](modes/offer-prep.md)) ve istenen/ilan edilen/gerçek maaş farkı analizörü (`salary-gap.mjs`) |
| **Takip ve Yanıtlar**    | Takip ritmi hesaplayıcı ve önceden ekilmiş hatırlatıcılar (`followup-cadence.mjs`, `followup-seed.mjs`); işveren yanıtlarının takipçi güncellemelerine sınıflandırılması ([`reply-watch`](modes/reply-watch.md)) |
| **Eklenti Sistemi**      | İsteğe bağlı entegrasyonlar (Gmail, Notion, Apify + topluluk kaydı), varsayılan olarak kapalı; bkz. [docs/PLUGINS.md](docs/PLUGINS.md)   |

</details>

## Hızlı Başlangıç

**En hızlı yol, tek komutla:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx`, [Node.js](https://nodejs.org) ile birlikte gelir: yükleyiciyi bir kez çalıştırır,
> global olarak hiçbir şey kurmaz. Node henüz yok mu? Önce onu kur.
> (Zaten bir Claude Code / Codex CLI kullanıyor musun? O zaman zaten var.)

Bu, en son sürümü `./rebound-ops` içine klonlar ve bağımlılıkları kurar. Sonra:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**İlk açılışta rebound-ops kurulumda sana yol gösterir (CV'n, profilin ve hedef rollerin), sadece sohbet ederek. Elle düzenlenecek hiçbir şey yok.**

<details>
<summary><b>Elle kurmayı mı tercih edersin? (git clone)</b></summary>

```bash
git clone https://github.com/AnkitParekh007/rebound-ops.git
cd rebound-ops && npm install
npx playwright install chromium   # only needed for PDF generation
# On a non-Debian/Ubuntu Linux distro (Fedora, Arch, ...), Chromium's system
# libraries aren't installed by the line above — install them yourself with
# your distro's package manager if PDF generation fails to launch the browser
# (Playwright's own docs list the required libraries per platform).

# 2. Open your AI CLI in this directory. On first launch it walks you
#    through setup (your CV, profile and target roles) by chatting
claude   # or codex / opencode / qwen / agy / grok

# Then ask your CLI to adapt the system to you:
# "Change the archetypes to backend engineering roles"
# "Translate the modes to English"
# "Add these 5 companies to portals.yml"
# "Update my profile with this CV I'm pasting"

# 3. Start using
# Paste a job URL or JD text to trigger auto-pipeline
# If your CLI supports slash commands, use /rebound-ops (or its CLI-specific alias)
# In Codex, ask for the same mode in plain language, e.g.:
# "Run the rebound-ops scan mode"
# "Run the rebound-ops pipeline mode for data/pipeline.md"
# "Run the rebound-ops pdf mode for the latest evaluated role"
# "Run the rebound-ops tracker mode and summarize the current statuses"
```

</details>

### Global kurulum

```bash
npm i -g ./engine/scaffolder
```

Bu, `rebound-ops` ikilisini global olarak kurar; böylece `rebound-ops init [folder]` komutunu `npx` olmadan çalıştırabilirsin. `init` onun tek komutudur: bir çalışma alanı kurar, sonrasındaki her şey bu ikili üzerinden değil, yapay zekâ kodlama CLI'ının içinde gerçekleşir (aşağıda Kullanım'a bak).

**Hangisini kullanmalısın?**
- `node engine/scaffolder/bin/cli.mjs init`: ilk kullanım için en iyisi; özel bir proje klasörü oluşturur.
- `npm i -g ./engine/scaffolder`: `npx` biçimi yerine `rebound-ops init` yazmayı tercih ediyorsan. Başka komut eklemez.

> **Sistem, bizzat yapay zekâ kodlama CLI'ın tarafından özelleştirilmek üzere tasarlandı.** Modlar, arketipler, puanlama ağırlıkları, pazarlık senaryoları: değiştirmesini istemen yeterli. Kullandığı dosyaların aynısını okur, bu yüzden neyi düzenleyeceğini tam olarak bilir.

Tam kurulum kılavuzu için [docs/SETUP.md](docs/SETUP.md), rebound-ops'u özel veya yerel modellerle ucuza çalıştırmak için [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) (Antigravity CLI'ın ücretsiz katmanında sıfır maliyetle çalıştırmak için [docs/FREE_TIER.md](docs/FREE_TIER.md)), tekrarlayan taramaları zamanlamak ve token harcamayan bir eleme-kısa liste tarifi için [docs/AUTOMATION.md](docs/AUTOMATION.md), ATS otomatik doldurma akışının ayrıntıları için [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md), LinkedIn bağlantı dışa aktarımını hunindeki şirketlerle çapraz kontrol etmek için [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) ve yaygın kurulum sorularının cevapları için [docs/FAQ.md](docs/FAQ.md) sayfasına bak; buna [hikâye kaynağının uydurma sayıları nasıl engellediği](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank) de dahil. Tasarım ilkeleri [ARCHITECTURE.md](ARCHITECTURE.md) içinde; çalışma zamanı akışları [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) içinde.

## Kullanım

rebound-ops ortak bir komut yönlendiricisi kullanır. Eğik çizgi komutlarını kaydeden CLI'larda şöyle görünür:

```
/rebound-ops           → Tüm kullanılabilir komutları göster
/rebound-ops {JD}      → OTOMATİK HAT: değerlendirme + rapor + PDF + takipçi (metin veya URL yapıştır)
/rebound-ops pipeline  → Gelen kutusundaki bekleyen URL'leri işle (data/pipeline.md)
/rebound-ops oferta    → Yalnızca değerlendirme, A'dan H'ye bloklar (otomatik PDF yok)
/rebound-ops ofertas   → Birden çok ilanı karşılaştır ve sırala
/rebound-ops contacto  → LinkedIn hamlesi: kişileri bul + mesaj taslağı yaz
/rebound-ops deep      → Şirket hakkında derin araştırma prompt'u
/rebound-ops interview-prep → Şirkete özel mülakat hazırlık belgesi üret
/rebound-ops interview    → Etkileşimli profil/CV tanışma mülakatı
/rebound-ops master-profile → Master Career Profile'ını içe aktar, gözden geçir ve doğrula
/rebound-ops eu-swe    → CV/başvuru/mülakat öncesinde bir Avrupa SWE başvurusunu kalibre et
/rebound-ops interview/plan → Yaklaşan bir mülakat için zaman bloklu hazırlık planı
/rebound-ops interview/practice → Pratik mülakat, geri bildirimle her seferinde bir soru
/rebound-ops interview/debrief → Mülakat sonrası değerlendirme: açıkları kapat, sonraki turu öngör
/rebound-ops interview-redflag → Bir şirkete katılmadan önce işverenin uyarı işaretlerini analiz et
/rebound-ops pdf       → Yalnızca PDF, ATS için optimize edilmiş CV
/rebound-ops text      → Uyarlanmış markdown CV (cv.md'yi yansıtır, PDF yok)
/rebound-ops latex     → CV'yi LaTeX/Overleaf .tex olarak dışa aktar
/rebound-ops latex-tex → Kendi resume.tex dosyanı yerinde uyarla (isteğe bağlı; cv.md varsayılan kalır)
/rebound-ops cover     → Ön yazı: tek başına yapıştırılan iş tanımı veya /rebound-ops cover {slug}
/rebound-ops email     → Resmî başvuru e-postası taslağı (yalnızca taslak; asla göndermez, iletmez veya tıklamaz)
/rebound-ops add       → CV'ne proje/makale/rol ekle (getir + önizle + onayla)
/rebound-ops expand    → Profil bağlantılarından eksik yetkinlikleri otomatik keşfet ve ekle
/rebound-ops training  → Kurs/sertifikayı North Star'a göre değerlendir
/rebound-ops project   → Portföy projesi fikrini değerlendir
/rebound-ops tracker   → Başvuru durumu özeti
/rebound-ops agent-inbox → Sonraki oturum için istekleri kuyruğa al/boşalt (data/agent-inbox.md)
/rebound-ops apply     → Canlı başvuru asistanı (formu okur + cevapları üretir)
/rebound-ops scan      → Portalları tara ve yeni ilanları keşfet
/rebound-ops discover  → Bir şirket listesini taranabilir ATS panolarına çevir + portals.yml'e ekle (token harcamaz)
/rebound-ops batch     → Paralel işçilerle toplu işleme
/rebound-ops patterns  → Ret örüntülerini analiz et ve hedeflemeyi iyileştir
/rebound-ops offer-prep → Alınan teklifi/sözleşmeyi adayla birlikte oku: madde madde geçiş + avukata sorular (hukuki tavsiye değildir)
/rebound-ops titles    → Aramayı genişletmek için CV'nden komşu iş unvanları öner
/rebound-ops upskill   → Değerlendirilmiş raporlarından toplu beceri açığı analizi
/rebound-ops followup  → Takip ritmi takipçisi: gecikenleri işaretle, taslaklar üret
/rebound-ops reply-watch → İşveren yanıtlarını sınıflandır ve takipçi güncellemeleri öner
/rebound-ops outcome   → Başvuru sonucunu kaydet ve çıktıları arşivle
/rebound-ops calibrate → Danışma raporu: değerlendirme puanların gerçek sonuçlarını öngörüyor mu? /outcome verilerini okur; puanlamayı asla değiştirmez
/rebound-ops update    → rebound-ops sistem dosyalarını diff önizlemesi + uyumluluk kontrolüyle güncelle
```

Ya da sadece bir iş URL'si veya tanımı yapıştır: rebound-ops bunu otomatik algılar ve tam hattı çalıştırır.

Codex'te eğik çizgi komutları garanti değildir. Bunun yerine aynı mod adlarını bir prompt'ta kullan veya `codex exec` ile çağır.

## Nasıl Çalışır

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity CLI Entegrasyonu

rebound-ops, Claude Code ve OpenCode'u desteklediği gibi Antigravity CLI'ı da yerel olarak destekler. Tüm eğik çizgi komutları, aynı `modes/*.md` değerlendirme mantığını kullanan ortak beceri giriş noktası üzerinden kullanılabilir.

Google, tüketici Gemini CLI erişimini Antigravity CLI'a taşıdı. `GEMINI.md` artık hiçbir şey yapmayan bir uyumluluk korumasıdır; böylece Antigravity hem `AGENTS.md` hem `GEMINI.md` dosyasını okuduğunda tam proje talimatlarını iki kez yüklemez.

### Yerel Antigravity CLI

```bash
# 1. Run in the rebound-ops directory
cd rebound-ops
agy

# 2. Use the unified /rebound-ops command with subcommands:
/rebound-ops "Senior AI Engineer at Anthropic..."
/rebound-ops pipeline
/rebound-ops scan
/rebound-ops pdf
/rebound-ops tracker
```

Beceri, açık standarda göre `.agents/skills/rebound-ops/SKILL.md` içinde tanımlanır ve desteklenen her CLI için (ör. `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`) sembolik bağ ile bağlanır veya referans verilir. Cursor, `.agents/skills/` içindeki ortak beceriyi otomatik olarak keşfeder.

## Codex Entegrasyonu

rebound-ops, Codex'i aynı ortak yönlendirici üzerinden destekler; ancak çağırma modeli, eğik çizgi komutlarını otomatik kaydeden CLI'lardan farklıdır. Tam kılavuz için bkz. [docs/CODEX.md](docs/CODEX.md).

### Etkileşimli Codex

```bash
cd rebound-ops
codex
```

Codex'te eğik çizgi komutları garanti değildir. `/rebound-ops` kullanılamıyorsa, Codex'ten modu doğrudan düz dille çalıştırmasını iste:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Tek seferlik Codex (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok Build CLI Entegrasyonu

rebound-ops, Claude Code ve OpenCode'u desteklediği gibi Grok Build CLI'ı da yerel olarak destekler. `AGENTS.md` proje kuralları olarak otomatik yüklenir ve tüm eğik çizgi komutları ortak beceri giriş noktası üzerinden kullanılabilir.

### Yerel Grok Build CLI

```bash
# 1. Run in the rebound-ops directory
cd rebound-ops
grok

# 2. Use the unified /rebound-ops command with subcommands:
/rebound-ops "Senior AI Engineer at Anthropic..."
/rebound-ops pipeline
/rebound-ops scan
/rebound-ops pdf
/rebound-ops tracker
```

Başsız toplu işçiler için `grok -p "prompt"` kullan (araç yürütmelerini otomatik onaylamak için `--yolo` ekle).

## Pi Entegrasyonu

rebound-ops, [Pi](https://github.com/earendil-works/pi)'yi yerel olarak destekler ve bakımını yapman gereken bir sarmalayıcı dosya yoktur: Pi, depo kökündeki `AGENTS.md` dosyasını proje bağlamı olarak okur ve `.agents/skills/rebound-ops/SKILL.md` içindeki ortak beceriyi kendi başına keşfeder. Yönlendirici bundan sonra `/skill:rebound-ops` olarak kullanılabilir.

### Yerel Pi

```bash
# 1. Run in the rebound-ops directory
cd rebound-ops
pi

# 2. Use the shared skill with subcommands:
/skill:rebound-ops "Senior AI Engineer at Anthropic..."
/skill:rebound-ops pipeline
/skill:rebound-ops scan
/skill:rebound-ops pdf
/skill:rebound-ops tracker
```

### Tek seferlik Pi (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Bir Pi sürümü proje kaynaklarını bir güven kararına bağlıyorsa, depo içinde bir kez `/trust` çalıştır ve proje becerisinin yüklenmesi için `pi`'yi yeniden başlat (`/trust` sonraki Pi süreçlerine uygulanır) ya da tek bir çalıştırmaya güvenen ve yeniden başlatma gerektirmeyen `-a` ile başlat.

### Bağımsız Gemini API Betiği (CLI kurulumu gerekmez)

```bash
# 1. Get a free API key at https://aistudio.google.com/apikey
cp .env.example .env
# Edit .env, set GEMINI_API_KEY=your_key_here

# 2. Install dependencies
npm install

# 3. Evaluate a job description
node gemini-eval.mjs "We are looking for a Senior AI Engineer..."
node gemini-eval.mjs --file ./jds/my-job.txt
node agent-inbox.mjs add "..."   # queue a request for the next session
npm run gemini:eval -- "JD text here"
```

> **Ücretsiz katman:** İki seçenek de faturalandırma olmadan çalışır. Yerel CLI Google OAuth kullanır; API betiği `gemini-3.6-flash` kullanır (hız limitleri modele ve katmana bağlıdır; güncel kotalar için Google AI belgelerine bak).

## Önceden Yapılandırılmış Portallar

Tarayıcı, taramaya hazır **100+ şirket** ve başlıca iş panolarında **35+ arama sorgusu** ile gelir. `templates/portals.example.yml` dosyasını `portals.yml` olarak kopyala ve kendininkileri ekle:

**Yapay Zekâ Laboratuvarları:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Sesli Yapay Zekâ:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**Yapay Zekâ Platformları:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**İletişim Merkezi:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Kurumsal:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Otomasyon:** n8n, Zapier, Make.com
**Avrupa:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Aranan iş panoları:** 55+ sağlayıcı modülü ATS API'lerini, pano genelindeki akışları, XML/RSS akışlarını, markdown akışlarını ve yerel ayrıştırıcıları kapsar. Tam tablo için bkz. [Desteklenen iş panoları](docs/SUPPORTED_JOB_BOARDS.md).

Varsayılan olarak `node scan.mjs` (nam-ı diğer `npm run scan`) her ATS akışının döndürdüğüne güvenir. Bazı şirketler pozisyon kapandıktan sonra bile herkese açık API'lerinde eski ilanları bırakır; bu süresi dolmuş kayıtlar `pipeline.md` içine sızabilir. API geçişinden sonra Playwright'ı başlatıp süresi dolmuş ilanları hatta girmeden elemek için `--verify` ver:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

Doğrulama sıralıdır ve yalnızca yeni ilanlar üzerinde çalışır (tekilleştirmeden sonra), bu yüzden maliyet sınırlı kalır.

## Dashboard TUI

Yerleşik terminal panosu hattını görsel olarak gezmene izin verir:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Özellikler: 10 filtre sekmesi, 8 sıralama modu, gruplu/düz görünüm, tembel yüklenen önizlemeler, satır içi durum değişiklikleri.

Ayrıca **deneysel bir web arayüzü** de var (alfa ve isteğe bağlı: sen başlatmadıkça hiçbir şey çalışmaz): bkz. [`web/README.md`](web/README.md).

## Proje Yapısı

```
rebound-ops/
├── AGENTS.md                    # Canonical agent instructions (all CLIs)
├── CLAUDE.md                    # Claude Code wrapper (imports AGENTS.md)
├── CODEX.md                     # Codex wrapper (imports AGENTS.md)
├── OPENCODE.md                  # OpenCode wrapper (imports AGENTS.md)
├── GEMINI.md                    # Legacy no-op guard to avoid Antigravity duplicate context
├── cv.md                        # Your CV (create this)
├── article-digest.md            # Your proof points (optional)
├── config/
│   └── profile.example.yml      # Template for your profile
├── modes/                       # Skill modes
│   ├── _shared.md               # Shared context (customize this)
│   ├── oferta.md                # Single evaluation
│   ├── pdf.md                   # PDF generation
│   ├── cover.md                 # Cover letter generation
│   ├── email.md                 # Formal application email drafts
│   ├── scan.md                  # Portal scanner
│   ├── batch.md                 # Batch processing
│   └── ...
├── templates/
│   ├── cv-template.html         # ATS-optimized CV template
│   ├── portals.example.yml      # Scanner config template
│   └── states.yml               # Canonical statuses
├── batch/
│   ├── batch-prompt.md          # Self-contained worker prompt
│   └── batch-runner.sh          # Orchestrator script
├── dashboard/                   # Go TUI pipeline viewer
├── data/                        # Your tracking data (gitignored)
├── reports/                     # Evaluation reports (gitignored)
├── output/                      # Generated PDFs (gitignored)
├── fonts/                       # Space Grotesk + DM Sans
├── docs/                        # Setup, customization, budget guide, architecture
└── examples/                    # Sample CV, report, proof points
```

## Harici Veri Dizini (İsteğe Bağlı)

Varsayılan olarak kullanıcı katmanı verileri (`cv.md`, `portals.yml` ve `data/`, `reports/`, `output/` klasörleri gibi) proje kök klasöründe bulunur.

Kişisel verilerini koddan ayırmak için (dal değiştirmeyi, güncelleme çekmeyi veya birden çok profili test etmeyi kolaylaştırır), aşağıdaki öncelik sırasıyla harici bir veri dizini yapılandırabilirsin:

1. **Ortam Değişkenleri:** `REBOUND_OPS_ROOT` veya `REBOUND_OPS_DATA_DIR` ortam değişkenini ayarla:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **İşaretçi Dosya:** Depo kökünde, veri dizininin yolunu içeren bir `.rebound-ops-data` dosyası oluştur.
3. **Varsayılan:** Depo kökü kullanılır.

Çözümlendikten sonra tüm kullanıcı dosyaları o klasöre göre çözümlenir ve yazılır; prompt dosyaları ve betikler depoya göre çözümlenmeye devam eder.

- **Takipçiyi Geçersiz Kılma:** Başvuru takipçisi dosya yolunu doğrudan geçersiz kılmak için `REBOUND_OPS_TRACKER` da ayarlayabilirsin.
- **Yazmalar:** Tüm yazma işlemleri (birleştirmeler gibi) kanonik olarak `{DATA_ROOT}/data/applications.md` hedefine gider.
- **Tarayıcı yapılandırması:** `portals.yml`, `{DATA_ROOT}/portals.yml` konumunda okunur ve doğrulanır; böylece `node validate-portals.mjs`, `scan.mjs` betiğinin okuduğu dosyanın aynısını denetler.
- **Üretilen belgeler:** Uyarlanmış CV'ler ve ön yazılar `{DATA_ROOT}/output/` altına yazılır; bunları bir rapora bağlayan PDF manifest dosyası `{DATA_ROOT}/data/pdf-index.tsv` konumundadır. `REBOUND_OPS_TRACKER` ayarlanmadığı sürece, bu yazmaları sınırlayan takipçi çalışma alanı depo kopyası değil, veri köküdür.
- **Takipçi geçersiz kılındığında PDF'ler:** `generate-pdf.mjs`, çalışma alanını belirlemeden önce `REBOUND_OPS_TRACKER` değerini çözümler; bu yüzden geçersiz kılma ayarlıyken çalışma alanı o takipçiyi içeren klasördür (takipçi bir `data/` klasöründeyse onun bir üstündeki klasör). Bu durumda CV'nin HTML'i ve tüm PDF'ler bu çalışma alanının içinde olmalıdır; manifest dosyası da çalışma alanının `data/pdf-index.tsv` dosyasına taşınır. Ön yazılar yine `{DATA_ROOT}/output/` hedefini kullanır; bu yüzden o klasör takipçinin çalışma alanının dışında kalırsa reddedilir.
- **Kod katmanı yerinde kalır:** `node_modules/`, `providers/`, `modes/` ve betiklerin kendisi her zaman depoya göre çözümlenir, asla veri köküne göre değil.

Go dashboard TUI, Node.js betikleri ve yapay zekâ ajan modlarının tümü bu çözümleme hiyerarşisine otomatik olarak uyar.


## Teknoloji Yığını

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Ajan**: Ortak beceriler ve modlarla yapay zekâ kodlama CLI'ı (`AGENTS.md` + CLI sarmalayıcısı)
- **PDF**: Playwright + HTML şablonu
- **Ön yazılar**: HTML şablonu + Playwright (A4 PDF, CV'lerle aynı hat)
- **Tarayıcı**: Playwright + Greenhouse API + WebSearch
- **Dashboard**: Go + Bubble Tea + Lipgloss (Catppuccin Mocha teması)
- **Veri**: Markdown tabloları + YAML yapılandırması + TSV toplu dosyaları

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Agent skill standardını destekleyen her CLI'da da çalışır. Bkz. <a href="docs/SUPPORTED_CLIS.md">desteklenen CLI'lar</a>.</sub><br>
  <img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/OpenCode-111827?style=flat&logo=terminal&logoColor=white" alt="OpenCode">
  <img src="https://img.shields.io/badge/Antigravity_CLI-4285F4?style=flat&logo=google&logoColor=white" alt="Antigravity CLI">
  <img src="https://img.shields.io/badge/Codex-412991?style=flat&logo=openai&logoColor=white" alt="Codex">
  <img src="https://img.shields.io/badge/Qwen-615CED?style=flat" alt="Qwen">
  <img src="https://img.shields.io/badge/Kimi-FF4B4B?style=flat" alt="Kimi">
  <img src="https://img.shields.io/badge/GitHub_Copilot-000?style=flat&logo=githubcopilot&logoColor=white" alt="GitHub Copilot">
  <img src="https://img.shields.io/badge/Grok_Build_CLI-000?style=flat&logo=x&logoColor=white" alt="Grok Build CLI">
  <img src="https://img.shields.io/badge/Pi-4B3F72?style=flat" alt="Pi">
  <br>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white" alt="Bubble Tea">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
  <a href="TRADEMARK.md"><img src="https://img.shields.io/badge/Trademark-Policy-blue.svg" alt="Trademark Policy"></a>
</p>

## SSS

**rebound-ops nedir?**
rebound-ops ([github.com/AnkitParekh007/rebound-ops](https://github.com/AnkitParekh007/rebound-ops), **reboundops** olarak da bilinir), yapay zekâ kodlama CLI'ında (Claude Code, Codex, OpenCode ve diğerleri) yerel olarak çalışan ve her kararı sana bırakan açık kaynaklı bir yapay zekâ iş arama aracıdır. İş ilanlarını CV'ne göre değerlendirir, ATS'ye uyarlanmış PDF'ler üretir, iletişime geçilecek doğru kişiyi bulur ve her şeyi tek yerde takip eder: son söz her zaman sende. [ReboundOps Manifestosu](https://github.com/AnkitParekh007/rebound-ops)'nun ilk referans uygulamasıdır.

**Uyarlanmış CV bir şeyler uydurabilir mi?**
Uydurmamalı, prompt'lar da böyle diyor: yeniden ifade et, asla uydurma. `--skip-fact-check` vermediğin sürece `generate-pdf`, kaynaklarında bulunmayan sayı veya bilgi içeren bir CV'yi engeller. `pdf` modu ayrıca `cv-title-check.mjs`'i çalıştırır: uyarlanmış CV'deki her iş unvanını, cv.md'nin aynı iş için verdiği unvanla (şirket ve tarihlere göre eşleştirerek) karşılaştırır ve farklı olan her unvanı korumak mı yoksa geri almak mı istediğini sana sorar. Bir unvanı farklı ifade etmek bazen senin kararın olduğu için yalnızca uyarır, engellemez. İfade değişikliklerini henüz hiçbir şey değerlendirmiyor: bunu [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (uyuşmazlıkta engelleyen sadakat denetimi) takip ediyor. O zamana kadar, göndermeden önce her CV'yi oku. [Yasal uyarı](LEGAL_DISCLAIMER.md) aynı şeyi daha uzun söylüyor.

**rebound-ops'u ücretsiz veya daha ucuz / yerel bir modelde çalıştırabilir miyim?**
Evet. rebound-ops CLI'dan bağımsızdır ve ücretsiz ve yerel modellerde çalışır (OpenRouter ücretsiz modelleri, Ollama veya herhangi bir OpenAI uyumlu uç nokta), bu yüzden ücretli bir aboneliğe bağlı değilsin. Tam kurulum için bkz. [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md).

**Claude Pro/Max için ödeme yapıyorum ama rebound-ops API kredisi harcıyor. Neden?**
Çünkü ortamındaki `ANTHROPIC_API_KEY`, oturum açtığın aboneliğe göre önceliklidir: CLI anahtarı kullanır ve token başına faturalandırır. `echo $ANTHROPIC_API_KEY` çalıştır; bir şey yazdırıyorsa kabuk profilinden kaldır, terminali yeniden başlat ve `/login` çalıştır. Toplu mod istisnadır, çünkü `claude -p` işçileri etkileşimli oturum açmayı kullanmaz: bir kez `claude setup-token` çalıştır ve sonucu `CLAUDE_CODE_OAUTH_TOKEN` olarak dışa aktar. Tam anlatım [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it) içinde.

**rebound-ops hangi yapay zekâ CLI'larıyla çalışır?**
rebound-ops, açık Agent Skill Standard üzerinden başlıca tüm yapay zekâ kodlama CLI'larında (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen ve daha fazlası) çalışır; bu yüzden asla tek bir tedarikçiye kilitlenmez. Zaten sahip olduğun CLI'ı kullan.

**rebound-ops'u Windows'a nasıl kurarım?**
rebound-ops Windows'ta çalışır. Platforma özel kurulum ve bilinen pürüzler (Git Bash keşfi, satır sonları, Görev Zamanlayıcı) [docs/WINDOWS.md](docs/WINDOWS.md) içinde. Kurulum sırasında beceriler sembolik bağ hatasıyla yüklenmezse çözüm [docs/FAQ.md](docs/FAQ.md) içinde. Tam adımlar [docs/SETUP.md](docs/SETUP.md) içinde.

**rebound-ops benim yerime otomatik başvuru yapar mı?**
Hayır. rebound-ops bir filtredir, rastgele başvuru yağdıran bir otomatik başvurucu değil. Yapay zekâ değerlendirir, sıralar ve taslak yazar; sen gözden geçirir ve karar verirsin. Taslakları hazırlar ve alanları doldurur; asla göndermez. Gönder'e sen basarsın. Bu insan-döngüde tasarımı meselenin özüdür.

**rebound-ops ücretsiz ve açık kaynak mı?**
Evet. rebound-ops ücretsiz ve açık kaynaktır ve aday için her zaman öyle kalacaktır. [ReboundOps Manifestosu](https://github.com/AnkitParekh007/rebound-ops)'nun ilk referans uygulamasıdır. Oku ve inandığın şeyi söylüyorsa imzala.

## Sorumluluk Reddi

**rebound-ops yerel, açık kaynaklı bir araçtır, barındırılan bir hizmet DEĞİLDİR.** Bu yazılımı kullanarak şunları kabul edersin:

1. **Verilerini sen kontrol edersin.** CV'n, iletişim bilgilerin ve kişisel verilerin makinende kalır ve doğrudan seçtiğin yapay zekâ sağlayıcısına (Anthropic, OpenAI vb.) gönderilir. Verilerinin hiçbirini toplamayız, saklamayız ve bunlara erişimimiz yoktur.
2. **Yapay zekâyı sen kontrol edersin.** Varsayılan prompt'lar yapay zekâya başvuruları otomatik göndermemesini söyler, ancak yapay zekâ modelleri öngörülemez davranabilir. Prompt'ları değiştirir veya farklı modeller kullanırsan bunu kendi riskinle yaparsın. **Göndermeden önce yapay zekâ tarafından üretilen içeriğin doğruluğunu her zaman kontrol et.**
3. **Üçüncü taraf hizmet şartlarına sen uyarsın.** Bu aracı etkileşimde bulunduğun kariyer portallarının (Greenhouse, Lever, Workday, LinkedIn vb.) Hizmet Şartlarına uygun kullanmalısın. Bu aracı işverenlere spam göndermek veya ATS sistemlerini boğmak için kullanma.
4. **Garanti yoktur.** Değerlendirmeler öneridir, gerçek değil. Yapay zekâ modelleri beceri veya deneyim uydurabilir. Yazarlar istihdam sonuçlarından, reddedilen başvurulardan, hesap kısıtlamalarından veya başka herhangi bir sonuçtan sorumlu değildir.

Tüm ayrıntılar için bkz. [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md). Bu yazılım [MIT Lisansı](LICENSE) altında "olduğu gibi", hiçbir garanti olmaksızın sağlanır.

## License

MIT — see [LICENSE](LICENSE). This folder is derived from third-party MIT-licensed software; the original notices are reproduced in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
