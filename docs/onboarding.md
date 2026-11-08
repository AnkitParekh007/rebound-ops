# First-visit guided questions

**Status:** built and the default first screen (owner decision, 6 Nov 2026, ahead of gate G1; see [roadmap](roadmap.md)). The wording is a **draft for pilot testing**: it has not been tested with any participant, and no user-research result is claimed.

## What the user sees

1. **Welcome:** a short greeting, about 2 minutes, and an honesty note: the questions are written in advance, no AI is used, and nothing is saved until the summary. "I'd rather fill in one form" opens the full form; "Coming back?" opens a saved session or a backup; "Need support beyond work?" points to [Find A Helpline](https://findahelpline.com/).
2. **"Which of these sounds most like you right now?"** Recently lost my job · moving into a different kind of work · coming back after time away · a better job in my field · something else.
3. **Three to six follow-up questions** chosen by that answer, one per screen, each with a "Why I ask" line, Back, and Skip where the answer is optional.
4. **Hours a week** and **things you're glad you did** (every path).
5. **"Here's what I heard"**: every answer with a Change button, which answers are saved, and a suggested place to start (all three options are still shown later). Confirming creates the session and opens **Things you did**.

The full form stays one click away on every screen ("Switch to the full form").

## Paths

| First answer | Questions after it |
|---|---|
| Recently lost my job | role → timing → how you feel (optional, not saved) → what you want next → (new field / stepping-stone work) → where to work |
| Different kind of work | role → new field → timing |
| Coming back after a break | break label (optional, defaults to "I'd rather not say") → role → how to come back → (new field / stepping-stone work) → timing |
| Better job, same field | role → what would be better → timing → where to work |
| Something else | what's going on (free text) → role → what you want next → (new field / stepping-stone work) → timing |

Every path then asks hours per week and things you did.

## Mapping to the intake (no schema change)

| Answer | Intake field |
|---|---|
| Role | `role` |
| Timing ("I'd rather not say" → three months after a job loss or "something else", otherwise flexible) | `urgency` |
| New field / stepping-stone work | `shiftTarget` / `bridgeTarget` (only if still on the path) |
| Where to work | `location` |
| Break label, what would be better, what's going on | `priorities` (shown and editable afterwards) |
| Hours (1–2 → 2, 3–5 → 4, 6–10 → 8, 11–20 → 15, not sure → 3) | `weeklyHours` |
| Things you did | `evidence[]`, each `unverified` and manually sourced |
| Situation, feeling, what you want next | **Not saved.** They only choose questions and the suggestion. |

Answers on branches the user left are dropped before saving.

## Rules the flow must keep

- No AI, no network calls until the summary is confirmed, and then only the one intake request to the local API.
- No human name, face, "typing" indicator, fake delay or "building your plan" loader.
- Never ask about money, savings, benefits, health details or why someone left a job.
- No exclamation marks, no claims to know how the user feels, no comments about former employers.
- Native radio buttons with an explicit Continue (no auto-advance); focus moves to each new question; one status region, empty at load, announces answers that stopped applying; animation is removed when the user asks for reduced motion.
- Answers live only in the component's memory. A reload discards them; nothing is written to browser storage.

Code: `apps/web/src/app/features/onboarding/` (`onboarding-flow.ts` holds the script and pure functions; it is unit-tested for every path).

## Set up AI assistance (optional)

The recovery header offers **Set up AI assistance** before you create a session. The integrated workspace has the same entry on Start and in Settings. Follow its private terminal configuration steps, explicitly test model access, then preview and approve each career review separately in Angular. See [AI setup](ai-provider.md). Core recovery remains available without a provider.
