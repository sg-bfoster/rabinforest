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

// Four of each verdict. Four are drawn at random per load — same empty-box
// treatment as the imagery chips. Each carries its flow, shown while the
// example is loaded untouched.
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
    label: 'A claim the speed limit matches',
    claim: 'The speed limit in the school zone is 25 miles per hour.',
    source:
      'Public Works notice, posted August 12: Beginning Monday, flashing school-zone beacons on Oak Street will enforce a 25 mph limit on school days from 7:00 AM to 9:00 AM and 2:00 PM to 4:00 PM. The limit outside those hours remains 35 mph.',
    expected: 'supported',
    flow: [
      'The source is a Public Works notice about Oak Street, pasted in full.',
      'The judge looks for whether that text actually states a 25 mph school-zone limit.',
      'It does — 25 mph on school days during the listed hours — so the claim is supported, with that sentence quoted as evidence.',
    ],
  },
  {
    // Narrowed 2026-09-04, from "Museum admission is free on Sundays".
    // That phrasing is the first case found where the two engines genuinely
    // disagree: Gemini ruled it supported, RabinAI ruled it not_supported,
    // because the source waives GENERAL admission while noting that special
    // exhibitions may still require a ticket. Both readings are defensible —
    // RabinAI is being the stricter of the two, which is the right direction
    // for a fact-checker and the wrong thing to put behind a chip that
    // promises "should be Supported". Naming the general case makes the
    // pairing unambiguous and both engines agree.
    //
    // The original is worth keeping in mind for the show-both-verdicts idea in
    // FACT_CHECK_LOCAL_PLAN.md: it is a real, honest disagreement on a caveat,
    // which is exactly what that feature exists to display.
    label: 'A claim free Sunday admission',
    claim: 'General admission is free on Sundays.',
    source:
      'Visitor information: Adult admission is $14. Seniors and students $10. Children under 12 are free. Every Sunday the museum waives all general-admission fees; special exhibitions may still require a timed ticket.',
    expected: 'supported',
    flow: [
      'The source is pasted visitor information, not a URL.',
      'The claim is about general admission specifically. The text says every Sunday general-admission fees are waived.',
      'That is an affirmative match, so the pairing is supported.',
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
    label: 'A claim the pool hours deny',
    claim: 'The community pool stays open until 9 PM every night.',
    source:
      'Aquatics schedule, summer session: Lap swim 6:00 AM–8:00 AM. Open swim 11:00 AM–7:00 PM daily, including weekends. The facility is locked at 7:15 PM. No evening rentals after close.',
    expected: 'not_supported',
    flow: [
      'The source is a summer aquatics schedule.',
      'The claim says open until 9 PM. The schedule says open swim ends at 7 PM and the building is locked at 7:15.',
      'That contradicts the claim, so the verdict is not supported.',
    ],
  },
  {
    label: 'A claim weekly pickup, biweekly source',
    claim: 'Recycling is collected every week.',
    source:
      'Sanitation calendar: Trash is collected every Monday. Recycling is collected every other Wednesday. Yard waste runs March through November on the same Wednesday as recycling. Place carts out by 6:30 AM.',
    expected: 'not_supported',
    flow: [
      'The source is a sanitation calendar, pasted as-is.',
      'The claim is weekly recycling. The calendar says recycling is every other Wednesday.',
      'Every other week is not every week — the source contradicts the claim.',
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
  {
    label: 'A reelection claim on a road notice',
    claim: 'The mayor is running for reelection this November.',
    source:
      'Street closure: Oak Avenue between 3rd and 7th will be closed to through traffic from 6:00 AM Monday through 6:00 PM Friday for water-main replacement. Local access will be maintained. Detour via Pine Street.',
    expected: 'cant_tell',
    flow: [
      'The source is a road-closure notice.',
      'It says nothing about the mayor, an election, or November.',
      "The claim might be true somewhere else, but this source does not address it, so the judge has to say can't tell.",
    ],
  },
  {
    label: 'A budget claim on a concert lineup',
    claim: 'The new recreation center is budgeted at $18 million.',
    source:
      'Summer concert series: June 14 — The Riverbend Band. June 28 — Cedar & Smoke. July 12 — Horns Up Brass. Shows start at 7:00 PM on the lawn. Bring a chair. Food trucks on site. Rain venue is the gym.',
    expected: 'cant_tell',
    flow: [
      'The source is a concert lineup.',
      'It never mentions a recreation center, a budget, or a dollar amount.',
      "Silence is not support — can't tell, even if the budget figure is true in the world.",
    ],
  },

  // ── Added 2026-09-04 ──────────────────────────────────────────────────────
  // Twelve more, balanced 4/4/4 so the stratified picker keeps drawing an even
  // spread. Everyday civic sources on purpose: the failure this page teaches —
  // a true claim failing on the wrong source — is most legible when the source
  // is the kind of thing a person actually gets handed.
  {
    label: 'A claim the holiday notice confirms',
    claim: 'Trash pickup moves to Wednesday during Thanksgiving week.',
    source:
      'Solid Waste notice: In observance of the Thanksgiving holiday, there will be no collection on Thursday. Residents on the Thursday route should place carts out on Wednesday instead. Friday routes are unaffected.',
    expected: 'supported',
    flow: [
      'The source is a pasted Solid Waste notice, sent as-is with no URL fetch.',
      'The judge checks whether the text actually moves Thursday collection to Wednesday.',
      'It does, explicitly and for that week, so the claim is supported with the rerouting sentence quoted as evidence.',
    ],
  },
  {
    label: 'A claim the clinic notice backs',
    claim: 'The flu clinic accepts walk-ins.',
    source:
      'Community health bulletin: The seasonal flu clinic runs Saturday from 9 AM to 3 PM at the recreation center. No appointment is necessary — walk-ins are welcome throughout the day. Bring an insurance card if you have one.',
    expected: 'supported',
    flow: [
      'Pasted bulletin text, no URL involved.',
      'The claim is narrow: does the clinic take walk-ins?',
      'The text says walk-ins are welcome and no appointment is necessary, which affirmatively backs the claim.',
    ],
  },
  {
    label: 'A claim the fee schedule matches',
    claim: 'A residential fence permit costs $75.',
    source:
      'Permit fee schedule, effective January 1. Residential fence: $75. Residential deck: $125. Accessory structure under 200 sq ft: $95. Commercial signage: $250. Fees are non-refundable once a review has begun.',
    expected: 'supported',
    flow: [
      'A fee schedule pasted in full, several line items long.',
      'The judge has to find the right row rather than the first dollar figure it sees.',
      'Residential fence is listed at $75, matching the claim exactly, so it is supported.',
    ],
  },
  {
    label: 'A claim the park rules confirm',
    claim: 'The nature preserve closes at sunset.',
    source:
      'Preserve rules: Open daily from dawn until sunset. Pets must remain leashed. No collecting of plants, rocks or wildlife. Bicycles are permitted on the gravel loop only. Carry out everything you carry in.',
    expected: 'supported',
    flow: [
      'A short list of posted park rules, pasted as the source.',
      'The judge looks for the closing time specifically, not the general tone of the rules.',
      'The hours line says open until sunset, which supports the claim directly.',
    ],
  },
  {
    label: 'A claim the deadline contradicts',
    claim: 'Voter registration closes on October 1.',
    source:
      'Elections office reminder: The registration deadline for the November general election is October 15. Applications postmarked by that date will be accepted. Early voting begins October 20 at four locations.',
    expected: 'not_supported',
    flow: [
      'A pasted elections reminder, sent as-is.',
      'Both the claim and the source name a deadline, so the judge has to compare them rather than just spot the topic.',
      'The source says October 15, which is incompatible with October 1 — ruled not supported, not merely unproven.',
    ],
  },
  {
    label: 'A claim the leash rule denies',
    claim: 'Dogs may be off-leash in the dog park.',
    source:
      'Parks ordinance summary: Dogs are permitted in all county parks but must remain on a leash no longer than six feet at all times, including within fenced dog areas. Owners are responsible for waste removal.',
    expected: 'not_supported',
    flow: [
      'A pasted ordinance summary, no URL.',
      'The claim sounds reasonable — dog parks usually do allow this — so the judge has to resist outside knowledge.',
      'The text requires a leash at all times, explicitly including fenced dog areas, so the claim is contradicted.',
    ],
  },
  {
    label: 'A claim the fare table denies',
    claim: 'Seniors ride the county bus for free.',
    source:
      'Transit fares: Standard adult fare $2.50. Students with valid ID $1.25. Seniors 65 and over $1.00. Children under 5 ride free with a paying adult. Day passes are $5.00.',
    expected: 'not_supported',
    flow: [
      'A pasted fare table with several categories.',
      'Someone does ride free here — children under five — so the judge has to match the right row to the claim.',
      'Seniors are listed at $1.00, not free, so the claim is contradicted by the source.',
    ],
  },
  {
    label: 'A claim the venue change denies',
    claim: 'The planning commission meets at the public library.',
    source:
      'Notice of venue change: Effective this month, all planning commission meetings will be held in the community center auditorium on Grove Street. The previous library meeting room is no longer available due to renovation.',
    expected: 'not_supported',
    flow: [
      'A pasted venue-change notice.',
      'The library is mentioned, which is exactly the trap — a keyword match is not support.',
      'It is mentioned only as the location that is no longer used, so the source contradicts the claim.',
    ],
  },
  {
    label: 'A parking cost claim on a hours notice',
    claim: 'Downtown parking costs $2 per hour.',
    source:
      'Parking enforcement hours: Metered spaces downtown are enforced Monday through Saturday, 8 AM to 6 PM. Enforcement does not occur on Sundays or county holidays. Time limits are posted at each block face.',
    expected: 'cant_tell',
    flow: [
      'The source is about parking, which is why this one is tempting.',
      'It covers enforcement hours and time limits, and never states a rate.',
      'The claim may well be true, but this source does not decide it — silence is not support.',
    ],
  },
  {
    label: 'An enrollment claim on a calendar',
    claim: 'The high school has more than 2,000 students.',
    source:
      'Academic calendar: First day of school August 5. Labor Day holiday September 1. Fall break October 13-17. Winter break December 22 through January 2. Last day of school May 22, with early release.',
    expected: 'cant_tell',
    flow: [
      'A school calendar pasted as the source — same institution, different subject.',
      'Nothing in it speaks to enrollment numbers at all.',
      'The judge should decline rather than reach, so the correct verdict is that it cannot tell.',
    ],
  },
  {
    label: 'A health score claim on a menu',
    claim: 'The diner passed its most recent health inspection.',
    source:
      'Lunch menu: Patty melt with fries $11. Turkey club $10. Soup of the day cup $4, bowl $6. Breakfast served until 11 AM. Daily specials posted on the board. Cash and cards accepted.',
    expected: 'cant_tell',
    flow: [
      'A restaurant menu, pasted in full.',
      'The claim is about the same business, which is what makes this a near miss rather than an obvious mismatch.',
      'A menu says nothing about inspections, so there is no basis in this source either way.',
    ],
  },
  {
    label: 'A results claim on polling locations',
    claim: 'Turnout in the last election was above 40 percent.',
    source:
      'Polling place list: Precinct 1 votes at Grove Street Community Center. Precinct 2 at Riverdale Elementary. Precinct 3 at the fire station on Main. Polls open 7 AM to 7 PM. Bring photo identification.',
    expected: 'cant_tell',
    flow: [
      'A polling location list — unmistakably election material.',
      'The claim is about turnout, which is a different fact entirely from where people vote.',
      'The source never reports any turnout figure, so the pairing cannot be decided from it.',
    ],
  },
  {
    // A live URL on purpose — the only other fetching example is example.com,
    // which is a specification rather than a real site. This exercises the
    // whole path: fetch, strip HTML, judge. It is also a scope error rather
    // than a factual one, which is the kind people actually make: the site
    // covers a county, the claim widens it to a metro area, and nothing in the
    // source supports the wider reading.
    //
    // Verified 2026-09-04: both engines return not_supported. It does depend on
    // askgwinnett.com staying up and on-message — tools/factcheck-compare.js
    // and the example verifier will catch it if that changes.
    label: 'A scope claim on a real county site',
    claim: 'Ask Gwinnett answers questions for metro Atlanta.',
    source: 'https://www.askgwinnett.com/',
    expected: 'not_supported',
    flow: [
      'The source is a URL, so the backend fetches askgwinnett.com and strips the page down to plain text.',
      'The claim widens the scope from a county to a metro area, which is the kind of over-generalisation that reads as harmless until you check it.',
      'The page describes a Gwinnett County project and never claims the wider region, so the pairing is ruled not supported rather than merely unproven.',
    ],
  },
];

/**
 * Draw n examples with every verdict represented.
 *
 * A flat shuffle can hand a visitor four "Can't tell" chips and no sense that
 * the judge ever rules any other way — which was happening, and matters more
 * now that each chip advertises the verdict it should produce. Taking an equal
 * slice per verdict guarantees the demo shows its whole range; the result is
 * then shuffled so the order still varies between loads.
 */
const pickExamples = (pool, n) => {
  const shuffle = (arr) => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const byVerdict = pool.reduce((acc, ex) => {
    (acc[ex.expected] = acc[ex.expected] || []).push(ex);
    return acc;
  }, {});
  const verdicts = Object.keys(byVerdict);
  const perVerdict = Math.floor(n / verdicts.length);
  const picked = verdicts.flatMap((v) => shuffle(byVerdict[v]).slice(0, perVerdict));
  // Any remainder (n not divisible by the verdict count) is topped up at random
  // from whatever was not already chosen.
  const rest = shuffle(pool.filter((ex) => !picked.includes(ex)));
  return shuffle(picked.concat(rest.slice(0, n - picked.length)));
};

const FactCheck = () => {
  const [claim, setClaim] = useState('');
  const [source, setSource] = useState('');
  const [examples] = useState(() => pickExamples(EXAMPLES, 6));
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // Which engine the visitor asked for. RabinAI is the default deliberately:
  // the site's whole claim is that the box does the work, and defaulting to
  // Gemini would mean almost nobody ever sees it.
  const [engine, setEngine] = useState('rabinai');
  // Live step frames from the server. Every line is a measured event — there is
  // a real ~9s silence while the box reads the source and nothing is emitted to
  // paper over it.
  const [frames, setFrames] = useState([]);
  const resultRef = useRef(null);
  const consoleRef = useRef(null);

  // Keep the newest line visible as the console grows (same pattern as the
  // imagery page: an effect on frames runs after commit, so scrollHeight is
  // current — scheduling this from the handler scrolls to the previous height).
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [frames]);

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
    setFrames([]);

    // SSE rather than a plain POST. The server writes headers before it does
    // any work, which moves Heroku's 30s limit from total duration to
    // time-to-first-byte — the box needs ~10-14s to read a long source and the
    // URL fetch can spend six before that.
    try {
      const res = await fetch(API_ENDPOINTS.FACT_CHECK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claim.trim(), source: source.trim(), engine }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `The judge did not answer (HTTP ${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let event = '';
      let settled = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('event: ')) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          let d;
          try { d = JSON.parse(line.slice(6)); } catch { continue; }
          if (event === 'step') {
            setFrames((prev) => [...prev, `[${((d.ms || 0) / 1000).toFixed(1).padStart(5)}s] ${d.label}`]);
          } else if (event === 'done') {
            setResult(d);
            settled = true;
          } else if (event === 'error') {
            setError(d.message || 'Fact check failed.');
            settled = true;
          }
        }
      }
      // A stream that ends without a verdict is a failure, not a silent no-op.
      if (!settled) setError('The judge stopped before returning a verdict.');
    } catch (err) {
      setError(err.message || 'Fact check failed. Please try again.');
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
      {/* Step 1. The engine choice moved to the TOP, ahead of everything else.
          It was previously buried next to the submit button, which meant a
          visitor made the interesting decision on this page last, or never —
          and the page's whole point is that you can pick who judges. */}
      <div className="fact-check-step">
        <span className="fact-check-step-n">1</span>
        <div className="fact-check-step-body">
          <h2 className="fact-check-step-title">Choose a judge</h2>
          <div className="fact-check-engine-choice" role="radiogroup" aria-label="Judge engine">
            <button
              type="button"
              role="radio"
              aria-checked={engine === 'rabinai'}
              className={`fact-check-engine-btn${engine === 'rabinai' ? ' is-on' : ''}`}
              disabled={isChecking}
              onClick={() => setEngine('rabinai')}
            >
              RabinAI <span className="fact-check-engine-note">Brian's mini PC · ~3-15s</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={engine === 'gemini'}
              className={`fact-check-engine-btn${engine === 'gemini' ? ' is-on' : ''}`}
              disabled={isChecking}
              onClick={() => setEngine('gemini')}
            >
              Gemini <span className="fact-check-engine-note">Google's cloud · ~1-3s</span>
            </button>
          </div>
          <p className="fact-check-step-hint">
            Same claim, same source, same rules — only the model changes. Both are
            judged at temperature 0, reading nothing but the source you supply.
          </p>
        </div>
      </div>

      {/* Step 2. Examples now announce their expected verdict, so a visitor can
          see the judge got it right rather than having to work that out. */}
      <div className="fact-check-step">
        <span className="fact-check-step-n">2</span>
        <div className="fact-check-step-body">
          <h2 className="fact-check-step-title">Load an example, or write your own below</h2>
      <div className="fact-check-examples">
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            className={`fact-check-example${activeExample === example ? ' is-on' : ''}`}
            disabled={isChecking}
            onClick={() => {
              setClaim(example.claim);
              setSource(example.source);
              setResult(null);
              setError(null);
              setFrames([]);
            }}
          >
            <span className="fact-check-example-label">{example.label}</span>
            <span className={`fact-check-example-expect verdict-${example.expected}`}>
              should be {VERDICT_LABELS[example.expected]}
            </span>
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
        </div>
      </div>

      {/* Step 3. */}
      <div className="fact-check-step">
        <span className="fact-check-step-n">3</span>
        <div className="fact-check-step-body">
          <h2 className="fact-check-step-title">Check the pairing</h2>
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
          {(result || error || frames.length > 0) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setResult(null);
                setError(null);
                setFrames([]);
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
      </div>

      {/* Reference, deliberately AFTER the form rather than before it. It used
          to open the page: three verdict definitions and a rules paragraph
          standing between the visitor and the thing they came to try. */}
      <div className="fact-check-legend">
        <div className="fact-check-legend-row">
          <span className="fact-check-verdict verdict-supported">Supported</span>
          <span>The source affirmatively backs the claim — the deciding sentence is quoted as evidence.</span>
        </div>
        <div className="fact-check-legend-row">
          <span className="fact-check-verdict verdict-not_supported">Not supported</span>
          <span>The source contradicts the claim, or says something incompatible with it.<br/> &nbsp;</span>
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
      </div>

      {/* The console. Every line is a measured event from the server — fetch
          duration, real source size, the moment the verdict lands. The gap in
          the middle is the box genuinely reading the source, and labelling it
          is what turns the wait into the demonstration rather than dead air. */}
      {frames.length > 0 && (
        <div className="fact-check-console" ref={consoleRef} aria-live="polite">
          {frames.map((line, i) => (
            <div key={i} className="fact-check-console-line">{line}</div>
          ))}
          {isChecking && (
            <div className="fact-check-console-line">
              <span className="stream-cursor">▍</span>
            </div>
          )}
        </div>
      )}

      {(error || result) && (
        <div
          ref={resultRef}
          // An error is NOT a verdict. This fell back to result-not_supported
          // when there was no result, so a failed URL fetch was painted in the
          // same red as a ruling — on the page whose entire subject is reading
          // verdicts precisely. Errors get their own neutral treatment.
          className={`panel fact-check-result ${result ? `result-${result.verdict}` : 'result-error'}`}
        >
          {error && <p className="error-message">{error}</p>}
          {result && (
            <>
              <span className={`fact-check-verdict verdict-${result.verdict}`}>
                {VERDICT_LABELS[result.verdict] || result.verdict}
              </span>
              {result.engine && (
                <span className="fact-check-engine-tag">
                  judged by {result.engine === 'rabinai' ? 'RabinAI' : 'Gemini'}
                  {typeof result.ms === 'number' && ` · ${(result.ms / 1000).toFixed(1)}s`}
                </span>
              )}
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
