# ReboundOps engine

> Attribution: This engine is part of the [ReboundOps monorepo](https://github.com/AnkitParekh007/rebound-ops) (MIT). See [provenance](../PROVENANCE.md). This attribution note is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## rebound-ops 為你做什麼

貼上一個職缺。它告訴你這個晚上值不值得。

- **還在徵人嗎？** 在你寫下一個字之前，它先確認這則職缺仍然有效。
- **不是你？** 用你真實的履歷給職缺打分，匹配度弱就叫你跳過。你可以不聽。
- **值得投？** 它起草履歷、求職信和申請答案。你來讀。你來送。
- **該找誰聊？** 它找到那個人，起草那則訊息。它從不替你送出。
- **這些東西都去哪了？** 每一份申請都留在你的機器上。沒有任何東西上傳給我們。
- **我該學什麼？** 連續被拒之後，它說出差距在哪。

最初幾次執行會很粗糙。它還不了解你。跟它聊：你的履歷、你想要什麼、你拒絕什麼。把它當成一個招募顧問的第一週。

第一次啟動時，它會在聊天裡把這些都問一遍。沒有任何需要手動設定的東西。

## rebound-ops 不做的事

- **自動送出申請。** 它為每個欄位起草答案；你審閱，然後點擊送出。腳本從不發出 POST（`prepare-application.mjs`）。
- **寄送郵件。** 只寫草稿。整個程式碼庫裡沒有任何郵件寄送模組。
- **回傳資料。** 沒有遙測，沒有我們的後端。你的履歷只從你的機器送往你選擇的 AI 供應商，不去任何別的地方。唯一的公開紀錄就是這個儲存庫：`HIRED.md` 和它的 issue。
- **催你申請低於 4.0/5 的職缺。** 它會告訴你別申請。你可以不聽，它會明說。

它會改寫你的履歷，但絕不能捏造。程式碼裡有一道檢查：PDF 裡的數字或事實如果在你的履歷和 `article-digest.md` 裡都找不到，就會被擋下；但它還無法判斷每一處改寫。每份履歷送出前都請自己讀一遍。詳情見 [FAQ](#常見問題faq)。

## 功能特色

| 功能                     | 說明                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H 評估**             | 職缺摘要、履歷比對（標註每條要求在這個職缺裡有多重要，以及權重來自職缺描述的措辭、結構還是估算，逐條標註；估算永遠不能進入最高一級）、職級策略、薪酬調查、個人化、面試準備（STAR+R），再加上區塊 G 的職缺可信度檢查（是否仍在徵人、是否為重複刊登：只陳述觀察，不下定論），以及一個工作許可訊號（把明確不提供簽證擔保的職缺描述標記為硬性阻礙） |
| **Human-in-the-Loop**    | AI 評估並推薦，你決定並行動。系統從不送出申請：最終決定權永遠在你手上 <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS PDF 產生**         | ATS 可讀的履歷，根據你自己的經歷、針對每份職缺描述客製，採用 Space Grotesk + DM Sans 設計                                                  |
| **求職信產生器**         | 基於調查的求職信：關鍵字呼應、四個互動式角度提問（為什麼／問題／方法／語氣）、在對話中審核草稿，以及透過與履歷相同的 HTML + Playwright 流程產生 A4 PDF。每次評估自動起草；用 `/rebound-ops cover` 依需求完成並產生 |
| **履歷之外**             | 企業調查（[`deep`](modes/deep.md)）揭示 AI 策略、近期動向、工程文化，以及你的履歷應該採取的角度。聯絡人探索（[`contacto`](modes/contacto.md)）找出值得聯絡的招募主管、招募人員或團隊成員，並草擬一則不超過 300 字元、針對聯絡人類型調整過的 LinkedIn 訊息。正式申請郵件草稿（[`email`](modes/email.md)）把已評估的報告或貼上的職缺描述變成主旨、內文和附件清單，不寄送、不送出、不點擊任何內容。申請讓你排進隊伍，調查讓你獲得對話。 |
| **模式分析**             | 拒信模式與各 ATS 管道的推進率（`analyze-patterns.mjs`）、整個求職週期的漏斗統計（`stats.mjs`）、重複刊登偵測，重複刊登可能是幽靈職缺的跡象（`detect-reposts.mjs`） |

<details>
<summary><b>它還能做的所有事</b></summary>

| 功能                     | 說明                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **自動流程**             | 貼上一個 URL，獲得完整評估 + PDF + 追蹤紀錄                                                                                               |
| **面試故事庫**           | 跨評估累積 STAR+反思故事：5 到 10 個主故事，可以針對你遇到的行為面試問題靈活調整                                                                         |
| **談判話術**             | 薪資談判框架、應對地域折價、以競爭 offer 作為籌碼                                                                                         |
| **申請郵件草稿**         | 從報告或貼上的職缺描述產生給招募人員、內推或主動應徵的正式郵件，包含主旨、附件清單、有憑有據的契合點，以及來自你個人資料的聯絡資訊區塊。僅限草稿：rebound-ops 從不寄送、送出或點擊任何內容。 |
| **求職平台掃描器**       | 預先設定 100+ 家企業（Anthropic、OpenAI、ElevenLabs、Retool、n8n…）+ 跨 Ashby、Greenhouse、Lever、Wellfound 的自訂網頁搜尋查詢             |
| **已募資企業探索**       | 以審閱為先的 `company:funded` 指令從結構化的公開資料來源列出近期獲得募資的企業與來源診斷，不更動你的資料                                    |
| **批次處理**             | 用無頭 CLI worker（`claude -p` / `opencode run`）並行評估                                                                                  |
| **Dashboard TUI**        | 在終端機裡瀏覽、篩選和排序你的流程                                                                                                        |
| **流程完整性**           | 自動合併、去重、狀態正規化、健康檢查                                                                                                      |
| **面試套件**             | 按時間區塊安排的準備計畫、附回饋的練習、面試後檢討（[`interview/`](modes/interview/README.md)），以及企業警訊偵測器（[`interview-redflag`](modes/interview-redflag.md)） |
| **Offer 階段**           | 合約閱讀助手：逐條款解讀加上給律師的問題清單（[`offer-prep`](modes/offer-prep.md)），以及期望／公告／實際薪資差距分析器（`salary-gap.mjs`）   |
| **跟進與回覆**           | 跟進節奏計算器與預設提醒（`followup-cadence.mjs`、`followup-seed.mjs`）；把雇主回覆歸類為追蹤紀錄更新（[`reply-watch`](modes/reply-watch.md)） |
| **外掛系統**             | 可選整合（Gmail、Notion、Apify + 社群註冊表），預設關閉；見 [docs/PLUGINS.md](docs/PLUGINS.md)                                              |

</details>

## 快速開始

**最快的方式，一道指令：**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` 隨 [Node.js](https://nodejs.org) 一起提供：它只執行一次安裝程式，
> 不會全域安裝任何東西。還沒有 Node？先安裝它。
> （已經在用 Claude Code / Codex CLI？那你已經有了。）

這會把最新版本複製到 `./rebound-ops` 並安裝相依套件。然後：

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**首次啟動時，rebound-ops 會透過對話引導你完成設定（你的履歷、個人資料和目標職缺）。不需要手動編輯任何東西。**

<details>
<summary><b>想手動設定？（git clone）</b></summary>

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

### 全域安裝

```bash
npm i -g ./engine/scaffolder
```

這會全域安裝 `rebound-ops` 執行檔，讓你不用 `npx` 就能執行 `rebound-ops init [folder]`。`init` 是它唯一的指令：它只負責建立工作區，之後的一切都在你的 AI 程式碼 CLI 裡進行（見下方「使用方式」），而不是透過這個執行檔。

**該用哪一個？**
- `node engine/scaffolder/bin/cli.mjs init`：最適合首次使用；會建立一個專用的專案資料夾。
- `npm i -g ./engine/scaffolder`：如果你比較想輸入 `rebound-ops init`，而不是 `npx` 的寫法。它不會增加其他指令。

> **這個系統就是設計成由你的 AI 程式碼 CLI 自己來客製的。** 模式、原型、評分權重、談判話術：直接請它改就行。它讀取的正是它自己使用的檔案，所以它清楚該改哪裡。

完整安裝指南見 [docs/SETUP.md](docs/SETUP.md)；用自訂或本機模型低成本執行 rebound-ops 的方法見 [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md)（在 Antigravity CLI 免費方案零成本執行見 [docs/FREE_TIER.md](docs/FREE_TIER.md)）；排程定期掃描和零 token 的「初篩到短名單」作法見 [docs/AUTOMATION.md](docs/AUTOMATION.md)；ATS 自動填表流程的細節見 [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md)；把 LinkedIn 聯絡人匯出與漏斗中的企業交叉比對見 [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md)；常見設定問題的解答見 [docs/FAQ.md](docs/FAQ.md)，包括[故事溯源如何防止捏造數字](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank)。設計原則在 [ARCHITECTURE.md](ARCHITECTURE.md)；執行期流程在 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 使用方式

rebound-ops 使用共用的指令路由。在會註冊斜線指令的 CLI 裡，它看起來是這樣：

```
/rebound-ops           → 顯示所有可用指令
/rebound-ops {JD}      → 自動流程：評估 + 報告 + PDF + 追蹤紀錄（貼上文字或 URL）
/rebound-ops pipeline  → 處理收件匣裡待處理的 URL（data/pipeline.md）
/rebound-ops oferta    → 僅評估，區塊 A 到 H（不自動產生 PDF）
/rebound-ops ofertas   → 比較並排序多個職缺
/rebound-ops contacto  → LinkedIn 妙招：找到聯絡人 + 草擬訊息
/rebound-ops deep      → 針對企業的深度調查提示詞
/rebound-ops interview-prep → 產生針對特定企業的面試準備文件
/rebound-ops interview    → 互動式的個人資料／履歷入門訪談
/rebound-ops master-profile → 匯入、審閱並驗證你的主職涯檔案（Master Career Profile）
/rebound-ops eu-swe    → 在履歷／申請／面試前校準一份歐洲 SWE 申請
/rebound-ops interview/plan → 為即將到來的面試制定按時間區塊安排的準備計畫
/rebound-ops interview/practice → 模擬面試，一次一個問題並給出回饋
/rebound-ops interview/debrief → 面試後檢討：補上短板，預測下一輪
/rebound-ops interview-redflag → 入職前分析雇主的警訊
/rebound-ops pdf       → 僅產生 PDF，ATS 最佳化履歷
/rebound-ops text      → 客製的 markdown 履歷（鏡像 cv.md，不產生 PDF）
/rebound-ops latex     → 把履歷匯出為 LaTeX/Overleaf .tex
/rebound-ops latex-tex → 就地客製你自己的 resume.tex（選用；cv.md 仍是預設）
/rebound-ops cover     → 求職信：單獨貼上職缺描述，或 /rebound-ops cover {slug}
/rebound-ops email     → 正式申請郵件草稿（僅草稿；從不寄送、送出或點擊）
/rebound-ops add       → 向履歷新增專案／論文／職位（擷取 + 預覽 + 確認）
/rebound-ops expand    → 從個人資料連結自動探索並補充缺少的能力
/rebound-ops training  → 對照你的 North Star 評估課程／證照
/rebound-ops project   → 評估一個作品集專案點子
/rebound-ops tracker   → 申請狀態總覽
/rebound-ops agent-inbox → 為下一個工作階段排入／清空請求（data/agent-inbox.md）
/rebound-ops apply     → 即時申請助手（讀取表單 + 產生答案）
/rebound-ops scan      → 掃描求職平台並發現新職缺
/rebound-ops discover  → 把企業清單解析為可掃描的 ATS 看板 + 附加到 portals.yml（零 token）
/rebound-ops batch     → 用並行 worker 批次處理
/rebound-ops patterns  → 分析拒信模式並改善目標設定
/rebound-ops offer-prep → 和候選人一起閱讀收到的 offer／合約：逐條款解讀 + 給律師的問題（不是法律建議）
/rebound-ops titles    → 根據你的履歷推薦相近的職稱以擴大搜尋範圍
/rebound-ops upskill   → 基於已評估報告的綜合技能落差分析
/rebound-ops followup  → 跟進節奏追蹤：標記逾期，產生草稿
/rebound-ops reply-watch → 歸類雇主回覆並建議追蹤紀錄更新
/rebound-ops outcome   → 記錄申請結果並歸檔產出物
/rebound-ops calibrate → 諮詢性報告：你的評估分數能預測真實結果嗎？讀取 /outcome 資料；從不改變評分
/rebound-ops update    → 更新 rebound-ops 系統檔案，附 diff 預覽 + 相容性檢查
```

或者直接貼上一個職缺 URL 或描述：rebound-ops 會自動辨識並執行完整流程。

Codex 裡不保證有斜線指令。請改用同樣的模式名稱寫在提示詞裡，或透過 `codex exec` 呼叫。

## 運作原理

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity CLI 整合

rebound-ops 原生支援 Antigravity CLI，方式和支援 Claude Code、OpenCode 一樣。所有斜線指令都透過共用的 skill 進入點提供，使用相同的 `modes/*.md` 評估邏輯。

Google 已把消費者版 Gemini CLI 的存取遷移到 Antigravity CLI。`GEMINI.md` 現在是一個不做任何事的相容性守衛，這樣 Antigravity 在同時讀取 `AGENTS.md` 和 `GEMINI.md` 時不會重複載入完整的專案指令。

### 原生 Antigravity CLI

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

這個 skill 按開放標準定義在 `.agents/skills/rebound-ops/SKILL.md` 中，並為每個支援的 CLI（例如 `.claude/`、`.qwen/`、`.antigravitycli/`、`.grok/`）建立了符號連結或引用。 Cursor 會自動探索 `.agents/skills/` 中的共用 skill。

## Codex 整合

rebound-ops 透過同一個共用路由支援 Codex，但呼叫方式和自動註冊斜線指令的 CLI 不同。完整指南見 [docs/CODEX.md](docs/CODEX.md)。

### 互動式 Codex

```bash
cd rebound-ops
codex
```

Codex 裡不保證有斜線指令。如果 `/rebound-ops` 不可用，就用自然語言請 Codex 直接執行對應模式：

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### 單次執行的 Codex（`codex exec`）

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok Build CLI 整合

rebound-ops 原生支援 Grok Build CLI，方式和支援 Claude Code、OpenCode 一樣。`AGENTS.md` 會作為專案規則自動載入，所有斜線指令都透過共用的 skill 進入點提供。

### 原生 Grok Build CLI

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

無頭批次 worker 請使用 `grok -p "prompt"`（加上 `--yolo` 可自動核准工具執行）。

## Pi 整合

rebound-ops 原生支援 [Pi](https://github.com/earendil-works/pi)，不需要維護任何包裝檔案：Pi 會把儲存庫根目錄的 `AGENTS.md` 讀作專案脈絡，並自行找到位於 `.agents/skills/rebound-ops/SKILL.md` 的共用 skill。之後路由就能以 `/skill:rebound-ops` 的形式使用。

### 原生 Pi

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

### 單次執行的 Pi（`pi -p`）

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

如果某個 Pi 版本要求先對專案資源做信任確認，就在儲存庫裡執行一次 `/trust`，然後重新啟動 `pi`，讓專案 skill 載入（`/trust` 對之後啟動的 Pi 程序生效）；或者用 `-a` 啟動，它只信任單次執行，不需要重新啟動。

### 獨立的 Gemini API 腳本（無需安裝 CLI）

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

> **免費方案：** 兩種方式都無需付費。原生 CLI 使用 Google OAuth；API 腳本使用 `gemini-3.6-flash`（速率限制取決於模型和方案；目前配額見 Google AI 文件）。

## 預設掃描平台

掃描器內建 **100+ 家企業**可直接掃描，以及涵蓋主流求職網站的 **35+ 條搜尋查詢**。把 `templates/portals.example.yml` 複製為 `portals.yml`，再加入你自己的：

**AI 實驗室：** Anthropic、OpenAI、Mistral、Cohere、LangChain、Pinecone
**語音 AI：** ElevenLabs、PolyAI、Parloa、Hume AI、Deepgram、Vapi、Bland AI
**AI 平台：** Retool、Airtable、Vercel、Temporal、Glean、Arize AI
**客服中心：** Ada、LivePerson、Sierra、Decagon、Talkdesk、Genesys
**企業級：** Salesforce、Twilio、Gong、Dialpad
**LLMOps：** Langfuse、Weights & Biases、Lindy、Cognigy、Speechmatics
**自動化：** n8n、Zapier、Make.com
**歐洲：** Factorial、Attio、Tinybird、Clarity AI、Travelperk

**搜尋的求職網站：** 55+ 個供應商模組涵蓋 ATS API、整站資料來源、XML/RSS 來源、markdown 來源和本機解析器。完整表格見[支援的求職網站](docs/SUPPORTED_JOB_BOARDS.md)。

預設情況下 `node scan.mjs`（即 `npm run scan`）信任每個 ATS 資料來源回傳的內容。有些企業在職缺關閉後仍會把過期職缺留在公開 API 裡，這些過期項目可能會混進 `pipeline.md`。加上 `--verify` 可以在 API 階段之後啟動 Playwright，在過期職缺進入流程之前把它們剔除：

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

驗證是循序執行的，而且只針對新職缺（去重之後），所以成本是有上限的。

## 儀表板 TUI

內建的終端機儀表板讓你以視覺化方式瀏覽你的流程：

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

功能：10 個篩選分頁、8 種排序模式、分組／平鋪檢視、延遲載入預覽、行內狀態修改。

還有一個**實驗性的 Web UI**（alpha 版，選用：除非你主動啟動，否則不會執行任何東西）：見 [`web/README.md`](web/README.md)。

## 專案結構

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

## 外部資料目錄（選用）

預設情況下，使用者層資料（如 `cv.md`、`portals.yml`，以及 `data/`、`reports/`、`output/` 資料夾）位於專案根目錄內。

為了把個人資料和程式碼分開（更方便切換分支、拉取更新或測試多個個人資料），你可以按以下優先順序設定一個外部資料目錄：

1. **環境變數：** 設定 `REBOUND_OPS_ROOT` 或 `REBOUND_OPS_DATA_DIR` 環境變數：
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **標記檔案：** 在儲存庫根目錄建立一個 `.rebound-ops-data` 檔案，內容是你的資料目錄路徑。
3. **預設：** 使用儲存庫根目錄。

解析完成後，所有使用者檔案都相對於該資料夾解析和寫入，而提示詞檔案和腳本仍然相對於儲存庫解析。

- **覆寫追蹤檔：** 你也可以設定 `REBOUND_OPS_TRACKER` 直接覆寫申請追蹤檔的路徑。
- **寫入：** 所有寫入操作（如合併）都以 `{DATA_ROOT}/data/applications.md` 為標準目標。
- **掃描器設定：** `portals.yml` 在 `{DATA_ROOT}/portals.yml` 讀取和驗證，所以 `node validate-portals.mjs` 檢查的正是 `scan.mjs` 讀取的那個檔案。
- **產生的文件：** 客製履歷和求職信寫入 `{DATA_ROOT}/output/`，把它們連結到報告的 PDF 清單位於 `{DATA_ROOT}/data/pdf-index.tsv`。在未設定 `REBOUND_OPS_TRACKER` 時，限定這些寫入範圍的追蹤工作區是資料根目錄，而不是程式碼的 checkout。
- **追蹤檔覆寫下的 PDF：** `generate-pdf.mjs` 會先解析 `REBOUND_OPS_TRACKER`，再推導工作區，所以設定了覆寫時，工作區就是存放該追蹤檔的資料夾（如果追蹤檔位於 `data/` 資料夾中，則是它的上一層資料夾）。這時履歷的 HTML 和每個 PDF 都必須位於該工作區內，清單也會移到它的 `data/pdf-index.tsv`。求職信仍以 `{DATA_ROOT}/output/` 為目標，所以當該資料夾不在追蹤檔的工作區內時，求職信會被拒絕寫入。
- **程式碼層維持不動：** `node_modules/`、`providers/`、`modes/` 以及腳本本身一律相對於儲存庫解析，從不相對於資料根目錄。

Go 版儀表板 TUI、Node.js 腳本和 AI 代理模式都會自動遵循這個解析層級。


## 技術堆疊

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **代理**：具備共用 skill 和模式的 AI 程式碼 CLI（`AGENTS.md` + 各 CLI 的包裝）
- **PDF**：Playwright + HTML 範本
- **求職信**：HTML 範本 + Playwright（A4 PDF，與履歷相同的流程）
- **掃描器**：Playwright + Greenhouse API + WebSearch
- **儀表板**：Go + Bubble Tea + Lipgloss（Catppuccin Mocha 主題）
- **資料**：Markdown 表格 + YAML 設定 + TSV 批次檔案

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>也可以在任何遵循 agent skill 標準的 CLI 中執行。見<a href="docs/SUPPORTED_CLIS.md">支援的 CLI</a>。</sub><br>
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

## 常見問題（FAQ）

**rebound-ops 是什麼？**
ReboundOps maintains this engine inside the [monorepo](https://github.com/AnkitParekh007/rebound-ops). Engineering checks are not participant outcomes. See [provenance](../PROVENANCE.md). (Attribution note maintained in English.)

**客製化履歷會捏造內容嗎？**
不應該，提示詞裡也這麼寫：只改寫，絕不捏造。`generate-pdf` 會擋下數字或事實在你的資料來源中找不到的履歷，除非你傳入 `--skip-fact-check`。`pdf` 模式還會執行 `cv-title-check.mjs`：它依公司和日期，把客製化履歷中的每個職稱與 cv.md 中同一份工作的職稱比對，有不同就請你決定保留還是改回。它只提醒、不阻擋，因為調整職稱的寫法有時是你自己的選擇。目前還沒有任何檢查評判改寫：[#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411)（不通過即阻止的真實性檢查）在追蹤這一點。在此之前，每份履歷送出前都請自己讀一遍。[法律聲明](LEGAL_DISCLAIMER.md) 用更長的篇幅說了同樣的話。

**我可以免費執行 rebound-ops，或改用較便宜／本機的模型嗎？**
可以。rebound-ops 不綁定特定 CLI，也能跑在免費與本機模型上（OpenRouter 的免費模型、Ollama，或任何相容 OpenAI 的端點），所以你不必被付費訂閱綁住。完整設定見 [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md)。

**我已經付費訂閱 Claude Pro/Max，為什麼 rebound-ops 還在燒 API 額度？**
因為環境變數中的 `ANTHROPIC_API_KEY` 優先於你已登入的訂閱：CLI 會改用這把金鑰，並按 token 計費。執行 `echo $ANTHROPIC_API_KEY`，若有印出任何內容，就把它從 shell 設定檔移除、重開終端機並執行 `/login`。批次模式是例外，因為 `claude -p` 的 worker 不會使用互動式登入：執行一次 `claude setup-token`，把結果匯出為 `CLAUDE_CODE_OAUTH_TOKEN`。完整步驟見 [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it)。

**rebound-ops 支援哪些 AI CLI？**
rebound-ops 透過開放的 Agent Skill Standard 跑在各主流 AI 程式碼 CLI 上（Claude Code、Codex、Gemini / Antigravity、OpenCode、Grok、Qwen 等），因此不會被單一廠商綁死。你手上已經有的 CLI 就能直接用。

**要怎麼在 Windows 上安裝 rebound-ops？**
rebound-ops 可以在 Windows 上執行。平台相關的設定和已知的坑（Git Bash 偵測、行尾符號、工作排程器）在 [docs/WINDOWS.md](docs/WINDOWS.md)。如果安裝過程中技能因 symlink 錯誤而載入失敗，解法在 [docs/FAQ.md](docs/FAQ.md)。完整步驟見 [docs/SETUP.md](docs/SETUP.md)。

**rebound-ops 會自動幫我投遞職缺嗎？**
不會。rebound-ops 是篩選器，不是亂槍打鳥的自動投遞工具。AI 負責評估、排序與草擬；審閱與決定由你來做。它會草擬、填寫，但從不送出。由你按下送出。這種保留人工把關的設計，正是整套系統的重點。

**rebound-ops 是免費且開源的嗎？**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md). (Attribution note maintained in English.)

## 免責聲明

**rebound-ops 是一個在本機執行的開源工具，不是託管服務。** 使用本軟體即表示你確認：

1. **你掌控自己的資料。** 你的履歷、聯絡方式和個人資料留在你的機器上，直接傳送給你選擇的 AI 供應商（Anthropic、OpenAI 等）。我們不收集、不儲存、也無法存取你的任何資料。
2. **你掌控 AI。** 預設提示詞指示 AI 不要自動送出申請，但 AI 模型可能出現無法預測的行為。如果你修改了提示詞或使用其他模型，風險自負。**送出前務必檢查 AI 產生內容的正確性。**
3. **你遵守第三方條款。** 你必須按照所互動求職平台（Greenhouse、Lever、Workday、LinkedIn 等）的服務條款使用本工具。不要用本工具向雇主發送垃圾訊息或衝擊 ATS 系統。
4. **不作任何保證。** 評估是建議，不是事實。AI 模型可能虛構技能或經歷。作者不對就業結果、被拒的申請、帳號限制或任何其他後果負責。

完整內容見 [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md)。本軟體依據 [MIT 授權](LICENSE)「按原樣」提供，不附帶任何形式的保證。

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
