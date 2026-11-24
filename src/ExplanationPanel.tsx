import { useEffect, useRef, useState } from 'react';
import type { Room } from './fixtures';
import { buildExplanationInput, createMockAdapter, explainAvailability, type DemoMode } from './explanation';

export default function ExplanationPanel({ room, start, end, now }: { room: Room; start: number | null; end: number | null; now: number | null }) {
  const [mode, setMode] = useState<DemoMode>('success');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof explainAvailability>> | null>(null);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);
  let input: ReturnType<typeof buildExplanationInput> | null = null;
  let error = '';
  try { input = buildExplanationInput(room, start, end, now); }
  catch (cause) { error = cause instanceof Error ? cause.message : 'Invalid input.'; }

  async function explain() {
    if (!input) return;
    const id = ++requestId.current;
    setBusy(true); setResult(null);
    const response = await explainAvailability(input, createMockAdapter(mode));
    if (requestId.current === id) { setResult(response); setBusy(false); }
  }

  return <section className="mt-5 border-t border-slate-200 pt-4" aria-label="Availability explanation">
    <h4 className="font-semibold text-slate-800">Understand this result</h4>
    <p className="mt-1 text-xs text-slate-500">Mock demo - no AI service is called. The confirmed status above is authoritative.</p>
    <details className="mt-3 text-sm text-slate-600">
      <summary className="cursor-pointer">Demo failure scenarios</summary>
      <label className="block mt-2" htmlFor="explanation-mode">Mock response</label>
      <select id="explanation-mode" value={mode} className="mt-1 w-full rounded border border-slate-300 p-2" onChange={e => {
        requestId.current += 1; setBusy(false); setResult(null); setMode(e.target.value as DemoMode);
      }}>
        <option value="success">Success</option><option value="timeout">Timeout (3 seconds)</option>
        <option value="error">Simulated API error</option><option value="missing-key">Simulated unavailable key</option>
      </select>
    </details>
    <button type="button" onClick={() => void explain()} disabled={!input || busy} className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
      {busy ? 'Explaining...' : 'Explain availability'}
    </button>
    <div aria-live="polite" aria-busy={busy} className="mt-3 text-sm">
      {error && <p className="text-rose-700">{error}</p>}
      {result && <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
        <p className="font-semibold text-sky-900">{result.source === 'mock' ? 'Mock explanation' : 'Rule-based fallback'}</p>
        <p className="mt-1 text-slate-700 break-words">{result.explanation}</p>
        {result.source === 'fallback' && <p className="mt-2 text-xs text-slate-600">The mock response was unavailable or invalid. This explanation uses the confirmed booking rules.</p>}
      </div>}
    </div>
  </section>;
}
