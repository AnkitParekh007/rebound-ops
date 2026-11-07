# ReboundOps engine

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## rebound-ops आपके लिए क्या करता है

एक नौकरी पेस्ट करें। यह बताता है कि वह रात लगाने लायक है या नहीं।

- **अभी भी खुली है?** आपके एक शब्द लिखने से पहले ही यह जाँच लेता है कि पोस्टिंग अभी भी लाइव है।
- **आप नहीं?** यह आपके असली CV के मुकाबले रोल को स्कोर करता है और कमज़ोर फ़िट को छोड़ने को कहता है। आप इसे ओवरराइड कर सकते हैं।
- **करने लायक?** यह CV, कवर लेटर और जवाबों का ड्राफ़्ट बनाता है। आप उन्हें पढ़ते हैं। आप उन्हें भेजते हैं।
- **किससे बात करूँ?** यह सही व्यक्ति ढूँढता है और संदेश का ड्राफ़्ट बनाता है। इसे कभी भेजता नहीं।
- **यह सब जाता कहाँ है?** हर आवेदन आपकी मशीन पर रहता है। हमारे पास कुछ भी अपलोड नहीं होता।
- **मुझे क्या सीखना चाहिए?** लगातार कई "ना" के बाद, यह कमी का नाम बताता है।

शुरुआती रन खुरदुरे होते हैं। यह अभी आपको जानता नहीं। इससे बात करें: आपका CV, आप क्या चाहते हैं, क्या नहीं। इसे एक रिक्रूटर का पहला हफ़्ता समझें।

पहली बार चलाने पर यह सब कुछ चैट में पूछ लेता है। हाथ से कुछ भी कॉन्फ़िगर नहीं करना।

## rebound-ops क्या नहीं करता

- **आवेदन अपने आप सबमिट करना।** यह हर फ़ील्ड के जवाब का ड्राफ़्ट बनाता है; आप जाँचते हैं और Submit दबाते हैं। स्क्रिप्ट कभी POST नहीं करती (`prepare-application.mjs`)।
- **ईमेल भेजना।** सिर्फ़ ड्राफ़्ट। इस पूरे कोडबेस में कहीं भी मेल भेजने का कोई ज़रिया नहीं है।
- **बाहर डेटा भेजना।** कोई टेलीमेट्री नहीं, हमारा कोई बैकएंड नहीं। आपका CV आपकी मशीन से सीधे आपके चुने हुए AI प्रोवाइडर तक जाता है, और कहीं नहीं। एकमात्र सार्वजनिक रिकॉर्ड यही रिपॉज़िटरी है: `HIRED.md` और इसके issues।
- **4.0/5 से नीचे आवेदन के लिए धकेलना।** यह आपको मना करेगा। आप इसे नज़रअंदाज़ कर सकते हैं, और यह बता देगा।

