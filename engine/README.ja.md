# ReboundOps engine

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## rebound-ops があなたにしてくれること

求人を貼り付ける。その夜を使う価値があるかを教えてくれる。

- **まだ募集中？** 一文字も書く前に、その求人がまだ掲載されているかを確認する。
- **あなた向きではない？** あなたの本当の履歴書に照らして求人を採点し、合わなければ見送れと言う。無視することもできる。
- **応募する価値がある？** 履歴書、カバーレター、回答の下書きを作る。読むのはあなた。送るのもあなた。
- **誰に話せばいい？** その人を見つけ、メッセージの下書きを作る。送ることは決してない。
- **データはどこへ行く？** すべての応募はあなたのマシンに残る。私たちのところには何もアップロードされない。
- **何を学ぶべき？** 不採用が続いた後に、足りないものを名指しする。

最初の数回は粗い。まだあなたを知らないから。話しかけてほしい：あなたの履歴書、望むこと、断ること。リクルーターの最初の一週間だと思ってほしい。

初回起動時に、それらすべてをチャットで尋ねる。手で設定するものは何もない。

## rebound-ops がやらないこと

- **応募を自動で送信すること。** すべての項目の回答の下書きは作る。確認して送信ボタンを押すのはあなた。スクリプトは決して POST しない（`prepare-application.mjs`）。
- **メールを送る。** 下書きのみ。このコードベースにメール送信の仕組みはどこにもありません。
- **外部に送信する。** テレメトリなし、こちらのバックエンドなし。あなたの履歴書は、あなたのマシンから自分で選んだ AI プロバイダーへ行くだけで、他のどこにも行きません。唯一の公開台帳はこのリポジトリ、`HIRED.md` とその issue です。
- **4.0/5 未満の求人に応募させる。** 応募しないよう伝えます。無視することはできますが、その旨を伝えます。

