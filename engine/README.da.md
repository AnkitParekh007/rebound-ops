# ReboundOps engine

> Attribution: This engine adapts [rebound-ops](https://github.com/rebound-ops-hq/rebound-ops), created by Ankit Parekh and contributors (MIT). ReboundOps maintains an adapted integration. See [provenance](../PROVENANCE.md) and the original notices. This attribution correction is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## Hvad rebound-ops gør for dig

Indsæt et job. Den fortæller dig, om aftenen er det værd.

- **Stadig åbent?** Den tjekker, at opslaget stadig er aktivt, før du skriver et ord.
- **Ikke dig?** Den scorer rollen op mod dit rigtige CV og siger, at du skal springe et svagt match over. Du kan tilsidesætte den.
- **Værd at søge?** Den skriver udkast til CV, ansøgning og svar. Du læser dem. Du sender dem.
- **Hvem skal jeg tale med?** Den finder personen og skriver udkast til beskeden. Den sender den aldrig.
- **Hvor ender det hele?** Hver ansøgning bliver på din maskine. Intet bliver uploadet til os.
- **Hvad bør jeg lære?** Efter en stribe afslag sætter den navn på hullet.

De første kørsler er ujævne. Den kender dig ikke endnu. Tal med den: dit CV, hvad du vil, hvad du afviser. Tænk på det som en rekrutterers første uge.

Ved første start spørger den om alt det i chatten. Intet at konfigurere i hånden.

## Hvad rebound-ops ikke gør

- **Sende en ansøgning automatisk.** Den skriver udkast til svaret i hvert felt; du gennemgår og klikker Send. Scriptet laver aldrig et POST (`prepare-application.mjs`).
- **Sender en e-mail.** Kun udkast. Der findes ingen mailtransport nogen steder i koden.
- **Ringer hjem.** Ingen telemetri, ingen backend hos os. Dit CV går fra din maskine til den AI-udbyder, du har valgt, og ingen andre steder. Det eneste offentlige register er dette repository: `HIRED.md` og dets issues.
- **Presser dig til at søge under 4,0/5.** Den siger, du skal lade være. Du kan tilsidesætte det, og den siger det.

Den omformulerer dit CV; den må aldrig opdigte det. En kontrol i koden stopper en PDF med tal eller fakta, der hverken står i dit CV eller i `article-digest.md`, men den kan endnu ikke vurdere enhver omformulering. Læs hvert CV, før du sender det. Detaljer i [FAQ](#faq).

## Funktioner

| Funktion                 | Beskrivelse                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H-vurdering**        | Rolleresumé, CV-match (med hvor meget hvert krav betyder for dette opslag, og om vægten kom fra jobbeskrivelsens egen ordlyd, dens struktur eller et skøn, mærket pr. krav; et skøn kan aldrig ligge i topbåndet), niveaustrategi, lønresearch, personalisering, samtaleforberedelse (STAR+R), plus et troværdighedstjek i blok G (er det stadig åbent, er det et genopslag: observationer, ikke domme), og et arbejdstilladelsessignal, der markerer en jobbeskrivelse med eksplicit ingen visumsponsorering som en hård blokering |
| **Human-in-the-Loop**    | AI vurderer og anbefaler, du beslutter og handler. Systemet indsender aldrig en ansøgning: du har altid det sidste ord <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS-PDF-generering**   | ATS-læsbare CV'er tilpasset hver jobbeskrivelse ud fra din egen erfaring, i Space Grotesk + DM Sans-design                                |
| **Ansøgningsgenerator**  | Researchbaserede ansøgninger med spejling af nøgleord, fire interaktive vinkelspørgsmål (hvorfor/problemer/tilgang/tone), godkendelse af udkast i chatten og A4-PDF via samme HTML + Playwright-pipeline som CV'er. Laver automatisk udkast ved hver vurdering; færdiggør og generér efter behov via `/rebound-ops cover` |
| **Ud over CV'et**        | Virksomhedsresearch ([`deep`](modes/deep.md)) afdækker AI-strategi, seneste træk, engineering-kultur og den vinkel, din profil bør tage. Kontaktsøgning ([`contacto`](modes/contacto.md)) finder den hiring manager, rekrutterer eller kollega, det er værd at kontakte, og skriver et LinkedIn-udkast på ≤300 tegn tilpasset hver kontakttype. Formelle udkast til ansøgningsmails ([`email`](modes/email.md)) gør en vurderet rapport eller indsat jobbeskrivelse til emnelinje, brødtekst og tjekliste over vedhæftninger uden at sende, indsende eller klikke på noget. Ansøgninger sætter dig i køen; research giver dig en samtale. |
| **Mønsteranalyse**       | Afslagsmønstre og fremgangsrater pr. ATS-kanal (`analyze-patterns.mjs`), tragtstatistik for hele søgningen (`stats.mjs`), registrering af genopslag, et muligt tegn på et spøgelsesjob (`detect-reposts.mjs`) |

<details>
<summary><b>Alt det andet, den gør</b></summary>

| Funktion                 | Beskrivelse                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-pipeline**        | Indsæt en URL, få en fuld vurdering + PDF + tracker-post                                                                                 |
| **Interview-historiebank** | Samler STAR+Reflection-historier på tværs af vurderinger: 5-10 masterhistorier, du kan tilpasse til de adfærdsspørgsmål, du får          |
| **Forhandlingsscripts**  | Rammer for lønforhandling, modsvar til geografisk rabat, brug af konkurrerende tilbud                                                    |
| **Udkast til ansøgningsmails** | Formelle mails til rekrutterer, henvisning eller uopfordret ansøgning fra en rapport eller indsat jobbeskrivelse, med emnelinje, tjekliste over vedhæftninger, dokumenterede matchpunkter og en kontaktblok fra din profil. Kun udkast: rebound-ops sender, indsender eller klikker aldrig på noget. |
| **Portalscanner**        | 100+ forudkonfigurerede virksomheder (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + egne websøgninger på tværs af Ashby, Greenhouse, Lever, Wellfound |
| **Find finansierede virksomheder** | Kommandoen `company:funded` (gennemse først) viser nyligt finansierede virksomheder og kildediagnostik fra strukturerede offentlige feeds uden at redigere dine data |
| **Batch-behandling**     | Parallel vurdering med headless CLI-workers (`claude -p` / `opencode run`)                                                               |
| **Dashboard TUI**        | Terminal-UI til at gennemse, filtrere og sortere din pipeline                                                                            |
| **Pipeline-integritet**  | Automatisk sammenfletning, deduplikering, statusnormalisering, sundhedstjek                                                              |
| **Interview-pakke**      | Tidsblokkede forberedelsesplaner, øvesessioner med feedback, debriefs efter samtalen ([`interview/`](modes/interview/README.md)) og en detektor for røde flag hos virksomheden ([`interview-redflag`](modes/interview-redflag.md)) |
| **Tilbudsfasen**         | Følgesvend til kontraktlæsning: gennemgang klausul for klausul plus en spørgsmålsliste til advokaten ([`offer-prep`](modes/offer-prep.md)), og en analyse af gabet mellem ønsket, annonceret og faktisk løn (`salary-gap.mjs`) |
| **Opfølgning og svar**   | Beregner af opfølgningskadence og forberedte påmindelser (`followup-cadence.mjs`, `followup-seed.mjs`); klassificering af arbejdsgiverens svar til tracker-opdateringer ([`reply-watch`](modes/reply-watch.md)) |
| **Plugin-system**        | Tilvalgsintegrationer (Gmail, Notion, Apify + et community-register), slået fra som standard; se [docs/PLUGINS.md](docs/PLUGINS.md)      |

</details>

## Hurtig start

**Hurtigste vej, én kommando:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` følger med [Node.js](https://nodejs.org): det kører installationen én gang
> uden at installere noget globalt. Ingen Node endnu? Installer den først.
> (Bruger du allerede en Claude Code / Codex CLI? Så har du den allerede.)

Det kloner den seneste udgivelse ind i `./rebound-ops` og installerer afhængigheder. Derefter:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**Ved første start fører rebound-ops dig gennem opsætningen (dit CV, din profil og dine målroller) bare ved at chatte. Intet at redigere i hånden.**

<details>
<summary><b>Foretrækker du at sætte det op manuelt? (git clone)</b></summary>

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

### Global installation

```bash
npm i -g ./engine/scaffolder
```

Det installerer `rebound-ops`-binæren globalt, så du kan køre `rebound-ops init [folder]` uden `npx`. `init` er dens eneste kommando: den opretter et arbejdsområde, og alt derefter foregår i din AI-kodnings-CLI (se Brug nedenfor), ikke gennem denne binær.

**Hvilken skal du bruge?**
- `node engine/scaffolder/bin/cli.mjs init`: bedst til første brug; opretter en dedikeret projektmappe.
- `npm i -g ./engine/scaffolder`: hvis du hellere vil skrive `rebound-ops init` end `npx`-formen. Den tilføjer ingen andre kommandoer.

> **Systemet er designet til at blive tilpasset af din AI-kodnings-CLI selv.** Tilstande, arketyper, scorevægte, forhandlingsscripts: bed den bare om at ændre dem. Den læser de samme filer, som den bruger, så den ved præcis, hvad den skal redigere.

Se [docs/SETUP.md](docs/SETUP.md) for den fulde opsætningsguide, [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) for at køre rebound-ops billigt med egne eller lokale modeller (og [docs/FREE_TIER.md](docs/FREE_TIER.md) for at køre det gratis på Antigravity CLI's gratis niveau), [docs/AUTOMATION.md](docs/AUTOMATION.md) for planlægning af tilbagevendende scanninger og en opskrift på triage-til-shortlist uden tokens, [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) for detaljer om ATS-autoudfyldningsflowet, [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) for at krydstjekke en eksport af dine LinkedIn-forbindelser mod virksomhederne i din tragt, og [docs/FAQ.md](docs/FAQ.md) for svar på almindelige opsætningsspørgsmål, herunder [hvordan historiers oprindelse forhindrer opdigtede tal](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). Designprincipper ligger i [ARCHITECTURE.md](ARCHITECTURE.md); runtime-flows i [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Brug

rebound-ops bruger en fælles kommandorouter. I CLI'er, der registrerer slash-kommandoer, ser det sådan ud:

```
/rebound-ops           → Vis alle tilgængelige kommandoer
/rebound-ops {JD}      → AUTO-PIPELINE: vurdering + rapport + PDF + tracker (indsæt tekst eller URL)
/rebound-ops pipeline  → Behandl ventende URL'er fra indbakken (data/pipeline.md)
/rebound-ops oferta    → Kun vurdering, blok A til H (ingen automatisk PDF)
/rebound-ops ofertas   → Sammenlign og rangér flere opslag
/rebound-ops contacto  → LinkedIn-trækket: find kontakter + skriv udkast til besked
/rebound-ops deep      → Prompt til dyb research af virksomheden
/rebound-ops interview-prep → Generér et virksomhedsspecifikt forberedelsesdokument til samtalen
/rebound-ops interview    → Interaktivt onboarding-interview om profil og CV
/rebound-ops master-profile → Importér, gennemgå og validér din Master Career Profile
/rebound-ops eu-swe    → Kalibrér en europæisk SWE-ansøgning før CV, ansøgning eller samtale
/rebound-ops interview/plan → Tidsblokket forberedelsesplan til en kommende samtale
/rebound-ops interview/practice → Øvesamtale, ét spørgsmål ad gangen med feedback
/rebound-ops interview/debrief → Debrief efter samtalen: luk huller, forudsig næste runde
/rebound-ops interview-redflag → Analysér arbejdsgiverens advarselstegn, før du starter
/rebound-ops pdf       → Kun PDF, ATS-optimeret CV
/rebound-ops text      → Tilpasset markdown-CV (spejler cv.md, ingen PDF)
/rebound-ops latex     → Eksportér CV som LaTeX/Overleaf .tex
/rebound-ops latex-tex → Tilpas din egen resume.tex på stedet (tilvalg; cv.md forbliver standard)
/rebound-ops cover     → Ansøgning: selvstændig indsat jobbeskrivelse eller /rebound-ops cover {slug}
/rebound-ops email     → Udkast til formel ansøgningsmail (kun udkast; sender, indsender eller klikker aldrig)
/rebound-ops add       → Tilføj et projekt/en artikel/en rolle til dit CV (hent + forhåndsvis + bekræft)
/rebound-ops expand    → Find og tilføj manglende kompetencer automatisk fra profil-links
/rebound-ops training  → Vurdér kursus/certificering mod dit North Star
/rebound-ops project   → Vurdér en idé til et porteføljeprojekt
/rebound-ops tracker   → Overblik over ansøgningsstatus
/rebound-ops agent-inbox → Kø/tøm anmodninger til næste session (data/agent-inbox.md)
/rebound-ops apply     → Live ansøgningsassistent (læser formularen + genererer svar)
/rebound-ops scan      → Scan portaler og find nye opslag
/rebound-ops discover  → Omsæt en virksomhedsliste til scanbare ATS-boards + tilføj til portals.yml (uden tokens)
/rebound-ops batch     → Batch-behandling med parallelle workers
/rebound-ops patterns  → Analysér afslagsmønstre og forbedr målretningen
/rebound-ops offer-prep → Læs et modtaget tilbud/en kontrakt sammen med kandidaten: gennemgang af klausuler + spørgsmål til advokaten (ikke juridisk rådgivning)
/rebound-ops titles    → Foreslå beslægtede jobtitler ud fra dit CV for at udvide søgningen
/rebound-ops upskill   → Samlet analyse af kompetencegab ud fra dine vurderede rapporter
/rebound-ops followup  → Tracker for opfølgningskadence: markér forfaldne, generér udkast
/rebound-ops reply-watch → Klassificér arbejdsgiverens svar og foreslå tracker-opdateringer
/rebound-ops outcome   → Registrér ansøgningens udfald og arkivér artefakter
/rebound-ops calibrate → Rådgivende rapport: forudsiger dine vurderingsscorer dine reelle udfald? Læser /outcome-data; ændrer aldrig scoringen
/rebound-ops update    → Opdatér rebound-ops' systemfiler med diff-forhåndsvisning + kompatibilitetstjek
```

Eller indsæt bare en job-URL eller beskrivelse direkte: rebound-ops registrerer den automatisk og kører den fulde pipeline.

I Codex er slash-kommandoer ikke garanteret. Brug i stedet de samme tilstandsnavne i en prompt, eller kald dem fra `codex exec`.

## Sådan virker det

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity CLI-integration

rebound-ops understøtter Antigravity CLI indbygget, på samme måde som Claude Code og OpenCode. Alle slash-kommandoer er tilgængelige gennem det fælles skill-indgangspunkt med samme `modes/*.md`-vurderingslogik.

Google har flyttet forbrugeradgangen til Gemini CLI over på Antigravity CLI. `GEMINI.md` er nu en virkningsløs kompatibilitetsvagt, så Antigravity ikke dublerer de fulde projektinstruktioner, når den læser både `AGENTS.md` og `GEMINI.md`.

### Indbygget Antigravity CLI

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

Skillet er defineret efter den åbne standard i `.agents/skills/rebound-ops/SKILL.md` og symlinket/refereret for hver understøttet CLI (fx `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`). Cursor finder automatisk det fælles skill i `.agents/skills/`.

## Codex-integration

rebound-ops understøtter Codex gennem den samme fælles router, men kaldemodellen er anderledes end for CLI'er, der automatisk registrerer slash-kommandoer. Den fulde guide findes i [docs/CODEX.md](docs/CODEX.md).

### Interaktiv Codex

```bash
cd rebound-ops
codex
```

Slash-kommandoer er ikke garanteret i Codex. Hvis `/rebound-ops` ikke er tilgængelig, så bed Codex om at køre tilstanden direkte på almindeligt sprog:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex i ét kald (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok Build CLI-integration

rebound-ops understøtter Grok Build CLI indbygget, på samme måde som Claude Code og OpenCode. `AGENTS.md` indlæses automatisk som projektregler, og alle slash-kommandoer er tilgængelige gennem det fælles skill-indgangspunkt.

### Indbygget Grok Build CLI

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

Til headless batch-workers, brug `grok -p "prompt"` (tilføj `--yolo` for automatisk at godkende værktøjskørsler).

## Pi-integration

rebound-ops understøtter [Pi](https://github.com/earendil-works/pi) indbygget, uden nogen wrapper-fil at vedligeholde: Pi læser `AGENTS.md` fra repository-roden som projektkontekst og finder selv det fælles skill i `.agents/skills/rebound-ops/SKILL.md`. Routeren er derefter tilgængelig som `/skill:rebound-ops`.

### Indbygget Pi

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

### Pi i ét kald (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Hvis et Pi-build lægger projektets ressourcer bag en tillidsbeslutning, så kør `/trust` én gang inde i repositoryet og genstart `pi`, så projektets skill indlæses (`/trust` gælder for fremtidige Pi-processer), eller start med `-a`, som giver tillid til en enkelt kørsel og ikke kræver genstart.

### Selvstændigt Gemini API-script (ingen CLI-installation nødvendig)

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

> **Gratis niveau:** Begge muligheder virker uden betaling. Den indbyggede CLI bruger Google OAuth; API-scriptet bruger `gemini-3.6-flash` (rategrænser afhænger af model og niveau; se Google AI-dokumentationen for aktuelle kvoter).

## Forudkonfigurerede portaler

Scanneren kommer med **100+ virksomheder** klar til scanning og **35+ søgninger** på tværs af de store jobportaler. Kopiér `templates/portals.example.yml` til `portals.yml` og tilføj dine egne:

**AI-laboratorier:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Stemme-AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI-platforme:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Kontaktcenter:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automatisering:** n8n, Zapier, Make.com
**Europa:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Jobportaler, der søges i:** 55+ udbydermoduler dækker ATS-API'er, feeds for hele portaler, XML/RSS-feeds, markdown-feeds og lokale parsere. Se [Understøttede jobportaler](docs/SUPPORTED_JOB_BOARDS.md) for den fulde tabel.

Som standard stoler `node scan.mjs` (alias `npm run scan`) på det, hvert ATS-feed returnerer. Nogle virksomheder lader forældede opslag stå i deres offentlige API, selv efter stillingen er lukket, så de udløbne poster kan sive ind i `pipeline.md`. Giv `--verify` for at starte Playwright efter API-gennemløbet og frasortere udløbne opslag, før de rammer pipelinen:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

Verifikationen er sekventiel og kører kun på nye opslag (efter deduplikering), så omkostningen forbliver begrænset.

## Dashboard TUI

Det indbyggede terminal-dashboard lader dig gennemse din pipeline visuelt:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Funktioner: 10 filterfaner, 8 sorteringstilstande, grupperet/flad visning, forhåndsvisninger med lazy loading, statusændringer inline.

Der findes også en **eksperimentel web-UI** (alfa og tilvalg: intet kører, medmindre du starter den): se [`web/README.md`](web/README.md).

## Projektstruktur

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

## Ekstern datamappe (valgfri)

Som standard ligger brugerlagets data (såsom `cv.md`, `portals.yml` og mapperne `data/`, `reports/`, `output/`) i projektets rodmappe.

For at adskille dine personlige data fra koden (så det bliver lettere at skifte branch, hente opdateringer eller teste flere profiler) kan du konfigurere en ekstern datamappe med følgende rækkefølge:

1. **Miljøvariabler:** Sæt miljøvariablen `REBOUND_OPS_ROOT` eller `REBOUND_OPS_DATA_DIR`:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Markørfil:** Opret en `.rebound-ops-data`-fil i repository-roden med stien til din datamappe.
3. **Standard:** Repository-roden.

Når det er afgjort, opløses og skrives alle brugerfiler relativt til den mappe, mens promptfiler og scripts fortsat opløses relativt til repositoryet.

- **Tilsidesæt tracker:** Du kan også sætte `REBOUND_OPS_TRACKER` for direkte at tilsidesætte stien til ansøgningstrackerens fil.
- **Skrivninger:** Alle skriveoperationer (såsom sammenfletninger) retter sig kanonisk mod `{DATA_ROOT}/data/applications.md`.
- **Scannerkonfiguration:** `portals.yml` læses og valideres i `{DATA_ROOT}/portals.yml`, så `node validate-portals.mjs` tjekker den samme fil, som `scan.mjs` læser.
- **Genererede dokumenter:** Tilpassede CV'er og ansøgninger skrives under `{DATA_ROOT}/output/`, og PDF-manifestet, der knytter dem til en rapport, ligger i `{DATA_ROOT}/data/pdf-index.tsv`. Så længe `REBOUND_OPS_TRACKER` ikke er sat, er trackerens arbejdsområde, som afgrænser de skrivninger, datamappen og ikke checkoutet.
- **PDF'er med tilsidesat tracker:** `generate-pdf.mjs` opløser `REBOUND_OPS_TRACKER`, før den udleder arbejdsområdet, så når tilsidesættelsen er sat, er arbejdsområdet den mappe, der indeholder trackeren (eller mappen over den, når trackeren ligger i en `data/`-mappe). CV'ets HTML og hver PDF skal så ligge inden for det arbejdsområde, og manifestet flytter til dets `data/pdf-index.tsv`. Ansøgninger skrives stadig til `{DATA_ROOT}/output/`, så de afvises, når den mappe ligger uden for trackerens arbejdsområde.
- **Kodelaget bliver, hvor det er:** `node_modules/`, `providers/`, `modes/` og selve scriptene opløses altid i forhold til repositoryet, aldrig datamappen.

Go-dashboardets TUI, Node.js-scripts og AI-agenttilstande respekterer alle automatisk denne rækkefølge.


## Teknologistak

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Agent**: AI-kodnings-CLI med fælles skills og tilstande (`AGENTS.md` + CLI-wrapper)
- **PDF**: Playwright + HTML-skabelon
- **Ansøgninger**: HTML-skabelon + Playwright (A4-PDF, samme pipeline som CV'er)
- **Scanner**: Playwright + Greenhouse API + WebSearch
- **Dashboard**: Go + Bubble Tea + Lipgloss (Catppuccin Mocha-tema)
- **Data**: Markdown-tabeller + YAML-konfiguration + TSV-batchfiler

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Kører også i enhver CLI, der følger agent skill-standarden. Se <a href="docs/SUPPORTED_CLIS.md">understøttede CLI'er</a>.</sub><br>
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

**Hvad er rebound-ops?**
ReboundOps integrates a modified MIT-licensed [rebound-ops engine](https://github.com/rebound-ops-hq/rebound-ops), originally created by Ankit Parekh and contributors. It did not originate the upstream manifesto or its founder outcomes. See [provenance](../PROVENANCE.md). (Attribution correction maintained in English.)

**Kan det tilpassede CV finde på ting?**
Det må det ikke, og prompterne siger det: omformuler, opdigt aldrig. `generate-pdf` blokerer et CV med tal eller fakta, der ikke står i dine kilder, medmindre du angiver `--skip-fact-check`. `pdf`-tilstanden kører også `cv-title-check.mjs`, som sammenligner hver jobtitel i det tilpassede CV med den titel, cv.md giver samme job (matchet på virksomhed og datoer), og spørger dig, om en afvigende titel skal beholdes eller rettes tilbage. Den advarer i stedet for at blokere, fordi en omformuleret titel nogle gange er dit valg. Intet bedømmer omformuleringer endnu: [#1411](https://github.com/rebound-ops-hq/rebound-ops/issues/1411) (troskabskontrol, der blokerer ved afvigelse) følger det. Indtil da: læs hvert CV, før du sender det. [Den juridiske ansvarsfraskrivelse](LEGAL_DISCLAIMER.md) siger det samme med flere ord.

**Kan jeg køre rebound-ops gratis eller på en billigere / lokal model?**
Ja. rebound-ops er CLI-uafhængig og kører på gratis og lokale modeller (gratis OpenRouter-modeller, Ollama eller ethvert OpenAI-kompatibelt endpoint), så du er ikke bundet til et betalt abonnement. Se [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) for den fulde opsætning.

**Jeg betaler for Claude Pro/Max, men rebound-ops brænder API-kredit af. Hvorfor?**
Fordi en `ANTHROPIC_API_KEY` i dit miljø går forud for dit indloggede abonnement: CLI'en bruger nøglen og fakturerer pr. token. Kør `echo $ANTHROPIC_API_KEY`, og hvis den udskriver noget, så fjern den fra din shell-profil, genstart terminalen og kør `/login`. Batch-tilstand er undtagelsen, da `claude -p`-workers ikke bruger det interaktive login: kør `claude setup-token` én gang og eksportér resultatet som `CLAUDE_CODE_OAUTH_TOKEN`. Fuld gennemgang i [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**Hvilke AI-CLI'er virker rebound-ops med?**
rebound-ops kører på enhver større AI-kodnings-CLI (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen og flere) gennem den åbne Agent Skill Standard, så den er aldrig låst til én leverandør. Brug den CLI, du allerede har.

**Hvordan installerer jeg rebound-ops på Windows?**
rebound-ops kører på Windows. Platformspecifik opsætning og de kendte faldgruber (Git Bash-detektion, linjeskift, Opgavestyring) findes i [docs/WINDOWS.md](docs/WINDOWS.md). Hvis skills ikke indlæses med en symlink-fejl under installationen, findes løsningen i [docs/FAQ.md](docs/FAQ.md). Fulde trin findes i [docs/SETUP.md](docs/SETUP.md).

**Søger rebound-ops job for mig automatisk?**
Nej. rebound-ops er et filter, ikke en spray-and-pray-autosøger. AI'en vurderer, rangerer og skriver udkast; du gennemgår og beslutter. Den skriver udkast og udfylder felterne; den indsender aldrig. Du trykker på Send. Det human-in-the-loop-design er hele pointen.

**Er rebound-ops gratis og open source?**
The source is MIT-licensed; optional AI providers may charge separately. Our own [product principles](../docs/principles.md) do not collect public signatures. The upstream manifesto remains the work of its original authors. (Attribution correction maintained in English.)

## Juridisk ansvarsfraskrivelse

**rebound-ops er et lokalt open source-værktøj, IKKE en hostet tjeneste.** Ved at bruge denne software anerkender du:

1. **Du kontrollerer dine data.** Dit CV, dine kontaktoplysninger og personlige data bliver på din maskine og sendes direkte til den AI-udbyder, du vælger (Anthropic, OpenAI osv.). Vi indsamler, gemmer eller har ikke adgang til nogen af dine data.
2. **Du kontrollerer AI'en.** Standardprompterne instruerer AI'en i ikke at indsende ansøgninger automatisk, men AI-modeller kan opføre sig uforudsigeligt. Hvis du ændrer prompterne eller bruger andre modeller, gør du det på egen risiko. **Gennemgå altid AI-genereret indhold for nøjagtighed, før du sender.**
3. **Du overholder tredjeparters vilkår.** Du skal bruge dette værktøj i overensstemmelse med vilkårene for de karriereportaler, du interagerer med (Greenhouse, Lever, Workday, LinkedIn osv.). Brug ikke dette værktøj til at spamme arbejdsgivere eller overbelaste ATS-systemer.
4. **Ingen garantier.** Vurderinger er anbefalinger, ikke sandhed. AI-modeller kan hallucinere færdigheder eller erfaring. Forfatterne er ikke ansvarlige for beskæftigelsesresultater, afviste ansøgninger, kontobegrænsninger eller andre konsekvenser.

Se [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) for alle detaljer. Denne software leveres under [MIT-licensen](LICENSE) "som den er", uden nogen form for garanti.

## License

MIT — see [LICENSE](LICENSE). This folder is derived from third-party MIT-licensed software; the original notices are reproduced in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
