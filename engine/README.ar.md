# ReboundOps engine

> Attribution: This engine is part of the [ReboundOps monorepo](https://github.com/AnkitParekh007/rebound-ops) (MIT). See [provenance](../PROVENANCE.md). This attribution note is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## ماذا يفعل rebound-ops من أجلك

الصق إعلان وظيفة. يخبرك إن كانت تلك الليلة تستحق.

- **أما زالت مفتوحة؟** يتحقق من أن الإعلان لا يزال منشورًا قبل أن تكتب كلمة واحدة.
- **ليس أنت؟** يقيّم الدور مقابل سيرتك الذاتية الحقيقية ويطلب منك تخطي التوافق الضعيف. يمكنك تجاوز رأيه.
- **يستحق؟** يصوغ السيرة الذاتية وخطاب التقديم والإجابات. أنت تقرؤها. أنت ترسلها.
- **مع من أتحدث؟** يجد الشخص ويصوغ الرسالة. لا يرسلها أبدًا.
- **إلى أين يذهب كل هذا؟** كل طلب يبقى على جهازك. لا يُرفع إلينا شيء.
- **ماذا ينبغي أن أتعلم؟** بعد سلسلة من الرفض، يسمّي الفجوة.

الجولات الأولى خشنة. هو لا يعرفك بعد. تحدّث إليه: سيرتك الذاتية، ما تريده، ما ترفضه. اعتبرها الأسبوع الأول لمسؤول توظيف.

عند التشغيل الأول يسألك عن كل ذلك في الدردشة. لا شيء يُضبط يدويًا.

## ما لا يفعله rebound-ops

- **إرسال طلب تقديم تلقائيًا.** يصوغ الإجابة لكل حقل؛ أنت تراجع وتضغط إرسال. السكربت لا يرسل POST أبدًا (`prepare-application.mjs`).
- **إرسال بريد إلكتروني.** مسودات فقط. لا يوجد أي وسيلة لإرسال البريد في هذا الكود كله.
- **الاتصال بالخارج.** لا قياس عن بُعد، ولا خادم خلفي لنا. سيرتك الذاتية تنتقل من جهازك إلى مزوّد الذكاء الاصطناعي الذي اخترته، ولا مكان آخر. السجل العلني الوحيد هو هذا المستودع: `HIRED.md` وقضاياه.
- **دفعك للتقديم تحت 4.0/5.** سيقول لك ألا تفعل. يمكنك تجاوز ذلك، وسيخبرك بذلك.

يعيد صياغة سيرتك الذاتية؛ ولا يجوز له أبدًا اختلاقها. يوقف فحصٌ في الكود أي ملف PDF يتضمن أرقامًا أو حقائق غير موجودة في سيرتك الذاتية ولا في ملف article digest الخاص بك، لكنه لا يستطيع بعدُ الحكم على كل إعادة صياغة. اقرأ كل سيرة ذاتية قبل إرسالها. التفاصيل في [الأسئلة الشائعة](#الأسئلة-الشائعة-faq).

## الميزات

| الميزة                   | الوصف                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **تقييم A-H**            | ملخص الدور، مطابقة السيرة الذاتية (مع مدى أهمية كل متطلب لهذا الإعلان، وما إذا كان ذلك الوزن مستمدًا من صياغة الوصف نفسه أو بنيته أو من تقدير، مع تسمية كل متطلب، ولا يمكن لتقدير أن يكون في الشريحة العليا أبدًا)، استراتيجية المستوى، بحث التعويضات، التخصيص، التحضير للمقابلة (STAR+R)، بالإضافة إلى فحص مصداقية الإعلان في الكتلة G (أما زال مفتوحًا، وهل هو إعادة نشر: ملاحظات، لا أحكام)، وإشارة تصريح العمل التي تعلّم أي وصف وظيفي ينص صراحة على عدم كفالة التأشيرة كعائق قاطع |
| **Human-in-the-Loop**    | الذكاء الاصطناعي يقيّم ويوصي، وأنت تقرر وتتصرف. النظام لا يقدّم طلب توظيف أبدًا: القرار الأخير دائمًا لك <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **إنشاء PDF متوافق مع ATS** | سير ذاتية تقرؤها أنظمة ATS، مكيّفة لكل وصف وظيفي انطلاقًا من خبرتك أنت، بتصميم Space Grotesk + DM Sans                                                                    |
| **مولّد خطابات التقديم** | خطابات تقديم مبنية على البحث مع مرآة الكلمات المفتاحية، وأربعة أسئلة تفاعلية للزاوية (لماذا/المشكلات/المنهج/النبرة)، وبوابة موافقة على المسودة داخل المحادثة، وPDF بحجم A4 عبر خط عمل HTML + Playwright نفسه المستخدم للسير الذاتية. يصيغ مسودة تلقائيًا مع كل تقييم؛ أكملها وأنشئها عند الطلب عبر `/rebound-ops cover` |
| **ما وراء السيرة الذاتية** | بحث الشركة ([`deep`](modes/deep.md)) يكشف استراتيجية الذكاء الاصطناعي والتحركات الأخيرة وثقافة الهندسة والزاوية التي ينبغي لملفك أن يتخذها. اكتشاف جهات الاتصال ([`contacto`](modes/contacto.md)) يحدد مدير التوظيف أو مسؤول التوظيف أو زميل الفريق الذي يستحق التواصل ويصيغ رسالة LinkedIn لا تتجاوز 300 حرف مضبوطة لكل نوع من جهات الاتصال. مسودات رسائل التقديم الرسمية ([`email`](modes/email.md)) تحوّل تقريرًا مقيّمًا أو وصفًا ملصقًا إلى سطر موضوع ونص وقائمة مرفقات دون إرسال أو تقديم أو نقر على أي شيء. التقديم يضعك في الطابور؛ والبحث يمنحك محادثة. |
| **تحليل الأنماط**        | أنماط الرفض ومعدلات التقدم لكل قناة ATS (`analyze-patterns.mjs`)، إحصاءات القمع طوال البحث (`stats.mjs`)، رصد إعادة نشر الإعلانات، وهي علامة محتملة على وظيفة وهمية (`detect-reposts.mjs`) |

<details>
<summary><b>كل ما يفعله غير ذلك</b></summary>

| الميزة                   | الوصف                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **خط عمل تلقائي**        | الصق رابطًا واحصل على تقييم كامل + PDF + سجل في المتتبع                                                                                  |
| **بنك قصص المقابلات**    | يراكم قصص STAR+Reflection عبر التقييمات: 5 إلى 10 قصص رئيسية يمكنك تكييفها مع الأسئلة السلوكية التي تُطرح عليك                                                        |
| **نصوص التفاوض**         | أطر التفاوض على الراتب، الرد على الخصم الجغرافي، استخدام العروض المنافسة كورقة ضغط                                                        |
| **مسودات رسائل التقديم** | رسائل رسمية لمسؤول التوظيف أو للإحالة أو للتقديم البارد من تقرير أو وصف ملصق، مع سطر الموضوع، وقائمة المرفقات، ونقاط ملاءمة موثقة بمصادرها، وكتلة تواصل مستمدة من ملفك. مسودة فقط: rebound-ops لا يرسل ولا يقدّم ولا ينقر على أي شيء أبدًا. |
| **ماسح البوابات**        | أكثر من 100 شركة مهيأة مسبقًا (Anthropic و OpenAI و ElevenLabs و Retool و n8n...) + استعلامات بحث ويب مخصصة عبر Ashby و Greenhouse و Lever و Wellfound |
| **اكتشاف الشركات الممولة** | أمر `company:funded` القائم على المراجعة أولًا يُظهر الشركات التي حصلت على تمويل حديثًا وتشخيصات المصادر من تغذيات عامة منظمة دون تعديل بياناتك |
| **المعالجة الجماعية**    | تقييم متوازٍ عبر عمّال CLI بلا واجهة (`claude -p` / `opencode run`)                                                                      |
| **لوحة تحكم TUI**        | واجهة طرفية لتصفح خط عملك وتصفيته وترتيبه                                                                                                |
| **سلامة خط العمل**       | دمج تلقائي، إزالة التكرار، توحيد الحالات، فحوصات صحية                                                                                    |
| **حزمة المقابلات**       | خطط تحضير بكتل زمنية، جلسات تدريب مع ملاحظات، مراجعات ما بعد المقابلة ([`interview/`](modes/interview/README.md))، وكاشف للإشارات التحذيرية في الشركة ([`interview-redflag`](modes/interview-redflag.md)) |
| **مرحلة العرض**          | رفيق قراءة العقد: مرور بندًا بندًا مع قائمة أسئلة للمحامي ([`offer-prep`](modes/offer-prep.md))، ومحلل للفجوة بين الراتب المطلوب والمعلن والفعلي (`salary-gap.mjs`) |
| **المتابعات والردود**    | حاسبة إيقاع المتابعة وتذكيرات مُعدّة مسبقًا (`followup-cadence.mjs`، `followup-seed.mjs`)؛ تصنيف ردود جهة التوظيف إلى تحديثات في المتتبع ([`reply-watch`](modes/reply-watch.md)) |
| **نظام الإضافات**        | تكاملات اختيارية (Gmail و Notion و Apify + سجل مجتمعي)، معطّلة افتراضيًا؛ انظر [docs/PLUGINS.md](docs/PLUGINS.md)                          |

</details>

## البدء السريع

**أسرع طريقة، بأمر واحد:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` يأتي مع [Node.js](https://nodejs.org): يشغّل المثبّت مرة واحدة
> دون تثبيت أي شيء بشكل عام. لا يوجد Node بعد؟ ثبّته أولًا.
> (تستخدم بالفعل واجهة Claude Code / Codex؟ إذن لديك بالفعل.)

يستنسخ هذا أحدث إصدار في `./rebound-ops` ويثبّت الاعتماديات. ثم:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**عند التشغيل الأول، يرشدك rebound-ops خلال الإعداد (سيرتك الذاتية وملفك والأدوار المستهدفة) بمجرد الدردشة. لا شيء يُحرَّر يدويًا.**

<details>
<summary><b>تفضّل الإعداد اليدوي؟ (git clone)</b></summary>

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

### التثبيت العام

```bash
npm i -g ./engine/scaffolder
```

يثبّت هذا الملف التنفيذي `rebound-ops` بشكل عام لتتمكن من تشغيل `rebound-ops init [folder]` دون `npx`. الأمر `init` هو أمره الوحيد: يُعِدّ مساحة عمل، وكل ما يأتي بعد ذلك يجري داخل واجهة الذكاء الاصطناعي البرمجية التي تستخدمها (انظر الاستخدام أدناه)، لا عبر هذا الملف التنفيذي.

**أيهما تستخدم؟**
- `node engine/scaffolder/bin/cli.mjs init`: الأفضل للاستخدام الأول؛ ينشئ مجلد مشروع مخصصًا.
- `npm i -g ./engine/scaffolder`: إذا كنت تفضّل كتابة `rebound-ops init` بدلًا من صيغة `npx`. لا يضيف أي أوامر أخرى.

> **النظام مصمم ليخصّصه وكيل واجهة الذكاء الاصطناعي نفسه.** الأوضاع والأنماط وأوزان التقييم ونصوص التفاوض: اطلب منه تغييرها فحسب. إنه يقرأ الملفات نفسها التي يستخدمها، لذا يعرف تمامًا ما الذي يجب تحريره.

انظر [docs/SETUP.md](docs/SETUP.md) لدليل الإعداد الكامل، و[docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) لتشغيل rebound-ops بتكلفة منخفضة باستخدام نماذج مخصصة أو محلية (و[docs/FREE_TIER.md](docs/FREE_TIER.md) لتشغيله دون تكلفة على الطبقة المجانية من Antigravity CLI)، و[docs/AUTOMATION.md](docs/AUTOMATION.md) لجدولة عمليات الفحص المتكررة ووصفة الفرز إلى قائمة مختصرة دون استهلاك رموز، و[docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md) لتفاصيل تدفق التعبئة التلقائية لنماذج ATS، و[docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md) لمقارنة تصدير جهات اتصالك في LinkedIn مع الشركات في قمعك، و[docs/FAQ.md](docs/FAQ.md) لإجابات أسئلة الإعداد الشائعة، بما فيها [كيف يمنع تتبع مصدر القصص الأرقام المختلقة](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank). مبادئ التصميم في [ARCHITECTURE.md](ARCHITECTURE.md)؛ وتدفقات التشغيل في [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## الاستخدام

يستخدم rebound-ops موجّه أوامر مشتركًا. في الواجهات التي تسجّل أوامر الشرطة المائلة، يبدو الأمر هكذا:

```
/rebound-ops           → عرض كل الأوامر المتاحة
/rebound-ops {JD}      → خط العمل التلقائي: تقييم + تقرير + PDF + متتبع (الصق نصًا أو رابطًا)
/rebound-ops pipeline  → معالجة الروابط المعلّقة من صندوق الوارد (data/pipeline.md)
/rebound-ops oferta    → تقييم فقط، الكتل من A إلى H (بدون PDF تلقائي)
/rebound-ops ofertas   → مقارنة عدة عروض وترتيبها
/rebound-ops contacto  → حركة LinkedIn الذكية: إيجاد جهات الاتصال + صياغة رسالة
/rebound-ops deep      → أمر بحث معمّق عن الشركة
/rebound-ops interview-prep → إنشاء مستند تحضير لمقابلة خاص بالشركة
/rebound-ops interview    → مقابلة تفاعلية لإعداد الملف والسيرة الذاتية
/rebound-ops master-profile → استيراد ملفك المهني الرئيسي (Master Career Profile) ومراجعته والتحقق منه
/rebound-ops eu-swe    → معايرة طلب SWE أوروبي قبل السيرة الذاتية أو التقديم أو المقابلة
/rebound-ops interview/plan → خطة تحضير بكتل زمنية لمقابلة قادمة
/rebound-ops interview/practice → مقابلة تدريبية، سؤال واحد في كل مرة مع ملاحظات
/rebound-ops interview/debrief → مراجعة ما بعد المقابلة: سد الثغرات وتوقع الجولة التالية
/rebound-ops interview-redflag → تحليل إشارات التحذير لدى جهة التوظيف قبل الانضمام
/rebound-ops pdf       → PDF فقط، سيرة ذاتية محسّنة لأنظمة ATS
/rebound-ops text      → سيرة ذاتية مخصّصة بصيغة markdown (تعكس cv.md، بدون PDF)
/rebound-ops latex     → تصدير السيرة الذاتية بصيغة LaTeX/Overleaf .tex
/rebound-ops latex-tex → تخصيص ملف resume.tex الخاص بك في مكانه (اختياري؛ يبقى cv.md الافتراضي)
/rebound-ops cover     → خطاب تقديم: وصف ملصق مستقل أو /rebound-ops cover {slug}
/rebound-ops email     → مسودة رسالة تقديم رسمية (مسودة فقط؛ لا يرسل ولا يقدّم ولا ينقر أبدًا)
/rebound-ops add       → إضافة مشروع/ورقة/دور إلى سيرتك الذاتية (جلب + معاينة + تأكيد)
/rebound-ops expand    → اكتشاف الكفاءات الناقصة وإضافتها تلقائيًا من روابط الملف
/rebound-ops training  → تقييم دورة/شهادة مقابل هدفك الأساسي (North Star)
/rebound-ops project   → تقييم فكرة مشروع لملف الأعمال
/rebound-ops tracker   → نظرة عامة على حالة الطلبات
/rebound-ops agent-inbox → وضع الطلبات في الطابور/تفريغها للجلسة القادمة (data/agent-inbox.md)
/rebound-ops apply     → مساعد تقديم مباشر (يقرأ النموذج + يولّد الإجابات)
/rebound-ops scan      → فحص البوابات واكتشاف عروض جديدة
/rebound-ops discover  → تحويل قائمة شركات إلى لوحات ATS قابلة للفحص + إضافتها إلى portals.yml (بدون رموز)
/rebound-ops batch     → معالجة جماعية بعمّال متوازين
/rebound-ops patterns  → تحليل أنماط الرفض وتحسين الاستهداف
/rebound-ops offer-prep → قراءة عرض/عقد مستلم مع المرشح: مرور على البنود + أسئلة للمحامي (ليست استشارة قانونية)
/rebound-ops titles    → اقتراح مسميات وظيفية مجاورة من سيرتك الذاتية لتوسيع البحث
/rebound-ops upskill   → تحليل مجمّع لفجوات المهارات من تقاريرك المقيّمة
/rebound-ops followup  → متتبع إيقاع المتابعة: تعليم المتأخر وإنشاء مسودات
/rebound-ops reply-watch → تصنيف ردود جهات التوظيف واقتراح تحديثات للمتتبع
/rebound-ops outcome   → تسجيل نتيجة الطلب وأرشفة المخرجات
/rebound-ops calibrate → تقرير استشاري: هل تتنبأ درجات تقييمك بنتائجك الفعلية؟ يقرأ بيانات /outcome؛ ولا يغيّر التقييم أبدًا
/rebound-ops update    → تحديث ملفات نظام rebound-ops مع معاينة الفروقات + فحص التوافق
```

أو الصق رابط الوظيفة أو وصفها مباشرة: يكتشفه rebound-ops تلقائيًا ويشغّل خط العمل الكامل.

في Codex، أوامر الشرطة المائلة غير مضمونة. استخدم أسماء الأوضاع نفسها في الأمر النصي بدلًا من ذلك، أو استدعِها من `codex exec`.

## كيف يعمل النظام؟

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## تكامل Antigravity CLI

يدعم rebound-ops واجهة Antigravity CLI أصلًا، بالطريقة نفسها التي يدعم بها Claude Code و OpenCode. جميع أوامر الشرطة المائلة متاحة عبر نقطة دخول المهارة المشتركة، باستخدام منطق التقييم نفسه في `modes/*.md`.

نقلت Google وصول المستهلكين إلى Gemini CLI نحو Antigravity CLI. أصبح `GEMINI.md` الآن حارس توافق بلا تأثير، حتى لا يكرر Antigravity تعليمات المشروع الكاملة عندما يقرأ `AGENTS.md` و`GEMINI.md` معًا.

### Antigravity CLI الأصلي

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

المهارة معرّفة وفق المعيار المفتوح في `.agents/skills/rebound-ops/SKILL.md` ومربوطة برابط رمزي أو مُشار إليها لكل واجهة مدعومة (مثل `.claude/` و`.qwen/` و`.antigravitycli/` و`.grok/`). يكتشف Cursor المهارة المشتركة تلقائيًا في `.agents/skills/`.

## تكامل Codex

يدعم rebound-ops واجهة Codex عبر الموجّه المشترك نفسه، لكن نموذج الاستدعاء يختلف عن الواجهات التي تسجّل أوامر الشرطة المائلة تلقائيًا. للدليل الكامل انظر [docs/CODEX.md](docs/CODEX.md).

### Codex التفاعلي

```bash
cd rebound-ops
codex
```

أوامر الشرطة المائلة غير مضمونة في Codex. إذا لم يكن `/rebound-ops` متاحًا، اطلب من Codex تشغيل الوضع مباشرة بلغة عادية:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### Codex بضربة واحدة (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## تكامل Grok Build CLI

يدعم rebound-ops واجهة Grok Build CLI أصلًا، بالطريقة نفسها التي يدعم بها Claude Code و OpenCode. يُحمَّل `AGENTS.md` تلقائيًا كقواعد للمشروع، وجميع أوامر الشرطة المائلة متاحة عبر نقطة دخول المهارة المشتركة.

### Grok Build CLI الأصلي

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

لعمّال المعالجة الجماعية بلا واجهة، استخدم `grok -p "prompt"` (أضف `--yolo` للموافقة التلقائية على تنفيذ الأدوات).

## تكامل Pi

يدعم rebound-ops واجهة [Pi](https://github.com/earendil-works/pi) أصلًا، دون أي ملف غلاف يحتاج إلى صيانة: يقرأ Pi ملف `AGENTS.md` من جذر المستودع كسياق للمشروع، ويكتشف بنفسه المهارة المشتركة في `.agents/skills/rebound-ops/SKILL.md`. بعد ذلك يصبح الموجّه متاحًا باسم `/skill:rebound-ops`.

### Pi الأصلي

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

### Pi بضربة واحدة (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

إذا كان أحد إصدارات Pi يشترط قرار ثقة قبل إتاحة موارد المشروع، فشغّل `/trust` مرة واحدة داخل المستودع وأعد تشغيل `pi` لتُحمَّل مهارة المشروع (ينطبق `/trust` على عمليات Pi اللاحقة)، أو ابدأ بالخيار `-a` الذي يمنح الثقة لتشغيل واحد فقط ولا يحتاج إلى إعادة تشغيل.

### سكربت Gemini API مستقل (لا يحتاج تثبيت واجهة)

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

> **الطبقة المجانية:** يعمل الخياران دون فوترة. تستخدم الواجهة الأصلية Google OAuth؛ ويستخدم سكربت API نموذج `gemini-3.6-flash` (حدود المعدل تعتمد على النموذج والطبقة؛ راجع وثائق Google AI للحصص الحالية).

## بوابات التوظيف المهيأة مسبقًا

يأتي الماسح مع **أكثر من 100 شركة** جاهزة للفحص و**أكثر من 35 استعلام بحث** عبر لوحات الوظائف الرئيسية. انسخ `templates/portals.example.yml` إلى `portals.yml` وأضف ما تريد:

**مختبرات الذكاء الاصطناعي:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**الذكاء الاصطناعي الصوتي:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**منصات الذكاء الاصطناعي:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**مراكز الاتصال:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**الشركات الكبرى:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**الأتمتة:** n8n, Zapier, Make.com
**أوروبا:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**لوحات الوظائف التي يتم البحث فيها:** أكثر من 55 وحدة مزوّد تغطي واجهات ATS البرمجية، وتغذيات اللوحات الكاملة، وتغذيات XML/RSS، وتغذيات markdown، ومحللات محلية. انظر [لوحات الوظائف المدعومة](docs/SUPPORTED_JOB_BOARDS.md) للجدول الكامل.

افتراضيًا، يثق `node scan.mjs` (أي `npm run scan`) بما تعيده كل تغذية ATS. بعض الشركات تترك إعلانات قديمة في واجهتها البرمجية العامة حتى بعد إغلاق الوظيفة، فقد تتسرب تلك الإدخالات المنتهية إلى `pipeline.md`. مرّر `--verify` لتشغيل Playwright بعد المرور بالواجهة البرمجية وإسقاط الإعلانات المنتهية قبل وصولها إلى خط العمل:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

التحقق متسلسل ويعمل فقط على العروض الجديدة (بعد إزالة التكرار)، لذا تبقى التكلفة محدودة.

## لوحة تحكم TUI

تتيح لك لوحة التحكم الطرفية المدمجة تصفح خط عملك بصريًا:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

الميزات: 10 تبويبات تصفية، 8 أوضاع ترتيب، عرض مجمّع/مسطّح، معاينات بتحميل كسول، تغيير الحالات في السطر.

توجد أيضًا **واجهة ويب تجريبية** (ألفا واختيارية: لا يعمل شيء ما لم تشغّلها بنفسك): انظر [`web/README.md`](web/README.md).

## هيكلية المشروع

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

## دليل البيانات الخارجي (اختياري)

افتراضيًا، تعيش بيانات طبقة المستخدم (مثل `cv.md` و`portals.yml` ومجلدات `data/` و`reports/` و`output/`) داخل مجلد جذر المشروع.

لفصل بياناتك الشخصية عن الكود (مما يسهّل تبديل الفروع أو سحب التحديثات أو اختبار عدة ملفات)، يمكنك تهيئة دليل بيانات خارجي وفق الأولوية التالية:

1. **متغيرات البيئة:** اضبط متغير البيئة `REBOUND_OPS_ROOT` أو `REBOUND_OPS_DATA_DIR`:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **ملف العلامة:** أنشئ ملف `.rebound-ops-data` في جذر المستودع يحتوي على مسار دليل بياناتك.
3. **الافتراضي:** جذر المستودع.

بعد تحديد المسار، تُحلّ جميع ملفات المستخدم وتُكتب نسبةً إلى ذلك المجلد، بينما تستمر ملفات الأوامر النصية والسكربتات في الحلّ نسبةً إلى المستودع.

- **تجاوز المتتبع:** يمكنك أيضًا ضبط `REBOUND_OPS_TRACKER` لتجاوز مسار ملف متتبع الطلبات مباشرة.
- **الكتابات:** جميع عمليات الكتابة (مثل الدمج) تستهدف قانونيًا `{DATA_ROOT}/data/applications.md`.
- **إعدادات الماسح:** يُقرأ `portals.yml` ويُتحقَّق منه في `{DATA_ROOT}/portals.yml`، لذا يفحص `node validate-portals.mjs` الملف نفسه الذي يقرؤه `scan.mjs`.
- **المستندات المولَّدة:** تُكتب السير الذاتية المخصّصة وخطابات التقديم داخل `{DATA_ROOT}/output/`، أما فهرس ملفات PDF الذي يربطها بتقرير فموجود في `{DATA_ROOT}/data/pdf-index.tsv`. وما دام `REBOUND_OPS_TRACKER` غير مضبوط، فإن مساحة عمل المتتبع التي تحصر هذه الكتابات هي جذر البيانات، لا نسخة المستودع.
- **ملفات PDF عند تجاوز المتتبع:** يحلّ `generate-pdf.mjs` قيمة `REBOUND_OPS_TRACKER` قبل أن يستنتج مساحة العمل، لذا عند ضبط التجاوز تكون مساحة العمل هي المجلد الذي يحتوي ذلك المتتبع (أو المجلد الذي فوقه، عندما يكون المتتبع داخل مجلد `data/`). وعندها يجب أن يقع ملف HTML الخاص بالسيرة الذاتية وكل ملفات PDF داخل مساحة العمل تلك، وينتقل الفهرس إلى `data/pdf-index.tsv` التابع لها. أما خطابات التقديم فتبقى وجهتها `{DATA_ROOT}/output/`، لذا تُرفض عندما يقع ذلك المجلد خارج مساحة عمل المتتبع.
- **طبقة الكود تبقى في مكانها:** تُحلّ `node_modules/` و`providers/` و`modes/` والسكربتات نفسها دائمًا نسبةً إلى المستودع، ولا تُحلّ أبدًا نسبةً إلى جذر البيانات.

تحترم لوحة تحكم Go الطرفية وسكربتات Node.js وأوضاع وكيل الذكاء الاصطناعي هذا التسلسل تلقائيًا.


## التقنيات المستخدمة

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **الوكيل**: واجهة سطر أوامر للبرمجة بالذكاء الاصطناعي مع مهارات وأوضاع مشتركة (`AGENTS.md` + غلاف لكل واجهة)
- **PDF**: Playwright + قالب HTML
- **خطابات التقديم**: قالب HTML + Playwright (PDF بحجم A4، خط العمل نفسه المستخدم للسير الذاتية)
- **الماسح**: Playwright + Greenhouse API + WebSearch
- **لوحة التحكم**: Go + Bubble Tea + Lipgloss (سمة Catppuccin Mocha)
- **البيانات**: جداول Markdown + إعدادات YAML + ملفات TSV للمعالجة الجماعية

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center" dir="rtl">
  <sub>يعمل أيضًا في أي واجهة CLI تلتزم بمعيار agent skills. انظر <a href="docs/SUPPORTED_CLIS.md">الواجهات المدعومة</a>.</sub><br>
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

## الأسئلة الشائعة (FAQ)

**ما هو rebound-ops؟**
ReboundOps maintains this engine inside the [monorepo](https://github.com/AnkitParekh007/rebound-ops). Engineering checks are not participant outcomes. See [provenance](../PROVENANCE.md). (Attribution note maintained in English.)

**هل يمكن للسيرة الذاتية المخصّصة أن تختلق أشياء؟**
لا يجوز لها، والأوامر النصية تقول ذلك: أعد الصياغة، ولا تختلق أبدًا. يمنع `generate-pdf` إنشاء سيرة ذاتية تتضمن أرقامًا أو حقائق غير موجودة في مصادرك، ما لم تمرّر `--skip-fact-check`. ويشغّل وضع `pdf` أيضًا `cv-title-check.mjs`، الذي يقارن كل مسمى وظيفي في السيرة الذاتية المخصّصة بالمسمى الذي يذكره cv.md للوظيفة نفسها (بمطابقة الشركة والتواريخ)، ويسألك هل تُبقي أي مسمى مختلف أم تعيده. وهو ينبّه ولا يمنع، لأن إعادة صياغة المسمى قد تكون قرارك أحيانًا. ولا شيء يحكم على إعادة الصياغة بعدُ: تتابع ذلك القضية [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (تحقق من الدقة يوقف العملية عند الاختلاف). حتى ذلك الحين، اقرأ كل سيرة ذاتية قبل إرسالها. [إخلاء المسؤولية القانوني](LEGAL_DISCLAIMER.md) يقول الشيء نفسه بكلمات أكثر.

**هل يمكنني تشغيل rebound-ops مجانًا، أو بنموذج أرخص أو محلي؟**
نعم. rebound-ops لا يعتمد على واجهة بعينها ويعمل على النماذج المجانية والمحلية (نماذج OpenRouter المجانية أو Ollama أو أي نقطة نهاية متوافقة مع OpenAI)، فلست مقيدًا باشتراك مدفوع. انظر [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) للإعداد الكامل.

**أدفع اشتراك Claude Pro/Max لكن rebound-ops يستهلك رصيد API. لماذا؟**
لأن وجود `ANTHROPIC_API_KEY` في بيئتك يتقدم على اشتراكك المسجّل دخوله: تستخدم الواجهة المفتاح وتُحاسِب لكل رمز. شغّل `echo $ANTHROPIC_API_KEY`، وإن طبع شيئًا فأزله من ملف تعريف الصدفة، ثم أعد تشغيل الطرفية وشغّل `/login`. وضع المعالجة الجماعية هو الاستثناء، لأن عمّال `claude -p` لا يستخدمون تسجيل الدخول التفاعلي: شغّل `claude setup-token` مرة واحدة وصدّر الناتج كـ `CLAUDE_CODE_OAUTH_TOKEN`. الشرح الكامل في [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it).

**مع أي واجهات ذكاء اصطناعي يعمل rebound-ops؟**
يعمل rebound-ops على أي واجهة رئيسية للبرمجة بالذكاء الاصطناعي (Claude Code و Codex و Gemini / Antigravity و OpenCode و Grok و Qwen وغيرها) عبر معيار Agent Skill Standard المفتوح، فلا يُقيَّد أبدًا بمزوّد واحد. استخدم الواجهة التي لديك بالفعل.

**كيف أثبّت rebound-ops على Windows؟**
يعمل rebound-ops على Windows. الإعداد الخاص بالمنصة والصعوبات المعروفة (اكتشاف Git Bash، ونهايات الأسطر، ومجدول المهام) في [docs/WINDOWS.md](docs/WINDOWS.md). إذا فشل تحميل المهارات بخطأ رابط رمزي أثناء التثبيت، فالحل في [docs/FAQ.md](docs/FAQ.md). الخطوات الكاملة في [docs/SETUP.md](docs/SETUP.md).

**هل يقدّم rebound-ops على الوظائف نيابةً عني؟**
لا. rebound-ops مرشِّح، لا أداة تقديم تلقائي عشوائي. الذكاء الاصطناعي يقيّم ويرتّب ويصيغ المسودات؛ وأنت تراجع وتقرر. يصوغ الإجابات ويملأ الحقول؛ ولا يقدّم الطلب أبدًا. أنت تضغط «إرسال». هذا التصميم الذي يُبقي الإنسان في الحلقة هو جوهر الفكرة.

**هل rebound-ops مجاني ومفتوح المصدر؟**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md). (Attribution note maintained in English.)

## إخلاء المسؤولية

**rebound-ops أداة محلية مفتوحة المصدر، وليست خدمة مستضافة.** باستخدامك لهذا البرنامج، فإنك تقر بما يلي:

1. **أنت تتحكم ببياناتك.** تبقى سيرتك الذاتية وبيانات الاتصال وبياناتك الشخصية على جهازك وتُرسل مباشرة إلى مزوّد الذكاء الاصطناعي الذي تختاره (Anthropic و OpenAI وغيرهما). نحن لا نجمع أيًا من بياناتك ولا نخزّنها ولا نطّلع عليها.
2. **أنت تتحكم بالذكاء الاصطناعي.** تأمر الأوامر النصية الافتراضية الذكاء الاصطناعي بعدم تقديم الطلبات تلقائيًا، لكن نماذج الذكاء الاصطناعي قد تتصرف بشكل غير متوقع. إذا عدّلت الأوامر النصية أو استخدمت نماذج مختلفة، فذلك على مسؤوليتك. **راجع دائمًا دقة المحتوى المولَّد بالذكاء الاصطناعي قبل الإرسال.**
3. **أنت تلتزم بشروط خدمة الأطراف الخارجية.** يجب أن تستخدم هذه الأداة وفق شروط خدمة بوابات التوظيف التي تتعامل معها (Greenhouse و Lever و Workday و LinkedIn وغيرها). لا تستخدم هذه الأداة لإرسال رسائل مزعجة إلى جهات التوظيف أو لإغراق أنظمة ATS.
4. **لا ضمانات.** التقييمات توصيات، لا حقائق. قد تختلق نماذج الذكاء الاصطناعي مهارات أو خبرات. لا يتحمل المؤلفون أي مسؤولية عن نتائج التوظيف أو الطلبات المرفوضة أو تقييد الحسابات أو أي تبعات أخرى.

انظر [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) للتفاصيل الكاملة. يُقدَّم هذا البرنامج بموجب [رخصة MIT](LICENSE) "كما هو"، دون أي ضمان من أي نوع.

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
