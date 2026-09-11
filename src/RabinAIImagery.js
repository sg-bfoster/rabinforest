import React, { useEffect, useRef, useState } from 'react';
import API_BASE_URL from './config/api';
import { useDispatch } from 'react-redux';
import { addLink } from './features/assistantSlice';
import { storeImageLink } from './utils/imageLinkStore';
import { scrollBelowChrome } from './utils/scroll';
import { Hero, ScreenBody } from './components/Hero';

/**
 * Starter prompts, five drawn at random per page load.
 *
 * An empty text box is the hardest thing to hand a visitor — the assistant
 * page solves it with popular questions and this page had nothing. Chosen to
 * suit the model rather than to be clever: SDXL Lightning at 8 steps is
 * strongest on concrete, well-lit scenes with one clear subject, and weakest
 * on crowds, text and hands. All are safely inside the moderation policy, so a
 * suggested prompt can never be the thing that gets refused.
 */
const IDEA_POOL = [
  'a lighthouse in a storm',
  'a fox asleep in autumn leaves',
  'an abandoned greenhouse full of ferns',
  'a neon ramen shop in the rain',
  'a hot air balloon over the desert at dawn',
  'a cabin under the northern lights',
  'koi in a stone pond',
  'a spiral staircase in an old library',
  'a sailboat lost in fog',
  'glowing mushrooms on a forest floor',
  'an empty diner at 3am',
  'a mountain lake under granite peaks',
  'a bookshop cat asleep in the window',
  'a rusted truck reclaimed by wildflowers',
  'a tea house in a bamboo forest',
  // Deliberately brighter, closer and warmer than the set above, which had
  // drifted entirely to moody wide shots at dusk. Three random picks from a
  // monotone pool show one register three times and undersell the model;
  // these give it somewhere to show high-key light, macro texture and colour.
  'a bowl of ramen shot from directly above',
  'a sunlit kitchen with lemons on the counter',
  'a hummingbird at a red feeder',
  'a stack of battered vintage suitcases',
  'a close-up of dew on a spiderweb',
  'a market stall piled with bright textiles',
  'a red barn after a snowfall',
  'a bicycle against a sunlit stone wall',
  'a lantern on a snowy porch',
  'a rowboat on a still alpine lake',
  'a copper kettle on a gas stove',
  'a field of sunflowers at noon',
  'a mossy stone bridge over a creek',
  'a vintage typewriter on a wooden desk',
  'an old observatory under the milky way',
  'a glass greenhouse in morning frost',
];

