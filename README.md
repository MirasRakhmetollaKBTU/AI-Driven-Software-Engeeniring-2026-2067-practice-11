# Practice Work 11 - Smart Campus explanations

## Current stage: Task 03 implemented

User story: As a student, I want a short explanation of room availability so I understand the decision.

The optional Explain availability button uses a labelled mock adapter. OpenAI Codex is the coding assistant; no live LLM/API integration is implemented or claimed. Existing booking rules remain unchanged.

See [FEATURE_CONTRACT.md](FEATURE_CONTRACT.md) for input arguments, closure-reason handling, output validation, fallback behavior, acceptance criteria and the Mermaid sequence diagram.

Input includes start/end/current time, room open/blocked state and a supplied closure reason (or null when unknown). The existing booking checker produces the authoritative verdict. The adapter only explains that verdict. An open room can still be unavailable for the requested slot.

Original booking AC1-AC6 are named B-AC1 through B-AC6; Practice 11 explanation AC1-AC5 are named E-AC1 through E-AC5 to avoid ambiguity.

## Explain availability - usage and verification

1. Enter current time 615, start 660 and end 720; click **Explain availability**.
2. The confirmed status stays Available; a separate **Mock explanation** panel explains it.
3. Toggle **Open** to **Blocked** and optionally enter a fictional closure reason. Missing reason is explicitly reported as not provided.
4. Expand **Demo failure scenarios** for timeout, error or unavailable-key simulations. Timeout is 3 seconds. Failure shows **Rule-based fallback**, retaining the confirmed verdict.
5. Changing the input or room state clears old explanations. Invalid input disables the button.

Verification on 2026-11-18, run in this authoritative project: typecheck and lint passed; 65/65 tests passed (38 existing + 27 new); production build passed in 1.77 seconds with the existing Browserslist warning. Browser checks covered success, supplied closure reason, timeout fallback, clearing old results and fractional input. Desktop and 375 px mobile screenshots are stored in the parent evidence directory.

Files: src/explanation.ts (contract, mapping, mock and fallback), src/ExplanationPanel.tsx (UI and request lifecycle), src/App.tsx (integration and closure input), src/fixtures.ts (optional closure metadata), src/explanation.test.ts (27 tests). src/booking.tsx and the original booking tests are unchanged.

The mock output validator requires exact deterministic wording; it is not a general semantic validator for arbitrary live LLM output. Reason codes map existing validator message prefixes and will reject unknown messages if the validator wording changes. No real API latency, token cost or live-model quality evaluation is claimed. Task 04 prompt-design comparison is documented in [PROMPT_ENGINEERING.md](PROMPT_ENGINEERING.md). It compares three prompts qualitatively with illustrative Codex responses, not live API measurements. Formal agent review remains a later practice step.
## Practice 11 baseline

Student screenshots: 38 tests passed; typecheck returned without diagnostics; build succeeded in 1.69 seconds with a Browserslist warning. Lint shows a TypeScript compatibility warning; its final exit code is not visible. These are screenshot observations, not an independent rerun. Source checkpoint and screenshots are in the parent Practice 11 folder.

The setup commands below still apply. The following Practice 10 section is historical context; its after-mitigation results are not Practice 11 feature-test results.

---
## Historical context: Practice Work 10

This project checks time-slot availability for one fictional room. It uses a read-only booking schedule and runs locally with React, TypeScript, and Vite. Practice 10 reviews the Practice 09 baseline, documents its risks, and fixes two input-validation defects.

## Run locally

Run the following from the repository root with Node.js and npm installed:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. To check the production build locally:

```sh
npm run build
npm run preview
```

The development page showed a blank screen in one normal Edge profile. The browser console reported `ERR_BLOCKED_BY_CLIENT` for a `lucide-react` icon module. InPrivate development mode and the production preview in normal Edge opened successfully. The exact browser rule that blocked the request remains unverified. If this occurs, use the production preview for the UI demonstration.

## Automated checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

| Check | Baseline | After mitigation |
| --- | --- | --- |
| `npm test` | 38/38 passed in one file | 38/38 passed in one file |
| `npm run lint` | No lint errors visible. TypeScript compatibility warning shown. Exit code not captured. | Exit code 0 |
| `npm run typecheck` | Passed | Exit code 0 |
| `npm run build` | Passed with a Browserslist data warning | Passed with the same warning |

