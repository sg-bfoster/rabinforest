// FactCheck.js — the stilltrue `verify` primitive as an interactive playground:
// does the source actually support the claim?
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';
import StilltrueFlow from './components/StilltrueFlow';
import { Hero, ScreenBody } from './components/Hero';

const VERDICT_LABELS = {
  supported: 'Supported',
  not_supported: 'Not supported',
  cant_tell: "Can't tell",
};

// Two of each verdict. Three are drawn at random per load so a first visit
// still shows what the judge does, without always serving the same three
// chips. Each carries its flow, shown while the example is loaded untouched.
const EXAMPLES = [
  {
    label: 'A claim a web page backs up',
    claim: 'The example.com domain is reserved for use in illustrative examples in documents.',
    source: 'https://example.com',
    expected: 'supported',
    flow: [
      'The source is a URL, so the backend fetches https://example.com and strips the HTML down to plain text.',
      'The judge reads only that text — no outside knowledge allowed.',
      'The page itself says the domain is for use in documentation examples, so the claim is affirmatively backed, with the deciding sentence quoted as evidence.',
    ],
  },
  {
    label: 'A claim the hours confirm',
    claim: 'The branch library is open until 8 PM on weekdays.',
    source:
      'Riverdale Branch — hours of operation. Monday–Friday: 9:00 AM to 8:00 PM. Saturday: 10:00 AM to 5:00 PM. Closed Sunday. Holiday hours posted on the door.',
    expected: 'supported',
    flow: [
      'The source is pasted library hours, sent as-is — no URL fetch.',
      'The judge checks whether the text actually says weekday closing is 8 PM.',
      'Monday through Friday to 8:00 PM matches the claim, so it is supported, with that hours line quoted as evidence.',
    ],
  },
  {
    label: 'A claim the source contradicts',
    claim: 'The board meets every Tuesday.',
    source:
      'County newsletter, August edition: At its last session the board voted unanimously to move its weekly meeting permanently to Thursday afternoons at 2:00 PM, citing scheduling conflicts with the planning commission.',
    expected: 'not_supported',
    flow: [
      'No URL this time — the pasted newsletter text is the source, sent as-is.',
      'The judge compares the claim (meets every Tuesday) against what the text actually says.',
      'The text says the meeting moved permanently to Thursday — incompatible with the claim, so it is ruled not supported, not merely unproven.',
    ],
  },
  {
    label: 'A claim the parking rules deny',
    claim: 'Street parking is free after 6 PM on weekdays.',
    source:
      'Downtown parking enforcement: meters operate 8:00 AM to 10:00 PM, Monday through Saturday, at $2.00 per hour. The evening rate is the same as daytime. Sundays and posted city holidays are free.',
    expected: 'not_supported',
    flow: [
      'The source is a parking-enforcement notice, pasted in full.',
      'The claim says free after 6 PM. The notice says meters run until 10 PM at the same $2 rate.',
      'Those cannot both be true, so the pairing is not supported — contradiction, not silence.',
    ],
  },
  {
    label: "A claim the source doesn't address",
    claim: 'The property tax millage rate is 6.95 this year.',
    source:
      'Parks department announcement: Six new pickleball courts will open this fall at Rhodes Jordan Park, with free community play on weekend mornings and league sign-ups beginning in September.',
    expected: 'cant_tell',
    flow: [
      'The source is a parks announcement about pickleball courts.',
      'It never mentions taxes or a millage rate at all — it neither confirms nor denies the claim.',
      "Silence is not support: even a true-sounding claim gets can't tell when this source doesn't back it. That rule is the whole point of the tool.",
    ],
  },
  {
    label: 'A millage claim on a lunch menu',
    claim: 'The millage rate for county schools is 19.2 mills this year.',
    source:
      "This week's cafeteria menu: Monday — chicken sandwich and apple slices. Tuesday — spaghetti with marinara. Wednesday — taco salad. Thursday — baked potato bar. Friday — cheese pizza. Milk and fruit included with every meal. Menu subject to change.",
    expected: 'cant_tell',
    flow: [
      'The source is a school lunch menu.',
      'Nothing in it mentions millage, taxes, or a rate — it is a list of meals.',
      "The claim may be true in the world, but this source does not address it, so the judge has to say can't tell.",
    ],
  },
];

