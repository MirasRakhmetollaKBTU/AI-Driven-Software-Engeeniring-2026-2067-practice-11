## Project
Smart Campus room availability checker; one room, fictional data.
## Constraints
Keep one fictional room. Do not add a backend, login, database, or booking creation.
Use fictional data only. Do not access, add, or commit credentials or secrets.
Do not deploy or publish the project externally.

## Original booking acceptance criteria (B-AC1 to B-AC6)
- B-AC1: Reject requests with start >= end or start <= current time.
- B-AC2: Reject requests longer than 120 minutes.
- B-AC3: Reject requests for a blocked room.
- B-AC4: Reject overlaps. Allow intervals that touch only at endpoints.
- B-AC5: Do not mutate existing booking data.
- B-AC6: Keep availability feedback clear on desktop and mobile.
## Engineering rules
Prefer pure functions and minimal changes; use at most 2 justified patterns.
Do not mutate booking fixtures; keep responsive UI feedback.
## Verification
Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
Add a focused regression test when fixing a confirmed defect, where feasible.
Report changed files, rationale, and actual test results.
Run the tests before proposing acceptance. Present the diff and results
for human review and obtain approval before merging changes.
## Practice 11 explanation feature
Follow FEATURE_CONTRACT.md. The mock feature is implemented; keep implementation and recorded verification aligned.
- E-AC1: Existing availability and overlap rules remain completely unchanged.
- E-AC2: Explanations agree with the deterministic result; invent no booking details or closure reasons.
- E-AC3: Reject empty, malformed and overly long input using the contract limits.
- E-AC4: Timeout, error or unavailable-key simulation produces a safe deterministic fallback.
- E-AC5: Separate confirmed status from explanation. Explicitly label mock output "Mock explanation" and fallback "Rule-based fallback".
Use supplied room closure metadata only. Unknown closureReason is null and must be described as not provided. Open room status is not a slot-availability decision.
Start with a mock adapter: no real API, credentials, backend, login or database is needed.
Validate output as untrusted plain text; preserve the verdict and booking data. Reject contradictory/unsupported output and ignore stale responses.
Keep original B-AC1 to B-AC6 distinct from E-AC1 to E-AC5 in tests and documentation.
For future implementation, add focused tests for the contract and failure paths, rerun all verification commands, and review desktop/mobile feedback.
Record actual prompts, evidence and limitations; do not report mock results as live model evaluations.

