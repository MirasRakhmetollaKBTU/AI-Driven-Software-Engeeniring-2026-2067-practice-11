import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_ROOM } from './fixtures';
import { buildExplanationInput, createMockAdapter, explainAvailability, validateExplanationInput } from './explanation';

const valid = () => buildExplanationInput(SAMPLE_ROOM, 660, 720, 615);
describe('Practice 11 explanation contract', () => {
  it.each([[720, 660], [600, 610], [780, 901]])('rejects forged AVAILABLE times %s-%s before calling the adapter', async (startMinute, endMinute) => {
    const adapter = vi.fn(async () => ({ explanation: 'Incorrect' }));
    await expect(explainAvailability({ ...valid(), startMinute, endMinute }, adapter)).rejects.toThrow('supplied times');
    expect(adapter).not.toHaveBeenCalled();
  });
  it('rejects omitted and spurious time failure codes', () => {
    const input = buildExplanationInput({ ...SAMPLE_ROOM, status: 'blocked' }, 600, 610, 615);
    expect(() => validateExplanationInput({ ...input, reasonCodes: ['BLOCKED'], confirmedReasons: ['Blocked'] })).toThrow('supplied times');
    expect(() => validateExplanationInput({ ...valid(), isAvailable: false, reasonCodes: ['PAST_TIME'], confirmedReasons: ['Past'] })).toThrow('supplied times');
  });
  it.each(['<b>Scheduled maintenance</b>', '<script>alert(1)</script>', '...', '!!!'])('rejects malformed closure reason %s', reason => {
    expect(() => buildExplanationInput({ ...SAMPLE_ROOM, status: 'blocked', closureReason: reason }, 660, 720, 615)).toThrow('plain text');
  });
  it('rejects HTML-shaped room labels', () => {
    expect(() => buildExplanationInput({ ...SAMPLE_ROOM, name: '<b>Room</b>' }, 660, 720, 615)).toThrow('plain text');
  });
  it.each(['success', 'error'] as const)('preserves safe closure text in %s output', async mode => {
    const input = buildExplanationInput({ ...SAMPLE_ROOM, status: 'blocked', closureReason: 'Scheduled maintenance' }, 660, 720, 615);
    const result = await explainAvailability(input, createMockAdapter(mode));
    expect(result.explanation).toContain('Scheduled maintenance');
    expect(result.explanation).not.toMatch(/[<>]/);
    expect(result.source).toBe(mode === 'success' ? 'mock' : 'fallback');
  });
  it('explains an available endpoint-touching slot', async () => {
    const result = await explainAvailability(valid());
    expect(result.source).toBe('mock'); expect(result.explanation).toContain('11:00 to 12:00');
  });
  it.each([
    [730, 760, 'OVERLAP'], [720, 660, 'INVALID_TIME'], [600, 610, 'PAST_TIME'], [780, 901, 'TOO_LONG'],
  ])('retains rejection for %s-%s', async (start, end, code) => {
    const input = buildExplanationInput(SAMPLE_ROOM, start, end, 615);
    expect(input.isAvailable).toBe(false); expect(input.reasonCodes).toContain(code);
    expect((await explainAvailability(input)).explanation).toContain('unavailable');
  });
  it('uses a supplied fictional closure reason', async () => {
    const input = buildExplanationInput({ ...SAMPLE_ROOM, status: 'blocked', closureReason: 'Scheduled maintenance' }, 660, 720, 615);
    expect((await explainAvailability(input)).explanation).toContain('Scheduled maintenance');
  });
  it('does not invent an unknown closure reason', async () => {
    const input = buildExplanationInput({ ...SAMPLE_ROOM, status: 'blocked' }, 660, 720, 615);
    expect((await explainAvailability(input)).explanation).toBe('The room is closed. A closure reason was not provided.');
  });
  it.each([null, 660.5, NaN, Infinity, -1, 1441])('rejects invalid start %s', start => {
    expect(() => buildExplanationInput(SAMPLE_ROOM, start, 720, 615)).toThrow();
  });
  it.each(['', ' ', 'x'.repeat(101)])('rejects invalid room labels', name => {
    expect(() => buildExplanationInput({ ...SAMPLE_ROOM, name }, 660, 720, 615)).toThrow();
  });
  it('rejects oversized closure metadata', () => {
    expect(() => buildExplanationInput({ ...SAMPLE_ROOM, status: 'blocked', closureReason: 'x'.repeat(201) }, 660, 720, 615)).toThrow();
  });
  it('rejects extra fields and inconsistent decisions', () => {
    expect(() => validateExplanationInput({ ...valid(), extra: true })).toThrow();
    expect(() => validateExplanationInput({ ...valid(), isAvailable: false })).toThrow();
  });
  it.each(['error', 'missing-key'] as const)('falls back on %s', async mode => {
    expect((await explainAvailability(valid(), createMockAdapter(mode))).source).toBe('fallback');
  });
  it('falls back and aborts after the deadline', async () => {
    vi.useFakeTimers();
    try {
      const result = explainAvailability(valid(), createMockAdapter('timeout'));
      await vi.advanceTimersByTimeAsync(3000);
      expect((await result).source).toBe('fallback'); expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it.each([null, { explanation: '' }, { explanation: 'The room is closed for repairs.' }, { explanation: 'x'.repeat(401) }, { explanation: '<script>alert(1)</script>' }])('rejects invalid/unsupported adapter output', async response => {
    const result = await explainAvailability(valid(), async () => response);
    expect(result.source).toBe('fallback'); expect(result.explanation).toContain('available from');
  });
  it('protects input and bookings against adapter mutation', async () => {
    const before = JSON.stringify(SAMPLE_ROOM); const input = valid(); const saved = JSON.stringify(input);
    const result = await explainAvailability(input, async value => { value.reasonCodes.push('BLOCKED'); return {}; });
    expect(result.source).toBe('fallback'); expect(JSON.stringify(input)).toBe(saved); expect(JSON.stringify(SAMPLE_ROOM)).toBe(before);
  });
});