The baseline was recorded from the local project before changes. The Practice 09 report recorded 34 tests in Bolt.new. The actual Practice 10 baseline run had 38. After the fix, test and build were run on a source-matched local copy because the tool session could not write Vite's temporary config file in the project directory. Lint and type checking ran in the project directory. The existing suite checks booking rules. The two new input cases were verified manually in the browser.

## Risk review and mitigation

Scores are likelihood × impact, using 1 (low), 2 (medium), and 3 (high). R1 and R2 were selected first because both caused the UI to report availability from invalid input.

| ID and category | Evidence and effect | Score | Mitigation and verification | Owner |
| --- | --- | ---: | --- | --- |
| R1 · Correctness | The original `src/App.tsx` passed `currentTimeVal ?? 0` to `evaluateRequest`. Empty current time could produce Available. Confirmed in the browser. | 9 → 3 | Reject invalid current time before evaluating availability. Repeat the empty-current-time case. | Developer |
| R2 · Correctness | The original `src/App.tsx` used `parseInt`. The browser showed a 60-minute available slot for a start value of 660.5. | 6 → 2 | Parse whole minutes without truncation. Repeat the fractional case and a valid integer control. | Developer |
| R3 · Reliability | `vite.config.ts` excludes `lucide-react` from dependency optimization. A request for `fingerprint.js` was blocked in normal Edge dev mode. The blocker itself remains unverified. | 4 | Document the observed modes and use the verified preview for the demo. Compare console results if the issue recurs. | Developer |
| R4 · Maintainability | The starting README described a four-room Assignment 04 project and a `final/` subfolder. This source has one room and root-level package scripts. | 3 | This README documents the actual project. Verify setup and commands from the root. | Project owner |
| R5 · Tooling | A baseline lint run warned that the installed TypeScript 5.6.3 was outside the parser's displayed support range. A lint malfunction was not demonstrated. | 2 | Record the warning and verify compatibility before changing package versions. Repeat lint and type checking after any such change. | Developer |

The audit during package installation also reported dependency vulnerabilities. Their applicability to the application was not established. No dependency update was used to mitigate R1 or R2.

### Manual evidence

With the room open in the rebuilt preview:

| Case | Before | After |
| --- | --- | --- |
| Current time empty, start 660, end 720 | Available | Unavailable with a current-time message |
| Current time 615, start 660.5, end 720 | Available, start truncated to 660 | Unavailable with a whole-minute message |
| Current time 615, start 660, end 720 | Available | Available |

Before mitigation, the same integer request was also rejected when the room was blocked. At a 375 px emulated viewport, the controls, verdict, and bookings list were readable in a single column. Post-change screenshots demonstrated the three desktop cases above.

## Agent readiness and playbook

**Level 2.** The baseline has executable tests, lint, type checking, and a production build. The original README did not describe this source accurately, clean-install reproducibility has not been independently recorded, and the normal Edge development issue remains. `AGENTS.md` was reviewed with the project owner and updated with AC1–AC6, permitted verification commands, fictional-data and secret restrictions, and the human review gate.

## Task 09 — Background agent scenario

This is a proposed workflow for an asynchronous coding agent. The Practice 10 changes were reviewed interactively.

1. Start from a recorded commit and isolate the work on a separate branch and worktree, such as `practice10/input-validation`. Limit changes to approved files in `src/` and targeted tests. Treat `AGENTS.md` as read-only unless its edit is separately approved.
2. Permit `git status`, `git diff`, `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Keep credentials, personal data, deployments, external publishing, and merges outside the agent's scope.
3. Return the diff, changed-file summary, actual check output and build result, before/after UI evidence where applicable, and updated risk scores. Identify checks that did not run and any remaining uncertainty.
4. A human reviewer checks the diff, AC1–AC6, the test and build results, and the residual risks before approving a merge. Any deployment requires a separate decision and authorization.

## Release decision

**CONDITIONAL** for a local demonstration using the production preview. Both input defects were reproduced and verified after mitigation, the 38 existing tests passed, and type checking, lint, and build succeeded. The developer owns the remaining browser-profile investigation. The preview provides a verified path while that investigation is open.




## Task 07 repair status
R1-R3 review findings addressed; 76/76 tests, lint, typecheck and build passed. See [REPAIR_VERIFICATION.md](REPAIR_VERIFICATION.md). The earlier 65-test result records the pre-repair stage.

