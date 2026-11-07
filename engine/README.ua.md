# ReboundOps engine

> Attribution: This engine is part of the [ReboundOps monorepo](https://github.com/AnkitParekh007/rebound-ops) (MIT). See [provenance](../PROVENANCE.md). This attribution note is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## Що rebound-ops робить для вас

Вставте вакансію. Він скаже, чи варта вона цього вечора.

- **Ще відкрита?** Він перевіряє, що оголошення досі активне, перш ніж ви напишете хоч слово.
- **Не ваше?** Він оцінює роль проти вашого справжнього резюме і радить пропустити слабкий збіг. Ви можете його переважити.
- **Варте уваги?** Він готує чернетки резюме, супровідного листа та відповідей. Ви їх читаєте. Ви їх надсилаєте.
- **З ким говорити?** Він знаходить людину й готує чернетку повідомлення. Він ніколи його не надсилає.
- **Куди все це йде?** Кожен відгук залишається на вашій машині. Нам нічого не завантажується.
- **Що мені вивчити?** Після серії відмов він називає прогалину.

Перші запуски шорсткі. Він вас ще не знає. Поговоріть з ним: ваше резюме, чого ви хочете, від чого відмовляєтесь. Сприймайте це як перший тиждень рекрутера.

Під час першого запуску він запитує все це в чаті. Нічого налаштовувати вручну.

## Чого rebound-ops не робить

- **Надсилати відгук автоматично.** Він готує чернетку відповіді для кожного поля; ви перевіряєте й натискаєте «Надіслати». Скрипт ніколи не робить POST (`prepare-application.mjs`).
- **Не надсилає листи.** Лише чернетки. У всьому коді немає жодного поштового транспорту.
- **Не дзвонить додому.** Без телеметрії, без нашого бекенду. Ваше резюме йде з вашої машини до обраного вами AI-провайдера і більше нікуди. Єдиний публічний реєстр: цей репозиторій, `HIRED.md` та його issues.
- **Не штовхає подаватися нижче 4.0/5.** Скаже не робити цього. Ви можете проігнорувати, і він про це скаже.

Він переформульовує ваше резюме; вигадувати не має права ніколи. Перевірка в коді зупиняє PDF, у якому є цифри чи факти, яких немає ні у вашому резюме, ні в `article-digest.md`, але оцінити кожне переформулювання вона поки не може. Читайте кожне резюме перед відправкою. Деталі у [FAQ](#faq).

## Що система вміє

| Функція                  | Опис                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Оцінка A-H**           | Резюме ролі, відповідність резюме (з вагою кожної вимоги для цієї вакансії та позначкою, чи взято вагу з формулювання опису, його структури чи з оцінки, з підписом для кожної вимоги; оцінка ніколи не може бути найвищого рівня), стратегія рівня, дослідження компенсації, персоналізація, підготовка до співбесіди (STAR+R), плюс перевірка легітимності вакансії в блоці G (чи вона ще відкрита, чи це не повторна публікація: спостереження, а не вердикти) і сигнал дозволу на роботу, що позначає опис із явною відмовою у спонсорстві візи як жорсткий блокер |
| **Human-in-the-Loop**    | AI оцінює та рекомендує, ви вирішуєте та дієте. Система ніколи не подає заявку: останнє слово завжди за вами <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **Генерація ATS PDF**    | Резюме, читабельні для ATS і адаптовані під кожен опис вакансії на основі вашого власного досвіду, у дизайні Space Grotesk + DM Sans |
| **Генератор супровідних листів** | Супровідні листи на основі дослідження з віддзеркаленням ключових слів, чотирма інтерактивними запитаннями про кут подачі (чому/проблеми/підхід/тон), затвердженням чернетки в чаті та A4 PDF через той самий конвеєр HTML + Playwright, що й для резюме. Готує чернетку при кожній оцінці; завершити й згенерувати на вимогу через `/rebound-ops cover` |
| **Поза межами резюме**   | Дослідження компанії ([`deep`](modes/deep.md)) розкриває AI-стратегію, нещодавні кроки, інженерну культуру та кут, під яким варто подати ваш профіль. Пошук контактів ([`contacto`](modes/contacto.md)) визначає hiring-менеджера, рекрутера або колегу з команди, до кого варто звернутися, і готує повідомлення для LinkedIn до 300 символів під кожен тип контакту. Чернетки формальних листів-заявок ([`email`](modes/email.md)) перетворюють оцінений звіт або вставлений опис на тему, текст і чекліст вкладень, нічого не надсилаючи, не подаючи і не клікаючи. Заявка ставить вас у чергу, дослідження дає вам розмову. |
| **Аналіз патернів**      | Патерни відмов і частка проходження по каналах ATS (`analyze-patterns.mjs`), статистика воронки за весь пошук (`stats.mjs`), виявлення перепублікацій, які можуть вказувати на вакансію-привид (`detect-reposts.mjs`) |

<details>
<summary><b>Усе інше, що він робить</b></summary>

| Функція                  | Опис                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Авто-конвеєр**         | Вставте URL і отримайте повну оцінку + PDF + запис у трекері                                                                             |
| **Банк історій для співбесід** | Накопичує історії STAR+Reflection між оцінками: 5-10 головних історій, які можна адаптувати під поставлені вам поведінкові питання             |
| **Скрипти переговорів**  | Фреймворки переговорів про зарплату, відповідь на географічну знижку, важіль конкурентних оферів                                          |
| **Чернетки листів-заявок** | Формальні листи рекрутеру, за рекомендацією або холодні заявки зі звіту чи вставленого опису, з темою, чеклістом вкладень, обґрунтованими пунктами відповідності та блоком контактів із профілю. Лише чернетки: rebound-ops ніколи не надсилає, не подає і не клікає нічого. |
| **Сканер порталів**      | 100+ попередньо налаштованих компаній (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + власні пошукові веб-запити по Ashby, Greenhouse, Lever, Wellfound |
| **Пошук профінансованих компаній** | Команда `company:funded` (спершу перегляд) показує компанії з нещодавнім фінансуванням і діагностику джерел зі структурованих публічних стрічок, не змінюючи ваші дані |
| **Пакетна обробка**      | Паралельна оцінка headless CLI-воркерами (`claude -p` / `opencode run`)                                                                 |
| **Dashboard TUI**        | Термінальний інтерфейс для перегляду, фільтрації та сортування вашого конвеєра                                                           |
| **Цілісність конвеєра**  | Автоматичне злиття, дедуплікація, нормалізація статусів, перевірки стану                                                                 |
| **Набір для співбесід**  | Плани підготовки за часовими блоками, тренувальні сесії зі зворотним зв'язком, розбори після співбесіди ([`interview/`](modes/interview/README.md)) і детектор тривожних ознак компанії ([`interview-redflag`](modes/interview-redflag.md)) |
| **Етап оферу**           | Супровід читання контракту: прохід по пунктах плюс список питань для юриста ([`offer-prep`](modes/offer-prep.md)), і аналізатор розриву між бажаною, заявленою та фактичною зарплатою (`salary-gap.mjs`) |
| **Фоллоу-апи та відповіді** | Калькулятор ритму фоллоу-апів і заготовлені нагадування (`followup-cadence.mjs`, `followup-seed.mjs`); класифікація відповідей роботодавця в оновлення трекера ([`reply-watch`](modes/reply-watch.md)) |
| **Система плагінів**     | Опціональні інтеграції (Gmail, Notion, Apify + реєстр спільноти), вимкнені за замовчуванням; див. [docs/PLUGINS.md](docs/PLUGINS.md)      |

</details>

## Швидкий старт

**Найшвидший шлях, одна команда:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` іде разом із [Node.js](https://nodejs.org): він запускає інсталятор один раз,
> нічого не встановлюючи глобально. Ще немає Node? Спершу встановіть його.
> (Уже користуєтеся CLI Claude Code / Codex? Тоді він у вас уже є.)

Це клонує останній реліз у `./rebound-ops` і встановлює залежності. Потім:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**При першому запуску rebound-ops проведе вас через налаштування (ваше резюме, профіль і цільові ролі) просто в розмові. Нічого не треба редагувати вручну.**

<details>
<summary><b>Хочете налаштувати вручну? (git clone)</b></summary>

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

### Глобальне встановлення

```bash
npm i -g ./engine/scaffolder
```

Це встановлює бінарник `rebound-ops` глобально, тож ви можете запускати `rebound-ops init [folder]` без `npx`. `init` — його єдина команда: вона створює робочий простір, а все подальше відбувається всередині вашого AI-кодинг CLI (див. «Використання» нижче), а не через цей бінарник.

**Що обрати?**
- `node engine/scaffolder/bin/cli.mjs init`: найкраще для першого запуску; створює окрему теку проєкту.
- `npm i -g ./engine/scaffolder`: якщо вам зручніше набирати `rebound-ops init`, ніж форму з `npx`. Інших команд він не додає.

> **Система спроєктована так, щоб її налаштовував сам ваш AI-кодинг CLI.** Режими, архетипи, ваги оцінювання, скрипти переговорів: просто попросіть його змінити їх. Він читає ті самі файли, якими користується, тож точно знає, що редагувати.

Дивіться [docs/SETUP.md](docs/SETUP.md) для повного посібника з налаштування, [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) для дешевого запуску rebound-ops на власних або локальних моделях (і [docs/FREE_TIER.md](docs/FREE_TIER.md) для запуску без витрат на безкоштовному тарифі Antigravity CLI), [docs/AUTOMATION.md](docs/AUTOMATION.md) для планування регулярних сканувань і рецепту відбору в шортліст без витрат токенів, [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) для деталей автозаповнення форм ATS, [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) для звірки експорту ваших контактів LinkedIn з компаніями у вашій воронці, та [docs/FAQ.md](docs/FAQ.md) для відповідей на типові питання з налаштування, зокрема [як походження історій запобігає вигаданим цифрам](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). Принципи дизайну в [ARCHITECTURE.md](ARCHITECTURE.md); потоки виконання в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Використання

rebound-ops використовує спільний роутер команд. У CLI, які реєструють слеш-команди, це виглядає так:

```
/rebound-ops           → Показати всі доступні команди
/rebound-ops {JD}      → АВТО-КОНВЕЄР: оцінка + звіт + PDF + трекер (вставте текст або URL)
/rebound-ops pipeline  → Обробити відкладені URL із вхідних (data/pipeline.md)
/rebound-ops oferta    → Лише оцінка, блоки A–H (без автоматичного PDF)
/rebound-ops ofertas   → Порівняти й ранжувати кілька вакансій
/rebound-ops contacto  → Хід конем у LinkedIn: знайти контакти + підготувати повідомлення
/rebound-ops deep      → Промпт глибокого дослідження компанії
/rebound-ops interview-prep → Згенерувати документ підготовки до співбесіди під конкретну компанію
/rebound-ops interview    → Інтерактивне онбординг-інтерв'ю для профілю та резюме
/rebound-ops master-profile → Імпортувати, переглянути й перевірити ваш Master Career Profile
/rebound-ops eu-swe    → Відкалібрувати європейську заявку SWE перед резюме, поданням або співбесідою
/rebound-ops interview/plan → План підготовки за часовими блоками до майбутньої співбесіди
/rebound-ops interview/practice → Тренувальна співбесіда, по одному питанню зі зворотним зв'язком
/rebound-ops interview/debrief → Розбір після співбесіди: закрити прогалини, передбачити наступний раунд
/rebound-ops interview-redflag → Проаналізувати тривожні ознаки роботодавця перед виходом на роботу
/rebound-ops pdf       → Лише PDF, ATS-оптимізоване резюме
/rebound-ops text      → Адаптоване резюме в markdown (віддзеркалює cv.md, без PDF)
/rebound-ops latex     → Експорт резюме в LaTeX/Overleaf .tex
/rebound-ops latex-tex → Адаптувати власний resume.tex на місці (опційно; cv.md лишається за замовчуванням)
/rebound-ops cover     → Супровідний лист: окремо вставлений опис або /rebound-ops cover {slug}
/rebound-ops email     → Чернетка формального листа-заявки (лише чернетка; ніколи не надсилає, не подає і не клікає)
/rebound-ops add       → Додати проєкт/статтю/роль до резюме (завантажити + переглянути + підтвердити)
/rebound-ops expand    → Автоматично знайти й додати відсутні компетенції з посилань профілю
/rebound-ops training  → Оцінити курс/сертифікат відносно North Star
/rebound-ops project   → Оцінити ідею проєкту для портфоліо
/rebound-ops tracker   → Огляд статусів заявок
/rebound-ops agent-inbox → Поставити в чергу/розібрати запити для наступної сесії (data/agent-inbox.md)
/rebound-ops apply     → Живий помічник подання (читає форму + генерує відповіді)
/rebound-ops scan      → Просканувати портали та знайти нові вакансії
/rebound-ops discover  → Перетворити список компаній на скановані ATS-дошки + додати до portals.yml (без токенів)
/rebound-ops batch     → Пакетна обробка паралельними воркерами
/rebound-ops patterns  → Проаналізувати патерни відмов і покращити націлювання
/rebound-ops offer-prep → Прочитати отриманий офер/контракт разом із кандидатом: прохід по пунктах + питання для юриста (не юридична порада)
/rebound-ops titles    → Запропонувати суміжні назви посад із вашого резюме, щоб розширити пошук
/rebound-ops upskill   → Зведений аналіз прогалин у навичках з оцінених звітів
/rebound-ops followup  → Трекер ритму фоллоу-апів: позначити прострочені, згенерувати чернетки
/rebound-ops reply-watch → Класифікувати відповіді роботодавців і запропонувати оновлення трекера
/rebound-ops outcome   → Записати результат заявки та заархівувати артефакти
/rebound-ops calibrate → Консультативний звіт: чи передбачають ваші оцінки реальні результати? Читає дані /outcome; ніколи не змінює оцінювання
/rebound-ops update    → Оновити системні файли rebound-ops із попереднім переглядом diff + перевіркою сумісності
```

Або просто вставте URL чи опис вакансії: rebound-ops визначить його автоматично й запустить повний конвеєр.

У Codex слеш-команди не гарантовані. Використовуйте ті самі назви режимів у промпті або викликайте їх через `codex exec`.

## Як це працює

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Інтеграція з Antigravity CLI

rebound-ops підтримує Antigravity CLI нативно, так само як Claude Code і OpenCode. Усі слеш-команди доступні через спільну точку входу скілу з тією самою логікою оцінювання з `modes/*.md`.

Google перевів доступ споживачів до Gemini CLI на Antigravity CLI. `GEMINI.md` тепер є бездієвим запобіжником сумісності, щоб Antigravity не дублював повні інструкції проєкту, читаючи і `AGENTS.md`, і `GEMINI.md`.

### Нативний Antigravity CLI

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

Скіл визначено за відкритим стандартом у `.agents/skills/rebound-ops/SKILL.md` і підключено символічним посиланням або посиланням для кожного підтримуваного CLI (наприклад `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`). Cursor автоматично виявляє спільний скіл у `.agents/skills/`.

## Інтеграція з Codex

rebound-ops підтримує Codex через той самий спільний роутер, але модель виклику відрізняється від CLI, які автоматично реєструють слеш-команди. Повний посібник: [docs/CODEX.md](docs/CODEX.md).

### Інтерактивний Codex

```bash
cd rebound-ops
codex
```

Слеш-команди в Codex не гарантовані. Якщо `/rebound-ops` недоступна, попросіть Codex запустити режим напряму простою мовою:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex одним викликом (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Інтеграція з Grok Build CLI

rebound-ops підтримує Grok Build CLI нативно, так само як Claude Code і OpenCode. `AGENTS.md` автоматично завантажується як правила проєкту, а всі слеш-команди доступні через спільну точку входу скілу.

### Нативний Grok Build CLI

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

Для headless пакетних воркерів використовуйте `grok -p "prompt"` (додайте `--yolo`, щоб автоматично схвалювати виконання інструментів).

## Інтеграція з Pi

rebound-ops підтримує [Pi](https://github.com/earendil-works/pi) нативно, без файлу-обгортки, який треба підтримувати: Pi читає `AGENTS.md` з кореня репозиторію як контекст проєкту і сам знаходить спільний скіл у `.agents/skills/rebound-ops/SKILL.md`. Після цього роутер доступний як `/skill:rebound-ops`.

### Нативний Pi

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

### Pi одним викликом (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Якщо збірка Pi закриває ресурси проєкту за рішенням про довіру, один раз виконайте `/trust` усередині репозиторію й перезапустіть `pi`, щоб скіл проєкту завантажився (`/trust` діє на майбутні процеси Pi), або запустіть з `-a`: так довіра надається одному запуску й перезапуск не потрібен.

### Окремий скрипт для Gemini API (без встановлення CLI)

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

> **Безкоштовний тариф:** обидва варіанти працюють без оплати. Нативний CLI використовує Google OAuth; скрипт API використовує `gemini-3.6-flash` (ліміти запитів залежать від моделі та тарифу; актуальні квоти дивіться в документації Google AI).

## Попередньо налаштовані портали

Сканер постачається зі **100+ компаніями**, готовими до сканування, і **35+ пошуковими запитами** по основних дошках вакансій. Скопіюйте `templates/portals.example.yml` у `portals.yml` і додайте свої:

**AI-лабораторії:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Голосовий AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI-платформи:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Контакт-центри:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Автоматизація:** n8n, Zapier, Make.com
**Європа:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Дошки вакансій, що скануються:** 55+ модулів провайдерів покривають API ATS, стрічки цілих дошок, XML/RSS-стрічки, markdown-стрічки та локальні парсери. Повна таблиця: [Підтримувані дошки вакансій](docs/SUPPORTED_JOB_BOARDS.md).

За замовчуванням `node scan.mjs` (він же `npm run scan`) довіряє тому, що повертає кожна стрічка ATS. Деякі компанії залишають застарілі оголошення у своєму публічному API навіть після закриття вакансії, тож ці прострочені записи можуть потрапити в `pipeline.md`. Передайте `--verify`, щоб після проходу API запустити Playwright і відкинути прострочені оголошення до того, як вони потраплять у конвеєр:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

Перевірка послідовна і виконується лише для нових вакансій (після дедуплікації), тож вартість лишається обмеженою.

## Дашборд TUI

Вбудований термінальний дашборд дає змогу переглядати ваш конвеєр візуально:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Функції: 10 вкладок фільтрів, 8 режимів сортування, згрупований/плоский вигляд, ліниве завантаження попереднього перегляду, зміна статусів у рядку.

Є також **експериментальний веб-інтерфейс** (альфа, опційно: нічого не запускається, поки ви його не запустите): дивіться [`web/README.md`](web/README.md).

## Структура проєкту

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

## Зовнішній каталог даних (опційно)

За замовчуванням дані користувацького шару (такі як `cv.md`, `portals.yml` і теки `data/`, `reports/`, `output/`) живуть у кореневій теці проєкту.

Щоб відокремити особисті дані від коду (простіше перемикати гілки, підтягувати оновлення чи тестувати кілька профілів), ви можете налаштувати зовнішній каталог даних із таким пріоритетом:

1. **Змінні середовища:** задайте змінну `REBOUND_OPS_ROOT` або `REBOUND_OPS_DATA_DIR`:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Файл-маркер:** створіть у корені репозиторію файл `.rebound-ops-data` зі шляхом до вашого каталогу даних.
3. **За замовчуванням:** корінь репозиторію.

Після визначення всі користувацькі файли розв'язуються і записуються відносно цієї теки, тоді як файли промптів і скрипти далі розв'язуються відносно репозиторію.

- **Перевизначення трекера:** можна також задати `REBOUND_OPS_TRACKER`, щоб напряму вказати шлях до файлу трекера заявок.
- **Записи:** усі операції запису (наприклад, злиття) канонічно спрямовані в `{DATA_ROOT}/data/applications.md`.
- **Конфігурація сканера:** `portals.yml` читається й валідується за шляхом `{DATA_ROOT}/portals.yml`, тож `node validate-portals.mjs` перевіряє той самий файл, який читає `scan.mjs`.
- **Згенеровані документи:** адаптовані резюме та супровідні листи записуються в `{DATA_ROOT}/output/`, а PDF-маніфест, що пов'язує їх зі звітом, лежить у `{DATA_ROOT}/data/pdf-index.tsv`. Поки `REBOUND_OPS_TRACKER` не задано, робочим простором трекера, що обмежує ці записи, є корінь даних, а не checkout репозиторію.
- **PDF із перевизначеним трекером:** `generate-pdf.mjs` розв'язує `REBOUND_OPS_TRACKER` до того, як визначити робочий простір, тож із заданим перевизначенням робочим простором стає тека з цим трекером (або тека рівнем вище, якщо трекер лежить у теці `data/`). HTML резюме і кожен PDF мають тоді бути всередині цього робочого простору, а маніфест переїжджає в його `data/pdf-index.tsv`. Супровідні листи й далі записуються в `{DATA_ROOT}/output/`, тож їх буде відхилено, якщо ця тека опиниться поза робочим простором трекера.
- **Шар коду лишається на місці:** `node_modules/`, `providers/`, `modes/` і самі скрипти завжди розв'язуються відносно репозиторію, ніколи відносно кореня даних.

Дашборд TUI на Go, скрипти Node.js і режими AI-агента автоматично дотримуються цієї ієрархії.


## Технологічний стек

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Агент**: AI-кодинг CLI зі спільними скілами та режимами (`AGENTS.md` + обгортка для CLI)
- **PDF**: Playwright + HTML-шаблон
- **Супровідні листи**: HTML-шаблон + Playwright (A4 PDF, той самий конвеєр, що й для резюме)
- **Сканер**: Playwright + Greenhouse API + WebSearch
- **Дашборд**: Go + Bubble Tea + Lipgloss (тема Catppuccin Mocha)
- **Дані**: таблиці Markdown + конфігурація YAML + пакетні файли TSV

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Працює також у будь-якому CLI зі стандартом agent skills. Див. <a href="docs/SUPPORTED_CLIS.md">підтримувані CLI</a>.</sub><br>
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

**Що таке rebound-ops?**
ReboundOps maintains this engine inside the [monorepo](https://github.com/AnkitParekh007/rebound-ops). Engineering checks are not participant outcomes. See [provenance](../PROVENANCE.md). (Attribution note maintained in English.)

**Чи може адаптоване резюме щось вигадати?**
Не має права, і промпти це кажуть: переформульовувати, ніколи не вигадувати. `generate-pdf` блокує резюме, у якому є цифри чи факти, відсутні у ваших джерелах, якщо тільки ви не передасте `--skip-fact-check`. Режим `pdf` також запускає `cv-title-check.mjs`: він порівнює кожну назву посади в адаптованому резюме з назвою, яку cv.md дає тій самій роботі (зіставлення за компанією та датами), і питає, залишити чи повернути кожну, що відрізняється. Він лише попереджає, а не блокує, бо переформулювати назву посади іноді ваше рішення. Переформулювання поки ніщо не оцінює: це відстежує [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (перевірка достовірності, що блокує в разі невідповідності). До того часу читайте кожне резюме перед відправкою. [Юридичне застереження](LEGAL_DISCLAIMER.md) каже те саме довше.

**Чи можу я запускати rebound-ops безкоштовно або на дешевшій / локальній моделі?**
Так. rebound-ops не залежить від CLI і працює на безкоштовних та локальних моделях (безкоштовні моделі OpenRouter, Ollama або будь-який OpenAI-сумісний ендпоінт), тож ви не прив'язані до платної підписки. Повне налаштування: [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md).

**Я плачу за Claude Pro/Max, але rebound-ops спалює API-кредити. Чому?**
Бо `ANTHROPIC_API_KEY` у вашому середовищі має пріоритет над підпискою, в яку ви увійшли: CLI використовує ключ і тарифікує за токен. Виконайте `echo $ANTHROPIC_API_KEY`, і якщо щось виводиться, приберіть його з профілю оболонки, перезапустіть термінал і виконайте `/login`. Пакетний режим є винятком, бо воркери `claude -p` не використовують інтерактивний вхід: один раз виконайте `claude setup-token` і експортуйте результат як `CLAUDE_CODE_OAUTH_TOKEN`. Повний покроковий опис: [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**З якими AI CLI працює rebound-ops?**
rebound-ops працює з будь-яким основним AI-кодинг CLI (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen та іншими) через відкритий Agent Skill Standard, тож ніколи не прив'язаний до одного вендора. Використовуйте той CLI, що у вас уже є.

**Як встановити rebound-ops на Windows?**
rebound-ops працює на Windows. Специфічне для платформи налаштування і відомі гострі кути (пошук Git Bash, кінці рядків, Планувальник завдань) описано в [docs/WINDOWS.md](docs/WINDOWS.md). Якщо скіли не завантажуються з помилкою символічного посилання під час встановлення, рішення в [docs/FAQ.md](docs/FAQ.md). Повні кроки в [docs/SETUP.md](docs/SETUP.md).

**Чи подає rebound-ops заявки замість мене?**
Ні. rebound-ops є фільтром, а не інструментом масової автоматичної розсилки. AI оцінює, ранжує і готує чернетки; ви переглядаєте і вирішуєте. Він готує чернетки й заповнює поля; він ніколи не подає заявку. Ви натискаєте «Надіслати». Саме в цьому дизайні з людиною в контурі вся суть.

**Чи rebound-ops безкоштовний і з відкритим кодом?**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md). (Attribution note maintained in English.)

## Застереження

**rebound-ops є локальним інструментом з відкритим кодом, а НЕ хмарним сервісом.** Використовуючи це програмне забезпечення, ви підтверджуєте:

1. **Ви контролюєте свої дані.** Ваше резюме, контактна інформація та персональні дані залишаються на вашому комп'ютері і надсилаються безпосередньо обраному вами AI-провайдеру (Anthropic, OpenAI тощо). Ми не збираємо, не зберігаємо і не маємо доступу до жодних ваших даних.
2. **Ви контролюєте AI.** Промпти за замовчуванням інструктують AI не подавати заявки автоматично, але AI-моделі можуть поводитися непередбачувано. Якщо ви змінюєте промпти або використовуєте інші моделі, ви робите це на власний ризик. **Завжди перевіряйте точність згенерованого AI контенту перед надсиланням.**
3. **Ви дотримуєтеся умов сервісу третіх сторін.** Ви повинні використовувати цей інструмент відповідно до Умов використання кар'єрних порталів, з якими взаємодієте (Greenhouse, Lever, Workday, LinkedIn тощо). Не використовуйте цей інструмент для спаму роботодавцям чи перевантаження систем ATS.
4. **Без гарантій.** Оцінки є рекомендаціями, а не істиною. AI-моделі можуть вигадувати навички або досвід. Автори не несуть відповідальності за результати працевлаштування, відхилені заявки, обмеження облікових записів чи будь-які інші наслідки.

Дивіться [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) за повною інформацією. Це програмне забезпечення надається за [ліцензією MIT](LICENSE) "як є", без будь-яких гарантій.

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