यह आपके CV को दोबारा लिखता है; उसे कभी गढ़ना नहीं चाहिए। कोड में एक जाँच ऐसी PDF को रोक देती है जिसके आँकड़े या तथ्य न आपके CV में हैं, न आपके article digest में, लेकिन दोबारा लिखे गए हर वाक्य को यह अभी नहीं परख सकती। भेजने से पहले हर CV पढ़ें। विवरण [FAQ](#अक्सर-पूछे-जाने-वाले-प्रश्न-faq) में।

## Features

| Feature                  | विवरण                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H मूल्यांकन**        | भूमिका सारांश, CV मैच (इस पोस्टिंग के लिए हर आवश्यकता कितनी मायने रखती है, और वह वज़न JD के अपने शब्दों से आया, उसकी संरचना से या अनुमान से, हर आवश्यकता पर लेबल के साथ; अनुमान कभी सबसे ऊपरी बैंड में नहीं हो सकता), लेवल रणनीति, वेतन रिसर्च, व्यक्तिगतकरण, इंटरव्यू तैयारी (STAR+R), साथ में ब्लॉक G की पोस्टिंग-वैधता जाँच (क्या यह अभी भी खुली है, क्या यह रीपोस्ट है: अवलोकन, फ़ैसले नहीं), और एक वर्क-ऑथ संकेत जो स्पष्ट रूप से नो-स्पॉन्सरशिप वाली JD को हार्ड ब्लॉकर के रूप में चिह्नित करता है |
| **Human-in-the-Loop**    | AI मूल्यांकन और सिफ़ारिश करता है, आप फ़ैसला लेते और काम करते हैं। सिस्टम कभी आवेदन सबमिट नहीं करता: अंतिम फ़ैसला हमेशा आपका है <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS PDF जनरेशन**       | ATS के पढ़ने लायक CV, आपके अपने अनुभव से हर JD के हिसाब से ढाले गए, Space Grotesk + DM Sans डिज़ाइन में                                   |
| **कवर लेटर जनरेटर**      | रिसर्च-आधारित कवर लेटर: कीवर्ड मिररिंग, चार इंटरैक्टिव एंगल प्रॉम्प्ट (क्यों/समस्याएँ/तरीक़ा/लहजा), चैट में ड्राफ़्ट अप्रूवल गेट, और CV वाली ही HTML + Playwright पाइपलाइन से A4 PDF। हर मूल्यांकन पर अपने आप ड्राफ़्ट बनाता है; `/rebound-ops cover` से ज़रूरत पर पूरा करें और जनरेट करें |
| **CV से आगे**            | कंपनी रिसर्च ([`deep`](modes/deep.md)) AI रणनीति, हाल के क़दम, इंजीनियरिंग संस्कृति और वह कोण सामने लाती है जो आपकी प्रोफ़ाइल को लेना चाहिए। कॉन्टैक्ट डिस्कवरी ([`contacto`](modes/contacto.md)) उस हायरिंग मैनेजर, रिक्रूटर या टीम साथी की पहचान करती है जिससे संपर्क करना सार्थक है और हर संपर्क-प्रकार के हिसाब से ≤300 अक्षरों का LinkedIn संदेश ड्राफ़्ट करती है। औपचारिक आवेदन ईमेल ड्राफ़्ट ([`email`](modes/email.md)) मूल्यांकित रिपोर्ट या पेस्ट की गई JD को विषय पंक्ति, मुख्य भाग और अटैचमेंट चेकलिस्ट में बदलते हैं, बिना कुछ भेजे, सबमिट किए या क्लिक किए। आवेदन आपको कतार में लगाता है; रिसर्च आपको बातचीत दिलाती है। |
| **पैटर्न विश्लेषण**      | रिजेक्शन पैटर्न और प्रति-ATS-चैनल आगे बढ़ने की दर (`analyze-patterns.mjs`), पूरी खोज के फ़नल आँकड़े (`stats.mjs`), रीपोस्ट हुई नौकरियों की पहचान, जो ghost job का संकेत हो सकती हैं (`detect-reposts.mjs`) |

<details>
<summary><b>बाकी सब जो यह करता है</b></summary>

| Feature                  | विवरण                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-Pipeline**        | एक URL पेस्ट करें, पूरा मूल्यांकन + PDF + ट्रैकर एंट्री पाएँ                                                                              |
| **इंटरव्यू स्टोरी बैंक** | मूल्यांकनों के दौरान STAR+Reflection कहानियाँ जमा करता है: 5-10 मास्टर कहानियाँ, जिन्हें आप सामने आने वाले व्यवहारिक सवालों के हिसाब से ढाल सकते हैं |
| **नेगोशिएशन स्क्रिप्ट**  | वेतन बातचीत के फ़्रेमवर्क, भौगोलिक कटौती का जवाब, प्रतिस्पर्धी ऑफ़र का लाभ                                                                |
| **आवेदन ईमेल ड्राफ़्ट**  | रिपोर्ट या पेस्ट की गई JD से रिक्रूटर/रेफ़रल/कोल्ड आवेदन के औपचारिक ईमेल, विषय पंक्ति, अटैचमेंट चेकलिस्ट, स्रोत-समर्थित फ़िट पॉइंट और प्रोफ़ाइल-आधारित संपर्क ब्लॉक के साथ। सिर्फ़ ड्राफ़्ट: rebound-ops कभी कुछ भेजता, सबमिट करता या क्लिक नहीं करता। |
| **पोर्टल स्कैनर**        | 100+ कंपनियाँ पहले से कॉन्फ़िगर (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + Ashby, Greenhouse, Lever, Wellfound पर कस्टम वेब-सर्च क्वेरी |
| **फ़ंडेड कंपनी डिस्कवरी** | रिव्यू-फ़र्स्ट `company:funded` कमांड संरचित सार्वजनिक फ़ीड से हाल में फ़ंड पाई कंपनियाँ और स्रोत डायग्नोस्टिक्स दिखाता है, आपका डेटा छुए बिना |
| **बैच प्रोसेसिंग**       | हेडलेस CLI वर्कर्स (`claude -p` / `opencode run`) के साथ समानांतर मूल्यांकन                                                               |
| **Dashboard TUI**        | अपनी पाइपलाइन ब्राउज़, फ़िल्टर और सॉर्ट करने के लिए टर्मिनल UI                                                                            |
| **पाइपलाइन इंटीग्रिटी**  | स्वचालित मर्ज, डीडुप, स्टेटस नॉर्मलाइज़ेशन, हेल्थ चेक                                                                                     |
| **इंटरव्यू सूट**         | समय-खंडों में तैयारी योजनाएँ, फ़ीडबैक के साथ अभ्यास सत्र, इंटरव्यू के बाद डीब्रीफ़ ([`interview/`](modes/interview/README.md)), और कंपनी रेड-फ़्लैग डिटेक्टर ([`interview-redflag`](modes/interview-redflag.md)) |
| **ऑफ़र स्टेज**           | कॉन्ट्रैक्ट पढ़ने का साथी: धारा-दर-धारा समीक्षा और वकील के लिए सवालों की सूची ([`offer-prep`](modes/offer-prep.md)), और वांछित/विज्ञापित/वास्तविक वेतन-अंतर विश्लेषक (`salary-gap.mjs`) |
| **फ़ॉलो-अप और जवाब**     | फ़ॉलो-अप कैडेंस कैलकुलेटर और पहले से तय रिमाइंडर (`followup-cadence.mjs`, `followup-seed.mjs`); नियोक्ता के जवाबों को ट्रैकर अपडेट में वर्गीकृत करना ([`reply-watch`](modes/reply-watch.md)) |
| **प्लगइन सिस्टम**        | वैकल्पिक इंटीग्रेशन (Gmail, Notion, Apify + एक कम्युनिटी रजिस्ट्री), डिफ़ॉल्ट रूप से बंद; देखें [docs/PLUGINS.md](docs/PLUGINS.md)         |

</details>

## Quick Start

**सबसे तेज़ तरीक़ा, एक ही कमांड से:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` [Node.js](https://nodejs.org) के साथ आता है: यह इंस्टॉलर एक बार चलाता है,
> बिना कुछ ग्लोबली इंस्टॉल किए। अभी Node नहीं है? पहले उसे इंस्टॉल करें।
> (पहले से Claude Code / Codex CLI इस्तेमाल कर रहे हैं? तो आपके पास पहले से है।)

यह नवीनतम रिलीज़ को `./rebound-ops` में क्लोन करता है और डिपेंडेंसी इंस्टॉल करता है। फिर:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**पहली बार लॉन्च पर rebound-ops सिर्फ़ चैट करके आपको सेटअप कराता है: आपका CV, प्रोफ़ाइल और लक्षित भूमिकाएँ। हाथ से कुछ भी संपादित नहीं करना।**

<details>
<summary><b>हाथ से सेटअप करना पसंद करेंगे? (git clone)</b></summary>

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

### ग्लोबल इंस्टॉल

```bash
npm i -g ./engine/scaffolder
```

यह `rebound-ops` बाइनरी को ग्लोबली इंस्टॉल करता है ताकि आप `npx` के बिना `rebound-ops init [folder]` चला सकें। `init` इसकी इकलौती कमांड है: यह एक वर्कस्पेस तैयार करती है, और उसके बाद का सारा काम आपकी AI कोडिंग CLI के अंदर होता है (नीचे Usage देखें), इस बाइनरी के ज़रिए नहीं।

**कौन सा इस्तेमाल करें?**
- `node engine/scaffolder/bin/cli.mjs init`: पहली बार के लिए सबसे अच्छा; एक अलग प्रोजेक्ट फ़ोल्डर बनाता है।
- `npm i -g ./engine/scaffolder`: अगर आप `npx` वाले रूप के बजाय `rebound-ops init` टाइप करना पसंद करते हैं। यह कोई और कमांड नहीं जोड़ता।

> **यह सिस्टम इसलिए बना है कि आपकी AI कोडिंग CLI ख़ुद इसे अनुकूलित करे।** मोड, आर्कटाइप, स्कोरिंग वज़न, नेगोशिएशन स्क्रिप्ट: बस उससे बदलने को कहें। यह वही फ़ाइलें पढ़ती है जो इस्तेमाल करती है, इसलिए उसे ठीक पता है कि क्या संपादित करना है।

पूरी सेटअप गाइड के लिए [docs/SETUP.md](docs/SETUP.md) देखें, कस्टम या लोकल मॉडल से rebound-ops को सस्ते में चलाने के निर्देशों के लिए [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) (और Antigravity CLI के फ़्री टियर पर बिना लागत चलाने के लिए [docs/FREE_TIER.md](docs/FREE_TIER.md)), बार-बार स्कैन शेड्यूल करने और ज़ीरो-टोकन ट्राइएज-से-शॉर्टलिस्ट रेसिपी के लिए [docs/AUTOMATION.md](docs/AUTOMATION.md), ATS ऑटो-फ़िल फ़्लो के विवरण के लिए [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md), अपने LinkedIn कनेक्शन एक्सपोर्ट को फ़नल की कंपनियों से मिलाने के लिए [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md), और आम सेटअप सवालों के जवाबों के लिए [docs/FAQ.md](docs/FAQ.md), जिसमें [स्टोरी प्रोवेनेंस कैसे गढ़ी हुई संख्याओं को रोकती है](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank) भी शामिल है। डिज़ाइन सिद्धांत [ARCHITECTURE.md](ARCHITECTURE.md) में हैं; रनटाइम फ़्लो [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) में।

## Usage

rebound-ops एक साझा कमांड राउटर इस्तेमाल करता है। जो CLI स्लैश कमांड रजिस्टर करती हैं, उनमें यह ऐसा दिखता है:

```
/rebound-ops           → सभी उपलब्ध कमांड दिखाएँ
/rebound-ops {JD}      → AUTO-PIPELINE: मूल्यांकन + रिपोर्ट + PDF + ट्रैकर (टेक्स्ट या URL पेस्ट करें)
/rebound-ops pipeline  → इनबॉक्स के लंबित URL प्रोसेस करें (data/pipeline.md)
/rebound-ops oferta    → सिर्फ़ मूल्यांकन, ब्लॉक A से H (ऑटो PDF नहीं)
/rebound-ops ofertas   → कई ऑफ़र की तुलना और रैंकिंग
/rebound-ops contacto  → LinkedIn पावर मूव: संपर्क ढूँढें + संदेश ड्राफ़्ट करें
/rebound-ops deep      → कंपनी पर गहन रिसर्च प्रॉम्प्ट
/rebound-ops interview-prep → कंपनी-विशिष्ट इंटरव्यू तैयारी दस्तावेज़ बनाएँ
/rebound-ops interview    → इंटरैक्टिव प्रोफ़ाइल/CV ऑनबोर्डिंग इंटरव्यू
/rebound-ops master-profile → अपना Master Career Profile इम्पोर्ट करें, उसकी समीक्षा करें और उसे सत्यापित करें
/rebound-ops eu-swe    → CV/apply/interview से पहले यूरोपीय SWE आवेदन कैलिब्रेट करें
/rebound-ops interview/plan → आने वाले इंटरव्यू के लिए समय-खंडों में तैयारी योजना
/rebound-ops interview/practice → अभ्यास इंटरव्यू, फ़ीडबैक के साथ एक बार में एक सवाल
/rebound-ops interview/debrief → इंटरव्यू के बाद डीब्रीफ़: कमियाँ भरें, अगले राउंड का अनुमान लगाएँ
/rebound-ops interview-redflag → कंपनी जॉइन करने से पहले नियोक्ता के चेतावनी संकेत जाँचें
/rebound-ops pdf       → सिर्फ़ PDF, ATS-अनुकूलित CV
/rebound-ops text      → अनुकूलित markdown CV (cv.md को दर्शाता है, PDF नहीं)
/rebound-ops latex     → CV को LaTeX/Overleaf .tex में एक्सपोर्ट करें
/rebound-ops latex-tex → अपनी resume.tex को वहीं अनुकूलित करें (वैकल्पिक; cv.md डिफ़ॉल्ट रहता है)
/rebound-ops cover     → कवर लेटर: अकेली JD पेस्ट या /rebound-ops cover {slug}
/rebound-ops email     → औपचारिक आवेदन ईमेल ड्राफ़्ट (सिर्फ़ ड्राफ़्ट; कभी भेजता, सबमिट या क्लिक नहीं करता)
/rebound-ops add       → अपने CV में प्रोजेक्ट/पेपर/भूमिका जोड़ें (फ़ेच + प्रीव्यू + पुष्टि)
/rebound-ops expand    → प्रोफ़ाइल लिंक से छूटी हुई दक्षताएँ अपने आप खोजें और जोड़ें
/rebound-ops training  → कोर्स/सर्टिफ़िकेट को North Star के मुक़ाबले परखें
/rebound-ops project   → पोर्टफ़ोलियो प्रोजेक्ट आइडिया परखें
/rebound-ops tracker   → आवेदन स्थिति का सारांश
/rebound-ops agent-inbox → अगले सत्र के लिए अनुरोध कतार में डालें/निकालें (data/agent-inbox.md)
/rebound-ops apply     → लाइव आवेदन सहायक (फ़ॉर्म पढ़ता है + जवाब बनाता है)
/rebound-ops scan      → पोर्टल स्कैन करें और नए ऑफ़र खोजें
/rebound-ops discover  → कंपनी सूची को स्कैन योग्य ATS बोर्ड में बदलें + portals.yml में जोड़ें (ज़ीरो-टोकन)
/rebound-ops batch     → समानांतर वर्कर्स के साथ बैच प्रोसेसिंग
/rebound-ops patterns  → रिजेक्शन पैटर्न जाँचें और टार्गेटिंग सुधारें
/rebound-ops offer-prep → मिले हुए ऑफ़र/कॉन्ट्रैक्ट को उम्मीदवार के साथ पढ़ें: धारा-दर-धारा + वकील के लिए सवाल (क़ानूनी सलाह नहीं)
/rebound-ops titles    → खोज बढ़ाने के लिए आपके CV से मिलते-जुलते जॉब टाइटल सुझाएँ
/rebound-ops upskill   → आपकी मूल्यांकित रिपोर्टों से समग्र स्किल-गैप विश्लेषण
/rebound-ops followup  → फ़ॉलो-अप कैडेंस ट्रैकर: लंबित चिह्नित करें, ड्राफ़्ट बनाएँ
/rebound-ops reply-watch → नियोक्ता के जवाब वर्गीकृत करें और ट्रैकर अपडेट सुझाएँ
/rebound-ops outcome   → आवेदन का नतीजा दर्ज करें और आर्टिफ़ैक्ट संग्रहित करें
/rebound-ops calibrate → सलाहकारी रिपोर्ट: क्या आपके मूल्यांकन स्कोर असली नतीजों की भविष्यवाणी करते हैं? /outcome डेटा पढ़ता है; स्कोरिंग कभी नहीं बदलता
/rebound-ops update    → diff प्रीव्यू + संगतता जाँच के साथ rebound-ops सिस्टम फ़ाइलें अपडेट करें
```

या बस कोई जॉब URL या विवरण सीधे पेस्ट करें: rebound-ops उसे अपने आप पहचान लेता है और पूरी पाइपलाइन चलाता है।

Codex में स्लैश कमांड की गारंटी नहीं है। इसके बजाय प्रॉम्प्ट में वही मोड नाम इस्तेमाल करें, या उन्हें `codex exec` से कॉल करें।

## यह कैसे काम करता है

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity CLI Integration

rebound-ops Antigravity CLI को नेटिव रूप से सपोर्ट करता है, ठीक वैसे ही जैसे Claude Code और OpenCode को। सभी स्लैश कमांड साझा स्किल एंट्रीपॉइंट से उपलब्ध हैं, उसी `modes/*.md` मूल्यांकन लॉजिक के साथ।

Google ने उपभोक्ता Gemini CLI एक्सेस को Antigravity CLI में स्थानांतरित कर दिया है। `GEMINI.md` अब एक निष्क्रिय संगतता गार्ड है ताकि Antigravity `AGENTS.md` और `GEMINI.md` दोनों पढ़ते समय पूरे प्रोजेक्ट निर्देश दोहराए नहीं।

### नेटिव Antigravity CLI

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

स्किल ओपन स्टैंडर्ड के अनुसार `.agents/skills/rebound-ops/SKILL.md` में परिभाषित है और हर सपोर्टेड CLI (जैसे `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`) के लिए सिमलिंक या रेफ़रेंस की गई है। Cursor अपने आप `.agents/skills/` में साझा स्किल खोज लेता है।

## Codex Integration

rebound-ops Codex को उसी साझा राउटर से सपोर्ट करता है, लेकिन इनवोकेशन मॉडल उन CLI से अलग है जो स्लैश कमांड अपने आप रजिस्टर करती हैं। पूरी गाइड के लिए [docs/CODEX.md](docs/CODEX.md) देखें।

### इंटरैक्टिव Codex

```bash
cd rebound-ops
codex
```

Codex में स्लैश कमांड की गारंटी नहीं है। अगर `/rebound-ops` उपलब्ध नहीं है, तो Codex से सादी भाषा में मोड सीधे चलाने को कहें:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### वन-शॉट Codex (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok Build CLI Integration

rebound-ops Grok Build CLI को नेटिव रूप से सपोर्ट करता है, ठीक वैसे ही जैसे Claude Code और OpenCode को। `AGENTS.md` प्रोजेक्ट नियमों के रूप में अपने आप लोड होता है, और सभी स्लैश कमांड साझा स्किल एंट्रीपॉइंट से उपलब्ध हैं।

### नेटिव Grok Build CLI

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

हेडलेस बैच वर्कर्स के लिए `grok -p "prompt"` इस्तेमाल करें (टूल एक्ज़ीक्यूशन को अपने आप मंज़ूर करने के लिए `--yolo` जोड़ें)।

## Pi Integration

rebound-ops [Pi](https://github.com/earendil-works/pi) को नेटिव रूप से सपोर्ट करता है, और कोई रैपर फ़ाइल मेंटेन नहीं करनी पड़ती: Pi रिपॉज़िटरी रूट की `AGENTS.md` को प्रोजेक्ट संदर्भ के रूप में पढ़ता है और `.agents/skills/rebound-ops/SKILL.md` में मौजूद साझा स्किल को ख़ुद खोज लेता है। इसके बाद राउटर `/skill:rebound-ops` के रूप में उपलब्ध होता है।

### नेटिव Pi

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

### वन-शॉट Pi (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

अगर Pi का कोई बिल्ड प्रोजेक्ट संसाधनों को भरोसे के फ़ैसले के पीछे रखता है, तो रिपॉज़िटरी के अंदर एक बार `/trust` चलाएँ और `pi` को दोबारा शुरू करें ताकि प्रोजेक्ट स्किल लोड हो जाए (`/trust` आगे के Pi प्रोसेस पर लागू होता है), या `-a` के साथ शुरू करें, जो सिर्फ़ एक रन पर भरोसा करता है और उसमें रीस्टार्ट की ज़रूरत नहीं होती।

### स्टैंडअलोन Gemini API स्क्रिप्ट (CLI इंस्टॉल की ज़रूरत नहीं)

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

> **फ़्री टियर:** दोनों विकल्प बिना बिलिंग के काम करते हैं। नेटिव CLI Google OAuth इस्तेमाल करती है; API स्क्रिप्ट `gemini-3.6-flash` इस्तेमाल करती है (रेट लिमिट मॉडल और टियर पर निर्भर है; मौजूदा कोटा के लिए Google AI दस्तावेज़ देखें)।

## Pre-configured Portals

स्कैनर **100+ कंपनियों** के साथ आता है जो स्कैन के लिए तैयार हैं और प्रमुख जॉब बोर्ड्स पर **35+ सर्च क्वेरी** के साथ। `templates/portals.example.yml` को `portals.yml` में कॉपी करें और अपनी जोड़ें:

**AI Labs:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Voice AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI Platforms:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Contact Center:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automation:** n8n, Zapier, Make.com
**European:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**खोजे जाने वाले जॉब बोर्ड:** 55+ प्रोवाइडर मॉड्यूल ATS API, बोर्ड-व्यापी फ़ीड, XML/RSS फ़ीड, markdown फ़ीड और लोकल पार्सर कवर करते हैं। पूरी तालिका के लिए [Supported job boards](docs/SUPPORTED_JOB_BOARDS.md) देखें।

डिफ़ॉल्ट रूप से `node scan.mjs` (यानी `npm run scan`) हर ATS फ़ीड जो लौटाती है उस पर भरोसा करता है। कुछ कंपनियाँ भूमिका बंद होने के बाद भी पुरानी पोस्टिंग अपने सार्वजनिक API में छोड़ देती हैं, इसलिए वे समाप्त एंट्रियाँ `pipeline.md` में लीक हो सकती हैं। API पास के बाद Playwright चलाने और समाप्त पोस्टिंग को पाइपलाइन में पहुँचने से पहले हटाने के लिए `--verify` दें:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

सत्यापन क्रमिक है और सिर्फ़ नए ऑफ़र पर (डीडुप के बाद) चलता है, इसलिए लागत सीमित रहती है।

## Dashboard TUI

बिल्ट-इन टर्मिनल डैशबोर्ड आपको अपनी पाइपलाइन विज़ुअली ब्राउज़ करने देता है:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Features: 10 फ़िल्टर टैब, 8 सॉर्ट मोड, ग्रुप्ड/फ़्लैट व्यू, लेज़ी-लोडेड प्रीव्यू, इनलाइन स्टेटस बदलाव।

एक **प्रायोगिक वेब UI** भी है (अल्फ़ा और वैकल्पिक: जब तक आप शुरू न करें, कुछ नहीं चलता): [`web/README.md`](web/README.md) देखें।

## Project Structure

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

## बाहरी डेटा डायरेक्टरी (वैकल्पिक)

डिफ़ॉल्ट रूप से, यूज़र-लेयर डेटा (जैसे `cv.md`, `portals.yml`, और `data/` / `reports/` / `output/` फ़ोल्डर) प्रोजेक्ट रूट फ़ोल्डर के अंदर रहता है।

अपना व्यक्तिगत डेटा कोड से अलग रखने के लिए (ब्रांच बदलना, अपडेट खींचना या कई प्रोफ़ाइल आज़माना आसान हो जाता है), आप इस प्राथमिकता क्रम से एक बाहरी डेटा डायरेक्टरी कॉन्फ़िगर कर सकते हैं:

1. **एनवायरनमेंट वेरिएबल:** `REBOUND_OPS_ROOT` या `REBOUND_OPS_DATA_DIR` एनवायरनमेंट वेरिएबल सेट करें:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **मार्कर फ़ाइल:** रिपॉज़िटरी रूट में एक `.rebound-ops-data` फ़ाइल बनाएँ जिसमें आपकी डेटा डायरेक्टरी का पाथ हो।
3. **डिफ़ॉल्ट:** रिपॉज़िटरी रूट।

तय हो जाने के बाद, सभी यूज़र फ़ाइलें उसी फ़ोल्डर के सापेक्ष पढ़ी और लिखी जाती हैं, जबकि प्रॉम्प्ट फ़ाइलें और स्क्रिप्ट रिपॉज़िटरी के सापेक्ष ही रहती हैं।

- **ट्रैकर ओवरराइड:** आप `REBOUND_OPS_TRACKER` सेट करके आवेदन ट्रैकर फ़ाइल का पाथ सीधे भी बदल सकते हैं।
- **लेखन:** सभी लेखन ऑपरेशन (जैसे मर्ज) प्रामाणिक रूप से `{DATA_ROOT}/data/applications.md` को लक्षित करते हैं।
- **स्कैनर कॉन्फ़िग:** `portals.yml` को `{DATA_ROOT}/portals.yml` पर पढ़ा और सत्यापित किया जाता है, इसलिए `node validate-portals.mjs` वही फ़ाइल जाँचता है जो `scan.mjs` पढ़ता है।
- **बनाए गए दस्तावेज़:** अनुकूलित CV और कवर लेटर `{DATA_ROOT}/output/` के अंदर लिखे जाते हैं, और उन्हें किसी रिपोर्ट से जोड़ने वाला PDF मैनिफ़ेस्ट `{DATA_ROOT}/data/pdf-index.tsv` में रहता है। जब तक `REBOUND_OPS_TRACKER` सेट नहीं है, इन लेखनों की सीमा तय करने वाला ट्रैकर वर्कस्पेस डेटा रूट है, चेकआउट नहीं।
- **ट्रैकर ओवरराइड के साथ PDF:** `generate-pdf.mjs` वर्कस्पेस तय करने से पहले `REBOUND_OPS_TRACKER` को रिज़ॉल्व करता है, इसलिए ओवरराइड सेट होने पर वर्कस्पेस वह फ़ोल्डर होता है जिसमें वह ट्रैकर है (या उसके ऊपर वाला फ़ोल्डर, जब ट्रैकर किसी `data/` फ़ोल्डर में हो)। तब CV का HTML और हर PDF उसी वर्कस्पेस के अंदर होने चाहिए, और मैनिफ़ेस्ट उसकी `data/pdf-index.tsv` में चला जाता है। कवर लेटर अब भी `{DATA_ROOT}/output/` को ही लक्षित करते हैं, इसलिए जब वह फ़ोल्डर ट्रैकर के वर्कस्पेस से बाहर हो, तो उन्हें अस्वीकार कर दिया जाता है।
- **कोड लेयर अपनी जगह रहती है:** `node_modules/`, `providers/`, `modes/` और ख़ुद स्क्रिप्ट हमेशा रिपॉज़िटरी के सापेक्ष रिज़ॉल्व होते हैं, डेटा रूट के सापेक्ष कभी नहीं।

Go डैशबोर्ड TUI, Node.js स्क्रिप्ट और AI एजेंट मोड सभी इस रेज़ोल्यूशन क्रम का अपने आप पालन करते हैं।


## Tech Stack

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **एजेंट**: साझा स्किल और मोड के साथ AI कोडिंग CLI (`AGENTS.md` + CLI रैपर)
- **PDF**: Playwright + HTML टेम्पलेट
- **कवर लेटर**: HTML टेम्पलेट + Playwright (A4 PDF, CV वाली ही पाइपलाइन)
- **स्कैनर**: Playwright + Greenhouse API + WebSearch
- **डैशबोर्ड**: Go + Bubble Tea + Lipgloss (Catppuccin Mocha थीम)
- **डेटा**: Markdown तालिकाएँ + YAML कॉन्फ़िग + TSV बैच फ़ाइलें

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>एजेंट स्किल मानक वाले किसी भी CLI पर भी चलता है। देखें <a href="docs/SUPPORTED_CLIS.md">समर्थित CLI</a>।</sub><br>
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

## अक्सर पूछे जाने वाले प्रश्न (FAQ)

**rebound-ops क्या है?**
**क्या अनुकूलित CV कुछ गढ़ सकता है?**
नहीं गढ़ना चाहिए, और प्रॉम्प्ट यही कहते हैं: दोबारा लिखो, कभी गढ़ो मत। `generate-pdf` ऐसे CV को रोक देता है जिसके आँकड़े या तथ्य आपके स्रोतों में नहीं हैं, जब तक आप `--skip-fact-check` न दें। `pdf` मोड `cv-title-check.mjs` भी चलाता है, जो अनुकूलित CV के हर पद के नाम की तुलना उसी नौकरी के लिए cv.md में दिए पद के नाम से करता है (कंपनी और तारीखों से मिलाकर), और जो भी अलग हो उसे रखने या वापस बदलने के बारे में आपसे पूछता है। यह सिर्फ़ चेतावनी देता है, रोकता नहीं, क्योंकि पद के नाम को अलग ढंग से लिखना कभी-कभी आपका फ़ैसला होता है। दोबारा लिखे गए शब्दों को अभी कुछ भी नहीं परखता: [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (सत्यता जाँच जो विफल होने पर रोक दे) इसे ट्रैक करता है। तब तक, भेजने से पहले हर CV पढ़ें। [क़ानूनी अस्वीकरण](LEGAL_DISCLAIMER.md) यही बात ज़्यादा शब्दों में कहता है।

**क्या मैं rebound-ops मुफ़्त में, या सस्ते / लोकल मॉडल पर चला सकता हूँ?**
हाँ। rebound-ops CLI-निरपेक्ष है और मुफ़्त और लोकल मॉडल पर चलता है (OpenRouter के मुफ़्त मॉडल, Ollama, या कोई भी OpenAI-संगत एंडपॉइंट), इसलिए आप किसी पेड सब्सक्रिप्शन से बँधे नहीं हैं। पूरे सेटअप के लिए [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) देखें।

**मैं Claude Pro/Max के लिए भुगतान करता हूँ लेकिन rebound-ops API क्रेडिट खा रहा है। क्यों?**
क्योंकि आपके एनवायरनमेंट में मौजूद `ANTHROPIC_API_KEY` आपके लॉग-इन सब्सक्रिप्शन पर वरीयता पाता है: CLI उस key का इस्तेमाल करती है और प्रति टोकन बिल करती है। `echo $ANTHROPIC_API_KEY` चलाएँ, और अगर कुछ छपे तो उसे अपनी शेल प्रोफ़ाइल से हटाएँ, टर्मिनल दोबारा शुरू करें और `/login` चलाएँ। बैच मोड अपवाद है, क्योंकि `claude -p` वर्कर्स इंटरैक्टिव लॉगिन इस्तेमाल नहीं करते: एक बार `claude setup-token` चलाएँ और नतीजे को `CLAUDE_CODE_OAUTH_TOKEN` के रूप में एक्सपोर्ट करें। पूरी प्रक्रिया [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it) में।

**rebound-ops किन AI CLI के साथ काम करता है?**
rebound-ops ओपन Agent Skill Standard के ज़रिए किसी भी प्रमुख AI कोडिंग CLI (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen और अन्य) पर चलता है, इसलिए यह कभी किसी एक वेंडर से बँधा नहीं है। जो CLI आपके पास पहले से है वही इस्तेमाल करें।

**Windows पर rebound-ops कैसे इंस्टॉल करूँ?**
rebound-ops Windows पर चलता है। प्लेटफ़ॉर्म-विशिष्ट सेटअप और ज्ञात दिक़्क़तें (Git Bash खोज, लाइन एंडिंग, Task Scheduler) [docs/WINDOWS.md](docs/WINDOWS.md) में हैं। अगर इंस्टॉल के दौरान symlink त्रुटि से स्किल लोड न हों, तो समाधान [docs/FAQ.md](docs/FAQ.md) में है। पूरे चरण [docs/SETUP.md](docs/SETUP.md) में हैं।

**क्या rebound-ops मेरे लिए नौकरियों में अपने आप आवेदन करता है?**
नहीं। rebound-ops एक फ़िल्टर है, अंधाधुंध ऑटो-आवेदन करने वाला टूल नहीं। AI मूल्यांकन, रैंकिंग और ड्राफ़्ट करता है; आप समीक्षा और फ़ैसला करते हैं। यह ड्राफ़्ट बनाता है और फ़ॉर्म भरता है; सबमिट कभी नहीं करता। आप Submit दबाते हैं। यही human-in-the-loop डिज़ाइन पूरी बात है।

**क्या rebound-ops मुफ़्त और ओपन सोर्स है?**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md).
## Disclaimer

**rebound-ops एक लोकल, ओपन सोर्स टूल है, होस्टेड सेवा नहीं।** इस सॉफ़्टवेयर का इस्तेमाल करके आप स्वीकार करते हैं:

1. **आपका डेटा आपके नियंत्रण में है।** आपका CV, संपर्क जानकारी और व्यक्तिगत डेटा आपकी मशीन पर रहता है और सीधे आपके चुने हुए AI प्रोवाइडर (Anthropic, OpenAI आदि) को भेजा जाता है। हम आपका कोई डेटा इकट्ठा, संग्रहित या एक्सेस नहीं करते।
2. **AI आपके नियंत्रण में है।** डिफ़ॉल्ट प्रॉम्प्ट AI को आवेदन अपने आप सबमिट न करने का निर्देश देते हैं, लेकिन AI मॉडल अप्रत्याशित व्यवहार कर सकते हैं। अगर आप प्रॉम्प्ट बदलते हैं या अलग मॉडल इस्तेमाल करते हैं, तो जोखिम आपका है। **सबमिट करने से पहले AI-जनित सामग्री की सटीकता हमेशा जाँचें।**
3. **तीसरे पक्ष की शर्तों का पालन आप करते हैं।** आपको यह टूल उन करियर पोर्टलों (Greenhouse, Lever, Workday, LinkedIn आदि) की सेवा शर्तों के अनुसार इस्तेमाल करना होगा जिनसे आप जुड़ते हैं। इस टूल का इस्तेमाल नियोक्ताओं को स्पैम करने या ATS सिस्टम पर बोझ डालने के लिए न करें।
4. **कोई गारंटी नहीं।** मूल्यांकन सिफ़ारिशें हैं, सत्य नहीं। AI मॉडल कौशल या अनुभव गढ़ सकते हैं। रोज़गार के नतीजों, अस्वीकृत आवेदनों, खाता प्रतिबंधों या किसी अन्य परिणाम के लिए लेखक ज़िम्मेदार नहीं हैं।

पूरे विवरण के लिए [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) देखें। यह सॉफ़्टवेयर [MIT लाइसेंस](LICENSE) के तहत "जैसा है" वैसा, बिना किसी वारंटी के दिया जाता है।

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
