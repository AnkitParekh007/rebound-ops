# ReboundOps engine

> Attribution: This engine adapts [rebound-ops](https://github.com/rebound-ops-hq/rebound-ops), created by Ankit Parekh and contributors (MIT). ReboundOps maintains an adapted integration. See [provenance](../PROVENANCE.md) and the original notices. This attribution correction is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## Was rebound-ops für dich tut

Füge eine Stelle ein. Es sagt dir, ob sich der Abend lohnt.

- **Noch offen?** Es prüft, ob die Anzeige noch online ist, bevor du ein Wort schreibst.
- **Nichts für dich?** Es bewertet die Stelle gegen deinen echten Lebenslauf und rät dir bei schwacher Passung ab. Du kannst es überstimmen.
- **Lohnt es sich?** Es entwirft Lebenslauf, Anschreiben und Antworten. Du liest sie. Du schickst sie ab.
- **Mit wem rede ich?** Es findet die Person und entwirft die Nachricht. Abschicken tut es sie nie.
- **Wo landet das alles?** Jede Bewerbung bleibt auf deinem Rechner. Zu uns wird nichts hochgeladen.
- **Was sollte ich lernen?** Nach einer Serie von Absagen benennt es die Lücke.

Die ersten Durchläufe sind holprig. Es kennt dich noch nicht. Sprich mit ihm: dein Lebenslauf, was du willst, was du ablehnst. Stell es dir wie die erste Woche eines Recruiters vor.

Beim ersten Start fragt es das alles im Chat ab. Nichts von Hand zu konfigurieren.

## Was rebound-ops nicht tut

- **Eine Bewerbung automatisch absenden.** Es entwirft die Antwort für jedes Feld; du prüfst und klickst auf Absenden. Das Skript sendet nie einen POST (`prepare-application.mjs`).
- **Eine E-Mail senden.** Nur Entwürfe. Nirgendwo in diesem Code gibt es einen Mailversand.
- **Nach Hause funken.** Keine Telemetrie, kein Backend von uns. Dein Lebenslauf geht von deinem Rechner zum KI-Anbieter deiner Wahl, und nirgendwo sonst. Das einzige öffentliche Register ist dieses Repository: `HIRED.md` und seine Issues.
- **Dich zu Bewerbungen unter 4,0/5 drängen.** Es rät dir davon ab. Du kannst dich darüber hinwegsetzen, und es sagt es dir.

Es formuliert deinen Lebenslauf um; es darf ihn nie erfinden. Eine Prüfung im Code stoppt ein PDF, dessen Zahlen oder Fakten weder in deinem Lebenslauf noch in deinem `article-digest.md` stehen, kann aber noch nicht jede Umformulierung beurteilen. Lies jeden Lebenslauf, bevor du ihn abschickst. Details in den [FAQ](#faq).

## Features

| Feature                  | Beschreibung                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H-Bewertung**        | Rollen-Zusammenfassung, Lebenslauf-Match (mit der Wichtigkeit jeder Anforderung für diese Anzeige und der Angabe, ob das Gewicht aus dem Wortlaut der Stellenbeschreibung, ihrer Struktur oder einer Schätzung stammt, pro Anforderung gekennzeichnet; eine Schätzung kann nie in der obersten Stufe landen), Level-Strategie, Vergütungsrecherche, Personalisierung, Interview-Vorbereitung (STAR+R), dazu eine Legitimitätsprüfung der Anzeige in Block G (ist sie noch offen, ist sie ein Repost: Beobachtungen, keine Urteile) und ein Work-Auth-Signal, das eine Stellenbeschreibung mit ausdrücklich ausgeschlossenem Visa-Sponsoring als harten Blocker kennzeichnet |
| **Human-in-the-Loop**    | KI bewertet und empfiehlt, du entscheidest und handelst. Das System reicht niemals eine Bewerbung ein: die finale Entscheidung liegt immer bei dir <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS-PDF-Generierung**  | ATS-lesbare Lebensläufe, aus deiner eigenen Erfahrung auf jede Stellenbeschreibung zugeschnitten, im Space-Grotesk- und DM-Sans-Design  |
| **Anschreiben-Generator** | Recherchegestützte Anschreiben mit Keyword-Mirroring, vier interaktiven Angle-Prompts (warum/Probleme/Ansatz/Ton), Freigabe des Entwurfs im Chat und A4-PDF über dieselbe HTML- und Playwright-Pipeline wie Lebensläufe. Entwirft bei jeder Bewertung automatisch; vervollständigen und erzeugen bei Bedarf mit `/rebound-ops cover` |
| **Über den Lebenslauf hinaus** | Die Unternehmensrecherche ([`deep`](modes/deep.md)) legt KI-Strategie, jüngste Schritte, Engineering-Kultur und den Winkel offen, den dein Profil einnehmen sollte. Die Kontaktsuche ([`contacto`](modes/contacto.md)) identifiziert Hiring Manager, Recruiter:in oder Teammitglied, bei denen sich eine Nachricht lohnt, und entwirft eine LinkedIn-Nachricht mit ≤300 Zeichen, abgestimmt auf den Kontakttyp. Formelle Bewerbungs-E-Mail-Entwürfe ([`email`](modes/email.md)) machen aus einem bewerteten Report oder einer eingefügten Stellenbeschreibung Betreff, Text und Anhang-Checkliste, ohne etwas zu senden, einzureichen oder anzuklicken. Bewerbungen bringen dich in die Warteschlange; Recherche bringt dich ins Gespräch. |
| **Musteranalyse**        | Ablehnungsmuster und Weiterkommensquoten je ATS-Kanal (`analyze-patterns.mjs`), Funnel-Statistiken über die gesamte Suche (`stats.mjs`), Erkennung von Reposts, die auf einen Ghost Job hindeuten können (`detect-reposts.mjs`) |

<details>
<summary><b>Alles andere, was es tut</b></summary>

| Feature                  | Beschreibung                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-Pipeline**        | URL einfügen, vollständige Bewertung + PDF + Tracker-Eintrag erhalten                                                                   |
| **Interview Story Bank** | Sammelt STAR+Reflection-Geschichten über Bewertungen hinweg: 5-10 Master-Stories, die du an die Behavioral Questions anpassen kannst, die dir gestellt werden |
| **Verhandlungsskripte**  | Frameworks für Gehaltsverhandlungen, Pushback gegen geografische Abschläge, Hebel durch konkurrierende Angebote                          |
| **Bewerbungs-E-Mail-Entwürfe** | Formelle E-Mails an Recruiter:innen, für Empfehlungen oder Initiativbewerbungen aus einem Report oder einer eingefügten Stellenbeschreibung, mit Betreff, Anhang-Checkliste, belegten Fit-Punkten und einem Kontaktblock aus deinem Profil. Nur Entwürfe: rebound-ops sendet, reicht ein oder klickt nie etwas. |
| **Portal-Scanner**       | 100+ vorkonfigurierte Unternehmen (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) plus eigene Websuche-Queries über Ashby, Greenhouse, Lever, Wellfound |
| **Finanzierte Unternehmen entdecken** | Der Befehl `company:funded` (erst prüfen, dann handeln) zeigt kürzlich finanzierte Unternehmen und Quellendiagnosen aus strukturierten öffentlichen Feeds, ohne deine Daten anzufassen |
| **Batch-Verarbeitung**   | Parallele Bewertung mit headless CLI-Workern (`claude -p` / `opencode run`)                                                             |
| **Dashboard TUI**        | Terminal-UI zum Durchsuchen, Filtern und Sortieren deiner Pipeline                                                                       |
| **Pipeline-Integrität**  | Automatisches Mergen, Deduplizieren, Status-Normalisierung, Health Checks                                                                |
| **Interview-Suite**      | Zeitgeblockte Vorbereitungspläne, Übungssessions mit Feedback, Debriefs nach dem Interview ([`interview/`](modes/interview/README.md)) und ein Red-Flag-Detektor für Unternehmen ([`interview-redflag`](modes/interview-redflag.md)) |
| **Angebotsphase**        | Begleiter beim Lesen des Vertrags: Klausel für Klausel plus eine Fragenliste für den Anwalt ([`offer-prep`](modes/offer-prep.md)), und ein Analysator für die Lücke zwischen gewünschtem, ausgeschriebenem und tatsächlichem Gehalt (`salary-gap.mjs`) |
| **Follow-ups & Antworten** | Rechner für die Follow-up-Kadenz und vorbereitete Erinnerungen (`followup-cadence.mjs`, `followup-seed.mjs`); Klassifizierung von Arbeitgeber-Antworten in Tracker-Updates ([`reply-watch`](modes/reply-watch.md)) |
| **Plugin-System**        | Optionale Integrationen (Gmail, Notion, Apify + ein Community-Registry), standardmäßig deaktiviert; siehe [docs/PLUGINS.md](docs/PLUGINS.md) |

</details>

## Schnellstart

**Am schnellsten geht es mit einem einzigen Befehl:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` kommt mit [Node.js](https://nodejs.org): Es führt den Installer einmal aus,
> ohne etwas global zu installieren. Noch kein Node? Installiere es zuerst.
> (Nutzt du schon eine Claude Code / Codex CLI? Dann hast du es bereits.)

Das klont das neueste Release nach `./rebound-ops` und installiert die Abhängigkeiten. Dann:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**Beim ersten Start führt dich rebound-ops durch die Einrichtung (dein Lebenslauf, dein Profil und deine Zielrollen), einfach im Gespräch. Nichts muss von Hand bearbeitet werden.**

<details>
<summary><b>Lieber manuell einrichten? (git clone)</b></summary>

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

### Globale Installation

```bash
npm i -g ./engine/scaffolder
```

Das installiert die `rebound-ops`-Binary global, sodass du `rebound-ops init [folder]` ohne `npx` ausführen kannst. `init` ist ihr einziger Befehl: Er richtet einen Arbeitsbereich ein, und alles Weitere passiert in deiner KI-Coding-CLI (siehe Nutzung unten), nicht über diese Binary.

**Welche Variante solltest du nutzen?**
- `node engine/scaffolder/bin/cli.mjs init`: am besten für den ersten Einsatz; legt einen eigenen Projektordner an.
- `npm i -g ./engine/scaffolder`: wenn du lieber `rebound-ops init` tippst als die `npx`-Form. Weitere Befehle kommen dadurch nicht hinzu.

> **Das System ist dafür gebaut, von deiner KI-Coding-CLI selbst angepasst zu werden.** Modi, Archetypen, Bewertungsgewichte, Verhandlungsskripte: Bitte sie einfach, das zu ändern. Sie liest dieselben Dateien, die sie benutzt, und weiß daher genau, was zu bearbeiten ist.

Siehe [docs/SETUP.md](docs/SETUP.md) für die vollständige Einrichtungsanleitung, [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) für den günstigen Betrieb von rebound-ops mit eigenen oder lokalen Modellen (und [docs/FREE_TIER.md](docs/FREE_TIER.md) für den kostenlosen Betrieb im Free Tier der Antigravity CLI), [docs/AUTOMATION.md](docs/AUTOMATION.md) für wiederkehrende Scans und ein Rezept vom Triage zur Shortlist ohne Token-Verbrauch, [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) für Details zum ATS-Autofill-Ablauf, [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) für den Abgleich eines LinkedIn-Kontaktexports mit den Unternehmen in deinem Funnel und [docs/FAQ.md](docs/FAQ.md) für Antworten auf häufige Einrichtungsfragen, darunter [wie die Herkunft von Geschichten erfundene Zahlen verhindert](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). Designprinzipien stehen in [ARCHITECTURE.md](ARCHITECTURE.md); Laufzeitabläufe in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Nutzung

rebound-ops nutzt einen gemeinsamen Befehls-Router. In CLIs, die Slash Commands registrieren, sieht das so aus:

```
/rebound-ops           → Alle verfügbaren Befehle anzeigen
/rebound-ops {JD}      → AUTO-PIPELINE: Bewertung + Report + PDF + Tracker (Text oder URL einfügen)
/rebound-ops pipeline  → Ausstehende URLs aus der Inbox verarbeiten (data/pipeline.md)
/rebound-ops oferta    → Nur Bewertung, Blöcke A bis H (kein automatisches PDF)
/rebound-ops ofertas   → Mehrere Angebote vergleichen und ranken
/rebound-ops contacto  → LinkedIn-Power-Move: Kontakte finden + Nachricht entwerfen
/rebound-ops deep      → Tiefen-Recherche-Prompt zum Unternehmen
/rebound-ops interview-prep → Unternehmensspezifisches Interview-Vorbereitungsdokument erzeugen
/rebound-ops interview    → Interaktives Onboarding-Interview für Profil und Lebenslauf
/rebound-ops master-profile → Dein Master Career Profile importieren, prüfen und validieren
/rebound-ops eu-swe    → Eine europäische SWE-Bewerbung vor Lebenslauf, Bewerbung und Interview kalibrieren
/rebound-ops interview/plan → Zeitgeblockter Vorbereitungsplan für ein anstehendes Interview
/rebound-ops interview/practice → Übungsinterview, eine Frage nach der anderen mit Feedback
/rebound-ops interview/debrief → Debrief nach dem Interview: Lücken schließen, nächste Runde vorhersagen
/rebound-ops interview-redflag → Warnsignale des Arbeitgebers analysieren, bevor du einsteigst
/rebound-ops pdf       → Nur PDF, ATS-optimierter Lebenslauf
/rebound-ops text      → Angepasster Markdown-Lebenslauf (spiegelt cv.md, kein PDF)
/rebound-ops latex     → Lebenslauf als LaTeX/Overleaf .tex exportieren
/rebound-ops latex-tex → Deine eigene resume.tex direkt anpassen (opt-in; cv.md bleibt Standard)
/rebound-ops cover     → Anschreiben: eigenständig aus eingefügter Stellenbeschreibung oder /rebound-ops cover {slug}
/rebound-ops email     → Formeller Bewerbungs-E-Mail-Entwurf (nur Entwurf; sendet, reicht ein oder klickt nie)
/rebound-ops add       → Projekt/Paper/Rolle zum Lebenslauf hinzufügen (laden + Vorschau + bestätigen)
/rebound-ops expand    → Fehlende Kompetenzen aus Profil-Links automatisch entdecken und ergänzen
/rebound-ops training  → Kurs/Zertifikat gegen den North Star bewerten
/rebound-ops project   → Portfolio-Projektidee bewerten
/rebound-ops tracker   → Übersicht über den Bewerbungsstatus
/rebound-ops agent-inbox → Anfragen für die nächste Session einreihen/abarbeiten (data/agent-inbox.md)
/rebound-ops apply     → Live-Bewerbungsassistent (liest das Formular + erzeugt Antworten)
/rebound-ops scan      → Portale scannen und neue Angebote entdecken
/rebound-ops discover  → Unternehmensliste in scannbare ATS-Boards auflösen + an portals.yml anhängen (ohne Tokens)
/rebound-ops batch     → Batch-Verarbeitung mit parallelen Workern
/rebound-ops patterns  → Ablehnungsmuster analysieren und Zielrichtung verbessern
/rebound-ops offer-prep → Ein erhaltenes Angebot/einen Vertrag mit dem Kandidaten lesen: Klauseln durchgehen + Fragen für den Anwalt (keine Rechtsberatung)
/rebound-ops titles    → Verwandte Jobtitel aus deinem Lebenslauf vorschlagen, um die Suche zu erweitern
/rebound-ops upskill   → Aggregierte Skill-Gap-Analyse aus deinen bewerteten Reports
/rebound-ops followup  → Follow-up-Kadenz-Tracker: Überfällige markieren, Entwürfe erzeugen
/rebound-ops reply-watch → Arbeitgeber-Antworten klassifizieren und Tracker-Updates vorschlagen
/rebound-ops outcome   → Bewerbungsergebnis erfassen & Artefakte archivieren
/rebound-ops calibrate → Beratender Report: Sagen deine Bewertungen deine echten Ergebnisse voraus? Liest /outcome-Daten; ändert nie die Bewertung
/rebound-ops update    → rebound-ops-Systemdateien aktualisieren mit Diff-Vorschau + Kompatibilitätsprüfung
```

Oder füge einfach eine Stellen-URL oder Stellenbeschreibung direkt ein: rebound-ops erkennt sie automatisch und startet die komplette Pipeline.

In Codex sind Slash Commands nicht garantiert. Nutze stattdessen dieselben Modusnamen in einem Prompt oder rufe sie über `codex exec` auf.

## Wie es funktioniert

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity-CLI-Integration

rebound-ops unterstützt die Antigravity CLI nativ, genauso wie Claude Code und OpenCode. Alle Slash Commands sind über den gemeinsamen Skill-Einstiegspunkt verfügbar, mit derselben Bewertungslogik aus `modes/*.md`.

Google hat den Zugang zur Gemini CLI für Endnutzer:innen auf die Antigravity CLI umgestellt. `GEMINI.md` ist jetzt ein wirkungsloser Kompatibilitätsschutz, damit Antigravity die vollständigen Projektanweisungen nicht doppelt lädt, wenn es sowohl `AGENTS.md` als auch `GEMINI.md` liest.

### Native Antigravity CLI

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

Der Skill ist nach dem offenen Standard in `.agents/skills/rebound-ops/SKILL.md` definiert und für jede unterstützte CLI verlinkt oder referenziert (z. B. `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`). Cursor entdeckt den gemeinsamen Skill in `.agents/skills/` automatisch.

## Codex-Integration

rebound-ops unterstützt Codex über denselben gemeinsamen Router, aber das Aufrufmodell unterscheidet sich von CLIs, die Slash Commands automatisch registrieren. Die vollständige Anleitung steht in [docs/CODEX.md](docs/CODEX.md).

### Interaktives Codex

```bash
cd rebound-ops
codex
```

Slash Commands sind in Codex nicht garantiert. Falls `/rebound-ops` nicht verfügbar ist, bitte Codex in natürlicher Sprache, den Modus direkt auszuführen:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex im Einzelaufruf (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok-Build-CLI-Integration

rebound-ops unterstützt die Grok Build CLI nativ, genauso wie Claude Code und OpenCode. `AGENTS.md` wird automatisch als Projektregeln geladen, und alle Slash Commands sind über den gemeinsamen Skill-Einstiegspunkt verfügbar.

### Native Grok Build CLI

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

Für headless Batch-Worker nutze `grok -p "prompt"` (mit `--yolo` werden Tool-Ausführungen automatisch freigegeben).

## Pi-Integration

rebound-ops unterstützt [Pi](https://github.com/earendil-works/pi) nativ, ohne Wrapper-Datei, die gepflegt werden müsste: Pi liest `AGENTS.md` im Repository-Wurzelverzeichnis als Projektkontext und findet den gemeinsamen Skill unter `.agents/skills/rebound-ops/SKILL.md` selbst. Der Router ist dann als `/skill:rebound-ops` verfügbar.

### Pi nativ

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

### Pi im Einzelaufruf (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Falls ein Pi-Build Projektressourcen erst nach einer Vertrauensentscheidung freigibt, führe einmal `/trust` im Repository aus und starte `pi` neu, damit der Projekt-Skill geladen wird (`/trust` gilt für künftige Pi-Prozesse), oder starte mit `-a`: Das vertraut einem einzelnen Lauf und braucht keinen Neustart.

### Eigenständiges Gemini-API-Skript (keine CLI-Installation nötig)

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

> **Free Tier:** Beide Optionen funktionieren ohne Abrechnung. Die native CLI nutzt Google OAuth; das API-Skript nutzt `gemini-3.6-flash` (Rate Limits hängen von Modell und Stufe ab; aktuelle Kontingente stehen in den Google-AI-Docs).

## Vorkonfigurierte Portale

Der Scanner kommt mit **100+ Unternehmen**, die sofort gescannt werden können, und **35+ Suchanfragen** über die großen Jobbörsen. Kopiere `templates/portals.example.yml` nach `portals.yml` und füge deine eigenen hinzu:

**AI Labs:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Voice AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI-Plattformen:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Contact Center:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automatisierung:** n8n, Zapier, Make.com
**Europa:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Durchsuchte Jobbörsen:** 55+ Provider-Module decken ATS-APIs, Feeds ganzer Jobbörsen, XML/RSS-Feeds, Markdown-Feeds und lokale Parser ab. Die vollständige Tabelle steht unter [Unterstützte Jobbörsen](docs/SUPPORTED_JOB_BOARDS.md).

Standardmäßig vertraut `node scan.mjs` (alias `npm run scan`) dem, was jeder ATS-Feed zurückgibt. Manche Unternehmen lassen veraltete Anzeigen in ihrer öffentlichen API stehen, auch wenn die Stelle längst geschlossen ist, sodass diese abgelaufenen Einträge in `pipeline.md` durchsickern können. Übergib `--verify`, um nach dem API-Durchlauf Playwright zu starten und abgelaufene Anzeigen zu verwerfen, bevor sie die Pipeline erreichen:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

Die Prüfung läuft sequenziell und nur über neue Angebote (nach dem Deduplizieren), sodass die Kosten begrenzt bleiben.

## Dashboard TUI

Das eingebaute Terminal-Dashboard lässt dich deine Pipeline visuell durchsuchen:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Features: 10 Filter-Tabs, 8 Sortiermodi, gruppierte/flache Ansicht, Vorschauen mit Lazy Loading, Statusänderungen inline.

Es gibt außerdem eine **experimentelle Web-UI** (Alpha und opt-in: Nichts läuft, solange du sie nicht startest): siehe [`web/README.md`](web/README.md).

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

## Externes Datenverzeichnis (optional)

Standardmäßig liegen die Daten der Nutzerebene (etwa `cv.md`, `portals.yml` und die Ordner `data/`, `reports/`, `output/`) im Wurzelordner des Projekts.

Um deine persönlichen Daten vom Code zu trennen (damit du leichter Branches wechseln, Updates ziehen oder mehrere Profile testen kannst), kannst du ein externes Datenverzeichnis mit folgender Rangfolge konfigurieren:

1. **Umgebungsvariablen:** Setze die Variable `REBOUND_OPS_ROOT` oder `REBOUND_OPS_DATA_DIR`:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Marker-Datei:** Lege im Repository-Wurzelverzeichnis eine Datei `.rebound-ops-data` an, die den Pfad zu deinem Datenverzeichnis enthält.
3. **Standard:** Fällt auf das Repository-Wurzelverzeichnis zurück.

Sobald das aufgelöst ist, werden alle Nutzerdateien relativ zu diesem Ordner aufgelöst und geschrieben, während Prompt-Dateien und Skripte weiterhin relativ zum Repository aufgelöst werden.

- **Tracker überschreiben:** Du kannst auch `REBOUND_OPS_TRACKER` setzen, um den Pfad der Bewerbungs-Tracker-Datei direkt zu überschreiben.
- **Schreibvorgänge:** Alle Schreibvorgänge (etwa Merges) zielen kanonisch auf `{DATA_ROOT}/data/applications.md`.
- **Scanner-Konfiguration:** `portals.yml` wird unter `{DATA_ROOT}/portals.yml` gelesen und validiert, sodass `node validate-portals.mjs` genau die Datei prüft, die `scan.mjs` liest.
- **Erzeugte Dokumente:** Angepasste Lebensläufe und Anschreiben werden unter `{DATA_ROOT}/output/` geschrieben, und das PDF-Manifest, das sie mit einem Report verknüpft, liegt in `{DATA_ROOT}/data/pdf-index.tsv`. Solange `REBOUND_OPS_TRACKER` nicht gesetzt ist, ist der Tracker-Workspace, der diese Schreibvorgänge begrenzt, das Datenverzeichnis, nicht der Checkout.
- **PDFs bei überschriebenem Tracker:** `generate-pdf.mjs` löst `REBOUND_OPS_TRACKER` auf, bevor es den Workspace ableitet; mit gesetztem Override ist der Workspace also der Ordner, der diesen Tracker enthält (oder der Ordner darüber, wenn der Tracker in einem `data/`-Ordner liegt). Das HTML des Lebenslaufs und jedes PDF müssen dann in diesem Workspace liegen, und das Manifest wandert in dessen `data/pdf-index.tsv`. Anschreiben zielen weiterhin auf `{DATA_ROOT}/output/` und werden deshalb abgelehnt, wenn dieser Ordner außerhalb des Tracker-Workspaces liegt.
- **Die Code-Ebene bleibt, wo sie ist:** `node_modules/`, `providers/`, `modes/` und die Skripte selbst werden immer relativ zum Repository aufgelöst, nie relativ zum Datenverzeichnis.

Das Go-Dashboard-TUI, die Node.js-Skripte und die KI-Agentenmodi respektieren diese Auflösungshierarchie automatisch.


## Tech Stack

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Agent**: KI-Coding-CLI mit gemeinsamen Skills und Modi (`AGENTS.md` + CLI-Wrapper)
- **PDF**: Playwright + HTML-Template
- **Anschreiben**: HTML-Template + Playwright (A4-PDF, dieselbe Pipeline wie Lebensläufe)
- **Scanner**: Playwright + Greenhouse-API + WebSearch
- **Dashboard**: Go + Bubble Tea + Lipgloss (Catppuccin-Mocha-Theme)
- **Daten**: Markdown-Tabellen + YAML-Konfiguration + TSV-Batch-Dateien

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Läuft auch in jeder CLI mit dem Agent-Skill-Standard. Siehe <a href="docs/SUPPORTED_CLIS.md">Unterstützte CLIs</a>.</sub><br>
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

**Was ist rebound-ops?**
ReboundOps integrates a modified MIT-licensed [rebound-ops engine](https://github.com/rebound-ops-hq/rebound-ops), originally created by Ankit Parekh and contributors. It did not originate the upstream manifesto or its founder outcomes. See [provenance](../PROVENANCE.md). (Attribution correction maintained in English.)

**Kann der zugeschnittene Lebenslauf etwas erfinden?**
Er darf es nicht, und die Prompts sagen das: umformulieren, nie erfinden. `generate-pdf` blockiert einen Lebenslauf, dessen Zahlen oder Fakten in deinen Quellen fehlen, außer du übergibst `--skip-fact-check`. Der `pdf`-Modus führt zusätzlich `cv-title-check.mjs` aus: Es vergleicht jeden Jobtitel im angepassten Lebenslauf mit dem Titel, den cv.md für dieselbe Stelle nennt (zugeordnet über Firma und Zeitraum), und fragt bei jeder Abweichung, ob du sie behalten oder zurücksetzen willst. Es warnt nur und blockiert nicht, weil ein umformulierter Titel manchmal deine Entscheidung ist. Umformulierungen beurteilt noch nichts: [#1411](https://github.com/rebound-ops-hq/rebound-ops/issues/1411) (Treueprüfung, die bei Verstoß blockiert) verfolgt das. Bis dahin: Lies jeden Lebenslauf, bevor du ihn abschickst. Der [Haftungsausschluss](LEGAL_DISCLAIMER.md) sagt dasselbe mit mehr Worten.

**Kann ich rebound-ops kostenlos oder mit einem günstigeren / lokalen Modell nutzen?**
Ja. rebound-ops ist CLI-unabhängig und läuft mit kostenlosen und lokalen Modellen (über kostenlose OpenRouter-Modelle, Ollama oder jeden OpenAI-kompatiblen Endpoint), sodass du nicht an ein kostenpflichtiges Abo gebunden bist. Die vollständige Einrichtung findest du in [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md).

**Ich zahle für Claude Pro/Max, aber rebound-ops verbraucht API-Guthaben. Warum?**
Weil ein `ANTHROPIC_API_KEY` in deiner Umgebung Vorrang vor deinem eingeloggten Abo hat: Die CLI nutzt den Schlüssel und rechnet pro Token ab. Führe `echo $ANTHROPIC_API_KEY` aus, und falls etwas ausgegeben wird, entferne den Schlüssel aus deinem Shell-Profil, starte das Terminal neu und führe `/login` aus. Der Batch-Modus ist die Ausnahme, weil `claude -p`-Worker den interaktiven Login nicht nutzen: Führe einmal `claude setup-token` aus und exportiere das Ergebnis als `CLAUDE_CODE_OAUTH_TOKEN`. Die vollständige Anleitung steht in [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**Mit welchen KI-CLIs funktioniert rebound-ops?**
rebound-ops läuft mit jeder gängigen KI-Coding-CLI (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen und mehr) über den offenen Agent Skill Standard, ist also nie an einen einzelnen Anbieter gebunden. Nutze die CLI, die du bereits hast.

**Wie installiere ich rebound-ops unter Windows?**
rebound-ops läuft unter Windows. Die plattformspezifische Einrichtung und die bekannten Stolpersteine (Git-Bash-Erkennung, Zeilenenden, Aufgabenplanung) stehen in [docs/WINDOWS.md](docs/WINDOWS.md). Falls Skills während der Installation mit einem Symlink-Fehler nicht laden, steht die Lösung in [docs/FAQ.md](docs/FAQ.md). Die vollständigen Schritte findest du in [docs/SETUP.md](docs/SETUP.md).

**Bewirbt sich rebound-ops automatisch für mich?**
Nein. rebound-ops ist ein Filter, kein Spray-and-Pray-Auto-Bewerber. Die KI bewertet, sortiert und entwirft; du prüfst und entscheidest. rebound-ops entwirft und füllt aus, reicht aber nie etwas ein. Du klickst auf Absenden. Genau dieses Human-in-the-Loop-Design ist der Kern der Sache.

**Ist rebound-ops kostenlos und Open Source?**
The source is MIT-licensed; optional AI providers may charge separately. Our own [product principles](../docs/principles.md) do not collect public signatures. The upstream manifesto remains the work of its original authors. (Attribution correction maintained in English.)

## Haftungsausschluss

**rebound-ops ist ein lokales Open-Source-Tool, KEIN gehosteter Service.** Mit der Nutzung dieser Software erkennst du an:

1. **Du kontrollierst deine Daten.** Dein Lebenslauf, deine Kontaktdaten und persönlichen Daten bleiben auf deinem Rechner und werden direkt an den KI-Anbieter gesendet, den du auswählst (Anthropic, OpenAI usw.). Wir sammeln, speichern oder sehen keine deiner Daten.
2. **Du kontrollierst die KI.** Die Standard-Prompts weisen die KI an, Bewerbungen nicht automatisch abzusenden, aber KI-Modelle können sich unvorhersehbar verhalten. Wenn du die Prompts änderst oder andere Modelle nutzt, tust du das auf eigenes Risiko. **Prüfe KI-generierte Inhalte immer auf Richtigkeit, bevor du sie absendest.**
3. **Du hältst dich an die AGB Dritter.** Du musst dieses Tool im Einklang mit den Nutzungsbedingungen der Karriereportale verwenden, mit denen du interagierst (Greenhouse, Lever, Workday, LinkedIn usw.). Nutze dieses Tool nicht, um Arbeitgeber zu spammen oder ATS-Systeme zu überlasten.
4. **Keine Garantien.** Bewertungen sind Empfehlungen, keine Wahrheit. KI-Modelle können Kenntnisse oder Erfahrungen halluzinieren. Die Autor:innen haften nicht für Beschäftigungsergebnisse, abgelehnte Bewerbungen, Kontosperren oder andere Folgen.

Siehe [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) für alle Details. Diese Software wird unter der [MIT-Lizenz](LICENSE) „wie besehen“ bereitgestellt, ohne Gewährleistung jeglicher Art.

## License

MIT — see [LICENSE](LICENSE). This folder is derived from third-party MIT-licensed software; the original notices are reproduced in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
