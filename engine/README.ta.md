# ReboundOps engine

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## rebound-ops உங்களுக்காக என்ன செய்கிறது

ஒரு வேலையை ஒட்டுங்கள். அந்த இரவு அதற்குத் தகுமா என்று சொல்கிறது.

- **இன்னும் திறந்திருக்கிறதா?** நீங்கள் ஒரு வார்த்தை எழுதும் முன்பே, அந்த அறிவிப்பு இன்னும் செயலில் இருக்கிறதா என்று சரிபார்க்கிறது.
- **உங்களுக்கானது இல்லையா?** உங்கள் உண்மையான CV-க்கு எதிராகப் பணியை மதிப்பிட்டு, பொருத்தம் குறைவென்றால் தவிர்க்கச் சொல்கிறது. நீங்கள் அதை மீறலாம்.
- **தகுமா?** CV, கவர் லெட்டர், பதில்கள் ஆகியவற்றின் வரைவை எழுதுகிறது. நீங்கள் படிக்கிறீர்கள். நீங்கள் அனுப்புகிறீர்கள்.
- **யாரிடம் பேசுவது?** அந்த நபரைக் கண்டுபிடித்து, செய்தியின் வரைவை எழுதுகிறது. அதை ஒருபோதும் அனுப்புவதில்லை.
- **இவை எல்லாம் எங்கே போகின்றன?** ஒவ்வொரு விண்ணப்பமும் உங்கள் கணினியிலேயே இருக்கும். எங்களுக்கு எதுவும் பதிவேற்றப்படுவதில்லை.
- **நான் என்ன கற்க வேண்டும்?** தொடர்ந்து மறுப்புகள் வந்த பிறகு, குறை எது என்று பெயரிடுகிறது.

முதல் சில முறைகள் சொரசொரப்பாக இருக்கும். அது இன்னும் உங்களை அறியாது. அதனிடம் பேசுங்கள்: உங்கள் CV, நீங்கள் விரும்புவது, நீங்கள் மறுப்பது. ஒரு ரிக்ரூட்டரின் முதல் வாரம் என்று நினையுங்கள்.

முதல் முறை இயக்கும்போது இவை அனைத்தையும் சாட்டில் கேட்கிறது. கையால் அமைக்க எதுவும் இல்லை.

## rebound-ops செய்யாதவை

- **விண்ணப்பத்தைத் தானாகச் சமர்ப்பித்தல்.** ஒவ்வொரு புலத்திற்கும் பதிலின் வரைவை எழுதுகிறது; நீங்கள் சரிபார்த்து Submit-ஐ அழுத்துகிறீர்கள். ஸ்கிரிப்ட் ஒருபோதும் POST செய்வதில்லை (`prepare-application.mjs`).
- **மின்னஞ்சல் அனுப்புவது.** வரைவுகள் மட்டுமே. இந்த முழு கோட்பேஸிலும் மின்னஞ்சல் அனுப்பும் எந்த வழியும் இல்லை.
- **வெளியே தரவு அனுப்புவது.** டெலிமெட்ரி இல்லை, எங்கள் பேக்எண்ட் இல்லை. உங்கள் CV உங்கள் கணினியிலிருந்து நீங்கள் தேர்ந்தெடுத்த AI வழங்குநருக்கு மட்டுமே செல்லும், வேறு எங்கும் இல்லை. ஒரே பொதுப் பதிவு இந்த ரெப்போ தான்: `HIRED.md` மற்றும் அதன் issues.
- **4.0/5-க்குக் கீழே விண்ணப்பிக்கத் தூண்டுவது.** வேண்டாம் என்று சொல்லும். நீங்கள் மீறலாம், அதையும் அது சொல்லும்.

