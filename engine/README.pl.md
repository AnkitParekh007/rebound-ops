# ReboundOps engine

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## Co rebound-ops robi dla ciebie

Wklej ofertę. Powie ci, czy ten wieczór jest tego wart.

- **Wciąż aktualna?** Sprawdza, czy ogłoszenie jest nadal aktywne, zanim napiszesz choć słowo.
- **Nie dla ciebie?** Ocenia rolę względem twojego prawdziwego CV i każe odpuścić słabe dopasowanie. Możesz to nadpisać.
- **Warto?** Przygotowuje szkic CV, listu motywacyjnego i odpowiedzi. Ty je czytasz. Ty je wysyłasz.
- **Z kim rozmawiać?** Znajduje osobę i przygotowuje szkic wiadomości. Nigdy jej nie wysyła.
- **Gdzie to wszystko trafia?** Każda aplikacja zostaje na twoim komputerze. Do nas nic nie jest wysyłane.
- **Czego powinienem się nauczyć?** Po serii odmów nazywa lukę.

Pierwsze uruchomienia są szorstkie. Jeszcze cię nie zna. Porozmawiaj z nim: twoje CV, czego chcesz, czego odmawiasz. Potraktuj to jak pierwszy tydzień rekrutera.

Przy pierwszym uruchomieniu pyta o to wszystko na czacie. Nic do ręcznej konfiguracji.

## Czego rebound-ops nie robi

- **Automatycznie wysyłać aplikacji.** Przygotowuje szkic odpowiedzi do każdego pola; ty sprawdzasz i klikasz Wyślij. Skrypt nigdy nie wykonuje POST (`prepare-application.mjs`).
- **Nie wysyła maili.** Tylko szkice. W całym kodzie nie ma żadnego transportu poczty.
- **Nie dzwoni do domu.** Bez telemetrii, bez naszego backendu. Twoje CV idzie z twojej maszyny do wybranego przez ciebie dostawcy AI i nigdzie indziej. Jedyny publiczny rejestr to to repozytorium: `HIRED.md` i jego issues.
- **Nie namawia do aplikowania poniżej 4.0/5.** Powie, żeby tego nie robić. Możesz to zignorować, a on to powie.

