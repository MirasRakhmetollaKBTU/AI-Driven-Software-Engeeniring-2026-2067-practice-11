# Task 06 - Read-only agentic code review

Reviewer: OpenAI Codex, same interactive coding assistant that implemented the feature; no independent second-agent review is claimed.
Scope: implementation versus baseline-before-practice11.zip, README, AGENTS.md, FEATURE_CONTRACT, explanation tests and recorded UI evidence. Application source was not changed during review. Temporary execution copies and reproduction scripts were created outside the project.

## Review instruction
Act as a read-only agentic code reviewer. Inspect the proposed diff in context, repository instructions and tests. Review correctness, security, maintainability and performance. For each issue, provide severity, affected file, evidence, reproduction/verification and a minimal recommendation. Do not edit source. Clearly distinguish confirmed findings from hypotheses.

## Confirmed findings

### R1 - Inconsistent time/result context passes validation
Severity: Medium. Category: correctness / trust boundary. E-AC2/E-AC3.
Location: src/explanation.ts:24-38; :92-107.
Reproduction: build valid context for 615/660/720; change startMinute to 720 and endMinute to 660 while retaining AVAILABLE. validateExplanationInput accepts it; explainAvailability returns source=mock and "The room is available from 12:00 to 11:00 according to the booking rules."
Cause: consistency checks cover codes/boolean/blocked flag, but do not compare time-derived failures with the supplied decision.
Reachability: confirmed exported-service defect. The current UI builds context through validateBooking, so this reproduction is not evidence that the normal UI shows this incorrect verdict.
Minimal fix for Task 07: verify time-derived facts against the provided result without changing the original booking checker; require all applicable time failure codes and reject impossible AVAILABLE context. Do not claim overlap can be recomputed without bookings in this contract. Add regression cases for reversed, past and >120-minute AVAILABLE contexts and omitted failure codes.

### R2 - HTML-shaped closure metadata survives plain-text contract
Severity: Medium. Category: output quality / untrusted text handling. E-AC2/E-AC3.
Location: src/explanation.ts:21, :68-70, :105-109; src/ExplanationPanel.tsx:42.
Reproduction: blocked room, closureReason="<b>Scheduled maintenance</b>"; buildExplanationInput accepts it and explainAvailability returns a mock explanation containing those tags.
Cause: text guard rejects control characters only; exact-output equality accepts markup already embedded in expected wording. Fallback returns the same wording.
Impact: violates the documented no-HTML output contract and allows raw markup into the explanation text. React renders the string as text: execution/XSS was NOT demonstrated.
Minimal fix: reject markup delimiters in room/closure text or use a clearly documented plain-text normalization policy, while continuing to allow < and > in trusted validator messages. Validate canonical/fallback wording too. Add tests for HTML-shaped closure metadata and both normal/fallback output.

### R3 - Punctuation-only closure reason is accepted and then lost
Severity: Low. Category: input validation / factual fidelity. E-AC2/E-AC3.
Location: src/explanation.ts:21, :30, :68-70.
Reproduction: closureReason="..." passes input validation; punctuation normalization produces an empty string; output says "A closure reason was not provided."
Impact: malformed metadata is accepted rather than rejected; the output describes a supplied value as absent. No booking decision is changed.
Minimal fix: reject closure reasons without meaningful content after normalization, with a clear validation message; add punctuation-only regression cases.

## Additional findings evaluated

| Claim | Classification | Evidence / conclusion |
| --- | --- | --- |
| Booking rules were changed by the explanation feature | Unsupported | Baseline/current booking.tsx and booking.test.tsx match after newline normalization. The existing 38 tests previously passed. |
| Closure HTML causes script execution | Unsupported | ExplanationPanel renders a React text child, without dangerouslySetInnerHTML. Markup leakage is confirmed; executable XSS is not. |
| String-prefix reason mapping is fragile | Plausible maintenance risk | explanation.ts:42-48 depends on message prefixes; unknown wording throws. No present mismatch was found. |
| Stale responses overwrite a new verdict | Not confirmed | App keys the panel by current raw inputs/room; unmount invalidates requestId; mode changes invalidate requestId too. Dedicated automated UI race test is missing. |
| Requests survive input changes temporarily | Confirmed by inspection, low impact | UI ignores old responses but does not cancel old adapter work on unmount; internal timeout bounds it to 3 seconds in the mock. No live-provider cost exists in this implementation. |

## Verification evidence and limits

The review reproduction script transpiled current TypeScript into a temporary CommonJS directory using the project's installed TypeScript, then executed the exported functions with Node. It reproduced R1-R3 and checked baseline equality for booking.tsx and booking.test.tsx. Output is saved in task06-reproduction.txt. This is targeted execution, not a newly rerun full suite. Previously recorded checks: 65/65 tests, lint, typecheck and build passed; student screenshots show 11 UI scenarios. Existing tests do not cover R1-R3.

Security review found no live provider path in this feature. React text rendering and bounded metadata are useful controls. This is not a complete dependency or secret audit. Performance review found local mock latency and a bounded timeout; no real API latency or cost measurement is claimed.

## Decision and next step

Task 06 review complete; acceptance remains conditional. Select R1 and R2 for Task 07 focused fixes and regression tests. R3 can be addressed alongside closure-input validation if scope remains small, or retained explicitly as unresolved. Rerun old and new tests, lint, typecheck and build, inspect UI, and present the diff/results to the human reviewer before merge. No merge, publication or source fix was performed in Task 06.