const pickExamples = (pool, n) => {
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

const FactCheck = () => {
  const [claim, setClaim] = useState('');
  const [source, setSource] = useState('');
  const [examples] = useState(() => pickExamples(EXAMPLES, 3));
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if ((result || error) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result, error]);

  // Which example is sitting untouched in the form (cleared by any manual edit).
  const activeExample = EXAMPLES.find((ex) => ex.claim === claim && ex.source === source);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!claim.trim() || !source.trim() || isChecking) return;

    setIsChecking(true);
    setResult(null);
    setError(null);
    try {
      const { data } = await axios.post(API_ENDPOINTS.FACT_CHECK, {
        claim: claim.trim(),
        source: source.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Fact check failed. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <Hero>
        <h1 className="hero-h1">One claim, one source.</h1>
        <p className="hero-sub hero-sub--page">
          AI answers sound confident whether or not their sources back them up. Paste a claim
          and the source that supposedly supports it, and a judge model rules on the pairing.
          It's the trust layer behind{' '}
          <a href="https://www.askgwinnett.com" target="_blank" rel="noopener noreferrer">AskGWINnett</a>
          , packaged as{' '}
          <a href="https://github.com/sg-bfoster/stilltrue" target="_blank" rel="noopener noreferrer">stilltrue</a>.
        </p>
      </Hero>
      <ScreenBody width="playground">
      <div className="panel fact-check-panel">
      <div className="fact-check-legend">
        <div className="fact-check-legend-row">
          <span className="fact-check-verdict verdict-supported">Supported</span>
          <span>The source affirmatively backs the claim — the deciding sentence is quoted as evidence.</span>
        </div>
        <div className="fact-check-legend-row">
          <span className="fact-check-verdict verdict-not_supported">Not supported</span>
          <span>The source contradicts the claim, or says something incompatible with it.</span>
        </div>
        <div className="fact-check-legend-row">
          <span className="fact-check-verdict verdict-cant_tell">Can't tell</span>
          <span>The source never addresses the claim. Silence is not support — even a true claim fails on the wrong source.</span>
        </div>
      </div>
      <p className="fact-check-rules">
        The judge reads <em>only</em> the source you give it — no web search, no outside
        knowledge, temperature 0. It is judging the pairing, not the truth of the world.
      </p>
      <div className="fact-check-examples">
        <span className="fact-check-examples-label">Try one</span>
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            className="fact-check-example"
            disabled={isChecking}
            onClick={() => {
              setClaim(example.claim);
              setSource(example.source);
              setResult(null);
              setError(null);
            }}
          >
            {example.label}
          </button>
        ))}
      </div>
      {activeExample && (
        <div className="fact-check-example-flow">
          <div className="fact-check-example-flow-head">
            <span className="fact-check-example-flow-label">What will happen</span>
            <span className={`fact-check-verdict verdict-${activeExample.expected}`}>
              Expected: {VERDICT_LABELS[activeExample.expected]}
            </span>
          </div>
          <ol>
            {activeExample.flow.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      <form onSubmit={handleSubmit} className="fact-check-form">
        <div className="field">
          <label htmlFor="fc-claim">Claim</label>
          <textarea
            id="fc-claim"
            className="input"
            rows="2"
            value={claim}
            disabled={isChecking}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Ex: The first day of school is August 5."
            required
          />
        </div>
        <div className="field">
          <label htmlFor="fc-source">Source — paste text, or a URL (https://…)</label>
          <textarea
            id="fc-source"
            className="input"
            rows="5"
            value={source}
            disabled={isChecking}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste the source text here, or a single URL to fetch."
            required
          />
        </div>
        <div className="fact-check-actions">
          {(result || error) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              Clear result
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isChecking || !claim.trim() || !source.trim()}
          >
            {isChecking ? <span className="spinner" /> : 'Check'}
          </button>
        </div>
      </form>
      </div>

      {(error || result) && (
        <div
          ref={resultRef}
          className={`panel fact-check-result result-${result?.verdict || 'not_supported'}`}
        >
          {error && <p className="error-message">{error}</p>}
          {result && (
            <>
              <span className={`fact-check-verdict verdict-${result.verdict}`}>
                {VERDICT_LABELS[result.verdict] || result.verdict}
              </span>
              <p className="fact-check-reasoning">{result.reasoning}</p>
              {result.evidence && (
                <blockquote className="fact-check-evidence">
                  “<mark>{result.evidence}</mark>”
                </blockquote>
              )}
              {(result.sourceUrl || result.truncated) && (
                <p className="fact-check-meta">
                  {result.sourceUrl && <>Judged against {result.sourceUrl}. </>}
                  {result.truncated && <>Source was truncated to the first 20,000 characters.</>}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="fact-check-how">
        <h2 className="fact-check-how-title">How stilltrue works</h2>
        <p className="fact-check-how-sub">
          The npm package ships no AI. Its scheduled drift checks are pure string matching; its
          verify pipeline is a row of slots — and this page is what happens when an app plugs a
          judge model into one.
        </p>
        <figure className="fact-check-flow">
          <div className="fact-check-flow-scroll">
            <StilltrueFlow />
          </div>
          <figcaption>
            The dashed boundary is what ships on npm: the drift engine (deterministic) and the verify
            pipeline (empty stage slots). Golden regression evals are deliberately left to promptfoo
            or your own harness. The one red box — the Gemini judge — lives in the host app and is
            plugged into a slot only for jobs that need reading comprehension.
          </figcaption>
        </figure>
      </div>

      <p className="fact-check-footer">
        Powered by{' '}
        <a href="https://github.com/sg-bfoster/stilltrue" target="_blank" rel="noopener noreferrer">stilltrue</a>
        {' '}—{' '}
        <a href="https://www.npmjs.com/package/stilltrue" target="_blank" rel="noopener noreferrer">npm</a>
        {' '}·{' '}
        <a href="https://github.com/sg-bfoster/stilltrue" target="_blank" rel="noopener noreferrer">GitHub</a>.
        Your tests check your code — stilltrue checks your facts.
      </p>
      </ScreenBody>
    </>
  );
};

export default FactCheck;