உங்கள் CV-ஐ மறுவடிவமைக்கும்; ஒருபோதும் புனையக்கூடாது. உங்கள் CV-இலும் article digest-இலும் இல்லாத எண்களோ தகவல்களோ கொண்ட PDF-ஐ கோடில் உள்ள ஒரு சோதனை தடுக்கிறது, ஆனால் மாற்றி எழுதப்பட்ட ஒவ்வொரு வரியையும் அந்தச் சோதனையால் இன்னும் மதிப்பிட முடியாது. அனுப்பும் முன் ஒவ்வொரு CV-ஐயும் படியுங்கள். விவரங்கள் [FAQ](#அடிக்கடி-கேட்கப்படும்-கேள்விகள்-faq)-இல்.

## Features

| Feature                  | விளக்கம்                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H மதிப்பீடு**        | பதவிச் சுருக்கம், CV பொருத்தம் (இந்த விளம்பரத்திற்கு ஒவ்வொரு தேவையும் எவ்வளவு முக்கியம், அந்த எடை JD-யின் சொற்களிலிருந்தா, அதன் கட்டமைப்பிலிருந்தா அல்லது ஒரு மதிப்பீட்டிலிருந்தா என்பது தேவைவாரியாகக் குறிக்கப்படும்; ஒரு மதிப்பீடு ஒருபோதும் உச்ச நிலையில் இருக்காது), நிலை உத்தி, சம்பள ஆய்வு, தனிப்பயனாக்கம், நேர்காணல் தயாரிப்பு (STAR+R), மேலும் பகுதி G நம்பகத்தன்மை சோதனை (இன்னும் திறந்திருக்கிறதா, இது மறுபதிவா: கவனிப்புகள், தீர்ப்புகள் அல்ல), மற்றும் விசா ஸ்பான்சர்ஷிப் இல்லை என வெளிப்படையாகக் கூறும் JD-ஐ கடுமையான தடையாகக் குறிக்கும் பணி அனுமதி சமிக்ஞை |
| **Human-in-the-Loop**    | AI மதிப்பிட்டுப் பரிந்துரைக்கிறது, நீங்கள் முடிவெடுத்துச் செயல்படுகிறீர்கள். அமைப்பு ஒருபோதும் விண்ணப்பத்தைச் சமர்ப்பிக்காது: இறுதி முடிவு எப்போதும் உங்களுடையது <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS PDF உருவாக்கம்**   | ATS படிக்கக்கூடிய CV-கள், உங்கள் சொந்த அனுபவத்திலிருந்து ஒவ்வொரு JD-க்கும் ஏற்பத் தனிப்பயனாக்கப்பட்டவை, Space Grotesk + DM Sans வடிவமைப்பில் |
| **Cover Letter உருவாக்கி** | ஆய்வு அடிப்படையிலான cover letter-கள்: keyword பிரதிபலிப்பு, நான்கு ஊடாடும் கோணக் கேள்விகள் (ஏன்/சிக்கல்கள்/அணுகுமுறை/தொனி), சாட்டில் வரைவு ஒப்புதல், CV-களுக்கான அதே HTML + Playwright பைப்லைன் மூலம் A4 PDF. ஒவ்வொரு மதிப்பீட்டிலும் தானாக வரைவு; `/rebound-ops cover` மூலம் தேவைப்படும்போது முடித்து உருவாக்குங்கள் |
| **CV-க்கு அப்பால்**      | நிறுவன ஆய்வு ([`deep`](modes/deep.md)) AI உத்தி, சமீபத்திய நகர்வுகள், பொறியியல் கலாச்சாரம், உங்கள் சுயவிவரம் எடுக்க வேண்டிய கோணம் ஆகியவற்றை வெளிக்கொணர்கிறது. தொடர்பு கண்டறிதல் ([`contacto`](modes/contacto.md)) தொடர்புகொள்ளத் தகுந்த hiring manager, ரிக்ரூட்டர் அல்லது குழு உறுப்பினரை அடையாளம் கண்டு, ஒவ்வொரு தொடர்பு வகைக்கும் ஏற்ப ≤300 எழுத்துகளிலான LinkedIn செய்தியை வரைகிறது. முறையான விண்ணப்ப மின்னஞ்சல் வரைவுகள் ([`email`](modes/email.md)) மதிப்பிடப்பட்ட அறிக்கையையோ ஒட்டப்பட்ட JD-ஐயோ தலைப்பு, உடல், இணைப்புப் பட்டியலாக மாற்றுகின்றன; எதையும் அனுப்பாமல், சமர்ப்பிக்காமல், கிளிக் செய்யாமல். விண்ணப்பம் உங்களை வரிசையில் சேர்க்கும்; ஆய்வு உங்களுக்கு ஒரு உரையாடலைப் பெற்றுத் தரும். |
| **முறை பகுப்பாய்வு**     | நிராகரிப்பு முறைகளும் ATS சேனல்வாரி முன்னேற்ற விகிதங்களும் (`analyze-patterns.mjs`), முழுத் தேடலின் funnel புள்ளிவிவரங்கள் (`stats.mjs`), மறுபதிவுகளைக் கண்டறிதல், அவை ghost job-இன் அறிகுறியாக இருக்கலாம் (`detect-reposts.mjs`) |

<details>
<summary><b>இது செய்யும் மற்ற அனைத்தும்</b></summary>

| Feature                  | விளக்கம்                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-Pipeline**        | ஒரு URL-ஐ ஒட்டுங்கள்; முழு மதிப்பீடு + PDF + tracker பதிவு பெறுங்கள்                                                                       |
| **நேர்காணல் கதை வங்கி**  | மதிப்பீடுகள் முழுவதும் STAR+Reflection கதைகளைச் சேகரிக்கிறது: உங்களிடம் கேட்கப்படும் நடத்தை சார்ந்த கேள்விகளுக்கு ஏற்ப நீங்கள் மாற்றியமைக்கக்கூடிய 5-10 முதன்மைக் கதைகள் |
| **பேச்சுவார்த்தை ஸ்கிரிப்ட்கள்** | சம்பளப் பேச்சுவார்த்தை கட்டமைப்புகள், புவியியல் தள்ளுபடிக்கு எதிர்வாதம், போட்டி வாய்ப்புகளை நெம்புகோலாகப் பயன்படுத்துதல்                  |
| **விண்ணப்ப மின்னஞ்சல் வரைவுகள்** | அறிக்கை அல்லது ஒட்டப்பட்ட JD-யிலிருந்து ரிக்ரூட்டர்/பரிந்துரை/நேரடி விண்ணப்பத்திற்கான முறையான மின்னஞ்சல்கள்: தலைப்பு, இணைப்புகள் சரிபார்ப்புப் பட்டியல், ஆதாரத்துடன் கூடிய பொருத்தப் புள்ளிகள், சுயவிவர அடிப்படையிலான தொடர்புத் தகவல். வரைவு மட்டுமே: rebound-ops ஒருபோதும் அனுப்பாது, சமர்ப்பிக்காது, எதையும் கிளிக் செய்யாது. |
| **தள ஸ்கேனர்**           | 100+ நிறுவனங்கள் முன்கூட்டியே அமைக்கப்பட்டுள்ளன (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + Ashby, Greenhouse, Lever, Wellfound முழுவதும் தனிப்பயன் வலைத் தேடல் வினவல்கள் |
| **நிதி பெற்ற நிறுவனங்களைக் கண்டறிதல்** | முதலில் மதிப்பாய்வு செய்யும் `company:funded` கட்டளை, கட்டமைக்கப்பட்ட பொது ஊட்டங்களிலிருந்து சமீபத்தில் நிதி பெற்ற நிறுவனங்களையும் மூல நோயறிதல்களையும் உங்கள் தரவைத் திருத்தாமல் காட்டுகிறது |
| **தொகுப்புச் செயலாக்கம்** | Headless CLI workers (`claude -p` / `opencode run`) மூலம் இணையான மதிப்பீடு                                                                |
| **Dashboard TUI**        | உங்கள் பைப்லைனை உலாவ, வடிகட்ட, வரிசைப்படுத்த டெர்மினல் UI                                                                                  |
| **பைப்லைன் ஒருமைப்பாடு** | தானியங்கி ஒருங்கிணைப்பு, நகல் நீக்கம், நிலை சீரமைப்பு, ஆரோக்கிய சோதனைகள்                                                                    |
| **நேர்காணல் தொகுப்பு**   | நேரப் பிரிவுகளிலான தயாரிப்புத் திட்டங்கள், பின்னூட்டத்துடன் பயிற்சி அமர்வுகள், நேர்காணலுக்குப் பிந்தைய ஆய்வுகள் ([`interview/`](modes/interview/README.md)), நிறுவன எச்சரிக்கை சமிக்ஞை கண்டறிதல் ([`interview-redflag`](modes/interview-redflag.md)) |
| **ஆஃபர் நிலை**           | ஒப்பந்தம் வாசிக்கும் துணை: ஒவ்வொரு விதியாக நடை மற்றும் வழக்கறிஞருக்கான கேள்விப் பட்டியல் ([`offer-prep`](modes/offer-prep.md)), விரும்பிய/விளம்பரப்படுத்திய/உண்மையான சம்பள இடைவெளி பகுப்பாய்வி (`salary-gap.mjs`) |
| **தொடர் நடவடிக்கைகள் & பதில்கள்** | தொடர்பு கால அளவு கணிப்பானும் முன்கூட்டியே அமைக்கப்பட்ட நினைவூட்டல்களும் (`followup-cadence.mjs`, `followup-seed.mjs`); முதலாளியின் பதில்களை tracker புதுப்பிப்புகளாக வகைப்படுத்துதல் ([`reply-watch`](modes/reply-watch.md)) |
| **Plugin அமைப்பு**       | விருப்பத் தேர்வு ஒருங்கிணைப்புகள் (Gmail, Notion, Apify + சமூகப் பதிவேடு), இயல்பாக முடக்கப்பட்டவை; [docs/PLUGINS.md](docs/PLUGINS.md) பார்க்கவும் |

</details>

## எப்படி செயல்படுகிறது

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Quick Start

**விரைவான வழி, ஒரே கட்டளையில்:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` [Node.js](https://nodejs.org)-உடன் வருகிறது: எதையும் global-ஆக நிறுவாமல்
> நிறுவியை ஒரு முறை இயக்குகிறது. Node இன்னும் இல்லையா? முதலில் அதை நிறுவுங்கள்.
> (ஏற்கனவே Claude Code / Codex CLI பயன்படுத்துகிறீர்களா? அப்படியானால் ஏற்கனவே உங்களிடம் உள்ளது.)

இது சமீபத்திய வெளியீட்டை `./rebound-ops`-இல் clone செய்து dependencies-ஐ நிறுவுகிறது. பிறகு:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**முதல் முறை இயக்கும்போது, rebound-ops உரையாடல் மூலமாகவே அமைப்பை வழிநடத்துகிறது: உங்கள் CV, சுயவிவரம், இலக்குப் பதவிகள். கையால் திருத்த எதுவும் இல்லை.**

<details>
<summary><b>கையால் அமைக்க விரும்புகிறீர்களா? (git clone)</b></summary>

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
# auto-pipeline-ஐத் தொடங்க ஒரு வேலை URL-ஐயோ JD உரையையோ ஒட்டுங்கள்.
# மற்ற எல்லா mode-களும், அவற்றை உங்கள் CLI-இல் எப்படிக் கேட்பது என்பதும்: கீழே Usage பகுதியைப் பாருங்கள்.
```

</details>

### Global நிறுவல்

```bash
npm i -g ./engine/scaffolder
```

இது `rebound-ops` binary-ஐ global-ஆக நிறுவுகிறது, எனவே `npx` இல்லாமல் `rebound-ops init [folder]`-ஐ இயக்கலாம். `init` மட்டுமே அதன் ஒரே கட்டளை: அது ஒரு workspace-ஐ அமைக்கிறது; அதன் பிறகு எல்லா வேலையும் இந்த binary வழியாக அல்ல, உங்கள் AI கோடிங் CLI-க்குள் நடக்கிறது (கீழே Usage பார்க்கவும்).

**எதைப் பயன்படுத்த வேண்டும்?**
- `node engine/scaffolder/bin/cli.mjs init`: முதல் பயன்பாட்டிற்கு சிறந்தது; தனி project folder-ஐ உருவாக்குகிறது.
- `npm i -g ./engine/scaffolder`: `npx` வடிவத்தை விட `rebound-ops init` என்று தட்டச்சு செய்ய விரும்பினால். இது வேறு எந்தக் கட்டளையையும் சேர்க்காது.

### இயக்க வேறு வழிகள்

- **எந்த folder-இலிருந்தும், Claude Code plugin ஆக:** [docs/CLAUDE_PLUGIN.md](docs/CLAUDE_PLUGIN.md).
- **AI CLI இல்லாமல்:** தனித்து இயங்கும் Gemini, Ollama மற்றும் OpenAI-இணக்கமான script-கள் ஒரு JD-ஐத் தாமாகவே மதிப்பிடும். [docs/SCRIPTS.md](docs/SCRIPTS.md#geminieval--ollamaeval--openaieval) பார்க்கவும்.

> **இந்த அமைப்பு உங்கள் AI கோடிங் CLI-யாலேயே தனிப்பயனாக்கப்பட வடிவமைக்கப்பட்டது.** Modes, archetypes, scoring weights, பேச்சுவார்த்தை ஸ்கிரிப்ட்கள்: மாற்றச் சொன்னால் போதும். அது பயன்படுத்தும் அதே கோப்புகளையே படிக்கிறது, எனவே எதைத் திருத்த வேண்டும் என்பது அதற்குச் சரியாகத் தெரியும்.

முழு அமைப்பு வழிகாட்டிக்கு [docs/SETUP.md](docs/SETUP.md), தனிப்பயன் அல்லது லோக்கல் மாடல்களைப் பயன்படுத்தி rebound-ops-ஐ மலிவாக இயக்க [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) (Antigravity CLI-யின் இலவச அடுக்கில் செலவின்றி இயக்க [docs/FREE_TIER.md](docs/FREE_TIER.md)), தொடர் ஸ்கேன்களைத் திட்டமிடவும் token செலவின்றி triage-to-shortlist செய்யவும் [docs/AUTOMATION.md](docs/AUTOMATION.md), ATS auto-fill ஓட்டத்தின் விவரங்களுக்கு [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md), உங்கள் LinkedIn தொடர்புகளின் export-ஐ உங்கள் funnel-இல் உள்ள நிறுவனங்களுடன் ஒப்பிட [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md), பொதுவான அமைப்புக் கேள்விகளுக்கான பதில்களுக்கு [docs/FAQ.md](docs/FAQ.md) ஆகியவற்றைப் பார்க்கவும்; இதில் [கதை மூலப் பதிவு எப்படிப் புனையப்பட்ட எண்களைத் தடுக்கிறது](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank) என்பதும் அடங்கும். வடிவமைப்புக் கொள்கைகள் [ARCHITECTURE.md](ARCHITECTURE.md)-இல்; இயக்க நேர ஓட்டங்கள் [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)-இல்.

## Usage

உங்கள் AI CLI-இல் ஒரு வேலை URL-ஐயோ விவரத்தையோ ஒட்டுங்கள். இணைப்புடன் உள்ள வேலை அறிவிப்பு இன்னும் திறந்திருக்கிறதா என rebound-ops சரிபார்க்கும் (ஒட்டிய உரைக்குச் சரிபார்க்க இணைப்பு இல்லை), உங்கள் CV-க்கு எதிராக மதிப்பெண் இடும், ஒரு report எழுதும், உங்கள் CV-ஐ ஏற்றவாறு தயாரிக்கும் (இயல்பாக PDF), உங்கள் tracker-இல் ஒரு வரியைச் சேர்க்கும். பெரும்பாலான நாட்களுக்கு இது போதும். மற்றதெல்லாம் பெயர் சொல்லிக் கேட்கும் mode-கள். ஒரு வேலை அறிவிப்பைப் படிக்க முடியாவிட்டால், pipeline நின்று உரையை ஒட்டச் சொல்லும்.

### ஒரு mode-ஐக் கேட்பது எப்படி

| CLI | `scan`-ஐக் கேட்பது எப்படி |
| --- | --- |
| Claude Code, OpenCode, Antigravity CLI (`agy`), Grok Build CLI | `/rebound-ops scan` |
| Pi | `/skill:rebound-ops scan` |
| Codex, Qwen, Cursor அல்லது ஆதரிக்கப்படும் வேறு எந்த CLI | சாதாரண மொழியில்: "Run the rebound-ops scan mode" |

பின்னால் எதுவும் இல்லாத `/rebound-ops` கட்டளை மெனுவைக் காட்டும் அதைப் பயன்படுத்தும் CLI-களில். சாதாரண மொழி ஆதரிக்கப்படும் எல்லா CLI-களிலும் வேலை செய்யும். Claude Code plugin ஆக இருந்தால் கட்டளை `/rebound-ops:rebound-ops`.

இவை அனைத்தும் ஒரே router-ஆன `.agents/skills/rebound-ops/SKILL.md`-ஐயும் அதே `modes/*.md` கோப்புகளையும் பகிர்கின்றன; எனவே எந்த CLI-யும் கோரிக்கையை ஒரே மாதிரி வழிநடத்தும் (உலாவியை அதிகம் பயன்படுத்தும் mode-களுக்கு Playwright கருவிகளும் தேவை). Codex-இல் slash கட்டளைகளுக்கு உத்தரவாதம் இல்லை: சாதாரண மொழியில் கேளுங்கள், அல்லது `codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"` மூலம் ஒரு prompt-ஐ headless-ஆக இயக்குங்கள் ([docs/CODEX.md](docs/CODEX.md)). ஆதரிக்கப்படும் ஒவ்வொரு CLI-யிலும் இதை எப்படி இயக்குவது, headless கட்டளை உள்ள CLI-களுக்கு அந்தக் கட்டளைகள், CLI-வாரியான அமைப்புக் குறிப்புகள் ஆகியவை [docs/SUPPORTED_CLIS.md](docs/SUPPORTED_CLIS.md)-இல் உள்ளன.

### அன்றாடக் கட்டளைகள்

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| *URL அல்லது JD-ஐ ஒட்டு* | முழு pipeline: வேலை அறிவிப்பு இன்னும் திறந்திருக்கிறதா எனச் சரிபார்த்தல் (URL-களுக்கு மட்டும்), A-G மதிப்பீடு மற்றும் உயர் மதிப்பெண்ணில் H, report, ஏற்றவாறு தயாரித்த CV (இயல்பாக PDF), tracker வரி |
| `scan` | உங்கள் portal-களில் புதிய அறிவிப்புகளைத் தேடி inbox-இல் (`data/pipeline.md`) சேர் |
| `pipeline` | inbox-இல் காத்திருக்கும் URL-களைச் செயலாக்கு (standard, premium நிலைகள் தெளிவாகப் பொருந்தாதவற்றைத் தவிர்க்கலாம்) |
| `apply` | ஒரு விண்ணப்பப் படிவத்தை உங்களுடன் சேர்ந்து, புலம் புலமாக நிரப்பு. Submit-க்கு முன் நின்றுவிடும் |
| `tracker` | ஒவ்வொரு விண்ணப்பமும் எந்த நிலையில் உள்ளது |
| `followup` | எந்த விண்ணப்பங்களுக்கு follow-up செய்ய வேண்டும், வரைவுகளுடன் |

<details>
<summary><b>எல்லாக் கட்டளைகளும், தேடலின் கட்டம் வாரியாக</b></summary>

`oferta`, `ofertas`, `contacto` ஆகியவை தங்கள் அசல் ஸ்பானிஷ் பெயர்களையே வைத்திருக்கின்றன: வாய்ப்பு, வாய்ப்புகள், தொடர்பு.

**பணிகளைக் கண்டறி**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`scan`](modes/scan.md) | தளங்களை ஸ்கேன் செய்து புதிய வாய்ப்புகளைக் கண்டறி |
| [`discover`](modes/discover.md) | நிறுவனப் பெயர்களின் பட்டியலை ஸ்கேன் செய்யக்கூடிய ATS board-களாக மாற்று. இயல்பாக முன்னோட்டம் மட்டும்; `--write` கொடுத்தால் மட்டுமே `portals.yml`-இல் சேர் (token செலவு இல்லை) |
| [`pipeline`](modes/pipeline.md) | inbox-இல் (`data/pipeline.md`) நிலுவையிலுள்ள URL-களைச் செயலாக்கு |
| [`triage`](modes/triage.md) | முழு மதிப்பீட்டுக்கு முன், `modes/_brief.md`-ஐ அடிப்படையாகக் கொண்ட விரைவான முதல் வடிகட்டல் (தொடரலாம்/வேண்டாம்) (கோப்புகளை எழுதாது) |
| [`batch`](modes/batch.md) | headless worker-களுடன் பல அறிவிப்புகளை மதிப்பிடு (Claude-இல் இணையாக, பிற CLI-களில் ஒன்றன்பின் ஒன்றாக) |
| [`titles`](modes/titles.md) | தேடலை விரிவாக்க, உங்கள் CV அடிப்படையில் தொடர்புடைய பணிப் பெயர்களைப் பரிந்துரை |

**ஒரு பணியை மதிப்பிடு**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| *URL அல்லது JD-ஐ ஒட்டு* | [Auto-pipeline](modes/auto-pipeline.md): மதிப்பீடு + report + ஏற்றவாறு தயாரித்த CV (இயல்பாக PDF) + tracker பதிவு |
| [`oferta`](modes/oferta.md) | மதிப்பீடு மட்டும், A முதல் G வரையிலான பகுதிகள் மற்றும் உயர் மதிப்பெண்ணில் H (PDF இல்லை) |
| [`ofertas`](modes/ofertas.md) | பல வாய்ப்புகளை ஒப்பிட்டுத் தரவரிசைப்படுத்து |
| [`deep`](modes/deep.md) | நிறுவனம் பற்றிய ஆழமான ஆராய்ச்சி prompt |
| [`eu-swe`](modes/regional/eu-swe.md) | CV, விண்ணப்பம் அல்லது நேர்காணலுக்கு முன், ஐரோப்பிய மென்பொருள் பொறியியல் விண்ணப்பத்தைச் சீரமை |

**விண்ணப்பி**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`pdf`](modes/pdf.md) | ATS-optimized CV, PDF ஆக |
| [`ats`](modes/ats.md) | உருவாக்கிய CV ATS-க்கு ஏற்றதா எனச் சரிபார்: மதிப்பெண்ணும் சரிசெய்யக்கூடிய சிக்கல்களும் |
| [`text`](modes/text.md) | markdown ஆக ஏற்றவாறு தயாரித்த CV (`cv.md`-ஐப் பிரதிபலிக்கும், PDF இல்லை) |
| [`latex`](modes/latex.md) | CV-ஐ LaTeX/Overleaf `.tex` ஆக ஏற்றுமதி செய் |
| [`latex-tex`](modes/latex-tex.md) | உங்கள் சொந்த `resume.tex`-ஐ அங்கேயே ஏற்றவாறு மாற்று (விருப்பத்தேர்வு; இயல்புநிலை `cv.md` தான்) |
| [`cover`](modes/cover.md) | ஒட்டிய JD அல்லது மதிப்பிடப்பட்ட report-இலிருந்து cover letter (`cover {slug}`) |
| [`email`](modes/email.md) | முறையான விண்ணப்ப மின்னஞ்சல் வரைவு. வரைவு மட்டும்: ஒருபோதும் அனுப்பாது, சமர்ப்பிக்காது, கிளிக் செய்யாது |
| [`contacto`](modes/contacto.md) | hiring manager, recruiter அல்லது சக ஊழியரைக் கண்டறிந்து LinkedIn செய்தி வரைவு எழுது |
| [`apply`](modes/apply.md) | நேரடி விண்ணப்ப உதவியாளர் (இந்த checkout-இலிருந்து Playwright). சமர்ப்பிக்காது |

**நேர்காணல்**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`interview-prep`](modes/interview-prep.md) | நிறுவனத்துக்கே உரிய நேர்காணல் தயாரிப்பு ஆவணம் |
| [`interview/plan`](modes/interview/plan.md) | வரவிருக்கும் நேர்காணலுக்கான நேரத் தொகுதிகளாகப் பிரித்த தயாரிப்புத் திட்டம் |
| [`interview/practice`](modes/interview/practice.md) | பயிற்சி நேர்காணல், ஒரு நேரத்தில் ஒரு கேள்வி, பின்னூட்டத்துடன் |
| [`interview/debrief`](modes/interview/debrief.md) | நேர்காணலுக்குப் பிந்தைய மதிப்பாய்வு: குறைகளை நிரப்பு, அடுத்த சுற்றை முன்கணி |
| [`interview-redflag`](modes/interview-redflag.md) | சேருவதற்கு முன் ஒரு முதலாளியின் எச்சரிக்கை அறிகுறிகளை ஆராய் |

