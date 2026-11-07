# ReboundOps engine

> Attribution: This engine is part of the [ReboundOps monorepo](https://github.com/AnkitParekh007/rebound-ops) (MIT). See [provenance](../PROVENANCE.md). This attribution note is maintained in English.

The job-search data folder and command-line scripts behind the **ReboundOps Workspace** (`../workspace`), part of the [rebound-ops](https://github.com/AnkitParekh007/rebound-ops) monorepo. Start the integrated demo from the repository root with `scripts/start-demo.sh`.

## rebound-ops가 당신을 위해 하는 일

공고를 붙여 넣으세요. 그 밤을 쓸 가치가 있는지 알려줍니다.

- **아직 모집 중인가?** 한 글자를 쓰기 전에 공고가 아직 게시되어 있는지 확인합니다.
- **당신이 아니라면?** 실제 이력서에 대고 직무를 점수 매기고, 맞지 않으면 건너뛰라고 말합니다. 무시할 수도 있습니다.
- **해 볼 만하다면?** 이력서, 자기소개서, 답변의 초안을 씁니다. 당신이 읽습니다. 당신이 보냅니다.
- **누구에게 말해야 하나?** 그 사람을 찾고 메모 초안을 씁니다. 보내는 일은 절대 하지 않습니다.
- **이 모든 게 어디로 가나?** 모든 지원서는 당신의 컴퓨터에 남습니다. 우리에게 업로드되는 것은 없습니다.
- **무엇을 배워야 하나?** 거절이 이어진 뒤, 부족한 부분을 짚어 줍니다.

처음 몇 번은 거칩니다. 아직 당신을 모르니까요. 말해 주세요: 당신의 이력서, 원하는 것, 거절하는 것. 리크루터의 첫 주라고 생각하세요.

첫 실행 때 그 모든 것을 채팅으로 묻습니다. 손으로 설정할 것은 없습니다.

## rebound-ops가 하지 않는 일

- **지원서를 자동으로 제출하기.** 모든 항목의 답변 초안을 씁니다. 검토하고 제출 버튼을 누르는 것은 당신입니다. 스크립트는 절대 POST를 보내지 않습니다 (`prepare-application.mjs`).
- **이메일 발송.** 초안만 작성합니다. 이 코드베이스 어디에도 메일 전송 기능은 없습니다.
- **외부로 데이터 전송.** 텔레메트리도, 우리 쪽 백엔드도 없습니다. 당신의 이력서는 당신의 컴퓨터에서 당신이 고른 AI 제공자에게만 갑니다. 유일한 공개 기록은 이 저장소, 즉 `HIRED.md`와 그 이슈들입니다.
- **4.0/5 미만 공고에 지원하라고 재촉.** 지원하지 말라고 말합니다. 무시할 수 있고, 그러면 그렇다고 알려줍니다.

이력서를 다듬을 뿐, 절대 지어내서는 안 됩니다. 이력서에도 `article-digest.md`에도 없는 숫자나 사실이 들어간 PDF는 코드 검사가 막아 주지만, 바꿔 쓴 표현 하나하나를 판단하지는 아직 못합니다. 보내기 전에 모든 이력서를 읽어보세요. 자세한 내용은 [FAQ](#faq)에 있습니다.

## 주요 기능

| 기능                   | 설명                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **A-H 평가**           | 직무 요약, 이력서 매치(이 공고에서 각 요구사항이 얼마나 중요한지, 그리고 그 가중치가 JD의 문구에서 나왔는지, 구조에서 나왔는지, 추정인지 요구사항별로 표시하며, 추정은 절대 최상위 등급이 될 수 없음), 레벨링 전략, 연봉 리서치, 개인화, 면접 준비 (STAR+R), 여기에 블록 G 공고 신뢰성 점검(아직 모집 중인지, 재게시된 공고인지: 판정이 아니라 관찰)과, 비자 스폰서십 불가를 명시한 JD를 절대적 결격 사유로 표시하는 취업 허가 신호가 더해집니다 |
| **Human-in-the-Loop**  | AI가 평가하고 추천하면, 당신이 판단하고 행동합니다. 시스템은 절대 지원서를 제출하지 않습니다. 최종 결정은 항상 당신의 몫 <!-- hitl: absolute guarantee. Do not add "automatically", "by itself", "without your permission" or any other hedge when translating this row. -->               |
| **ATS PDF 생성**       | 당신 자신의 경험을 바탕으로 JD마다 맞춘, ATS가 읽을 수 있는 이력서 (Space Grotesk + DM Sans 디자인)                                   |
| **자기소개서 생성기**  | 리서치 기반 자기소개서: 키워드 미러링, 네 가지 대화형 관점 질문(이유/문제/접근/톤), 채팅 내 초안 승인 게이트, 이력서와 동일한 HTML + Playwright 파이프라인을 통한 A4 PDF. 평가할 때마다 자동으로 초안을 만들고, `/rebound-ops cover`로 필요할 때 완성하고 생성합니다 |
| **이력서 너머**        | 기업 리서치([`deep`](modes/deep.md))는 AI 전략, 최근 동향, 엔지니어링 문화, 그리고 당신의 프로필이 취해야 할 각도를 드러냅니다. 연락처 발굴([`contacto`](modes/contacto.md))은 연락할 가치가 있는 채용 매니저, 리크루터, 팀 동료를 찾아내고 연락처 유형에 맞춘 300자 이하의 LinkedIn 메시지 초안을 작성합니다. 정식 지원 이메일 초안([`email`](modes/email.md))은 평가된 리포트나 붙여넣은 JD를 제목, 본문, 첨부 체크리스트로 바꿔주되 아무것도 보내거나 제출하거나 클릭하지 않습니다. 지원서는 당신을 대기열에 넣어주고, 리서치는 대화를 만들어 줍니다. |
| **패턴 분석**          | 거절 패턴과 ATS 채널별 진행률(`analyze-patterns.mjs`), 전체 구직 퍼널 통계(`stats.mjs`), 유령 채용의 신호일 수 있는 재게시 감지(`detect-reposts.mjs`) |

<details>
<summary><b>그 밖에 하는 모든 것</b></summary>

| 기능                   | 설명                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **자동 파이프라인**    | URL 입력만으로 전체 평가 + PDF + 트래커 등록                                                                                          |
| **면접 스토리 뱅크**   | 평가 데이터 기반 STAR+Reflection 스토리 축적: 실제로 받는 행동 면접 질문에 맞춰 다듬어 쓸 수 있는 5~10개의 마스터 답변                                     |
| **협상 전략 스크립트** | 연봉 협상 프레임워크, 거주지 기반 연봉 차등(Geographic Discount) 대응 논리, 경쟁 오퍼 활용 전략                                     |
| **지원 이메일 초안**   | 리포트나 붙여넣은 JD로부터 리크루터, 추천, 콜드 지원용 정식 이메일을 작성: 제목, 첨부 체크리스트, 근거가 있는 적합성 포인트, 프로필 기반 연락처 블록 포함. 초안만 작성하며, rebound-ops는 절대 보내거나 제출하거나 클릭하지 않습니다. |
| **포털 스캐너**        | 100개 이상의 기업 사전 설정 (Anthropic, OpenAI, ElevenLabs, Retool, n8n 등) + Ashby, Greenhouse, Lever, Wellfound 전반의 커스텀 웹 검색 |
| **투자 유치 기업 발견** | 검토 우선 방식의 `company:funded` 명령이 구조화된 공개 피드에서 최근 투자를 유치한 기업과 소스 진단을 보여주며, 당신의 데이터는 수정하지 않습니다 |
| **일괄 처리**          | 헤드리스 CLI 워커(`claude -p` / `opencode run`)로 병렬 평가                                                                          |
| **Dashboard TUI**      | 터미널 UI에서 파이프라인 탐색, 필터링, 정렬                                                                                         |
| **파이프라인 무결성**  | 자동 병합, 중복 제거, 상태 정규화, 헬스 체크                                                                                        |
| **면접 스위트**        | 시간 블록 단위의 준비 계획, 피드백이 있는 연습 세션, 면접 후 디브리핑([`interview/`](modes/interview/README.md)), 그리고 기업 위험 신호 감지기([`interview-redflag`](modes/interview-redflag.md)) |
| **오퍼 단계**          | 계약서 읽기 도우미: 조항별 검토와 변호사에게 물어볼 질문 목록([`offer-prep`](modes/offer-prep.md)), 그리고 희망/공고/실제 연봉 격차 분석기(`salary-gap.mjs`) |
| **팔로업과 답신**      | 팔로업 주기 계산기와 미리 심어둔 리마인더(`followup-cadence.mjs`, `followup-seed.mjs`); 고용주 답신을 트래커 업데이트로 분류([`reply-watch`](modes/reply-watch.md)) |
| **플러그인 시스템**    | 선택적 연동(Gmail, Notion, Apify + 커뮤니티 레지스트리), 기본적으로 비활성화. [docs/PLUGINS.md](docs/PLUGINS.md) 참고               |

</details>

## 빠른 시작

**가장 빠른 방법, 명령 하나로:**

```bash
node engine/scaffolder/bin/cli.mjs init
```

> 💡 `npx`는 [Node.js](https://nodejs.org)에 포함되어 있습니다: 전역으로 아무것도 설치하지 않고
> 설치 프로그램을 한 번 실행합니다. Node가 아직 없나요? 먼저 설치하세요.
> (이미 Claude Code / Codex CLI를 쓰고 있나요? 그러면 이미 있습니다.)

이 명령은 최신 릴리스를 `./rebound-ops`에 클론하고 의존성을 설치합니다. 그다음:

```bash
cd rebound-ops
claude   # or codex / qwen / opencode / agy / grok — open your AI CLI here
```

**처음 실행하면 rebound-ops가 대화만으로 설정(이력서, 프로필, 목표 직무)을 안내합니다. 직접 편집할 것은 없습니다.**

<details>
<summary><b>수동으로 설정하고 싶나요? (git clone)</b></summary>

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

### 전역 설치

```bash
npm i -g ./engine/scaffolder
```

이렇게 하면 `rebound-ops` 바이너리가 전역으로 설치되어 `npx` 없이 `rebound-ops init [folder]`를 실행할 수 있습니다. `init`이 유일한 명령입니다. 작업 공간을 만들 뿐이며, 그 이후의 모든 작업은 이 바이너리가 아니라 AI 코딩 CLI 안에서 이루어집니다(아래 사용법 참고).

**어떤 것을 써야 할까요?**
- `node engine/scaffolder/bin/cli.mjs init`: 처음 사용할 때 가장 좋습니다. 전용 프로젝트 폴더를 만듭니다.
- `npm i -g ./engine/scaffolder`: `npx` 형식보다 `rebound-ops init`을 입력하는 편이 좋을 때. 다른 명령은 추가되지 않습니다.

> **이 시스템은 당신의 AI 코딩 CLI가 직접 커스터마이즈하도록 설계되었습니다.** 모드, 아키타입, 점수 가중치, 협상 스크립트: 바꿔 달라고 말하기만 하면 됩니다. CLI가 자신이 사용하는 파일을 그대로 읽기 때문에 무엇을 편집해야 하는지 정확히 알고 있습니다.

전체 설정 가이드는 [docs/SETUP.md](docs/SETUP.md), 커스텀 또는 로컬 모델로 rebound-ops를 저렴하게 실행하는 방법은 [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md)(Antigravity CLI 무료 티어에서 비용 없이 실행하는 방법은 [docs/FREE_TIER.md](docs/FREE_TIER.md)), 반복 스캔 예약과 토큰을 쓰지 않는 선별→숏리스트 레시피는 [docs/AUTOMATION.md](docs/AUTOMATION.md), ATS 자동 입력 흐름의 세부 사항은 [docs/APPLY_AUTOFILL.md](docs/APPLY_AUTOFILL.md), LinkedIn 1촌 내보내기 파일을 퍼널의 기업들과 대조하는 방법은 [docs/LINKEDIN_JOIN.md](docs/LINKEDIN_JOIN.md), 흔한 설정 질문에 대한 답은 [docs/FAQ.md](docs/FAQ.md)를 참고하세요. 여기에는 [스토리 출처 관리가 지어낸 숫자를 막는 방법](docs/FAQ.md#why-does-rebound-ops-refuse-to-use-a-number-from-my-story-bank)도 포함됩니다. 설계 원칙은 [ARCHITECTURE.md](ARCHITECTURE.md)에, 런타임 흐름은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)에 있습니다.

## 사용법

rebound-ops는 공유 명령 라우터를 사용합니다. 슬래시 명령을 등록하는 CLI에서는 다음과 같이 보입니다:

```
/rebound-ops           → 사용 가능한 모든 명령 표시
/rebound-ops {JD}      → 자동 파이프라인: 평가 + 리포트 + PDF + 트래커 (텍스트 또는 URL 붙여넣기)
/rebound-ops pipeline  → 인박스의 대기 중인 URL 처리 (data/pipeline.md)
/rebound-ops oferta    → 평가만 수행, 블록 A~H (자동 PDF 없음)
/rebound-ops ofertas   → 여러 공고 비교 및 순위 매기기
/rebound-ops contacto  → LinkedIn 파워 무브: 연락처 찾기 + 메시지 초안 작성
/rebound-ops deep      → 기업에 대한 심층 리서치 프롬프트
/rebound-ops interview-prep → 기업 맞춤 면접 준비 문서 생성
/rebound-ops interview    → 대화형 프로필/이력서 온보딩 인터뷰
/rebound-ops master-profile → 마스터 커리어 프로필 가져오기, 검토, 검증
/rebound-ops eu-swe    → 이력서/지원/면접 전에 유럽 SWE 지원서 보정
/rebound-ops interview/plan → 다가오는 면접을 위한 시간 블록 단위 준비 계획
/rebound-ops interview/practice → 연습 면접, 피드백과 함께 한 번에 한 질문씩
/rebound-ops interview/debrief → 면접 후 디브리핑: 부족한 점 보완, 다음 라운드 예측
/rebound-ops interview-redflag → 입사 전에 고용주의 경고 신호 분석
/rebound-ops pdf       → PDF만 생성, ATS 최적화 이력서
/rebound-ops text      → 맞춤 마크다운 이력서 (cv.md 반영, PDF 없음)
/rebound-ops latex     → 이력서를 LaTeX/Overleaf .tex로 내보내기
/rebound-ops latex-tex → 자신의 resume.tex를 제자리에서 맞춤 조정 (옵트인; cv.md가 기본값 유지)
/rebound-ops cover     → 자기소개서: JD 단독 붙여넣기 또는 /rebound-ops cover {slug}
/rebound-ops email     → 정식 지원 이메일 초안 (초안만; 절대 보내거나 제출하거나 클릭하지 않음)
/rebound-ops add       → 프로젝트/논문/직무를 이력서에 추가 (가져오기 + 미리보기 + 확인)
/rebound-ops expand    → 프로필 링크에서 빠진 역량을 자동으로 찾아 추가
/rebound-ops training  → 강의/자격증을 North Star 기준으로 평가
/rebound-ops project   → 포트폴리오 프로젝트 아이디어 평가
/rebound-ops tracker   → 지원 현황 개요
/rebound-ops agent-inbox → 다음 세션을 위한 요청 대기열 추가/비우기 (data/agent-inbox.md)
/rebound-ops apply     → 실시간 지원 도우미 (양식 읽기 + 답변 생성)
/rebound-ops scan      → 포털 스캔 및 새 공고 발견
/rebound-ops discover  → 기업 목록을 스캔 가능한 ATS 보드로 변환 + portals.yml에 추가 (토큰 소모 없음)
/rebound-ops batch     → 병렬 워커를 이용한 일괄 처리
/rebound-ops patterns  → 거절 패턴 분석 및 타기팅 개선
/rebound-ops offer-prep → 받은 오퍼/계약서를 지원자와 함께 읽기: 조항 검토 + 변호사 질문 (법률 자문 아님)
/rebound-ops titles    → 검색 범위를 넓히기 위해 이력서 기반의 인접 직함 제안
/rebound-ops upskill   → 평가된 리포트로부터 종합 스킬 갭 분석
/rebound-ops followup  → 팔로업 주기 트래커: 기한 초과 표시, 초안 생성
/rebound-ops reply-watch → 고용주 답신 분류 및 트래커 업데이트 제안
/rebound-ops outcome   → 지원 결과 기록 및 산출물 보관
/rebound-ops calibrate → 자문 리포트: 당신의 평가 점수가 실제 결과를 예측하나요? /outcome 데이터를 읽으며, 점수 산정은 절대 바꾸지 않음
/rebound-ops update    → diff 미리보기 + 호환성 검사와 함께 rebound-ops 시스템 파일 업데이트
```

또는 채용 공고 URL이나 설명을 그대로 붙여넣기만 하세요. rebound-ops가 자동으로 감지해서 전체 파이프라인을 실행합니다.

Codex에서는 슬래시 명령이 보장되지 않습니다. 대신 프롬프트에 같은 모드 이름을 쓰거나 `codex exec`로 호출하세요.

## 작동 원리

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/how-it-works-dark.svg"><img src="docs/how-it-works-light.svg" alt="How it works: you paste a job URL or description. Archetype Detection classifies it as LLMOps, Agentic, PM, SA, FDE or Transformation. The A-H Evaluation reads cv.md and covers match, gaps, comp research, STAR stories and legitimacy. It produces a report (reports/*.md), the tailored CV in the format set by cv.output_format — a PDF by default — and a tracker entry (data/applications.md)." width="760"></picture></p>

## Antigravity CLI 연동

rebound-ops는 Claude Code와 OpenCode를 지원하는 것과 같은 방식으로 Antigravity CLI를 기본 지원합니다. 모든 슬래시 명령은 공유 스킬 진입점을 통해 사용할 수 있으며, 동일한 `modes/*.md` 평가 로직을 사용합니다.

Google은 일반 사용자용 Gemini CLI 접근을 Antigravity CLI로 전환했습니다. `GEMINI.md`는 이제 아무 동작도 하지 않는 호환성 가드로, Antigravity가 `AGENTS.md`와 `GEMINI.md`를 둘 다 읽을 때 전체 프로젝트 지침을 중복 로드하지 않게 합니다.

### 네이티브 Antigravity CLI

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

스킬은 오픈 표준에 따라 `.agents/skills/rebound-ops/SKILL.md`에 정의되어 있으며, 지원되는 각 CLI(예: `.claude/`, `.qwen/`, `.antigravitycli/`, `.grok/`)에 심볼릭 링크되거나 참조됩니다. Cursor는 `.agents/skills/`의 공유 스킬을 자동으로 발견합니다.

## Codex 연동

rebound-ops는 동일한 공유 라우터를 통해 Codex를 지원하지만, 슬래시 명령을 자동 등록하는 CLI와는 호출 방식이 다릅니다. 전체 가이드는 [docs/CODEX.md](docs/CODEX.md)를 참고하세요.

### 대화형 Codex

```bash
cd rebound-ops
codex
```

Codex에서는 슬래시 명령이 보장되지 않습니다. `/rebound-ops`를 쓸 수 없다면, Codex에 자연어로 해당 모드를 직접 실행해 달라고 요청하세요:

```text
Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123
Run the rebound-ops scan mode and summarize new matches.
Run the rebound-ops pipeline mode for data/pipeline.md.
Run the rebound-ops pdf mode for the latest evaluated role.
Run the rebound-ops tracker mode and summarize the current statuses.
```

### 단발 실행 Codex (`codex exec`)

```bash
codex exec "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
codex exec "Run rebound-ops scan mode in this repo and summarize new matches."
codex exec "Run rebound-ops pipeline mode for data/pipeline.md."
codex exec "Run rebound-ops pdf mode for the latest evaluated role."
codex exec "Run rebound-ops tracker mode and summarize the current statuses."
```

## Grok Build CLI 연동

rebound-ops는 Claude Code와 OpenCode를 지원하는 것과 같은 방식으로 Grok Build CLI를 기본 지원합니다. `AGENTS.md`가 프로젝트 규칙으로 자동 로드되고, 모든 슬래시 명령은 공유 스킬 진입점을 통해 사용할 수 있습니다.

### 네이티브 Grok Build CLI

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

헤드리스 일괄 워커에는 `grok -p "prompt"`를 사용하세요(도구 실행을 자동 승인하려면 `--yolo`를 추가).

## Pi 연동

rebound-ops는 [Pi](https://github.com/earendil-works/pi)를 기본 지원하며, 따로 관리할 래퍼 파일이 없습니다: Pi는 저장소 루트의 `AGENTS.md`를 프로젝트 컨텍스트로 읽고, `.agents/skills/rebound-ops/SKILL.md`의 공유 스킬을 스스로 찾습니다. 그러면 라우터를 `/skill:rebound-ops`로 사용할 수 있습니다.

### 네이티브 Pi

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

### 단발 실행 Pi (`pi -p`)

```bash
pi -p "Evaluate this JD with rebound-ops auto-pipeline: https://company.com/jobs/123"
pi -p "Run rebound-ops scan mode and summarize new matches."
pi -p "Run rebound-ops tracker mode and summarize the current statuses."
```

Pi 빌드가 프로젝트 리소스를 쓰기 전에 신뢰 확인을 요구한다면, 저장소 안에서 `/trust`를 한 번 실행하고 `pi`를 재시작해 프로젝트 스킬이 로드되게 하세요(`/trust`는 이후의 Pi 프로세스에 적용됩니다). 또는 `-a`로 시작하면 한 번의 실행만 신뢰하므로 재시작할 필요가 없습니다.

### 독립형 Gemini API 스크립트 (CLI 설치 불필요)

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

> **무료 티어:** 두 옵션 모두 결제 없이 동작합니다. 네이티브 CLI는 Google OAuth를 사용하고, API 스크립트는 `gemini-3.6-flash`를 사용합니다(요청 제한은 모델과 티어에 따라 다르며, 현재 쿼터는 Google AI 문서를 참고하세요).

## 사전 설정된 포털

스캐너에는 바로 스캔할 수 있는 **100개 이상의 기업**과 주요 채용 사이트를 아우르는 **35개 이상의 검색 쿼리**가 포함되어 있습니다. `templates/portals.example.yml`을 `portals.yml`로 복사하고 원하는 것을 추가하세요:

**AI 연구소:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**음성 AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI 플랫폼:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**컨택 센터:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**엔터프라이즈:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**자동화:** n8n, Zapier, Make.com
**유럽:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**검색되는 채용 사이트:** 55개 이상의 프로바이더 모듈이 ATS API, 사이트 전체 피드, XML/RSS 피드, 마크다운 피드, 로컬 파서를 다룹니다. 전체 표는 [지원되는 채용 사이트](docs/SUPPORTED_JOB_BOARDS.md)를 참고하세요.

기본적으로 `node scan.mjs`(즉 `npm run scan`)는 각 ATS 피드가 반환하는 내용을 신뢰합니다. 일부 기업은 채용이 끝난 뒤에도 공개 API에 오래된 공고를 남겨두기 때문에, 만료된 항목이 `pipeline.md`로 흘러들 수 있습니다. `--verify`를 넘기면 API 단계 후에 Playwright를 실행해 만료된 공고가 파이프라인에 들어가기 전에 걸러냅니다:

```bash
node scan.mjs --verify          # zero-token discovery + Playwright liveness check
```

검증은 순차적으로, 새 공고에 대해서만(중복 제거 후) 실행되므로 비용은 제한적입니다.

## Dashboard TUI

내장된 터미널 대시보드로 파이프라인을 시각적으로 탐색할 수 있습니다:

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

기능: 10개의 필터 탭, 8가지 정렬 모드, 그룹/플랫 보기, 지연 로딩 미리보기, 인라인 상태 변경.

**실험적인 웹 UI**도 있습니다(알파이자 옵트인: 직접 시작하지 않으면 아무것도 실행되지 않음). [`web/README.md`](web/README.md)를 참고하세요.

## 프로젝트 구조

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

## 외부 데이터 디렉터리 (선택 사항)

기본적으로 사용자 계층 데이터(`cv.md`, `portals.yml`, 그리고 `data/`, `reports/`, `output/` 폴더 등)는 프로젝트 루트 폴더 안에 있습니다.

개인 데이터를 코드와 분리하려면(브랜치 전환, 업데이트 받기, 여러 프로필 테스트가 쉬워집니다), 다음 우선순위에 따라 외부 데이터 디렉터리를 설정할 수 있습니다:

1. **환경 변수:** `REBOUND_OPS_ROOT` 또는 `REBOUND_OPS_DATA_DIR` 환경 변수를 설정합니다:
   ```bash
   export REBOUND_OPS_ROOT=~/my-career-data
   ```
2. **마커 파일:** 저장소 루트에 데이터 디렉터리 경로가 담긴 `.rebound-ops-data` 파일을 만듭니다.
3. **기본값:** 저장소 루트를 사용합니다.

결정되고 나면 모든 사용자 파일은 그 폴더를 기준으로 찾고 쓰며, 프롬프트 파일과 스크립트는 계속 저장소를 기준으로 찾습니다.

- **트래커 재정의:** `REBOUND_OPS_TRACKER`를 설정해 지원 트래커 파일 경로를 직접 지정할 수도 있습니다.
- **쓰기:** 모든 쓰기 작업(병합 등)은 표준적으로 `{DATA_ROOT}/data/applications.md`를 대상으로 합니다.
- **스캐너 설정:** `portals.yml`은 `{DATA_ROOT}/portals.yml`에서 읽고 검증하므로, `node validate-portals.mjs`는 `scan.mjs`가 읽는 것과 같은 파일을 검사합니다.
- **생성된 문서:** 맞춤 이력서와 자기소개서는 `{DATA_ROOT}/output/` 아래에 쓰이고, 이를 리포트와 연결하는 PDF 매니페스트는 `{DATA_ROOT}/data/pdf-index.tsv`에 있습니다. `REBOUND_OPS_TRACKER`가 설정되지 않은 동안에는 이런 쓰기의 범위를 정하는 트래커 작업 공간이 체크아웃이 아니라 데이터 루트입니다.
- **트래커 재정의 시의 PDF:** `generate-pdf.mjs`는 작업 공간을 정하기 전에 `REBOUND_OPS_TRACKER`를 먼저 확인하므로, 재정의가 설정되어 있으면 작업 공간은 그 트래커가 있는 폴더(트래커가 `data/` 폴더에 있으면 그 상위 폴더)가 됩니다. 이때 이력서의 HTML과 모든 PDF는 그 작업 공간 안에 있어야 하며, 매니페스트는 그곳의 `data/pdf-index.tsv`로 옮겨집니다. 자기소개서는 계속 `{DATA_ROOT}/output/`을 대상으로 하므로, 그 폴더가 트래커 작업 공간 밖에 있으면 거부됩니다.
- **코드 계층은 그대로:** `node_modules/`, `providers/`, `modes/`, 그리고 스크립트 자체는 항상 저장소를 기준으로 찾으며, 데이터 루트를 기준으로 하지 않습니다.

Go 대시보드 TUI, Node.js 스크립트, AI 에이전트 모드 모두 이 결정 순서를 자동으로 따릅니다.


## Tech Stack

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **에이전트**: 공유 스킬과 모드를 갖춘 AI 코딩 CLI (`AGENTS.md` + CLI별 래퍼)
- **PDF**: Playwright + HTML 템플릿
- **자기소개서**: HTML 템플릿 + Playwright (A4 PDF, 이력서와 동일한 파이프라인)
- **스캐너**: Playwright + Greenhouse API + WebSearch
- **대시보드**: Go + Bubble Tea + Lipgloss (Catppuccin Mocha 테마)
- **데이터**: 마크다운 표 + YAML 설정 + TSV 일괄 처리 파일

<p align="center">
</p>

<p align="center">
  <a href="https://claude.com/claude-code"><img src="https://img.shields.io/badge/Built_with-Claude_Code-000?style=for-the-badge&logo=anthropic&logoColor=white" alt="Built with Claude Code"></a>
</p>

<p align="center">
  <sub>에이전트 스킬 표준을 따르는 어떤 CLI에서도 실행됩니다. <a href="docs/SUPPORTED_CLIS.md">지원 CLI</a>를 보세요.</sub><br>
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

**rebound-ops가 뭔가요?**
ReboundOps maintains this engine inside the [monorepo](https://github.com/AnkitParekh007/rebound-ops). Engineering checks are not participant outcomes. See [provenance](../PROVENANCE.md). (Attribution note maintained in English.)

**맞춤 이력서가 없는 내용을 지어낼 수 있나요?**
그래서는 안 되며, 프롬프트에도 그렇게 적혀 있습니다: 다듬되, 절대 지어내지 않는다. `generate-pdf`는 당신의 원본 자료에 없는 숫자나 사실이 담긴 이력서를 막습니다(`--skip-fact-check`를 넘기지 않는 한). `pdf` 모드는 `cv-title-check.mjs`도 실행합니다. 맞춤 이력서의 각 직함을 cv.md에 적힌 같은 경력(회사와 기간으로 대조)의 직함과 비교하고, 다른 것이 있으면 유지할지 되돌릴지 묻습니다. 직함을 달리 표현하는 것이 당신의 선택일 때도 있으므로 경고만 하고 막지는 않습니다. 바꿔 쓴 표현을 판단하는 검사는 아직 없습니다: [#1411](https://github.com/AnkitParekh007/rebound-ops/issues/1411) (실패 시 차단하는 충실도 검사)이 이를 추적합니다. 그때까지는 보내기 전에 모든 이력서를 읽어보세요. [법적 고지](LEGAL_DISCLAIMER.md)에도 같은 내용이 더 길게 적혀 있습니다.

**rebound-ops를 무료로, 또는 더 저렴한 모델이나 로컬 모델로 쓸 수 있나요?**
네. rebound-ops는 CLI에 종속되지 않으며 무료 및 로컬 모델(OpenRouter 무료 모델, Ollama, 또는 OpenAI 호환 엔드포인트)에서 실행되므로 유료 구독에 묶이지 않습니다. 전체 설정은 [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md)를 참고하세요.

**Claude Pro/Max를 결제했는데 rebound-ops가 API 크레딧을 소모하고 있어요. 왜죠?**
환경에 있는 `ANTHROPIC_API_KEY`가 로그인된 구독보다 우선하기 때문입니다: CLI가 그 키를 사용하고 토큰당 과금합니다. `echo $ANTHROPIC_API_KEY`를 실행해서 무언가 출력되면 셸 프로필에서 제거하고, 터미널을 재시작한 뒤 `/login`을 실행하세요. 일괄 처리 모드는 예외입니다. `claude -p` 워커는 대화형 로그인을 쓰지 않으므로 `claude setup-token`을 한 번 실행하고 그 결과를 `CLAUDE_CODE_OAUTH_TOKEN`으로 내보내세요. 전체 안내는 [docs/RUNNING_ON_A_BUDGET.md](docs/RUNNING_ON_A_BUDGET.md#2b-already-paying-for-a-subscription-make-sure-you-are-using-it)에 있습니다.

**rebound-ops는 어떤 AI CLI와 함께 쓸 수 있나요?**
rebound-ops는 오픈 Agent Skill Standard를 통해 주요 AI 코딩 CLI(Claude Code, Codex, Gemini / Antigravity, OpenCode, Grok, Qwen 등) 어디서든 실행되므로, 특정 벤더에 묶이지 않습니다. 이미 가지고 있는 CLI를 쓰세요.

**Windows에는 어떻게 설치하나요?**
rebound-ops는 Windows에서 실행됩니다. 플랫폼별 설정과 알려진 까다로운 부분(Git Bash 탐색, 줄 끝 문자, 작업 스케줄러)은 [docs/WINDOWS.md](docs/WINDOWS.md)에 있습니다. 설치 중 심볼릭 링크 오류로 스킬이 로드되지 않으면 해결 방법은 [docs/FAQ.md](docs/FAQ.md)에 있습니다. 전체 단계는 [docs/SETUP.md](docs/SETUP.md)를 참고하세요.

**rebound-ops가 저 대신 자동으로 지원하나요?**
아니요. rebound-ops는 필터이지 무차별 자동 지원 도구가 아닙니다. AI가 평가하고 순위를 매기고 초안을 쓰면, 당신이 검토하고 결정합니다. 초안을 쓰고 양식을 채우지만, 절대 제출하지 않습니다. 제출 버튼은 당신이 누릅니다. 이 Human-in-the-Loop 설계가 핵심입니다.

**rebound-ops는 무료이고 오픈 소스인가요?**
The source is MIT-licensed; optional AI providers may charge separately. See [product principles](../docs/principles.md). (Attribution note maintained in English.)

## 면책 조항

**rebound-ops는 로컬 오픈소스 도구이며, 호스팅 서비스가 아닙니다.** 이 소프트웨어를 사용함으로써 다음 사항에 동의하는 것으로 간주됩니다:

1. **데이터는 당신이 통제합니다.** 이력서, 연락처, 개인정보는 당신의 컴퓨터에 머물며, 당신이 선택한 AI 제공사(Anthropic, OpenAI 등)에게만 직접 전송됩니다. 저희는 어떤 데이터도 수집, 저장, 접근하지 않습니다.
2. **AI는 당신이 통제합니다.** 기본 프롬프트는 AI가 지원서를 자동 제출하지 않도록 지시하지만, AI 모델은 예측 불가능하게 동작할 수 있습니다. 프롬프트를 수정하거나 다른 모델을 사용하는 경우 그 책임은 당신에게 있습니다. **제출 전에 항상 AI가 생성한 콘텐츠의 정확성을 확인하세요.**
3. **제3자 약관은 당신이 준수합니다.** 채용 포털(Greenhouse, Lever, Workday, LinkedIn 등)의 이용약관에 따라 이 도구를 사용해야 합니다. 이 도구를 고용주에게 스팸을 보내거나 ATS 시스템에 과부하를 주는 용도로 사용하지 마세요.
4. **보증은 없습니다.** 평가 결과는 추천이지 사실이 아닙니다. AI 모델은 스킬이나 경험을 허위로 생성할 수 있습니다. 저자는 채용 결과, 거절된 지원, 계정 제한 또는 기타 결과에 대해 책임지지 않습니다.

자세한 내용은 [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md)를 참고하세요. 이 소프트웨어는 [MIT 라이선스](LICENSE)에 따라 어떠한 보증 없이 "있는 그대로" 제공됩니다.

## License

MIT — see [LICENSE](LICENSE). Dependency and redistribution notes are in [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
