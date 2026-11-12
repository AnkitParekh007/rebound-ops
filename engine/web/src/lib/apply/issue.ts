// Client-safe (no playwright import). A structured, user-facing problem the
// interpreter hit, so the apply UI NEVER fails mute.
//   block = can't proceed (captcha / login wall / expired posting)
//   warn  = proceeded, but the user should look (unread field, validation error)
//   info  = FYI (we auto-dismissed a cookie banner)
export type ApplyIssue = { level: "block" | "warn" | "info"; code: string; message: string; field?: string };

// One step of the agentic drive loop (the AI reaching/filling the form live).
// `refusal` is set only when the step was refused, and says why: the guard
// recognised a submit control, the ref was not one of the refs offered this
// turn, or the element was gone by the time we acted; or the write guard
// (drive-write-guard.mjs) held a write to a sensitive field, a value that is
// not one of the reviewed answers, or a radio whose question is unknown. The
// note stays the human sentence; this is the machine-readable half, so a caller
// never has to parse prose to tell "we protected you" from "the page moved".
export type DriveStep = { turn: number; action: string; detail: string; thumb?: string; note?: string; refusal?: "submit-control" | "not-offered" | "gone" | "sensitive-field" | "unreviewed-value" | "unknown-question" };
