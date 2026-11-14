# Publishing the official GitHub Wiki

[← Wiki home](Home)

The authoritative, reviewable source pages are stored in the main repository's `wiki/` directory. GitHub does **not** automatically turn that directory into its Wiki tab: a GitHub Wiki is a **separate Git repository**.

## First-time setup

1. A repository owner opens **Settings → General → Features** and enables **Wikis**. If repository policy disables wiki editing, keep maintainer-only permissions as appropriate.
2. Review and merge the `wiki/` documentation PR. Keep the required **verified commit signatures** and CI protections enabled on `main`.
3. On a local machine with access to the GitHub Wiki repository, clone the wiki remote:

```bash
git clone https://github.com/AnkitParekh007/rebound-ops.wiki.git
```

If GitHub refuses to clone an empty wiki, create the first **Home** page using the GitHub Wiki web editor, then clone the wiki repository. Use the web editor only for this bootstrap page.

4. Copy the reviewed Markdown pages from `wiki/` at the merged version into the root of the wiki clone (including `Home.md` and `_Sidebar.md`). Ensure you do not overwrite any existing community pages without reviewing their content.
5. On your signing-enabled Mac, commit and push:

```bash
cd rebound-ops.wiki
git add -- '*.md'
git commit -S -m "docs(wiki): publish reviewed ReboundOps knowledge base"
git push origin HEAD
```

6. Verify the rendered pages at **https://github.com/AnkitParekh007/rebound-ops/wiki**, especially navigation, code blocks, outbound links and mobile readability.

## Updating

Make content changes in a normal signed PR to the main repository first. After merge, copy the revised pages to the separate Wiki repository and push a signed documentation commit. **Never assume a main-repository PR updates the Wiki automatically.**

## Editorial standards

- Prefer clear task-oriented pages over marketing superlatives.
- Distinguish implementation, preview/experimental features and roadmap.
- Link to source docs for architecture and security assertions.
- Avoid placing private user data, tokens, unverified job claims or screenshots containing personal details in the wiki.
- Keep the sidebar and home index in sync.
