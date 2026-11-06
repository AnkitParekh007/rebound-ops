# ReboundOps engine

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## Ce que rebound-ops fait pour toi

Colle une offre. Il te dit si la soirée en vaut la peine.

- **Toujours ouverte ?** Il vérifie que l'annonce est encore en ligne avant que tu n'écrives un mot.
- **Pas pour toi ?** Il note le poste face à ton vrai CV et te dit de passer si ça colle mal. Tu peux passer outre.
- **Ça vaut le coup ?** Il rédige le CV, la lettre de motivation et les réponses. Tu les lis. Tu les envoies.
- **À qui je parle ?** Il trouve la personne et rédige le message. Il ne l'envoie jamais.
- **Où va tout ça ?** Chaque candidature reste sur ta machine. Rien n'est envoyé chez nous.
- **Qu'est-ce que je devrais apprendre ?** Après une série de non, il nomme la lacune.

Les premiers passages sont bruts. Il ne te connaît pas encore. Parle-lui : ton CV, ce que tu veux, ce que tu refuses. Vois ça comme la première semaine d'un recruteur.

Au premier lancement, il te demande tout ça dans le chat. Rien à configurer à la main.

## Ce que rebound-ops ne fait pas

- **Envoyer une candidature automatiquement.** Il rédige la réponse de chaque champ ; tu relis et tu cliques sur Envoyer. Le script ne fait jamais de POST (`prepare-application.mjs`).
- **Envoyer un e-mail.** Brouillons uniquement. Il n'y a aucun transport de courrier dans ce code.
- **Téléphoner à la maison.** Pas de télémétrie, pas de backend à nous. Ton CV va de ta machine au fournisseur d'IA que tu as choisi, et nulle part ailleurs. Le seul registre public, c'est ce dépôt : `HIRED.md` et ses issues.
- **Te pousser à postuler sous 4,0/5.** Il te dira de ne pas le faire. Tu peux passer outre, et il te le dira.

