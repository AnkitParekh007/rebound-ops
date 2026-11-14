# Community discussion → development issue triage

The community should be able to propose ideas without every discussion becoming unreviewed work. **Only a maintainer who explicitly chooses to promote a discussion** should create an implementation issue.

## Triage decision

1. **Support question:** Answer in the discussion and improve the Wiki when needed; do not open a feature issue by default.
2. **Bug report:** Reproduce with fictional data and open a bug issue using the issue template; link the source discussion.
3. **Feature proposal:** Clarify the user problem, alternatives, expected benefit, privacy and accessibility impact, smallest testable change and acceptance criteria.
4. **Unsupported or unsafe behavior:** Explain scope and safety constraints without promoting the request.
5. **Ready for execution:** Use the manual [Promote Discussion to Issue workflow](../.github/workflows/promote-discussion.yml) with the discussion number and exact confirmation `PROMOTE`.

## Automated handoff (manual dispatch, not an automatic trigger)

The workflow uses `workflow_dispatch` on `main` only. It fetches the specified discussion using GitHub GraphQL, validates that it belongs to this repository, and creates a linked issue using `GITHUB_TOKEN`. The original discussion remains open. Run summaries include the issue URL.

- Inputs: numerical Discussion number and `PROMOTE` confirmation.
- Permission scope: `discussions: read`, `issues: write`, `contents: read`.
- Duplicate safety: every promoted issue starts with a hidden marker holding the discussion number, and an existing issue that starts with it stops a second promotion. A marker quoted elsewhere in an issue does not count.
- Mentions: an `@name` in the discussion title is neutralised, so promoting a discussion notifies no one it names.
- Generated issue text is a **triage draft**, not a promise to implement the suggestion. Maintainers must refine acceptance criteria and apply labels/assignees.
- Untrusted user-written Discussion content is copied as **quoted source** and must never be interpreted as executable workflow instructions.
- No automatic promotion from every comment or discussion; no unsolicited notifications or direct messages.

## Operational checklist

- [ ] Verify claims, links and screenshots are non-sensitive
- [ ] Establish clear user problem and success criteria
- [ ] Confirm product and privacy boundaries
- [ ] Check existing Issues and Discussions for duplicates
- [ ] Manually run promotion when appropriate
- [ ] Update the created issue's description and acceptance criteria
- [ ] Link the issue back in the original discussion manually
- [ ] Review open issues periodically and close stale duplicates respectfully

See [community guidelines](../CODE_OF_CONDUCT.md) and [feature request template](../.github/ISSUE_TEMPLATE/feature-request.md).
