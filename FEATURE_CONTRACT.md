# Practice 11 - Explain availability contract

Status: Task 03 mock feature implemented; 27 feature tests and browser checks recorded on 2026-11-18.
Coding assistant: OpenAI Codex. Runtime mode: mock; no live LLM request.

## User story

As a student, I want a short explanation of room availability so I understand the decision.

## Inputs and authority

The UI accepts start/end/current time. Room status and closure reason come from the fictional room state. The existing checker receives the time, blocked flag and read-only bookings and remains the only authority for availability.

| Field | Contract |
| --- | --- |
| roomLabel | Required trimmed string, 1-100 characters. |
| startMinute / endMinute | Required finite integer minutes after midnight, 0-1440. No truncation of fractions or conversion of empty input to zero. |
| currentMinute | Required finite integer, 0-1439, used by the existing checker for past-time decisions. |
| roomStatus | `available` (open) or `blocked` (closed). Open does not mean the requested slot is free. |
| closureReason | For a blocked room: supplied fictional text, 1-200 trimmed characters, or null when unknown. For an open room: null. Never infer a reason from the room name or invent maintenance details. |
| isAvailable | Boolean computed by the existing checker, never supplied or changed by the explanation adapter. |
| reasonCodes | Derived from the deterministic rule evaluation: AVAILABLE, INVALID_TIME, PAST_TIME, TOO_LONG, BLOCKED, OVERLAP. Preserve all applicable failures; AVAILABLE cannot coexist with failure codes. |
| confirmedReasons | Existing deterministic failure messages; at most 5 strings, each at most 300 characters. No invented booking titles or intervals. |

These limits are design choices for this exercise. Reject wrong types, whitespace-only required strings, invalid enum values, unexpected fields, excessive lengths and inconsistent status/result combinations. Null closureReason is a deliberate unknown value, not an empty required field.

Malformed input never reaches the adapter. Well-formed but invalid requests (e.g. start >= end, past start, excessive duration) retain the checker's rejection and may receive an explanation of that rejection. Existing booking decisions remain unchanged.

The Room type includes optional closureReason metadata without changing booking rules. A blocked room without a supplied reason must say: "The room is closed. A closure reason was not provided."

## Output and failure behavior

Adapter output: `{ "explanation": "..." }` only. Require a nonempty plain-text string, no more than 400 characters and at most two sentences. Reject malformed responses, unsupported facts and contradictions with the confirmed result. Treat all text as data, never as instructions or HTML.

The UI displays the confirmed deterministic verdict separately from a panel labelled **Mock explanation**. Loading and **Rule-based fallback** are distinct states. No real LLM is called in mock mode; unavailable API key is a simulated failure scenario, not a requirement to obtain credentials.

Use a 3-second timeout. Timeout, adapter error, unavailable-key simulation or invalid output produces a deterministic fallback built from confirmed reasons. No silent retry. Changing input or room state clears old explanations and ignores stale responses. Explanation generation never changes room status, bookings or the confirmed verdict.

Example: now=615, start=660, end=720, roomStatus=available, closureReason=null, isAvailable=true, reasonCodes=[AVAILABLE].

Output: `{ "explanation": "The room is available from 11:00 to 12:00 according to the booking rules." }`

For a blocked room with an explicitly supplied reason "Scheduled maintenance", the explanation may state that reason. The same claim is forbidden when the reason is null.

## Acceptance criteria

Keep the original booking criteria as B-AC1 through B-AC6; they are unchanged.

- E-AC1: Existing availability and overlap rules remain completely unchanged.
- E-AC2: The explanation agrees with the deterministic result; no invented booking details.
- E-AC3: Empty, malformed, or overly long input is rejected.
- E-AC4: API timeout, error, or unavailable key produces a safe fallback.
- E-AC5: The UI clearly distinguishes the AI-generated explanation from the confirmed deterministic booking status. In this implementation, explicitly label simulated output "Mock explanation".

## Sequence diagram

```mermaid
sequenceDiagram
    actor Student
    participant UI
    participant Guard as Input validation
    participant Rules as Existing booking checker
    participant Adapter as Mock explanation adapter
    participant Check as Output validation
    Student->>UI: Enter times; select demo room state / supplied closure reason
    UI->>Guard: Validate required fields, types and limits
    alt Malformed input
        Guard-->>UI: Validation message; no adapter call
        UI-->>Student: Show invalid-input feedback
    else Well-formed input
        Guard->>Rules: Times, current time, blocked flag, bookings
        Rules-->>UI: Confirmed verdict and reasons
        UI-->>Student: Display deterministic status
        Student->>UI: Click Explain availability
        UI->>Adapter: Structured result + room metadata (3 s deadline)
        alt Response received
            Adapter->>Check: explanation string
            Check->>Check: Check format, length and factual agreement
            alt Valid explanation
                Check-->>UI: Validated mock explanation
            else Invalid or contradictory output
                Check-->>UI: Rule-based fallback from confirmed result
            end
        else Timeout / error / unavailable-key simulation
            UI->>UI: Build rule-based fallback from confirmed result
        end
        UI-->>Student: Labelled explanation; verdict remains unchanged
    end
    Note over UI,Adapter: Ignore stale responses after input or room-state changes
```

## Verification scope

Cover available, overlap, blocked with reason, blocked without reason, reversed/invalid time, past time, empty input, fractional input, overly long text, timeout, adapter error, unavailable-key simulation, malformed/contradictory output and stale response. Preserve existing booking tests and verify data immutability and desktop/mobile feedback. Record expected and actual results separately.

Implemented verification: 27 feature tests and 38 unchanged booking tests passed. Browser success, closure reason, timeout fallback, result clearing and mobile fractional-input checks passed. Strict exact-wording output validation is specific to this mock; live LLM semantic validation is not implemented. The full formal evaluation matrix and three-prompt comparison remain later steps.


Task 07 validation: room labels and closure reasons reject angle-bracket markup; non-null closure reasons require at least one Unicode letter or number. Serialized time failure codes are checked by reusing the existing validator. 76 tests passed after repair.