**விண்ணப்பித்த பிறகு**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`tracker`](modes/tracker.md) | விண்ணப்ப நிலை மேலோட்டம் |
| [`followup`](modes/followup.md) | Follow-up தாளம்: தாமதமான விண்ணப்பங்களைக் குறி, வரைவுகளை உருவாக்கு |
| [`reply-watch`](modes/reply-watch.md) | முதலாளிகளின் பதில்களை வகைப்படுத்தி tracker புதுப்பிப்புகளைப் பரிந்துரை |
| [`outcome`](modes/outcome.md) | ஒரு விண்ணப்பத்தின் முடிவைப் பதிவுசெய்து அதன் artifact-களை காப்பகப்படுத்து |
| [`offer-prep`](modes/offer-prep.md) | பெற்ற வாய்ப்பு அல்லது ஒப்பந்தத்தை உங்களுடன் சேர்ந்து படி: பிரிவு வாரியாகப் பார்வையிடலும் வழக்கறிஞருக்கான கேள்விகளும் (சட்ட ஆலோசனை அல்ல) |

**உங்கள் சுயவிவரமும் CV-யும்**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`interview`](modes/interview.md) | சுயவிவர அமைப்பு: உங்கள் அனுபவம் பற்றிய ஊடாடும் நேர்காணல், இது உங்கள் CV-யையும் சுயவிவரத்தையும் உருவாக்குகிறது (நேர்காணல் பயிற்சி அல்ல) |
| [`intake`](modes/intake.md) | `documents/`-இல் உள்ள கோப்புகளிலிருந்து (master CV, LinkedIn ஏற்றுமதி) உங்கள் சுயவிவரத்தை உருவாக்கு அல்லது செறிவாக்கு. உங்கள் உறுதிப்படுத்தல் இல்லாமல் எதுவும் எழுதப்படாது |
| [`master-profile`](modes/master-profile.md) | உங்கள் Master Career Profile-ஐ இறக்குமதி செய்து, மதிப்பாய்வு செய்து, சரிபார்த்து, தேர்ந்தெடுத்த உண்மைகளை CV புள்ளிகளாகத் தயாரி |
| [`add`](modes/add.md) | CV-இல் ஒரு project, கட்டுரை அல்லது பணியைச் சேர் (fetch, முன்னோட்டம், உறுதிப்படுத்தல்) |
| [`expand`](modes/expand.md) | உங்கள் சுயவிவர இணைப்புகளிலிருந்து, CV-இல் விடுபட்ட திறன்களைக் கண்டறி |
| [`retro`](modes/retro.md) | இந்த session-ஐ மதிப்பாய்வு செய்து, நீங்கள் கற்றுத்தந்ததை விதிகளாக வைத்துக்கொள் (நீங்கள் ஏற்றுக்கொண்டவற்றை மட்டுமே எழுதும்) |

