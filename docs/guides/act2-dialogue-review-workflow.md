# Act 2 Dialogue Review Workflow

This guide captures the current flow for packaging and distributing the Act 2 branch dialogue bundle so narrative, VO, and localization reviewers can sign off quickly.

## Prerequisites
- Latest dialogue export generated via `npm run narrative:export-act2-dialogues -- --baseline=telemetry-artifacts/act2-branch-dialogues-summary-prev.json --changes-out=telemetry-artifacts/act2-branch-dialogues-changes.json --markdown --markdown-out=telemetry-artifacts/act2-branch-dialogues-summary.md`.
- Reviewers expect JSON, Markdown, and change report artifacts to live under `telemetry-artifacts/`.

## Packaging Steps
1. **Export** – Run the exporter command above after any narrative edits to refresh JSON + Markdown bundles.
2. **Bundle** – Package the review drop with `npm run narrative:bundle-act2-review -- --summary=telemetry-artifacts/act2-branch-dialogues-summary.json --markdown=telemetry-artifacts/act2-branch-dialogues-summary.md --changes=telemetry-artifacts/act2-branch-dialogues-changes.json --label=<review-window>`.
   - The bundler copies the artifacts to `telemetry-artifacts/review/act2-branch-dialogues/<label>/`.
   - `review-manifest.json` tracks reviewer approvals; `REVIEW_CHECKLIST.md` lists required sign-offs.
3. **Distribute** – Share the bundled folder (JSON, Markdown, change report, manifest) with VO and localization reviewers.

## Reviewer Sign-Off
- Reviewers append their names, dates, and notes to `review-manifest.json` once they finish the checklist.
- Keep the most recent signed-off directory when archiving; older drops can move to `archive/` post release.

## Follow-Up
- Capture approvals or required edits in `QUEST-610` so backlog/state stays synchronized.
- Re-run the exporter + bundler after any narrative change, generating a new `--label` to avoid overwriting prior approvals.
