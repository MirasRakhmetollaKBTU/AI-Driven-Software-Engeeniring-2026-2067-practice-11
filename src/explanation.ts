import { validateBooking } from './booking';
import { minutesToLabel } from './format';
import type { Room } from './fixtures';

export type ReasonCode = 'AVAILABLE' | 'INVALID_TIME' | 'PAST_TIME' | 'TOO_LONG' | 'BLOCKED' | 'OVERLAP';
export type ExplanationInput = {
  roomLabel: string;
  startMinute: number;
  endMinute: number;
  currentMinute: number;
  roomStatus: 'available' | 'blocked';
  closureReason: string | null;
  isAvailable: boolean;
  reasonCodes: ReasonCode[];
  confirmedReasons: string[];
};
export type DemoMode = 'success' | 'timeout' | 'error' | 'missing-key';
export type Adapter = (input: Readonly<ExplanationInput>, signal: AbortSignal) => Promise<unknown>;
const fields = ['roomLabel', 'startMinute', 'endMinute', 'currentMinute', 'roomStatus', 'closureReason', 'isAvailable', 'reasonCodes', 'confirmedReasons'];
const codes: ReasonCode[] = ['AVAILABLE', 'INVALID_TIME', 'PAST_TIME', 'TOO_LONG', 'BLOCKED', 'OVERLAP'];
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !Array.from(value).some(character => character.charCodeAt(0) < 32);
const minute = (value: unknown, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

export function validateExplanationInput(value: unknown): asserts value is ExplanationInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid explanation input.');
  const v = value as ExplanationInput;
  if (Object.keys(v).length !== fields.length || Object.keys(v).some(k => !fields.includes(k)) ||
      !text(v.roomLabel, 100) || !minute(v.startMinute, 1440) || !minute(v.endMinute, 1440) || !minute(v.currentMinute, 1439) ||
      !['available', 'blocked'].includes(v.roomStatus) || typeof v.isAvailable !== 'boolean' ||
      !(v.closureReason === null || text(v.closureReason, 200)) || (v.roomStatus === 'available' && v.closureReason !== null) ||
      !Array.isArray(v.reasonCodes) || !v.reasonCodes.length || v.reasonCodes.length > 5 || v.reasonCodes.some(c => !codes.includes(c)) || new Set(v.reasonCodes).size !== v.reasonCodes.length ||
      !Array.isArray(v.confirmedReasons) || v.confirmedReasons.length > 5 || v.confirmedReasons.some(r => !text(r, 300))) {
    throw new Error('Use whole-minute times, a valid room label and a closure reason of at most 200 characters.');
  }
  if (v.isAvailable !== (v.reasonCodes.length === 1 && v.reasonCodes[0] === 'AVAILABLE') ||
      (v.isAvailable ? v.confirmedReasons.length !== 0 : v.confirmedReasons.length !== v.reasonCodes.length) ||
      (!v.isAvailable && v.reasonCodes.includes('AVAILABLE')) ||
      (v.roomStatus === 'blocked') !== v.reasonCodes.includes('BLOCKED')) throw new Error('Inconsistent confirmed result.');
  if (/[<>]/.test(v.roomLabel) || (v.closureReason !== null &&
      (/[<>]/.test(v.closureReason) || !/[\p{L}\p{N}]/u.test(v.closureReason)))) {
    throw new Error('Use plain text for room details and a meaningful closure reason without HTML.');
  }
  // Reuse the authoritative checker for time facts; overlap needs the original bookings.
  const timeResult = validateBooking({ start: v.startMinute, end: v.endMinute,
    now: v.currentMinute, blocked: false, bookings: [] });
  const timeCodes = timeResult.ok ? [] : timeResult.reasons.map(reasonCode);
  for (const code of ['INVALID_TIME', 'PAST_TIME', 'TOO_LONG'] as const) {
    if (v.reasonCodes.includes(code) !== timeCodes.includes(code)) {
      throw new Error('Confirmed result does not match the supplied times.');
    }
  }
}