**உங்கள் இலக்கு நிர்ணயத்தை மேம்படுத்து**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`patterns`](modes/patterns.md) | நிராகரிப்பு முறைகளை ஆராய்ந்து இலக்கு நிர்ணயத்தை மேம்படுத்து |
| [`calibrate`](modes/calibrate.md) | உங்கள் மதிப்பீட்டு மதிப்பெண்கள் உண்மையான முடிவுகளை முன்கணிக்கின்றனவா எனச் சரிபார். ஆலோசனை மட்டும்: மதிப்பெண் முறையை ஒருபோதும் மாற்றாது |
| [`upskill`](modes/upskill.md) | மதிப்பிடப்பட்ட உங்கள் எல்லா report-களிலும் திறன் இடைவெளி பகுப்பாய்வு |
| [`training`](modes/training.md) | ஒரு பாடநெறி அல்லது சான்றிதழை உங்கள் North Star-க்கு எதிராக மதிப்பிடு |
| [`project`](modes/project.md) | ஒரு portfolio project யோசனையை மதிப்பிடு |

**அமைப்பு**

| கட்டளை | என்ன செய்கிறது |
| --- | --- |
| [`agent-inbox`](modes/agent-inbox.md) | அடுத்த session-க்கான கோரிக்கைகளை வரிசையில் வை, அப்போது அவற்றைச் செயல்படுத்து (`data/agent-inbox.md`). `inbox` என்பதும் வேலை செய்யும் |
| [`update`](modes/update.md) | diff முன்னோட்டத்துடனும் இணக்கச் சரிபார்ப்புடனும் rebound-ops அமைப்புக் கோப்புகளைப் புதுப்பி |

