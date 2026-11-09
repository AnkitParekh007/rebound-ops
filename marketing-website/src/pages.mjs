import { documentationPages } from "./documentation.mjs";
const repo = "https://github.com/AnkitParekh007/rebound-ops";
const doc = (path) => `${repo}/blob/main/${path}`;
const card = (index, title, text, href, label = "Learn more") =>
  `<article class="content-card"><span class="card-index">${index}</span><h3>${title}</h3><p>${text}</p>${href ? `<a href="${href}">${label} ↗</a>` : ""}</article>`;
const callout = (text) => `<aside class="callout"><p>${text}</p></aside>`;
const flow = (labels) =>
  `<div class="flow-line">${labels.map((text, i) => `<div><span>0${i + 1}</span><strong>${text}</strong></div>`).join("")}</div>`;
const faq = (question, answer) =>
  `<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`;
export const navigation = [
  ["how-it-works", "How it works"],
  ["features", "Features"],
  ["screenshots", "Screenshots"],
  ["sources", "Sources"],
  ["compare", "Compare"],
  ["methodology", "Methodology"],
  ["docs", "Docs"],
  ["help", "Help"],
  ["faq", "FAQ"],
];
const sources = [
  [
    "greenhouse",
    "Greenhouse",
    "ats",
    "Public company job boards and job descriptions.",
  ],
  [
    "lever",
    "Lever",
    "ats",
    "Company postings from Lever-hosted careers pages.",
  ],
  ["ashby", "Ashby", "ats", "Structured openings from Ashby job boards."],
  [
    "workable",
    "Workable",
    "ats",
    "Job listings from supported company careers pages.",
  ],
  [
    "workday",
    "Workday",
    "ats",
    "Company career sites with pagination and coverage limits.",
  ],
  [
    "smartrecruiters",
    "SmartRecruiters",
    "ats",
    "Company postings exposed through supported public endpoints.",
  ],
  [
    "personio",
    "Personio",
    "ats",
    "Company careers feeds supported by the engine adapter.",
  ],
  [
    "bamboohr",
    "BambooHR",
    "ats",
    "Open roles from supported BambooHR careers sites.",
  ],
  [
    "remoteok",
    "Remote OK",
    "remote",
    "A specialist source for remote opportunities.",
  ],
  [
    "remotive",
    "Remotive",
    "remote",
    "Remote-job listings from the configured public source.",
  ],
  [
    "germantechjobs",
    "GermanTechJobs",
    "specialist",
    "Technology roles focused on the German job market.",
  ],
  ["itviec", "ITviec", "specialist", "Technology opportunities in Vietnam."],
];
export const providerIds = sources.map((source) => source[0]);
export const pages = {
  ...documentationPages,
  "how-it-works": {
    title: "How it works",
    eyebrow: "THE WORKFLOW",
    heading: 'Experience in.<br><span class="orange">Next steps out.</span>',
    description:
      "Move from your own experience to a direction you can test, then into a local workspace for the job search itself.",
    content: `${flow(["Gather evidence", "Explore directions", "Build a plan", "Work your search"])}<section class="steps-list">
  <article><span>01</span><div><h2>Start with what you know.</h2><p>Set out your experience, the kind of work you’re considering and the time you can give each week. Add achievements manually or connect them to exact quotations from private project-note or résumé excerpts. The recovery app accepts up to 15 achievement claims and up to three source excerpts.</p></div></article>
  <article><span>02</span><div><h2>Check your evidence.</h2><p>Confirm, reject or leave a claim unverified. Corrections preserve a history and reset confirmation, so a changed statement doesn’t silently retain old evidence links. Compare supplied job requirements against achievements you have confirmed yourself.</p><a class="text-link" href="/methodology/">Read the evidence methodology ↗</a></div></article>
  <article><span>03</span><div><h2>Choose something to test.</h2><p>Return to similar work, shift toward a new kind of work, or explore a stepping-stone role. Every direction states its unknowns. Choose one to generate a seven-day plan bounded by your available hours, then mark actions complete and record what you learned.</p></div></article>
  <article><span>04</span><div><h2>Bring focus to your search.</h2><p>The integrated workspace opens the job-search workspace for discovery, CV work, research and application tracking. Recovery context stays visible, but CVs, evidence and job targets aren’t automatically synchronized between the two systems.</p></div></article>
  </section>${callout("Your starting point can be small. Core recovery works without an AI key, a hosted account or a résumé upload. Optional AI and job-search integrations are configured separately.")}<a class="button" href="/help/">Install ReboundOps ↗</a>`,
  },
  features: {
    title: "Features",
    eyebrow: "THE TOOLKIT",
    heading:
      'A career reset.<br><span class="orange">With the right tools.</span>',
    description:
      "Evidence-led recovery and practical job-search tools, in one repository. Two connected experiences with clear boundaries.",
    content: `<section><h2>Find your direction.</h2><div class="card-grid">${[
      [
        "01",
        "Guided intake",
        "Capture your experience, practical constraints and achievement claims in a guided first visit.",
        "/how-it-works/",
      ],
      [
        "02",
        "Traceable evidence",
        "Attach exact source quotations, review individual claims and preserve correction history.",
        "/methodology/",
      ],
      [
        "03",
        "Three route hypotheses",
        "Explore similar work, a new kind of work or a stepping-stone role. See what remains uncertain.",
        "/#explore",
      ],
      [
        "04",
        "Job requirement review",
        "Compare up to three supplied job targets with participant-confirmed achievements.",
        doc("docs/job-requirements.md"),
      ],
      [
        "05",
        "A bounded seven-day plan",
        "Choose a route, get actions that fit your available time, and review what you actually tried.",
        "/how-it-works/",
      ],
      [
        "06",
        "Local data controls",
        "Export Markdown, download or restore a JSON backup, and explicitly opt into local disk saving.",
        doc("docs/local-persistence.md"),
      ],
    ]
      .map((args) => card(...args))
      .join(
        "",
      )}</div></section><section><h2>Work your job search.</h2><div class="card-grid">${[
      [
        "07",
        "Opportunity discovery",
        "Scan supported public job-board sources and organize the roles you want to investigate.",
        "/sources/",
      ],
      [
        "08",
        "CV and interview tools",
        "Prepare application material and interview notes. Review generated material against your real experience.",
        "/screenshots/",
      ],
      [
        "09",
        "Application tracking",
        "Keep applications, statuses, notes and follow-ups together in your local workspace.",
        "/screenshots/",
      ],
    ]
      .map((args) => card(...args))
      .join(
        "",
      )}</div></section>${callout("Recovery AI assistance is available with Anthropic setup. Open Set up AI assistance to configure and test access; reviews preview the exact payload and require consent per request. Workspace AI features have separate configuration and may incur provider charges.")}<a class="text-link" href="/compare/">Understand which part to use ↗</a>`,
  },
  screenshots: {
    title: "Screenshots",
    eyebrow: "INSIDE THE PRODUCT",
    heading:
      'See the workspace.<br><span class="orange">Skip the guesswork.</span>',
    description:
      "Explore the ReboundOps workspace. Production builds automatically capture the app using fictional demo data; no customer account or career records are used.",
    content: `<section><div class="gallery-tabs" role="group" aria-label="Choose a screenshot"><button data-shot="start" aria-pressed="true">Start</button><button data-shot="directions" aria-pressed="false">Directions</button><button data-shot="plan" aria-pressed="false">My plan</button><button data-shot="evidence" aria-pressed="false">Evidence</button><button data-shot="dashboard" aria-pressed="false">Search workbench</button><button data-shot="scan" aria-pressed="false">Opportunity lens</button><button data-shot="tracker" aria-pressed="false">Applications</button></div><figure class="gallery-frame"><a id="shot-link" class="shot-link" href="/assets/start.png" target="_blank" rel="noopener" aria-label="Open full-size start screenshot in a new tab"><img id="shot-image" src="/assets/start.png" width="1440" height="1000" alt="ReboundOps intake with goal choices and an option to use a fictional example"></a><figcaption aria-live="polite" aria-atomic="true"><strong id="shot-title">Begin with your own experience.</strong><span id="shot-description">Set a goal and describe your experience and constraints. This capture uses a fictional example.</span></figcaption></figure><p class="gallery-note">Select a tab to switch captures; select the image to view it at full resolution. <!-- SCREENSHOT_BUILD_NOTE --></p></section><div class="card-grid">${card("01", "A dedicated recovery flow", "The recovery app adds intake, evidence review and direction planning before the job-search workspace.", "/how-it-works/")}${card("02", "A connected workspace", "Discovery and application tools run locally. Their records are not automatically synced with recovery sessions.", "/features/")}${card("03", "Try the actual app", "Start the local developer demo to explore your own current build instead of an image.", "/help/")}</div>`,
  },
  sources: {
    title: "Sources",
    eyebrow: "WHERE OPPORTUNITIES COME FROM",
    heading: 'Go closer<br><span class="orange">to the source.</span>',
    description:
      "The job-search engine includes adapters for public careers pages and specialist job boards. Here is a verified selection from the repository, with links to the implementation.",
    content: `<section><div class="filter-row"><label for="source-search">Find a source by name</label><input id="source-search" type="search" placeholder="Search sources…" autocomplete="off"><button class="filter-button" data-source-filter="all" aria-pressed="true">All</button><button class="filter-button" data-source-filter="ats" aria-pressed="false">Company boards</button><button class="filter-button" data-source-filter="remote" aria-pressed="false">Remote</button><button class="filter-button" data-source-filter="specialist" aria-pressed="false">Specialist</button></div><div id="source-count" class="source-count" role="status">${sources.length} sources in this selection</div><div class="card-grid">${sources.map(([id, name, category, description]) => `<article class="content-card source-card" data-source-name="${name.toLowerCase()}" data-source-category="${category}"><span class="micro-label">${{ ats: "COMPANY BOARD", remote: "REMOTE", specialist: "SPECIALIST" }[category]}</span><h3>${name}</h3><p>${description}</p><a href="${doc(`engine/providers/${id}.mjs`)}">View adapter ↗</a></article>`).join("")}</div><p id="source-empty" hidden>No matching source in this selection. Try another name or choose All.</p></section>${callout("An adapter is not a partnership, endorsement or guarantee of complete coverage. Availability depends on the source, your configuration, rate limits and the job board’s current API. This page does not run a scan or make external requests.")}<section><h2>Evidence sources are different.</h2><p>Recovery evidence comes from the achievements and source excerpts you provide. Job-board data does not verify your career claims. The recovery app lets you paste real job descriptions for manual requirement comparison; job discovery belongs to the separate workspace and engine.</p><a class="text-link" href="${repo}/tree/main/engine/providers">Browse all provider implementations ↗</a></section>`,
  },
  compare: {
    title: "Compare",
    eyebrow: "CHOOSE YOUR STARTING POINT",
    heading:
      'The right tool.<br><span class="orange">For your next move.</span>',
    description:
      "Sometimes you need direction. Sometimes you need a place to track applications. Here’s how the parts of ReboundOps fit together, alongside a simple DIY approach.",
    content: `<section><div class="table-scroll" role="region" aria-label="Comparison table; scroll horizontally on small screens" tabindex="0"><table><caption>A workflow comparison, not a benchmark or employment-outcome claim.</caption><thead><tr><th scope="col">What you need</th><th scope="col">Recovery app</th><th scope="col">Job-search workspace</th><th scope="col">DIY spreadsheet</th></tr></thead><tbody>${[
      [
        "Explore a career direction",
        "Three explicit hypotheses",
        "Opens from recovery context",
        "You design the exercise",
      ],
      [
        "Review career evidence",
        "Source quotations and correction history",
        "Separate CV and profile files",
        "Manual notes and links",
      ],
      [
        "Compare supplied job requirements",
        "Links to confirmed achievements",
        "Separate evaluation workflow",
        "Manual review",
      ],
      [
        "Create a weekly action plan",
        "Seven-day plan within stated hours",
        "Separate job-search workflows",
        "You allocate the time",
      ],
      [
        "Find opportunities",
        "Paste your own job targets",
        "Supported job-board adapters",
        "Find and enter roles yourself",
      ],
      [
        "Track applications",
        "Recovery actions and check-ins",
        "Application statuses and follow-ups",
        "Custom columns",
      ],
      [
        "Use optional AI",
        "Payload preview and consent per review",
        "Separate provider settings",
        "Depends on tools you add",
      ],
      [
        "Keep records",
        "Memory by default; optional local saving",
        "Local files",
        "Depends on your spreadsheet app",
      ],
      [
        "Setup",
        "Local Node app",
        "Local Node app and engine setup",
        "Create a sheet",
      ],
    ]
      .map(
        (row) =>
          `<tr><th scope="row">${row[0]}</th>${row
            .slice(1)
            .map((cell) => `<td>${cell}</td>`)
            .join("")}</tr>`,
      )
      .join(
        "",
      )}</tbody></table></div></section><div class="card-grid">${card("01", "Start with recovery", "Use it when you need a grounded direction, a review of your evidence or a manageable plan.", "/how-it-works/")}${card("02", "Open the workspace", "Use it when you’re ready to discover roles, prepare material and organize applications.", "/screenshots/")}${card("03", "Keep it simple", "A spreadsheet can be enough if your process already works. ReboundOps is available when you want more structure.", "/help/")}</div>${callout("Recovery and workspace records are separate today. Navigation connects the experiences; two-way synchronization, hosted accounts and automated application submission are not part of the integrated workspace.")}`,
  },
  methodology: {
    title: "Methodology",
    eyebrow: "EVIDENCE OVER ASSUMPTIONS",
    heading:
      'Show your work.<br><span class="orange">Know what’s unknown.</span>',
    description:
      "ReboundOps treats career direction as a hypothesis to test. Claims, source quotations and human confirmation remain visible throughout the recovery workflow.",
    content: `${flow(["Record a claim", "Attach a source", "Review it yourself", "Test a next step"])}<section class="article-columns"><div><h2>What counts as evidence?</h2><p>An achievement starts as a claim. It can be manually sourced or connected to an exact, uniquely matched quotation in a user-provided source document. A quotation shows where a statement came from; it does not independently prove that the underlying statement is true.</p><p>You decide whether to confirm, reject or leave each claim unverified. Only participant-confirmed achievements can support manual job-requirement links or enter optional recovery AI-review payloads.</p></div><div><h2>What happens when it changes?</h2><p>Correcting an achievement records its history, resets its confirmation and revokes dependent requirement links. This keeps an old decision from silently supporting a new statement.</p><p>Missing evidence stays visible. The app does not fill a gap by inventing a career achievement or treating a keyword match as a verified qualification.</p></div></section><section><h2>Three routes. Three hypotheses.</h2><div class="card-grid">${card("RETURN", "Similar work to before", "Test current role requirements against your confirmed achievements. Hiring availability still needs to be checked.")}${card("SHIFT", "A new kind of work", "Identify transferable evidence and a specialty-specific gap. Prior experience does not automatically establish readiness.")}${card("BRIDGE", "A stepping-stone role", "Define a narrow deliverable and test interest. Demand, timing and actual income remain unknown.")}</div></section><section><h2>Where AI fits.</h2><p>Core recovery planning is deterministic and works without an AI provider. Optional Anthropic review requires local configuration, an exact JSON payload preview and explicit consent for each request. Suggestions do not automatically change your session. Workspace scoring and AI tools are separate workflows; their scores are not recovery-route predictions or hiring probabilities.</p><a class="text-link" href="${doc("docs/ai-provider.md")}">Read the recovery AI guide ↗</a></section>${callout("Engineering checks are not user validation. External participant journeys, independent accessibility evaluation and live recovery AI evaluation remain open gates. ReboundOps does not promise interviews, offers or a particular career outcome.")}<div class="doc-links"><a class="doc-link" href="${doc("docs/evidence-provenance.md")}"><strong>Evidence and corrections ↗</strong><span>Read the provenance and source-quotation rules.</span></a><a class="doc-link" href="${doc("docs/roadmap.md")}"><strong>Roadmap and decision gates ↗</strong><span>See what is implemented and what still needs validation.</span></a></div>`,
  },
  help: {
    title: "Help",
    eyebrow: "GET UP AND RUNNING",
    heading:
      'From the repo<br><span class="orange">to your own machine.</span>',
    description:
      "Start the integrated recovery and job-search demo locally. This public website introduces the project; it does not host your career records or the app.",
    content: `<p>New here? Start with the <a class="text-link" href="/docs/">documentation</a> for setup, workflow, data controls and contributing.</p><section><h2>Before you start.</h2><p>Use Node 24.15+ on the 24.x line, Node 22.22.3+ on the 22.x line, or Node 26+, with npm and Git on macOS, Linux or Windows. Run <code>npm run doctor</code> to check prerequisites and ports. The starter verifies locked root, workspace and engine dependencies, installs and checks Chromium for PDF export, then builds the contracts and API. The first run needs network access; startup stops with repair instructions if a prerequisite fails.</p><div class="install-card"><div class="install-header"><span>LOCAL WORKSPACE / TERMINAL</span><span>NO AI KEY REQUIRED</span></div><div class="install-body"><div class="install-label"><span>01 / GET THE REPOSITORY</span><button class="copy-button" data-copy="clone" aria-label="Copy clone command">Copy ↗</button></div><pre><code>git clone https://github.com/AnkitParekh007/rebound-ops.git</code></pre><div class="install-label"><span>02 / START THE LOCAL WORKSPACE</span><button class="copy-button" data-copy="start" aria-label="Copy startup commands">Copy ↗</button></div><pre><code>cd rebound-ops
npm start</code></pre><div class="install-address"><span class="status-dot"></span> Open http://127.0.0.1:4317/#/start</div></div><div class="install-footer">Keep the terminal open. Press Ctrl+C once to stop both services.</div><span id="copy-status" class="sr-only" role="status"></span></div></section><section><h2>First-run troubleshooting.</h2><div class="faq-list">${faq("“Recovery service is offline” appears.", "Restart the integrated workspace with <code>npm start</code>. The workspace uses port 4317 and the recovery API uses port 4174. The bridge will not invent a fallback plan when the API is unavailable.")}${faq("A port is already in use.", "Stop an existing local ReboundOps process before starting another. The integrated workspace needs ports 4317 and 4174. Check the terminal output for the process that failed to start.")}${faq("My recovery session disappeared after a restart.", "Memory-only sessions do not survive API restarts. In the full recovery app, download a JSON backup or explicitly opt into local disk saving after configuring a private data directory. Choose local saving from Start or My next step to keep a recovery session across restarts.")}${faq("I want the standalone Angular recovery app.", "From the repository root, run <code>npm ci</code>, then <code>npm run dev</code>. Open <code>http://127.0.0.1:4200</code>. This runs the Angular frontend alongside the local Fastify API.")}${faq("Do I need to configure AI?", "No. Start with the core recovery flow. Optional recovery AI needs both local enablement and a provider key, followed by payload preview and consent per request. Open Set up AI assistance from Start or Settings for private key configuration and a connection test. The launcher supports explicit recovery AI opt-in with --ai; full requirement review runs in Angular. See the AI setup documentation.")}</div></section><section><h2>Go deeper.</h2><div class="doc-links"><a class="doc-link" href="/docs/ai/"><strong>Set up AI assistance ↗</strong><span>Configure Anthropic, test access and approve each recovery review.</span></a><a class="doc-link" href="${doc("workspace/docs/INTEGRATION-DEMO.md")}"><strong>Integrated demo guide ↗</strong><span>Processes, ports, bridge behavior and data boundaries.</span></a><a class="doc-link" href="${doc("docs/local-persistence.md")}"><strong>Local saving and recovery ↗</strong><span>Opt-in disk sessions and backup guidance.</span></a><a class="doc-link" href="${doc("docs/privacy.md")}"><strong>Privacy guidance ↗</strong><span>Understand files, exports and optional provider calls.</span></a><a class="doc-link" href="${repo}/issues"><strong>Report a problem ↗</strong><span>Share your platform and redacted error text. Keep CVs, keys and private session files out of issues.</span></a></div></section>`,
  },
  faq: {
    title: "FAQ",
    eyebrow: "CLEAR ANSWERS",
    heading: 'Less uncertainty.<br><span class="orange">More context.</span>',
    description:
      "What ReboundOps does, how it handles data, where AI fits and what to expect from this early local developer preview.",
    content: `<div class="full-faq"><section><h2>The project.</h2><div class="faq-list">${faq("Who is ReboundOps for?", "Experienced software professionals navigating a layoff, considering a career change or looking for more structure in their next move. It is a self-directed toolkit, not a recruiter or a guarantee of employment.")}${faq("Is it free?", "The source code is free under the MIT license. There is no ReboundOps subscription requirement. Optional AI providers may charge for their own usage.")}${faq("Can I use it on this website?", 'This is the marketing website. The recovery app and job-search workspace run on your computer. Visit <a href="/help/">Help</a> for the local startup instructions.')}${faq("How mature is it?", "This is an early developer preview. Automated engineering checks exist, but external participant validation, independent accessibility work and live recovery AI evaluation remain open. See the repository roadmap for the current gates.")}</div></section><section><h2>Your data and AI.</h2><div class="faq-list">${faq("Where are recovery sessions stored?", "In API memory by default. The full recovery app supports optional local disk saving and downloadable JSON backups. Local disk files and downloaded backups are not encrypted by the app. The integrated workspace bridge does not expose durable-session controls yet.")}${faq("Does anything leave my computer?", "Core recovery does not send data to an AI provider automatically. Configured AI features can send data externally: recovery review requires preview and consent per request, while workspace AI has separate settings. Job discovery also requests public job-board endpoints. This marketing site stores your light/dark preference in your browser. It has no analytics, account form or CV upload; the hosting provider processes ordinary HTTP requests.")}${faq("Can I use it without AI?", "Yes. The core recovery workflow is deterministic and needs no provider key. You can explore directions, review evidence and get a bounded plan without an AI call.")}${faq("Does AI automatically change my evidence?", "No. Recovery AI suggestions do not automatically change session records. You retain control of claim confirmation and job-requirement links.")}</div></section><section><h2>The workflow.</h2><div class="faq-list">${faq("What are Return, Shift and Bridge?", "They are internal names for similar work to before, a new kind of work and a stepping-stone role. Each is a hypothesis with explicit unknowns, not a prediction about hiring or income.")}${faq("Are the recovery and job-search records synced?", "No automatic two-way sync exists. The integrated workspace connects navigation and displays recovery context, while job-search CVs, profiles, targets and applications remain separate records.")}${faq("Will it send applications for me?", "No. You decide what to pursue and submit your own applications.")}${faq("Are the screenshot outcomes real?", "No. The Screenshots page uses automatically captured fictional fixtures. Local fallback builds may show older repository images. Visible statuses, scores and counts are not participant results.")}${faq("Can I customize or contribute?", "Yes. Read the repository contribution guide and preserve the existing third-party license notices. Open an issue with an idea or a reproducible problem, without private career data.")}</div></section></div>`,
  },
};
