# Act 2 Dialogue Review Workflow

This guide captures the current flow for packaging and archiving the Act 2 branch dialogue bundle so a solo developer can self-review quickly and preserve assets for future localization or VO work.

## Prerequisites
- Latest dialogue export generated via `npm run narrative:export-act2-dialogues -- --baseline=telemetry-artifacts/act2-branch-dialogues-summary-prev.json --changes-out=telemetry-artifacts/act2-branch-dialogues-changes.json --markdown --markdown-out=telemetry-artifacts/act2-branch-dialogues-summary.md`.
- Reviewers expect JSON, Markdown, and change report artifacts to live under `telemetry-artifacts/`.

## Packaging Steps
1. **Export** – Run the exporter command above after any narrative edits to refresh JSON + Markdown bundles.
2. **Bundle** – Package the review drop with `npm run narrative:bundle-act2-review -- --summary=telemetry-artifacts/act2-branch-dialogues-summary.json --markdown=telemetry-artifacts/act2-branch-dialogues-summary.md --changes=telemetry-artifacts/act2-branch-dialogues-changes.json --label=<review-window>`.
   - The bundler copies the artifacts to `telemetry-artifacts/review/act2-branch-dialogues/<label>/`.
   - `review-manifest.json` doubles as your solo review log; `REVIEW_CHECKLIST.md` lists the self-review gates to clear before shipping a drop.
   - Use `--manifest-only=<manifest-path>` to jot follow-up notes without rebuilding the bundle (e.g. `npm run narrative:bundle-act2-review -- --manifest-only=telemetry-artifacts/review/act2-branch-dialogues/<label>/review-manifest.json --note="Tweaked branch 3 beat pacing"`).
3. **Distribute** – Archive the bundled folder for personal reference or future localization packaging.

## Solo Review Notes
- Replace formal approvals with concise self-review entries in `review-manifest.json` so future packaging runs show what changed and why.
- Track open questions or localization TODOs in the manifest `notes` array; treat the timestamps as personal reminders rather than external SLAs.
- Keep the most recent reviewed directory handy; move earlier drops to `archive/` once content is locked.

## Follow-Up
- Mirror any outstanding narrative follow-ups in the relevant backlog ticket so solo planning stays synchronized.
- Re-run the exporter + bundler after any narrative change, generating a new `--label` to avoid overwriting prior review logs.