// Map the existing validator's messages; do not reimplement its booking decisions.
function reasonCode(reason: string): ReasonCode {
  if (reason.startsWith('Times must satisfy')) return 'INVALID_TIME';
  if (reason.startsWith('Start time must be after')) return 'PAST_TIME';
  if (reason.startsWith('Booking duration cannot exceed')) return 'TOO_LONG';
  if (reason.startsWith('This room is currently blocked')) return 'BLOCKED';
  if (reason.startsWith('Overlaps with existing booking')) return 'OVERLAP';
  throw new Error('Unknown booking reason; use the confirmed status above.');
}

export function buildExplanationInput(room: Room, start: number | null, end: number | null, now: number | null): ExplanationInput {
  if (!minute(start, 1440) || !minute(end, 1440) || !minute(now, 1439)) throw new Error('Enter valid current, start and end times in whole minutes.');
  const result = validateBooking({ start: start!, end: end!, now: now!, blocked: room.status === 'blocked', bookings: room.bookings });
  const input: ExplanationInput = {
    roomLabel: room.name, startMinute: start!, endMinute: end!, currentMinute: now!, roomStatus: room.status,
    closureReason: room.status === 'blocked' ? room.closureReason ?? null : null,
    isAvailable: result.ok, reasonCodes: result.ok ? ['AVAILABLE'] : result.reasons.map(reasonCode),
    confirmedReasons: result.ok ? [] : [...result.reasons],
  };
  validateExplanationInput(input);
  return input;
}

export function ruleExplanation(input: ExplanationInput): string {
  if (input.isAvailable) return `The room is available from ${minutesToLabel(input.startMinute)} to ${minutesToLabel(input.endMinute)} according to the booking rules.`;
  if (input.reasonCodes.includes('BLOCKED')) {
    // Normalize sentence punctuation in user-supplied metadata to keep the two-sentence limit.
    const reason = input.closureReason?.trim().replace(/[.!?]+/g, ';').replace(/;+$/, '');
    const other = input.reasonCodes.length > 1 ? ' Other booking rules also reject this request;' : '';
    return reason ? `The room is closed: ${reason}.${other} This request is unavailable.` : `The room is closed.${other} A closure reason was not provided.`;
  }
  const descriptions: Partial<Record<ReasonCode, string>> = {
    INVALID_TIME: 'the start must be before the end within the day', PAST_TIME: 'the start must be after the current time',
    TOO_LONG: 'the duration exceeds 120 minutes', OVERLAP: 'the slot overlaps an existing booking',
  };
  return `The request is unavailable because ${input.reasonCodes.map(c => descriptions[c]).join('; ')}.`;
}

export function createMockAdapter(mode: DemoMode = 'success'): Adapter {
  return (input, signal) => new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new Error('Cancelled')); };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (mode === 'error' || mode === 'missing-key') reject(new Error(mode));
      else resolve({ explanation: ruleExplanation(input) });
    }, mode === 'timeout' ? 10000 : 300);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function explainAvailability(input: ExplanationInput, adapter: Adapter = createMockAdapter(), timeoutMs = 3000): Promise<{ explanation: string; source: 'mock' | 'fallback' }> {
  validateExplanationInput(input);
  const snapshot = { ...input, reasonCodes: [...input.reasonCodes], confirmedReasons: [...input.confirmedReasons] };
  const expected = ruleExplanation(snapshot);
  Object.freeze(snapshot.reasonCodes); Object.freeze(snapshot.confirmedReasons); Object.freeze(snapshot);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => adapter(snapshot, controller.signal)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Timeout')); }, timeoutMs); }),
    ]);
    // Strict mock contract: only the deterministic wording is allowed. This is not a general LLM fact checker.
    if (!result || typeof result !== 'object' || Object.keys(result).length !== 1 || !('explanation' in result) ||
        !text(result.explanation, 400) || result.explanation !== expected) throw new Error('Invalid explanation output');
    return { explanation: result.explanation, source: 'mock' };
  } catch {
    return { explanation: expected, source: 'fallback' };
  } finally { clearTimeout(timer); controller.abort(); }
}