Il reformule ton CV ; il ne doit jamais l'inventer. Un contrôle dans le code bloque un PDF dont les chiffres ou les faits ne figurent ni dans ton CV ni dans ton `article-digest.md`, mais il ne sait pas encore juger chaque reformulation. Relis chaque CV avant de l'envoyer. Détails dans la [FAQ](#faq).

## Fonctionnalités

| Fonctionnalité           | Description                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Évaluation A-H**       | Résumé du poste, correspondance avec le CV (avec le poids de chaque exigence pour cette annonce et l'origine de ce poids : formulation de la description, structure ou estimation, indiquée exigence par exigence ; une estimation ne peut jamais atteindre le niveau le plus élevé), stratégie de niveau, recherche de rémunération, personnalisation, préparation à l'entretien (STAR+R), plus une vérification de légitimité de l'annonce au bloc G (est-elle encore ouverte, est-ce une republication : des observations, pas des verdicts), et un signal d'autorisation de travail qui marque comme bloquant toute description excluant explicitement le parrainage de visa |
| **Human-in-the-Loop**    | L'IA évalue et recommande, tu décides et tu agis. Le système ne soumet jamais une candidature : c'est toujours toi qui as le dernier mot <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **Génération de PDF ATS** | CV lisibles par les ATS, adaptés à chaque description de poste à partir de ta propre expérience, au design Space Grotesk + DM Sans         |
| **Générateur de lettres de motivation** | Lettres fondées sur la recherche avec reflet des mots-clés, quatre questions interactives d'angle (pourquoi/problèmes/approche/ton), validation du brouillon dans le chat et PDF A4 via le même pipeline HTML + Playwright que les CV. Rédige un brouillon à chaque évaluation ; complète et génère à la demande avec `/rebound-ops cover` |
| **Au-delà du CV**        | La recherche sur l'entreprise ([`deep`](modes/deep.md)) fait remonter sa stratégie IA, ses mouvements récents, sa culture d'ingénierie et l'angle que ton profil devrait adopter. La découverte de contacts ([`contacto`](modes/contacto.md)) identifie le hiring manager, le recruteur ou le pair d'équipe qu'il vaut la peine de contacter et rédige un message LinkedIn de ≤300 caractères adapté à chaque type de contact. Les brouillons d'e-mails formels de candidature ([`email`](modes/email.md)) transforment un rapport évalué ou une description collée en objet, corps et liste de pièces jointes sans rien envoyer, soumettre ni cliquer. La candidature te met dans la file d'attente ; la recherche t'obtient une conversation. |
| **Analyse des tendances** | Schémas de refus et taux d'avancement par canal ATS (`analyze-patterns.mjs`), statistiques d'entonnoir sur toute la recherche (`stats.mjs`), détection des republications, signe possible d'une offre fantôme (`detect-reposts.mjs`) |

<details>
<summary><b>Tout le reste</b></summary>

| Fonctionnalité           | Description                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Pipeline automatique** | Colle une URL, obtiens une évaluation complète + PDF + entrée dans le tracker                                                            |
| **Banque d'histoires d'entretien** | Accumule des récits STAR+Réflexion au fil des évaluations : 5 à 10 histoires maîtresses que tu peux adapter aux questions comportementales qu'on te pose |
| **Scripts de négociation** | Cadres de négociation salariale, réponse aux décotes géographiques, levier des offres concurrentes                                     |
| **Brouillons d'e-mails de candidature** | E-mails formels pour recruteur, cooptation ou candidature spontanée à partir d'un rapport ou d'une description collée, avec objet, liste des pièces jointes, points d'adéquation sourcés et bloc de contact issu de ton profil. Brouillon uniquement : rebound-ops n'envoie, ne soumet et ne clique jamais rien. |
| **Scanner de portails**  | 100+ entreprises préconfigurées (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + requêtes de recherche web personnalisées sur Ashby, Greenhouse, Lever, Wellfound |
| **Découverte d'entreprises financées** | La commande `company:funded`, pensée pour relire avant d'agir, fait remonter les entreprises récemment financées et des diagnostics de source à partir de flux publics structurés, sans toucher à tes données |
| **Traitement par lots**  | Évaluation en parallèle avec des workers CLI sans interface (`claude -p` / `opencode run`)                                               |
| **Dashboard TUI**        | Interface terminal pour parcourir, filtrer et trier ton pipeline                                                                         |
| **Intégrité du pipeline** | Fusion automatique, déduplication, normalisation des statuts, contrôles de santé                                                        |
| **Suite d'entretien**    | Plans de préparation par blocs de temps, sessions d'entraînement avec retour, débriefs après entretien ([`interview/`](modes/interview/README.md)) et un détecteur de signaux d'alerte sur l'entreprise ([`interview-redflag`](modes/interview-redflag.md)) |
| **Phase d'offre**        | Compagnon de lecture du contrat : parcours clause par clause plus une liste de questions pour l'avocat ([`offer-prep`](modes/offer-prep.md)), et un analyseur d'écart entre salaire souhaité, annoncé et réel (`salary-gap.mjs`) |
| **Relances et réponses** | Calculateur de cadence de relance et rappels préprogrammés (`followup-cadence.mjs`, `followup-seed.mjs`) ; classification des réponses de l'employeur en mises à jour du tracker ([`reply-watch`](modes/reply-watch.md)) |
| **Système de plugins**   | Intégrations optionnelles (Gmail, Notion, Apify + un registre communautaire), désactivées par défaut ; voir [docs/PLUGINS.md](docs/PLUGINS.md) |

</details>

## Démarrage rapide

**Le plus rapide, une seule commande :**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` est livré avec [Node.js](https://nodejs.org) : il exécute l'installeur une fois,
> sans rien installer globalement. Pas encore de Node ? Installe-le d'abord.
> (Tu utilises déjà une CLI Claude Code / Codex ? Alors tu l'as déjà.)

Cela clone la dernière version dans `./rebound-ops` et installe les dépendances. Ensuite :

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**Au premier lancement, rebound-ops te guide dans la configuration (ton CV, ton profil et les postes visés) simplement en discutant. Rien à éditer à la main.**

<details>
<summary><b>Tu préfères l'installer à la main ? (git clone)</b></summary>

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

### Installation globale

```bash
npm i -g ./engine/scaffolder
```

Cela installe le binaire `rebound-ops` globalement pour que tu puisses lancer `rebound-ops init [folder]` sans `npx`. `init` est sa seule commande : elle prépare un espace de travail, et tout le reste se passe dans ta CLI de codage IA (voir Utilisation plus bas), pas via ce binaire.

**Laquelle utiliser ?**
- `node engine/scaffolder/bin/cli.mjs init` : idéal pour la première utilisation ; crée un dossier de projet dédié.
- `npm i -g ./engine/scaffolder` : si tu préfères taper `rebound-ops init` plutôt que la forme `npx`. Il n'ajoute aucune autre commande.

> **Le système est conçu pour être personnalisé par ta CLI de codage IA elle-même.** Modes, archétypes, pondérations du score, scripts de négociation : demande-lui simplement de les changer. Elle lit les mêmes fichiers qu'elle utilise, donc elle sait exactement quoi éditer.

Voir [docs/SETUP.md](docs/SETUP.md) pour le guide d'installation complet, [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) pour faire tourner rebound-ops à moindre coût avec des modèles personnalisés ou locaux (et [docs/FREE_TIER.md](docs/FREE_TIER.md) pour le faire tourner gratuitement sur l'offre gratuite d'Antigravity CLI), [docs/AUTOMATION.md](docs/AUTOMATION.md) pour planifier des scans récurrents et une recette de tri vers une liste courte sans dépenser de tokens, [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) pour les détails du flux de remplissage automatique des ATS, [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) pour croiser un export de tes relations LinkedIn avec les entreprises de ton entonnoir, et [docs/FAQ.md](docs/FAQ.md) pour les réponses aux questions courantes de configuration, dont [comment la provenance des histoires empêche les chiffres inventés](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). Les principes de conception sont dans [ARCHITECTURE.md](ARCHITECTURE.md) ; les flux d'exécution dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Utilisation

rebound-ops utilise un routeur de commandes partagé. Dans les CLI qui enregistrent des commandes slash, ça ressemble à ceci :

```
/rebound-ops           → Afficher toutes les commandes disponibles
/rebound-ops {JD}      → PIPELINE AUTOMATIQUE : évaluation + rapport + PDF + tracker (colle du texte ou une URL)
/rebound-ops pipeline  → Traiter les URL en attente de la boîte d'entrée (data/pipeline.md)
/rebound-ops oferta    → Évaluation seule, blocs A à H (sans PDF automatique)
/rebound-ops ofertas   → Comparer et classer plusieurs offres
/rebound-ops contacto  → Coup de maître LinkedIn : trouver des contacts + rédiger le message
/rebound-ops deep      → Prompt de recherche approfondie sur l'entreprise
/rebound-ops interview-prep → Générer un document de préparation d'entretien propre à l'entreprise
/rebound-ops interview    → Entretien interactif d'intégration du profil et du CV
/rebound-ops master-profile → Importer, relire et valider ton Master Career Profile
/rebound-ops eu-swe    → Calibrer une candidature SWE européenne avant le CV, la candidature ou l'entretien
/rebound-ops interview/plan → Plan de préparation par blocs de temps pour un entretien à venir
/rebound-ops interview/practice → Entretien d'entraînement, une question à la fois avec retour
/rebound-ops interview/debrief → Débrief après entretien : combler les lacunes, anticiper le prochain tour
/rebound-ops interview-redflag → Analyser les signaux d'alerte de l'employeur avant de rejoindre une entreprise
/rebound-ops pdf       → PDF uniquement, CV optimisé pour les ATS
/rebound-ops text      → CV adapté en markdown (reflète cv.md, sans PDF)
/rebound-ops latex     → Exporter le CV en LaTeX/Overleaf .tex
/rebound-ops latex-tex → Adapter ton propre resume.tex sur place (optionnel ; cv.md reste la valeur par défaut)
/rebound-ops cover     → Lettre de motivation : description collée seule ou /rebound-ops cover {slug}
/rebound-ops email     → Brouillon d'e-mail formel de candidature (brouillon uniquement ; n'envoie, ne soumet et ne clique jamais)
/rebound-ops add       → Ajouter un projet, un article ou un poste à ton CV (récupération + aperçu + confirmation)
/rebound-ops expand    → Découvrir et ajouter automatiquement les compétences manquantes à partir des liens de ton profil
/rebound-ops training  → Évaluer un cours ou une certification par rapport à ton North Star
/rebound-ops project   → Évaluer une idée de projet de portfolio
/rebound-ops tracker   → Vue d'ensemble de l'état des candidatures
/rebound-ops agent-inbox → Mettre en file ou vider les demandes pour la prochaine session (data/agent-inbox.md)
/rebound-ops apply     → Assistant de candidature en direct (lit le formulaire + génère les réponses)
/rebound-ops scan      → Scanner les portails et découvrir de nouvelles offres
/rebound-ops discover  → Convertir une liste d'entreprises en tableaux ATS scannables + les ajouter à portals.yml (sans tokens)
/rebound-ops batch     → Traitement par lots avec des workers en parallèle
/rebound-ops patterns  → Analyser les schémas de refus et améliorer le ciblage
/rebound-ops offer-prep → Lire une offre ou un contrat reçu avec le candidat : parcours des clauses + questions pour l'avocat (pas un conseil juridique)
/rebound-ops titles    → Suggérer des intitulés de poste voisins à partir de ton CV pour élargir la recherche
/rebound-ops upskill   → Analyse agrégée des lacunes de compétences à partir de tes rapports évalués
/rebound-ops followup  → Suivi de la cadence de relance : signaler les retards, générer des brouillons
/rebound-ops reply-watch → Classer les réponses de l'employeur et suggérer des mises à jour du tracker
/rebound-ops outcome   → Enregistrer le résultat de la candidature et archiver les artefacts
/rebound-ops calibrate → Rapport consultatif : tes scores d'évaluation prédisent-ils tes résultats réels ? Lit les données /outcome ; ne modifie jamais le scoring
/rebound-ops update    → Mettre à jour les fichiers système de rebound-ops avec aperçu du diff + contrôle de compatibilité
```

Ou colle simplement une URL ou une description de poste : rebound-ops la détecte automatiquement et lance le pipeline complet.

Dans Codex, les commandes slash ne sont pas garanties. Utilise plutôt les mêmes noms de mode dans un prompt, ou appelle-les depuis `codex exec`.

## Comment ça fonctionne

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Intégration Antigravity CLI

rebound-ops prend en charge Antigravity CLI nativement, de la même façon que Claude Code et OpenCode. Toutes les commandes slash sont disponibles via le point d'entrée partagé du skill, avec la même logique d'évaluation `modes/*.md`.

Google a fait migrer l'accès grand public de Gemini CLI vers Antigravity CLI. `GEMINI.md` est désormais une garde de compatibilité sans effet, pour qu'Antigravity ne duplique pas les instructions complètes du projet lorsqu'il lit à la fois `AGENTS.md` et `GEMINI.md`.

### Antigravity CLI natif

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

Le skill est défini selon le standard ouvert dans `.agents/skills/rebound-ops/SKILL.md` et lié ou référencé pour chaque CLI prise en charge (par exemple `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`). Cursor découvre automatiquement le skill partagé dans `.agents/skills/`.

## Intégration Codex

rebound-ops prend en charge Codex via le même routeur partagé, mais le modèle d'invocation diffère des CLI qui enregistrent automatiquement les commandes slash. Le guide complet est dans [docs/CODEX.md](docs/CODEX.md).

### Codex interactif

```bash
cd rebound-ops
codex
```

Les commandes slash ne sont pas garanties dans Codex. Si `/rebound-ops` n'est pas disponible, demande à Codex d'exécuter le mode directement en langage naturel :

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex en un seul passage (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Intégration Grok Build CLI

rebound-ops prend en charge Grok Build CLI nativement, de la même façon que Claude Code et OpenCode. `AGENTS.md` est chargé automatiquement comme règles du projet, et toutes les commandes slash sont disponibles via le point d'entrée partagé du skill.

### Grok Build CLI natif

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

Pour des workers de lot sans interface, utilise `grok -p "prompt"` (ajoute `--yolo` pour approuver automatiquement l'exécution des outils).

## Intégration Pi

rebound-ops prend en charge [Pi](https://github.com/earendil-works/pi) nativement, sans fichier wrapper à maintenir : Pi lit `AGENTS.md` à la racine du dépôt comme contexte du projet et découvre tout seul le skill partagé dans `.agents/skills/rebound-ops/SKILL.md`. Le routeur est alors disponible sous la forme `/skill:rebound-ops`.

### Pi natif

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

### Pi en un seul passage (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Si une version de Pi soumet les ressources du projet à une décision de confiance, lance `/trust` une fois dans le dépôt et redémarre `pi` pour que le skill du projet se charge (`/trust` s'applique aux processus Pi suivants), ou démarre avec `-a`, qui accorde la confiance pour une seule exécution et ne demande aucun redémarrage.

### Script autonome avec l'API Gemini (sans installer de CLI)

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

> **Offre gratuite :** les deux options fonctionnent sans facturation. La CLI native utilise Google OAuth ; le script API utilise `gemini-3.6-flash` (les limites de débit dépendent du modèle et du palier ; consulte la documentation Google AI pour les quotas en vigueur).

## Portails préconfigurés

Le scanner est livré avec **100+ entreprises** prêtes à être scannées et **35+ requêtes de recherche** sur les principaux sites d'emploi. Copie `templates/portals.example.yml` vers `portals.yml` et ajoute les tiennes :

**Labos d'IA :** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**IA vocale :** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**Plateformes d'IA :** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Centres de contact :** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Entreprise :** Salesforce, Twilio, Gong, Dialpad
**LLMOps :** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automatisation :** n8n, Zapier, Make.com
**Europe :** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Sites d'emploi parcourus :** 55+ modules fournisseurs couvrent les API d'ATS, les flux de sites entiers, les flux XML/RSS, les flux markdown et les analyseurs locaux. Le tableau complet est dans [Sites d'emploi pris en charge](docs/SUPPORTED_JOB_BOARDS.md).

Par défaut, `node scan.mjs` (alias `npm run scan`) fait confiance à ce que renvoie chaque flux ATS. Certaines entreprises laissent des annonces périmées dans leur API publique même après la clôture du poste, si bien que ces entrées expirées peuvent se glisser dans `pipeline.md`. Passe `--verify` pour lancer Playwright après le passage par l'API et écarter les annonces expirées avant qu'elles n'atteignent le pipeline :

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

La vérification est séquentielle et ne porte que sur les nouvelles offres (après déduplication), donc le coût reste borné.

## Dashboard TUI

Le tableau de bord intégré au terminal te permet de parcourir ton pipeline visuellement :

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Fonctionnalités : 10 onglets de filtre, 8 modes de tri, vue groupée ou à plat, aperçus en chargement différé, changements de statut en ligne.

Il existe aussi une **interface web expérimentale** (alpha et optionnelle : rien ne tourne tant que tu ne la lances pas) : voir [`web/README.md`](web/README.md).

## Structure du projet

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

## Répertoire de données externe (optionnel)

Par défaut, les données de la couche utilisateur (comme `cv.md`, `portals.yml` et les dossiers `data/`, `reports/`, `output/`) vivent dans le dossier racine du projet.

Pour séparer tes données personnelles du code (et ainsi changer de branche, tirer des mises à jour ou tester plusieurs profils plus facilement), tu peux configurer un répertoire de données externe selon l'ordre de priorité suivant :

1. **Variables d'environnement :** définis la variable `REBOUND_OPS_ROOT` ou `REBOUND_OPS_DATA_DIR` :
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Fichier marqueur :** crée un fichier `.rebound-ops-data` à la racine du dépôt contenant le chemin vers ton répertoire de données.
3. **Par défaut :** la racine du dépôt.

Une fois résolu, tous les fichiers utilisateur sont résolus et écrits relativement à ce dossier, tandis que les fichiers de prompts et les scripts continuent d'être résolus relativement au dépôt.

- **Surcharge du tracker :** tu peux aussi définir `REBOUND_OPS_TRACKER` pour indiquer directement le chemin du fichier tracker des candidatures.
- **Écritures :** toutes les opérations d'écriture (comme les fusions) visent canoniquement `{DATA_ROOT}/data/applications.md`.
- **Configuration du scanner :** `portals.yml` est lu et validé à `{DATA_ROOT}/portals.yml`, donc `node validate-portals.mjs` vérifie le fichier même que lit `scan.mjs`.
- **Documents générés :** les CV adaptés et les lettres de motivation sont écrits sous `{DATA_ROOT}/output/`, et le manifeste PDF qui les relie à un rapport se trouve dans `{DATA_ROOT}/data/pdf-index.tsv`. Tant que `REBOUND_OPS_TRACKER` n'est pas défini, l'espace de travail du tracker qui encadre ces écritures est la racine des données, pas le checkout.
- **PDF avec surcharge du tracker :** `generate-pdf.mjs` résout `REBOUND_OPS_TRACKER` avant de déduire l'espace de travail ; avec la surcharge définie, l'espace de travail est donc le dossier qui contient ce tracker (ou le dossier parent, quand le tracker se trouve dans un dossier `data/`). Le HTML du CV et chaque PDF doivent alors se trouver dans cet espace de travail, et le manifeste passe dans son `data/pdf-index.tsv`. Les lettres de motivation visent toujours `{DATA_ROOT}/output/` ; elles sont donc refusées quand ce dossier se trouve hors de l'espace de travail du tracker.
- **La couche de code ne bouge pas :** `node_modules/`, `providers/`, `modes/` et les scripts eux-mêmes se résolvent toujours par rapport au dépôt, jamais par rapport à la racine des données.

Le dashboard TUI en Go, les scripts Node.js et les modes d'agent IA respectent tous automatiquement cette hiérarchie de résolution.


## Pile technique

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Agent** : CLI de codage IA avec skills et modes partagés (`AGENTS.md` + wrapper par CLI)
- **PDF** : Playwright + template HTML
- **Lettres de motivation** : template HTML + Playwright (PDF A4, même pipeline que les CV)
- **Scanner** : Playwright + API Greenhouse + WebSearch
- **Dashboard** : Go + Bubble Tea + Lipgloss (thème Catppuccin Mocha)
- **Données** : tableaux Markdown + configuration YAML + fichiers TSV de lot

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Fonctionne aussi dans toute CLI compatible avec le standard des agent skills. Voir <a href="docs/SUPPORTED_CLIS.md">CLI prises en charge</a>.</sub><br>
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

**Qu'est-ce que rebound-ops ?**
rebound-ops ([github.com/AnkitParekh007/rebound-ops](https://github.com/AnkitParekh007/rebound-ops), aussi connu sous le nom de **reboundops**) est une recherche d'emploi par IA, open source, qui tourne en local dans ta CLI de codage IA (Claude Code, Codex, OpenCode et autres) et te laisse chaque décision. Il évalue les offres face à ton CV, génère des PDF adaptés aux ATS, trouve la bonne personne à contacter et suit tout au même endroit : c'est toujours toi qui as le dernier mot. C'est la première implémentation de référence du [Manifeste ReboundOps](https://github.com/AnkitParekh007/rebound-ops).

**Le CV personnalisé peut-il inventer des choses ?**
Il ne doit pas, et les prompts le disent : reformuler, jamais inventer. `generate-pdf` bloque un CV dont les chiffres ou les faits ne figurent pas dans tes sources, sauf si tu passes `--skip-fact-check`. Le mode `pdf` lance aussi `cv-title-check.mjs`, qui compare chaque intitulé de poste du CV adapté à celui que cv.md donne au même poste (apparié par entreprise et dates) et te demande, pour chaque différence, si tu la gardes ou si tu reviens à l'intitulé de cv.md. Il avertit sans bloquer, car reformuler un intitulé relève parfois de ton choix. Rien ne juge encore les reformulations : [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (contrôle de fidélité bloquant) suit ce point. D'ici là, relis chaque CV avant de l'envoyer. L'[avertissement légal](LEGAL_DISCLAIMER.md) dit la même chose en plus long.

**Puis-je utiliser rebound-ops gratuitement, ou avec un modèle moins cher / local ?**
Oui. rebound-ops est indépendant de la CLI et tourne avec des modèles gratuits et locaux (modèles gratuits d'OpenRouter, Ollama ou n'importe quel endpoint compatible OpenAI), donc tu n'es lié à aucun abonnement payant. Voir [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) pour la configuration complète.

**Je paie Claude Pro/Max mais rebound-ops consomme des crédits API. Pourquoi ?**
Parce qu'une `ANTHROPIC_API_KEY` dans ton environnement prend le pas sur ton abonnement connecté : la CLI utilise la clé et facture au token. Lance `echo $ANTHROPIC_API_KEY` et, si quelque chose s'affiche, retire-la de ton profil shell, redémarre le terminal et lance `/login`. Le mode par lots est l'exception, car les workers `claude -p` n'utilisent pas la connexion interactive : lance `claude setup-token` une fois et exporte le résultat comme `CLAUDE_CODE_OAUTH_TOKEN`. Guide complet dans [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**Avec quelles CLI d'IA rebound-ops fonctionne-t-il ?**
rebound-ops tourne sur n'importe quelle grande CLI de codage IA (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen et plus) via le standard ouvert Agent Skill Standard, donc il n'est jamais lié à un seul fournisseur. Utilise la CLI que tu as déjà.

**Comment installer rebound-ops sous Windows ?**
rebound-ops fonctionne sous Windows. La configuration propre à la plateforme et ses pièges connus (détection de Git Bash, fins de ligne, Planificateur de tâches) sont dans [docs/WINDOWS.md](docs/WINDOWS.md). Si les skills ne se chargent pas à cause d'une erreur de lien symbolique pendant l'installation, la solution est dans [docs/FAQ.md](docs/FAQ.md). Les étapes complètes sont dans [docs/SETUP.md](docs/SETUP.md).

**rebound-ops postule-t-il aux offres à ma place ?**
Non. rebound-ops est un filtre, pas un robot qui postule en rafale. L'IA évalue, classe et rédige ; vous relisez et vous décidez. Il rédige et remplit ; il n'envoie jamais. Vous cliquez sur Envoyer. Cette conception avec l'humain aux commandes, c'est tout l'intérêt.

**rebound-ops est-il gratuit et open source ?**
Oui. rebound-ops est gratuit et open source, et pour le candidat il le restera toujours. C'est la première implémentation de référence du [Manifeste ReboundOps](https://github.com/AnkitParekh007/rebound-ops). Lis-le, et s'il dit ce que tu crois, signe-le.

## Clause de non-responsabilité

**rebound-ops est un outil local et open source, PAS un service hébergé.** En utilisant ce logiciel, tu reconnais que :

1. **Tu contrôles tes données.** Ton CV, tes coordonnées et tes données personnelles restent sur ta machine et sont envoyés directement au fournisseur d'IA que tu choisis (Anthropic, OpenAI, etc.). Nous ne collectons, ne stockons ni n'avons accès à aucune de tes données.
2. **Tu contrôles l'IA.** Les prompts par défaut demandent à l'IA de ne pas soumettre de candidatures automatiquement, mais les modèles d'IA peuvent se comporter de manière imprévisible. Si tu modifies les prompts ou utilises d'autres modèles, tu le fais à tes risques. **Vérifie toujours l'exactitude du contenu généré par l'IA avant de l'envoyer.**
3. **Tu respectes les conditions d'utilisation des tiers.** Tu dois utiliser cet outil conformément aux conditions d'utilisation des portails de recrutement avec lesquels tu interagis (Greenhouse, Lever, Workday, LinkedIn, etc.). N'utilise pas cet outil pour spammer les employeurs ni pour saturer les systèmes ATS.
4. **Aucune garantie.** Les évaluations sont des recommandations, pas des vérités. Les modèles d'IA peuvent halluciner des compétences ou de l'expérience. Les auteurs ne sont pas responsables des résultats d'embauche, des candidatures refusées, des restrictions de compte ni d'aucune autre conséquence.

Voir [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) pour tous les détails. Ce logiciel est fourni sous [Licence MIT](LICENSE) « en l'état », sans garantie d'aucune sorte.

## License

MIT — see [LICENSE](LICENSE). This folder is derived from third-party MIT-licensed software; the original notices are reproduced in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