/** Fisher-Yates, same as the assistant page's question picker. */
const pickIdeas = (pool, n) => {
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

/**
 * RabinAI Imagery — the box draws your prompt, and you watch it work.
 *
 * The console is the feature: real step frames from the machine (queued,
 * step k/8, decoding) streamed over SSE while an SDXL Lightning checkpoint
 * renders on the mini PC. The image arrives as base64 in the final event
 * and lives only in this tab — nothing is saved, nothing has a URL.
 *
 * Honest states, per the plan: when the box is asleep or the queue is
 * full, the page says so plainly. There is no cloud fallback on purpose —
 * "my machine is off right now" is part of the story.
 */

/**
 * Real renders from the box, shown so the page is not a blank form.
 *
 * A visitor arriving here previously saw an empty text field and a Generate
 * button, with no way to know whether this makes photographs or clip art, or
 * how long it takes. These are actual output at the settings the page uses —
 * not stock images and not cherry-picked from another model — so they set an
 * accurate expectation.
 *
 * Clicking one opens the picture in a new tab and loads its prompt. A gallery
 * you can only look at is decoration; one that also hands you a working
 * starting point is the shortest path from "what is this" to "I made something".
 */
const SAMPLES = [
  { file: 'ramen-shop', alt: 'A neon ramen shop at night, reflected in wet pavement',
    prompt: 'a neon ramen shop in the rain at night, reflections on wet pavement' },
  { file: 'waterfall', alt: 'A jungle waterfall seen from ground level, light through ferns',
    prompt: 'a jungle waterfall seen from ground level looking upward, ferns, mist in shafts of sunlight' },
  { file: 'campfire', alt: 'A campfire on a rocky beach at night with embers rising',
    prompt: 'a campfire on a rocky beach at night, embers rising, driftwood' },
  { file: 'rusted-truck', alt: 'An old rusted pickup truck overgrown with wildflowers',
    prompt: 'an old rusted pickup truck reclaimed by wildflowers and vines in a summer field' },
  { file: 'ramen-bowl', alt: 'A bowl of ramen photographed from directly above',
    prompt: 'a bowl of ramen shot from directly above' },
  { file: 'bookshop-cat', alt: 'A cat asleep in a sunlit bookshop window',
    prompt: 'a bookshop cat asleep in the window' },
  { file: 'lighthouse', alt: 'A lighthouse on rocks in a storm, waves breaking',
    prompt: 'a lighthouse in a storm' },
  { file: 'koi-pond', alt: 'Orange koi swimming in a stone pond',
    prompt: 'koi in a stone pond' },
];

const IDLE_HINT = 'a lighthouse on a rocky coast at dusk, warm lamplight';

const RabinAIImagery = () => {
  const dispatch = useDispatch();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | running | done | error
  const [frames, setFrames] = useState([]);
  const [image, setImage] = useState(null);
  const [meta, setMeta] = useState(null);     // { ms, seed }
  const [errorMsg, setErrorMsg] = useState('');
  const [ideas] = useState(() => pickIdeas(IDEA_POOL, 5));
  // Latest denoise preview frame (a small JPEG data-URI from the box).
  const [preview, setPreview] = useState(null);
  const consoleRef = useRef(null);
  const resultRef = useRef(null);

  // Clear a finished render and hand the page back for another go.
  //
  // The prompt goes too: the button is "Clear and start over", and leaving
  // the last prompt in the field made it look like the button did nothing.
  // Tweaking the same idea ("...at dusk" → "...at dawn") is still one edit
  // away — just don't hit Clear.
  //
  // Only offered once a render has finished: mid-render there is a live SSE
  // stream whose handlers would carry on writing into the state this just
  // cleared, so the button is absent while phase is 'running' rather than
  // disabled, and the stream is never cancelled underneath itself.
  const reset = () => {
    setPrompt('');
    setPhase('idle');
    setFrames([]);
    setPreview(null);
    setImage(null);
    setMeta(null);
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bring the console into view when a render starts.
  //
  // The console is rendered only once phase leaves 'idle', so it does not exist
  // at the moment the click handler sets the phase. Scheduling the scroll from
  // the handler — even behind paired rAFs — raced the commit and silently did
  // nothing. An effect keyed on phase is the guarantee: React has committed the
  // element before this runs, so the ref is populated.
  //
  // Without it the console mounts below the fold and the visitor stares at an
  // empty page for the ~30s the machine works, which is the whole point of the
  // page. 'start' rather than 'center' so the first step frames are at the top
  // of the viewport and the image has room to arrive beneath them.
  useEffect(() => {
    if (phase !== 'running') return;
    // scrollIntoView can only scroll as far as the document allows. The console
    // is the last thing on the page, so without extra room below it the browser
    // scrolls to its maximum and the console's bottom ends up under the fixed
    // footer — which is what every earlier attempt here was actually hitting,
    // whatever value of `block` was used. The spacer rendered below while a
    // render is running creates that room; with it, aligning the console's TOP
    // just under the sticky header (scroll-margin-top) puts the whole 15rem box
    // in view with the footer nowhere near it.
    consoleRef.current && scrollBelowChrome(consoleRef.current);
  }, [phase]);

  // Keep the newest line visible INSIDE the console as it grows.
  //
  // This used to run from pushFrame behind a requestAnimationFrame, which
  // fired before React had committed the new line — so it scrolled to the
  // PREVIOUS scrollHeight and the newest frame sat just below the fold. The
  // last line of a finished render ("image ready — …s on the box") was
  // therefore always the one clipped, which is the line people most want.
  // An effect on frames runs after commit, so scrollHeight is current.
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [frames]);

  // "save it" deserves a name that says what the picture is. First few
  // words of the prompt, kebab-cased, plus the seed so two runs of the
  // same prompt don't collide in the Downloads folder.
  const downloadName = () => {
    const slug = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join('-');
    return `rabinai-${slug || 'image'}${meta?.seed ? `-${meta.seed}` : ''}.png`;
  };

  const pushFrame = (line) => setFrames((prev) => [...prev, line]);

  const generate = async (e, override) => {
    e?.preventDefault();
    // A chip passes its text directly: setPrompt is async, so reading the
    // state here would submit the PREVIOUS prompt on the first click.
    const p = (override ?? prompt).trim();
    if (!p || phase === 'running') return;
    if (override) setPrompt(override);

    setPhase('running');
    setFrames([]);
    setPreview(null);
    setImage(null);
    setMeta(null);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/ai/imagery/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });

      // Non-SSE replies are the refusals: moderation 400, busy 503,
      // daily cap 429. All carry { error } with a plain message.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `The machine did not answer (HTTP ${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let event = '';
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
            pushFrame(`[${((d.ms || 0) / 1000).toFixed(1).padStart(5)}s] ${d.label}`);
          } else if (event === 'preview') {
            // One frame per denoise step, already downscaled server-side. Only
            // the newest is kept — this is a progress view, not a filmstrip.
            // If the box is running without --preview-method these never
            // arrive and the page behaves exactly as it did before.
            setPreview(d.image);
          } else if (event === 'done') {
            setImage(d.image);
            setPreview(null); // the finished image supersedes the last preview
            setMeta({ ms: d.ms, seed: d.seed });
            setPhase('done');
            // Bring the finished image into view once React has painted it.
            // rAF alone aims at the pre-image layout (the AI-Chat-Bots page
            // learned this the hard way); a paired rAF runs after commit.
            requestAnimationFrame(() => requestAnimationFrame(() => {
              resultRef.current && scrollBelowChrome(resultRef.current);
            }));
            // Same pattern the unlisted compare page uses: the image goes into
            // the links panel via the image-link store (quota-safe; the slice
            // already dedupes and survives localStorage overflow).
            const imageId = storeImageLink(d.image);
            dispatch(addLink({
              url: `#image:${imageId}`,
              imageId,
              text: `${p} (RabinAI)`,
              isImage: true,
            }));
          } else if (event === 'error') {
            throw new Error(d.message || 'The machine could not finish this one.');
          }
        }
      }
      // Stream ended without a done event and without an error event —
      // treat silence as failure rather than leaving the console spinning.
      setPhase((current) => (current === 'running' ? 'error' : current));
      setErrorMsg((current) => current || 'The stream ended early. Nothing was saved.');
    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <>
      <Hero>
        <h1 className="hero-h1">Drawn in the basement.</h1>
        <p className="hero-sub hero-sub--page">
          Type a prompt and RabinAI paints it live, over an encrypted tunnel into the house.
          The console below is the actual machine working, step by step — about half a minute
          per image. Nothing is saved.
        </p>
      </Hero>
      <ScreenBody width="playground">
      <form onSubmit={generate} className="panel panel-row">
        <input
          className="input"
          type="text"
          value={prompt}
          maxLength={400}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={IDLE_HINT}
          aria-label="Image prompt"
          disabled={phase === 'running'}
        />
        <button type="submit" className="btn btn-primary" disabled={phase === 'running' || !prompt.trim()}>
          {phase === 'running' ? 'Painting…' : 'Generate'}
        </button>
      </form>
      <div className="idea-chips">
        <span className="idea-chips-label">Try one</span>
        {ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            className="idea-chip"
            onClick={() => generate(null, idea)}
            disabled={phase === 'running'}
          >
            {idea}
          </button>
        ))}
      </div>

      {/* Hidden once a render starts: at that point the visitor has their own
          image coming and the samples are just competing for attention. */}
      {phase === 'idle' && (
        <section className="imagery-samples" aria-labelledby="samples-heading">
          <h2 id="samples-heading" className="imagery-samples-title">
            Made on the box — tap one to start from it
          </h2>
          <div className="imagery-samples-grid">
            {SAMPLES.map((s) => (
              <a
                key={s.file}
                className="imagery-sample"
                href={`/samples/${s.file}.webp`}
                target="_blank"
                rel="noopener noreferrer"
                title={s.prompt}
                onClick={() => setPrompt(s.prompt)}
              >
                <img src={`/samples/${s.file}.webp`} alt={s.alt} loading="lazy" width="400" height="400" />
                <span className="imagery-sample-prompt">{s.prompt}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {phase !== 'idle' && (
        <div className="imagery-console" ref={consoleRef} aria-live="polite">
          {frames.map((line, i) => (
            <div key={i} className="imagery-console-line">{line}</div>
          ))}
          {phase === 'running' && (
            <div className="imagery-console-line">
              <span className="stream-cursor">▍</span>
            </div>
          )}
          {phase === 'error' && (
            <div className="imagery-console-line imagery-console-error">{errorMsg}</div>
          )}
        </div>
      )}

      {/* The image emerging from noise, one frame per denoise step. Placed
          directly above the finished-image slot so the preview and the final
          picture occupy the same spot on the page — it reads as one image
          resolving rather than two things appearing. Rendered only while a
          render is live; if the box has no --preview-method flag no frames
          ever arrive and this simply never shows. */}
      {preview && !image && (
        <figure className="imagery-preview">
          <img src={preview} alt="" aria-hidden="true" />
          <figcaption>sculpting — this is the actual latent, decoded live</figcaption>
        </figure>
      )}

      {image && (
        <figure className="imagery-result" ref={resultRef}>
          {/* The frame is the positioning context for the white splash overlay
              (::after). It also holds the same 1:1 box the preview occupies, so
              the handoff from last-preview to finished image is a cross-fade in
              place rather than a jump. */}
          <div className="imagery-result-frame">
            <img src={image} alt={prompt} />
          </div>
          <figcaption>
            {(meta.ms / 1000).toFixed(1)}s on the box · seed {meta.seed} — this
            page won't remember it. It has been added to your links.
          </figcaption>
        </figure>
      )}

      {/* Save / clear. Present once a render has settled — done or failed —
          because both leave the page full of output that has to be scrolled
          past to start again. Save only when there is an image to keep. */}
      {(phase === 'done' || phase === 'error') && (
        <div className="imagery-reset">
          {image && (
            <a className="btn btn-primary" href={image} download={downloadName()}>
              Save it
            </a>
          )}
          <button type="button" className="btn btn-secondary" onClick={reset}>
            Clear and start over
          </button>
        </div>
      )}

      {/* Scroll room. The console is the last element on the page while a
          render is in flight, and scrollIntoView cannot scroll further than the
          document allows — so without this the browser hit its maximum scroll
          and left the console's bottom under the fixed footer, no matter which
          `block` value was used. This reserves enough height for the console to
          reach the top of the viewport. Rendered only while running; once the
          image arrives it supplies its own height and the spacer goes away. */}
      {phase === 'running' && <div className="imagery-scroll-room" aria-hidden="true" />}
      </ScreenBody>
    </>
  );
};

export default RabinAIImagery;