Przeredagowuje twoje CV; nigdy nie wolno mu go zmyślać. Kontrola w kodzie zatrzymuje PDF z liczbami lub faktami, których nie ma ani w twoim CV, ani w `article-digest.md`, ale nie potrafi jeszcze ocenić każdego przeformułowania. Czytaj każde CV przed wysłaniem. Szczegóły w [FAQ](#faq).

## Funkcje

| Funkcja                  | Opis                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Ocena A-H**            | Podsumowanie roli, dopasowanie CV (z wagą każdego wymagania dla tego ogłoszenia i informacją, czy waga pochodzi z treści opisu, jego struktury czy z szacunku, oznaczone per wymaganie; szacunek nigdy nie może być w najwyższym paśmie), strategia poziomu, research wynagrodzeń, personalizacja, przygotowanie do rozmowy (STAR+R), plus kontrola wiarygodności ogłoszenia w bloku G (czy jest wciąż aktualne, czy to ponowna publikacja: obserwacje, nie werdykty) oraz sygnał pozwolenia na pracę, który oznacza opis z wyraźnym brakiem sponsoringu wizy jako twardy bloker |
| **Human-in-the-Loop**    | AI ocenia i rekomenduje, ty decydujesz i działasz. System nigdy nie wysyła aplikacji: ostatnie słowo zawsze należy do ciebie <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **Generowanie PDF pod ATS** | CV czytelne dla ATS, dopasowane do każdego opisu oferty na podstawie twojego własnego doświadczenia, w designie Space Grotesk + DM Sans |
| **Generator listów motywacyjnych** | Listy oparte na researchu z odbiciem słów kluczowych, czterema interaktywnymi pytaniami o kąt (dlaczego/problemy/podejście/ton), zatwierdzaniem szkicu w czacie i PDF A4 przez ten sam pipeline HTML + Playwright co CV. Tworzy szkic przy każdej ocenie; dokończ i wygeneruj na żądanie przez `/rebound-ops cover` |
| **Poza CV**              | Research firmy ([`deep`](modes/deep.md)) odsłania strategię AI, ostatnie ruchy, kulturę inżynierską i kąt, jaki powinien przyjąć twój profil. Wyszukiwanie kontaktów ([`contacto`](modes/contacto.md)) wskazuje hiring managera, rekrutera lub członka zespołu, do którego warto napisać, i tworzy szkic wiadomości na LinkedIn do 300 znaków dopasowanej do typu kontaktu. Szkice formalnych maili aplikacyjnych ([`email`](modes/email.md)) zamieniają oceniony raport lub wklejony opis w temat, treść i checklistę załączników bez wysyłania, składania ani klikania czegokolwiek. Aplikacja ustawia cię w kolejce; research daje ci rozmowę. |
| **Analiza wzorców**      | Wzorce odrzuceń i wskaźniki przejścia per kanał ATS (`analyze-patterns.mjs`), statystyki lejka z całego poszukiwania (`stats.mjs`), wykrywanie ponownych publikacji, które mogą wskazywać na ofertę-widmo (`detect-reposts.mjs`) |

<details>
<summary><b>Wszystko inne, co robi</b></summary>

| Funkcja                  | Opis                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-Pipeline**        | Wklej URL, dostań pełną ocenę + PDF + wpis w trackerze                                                                                   |
| **Bank historii na rozmowy** | Gromadzi historie STAR+Refleksja między ocenami: 5-10 głównych historii, które możesz dopasować do pytań behawioralnych, jakie dostaniesz |
| **Skrypty negocjacyjne** | Frameworki negocjacji wynagrodzenia, odpowiedź na obniżkę geograficzną, wykorzystanie konkurencyjnych ofert                              |
| **Szkice maili aplikacyjnych** | Formalne maile do rekrutera, z polecenia lub na zimno z raportu albo wklejonego opisu, z tematem, checklistą załączników, udokumentowanymi punktami dopasowania i blokiem kontaktowym z profilu. Tylko szkice: rebound-ops nigdy nie wysyła, nie składa i nie klika niczego. |
| **Skaner portali**       | 100+ wstępnie skonfigurowanych firm (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + własne zapytania wyszukiwania w sieci po Ashby, Greenhouse, Lever, Wellfound |
| **Odkrywanie firm po finansowaniu** | Komenda `company:funded` (najpierw przegląd) pokazuje firmy z niedawnym finansowaniem i diagnostykę źródeł z ustrukturyzowanych publicznych feedów, bez edytowania twoich danych |
| **Przetwarzanie wsadowe** | Równoległa ocena przez headless workery CLI (`claude -p` / `opencode run`)                                                             |
| **Dashboard TUI**        | Interfejs terminalowy do przeglądania, filtrowania i sortowania pipeline'u                                                               |
| **Integralność pipeline'u** | Automatyczne scalanie, deduplikacja, normalizacja statusów, kontrole stanu                                                            |
| **Zestaw do rozmów**     | Plany przygotowań w blokach czasowych, sesje ćwiczeniowe z feedbackiem, podsumowania po rozmowie ([`interview/`](modes/interview/README.md)) i detektor sygnałów ostrzegawczych firmy ([`interview-redflag`](modes/interview-redflag.md)) |
| **Etap oferty**          | Towarzysz czytania umowy: przejście po klauzulach plus lista pytań do prawnika ([`offer-prep`](modes/offer-prep.md)), i analizator luki między wynagrodzeniem oczekiwanym, ogłoszonym i rzeczywistym (`salary-gap.mjs`) |
| **Follow-upy i odpowiedzi** | Kalkulator rytmu follow-upów i przygotowane przypomnienia (`followup-cadence.mjs`, `followup-seed.mjs`); klasyfikacja odpowiedzi pracodawcy na aktualizacje trackera ([`reply-watch`](modes/reply-watch.md)) |
| **System wtyczek**       | Opcjonalne integracje (Gmail, Notion, Apify + rejestr społeczności), domyślnie wyłączone; zobacz [docs/PLUGINS.md](docs/PLUGINS.md)       |

</details>

## Szybki start

**Najszybsza droga, jedna komenda:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` jest dostarczany z [Node.js](https://nodejs.org): uruchamia instalator raz,
> nie instalując niczego globalnie. Nie masz jeszcze Node? Zainstaluj go najpierw.
> (Używasz już CLI Claude Code / Codex? To już go masz.)

To klonuje najnowsze wydanie do `./rebound-ops` i instaluje zależności. Potem:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**Przy pierwszym uruchomieniu rebound-ops przeprowadza cię przez konfigurację (twoje CV, profil i docelowe role) po prostu w rozmowie. Nic do edytowania ręcznie.**

<details>
<summary><b>Wolisz skonfigurować ręcznie? (git clone)</b></summary>

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

### Instalacja globalna

```bash
npm i -g ./engine/scaffolder
```

To instaluje binarkę `rebound-ops` globalnie, więc możesz uruchamiać `rebound-ops init [folder]` bez `npx`. `init` to jej jedyna komenda: tworzy przestrzeń roboczą, a wszystko dalej dzieje się w twoim AI CLI (zobacz Użycie poniżej), nie przez tę binarkę.

**Której użyć?**
- `node engine/scaffolder/bin/cli.mjs init`: najlepsza na pierwszy raz; tworzy dedykowany folder projektu.
- `npm i -g ./engine/scaffolder`: jeśli wolisz wpisywać `rebound-ops init` zamiast formy z `npx`. Nie dodaje żadnych innych komend.

> **System jest zaprojektowany tak, by dostosowywało go samo twoje AI CLI.** Tryby, archetypy, wagi oceny, skrypty negocjacyjne: po prostu poproś, żeby je zmieniło. Czyta te same pliki, których używa, więc wie dokładnie, co edytować.

Zobacz [docs/SETUP.md](docs/SETUP.md) po pełny przewodnik konfiguracji, [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) po instrukcje taniego uruchamiania rebound-ops na własnych lub lokalnych modelach (i [docs/FREE_TIER.md](docs/FREE_TIER.md), by uruchomić go za darmo na darmowym planie Antigravity CLI), [docs/AUTOMATION.md](docs/AUTOMATION.md) po harmonogram cyklicznych skanów i przepis na selekcję do shortlisty bez tokenów, [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) po szczegóły autouzupełniania formularzy ATS, [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) po porównanie eksportu kontaktów z LinkedIn z firmami w twoim lejku, oraz [docs/FAQ.md](docs/FAQ.md) po odpowiedzi na częste pytania o konfigurację, w tym [jak pochodzenie historii zapobiega zmyślonym liczbom](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). Zasady projektowe są w [ARCHITECTURE.md](ARCHITECTURE.md); przepływy runtime w [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Użycie

rebound-ops używa wspólnego routera komend. W CLI, które rejestrują komendy slash, wygląda to tak:

```
/rebound-ops           → Pokaż wszystkie dostępne komendy
/rebound-ops {JD}      → AUTO-PIPELINE: ocena + raport + PDF + tracker (wklej tekst lub URL)
/rebound-ops pipeline  → Przetwórz oczekujące URL-e ze skrzynki (data/pipeline.md)
/rebound-ops oferta    → Sama ocena, bloki A–H (bez automatycznego PDF)
/rebound-ops ofertas   → Porównaj i uszereguj wiele ofert
/rebound-ops contacto  → Mocny ruch na LinkedIn: znajdź kontakty + napisz szkic wiadomości
/rebound-ops deep      → Prompt do głębokiego researchu firmy
/rebound-ops interview-prep → Wygeneruj dokument przygotowania do rozmowy pod konkretną firmę
/rebound-ops interview    → Interaktywny wywiad wdrożeniowy o profilu i CV
/rebound-ops master-profile → Zaimportuj, przejrzyj i zweryfikuj swój Master Career Profile
/rebound-ops eu-swe    → Skalibruj europejską aplikację SWE przed CV, aplikacją lub rozmową
/rebound-ops interview/plan → Plan przygotowań w blokach czasowych na nadchodzącą rozmowę
/rebound-ops interview/practice → Rozmowa ćwiczeniowa, jedno pytanie na raz z feedbackiem
/rebound-ops interview/debrief → Podsumowanie po rozmowie: zamknij luki, przewidź następną rundę
/rebound-ops interview-redflag → Przeanalizuj sygnały ostrzegawcze pracodawcy przed dołączeniem do firmy
/rebound-ops pdf       → Tylko PDF, CV zoptymalizowane pod ATS
/rebound-ops text      → Dopasowane CV w markdown (odzwierciedla cv.md, bez PDF)
/rebound-ops latex     → Eksportuj CV jako LaTeX/Overleaf .tex
/rebound-ops latex-tex → Dopasuj własny resume.tex w miejscu (opt-in; cv.md pozostaje domyślne)
/rebound-ops cover     → List motywacyjny: samodzielnie wklejony opis lub /rebound-ops cover {slug}
/rebound-ops email     → Szkic formalnego maila aplikacyjnego (tylko szkic; nigdy nie wysyła, nie składa ani nie klika)
/rebound-ops add       → Dodaj projekt/publikację/rolę do CV (pobierz + podgląd + potwierdź)
/rebound-ops expand    → Automatycznie odkryj i dodaj brakujące kompetencje z linków w profilu
/rebound-ops training  → Oceń kurs/certyfikat względem North Star
/rebound-ops project   → Oceń pomysł na projekt do portfolio
/rebound-ops tracker   → Przegląd statusów aplikacji
/rebound-ops agent-inbox → Kolejkuj/opróżnij żądania na następną sesję (data/agent-inbox.md)
/rebound-ops apply     → Asystent aplikowania na żywo (czyta formularz + generuje odpowiedzi)
/rebound-ops scan      → Skanuj portale i odkrywaj nowe oferty
/rebound-ops discover  → Zamień listę firm na skanowalne tablice ATS + dopisz do portals.yml (bez tokenów)
/rebound-ops batch     → Przetwarzanie wsadowe z równoległymi workerami
/rebound-ops patterns  → Analizuj wzorce odrzuceń i popraw celowanie
/rebound-ops offer-prep → Przeczytaj otrzymaną ofertę/umowę z kandydatem: przejście po klauzulach + pytania do prawnika (to nie porada prawna)
/rebound-ops titles    → Zaproponuj pokrewne tytuły stanowisk z twojego CV, by poszerzyć poszukiwania
/rebound-ops upskill   → Zbiorcza analiza luk kompetencyjnych z ocenionych raportów
/rebound-ops followup  → Tracker rytmu follow-upów: oznacz zaległe, wygeneruj szkice
/rebound-ops reply-watch → Klasyfikuj odpowiedzi pracodawców i sugeruj aktualizacje trackera
/rebound-ops outcome   → Zapisz wynik aplikacji i zarchiwizuj artefakty
/rebound-ops calibrate → Raport doradczy: czy twoje oceny przewidują prawdziwe wyniki? Czyta dane /outcome; nigdy nie zmienia oceniania
/rebound-ops update    → Zaktualizuj pliki systemowe rebound-ops z podglądem diff + kontrolą zgodności
```

Albo po prostu wklej URL lub opis oferty: rebound-ops wykryje go automatycznie i uruchomi pełny pipeline.

W Codex komendy slash nie są gwarantowane. Użyj zamiast tego tych samych nazw trybów w promptcie albo wywołaj je z `codex exec`.

## Jak to działa

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Integracja z Antigravity CLI

rebound-ops wspiera Antigravity CLI natywnie, tak samo jak Claude Code i OpenCode. Wszystkie komendy slash są dostępne przez wspólny punkt wejścia skilla, z tą samą logiką oceny z `modes/*.md`.

Google przeniósł konsumencki dostęp do Gemini CLI na Antigravity CLI. `GEMINI.md` jest teraz nieaktywną osłoną zgodności, żeby Antigravity nie duplikował pełnych instrukcji projektu, gdy czyta zarówno `AGENTS.md`, jak i `GEMINI.md`.

### Natywne Antigravity CLI

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

Skill jest zdefiniowany według otwartego standardu w `.agents/skills/rebound-ops/SKILL.md` i podlinkowany lub wskazany dla każdego wspieranego CLI (np. `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`). Cursor automatycznie wykrywa wspólny skill w `.agents/skills/`.

## Integracja z Codex

rebound-ops wspiera Codex przez ten sam wspólny router, ale model wywołania różni się od CLI, które automatycznie rejestrują komendy slash. Pełny przewodnik: [docs/CODEX.md](docs/CODEX.md).

### Interaktywny Codex

```bash
cd rebound-ops
codex
```

Komendy slash nie są gwarantowane w Codex. Jeśli `/rebound-ops` jest niedostępne, poproś Codex o uruchomienie trybu bezpośrednio, prostym językiem:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex jednorazowo (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Integracja z Grok Build CLI

rebound-ops wspiera Grok Build CLI natywnie, tak samo jak Claude Code i OpenCode. `AGENTS.md` jest ładowany automatycznie jako reguły projektu, a wszystkie komendy slash są dostępne przez wspólny punkt wejścia skilla.

### Natywne Grok Build CLI

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

Do headless workerów wsadowych użyj `grok -p "prompt"` (dodaj `--yolo`, by automatycznie zatwierdzać wykonania narzędzi).

## Integracja z Pi

rebound-ops wspiera [Pi](https://github.com/earendil-works/pi) natywnie, bez pliku wrappera do utrzymywania: Pi czyta `AGENTS.md` z katalogu głównego repozytorium jako kontekst projektu i samo odnajduje wspólny skill w `.agents/skills/rebound-ops/SKILL.md`. Router jest wtedy dostępny jako `/skill:rebound-ops`.

### Natywne Pi

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

### Pi jednorazowo (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Jeśli jakiś build Pi uzależnia dostęp do zasobów projektu od decyzji o zaufaniu, uruchom raz `/trust` w repozytorium i zrestartuj `pi`, żeby skill projektu się załadował (`/trust` dotyczy przyszłych procesów Pi), albo uruchom z `-a`, co udziela zaufania tylko na jedno uruchomienie i nie wymaga restartu.

### Samodzielny skrypt Gemini API (bez instalacji CLI)

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

> **Darmowy plan:** obie opcje działają bez rozliczeń. Natywne CLI używa Google OAuth; skrypt API używa `gemini-3.6-flash` (limity zapytań zależą od modelu i planu; aktualne kwoty w dokumentacji Google AI).

## Skonfigurowane portale

Skaner ma **100+ firm** gotowych do skanowania i **35+ zapytań wyszukiwania** po głównych portalach z ofertami. Skopiuj `templates/portals.example.yml` do `portals.yml` i dodaj własne:

**Laboratoria AI:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Voice AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**Platformy AI:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Contact center:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automatyzacja:** n8n, Zapier, Make.com
**Europa:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Przeszukiwane portale:** 55+ modułów dostawców obejmuje API ATS, feedy całych portali, feedy XML/RSS, feedy markdown i lokalne parsery. Pełna tabela: [Obsługiwane portale](docs/SUPPORTED_JOB_BOARDS.md).

Domyślnie `node scan.mjs` (czyli `npm run scan`) ufa temu, co zwraca każdy feed ATS. Niektóre firmy zostawiają nieaktualne ogłoszenia w publicznym API nawet po zamknięciu rekrutacji, więc te wygasłe wpisy mogą przeciec do `pipeline.md`. Przekaż `--verify`, by po przejściu API uruchomić Playwrighta i odrzucić wygasłe ogłoszenia, zanim trafią do pipeline'u:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

Weryfikacja jest sekwencyjna i dotyczy tylko nowych ofert (po deduplikacji), więc koszt pozostaje ograniczony.

### 🇵🇱 Polskie portale z ofertami pracy

rebound-ops obsługuje główne polskie portale IT. Dwa z nich — JustJoin.it i NoFluffJobs — mają publiczne API i mogą być zintegrowane jako źródła Level 0 (zero tokenów, brak WebSearch, świeże dane w czasie skanowania). Pozostałe portale wymagają weryfikacji ręcznej lub przez Playwright.

| Portal              | URL                                          | API        | Uwagi                                                                 |
| ------------------- | -------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| **JustJoin.it**     | [justjoin.it](https://justjoin.it)           | Publiczne  | Największy portal IT w Polsce. JSON API z pełnymi danymi ofert        |
| **NoFluffJobs**     | [nofluffjobs.com](https://nofluffjobs.com)   | Publiczne  | Obowiązkowe widełki wynagrodzenia. Skierowany do seniorów             |
| **pracuj.pl**       | [pracuj.pl](https://pracuj.pl)               | Brak       | Największy ogólny portal. Blokuje boty (403) — weryfikacja ręczna     |
| **BulldogJob**      | [bulldogjob.pl](https://bulldogjob.pl)       | Brak       | IT-focused, oferty z widełkami                                        |
| **inhire.io**       | [inhire.io](https://inhire.io)               | Brak       | Headhunting IT, często oferty nieujawnione publicznie                 |
| **theprotocol.io**  | [theprotocol.io](https://theprotocol.io)     | Brak       | Dawny Rocket Jobs. Transparentne wynagrodzenia                        |
| **solid.jobs**      | [solid.jobs](https://solid.jobs)             | Brak       | Oferty z weryfikacją przez społeczność                                |

#### Polskie realia rynku pracy w ocenach

rebound-ops uwzględnia specyfikę polskiego rynku pracy przy ocenianiu ofert:

- **Forma zatrudnienia**: UoP (Umowa o pracę) vs B2B (Faktura VAT) vs UZ (Umowa zlecenie) — różnice w kwocie netto, bezpieczeństwie, urlopie i ZUS mają wpływ na ocenę stabilności
- **Wynagrodzenie**: brutto (przed podatkiem i ZUS) kontra netto (na rękę). Różnica bywa znaczna — system uwzględnia ją przy porównywaniu ofert
- **Benefity**: prywatna opieka medyczna (Medicover, LuxMed, Enel-Med), karta sportowa (MultiSport, OK System), Edenred / karta lunchowa, PPK
- **Urlop**: 20 dni przy stażu poniżej 10 lat, 26 dni przy stażu 10 lat i więcej (Kodeks pracy)
- **Praca zdalna**: pełny remote, hybryd (np. 2 dni/tydzień), model biurowy — system ocenia to w kontekście preferencji kandydata
- **Okres próbny**: do 3 miesięcy (6 miesięcy dla stanowisk kierowniczych zgodnie z KP)

## Dashboard TUI

Wbudowany dashboard terminalowy pozwala przeglądać pipeline wizualnie:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Funkcje: 10 zakładek filtrów, 8 trybów sortowania, widok zgrupowany/płaski, podglądy ładowane leniwie, zmiany statusu w linii.

Jest też **eksperymentalny interfejs webowy** (alpha i opt-in: nic nie działa, dopóki go nie uruchomisz): zobacz [`web/README.md`](web/README.md).

## Struktura projektu

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

## Zewnętrzny katalog danych (opcjonalnie)

Domyślnie dane warstwy użytkownika (takie jak `cv.md`, `portals.yml` oraz foldery `data/`, `reports/`, `output/`) żyją w folderze głównym projektu.

Aby oddzielić dane osobiste od kodu (łatwiej przełączać gałęzie, pobierać aktualizacje lub testować kilka profili), możesz skonfigurować zewnętrzny katalog danych według następującego pierwszeństwa:

1. **Zmienne środowiskowe:** ustaw zmienną `REBOUND_OPS_ROOT` lub `REBOUND_OPS_DATA_DIR`:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Plik znacznika:** utwórz plik `.rebound-ops-data` w katalogu głównym repozytorium ze ścieżką do katalogu danych.
3. **Domyślnie:** katalog główny repozytorium.

Po rozwiązaniu wszystkie pliki użytkownika są rozwiązywane i zapisywane względem tego folderu, a pliki promptów i skrypty nadal względem repozytorium.

- **Nadpisanie trackera:** możesz też ustawić `REBOUND_OPS_TRACKER`, by bezpośrednio wskazać ścieżkę pliku trackera aplikacji.
- **Zapisy:** wszystkie operacje zapisu (np. scalanie) kanonicznie trafiają do `{DATA_ROOT}/data/applications.md`.
- **Konfiguracja skanera:** `portals.yml` jest czytany i walidowany w `{DATA_ROOT}/portals.yml`, więc `node validate-portals.mjs` sprawdza ten sam plik, który czyta `scan.mjs`.
- **Generowane dokumenty:** dopasowane CV i listy motywacyjne są zapisywane w `{DATA_ROOT}/output/`, a manifest PDF, który łączy je z raportem, znajduje się w `{DATA_ROOT}/data/pdf-index.tsv`. Dopóki `REBOUND_OPS_TRACKER` nie jest ustawiony, przestrzenią roboczą trackera, która ogranicza te zapisy, jest katalog danych, a nie checkout.
- **PDF-y przy nadpisanym trackerze:** `generate-pdf.mjs` rozwiązuje `REBOUND_OPS_TRACKER`, zanim wyznaczy przestrzeń roboczą, więc przy ustawionym nadpisaniu przestrzenią roboczą jest folder, w którym leży ten tracker (albo folder nad nim, gdy tracker leży w folderze `data/`). HTML CV i każdy PDF muszą wtedy znajdować się w tej przestrzeni roboczej, a manifest przenosi się do jej `data/pdf-index.tsv`. Listy motywacyjne nadal trafiają do `{DATA_ROOT}/output/`, więc są odrzucane, gdy ten folder wypada poza przestrzeń roboczą trackera.
- **Warstwa kodu zostaje na miejscu:** `node_modules/`, `providers/`, `modes/` i same skrypty zawsze są rozwiązywane względem repozytorium, nigdy względem katalogu danych.

Dashboard TUI w Go, skrypty Node.js i tryby agenta AI automatycznie respektują tę hierarchię.


## Stack technologiczny

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Agent**: AI CLI do kodowania ze wspólnymi skillami i trybami (`AGENTS.md` + wrapper dla CLI)
- **PDF**: Playwright + szablon HTML
- **Listy motywacyjne**: szablon HTML + Playwright (PDF A4, ten sam pipeline co CV)
- **Skaner**: Playwright + Greenhouse API + WebSearch
- **Dashboard**: Go + Bubble Tea + Lipgloss (motyw Catppuccin Mocha)
- **Dane**: tabele Markdown + konfiguracja YAML + pliki wsadowe TSV

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Działa też w każdym CLI zgodnym ze standardem agent skills. Zobacz <a href="docs/SUPPORTED_CLIS.md">obsługiwane CLI</a>.</sub><br>
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

## FAQ

**Czym jest rebound-ops?**
**Czy dopasowane CV może coś zmyślić?**
Nie wolno mu, i prompty to mówią: przeredagować, nigdy nie zmyślać. `generate-pdf` blokuje CV z liczbami lub faktami, których nie ma w twoich źródłach, chyba że przekażesz `--skip-fact-check`. Tryb `pdf` uruchamia też `cv-title-check.mjs`, który porównuje każdą nazwę stanowiska w dopasowanym CV z nazwą, jaką cv.md podaje dla tej samej pracy (dopasowanie po firmie i datach), i pyta, czy zachować, czy cofnąć każdą, która się różni. Tylko ostrzega, nie blokuje, bo przeredagowanie nazwy stanowiska bywa twoją decyzją. Nic jeszcze nie ocenia przeformułowań: śledzi to [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (kontrola wierności blokująca przy niezgodności). Do tego czasu czytaj każde CV przed wysłaniem. [Zastrzeżenie prawne](LEGAL_DISCLAIMER.md) mówi to samo dłużej.

**Czy mogę uruchamiać rebound-ops za darmo albo na tańszym / lokalnym modelu?**
Tak. rebound-ops jest niezależny od CLI i działa na darmowych i lokalnych modelach (darmowe modele OpenRouter, Ollama lub dowolny endpoint zgodny z OpenAI), więc nie jesteś przywiązany do płatnej subskrypcji. Pełna konfiguracja: [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md).

**Płacę za Claude Pro/Max, ale rebound-ops zużywa kredyty API. Dlaczego?**
Bo `ANTHROPIC_API_KEY` w twoim środowisku ma pierwszeństwo przed zalogowaną subskrypcją: CLI używa klucza i rozlicza per token. Uruchom `echo $ANTHROPIC_API_KEY`, a jeśli coś wypisze, usuń go z profilu powłoki, zrestartuj terminal i uruchom `/login`. Tryb wsadowy jest wyjątkiem, bo workery `claude -p` nie używają interaktywnego logowania: uruchom raz `claude setup-token` i wyeksportuj wynik jako `CLAUDE_CODE_OAUTH_TOKEN`. Pełna instrukcja w [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**Z jakimi AI CLI działa rebound-ops?**
rebound-ops działa z każdym głównym AI CLI do kodowania (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen i inne) przez otwarty Agent Skill Standard, więc nigdy nie jest przywiązany do jednego dostawcy. Użyj CLI, które już masz.

**Jak zainstalować rebound-ops na Windows?**
rebound-ops działa na Windows. Konfiguracja specyficzna dla platformy i znane pułapki (wykrywanie Git Bash, końce linii, Harmonogram zadań) są w [docs/WINDOWS.md](docs/WINDOWS.md). Jeśli skille nie ładują się z błędem symlinka podczas instalacji, rozwiązanie jest w [docs/FAQ.md](docs/FAQ.md). Pełne kroki w [docs/SETUP.md](docs/SETUP.md).

**Czy rebound-ops aplikuje na oferty za mnie?**
Nie. rebound-ops to filtr, a nie narzędzie do masowego automatycznego aplikowania. AI ocenia, szereguje i pisze szkice; ty sprawdzasz i decydujesz. Pisze szkice i wypełnia pola; nigdy nie składa aplikacji. Ty klikasz Wyślij. Właśnie o to chodzi w projekcie z człowiekiem w pętli.

**Czy rebound-ops jest darmowy i open source?**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md).
## Zastrzeżenie prawne

**rebound-ops to lokalne narzędzie open source, NIE usługa hostowana.** Używając tego oprogramowania, przyjmujesz do wiadomości, że:

1. **Ty kontrolujesz swoje dane.** Twoje CV, dane kontaktowe i dane osobowe zostają na twojej maszynie i są wysyłane bezpośrednio do wybranego przez ciebie dostawcy AI (Anthropic, OpenAI itd.). Nie zbieramy, nie przechowujemy ani nie mamy dostępu do żadnych twoich danych.
2. **Ty kontrolujesz AI.** Domyślne prompty instruują AI, by nie wysyłało aplikacji automatycznie, ale modele AI mogą zachowywać się nieprzewidywalnie. Jeśli modyfikujesz prompty lub używasz innych modeli, robisz to na własne ryzyko. **Zawsze sprawdzaj poprawność treści wygenerowanych przez AI przed wysłaniem.**
3. **Ty przestrzegasz regulaminów stron trzecich.** Musisz używać tego narzędzia zgodnie z regulaminami portali kariery, z którymi wchodzisz w interakcję (Greenhouse, Lever, Workday, LinkedIn itd.). Nie używaj tego narzędzia do spamowania pracodawców ani przeciążania systemów ATS.
4. **Brak gwarancji.** Oceny to rekomendacje, nie prawda. Modele AI mogą halucynować umiejętności lub doświadczenie. Autorzy nie ponoszą odpowiedzialności za wyniki zatrudnienia, odrzucone aplikacje, ograniczenia kont ani żadne inne konsekwencje.

Zobacz [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) po pełne szczegóły. To oprogramowanie jest dostarczane na [licencji MIT](LICENSE) „tak jak jest", bez jakiejkolwiek gwarancji.

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
