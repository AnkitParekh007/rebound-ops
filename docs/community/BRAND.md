# ReboundOps brand brief (GitHub presence)

**Status: draft for owner review.** The GitHub assets follow the identity of the marketing site, which another session is building on `feature/marketing-site-v1`. Its design tokens and favicon were read, without changes, on 2026-11-18, while that work was uncommitted. If the site's identity changes before launch, regenerate these assets (see "Regenerating" below).

## Positioning

- **One line:** Run your job search on your own computer.
- **What it is:** an open-source, local-first job search assistant. Discover jobs, assess fit, tailor resumes and track applications. Private by default; AI optional.
- **Who it is for:** people running a serious job search who don't want to upload their history to another platform, and who want help that never invents facts about them.
- **Personality:** calm, honest, practical, slightly warm. It is a well-made tool, not a hype machine.

## Voice

- Say what it does, then what it doesn't. Limitations are part of the message, not small print.
- Use plain verbs: *capture, assess, tailor, track, follow up*. Avoid "AI-powered", "10x", "land your dream job" and "guaranteed".
- Never claim outcomes (interviews, offers, hiring rates). ReboundOps has no data on them, and it shouldn't.
- Be respectful of the reader's situation. A job search is stressful; don't make it sound like a game.

## Visual identity (from the marketing site's tokens)

| Role | Light | Dark ("stage") |
| --- | --- | --- |
| Background | `#f4efe7` warm paper | `#15110e` char |
| Surface | `#fffcf7` | `#201b17` |
| Line | `#ddd2c3` | `#3d342d` |
| Ink | `#1c1714` | `#f5eee4` |
| Secondary ink | `#463d36` | `#c7bbad` |
| Ember (accent) | `#e2531f` for graphics, `#a8380f` for text on paper | `#ff7a4d` |
| Lime (signal) | `#c9ef4b` with an ink outline | `#d5f65e` |
| Tide (verified evidence) | `#0d7068` | `#57d6c6` |

- **Type:** Bricolage Grotesque (display), Instrument Sans (body), JetBrains Mono (code). All three are under the SIL Open Font License 1.1. The SVGs reference them with system fallbacks and do not embed font files. Only the social-preview PNG uses them, rasterised.
- **Mark:** a char rounded square with two ember bounce arcs, a lime ball and a faint baseline: a search that rebounds. It is the same geometry as the marketing site's favicon.
- **Motif:** bounces that get higher, one per stage: Discovered → Assessed → Tailored → Applied *by you* → Follow-ups. The "by you" is deliberate: the user applies, not the app.

### Note on the app's own identity

The app's UI (`apps/web/src/styles.css`) uses a different identity: paper and ink with a deep green accent (`#1d6b52`), a serif display face, and a green rising-curve mark in the header and favicon. The GitHub assets follow the marketing site, as asked. **Owner decision:** align the app with the marketing identity in a later UI release, or keep the app's quieter palette and treat the marketing look as the "outside" brand. Either is defensible. Mixing them without deciding is not.

## Assets in this repository

| File | Size | Use |
| --- | --- | --- |
| `docs/assets/brand/social-preview.png` | 1280×640, ~109 KB | Repository social preview (upload in Settings) |
| `docs/assets/brand/social-preview.svg` | source | Edit this, then regenerate the PNG |
| `docs/assets/brand/readme-banner-light.svg` / `-dark.svg` | 840×220 | README header through `<picture>` |
| `docs/assets/brand/mark.svg` | 32×32 viewBox | Avatar, favicon, small placements |
| `docs/assets/brand/wordmark-light.svg` / `-dark.svg` | 340×72 | Docs, slides, posts |

All of them are original vector drawings made for this repository: no stock art, no third-party logos, and no images from any earlier project. Text in the SVGs is live text, so it renders in the viewer's fallback sans if the brand fonts aren't installed. That is expected and stays legible.

## Regenerating the PNG

The PNG is rasterised on macOS with [`scripts/community/svg2png.swift`](../../scripts/community/svg2png.swift), which loads the SVG and registers the brand fonts for that process only. The fonts come from the marketing site's `@fontsource-variable` packages, and nothing is installed system-wide.

```bash
FONTS=$(mktemp -d)
cp <marketing-site>/node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wdth-normal.woff2 "$FONTS"/
cp <marketing-site>/node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wdth-normal.woff2 "$FONTS"/
swiftc -O scripts/community/svg2png.swift -o "$FONTS/svg2png"
REBOUND_FONT_DIR="$FONTS" "$FONTS/svg2png" docs/assets/brand/social-preview.svg docs/assets/brand/social-preview.png 1280 640
```

Check that the result is 1280×640 and under 1 MB. AppKit's SVG renderer ignores `font-weight` and `<tspan>` fills, so the PNG uses the variable font's default instance, and the headline colours are on separate `<text>` elements.

The SVG names the registered family "Bricolage Grotesque 96pt ExtraBold" first, because that is how CoreText names the variable font's default instance.

## Don'ts

- No fake UI with invented numbers in marketing images. Real screenshots must come from the app running on fictional fixture data.
- No testimonials, star counts, download counts or "trusted by" logos.
- Don't use third-party logos (Greenhouse, Lever, Ashby, Workable, Ollama, AI vendors) in brand art. Name them in text where it's factual.