</details>

## முன்கூட்டியே அமைக்கப்பட்ட வேலைவாய்ப்பு தளங்கள்

ஸ்கேனர் ஸ்கேன் செய்யத் தயாராக **100+ நிறுவனங்களுடனும்**, முக்கிய job boards முழுவதும் **35+ தேடல் வினவல்களுடனும்** வருகிறது. `templates/portals.example.yml`-ஐ `portals.yml`-ஆக நகலெடுத்து உங்களுடையதைச் சேர்க்கவும்:

**AI Labs:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Voice AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI Platforms:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Contact Center:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automation:** n8n, Zapier, Make.com
**European:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**தேடப்படும் job boards:** 55+ provider modules ATS API-கள், board-wide feeds, XML/RSS feeds, markdown feeds, லோக்கல் parsers ஆகியவற்றை உள்ளடக்குகின்றன. முழு அட்டவணைக்கு [ஆதரிக்கப்படும் job boards](docs/SUPPORTED_JOB_BOARDS.md) பார்க்கவும்.

இயல்பாக `node scan.mjs` (அதாவது `npm run scan`) ஒவ்வொரு ATS feed-ஐயும் நம்புகிறது. சில நிறுவனங்கள் பதவி மூடப்பட்ட பிறகும் பழைய விளம்பரங்களைத் தங்கள் பொது API-யில் விட்டுவிடுகின்றன, எனவே காலாவதியான பதிவுகள் `pipeline.md`-க்குள் நுழையலாம். API கட்டத்திற்குப் பிறகு Playwright-ஐ இயக்கி, காலாவதியான விளம்பரங்கள் பைப்லைனை அடையும் முன் நீக்க `--verify` கொடுங்கள்:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

