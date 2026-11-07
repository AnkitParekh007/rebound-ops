# ReboundOps engine

> Attribution: This engine adapts [rebound-ops](https://github.com/rebound-ops-hq/rebound-ops), created by Ankit Parekh and contributors (MIT). ReboundOps maintains an adapted integration. See [provenance](../PROVENANCE.md) and the original notices. This attribution correction is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## Что rebound-ops делает для вас

Вставьте вакансию. Он скажет, стоит ли она этого вечера.

- **Ещё открыта?** Он проверяет, что объявление всё ещё активно, прежде чем вы напишете хоть слово.
- **Не ваше?** Он оценивает роль против вашего настоящего резюме и советует пропустить слабое совпадение. Вы можете его переубедить.
- **Стоит того?** Он готовит черновики резюме, сопроводительного письма и ответов. Вы их читаете. Вы их отправляете.
- **С кем говорить?** Он находит человека и готовит черновик сообщения. Он никогда его не отправляет.
- **Куда всё это уходит?** Каждый отклик остаётся на вашей машине. Нам ничего не загружается.
- **Что мне выучить?** После серии отказов он называет пробел.

Первые запуски шероховатые. Он вас ещё не знает. Поговорите с ним: ваше резюме, чего вы хотите, от чего отказываетесь. Считайте это первой неделей рекрутера.

При первом запуске он спрашивает всё это в чате. Ничего не нужно настраивать вручную.

## Чего rebound-ops не делает

- **Отправлять отклик автоматически.** Он готовит черновик ответа для каждого поля; вы проверяете и нажимаете «Отправить». Скрипт никогда не делает POST (`prepare-application.mjs`).
- **Не отправляет письма.** Только черновики. Во всём коде нет ни одного почтового транспорта.
- **Не звонит домой.** Без телеметрии, без нашего бэкенда. Ваше резюме идёт с вашей машины к выбранному вами AI-провайдеру и больше никуда. Единственный публичный реестр: этот репозиторий, `HIRED.md` и его issues.
- **Не толкает откликаться ниже 4.0/5.** Скажет этого не делать. Вы можете проигнорировать, и он об этом скажет.

Он переформулирует ваше резюме; выдумывать не имеет права никогда. Проверка в коде останавливает PDF, если в нём есть цифры или факты, которых нет ни в вашем резюме, ни в `article-digest.md`, но оценить каждую переформулировку она пока не может. Читайте каждое резюме перед отправкой. Подробности в [FAQ](#faq).

## Возможности

| Функция                  | Описание                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Оценка A-H**           | Резюме роли, соответствие резюме (с весом каждого требования для этой вакансии и пометкой, взят ли вес из формулировки описания, его структуры или из оценки, с подписью для каждого требования; оценка никогда не может быть верхнего уровня), стратегия уровня, исследование компенсации, персонализация, подготовка к собеседованию (STAR+R), плюс проверка легитимности вакансии в блоке G (открыта ли она ещё, не повторная ли это публикация: наблюдения, а не вердикты) и сигнал разрешения на работу, помечающий описание с явным отказом в спонсорстве визы как жёсткий блокер |
| **Human-in-the-Loop**    | ИИ оценивает и рекомендует, вы решаете и действуете. Система никогда не отправляет отклик: последнее слово всегда за вами <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **Генерация ATS PDF**    | Резюме, читаемые ATS и адаптированные под каждое описание вакансии на основе вашего собственного опыта, в дизайне Space Grotesk + DM Sans |
| **Генератор сопроводительных писем** | Сопроводительные письма на основе исследования с зеркалированием ключевых слов, четырьмя интерактивными вопросами об угле подачи (почему/проблемы/подход/тон), утверждением черновика в чате и A4 PDF через тот же конвейер HTML + Playwright, что и для резюме. Готовит черновик при каждой оценке; завершить и сгенерировать по запросу через `/rebound-ops cover` |
| **За пределами резюме**  | Исследование компании ([`deep`](modes/deep.md)) раскрывает ИИ-стратегию, недавние шаги, инженерную культуру и угол, под которым стоит подать ваш профиль. Поиск контактов ([`contacto`](modes/contacto.md)) определяет hiring-менеджера, рекрутера или коллегу из команды, к кому стоит обратиться, и готовит сообщение для LinkedIn до 300 символов под каждый тип контакта. Черновики формальных писем-откликов ([`email`](modes/email.md)) превращают оценённый отчёт или вставленное описание в тему, текст и чеклист вложений, ничего не отправляя, не подавая и не кликая. Отклик ставит вас в очередь, исследование даёт вам разговор. |
| **Анализ паттернов**     | Паттерны отказов и доля прохождения по каналам ATS (`analyze-patterns.mjs`), статистика воронки за весь поиск (`stats.mjs`), выявление перепубликаций, которые могут указывать на вакансию-призрак (`detect-reposts.mjs`) |

<details>
<summary><b>Всё остальное, что он делает</b></summary>

| Функция                  | Описание                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Авто-конвейер**        | Вставьте URL и получите полную оценку + PDF + запись в трекере                                                                            |
| **Банк историй для собеседований** | Накапливает истории STAR+Reflection между оценками: 5-10 главных историй, которые можно адаптировать под заданные вам поведенческие вопросы                |
| **Скрипты переговоров**  | Фреймворки переговоров о зарплате, ответ на географическую скидку, рычаг конкурирующих офферов                                            |
| **Черновики писем-откликов** | Формальные письма рекрутеру, по рекомендации или холодные отклики из отчёта или вставленного описания, с темой, чеклистом вложений, обоснованными пунктами соответствия и блоком контактов из профиля. Только черновики: rebound-ops никогда не отправляет, не подаёт и не кликает ничего. |
| **Сканер порталов**      | 100+ предварительно настроенных компаний (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + собственные поисковые веб-запросы по Ashby, Greenhouse, Lever, Wellfound |
| **Поиск профинансированных компаний** | Команда `company:funded` (сначала просмотр) показывает компании с недавним финансированием и диагностику источников из структурированных публичных лент, не меняя ваши данные |
| **Пакетная обработка**   | Параллельная оценка headless CLI-воркерами (`claude -p` / `opencode run`)                                                               |
| **Dashboard TUI**        | Терминальный интерфейс для просмотра, фильтрации и сортировки вашего конвейера                                                           |
| **Целостность конвейера** | Автоматическое слияние, дедупликация, нормализация статусов, проверки состояния                                                        |
| **Набор для собеседований** | Планы подготовки по временным блокам, тренировочные сессии с обратной связью, разборы после собеседования ([`interview/`](modes/interview/README.md)) и детектор тревожных признаков компании ([`interview-redflag`](modes/interview-redflag.md)) |
| **Этап оффера**          | Сопровождение чтения контракта: проход по пунктам плюс список вопросов для юриста ([`offer-prep`](modes/offer-prep.md)), и анализатор разрыва между желаемой, заявленной и фактической зарплатой (`salary-gap.mjs`) |
| **Фоллоу-апы и ответы**  | Калькулятор ритма фоллоу-апов и заготовленные напоминания (`followup-cadence.mjs`, `followup-seed.mjs`); классификация ответов работодателя в обновления трекера ([`reply-watch`](modes/reply-watch.md)) |
| **Система плагинов**     | Опциональные интеграции (Gmail, Notion, Apify + реестр сообщества), выключены по умолчанию; см. [docs/PLUGINS.md](docs/PLUGINS.md)         |

</details>

## Быстрый старт

**Самый быстрый путь, одна команда:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` идёт вместе с [Node.js](https://nodejs.org): он запускает установщик один раз,
> ничего не устанавливая глобально. Ещё нет Node? Сначала установите его.
> (Уже пользуетесь CLI Claude Code / Codex? Тогда он у вас уже есть.)

Это клонирует последний релиз в `./rebound-ops` и устанавливает зависимости. Затем:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**При первом запуске rebound-ops проведёт вас через настройку (ваше резюме, профиль и целевые роли) просто в разговоре. Ничего не нужно редактировать вручную.**

<details>
<summary><b>Хотите настроить вручную? (git clone)</b></summary>

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

### Глобальная установка

```bash
npm i -g ./engine/scaffolder
```

Это устанавливает бинарник `rebound-ops` глобально, так что вы можете запускать `rebound-ops init [folder]` без `npx`. `init` — его единственная команда: она создаёт рабочее пространство, а всё дальнейшее происходит внутри вашего AI-CLI (см. «Использование» ниже), а не через этот бинарник.

**Что выбрать?**
- `node engine/scaffolder/bin/cli.mjs init`: лучше всего для первого запуска; создаёт отдельную папку проекта.
- `npm i -g ./engine/scaffolder`: если вам удобнее набирать `rebound-ops init`, чем форму с `npx`. Других команд он не добавляет.

> **Система спроектирована так, чтобы её настраивал сам ваш AI-CLI.** Режимы, архетипы, веса оценки, скрипты переговоров: просто попросите его изменить их. Он читает те же файлы, которыми пользуется, поэтому точно знает, что редактировать.

Смотрите [docs/SETUP.md](docs/SETUP.md) для полного руководства по настройке, [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) для дешёвого запуска rebound-ops на своих или локальных моделях (и [docs/FREE_TIER.md](docs/FREE_TIER.md) для запуска без затрат на бесплатном тарифе Antigravity CLI), [docs/AUTOMATION.md](docs/AUTOMATION.md) для планирования регулярных сканирований и рецепта отбора в шортлист без расхода токенов, [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) для деталей автозаполнения форм ATS, [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) для сверки экспорта ваших контактов LinkedIn с компаниями в вашей воронке, и [docs/FAQ.md](docs/FAQ.md) для ответов на типичные вопросы по настройке, включая [как происхождение историй предотвращает выдуманные цифры](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). Принципы дизайна в [ARCHITECTURE.md](ARCHITECTURE.md); потоки выполнения в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Использование

rebound-ops использует общий роутер команд. В CLI, которые регистрируют слеш-команды, это выглядит так:

```
/rebound-ops           → Показать все доступные команды
/rebound-ops {JD}      → АВТО-КОНВЕЙЕР: оценка + отчёт + PDF + трекер (вставьте текст или URL)
/rebound-ops pipeline  → Обработать отложенные URL из входящих (data/pipeline.md)
/rebound-ops oferta    → Только оценка, блоки A–H (без автоматического PDF)
/rebound-ops ofertas   → Сравнить и ранжировать несколько вакансий
/rebound-ops contacto  → Ход конём в LinkedIn: найти контакты + подготовить сообщение
/rebound-ops deep      → Промпт глубокого исследования компании
/rebound-ops interview-prep → Сгенерировать документ подготовки к собеседованию под конкретную компанию
/rebound-ops interview    → Интерактивное онбординг-интервью для профиля и резюме
/rebound-ops master-profile → Импортировать, просмотреть и проверить ваш Master Career Profile
/rebound-ops eu-swe    → Откалибровать европейский отклик SWE перед резюме, подачей или собеседованием
/rebound-ops interview/plan → План подготовки по временным блокам к предстоящему собеседованию
/rebound-ops interview/practice → Тренировочное собеседование, по одному вопросу с обратной связью
/rebound-ops interview/debrief → Разбор после собеседования: закрыть пробелы, предсказать следующий раунд
/rebound-ops interview-redflag → Проанализировать тревожные признаки работодателя перед выходом на работу
/rebound-ops pdf       → Только PDF, ATS-оптимизированное резюме
/rebound-ops text      → Адаптированное резюме в markdown (зеркалит cv.md, без PDF)
/rebound-ops latex     → Экспорт резюме в LaTeX/Overleaf .tex
/rebound-ops latex-tex → Адаптировать собственный resume.tex на месте (опционально; cv.md остаётся по умолчанию)
/rebound-ops cover     → Сопроводительное письмо: отдельно вставленное описание или /rebound-ops cover {slug}
/rebound-ops email     → Черновик формального письма-отклика (только черновик; никогда не отправляет, не подаёт и не кликает)
/rebound-ops add       → Добавить проект/статью/роль в резюме (загрузить + предпросмотр + подтвердить)
/rebound-ops expand    → Автоматически найти и добавить недостающие компетенции из ссылок профиля
/rebound-ops training  → Оценить курс/сертификат относительно North Star
/rebound-ops project   → Оценить идею проекта для портфолио
/rebound-ops tracker   → Обзор статусов откликов
/rebound-ops agent-inbox → Поставить в очередь/разобрать запросы для следующей сессии (data/agent-inbox.md)
/rebound-ops apply     → Живой помощник подачи (читает форму + генерирует ответы)
/rebound-ops scan      → Просканировать порталы и найти новые вакансии
/rebound-ops discover  → Превратить список компаний в сканируемые ATS-доски + добавить в portals.yml (без токенов)
/rebound-ops batch     → Пакетная обработка параллельными воркерами
/rebound-ops patterns  → Проанализировать паттерны отказов и улучшить нацеливание
/rebound-ops offer-prep → Прочитать полученный оффер/контракт вместе с кандидатом: проход по пунктам + вопросы для юриста (не юридическая консультация)
/rebound-ops titles    → Предложить смежные названия должностей из вашего резюме, чтобы расширить поиск
/rebound-ops upskill   → Сводный анализ пробелов в навыках по оценённым отчётам
/rebound-ops followup  → Трекер ритма фоллоу-апов: пометить просроченные, сгенерировать черновики
/rebound-ops reply-watch → Классифицировать ответы работодателей и предложить обновления трекера
/rebound-ops outcome   → Записать результат отклика и заархивировать артефакты
/rebound-ops calibrate → Консультативный отчёт: предсказывают ли ваши оценки реальные результаты? Читает данные /outcome; никогда не меняет оценивание
/rebound-ops update    → Обновить системные файлы rebound-ops с предпросмотром diff + проверкой совместимости
```

Или просто вставьте URL или описание вакансии: rebound-ops определит его автоматически и запустит полный конвейер.

В Codex слеш-команды не гарантированы. Используйте те же названия режимов в промпте или вызывайте их через `codex exec`.

## Как это работает

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Интеграция с Antigravity CLI

rebound-ops поддерживает Antigravity CLI нативно, так же как Claude Code и OpenCode. Все слеш-команды доступны через общую точку входа скилла с той же логикой оценки из `modes/*.md`.

Google перевёл потребительский доступ к Gemini CLI на Antigravity CLI. `GEMINI.md` теперь является бездействующим предохранителем совместимости, чтобы Antigravity не дублировал полные инструкции проекта, читая и `AGENTS.md`, и `GEMINI.md`.

### Нативный Antigravity CLI

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

Скилл определён по открытому стандарту в `.agents/skills/rebound-ops/SKILL.md` и подключён символической ссылкой или ссылкой для каждого поддерживаемого CLI (например `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`). Cursor автоматически обнаруживает общий скилл в `.agents/skills/`.

## Интеграция с Codex

rebound-ops поддерживает Codex через тот же общий роутер, но модель вызова отличается от CLI, которые автоматически регистрируют слеш-команды. Полное руководство: [docs/CODEX.md](docs/CODEX.md).

### Интерактивный Codex

```bash
cd rebound-ops
codex
```

Слеш-команды в Codex не гарантированы. Если `/rebound-ops` недоступна, попросите Codex запустить режим напрямую простым языком:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex одним вызовом (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Интеграция с Grok Build CLI

rebound-ops поддерживает Grok Build CLI нативно, так же как Claude Code и OpenCode. `AGENTS.md` автоматически загружается как правила проекта, а все слеш-команды доступны через общую точку входа скилла.

### Нативный Grok Build CLI

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

Для headless пакетных воркеров используйте `grok -p "prompt"` (добавьте `--yolo`, чтобы автоматически одобрять выполнение инструментов).

## Интеграция с Pi

rebound-ops поддерживает [Pi](https://github.com/earendil-works/pi) нативно, без файла-обёртки, который нужно поддерживать: Pi читает `AGENTS.md` из корня репозитория как контекст проекта и сам находит общий скилл в `.agents/skills/rebound-ops/SKILL.md`. После этого роутер доступен как `/skill:rebound-ops`.

### Нативный Pi

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

### Pi одним вызовом (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Если сборка Pi закрывает ресурсы проекта за решением о доверии, один раз выполните `/trust` внутри репозитория и перезапустите `pi`, чтобы скилл проекта загрузился (`/trust` действует на будущие процессы Pi), или запустите с `-a`: так доверие даётся одному запуску и перезапуск не нужен.

### Отдельный скрипт для Gemini API (без установки CLI)

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

> **Бесплатный тариф:** оба варианта работают без оплаты. Нативный CLI использует Google OAuth; скрипт API использует `gemini-3.6-flash` (лимиты запросов зависят от модели и тарифа; актуальные квоты смотрите в документации Google AI).

## Настройка порталов

Сканер поставляется со **100+ компаниями**, готовыми к сканированию, и **35+ поисковыми запросами** по основным доскам вакансий. Скопируйте `templates/portals.example.yml` в `portals.yml` и добавьте свои:

**AI-лаборатории:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Голосовой ИИ:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI-платформы:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Контакт-центры:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Автоматизация:** n8n, Zapier, Make.com
**Европа:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Сканируемые доски вакансий:** 55+ модулей провайдеров покрывают API ATS, ленты целых досок, XML/RSS-ленты, markdown-ленты и локальные парсеры. Полная таблица: [Поддерживаемые доски вакансий](docs/SUPPORTED_JOB_BOARDS.md).

По умолчанию `node scan.mjs` (он же `npm run scan`) доверяет тому, что возвращает каждая лента ATS. Некоторые компании оставляют устаревшие объявления в своём публичном API даже после закрытия вакансии, так что эти просроченные записи могут попасть в `pipeline.md`. Передайте `--verify`, чтобы после прохода по API запустить Playwright и отбросить просроченные объявления до того, как они попадут в конвейер:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

Проверка последовательная и выполняется только для новых вакансий (после дедупликации), так что стоимость остаётся ограниченной.

### 🇷🇺 Российские площадки

rebound-ops поддерживает ключевые российские джоб-борды:

| Площадка            | URL                                        | Тип       | Особенности                                                  |
| ------------------- | ------------------------------------------ | --------- | ------------------------------------------------------------ |
| **HeadHunter**      | [hh.ru](https://hh.ru)                     | API + Web | Главная площадка РФ. Открытый API. 600k+ IT-вакансий         |
| **Хабр Карьера**    | [career.habr.com](https://career.habr.com) | Web       | IT-вакансии, грейды, зарплатные вилки, техническое комьюнити |
| **Работа в России** | [trudvsem.ru](https://trudvsem.ru)         | API + Web | Госпортал Роструда. Открытый API для массового парсинга      |
| **Rabota.ru**       | [rabota.ru](https://rabota.ru)             | Web       | Принадлежит Сберу. Крупные компании, финтех                  |
| **Superjob**        | [superjob.ru](https://www.superjob.ru)     | Web       | Вторая по величине после hh.ru                               |
| **Geekjob**         | [geekjob.ru](https://geekjob.ru)           | Web       | IT-вакансии с указанием вилок                                |
| **Буду**            | [budu.jobs](https://budu.jobs)             | Web       | IT-вакансии, бывший Хантфлоу                                 |

**Telegram-каналы** подключаются как обычный источник сканера через `provider: telegram-channel` (читает публичное превью `t.me/s/<канал>` — без ключей и логина, историю до `since_days`), образец записи — в `templates/portals.example.yml`. В выдачу попадают только посты, где назван работодатель («Компания: …», «Title @ Компания») и есть ссылка на саму вакансию (ATS работодателя или страница вакансии на борде): компанией становится работодатель, URL — эта ссылка, пермалинк поста уходит в описание. Посты «пишите @hr» без работодателя, подборки и анонимные вакансии отбрасываются, так что для HR-каналов вроде @jobforjunior или @job_python это работает, для чатов свободного формата — почти нет. Приватные каналы и каналы с выключенным превью так не читаются — сканер сообщит об этом явно.

#### Особенности российского рынка в оценке

- **Зарплата**: gross (до НДФЛ 13%) vs net (на руки) — система учитывает разницу
- **Оформление**: ТК РФ, ГПХ, самозанятость — влияет на оценку стабильности
- **Бенефиты**: ДМС, ДМС стомат., компенсация питания/спорта/обучения
- **Испытательный срок**: до 3 мес. (6 мес. для руководителей по ТК РФ)
- **Отпуск**: 28 календарных дней минимум по ТК + доп. дни

## Dashboard TUI

Встроенный терминальный дашборд позволяет просматривать ваш конвейер визуально:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

Функции: 10 вкладок фильтров, 8 режимов сортировки, сгруппированный/плоский вид, ленивая загрузка предпросмотра, изменение статусов в строке.

Есть также **экспериментальный веб-интерфейс** (альфа, опционально: ничего не запускается, пока вы его не запустите): смотрите [`web/README.md`](web/README.md).

## Структура проекта

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

## Внешний каталог данных (опционально)

По умолчанию данные пользовательского слоя (такие как `cv.md`, `portals.yml` и папки `data/`, `reports/`, `output/`) живут в корневой папке проекта.

Чтобы отделить личные данные от кода (проще переключать ветки, подтягивать обновления или тестировать несколько профилей), вы можете настроить внешний каталог данных со следующим приоритетом:

1. **Переменные окружения:** задайте переменную `REBOUND_OPS_ROOT` или `REBOUND_OPS_DATA_DIR`:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **Файл-маркер:** создайте в корне репозитория файл `.rebound-ops-data` с путём к вашему каталогу данных.
3. **По умолчанию:** корень репозитория.

После определения все пользовательские файлы разрешаются и записываются относительно этой папки, тогда как файлы промптов и скрипты по-прежнему разрешаются относительно репозитория.

- **Переопределение трекера:** можно также задать `REBOUND_OPS_TRACKER`, чтобы напрямую указать путь к файлу трекера откликов.
- **Записи:** все операции записи (например, слияния) канонически направлены в `{DATA_ROOT}/data/applications.md`.
- **Конфигурация сканера:** `portals.yml` читается и валидируется по пути `{DATA_ROOT}/portals.yml`, так что `node validate-portals.mjs` проверяет тот же файл, что читает `scan.mjs`.
- **Сгенерированные документы:** адаптированные резюме и сопроводительные письма записываются в `{DATA_ROOT}/output/`, а PDF-манифест, связывающий их с отчётом, лежит в `{DATA_ROOT}/data/pdf-index.tsv`. Пока `REBOUND_OPS_TRACKER` не задан, рабочим пространством трекера, которое ограничивает эти записи, является корень данных, а не checkout репозитория.
- **PDF при переопределённом трекере:** `generate-pdf.mjs` разрешает `REBOUND_OPS_TRACKER` до того, как вычислить рабочее пространство, поэтому при заданном переопределении рабочим пространством становится папка с этим трекером (или папка уровнем выше, если трекер лежит в папке `data/`). HTML резюме и каждый PDF должны тогда находиться внутри этого рабочего пространства, а манифест переезжает в его `data/pdf-index.tsv`. Сопроводительные письма по-прежнему пишутся в `{DATA_ROOT}/output/`, поэтому они отклоняются, если эта папка оказывается вне рабочего пространства трекера.
- **Слой кода остаётся на месте:** `node_modules/`, `providers/`, `modes/` и сами скрипты всегда разрешаются относительно репозитория, никогда относительно корня данных.

Дашборд TUI на Go, скрипты Node.js и режимы ИИ-агента автоматически соблюдают эту иерархию.


## Технологии

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Агент**: AI-CLI с общими скиллами и режимами (`AGENTS.md` + обёртка для CLI)
- **PDF**: Playwright + HTML-шаблон
- **Сопроводительные письма**: HTML-шаблон + Playwright (A4 PDF, тот же конвейер, что и для резюме)
- **Сканер**: Playwright + Greenhouse API + WebSearch
- **Дашборд**: Go + Bubble Tea + Lipgloss (тема Catppuccin Mocha)
- **Данные**: таблицы Markdown + конфигурация YAML + пакетные файлы TSV

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>Работает также в любом CLI со стандартом agent skills. См. <a href="docs/SUPPORTED_CLIS.md">поддерживаемые CLI</a>.</sub><br>
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

**Что такое rebound-ops?**
ReboundOps integrates a modified MIT-licensed [rebound-ops engine](https://github.com/rebound-ops-hq/rebound-ops), originally created by Ankit Parekh and contributors. It did not originate the upstream manifesto or its founder outcomes. See [provenance](../PROVENANCE.md). (Attribution correction maintained in English.)

**Может ли адаптированное резюме что-то выдумать?**
Не должно, и промпты это говорят: переформулировать, никогда не выдумывать. `generate-pdf` блокирует резюме, в котором есть цифры или факты, отсутствующие в ваших источниках, если только вы не передадите `--skip-fact-check`. Режим `pdf` также запускает `cv-title-check.mjs`: он сравнивает каждое название должности в адаптированном резюме с названием, которое cv.md даёт той же работе (сопоставление по компании и датам), и спрашивает, оставить или вернуть каждое отличающееся. Он только предупреждает, а не блокирует, потому что переформулировать название должности иногда ваше решение. Переформулировки пока ничто не оценивает: это отслеживает [#1411](https://github.com/rebound-ops-hq/rebound-ops/issues/1411) (проверка достоверности, блокирующая при несовпадении). До тех пор читайте каждое резюме перед отправкой. [Юридическая оговорка](LEGAL_DISCLAIMER.md) говорит то же самое длиннее.

**Могу ли я запускать rebound-ops бесплатно или на более дешёвой / локальной модели?**
Да. rebound-ops не зависит от CLI и работает на бесплатных и локальных моделях (бесплатные модели OpenRouter, Ollama или любой OpenAI-совместимый эндпоинт), так что вы не привязаны к платной подписке. Полная настройка: [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md).

**Я плачу за Claude Pro/Max, но rebound-ops сжигает API-кредиты. Почему?**
Потому что `ANTHROPIC_API_KEY` в вашем окружении имеет приоритет над подпиской, в которую вы вошли: CLI использует ключ и тарифицирует за токен. Выполните `echo $ANTHROPIC_API_KEY`, и если что-то выводится, уберите его из профиля оболочки, перезапустите терминал и выполните `/login`. Пакетный режим является исключением, потому что воркеры `claude -p` не используют интерактивный вход: один раз выполните `claude setup-token` и экспортируйте результат как `CLAUDE_CODE_OAUTH_TOKEN`. Полное пошаговое описание: [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**С какими AI-CLI работает rebound-ops?**
rebound-ops работает с любым основным AI-CLI для программирования (Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen и другими) через открытый Agent Skill Standard, так что никогда не привязан к одному вендору. Используйте тот CLI, что у вас уже есть.

**Как установить rebound-ops на Windows?**
rebound-ops работает на Windows. Специфичная для платформы настройка и известные острые углы (поиск Git Bash, концы строк, Планировщик заданий) описаны в [docs/WINDOWS.md](docs/WINDOWS.md). Если скиллы не загружаются с ошибкой символической ссылки при установке, решение в [docs/FAQ.md](docs/FAQ.md). Полные шаги в [docs/SETUP.md](docs/SETUP.md).

**Откликается ли rebound-ops на вакансии за меня?**
Нет. rebound-ops является фильтром, а не инструментом массовой автоматической рассылки. ИИ оценивает, ранжирует и готовит черновики; вы просматриваете и решаете. Он готовит черновики и заполняет поля; он никогда не отправляет. Вы нажимаете «Отправить». Именно в этом дизайне с человеком в контуре вся суть.

**Бесплатен ли rebound-ops и открыт ли его код?**
The source is MIT-licensed; optional AI providers may charge separately. Our own [product principles](../docs/principles.md) do not collect public signatures. The upstream manifesto remains the work of its original authors. (Attribution correction maintained in English.)

## Дисклеймер

**rebound-ops является локальным open-source инструментом, а НЕ хостинг-сервисом.** Используя это ПО, вы подтверждаете:

1. **Вы контролируете свои данные.** Ваше резюме, контакты и персональные данные остаются на вашей машине и отправляются напрямую выбранному вами AI-провайдеру (Anthropic, OpenAI и др.). Мы не собираем, не храним и не имеем доступа ни к каким вашим данным.
2. **Вы контролируете ИИ.** Промпты по умолчанию инструктируют ИИ не отправлять отклики автоматически, но ИИ-модели могут вести себя непредсказуемо. Если вы меняете промпты или используете другие модели, вы делаете это на свой риск. **Всегда проверяйте точность сгенерированного ИИ контента перед отправкой.**
3. **Вы соблюдаете условия сервиса третьих сторон.** Вы должны использовать этот инструмент в соответствии с Условиями использования карьерных порталов, с которыми взаимодействуете (Greenhouse, Lever, Workday, LinkedIn и др.). Не используйте этот инструмент для спама работодателям или перегрузки систем ATS.
4. **Без гарантий.** Оценки являются рекомендациями, а не истиной. ИИ-модели могут галлюцинировать навыки или опыт. Авторы не несут ответственности за результаты трудоустройства, отклонённые отклики, ограничения учётных записей или любые другие последствия.

Смотрите [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) за полной информацией. Это ПО распространяется по [лицензии MIT](LICENSE) «как есть», без каких-либо гарантий.

## License

MIT — see [LICENSE](LICENSE). This folder is derived from third-party MIT-licensed software; the original notices are reproduced in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
