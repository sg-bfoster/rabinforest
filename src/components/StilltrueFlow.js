import React from 'react';

// Flowchart: what ships in the stilltrue package (drift lane + verify pipeline)
// and where the one AI judge plugs in from the host app.
const StilltrueFlow = () => (
  <svg
    viewBox="0 0 900 640"
    role="img"
    aria-label="Flowchart: the stilltrue package contains a deterministic drift lane and a verify pipeline with an empty stage slot. The Gemini judge model sits outside the package, in the host app, and is plugged into that slot. The GitHub Actions drift run never touches the judge."
  >
    <defs>
      <marker id="st-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
      </marker>
      <marker id="st-arr-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--color-accent)" />
      </marker>
    </defs>

    {/* package boundary */}
    <rect x="200" y="46" width="470" height="470" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="7 5" />
    <text x="212" y="70" fontSize="12" fontWeight="700" letterSpacing="1.5" fill="currentColor">THE STILLTRUE PACKAGE</text>
    <text x="212" y="86" fontSize="11" fill="var(--color-neutral-600)">no AI inside — harness, comparisons, pipeline, report</text>

    {/* drift lane */}
    <text x="212" y="122" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="currentColor">DRIFT · DETERMINISTIC</text>

    <rect x="16" y="140" width="150" height="44" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="91" y="158" fontSize="12" textAnchor="middle" fill="currentColor">curated facts</text>
    <text x="91" y="173" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">school-board.json</text>

    <rect x="16" y="200" width="150" height="44" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="91" y="218" fontSize="12" textAnchor="middle" fill="currentColor">live source pages</text>
    <text x="91" y="233" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">gcpsk12.org …</text>

    <rect x="228" y="140" width="150" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="303" y="158" fontSize="12" textAnchor="middle" fill="currentColor">fetch page,</text>
    <text x="303" y="173" fontSize="12" textAnchor="middle" fill="currentColor">extract text</text>

    <rect x="440" y="140" width="180" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="530" y="158" fontSize="12" textAnchor="middle" fill="currentColor">string compare</text>
    <text x="530" y="173" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">“Radloff” still in text? contains-all</text>

    <line x1="166" y1="162" x2="224" y2="162" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <line x1="166" y1="222" x2="200" y2="222" stroke="currentColor" strokeWidth="1.5" />
    <line x1="200" y1="222" x2="260" y2="188" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <line x1="378" y1="162" x2="436" y2="162" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <line x1="620" y1="162" x2="712" y2="162" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <rect x="716" y="118" width="168" height="92" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="728" y="138" fontSize="12" fontWeight="700" fill="currentColor">CI verdict</text>
    <text x="728" y="157" fontSize="12" fill="#2e7d32">✓ pass — all facts found</text>
    <text x="728" y="175" fontSize="12" fill="var(--color-accent-700)">✕ rot — build fails, human fixes</text>
    <text x="728" y="193" fontSize="12" fill="var(--color-neutral-600)">⚠ error — page unreachable</text>

    <text x="303" y="212" fontSize="11" fill="var(--color-neutral-600)">runs weekly in GitHub Actions</text>
    <text x="303" y="227" fontSize="11" fill="var(--color-neutral-600)">(npx stilltrue drift) — zero AI calls</text>

    <line x1="212" y1="268" x2="658" y2="268" stroke="var(--color-neutral-300)" strokeWidth="1" />

    {/* verify lane */}
    <text x="212" y="296" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="currentColor">VERIFY · A PIPELINE OF SLOTS</text>

    <rect x="16" y="316" width="150" height="58" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="91" y="338" fontSize="12" textAnchor="middle" fill="currentColor">AI-drafted answer</text>
    <text x="91" y="353" fontSize="12" textAnchor="middle" fill="currentColor">+ its sources</text>
    <line x1="166" y1="345" x2="224" y2="345" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="228" y="316" width="140" height="58" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="298" y="338" fontSize="12" textAnchor="middle" fill="currentColor">stage: format check</text>
    <text x="298" y="353" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">regex / schema — no AI</text>
    <line x1="368" y1="345" x2="426" y2="345" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="430" y="316" width="140" height="58" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="5 4" />
    <text x="500" y="338" fontSize="12" textAnchor="middle" fill="currentColor">stage: ( empty slot )</text>
    <text x="500" y="353" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">your app fills this</text>
    <line x1="570" y1="345" x2="628" y2="345" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="632" y="322" width="24" height="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="644" y="351" fontSize="12" textAnchor="middle" fill="currentColor">?</text>

    <line x1="656" y1="334" x2="712" y2="322" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <text x="720" y="318" fontSize="12" fill="#2e7d32">supported → publish</text>
    <line x1="656" y1="356" x2="712" y2="368" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <text x="720" y="380" fontSize="12" fill="var(--color-accent-700)">rejected → retry / rewrite</text>
    <text x="720" y="396" fontSize="11" fill="var(--color-neutral-600)">(fails open if the judge is down)</text>

    <text x="212" y="404" fontSize="11" fill="var(--color-neutral-600)">stilltrue only orchestrates: run stages in order, short-circuit on failure,</text>
    <text x="212" y="419" fontSize="11" fill="var(--color-neutral-600)">drive the generate → verify → retry loop. A stage is any function you supply.</text>

    {/* the judge, outside the boundary */}
    <rect x="330" y="556" width="280" height="64" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    <text x="470" y="580" fontSize="12.5" fontWeight="700" textAnchor="middle" fill="var(--color-accent)">Gemini judge · temperature 0</text>
    <text x="470" y="597" fontSize="11" textAnchor="middle" fill="currentColor">lives in the app (bfoster-services) — the only AI in the story</text>

    <line x1="500" y1="552" x2="500" y2="380" stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#st-arr-red)" />
    <text x="512" y="480" fontSize="11" fill="var(--color-accent)">plugged into the slot</text>
    <text x="512" y="495" fontSize="11" fill="var(--color-neutral-600)">AskGwinnett answer review ·</text>
    <text x="512" y="510" fontSize="11" fill="var(--color-neutral-600)">this Fact Check page</text>

    <text x="16" y="600" fontSize="11" fill="var(--color-neutral-600)">The weekly GitHub run executes the drift lane only —</text>
    <text x="16" y="615" fontSize="11" fill="var(--color-neutral-600)">it never reaches this box. No key, no tokens, no model.</text>
  </svg>
);

export default StilltrueFlow;
