import React from 'react';

// Flowchart: what ships in the stilltrue package (drift lane + verify pipeline)
// and where the one AI judge plugs in from the host app.
// Composed for a 760-wide viewBox so it renders ~1:1 inside the 760px column.
const StilltrueFlow = () => (
  <svg
    viewBox="0 0 760 690"
    role="img"
    aria-label="Flowchart: the stilltrue package contains a deterministic drift lane, and a verify pipeline with an empty stage slot; golden regression evals are deliberately delegated to promptfoo or the app's own harness. The Gemini judge model sits outside the package, in the host app, and is plugged into that slot. The GitHub Actions drift run never touches the judge."
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
    <rect x="166" y="40" width="404" height="390" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="7 5" />
    <text x="178" y="64" fontSize="12" fontWeight="700" letterSpacing="1.5" fill="currentColor">THE STILLTRUE PACKAGE</text>
    <text x="178" y="80" fontSize="11" fill="var(--color-neutral-600)">no AI inside — harness, pipeline, report</text>

    {/* drift lane */}
    <text x="178" y="112" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="currentColor">DRIFT · DETERMINISTIC</text>

    <rect x="8" y="128" width="130" height="44" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="73" y="146" fontSize="12.5" textAnchor="middle" fill="currentColor">curated facts</text>
    <text x="73" y="161" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">school-board.json</text>

    <rect x="8" y="188" width="130" height="44" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="73" y="206" fontSize="12.5" textAnchor="middle" fill="currentColor">live source pages</text>
    <text x="73" y="221" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">gcpsk12.org …</text>

    <rect x="178" y="128" width="130" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="243" y="146" fontSize="12.5" textAnchor="middle" fill="currentColor">fetch page,</text>
    <text x="243" y="161" fontSize="12.5" textAnchor="middle" fill="currentColor">extract text</text>

    <rect x="340" y="128" width="150" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="415" y="146" fontSize="12.5" textAnchor="middle" fill="currentColor">string compare</text>
    <text x="415" y="161" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">“Radloff” still there?</text>

    <line x1="138" y1="150" x2="174" y2="150" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <line x1="138" y1="210" x2="168" y2="210" stroke="currentColor" strokeWidth="1.5" />
    <line x1="168" y1="210" x2="206" y2="176" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <line x1="308" y1="150" x2="336" y2="150" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <line x1="490" y1="150" x2="576" y2="150" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="580" y="104" width="172" height="96" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="592" y="124" fontSize="12.5" fontWeight="700" fill="currentColor">CI verdict</text>
    <text x="592" y="143" fontSize="12" fill="#2e7d32">✓ pass — facts found</text>
    <text x="592" y="161" fontSize="12" fill="var(--color-accent-700)">✕ rot — fails the build</text>
    <text x="592" y="179" fontSize="11" fill="var(--color-neutral-600)">⚠ error — page unreachable</text>

    <text x="178" y="198" fontSize="11" fill="var(--color-neutral-600)">runs weekly in GitHub Actions</text>
    <text x="178" y="213" fontSize="11" fill="var(--color-neutral-600)">(npx stilltrue drift) — zero AI calls</text>

    <line x1="178" y1="250" x2="558" y2="250" stroke="var(--color-neutral-300)" strokeWidth="1" />

    {/* verify lane */}
    <text x="178" y="278" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="currentColor">VERIFY · A PIPELINE OF SLOTS</text>

    <rect x="8" y="296" width="130" height="58" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1" />
    <text x="73" y="318" fontSize="12.5" textAnchor="middle" fill="currentColor">AI-drafted answer</text>
    <text x="73" y="333" fontSize="12.5" textAnchor="middle" fill="currentColor">+ its sources</text>
    <line x1="138" y1="325" x2="174" y2="325" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="178" y="296" width="140" height="58" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="248" y="318" fontSize="12.5" textAnchor="middle" fill="currentColor">stage: format check</text>
    <text x="248" y="333" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">regex / schema — no AI</text>
    <line x1="318" y1="325" x2="354" y2="325" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="358" y="296" width="140" height="58" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="5 4" />
    <text x="428" y="318" fontSize="12.5" textAnchor="middle" fill="currentColor">stage: ( empty slot )</text>
    <text x="428" y="333" fontSize="11" textAnchor="middle" fill="var(--color-neutral-600)">your app fills this</text>
    <line x1="498" y1="325" x2="518" y2="325" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />

    <rect x="522" y="302" width="22" height="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <text x="533" y="330" fontSize="12" textAnchor="middle" fill="currentColor">?</text>

    <line x1="544" y1="315" x2="574" y2="301" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <text x="580" y="298" fontSize="12" fill="#2e7d32">supported → publish</text>
    <line x1="544" y1="337" x2="574" y2="351" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#st-arr)" />
    <text x="580" y="358" fontSize="12" fill="var(--color-accent-700)">rejected → retry</text>
    <text x="580" y="374" fontSize="11" fill="var(--color-neutral-600)">(fails open if the</text>
    <text x="580" y="389" fontSize="11" fill="var(--color-neutral-600)">judge is down)</text>

    <text x="178" y="384" fontSize="11" fill="var(--color-neutral-600)">stilltrue only orchestrates: stages in</text>
    <text x="178" y="399" fontSize="11" fill="var(--color-neutral-600)">order, short-circuit on failure, and the</text>
    <text x="178" y="414" fontSize="11" fill="var(--color-neutral-600)">generate → verify → retry loop.</text>

    {/* golden: deliberately NOT in the package — delegated (docs/GOLDEN.md) */}
    <text x="178" y="462" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="currentColor">GOLDEN · DELIBERATELY NOT SHIPPED</text>
    <text x="178" y="482" fontSize="11" fill="var(--color-neutral-600)">regression evals are delegated: promptfoo,</text>
    <text x="178" y="497" fontSize="11" fill="var(--color-neutral-600)">or your own harness (AskGwinnett: ~117</text>
    <text x="178" y="512" fontSize="11" fill="var(--color-neutral-600)">cases; every fixed bug becomes a case).</text>
    <text x="178" y="527" fontSize="11" fill="var(--color-neutral-600)">promptfoo tests prompts —</text>
    <text x="178" y="542" fontSize="11" fill="var(--color-neutral-600)">stilltrue tests facts.</text>

    {/* the judge, outside the boundary */}
    <rect x="230" y="614" width="300" height="64" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    <text x="380" y="638" fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--color-accent)">Gemini judge · temperature 0</text>
    <text x="380" y="656" fontSize="11" textAnchor="middle" fill="currentColor">lives in your app (bfoster-services) — the only AI</text>

    <line x1="428" y1="610" x2="428" y2="360" stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#st-arr-red)" />
    <text x="440" y="562" fontSize="11" fill="var(--color-accent)">plugged into the slot</text>
    <text x="440" y="578" fontSize="11" fill="var(--color-neutral-600)">AskGwinnett answer review ·</text>
    <text x="440" y="593" fontSize="11" fill="var(--color-neutral-600)">this Fact Check page</text>

    <text x="8" y="628" fontSize="11" fill="var(--color-neutral-600)">The weekly GitHub run executes the drift</text>
    <text x="8" y="643" fontSize="11" fill="var(--color-neutral-600)">lane only — it never reaches this box.</text>
    <text x="8" y="658" fontSize="11" fill="var(--color-neutral-600)">No key, no tokens, no model.</text>
  </svg>
);

export default StilltrueFlow;