சரிபார்ப்பு வரிசையாகவும், புதிய வாய்ப்புகளுக்கு மட்டுமே (நகல் நீக்கத்திற்குப் பிறகு) இயங்குவதால், செலவு கட்டுக்குள் இருக்கும்.

## Dashboard TUI

உள்ளமைந்த டெர்மினல் dashboard உங்கள் பைப்லைனைக் காட்சி ரீதியாக உலாவ உதவுகிறது:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Features: 10 வடிகட்டி tabs, 8 வரிசைப்படுத்தும் முறைகள், grouped/flat view, lazy-loaded previews, inline நிலை மாற்றங்கள்.

**சோதனை web UI**-யும் உள்ளது (alpha மற்றும் opt-in: நீங்கள் தொடங்காதவரை எதுவும் இயங்காது): [`web/README.md`](web/README.md) பார்க்கவும்.

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

## வெளிப்புற தரவு அடைவு (விருப்பத்திற்குரியது)

இயல்பாக, பயனர் அடுக்குத் தரவு (`cv.md`, `portals.yml`, மற்றும் `data/` / `reports/` / `output/` folders போன்றவை) project root folder-க்குள் இருக்கும்.

உங்கள் தனிப்பட்ட தரவைக் கோடிலிருந்து பிரிக்க (branch மாற்றுவது, updates-ஐப் பெறுவது, பல சுயவிவரங்களைச் சோதிப்பது எளிதாகும்), பின்வரும் முன்னுரிமையில் ஒரு வெளிப்புற தரவு அடைவை அமைக்கலாம்:

1. **Environment Variables:** `REBOUND_OPS_ROOT` அல்லது `REBOUND_OPS_DATA_DIR` environment variable-ஐ அமைக்கவும்:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Marker File:** repository root-இல் உங்கள் தரவு அடைவின் பாதையைக் கொண்ட `.rebound-ops-data` கோப்பை உருவாக்கவும்.
3. **இயல்பு:** repository root.

தீர்மானிக்கப்பட்டதும், அனைத்துப் பயனர் கோப்புகளும் அந்த folder-ஐ ஒட்டியே தீர்க்கப்பட்டு எழுதப்படும்; prompt கோப்புகளும் ஸ்கிரிப்ட்களும் தொடர்ந்து repository-ஐ ஒட்டியே தீர்க்கப்படும்.