履歴書を言い換えることはあっても、でっち上げることは決してあってはならない。あなたの履歴書にも `article-digest.md` にもない数字や事実を含む PDF はコードのチェックで止まりますが、言い換えの一つひとつまではまだ判断できません。送る前にすべての履歴書を読んでください。詳細は [FAQ](#faq) に。

## 機能

| 機能                     | 説明                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A-H 評価**             | 職務サマリー、CV との適合（この求人で各要件がどれだけ重要か、その重みが求人票の文言・構造・推定のどれに由来するかを要件ごとにラベル付け。推定は決して最上位帯にならない）、レベル戦略、報酬リサーチ、パーソナライズ、面接準備（STAR+R）、さらにブロック G の求人の正当性チェック（まだ募集中か、再掲載か：判定ではなく観察）と、ビザスポンサーなしを明記した求人票を絶対的なブロッカーとして示す就労許可シグナル |
| **Human-in-the-Loop**    | AI が評価して推薦し、あなたが決めて行動する。システムが応募を送信することは決してありません。最終判断は常にあなたのものです <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS 向け PDF 生成**    | あなた自身の経験をもとに求人票ごとに調整した、ATS が読み取れる CV（Space Grotesk + DM Sans のデザイン）                                     |
| **カバーレター生成**     | リサーチに基づくカバーレター。キーワードの反映、4 つの対話式の切り口（理由／課題／アプローチ／トーン）、チャット内での下書き承認、CV と同じ HTML + Playwright パイプラインによる A4 PDF。評価のたびに自動で下書きし、`/rebound-ops cover` で必要なときに仕上げて生成 |
| **CV の先へ**            | 企業調査（[`deep`](modes/deep.md)）は AI 戦略、最近の動き、エンジニアリング文化、あなたのプロフィールが取るべき角度を明らかにします。連絡先の発見（[`contacto`](modes/contacto.md)）は、連絡する価値のある採用責任者・リクルーター・チームメンバーを特定し、相手のタイプに合わせた 300 文字以内の LinkedIn メッセージを下書きします。正式な応募メールの下書き（[`email`](modes/email.md)）は、評価済みレポートや貼り付けた求人票を件名・本文・添付チェックリストに変えます。何も送信・提出・クリックしません。応募はあなたを列に並ばせる。調査は会話を生む。 |
| **パターン分析**         | 不採用パターンと ATS チャネル別の通過率（`analyze-patterns.mjs`）、求職全体のファネル統計（`stats.mjs`）、ゴーストジョブの兆候かもしれない再掲載の検出（`detect-reposts.mjs`） |

<details>
<summary><b>その他にできること</b></summary>

| 機能                     | 説明                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **自動パイプライン**     | URL を貼るだけで、完全な評価 + PDF + トラッカー登録                                                                                       |
| **面接ストーリーバンク** | 評価をまたいで STAR+Reflection のストーリーを蓄積：実際に受ける行動面接の質問に合わせて調整できる 5〜10 本のマスターストーリー                            |
| **交渉スクリプト**       | 給与交渉のフレームワーク、地域差による減額への反論、競合オファーの活用                                                                     |
| **応募メールの下書き**   | レポートまたは貼り付けた求人票から、リクルーター向け・紹介向け・コールド応募向けの正式なメールを作成。件名、添付チェックリスト、根拠付きの適合ポイント、プロフィール由来の連絡先ブロック付き。下書きのみ：rebound-ops は決して送信・提出・クリックしません。 |
| **ポータルスキャナー**   | 100 社以上を事前設定（Anthropic、OpenAI、ElevenLabs、Retool、n8n…）+ Ashby、Greenhouse、Lever、Wellfound を横断するカスタム Web 検索クエリ |
| **資金調達企業の発見**   | レビュー優先の `company:funded` コマンドが、構造化された公開フィードから最近資金調達した企業とソース診断を表示。あなたのデータは編集しません |
| **バッチ処理**           | ヘッドレス CLI ワーカー（`claude -p` / `opencode run`）による並列評価                                                                     |
| **ダッシュボード TUI**   | パイプラインを閲覧・フィルタ・ソートするターミナル UI                                                                                     |
| **パイプラインの整合性** | 自動マージ、重複排除、ステータス正規化、ヘルスチェック                                                                                     |
| **面接スイート**         | 時間割型の準備プラン、フィードバック付きの練習セッション、面接後の振り返り（[`interview/`](modes/interview/README.md)）、企業の危険信号検出（[`interview-redflag`](modes/interview-redflag.md)） |
| **オファー段階**         | 契約書の読み合わせ：条項ごとの確認と弁護士への質問リスト（[`offer-prep`](modes/offer-prep.md)）、希望／提示／実際の給与ギャップ分析（`salary-gap.mjs`） |
| **フォローアップと返信** | フォローアップ間隔の計算と事前設定のリマインダー（`followup-cadence.mjs`、`followup-seed.mjs`）。雇用主からの返信をトラッカー更新に分類（[`reply-watch`](modes/reply-watch.md)） |
| **プラグインシステム**   | オプトインの連携（Gmail、Notion、Apify + コミュニティレジストリ）、デフォルトでは無効。[docs/PLUGINS.md](docs/PLUGINS.md) を参照            |

</details>

## クイックスタート

**いちばん速い方法、コマンド 1 つで：**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx` は [Node.js](https://nodejs.org) に同梱されています：グローバルに何もインストールせず、
> インストーラーを 1 回だけ実行します。Node がまだ？ 先にインストールしてください。
> （すでに Claude Code / Codex の CLI を使っている？ ならもう入っています。）

これで最新リリースが `./rebound-ops` にクローンされ、依存関係がインストールされます。次に：

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**初回起動時、rebound-ops は会話だけでセットアップ（CV、プロフィール、目標とする職種）を案内します。手で編集するものはありません。**

<details>
<summary><b>手動でセットアップしたい？（git clone）</b></summary>

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

### グローバルインストール

```bash
npm i -g ./engine/scaffolder
```

これで `rebound-ops` バイナリがグローバルにインストールされ、`npx` なしで `rebound-ops init [folder]` を実行できます。`init` が唯一のコマンドです。ワークスペースを用意するだけで、その後の作業はすべてこのバイナリではなく AI コーディング CLI の中で行います（下の「使い方」を参照）。

**どちらを使うべき？**
- `node engine/scaffolder/bin/cli.mjs init`：初回利用に最適。専用のプロジェクトフォルダを作ります。
- `npm i -g ./engine/scaffolder`：`npx` 形式より `rebound-ops init` と打ちたい場合に。ほかのコマンドは増えません。

> **このシステムは、あなたの AI コーディング CLI 自身がカスタマイズするように設計されています。** モード、アーキタイプ、スコアの重み、交渉スクリプト：変えてほしいと頼むだけです。CLI は自分が使っているファイルをそのまま読むので、何を編集すべきか正確に分かっています。

完全なセットアップガイドは [docs/SETUP.md](docs/SETUP.md)、カスタムモデルやローカルモデルで rebound-ops を安く動かす方法は [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md)（Antigravity CLI の無料枠でコストゼロで動かす方法は [docs/FREE_TIER.md](docs/FREE_TIER.md)）、定期スキャンのスケジュールとトークンを使わない選別からショートリストまでのレシピは [docs/AUTOMATION.md](docs/AUTOMATION.md)、ATS 自動入力フローの詳細は [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md)、LinkedIn のつながりエクスポートをファネル内の企業と突き合わせる方法は [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md)、よくあるセットアップの質問への回答は [docs/FAQ.md](docs/FAQ.md) を参照してください（[ストーリーの出所管理がでっち上げの数字を防ぐ仕組み](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank)も含みます）。設計原則は [ARCHITECTURE.md](ARCHITECTURE.md) に、実行時のフローは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) にあります。

## 使い方

rebound-ops は共有のコマンドルーターを使います。スラッシュコマンドを登録する CLI では、次のように見えます：

```
/rebound-ops           → 利用できるコマンドをすべて表示
/rebound-ops {JD}      → 自動パイプライン：評価 + レポート + PDF + トラッカー（テキストまたは URL を貼り付け）
/rebound-ops pipeline  → 受信箱の未処理 URL を処理（data/pipeline.md）
/rebound-ops oferta    → 評価のみ、ブロック A〜H（自動 PDF なし）
/rebound-ops ofertas   → 複数の求人を比較してランク付け
/rebound-ops contacto  → LinkedIn の一手：連絡先を探してメッセージを下書き
/rebound-ops deep      → 企業についての詳細リサーチ用プロンプト
/rebound-ops interview-prep → 企業別の面接準備ドキュメントを生成
/rebound-ops interview    → 対話形式のプロフィール／CV オンボーディング面談
/rebound-ops master-profile → マスターキャリアプロフィールをインポート・確認・検証
/rebound-ops eu-swe    → CV・応募・面接の前に欧州向け SWE 応募を調整
/rebound-ops interview/plan → 今後の面接に向けた時間割型の準備プラン
/rebound-ops interview/practice → 練習面接、フィードバック付きで 1 問ずつ
/rebound-ops interview/debrief → 面接後の振り返り：ギャップを埋め、次のラウンドを予測
/rebound-ops interview-redflag → 入社前に雇用主の警告サインを分析
/rebound-ops pdf       → PDF のみ、ATS 最適化 CV
/rebound-ops text      → 調整済みマークダウン CV（cv.md を反映、PDF なし）
/rebound-ops latex     → CV を LaTeX/Overleaf の .tex にエクスポート
/rebound-ops latex-tex → 自分の resume.tex をその場で調整（オプトイン。cv.md がデフォルトのまま）
/rebound-ops cover     → カバーレター：求人票の単独貼り付け、または /rebound-ops cover {slug}
/rebound-ops email     → 正式な応募メールの下書き（下書きのみ。送信・提出・クリックは決してしない）
/rebound-ops add       → プロジェクト／論文／職務を CV に追加（取得 + プレビュー + 確認）
/rebound-ops expand    → プロフィールのリンクから不足しているコンピテンシーを自動発見して追加
/rebound-ops training  → コースや資格をノーススターに照らして評価
/rebound-ops project   → ポートフォリオ用プロジェクト案を評価
/rebound-ops tracker   → 応募状況の概要
/rebound-ops agent-inbox → 次のセッション向けのリクエストをキューに追加／消化（data/agent-inbox.md）
/rebound-ops apply     → ライブ応募アシスタント（フォームを読み取り、回答を生成）
/rebound-ops scan      → ポータルをスキャンして新しい求人を発見
/rebound-ops discover  → 企業リストをスキャン可能な ATS ボードに解決し、portals.yml に追記（トークン消費なし）
/rebound-ops batch     → 並列ワーカーによるバッチ処理
/rebound-ops patterns  → 不採用パターンを分析してターゲティングを改善
/rebound-ops offer-prep → 受け取ったオファー／契約書を候補者と一緒に読む：条項の確認 + 弁護士への質問（法的助言ではありません）
/rebound-ops titles    → 検索範囲を広げるため CV から隣接する職種名を提案
/rebound-ops upskill   → 評価済みレポートからスキルギャップを集計して分析
/rebound-ops followup  → フォローアップ間隔のトラッカー：期限超過を表示し、下書きを生成
/rebound-ops reply-watch → 雇用主からの返信を分類し、トラッカーの更新を提案
/rebound-ops outcome   → 応募結果を記録し、成果物をアーカイブ
/rebound-ops calibrate → 参考レポート：あなたの評価スコアは実際の結果を予測しているか？ /outcome のデータを読み、スコアリングは決して変えない
/rebound-ops update    → diff プレビュー + 互換性チェック付きで rebound-ops のシステムファイルを更新
```

あるいは求人の URL や説明文をそのまま貼るだけでも構いません。rebound-ops が自動検出して完全なパイプラインを実行します。

Codex ではスラッシュコマンドは保証されません。代わりにプロンプトで同じモード名を使うか、`codex exec` から呼び出してください。

## 仕組み

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity CLI 連携

rebound-ops は Claude Code や OpenCode と同じように、Antigravity CLI をネイティブにサポートしています。すべてのスラッシュコマンドは共有スキルのエントリポイント経由で使え、同じ `modes/*.md` の評価ロジックを使います。

Google は一般ユーザー向けの Gemini CLI アクセスを Antigravity CLI に移行しました。`GEMINI.md` は今では何もしない互換性ガードで、Antigravity が `AGENTS.md` と `GEMINI.md` の両方を読んだときにプロジェクトの指示を二重に読み込まないようにしています。

### ネイティブ Antigravity CLI

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

スキルはオープン標準に従って `.agents/skills/rebound-ops/SKILL.md` に定義され、サポートされる各 CLI（例：`.claude/`、`.qwen/`、`.antigravitycli/`、`.grok/`）にシンボリックリンクまたは参照されています。 Cursor は `.agents/skills/` 内の共有スキルを自動的に検出します。

## Codex 連携

rebound-ops は同じ共有ルーター経由で Codex をサポートしますが、スラッシュコマンドを自動登録する CLI とは呼び出し方が異なります。完全なガイドは [docs/CODEX.md](docs/CODEX.md) を参照してください。

### 対話型 Codex

```bash
cd rebound-ops
codex
```

Codex ではスラッシュコマンドは保証されません。`/rebound-ops` が使えない場合は、Codex に自然言語でモードを直接実行するよう頼んでください：

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### ワンショット Codex（`codex exec`）

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok Build CLI 連携

rebound-ops は Claude Code や OpenCode と同じように、Grok Build CLI をネイティブにサポートしています。`AGENTS.md` がプロジェクトルールとして自動読み込みされ、すべてのスラッシュコマンドは共有スキルのエントリポイント経由で使えます。

### ネイティブ Grok Build CLI

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

ヘッドレスのバッチワーカーには `grok -p "prompt"` を使います（ツール実行を自動承認するには `--yolo` を追加）。

## Pi 連携

rebound-ops は [Pi](https://github.com/earendil-works/pi) をネイティブにサポートしており、メンテナンスの必要なラッパーファイルはありません：Pi はリポジトリのルートにある `AGENTS.md` をプロジェクトのコンテキストとして読み込み、`.agents/skills/rebound-ops/SKILL.md` の共有スキルを自分で見つけます。ルーターは `/skill:rebound-ops` として使えます。

### ネイティブ Pi

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

### ワンショット Pi（`pi -p`）

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Pi のビルドがプロジェクトのリソースを使う前に信頼の確認を求める場合は、リポジトリ内で一度 `/trust` を実行してから `pi` を再起動し、プロジェクトのスキルを読み込ませてください（`/trust` は以降の Pi プロセスに適用されます）。あるいは `-a` を付けて起動すれば、その 1 回の実行だけを信頼するので再起動は不要です。

### スタンドアロン Gemini API スクリプト（CLI のインストール不要）

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

> **無料枠：** どちらの方法も課金なしで動きます。ネイティブ CLI は Google OAuth を使い、API スクリプトは `gemini-3.6-flash` を使います（レート制限はモデルと階層によって異なります。現在の割り当ては Google AI のドキュメントを参照してください）。

## 事前設定済みポータル

スキャナーには、すぐにスキャンできる **100 社以上**と、主要な求人サイトを横断する **35 件以上の検索クエリ**が付属しています。`templates/portals.example.yml` を `portals.yml` にコピーして、自分の分を追加してください：

**AI ラボ：** Anthropic、OpenAI、Mistral、Cohere、LangChain、Pinecone
**音声 AI：** ElevenLabs、PolyAI、Parloa、Hume AI、Deepgram、Vapi、Bland AI
**AI プラットフォーム：** Retool、Airtable、Vercel、Temporal、Glean、Arize AI
**コンタクトセンター：** Ada、LivePerson、Sierra、Decagon、Talkdesk、Genesys
**エンタープライズ：** Salesforce、Twilio、Gong、Dialpad
**LLMOps：** Langfuse、Weights & Biases、Lindy、Cognigy、Speechmatics
**自動化：** n8n、Zapier、Make.com
**欧州：** Factorial、Attio、Tinybird、Clarity AI、Travelperk

**検索対象の求人サイト：** 55 以上のプロバイダーモジュールが、ATS の API、サイト全体のフィード、XML/RSS フィード、マークダウンフィード、ローカルパーサーをカバーします。完全な一覧は[対応求人サイト](docs/SUPPORTED_JOB_BOARDS.md)を参照してください。

デフォルトでは `node scan.mjs`（別名 `npm run scan`）は各 ATS フィードが返す内容を信頼します。一部の企業は募集終了後も公開 API に古い求人を残すため、期限切れの項目が `pipeline.md` に紛れ込むことがあります。`--verify` を付けると、API のパスの後に Playwright を起動し、期限切れの求人がパイプラインに入る前に除外します：

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

検証は逐次的で、（重複排除後の）新しい求人に対してのみ実行されるため、コストは限定的です。

## ダッシュボード TUI

内蔵のターミナルダッシュボードで、パイプラインを視覚的に閲覧できます：

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

機能：10 個のフィルタータブ、8 種類のソートモード、グループ表示／フラット表示、遅延読み込みのプレビュー、インラインでのステータス変更。

**実験的な Web UI** もあります（アルファ版かつオプトイン：自分で起動しない限り何も動きません）：[`web/README.md`](web/README.md) を参照してください。

## プロジェクト構成

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

## 外部データディレクトリ（任意）

デフォルトでは、ユーザー層のデータ（`cv.md`、`portals.yml`、`data/`・`reports/`・`output/` フォルダなど）はプロジェクトのルートフォルダ内にあります。

個人データをコードから分離するには（ブランチの切り替え、更新の取り込み、複数プロフィールのテストが楽になります）、次の優先順位で外部データディレクトリを設定できます：

1. **環境変数：** `REBOUND_OPS_ROOT` または `REBOUND_OPS_DATA_DIR` を設定します：
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **マーカーファイル：** リポジトリのルートに、データディレクトリのパスを書いた `.rebound-ops-data` ファイルを作ります。
3. **デフォルト：** リポジトリのルートになります。

解決されると、すべてのユーザーファイルはそのフォルダを基準に解決・書き込みされ、プロンプトファイルとスクリプトは引き続きリポジトリを基準に解決されます。

- **トラッカーの上書き：** `REBOUND_OPS_TRACKER` を設定して、応募トラッカーファイルのパスを直接上書きすることもできます。
- **書き込み：** すべての書き込み操作（マージなど）は正規に `{DATA_ROOT}/data/applications.md` を対象とします。
- **スキャナーの設定：** `portals.yml` は `{DATA_ROOT}/portals.yml` で読み込まれ検証されるので、`node validate-portals.mjs` は `scan.mjs` が読むのと同じファイルをチェックします。
- **生成されるドキュメント：** 調整済みの CV とカバーレターは `{DATA_ROOT}/output/` の下に書き込まれ、それらをレポートに結び付ける PDF マニフェストは `{DATA_ROOT}/data/pdf-index.tsv` にあります。`REBOUND_OPS_TRACKER` が未設定の間は、これらの書き込み先を限定するトラッカーのワークスペースはデータルートであり、チェックアウトではありません。
- **トラッカー上書き時の PDF：** `generate-pdf.mjs` はワークスペースを決める前に `REBOUND_OPS_TRACKER` を解決します。そのため上書きが設定されていると、ワークスペースはそのトラッカーを含むフォルダ（トラッカーが `data/` フォルダにある場合はその一つ上のフォルダ）になります。このとき CV の HTML とすべての PDF はそのワークスペース内に置く必要があり、マニフェストはその `data/pdf-index.tsv` に移ります。カバーレターは引き続き `{DATA_ROOT}/output/` を対象とするため、そのフォルダがトラッカーのワークスペースの外にある場合は拒否されます。
- **コード層は動かない：** `node_modules/`、`providers/`、`modes/`、そしてスクリプト自体は常にリポジトリを基準に解決され、データルートを基準にすることはありません。

Go のダッシュボード TUI、Node.js スクリプト、AI エージェントモードのすべてが、この解決の階層を自動的に尊重します。


## 技術スタック

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **エージェント**：共有スキルとモードを備えた AI コーディング CLI（`AGENTS.md` + CLI ごとのラッパー）
- **PDF**：Playwright + HTML テンプレート
- **カバーレター**：HTML テンプレート + Playwright（A4 PDF、CV と同じパイプライン）
- **スキャナー**：Playwright + Greenhouse API + WebSearch
- **ダッシュボード**：Go + Bubble Tea + Lipgloss（Catppuccin Mocha テーマ）
- **データ**：Markdown テーブル + YAML 設定 + TSV バッチファイル

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>エージェントスキル標準に対応した CLI なら、どれでも動く。<a href="docs/SUPPORTED_CLIS.md">対応 CLI</a> を参照。</sub><br>
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

**rebound-ops とは何ですか？**
rebound-ops（[github.com/AnkitParekh007/rebound-ops](https://github.com/AnkitParekh007/rebound-ops)、別名 **reboundops**） は、あなたの AI コーディング CLI（Claude Code、Codex、OpenCode など）の中でローカルで動くオープンソースの AI 求職ツールで、すべての判断をあなたに委ねます。求人を CV と照らして評価し、ATS 向けに調整した PDF を生成し、連絡すべき相手を見つけ、すべてを一か所で追跡します：最終判断は常にあなたのものです。[ReboundOps マニフェスト](https://github.com/AnkitParekh007/rebound-ops)の最初のリファレンス実装です。

**カスタマイズされた履歴書が事実をでっち上げることはありますか？**
あってはならず、プロンプトにもそう書いてあります：言い換えはしても、でっち上げはしない。`generate-pdf` は、あなたの情報源にない数字や事実を含む CV をブロックします（`--skip-fact-check` を渡した場合を除く）。`pdf` モードは `cv-title-check.mjs` も実行します。これはカスタマイズした CV の各職名を、cv.md に書かれた同じ職歴（会社と期間で照合）の職名と比べ、違いがあれば残すか元に戻すかをあなたに確認します。職名の言い回しを変えるのはあなたの判断であることもあるため、警告するだけでブロックはしません。言い換えの判断はまだ何もしません：[#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411)（不一致なら止める忠実性チェック）がそれを追跡しています。それまでは、送る前にすべての履歴書を読んでください。[免責事項](LEGAL_DISCLAIMER.md) にも同じことがより長く書いてあります。

**rebound-ops を無料で、あるいはより安価なモデルやローカルモデルで動かせますか？**
はい。rebound-ops は CLI に依存せず、無料モデルやローカルモデル（OpenRouter の無料モデル、Ollama、または OpenAI 互換のエンドポイント）で動くので、有料サブスクリプションに縛られません。完全なセットアップは [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md) を参照してください。

**Claude Pro/Max に課金しているのに、rebound-ops が API クレジットを消費しています。なぜ？**
環境変数の `ANTHROPIC_API_KEY` がログイン済みのサブスクリプションより優先されるからです：CLI はそのキーを使い、トークン単位で課金されます。`echo $ANTHROPIC_API_KEY` を実行して何か表示されたら、シェルのプロファイルから削除し、ターミナルを再起動して `/login` を実行してください。バッチモードは例外で、`claude -p` のワーカーは対話型ログインを使いません：`claude setup-token` を 1 回実行し、その結果を `CLAUDE_CODE_OAUTH_TOKEN` としてエクスポートしてください。完全な手順は [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it) にあります。

**rebound-ops はどの AI CLI で動きますか？**
rebound-ops はオープンな Agent Skill Standard を通じて、主要な AI コーディング CLI（Claude Code、Codex、Gemini / Antigravity、OpenCode、Grok、Qwen など）のどれでも動くので、特定のベンダーにロックされることはありません。すでに持っている CLI を使ってください。

**Windows にはどうインストールしますか？**
rebound-ops は Windows で動きます。プラットフォーム固有のセットアップと既知の落とし穴（Git Bash の検出、改行コード、タスクスケジューラ）は [docs/WINDOWS.md](docs/WINDOWS.md) にあります。インストール中にシンボリックリンクのエラーでスキルが読み込めない場合、対処法は [docs/FAQ.md](docs/FAQ.md) にあります。完全な手順は [docs/SETUP.md](docs/SETUP.md) を参照してください。

**rebound-ops は私の代わりに自動で応募しますか？**
いいえ。rebound-ops はフィルターであって、数を撃つ自動応募ツールではありません。AI が評価し、順位を付け、下書きを作り、あなたが確認して決めます。下書きも入力もしますが、送信は決してしません。送信ボタンを押すのはあなたです。この Human-in-the-Loop の設計こそが核心です。

**rebound-ops は無料でオープンソースですか？**
はい。rebound-ops は無料でオープンソースであり、候補者にとってはこれからもずっとそうです。これは [ReboundOps マニフェスト](https://github.com/AnkitParekh007/rebound-ops)の最初のリファレンス実装です。読んで、あなたの信じることが書いてあるなら、署名してください。

## 免責事項

**rebound-ops はローカルで動くオープンソースのツールであり、ホスティングサービスではありません。** このソフトウェアを使用することで、次の点に同意したものとみなされます：

1. **データはあなたが管理します。** CV、連絡先、個人データはあなたのマシンに留まり、あなたが選んだ AI プロバイダー（Anthropic、OpenAI など）に直接送られます。私たちはあなたのデータを収集・保存・閲覧しません。
2. **AI はあなたが管理します。** デフォルトのプロンプトは AI に応募を自動送信しないよう指示していますが、AI モデルは予測不能な振る舞いをすることがあります。プロンプトを変更したり別のモデルを使ったりする場合は自己責任です。**送信前に、AI が生成した内容の正確さを必ず確認してください。**
3. **第三者の利用規約はあなたが遵守します。** 利用する求人ポータル（Greenhouse、Lever、Workday、LinkedIn など）の利用規約に従ってこのツールを使う必要があります。雇用主にスパムを送ったり、ATS に過剰な負荷をかけたりする目的で使わないでください。
4. **保証はありません。** 評価は推奨であって真実ではありません。AI モデルはスキルや経験を捏造することがあります。作者は、採用結果、不採用、アカウント制限、その他いかなる結果についても責任を負いません。

詳細は [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) を参照してください。このソフトウェアは [MIT ライセンス](LICENSE)のもと「現状のまま」、いかなる保証もなく提供されます。

## License

MIT — see [LICENSE](LICENSE). This folder is derived from third-party MIT-licensed software; the original notices are reproduced in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