- **Tracker Override:** விண்ணப்ப tracker கோப்பின் பாதையை நேரடியாக மாற்ற `REBOUND_OPS_TRACKER`-ஐயும் அமைக்கலாம்.
- **Writes:** அனைத்து எழுதும் செயல்பாடுகளும் (merges போன்றவை) நியமப்படி `{DATA_ROOT}/data/applications.md`-ஐ இலக்காகக் கொள்ளும்.
- **Scanner config:** `portals.yml` கோப்பு `{DATA_ROOT}/portals.yml`-இல் படிக்கப்பட்டுச் சரிபார்க்கப்படுகிறது, எனவே `scan.mjs` படிக்கும் அதே கோப்பையே `node validate-portals.mjs` சரிபார்க்கிறது.
- **உருவாக்கப்பட்ட ஆவணங்கள்:** தனிப்பயனாக்கப்பட்ட CV-களும் cover letter-களும் `{DATA_ROOT}/output/`-இன் கீழ் எழுதப்படுகின்றன; அவற்றை ஒரு அறிக்கையுடன் இணைக்கும் PDF manifest `{DATA_ROOT}/data/pdf-index.tsv`-இல் இருக்கும். `REBOUND_OPS_TRACKER` அமைக்கப்படாதவரை, அந்த எழுதுதல்களுக்கு எல்லை வகுக்கும் tracker workspace என்பது data root தான், checkout அல்ல.
- **Tracker override-இன் கீழ் PDF-கள்:** `generate-pdf.mjs` workspace-ஐத் தீர்மானிக்கும் முன் `REBOUND_OPS_TRACKER`-ஐத் தீர்க்கிறது, எனவே override அமைக்கப்பட்டிருந்தால் workspace என்பது அந்த tracker உள்ள folder (அல்லது tracker ஒரு `data/` folder-இல் இருந்தால், அதற்கு மேலே உள்ள folder). அப்போது CV-யின் HTML-உம் ஒவ்வொரு PDF-உம் அந்த workspace-க்குள்ளேயே இருக்க வேண்டும், manifest அதன் `data/pdf-index.tsv`-க்கு நகரும். Cover letter-கள் இன்னும் `{DATA_ROOT}/output/`-ஐயே இலக்காகக் கொள்வதால், அந்த folder tracker-இன் workspace-க்கு வெளியே இருந்தால் அவை மறுக்கப்படும்.
- **கோடு அடுக்கு இடம் மாறாது:** `node_modules/`, `providers/`, `modes/` மற்றும் ஸ்கிரிப்ட்கள் எப்போதும் repository-ஐ ஒட்டியே தீர்க்கப்படுகின்றன, data root-ஐ ஒட்டி ஒருபோதும் அல்ல.

Go dashboard TUI, Node.js ஸ்கிரிப்ட்கள், AI ஏஜென்ட் modes அனைத்தும் இந்தத் தீர்வு வரிசையைத் தானாகவே பின்பற்றுகின்றன.


## Tech Stack

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Agent**: பகிரப்பட்ட skills மற்றும் modes கொண்ட AI கோடிங் CLI (`AGENTS.md` + CLI wrapper)
- **PDF**: Playwright + HTML template
- **Cover letters**: HTML template + Playwright (A4 PDF, CV-களுக்கான அதே பைப்லைன்)
- **Scanner**: Playwright + Greenhouse API + WebSearch
- **Dashboard**: Go + Bubble Tea + Lipgloss (Catppuccin Mocha theme)
- **Data**: Markdown அட்டவணைகள் + YAML config + TSV batch கோப்புகள்

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>agent skill தரநிலையைப் பின்பற்றும் எந்த CLI-யிலும் இயங்கும். <a href="docs/SUPPORTED_CLIS.md">ஆதரிக்கப்படும் CLI-கள்</a> பார்க்கவும்.</sub><br>
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

## அடிக்கடி கேட்கப்படும் கேள்விகள் (FAQ)

**rebound-ops என்றால் என்ன?**
**தனிப்பயனாக்கப்பட்ட CV எதையாவது புனையுமா?**
புனையக்கூடாது, ப்ராம்ப்ட்களும் அதையே சொல்கின்றன: மறுவடிவமைக்கலாம், ஒருபோதும் புனையக்கூடாது. உங்கள் மூலங்களில் இல்லாத எண்களோ தகவல்களோ கொண்ட CV-ஐ `generate-pdf` தடுக்கிறது, நீங்கள் `--skip-fact-check` கொடுத்தால் தவிர. `pdf` பயன்முறை `cv-title-check.mjs`-ஐயும் இயக்குகிறது: தனிப்பயனாக்கிய CV-யில் உள்ள ஒவ்வொரு பதவிப் பெயரையும், அதே வேலைக்கு cv.md தரும் பதவிப் பெயருடன் (நிறுவனம், தேதிகள் மூலம் பொருத்தி) ஒப்பிட்டு, வேறுபடும் ஒவ்வொன்றையும் வைத்துக்கொள்வதா திரும்ப மாற்றுவதா என்று உங்களிடம் கேட்கிறது. பதவிப் பெயரை மாற்றி அமைப்பது சில நேரங்களில் உங்கள் முடிவாக இருக்கலாம் என்பதால், அது எச்சரிக்கை மட்டுமே தருகிறது, தடுப்பதில்லை. மாற்றி எழுதியதை இன்னும் எதுவும் மதிப்பிடுவதில்லை: [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (பொருந்தாவிட்டால் தடுக்கும் உண்மைத்தன்மைச் சோதனை) இதைக் கண்காணிக்கிறது. அதுவரை, அனுப்பும் முன் ஒவ்வொரு CV-ஐயும் படியுங்கள். [சட்டப்பூர்வ மறுப்பு](LEGAL_DISCLAIMER.md) இதையே அதிக வார்த்தைகளில் சொல்கிறது.

**rebound-ops-ஐ இலவசமாகவோ, மலிவான / லோக்கல் மாடலிலோ இயக்க முடியுமா?**
ஆம். rebound-ops CLI-agnostic; இலவச மற்றும் லோக்கல் மாடல்களில் (OpenRouter இலவச மாடல்கள், Ollama, அல்லது எந்த OpenAI-compatible endpoint) இயங்கும், எனவே நீங்கள் கட்டணச் சந்தாவுடன் கட்டுப்படவில்லை. முழு அமைப்பிற்கு [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) பார்க்கவும்.

**Claude Pro/Max-க்குப் பணம் செலுத்துகிறேன், ஆனால் rebound-ops API credits-ஐச் செலவழிக்கிறது. ஏன்?**
உங்கள் environment-இல் உள்ள `ANTHROPIC_API_KEY` உங்கள் உள்நுழைந்த சந்தாவை விட முன்னுரிமை பெறுவதால்: CLI அந்த key-ஐப் பயன்படுத்தி token-க்கு கட்டணம் விதிக்கிறது. `echo $ANTHROPIC_API_KEY` இயக்குங்கள்; ஏதேனும் அச்சிடப்பட்டால், அதை உங்கள் shell profile-இலிருந்து நீக்கி, டெர்மினலை மறுதொடக்கம் செய்து `/login` இயக்குங்கள். Batch mode விதிவிலக்கு, ஏனெனில் `claude -p` workers ஊடாடும் உள்நுழைவைப் பயன்படுத்துவதில்லை: ஒரு முறை `claude setup-token` இயக்கி, முடிவை `CLAUDE_CODE_OAUTH_TOKEN` ஆக export செய்யுங்கள். முழு விளக்கம் [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it)-இல்.

**rebound-ops எந்த AI CLI-களுடன் வேலை செய்யும்?**
rebound-ops திறந்த Agent Skill Standard வழியாக எந்த முக்கிய AI கோடிங் CLI-யிலும் (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen மற்றும் பல) இயங்கும், எனவே ஒருபோதும் ஒரு vendor-உடன் பூட்டப்படாது. உங்களிடம் ஏற்கனவே உள்ள CLI-ஐப் பயன்படுத்துங்கள்.

**Windows-இல் rebound-ops-ஐ எப்படி நிறுவுவது?**
rebound-ops Windows-இல் இயங்கும். தளம் சார்ந்த அமைப்பும் அறியப்பட்ட சிக்கல்களும் (Git Bash கண்டறிதல், line endings, Task Scheduler) [docs/WINDOWS.md](docs/WINDOWS.md)-இல் உள்ளன. நிறுவலின்போது symlink பிழையால் skills ஏறாவிட்டால், தீர்வு [docs/FAQ.md](docs/FAQ.md)-இல் உள்ளது. முழு படிகள் [docs/SETUP.md](docs/SETUP.md)-இல்.

**rebound-ops எனக்காக வேலைகளுக்குத் தானாக விண்ணப்பிக்குமா?**
இல்லை. rebound-ops ஒரு வடிகட்டி, கண்மூடித்தனமாக விண்ணப்பிக்கும் auto-applier அல்ல. AI மதிப்பிட்டு, தரவரிசைப்படுத்தி, வரைவு எழுதுகிறது; நீங்கள் மதிப்பாய்வு செய்து முடிவெடுக்கிறீர்கள். அது வரைவு எழுதி, படிவங்களை நிரப்புகிறது; ஒருபோதும் சமர்ப்பிப்பதில்லை. நீங்கள் Submit-ஐ அழுத்துகிறீர்கள். இந்த human-in-the-loop வடிவமைப்பே முழு நோக்கம்.

**rebound-ops இலவசமா, ஓப்பன் சோர்ஸா?**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md).
## Disclaimer

**rebound-ops ஒரு லோக்கல், ஓப்பன் சோர்ஸ் கருவி, hosted சேவை அல்ல.** இந்த மென்பொருளைப் பயன்படுத்துவதன் மூலம் நீங்கள் ஒப்புக்கொள்வது:

1. **உங்கள் தரவை நீங்கள் கட்டுப்படுத்துகிறீர்கள்.** உங்கள் CV, தொடர்புத் தகவல், தனிப்பட்ட தரவு உங்கள் கணினியிலேயே இருக்கும், நீங்கள் தேர்ந்தெடுக்கும் AI வழங்குநருக்கு (Anthropic, OpenAI போன்றவை) நேரடியாக அனுப்பப்படும். உங்கள் தரவு எதையும் நாங்கள் சேகரிப்பதில்லை, சேமிப்பதில்லை, அணுகுவதில்லை.
2. **AI-ஐ நீங்கள் கட்டுப்படுத்துகிறீர்கள்.** இயல்பு ப்ராம்ப்ட்கள் விண்ணப்பங்களைத் தானாகச் சமர்ப்பிக்க வேண்டாம் என AI-க்கு அறிவுறுத்துகின்றன, ஆனால் AI மாடல்கள் எதிர்பாராத விதமாக நடந்துகொள்ளலாம். ப்ராம்ப்ட்களை மாற்றினாலோ வேறு மாடல்களைப் பயன்படுத்தினாலோ, அது உங்கள் சொந்தப் பொறுப்பு. **சமர்ப்பிக்கும் முன் AI உருவாக்கிய உள்ளடக்கத்தின் துல்லியத்தை எப்போதும் சரிபாருங்கள்.**
3. **மூன்றாம் தரப்பு விதிமுறைகளை நீங்கள் பின்பற்றுகிறீர்கள்.** நீங்கள் தொடர்புகொள்ளும் career portals-இன் (Greenhouse, Lever, Workday, LinkedIn போன்றவை) சேவை விதிமுறைகளுக்கு இணங்க இந்தக் கருவியைப் பயன்படுத்த வேண்டும். முதலாளிகளுக்கு spam செய்யவோ ATS அமைப்புகளைச் சுமையேற்றவோ இதைப் பயன்படுத்தாதீர்கள்.
4. **உத்தரவாதங்கள் இல்லை.** மதிப்பீடுகள் பரிந்துரைகள், உண்மைகள் அல்ல. AI மாடல்கள் திறன்களையோ அனுபவத்தையோ புனையலாம். வேலைவாய்ப்பு முடிவுகள், நிராகரிக்கப்பட்ட விண்ணப்பங்கள், கணக்குக் கட்டுப்பாடுகள் அல்லது வேறு எந்த விளைவுகளுக்கும் ஆசிரியர்கள் பொறுப்பல்ல.

முழு விவரங்களுக்கு [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) பார்க்கவும். இந்த மென்பொருள் [MIT உரிமத்தின்](LICENSE) கீழ் "உள்ளபடியே", எந்த உத்தரவாதமும் இன்றி வழங்கப்படுகிறது.

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
