import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { scrollToPageTopThen } from './utils/scroll';
import { openModal } from './features/modalSlice';
import { useDispatch } from 'react-redux';
import { addLink } from './features/assistantSlice';
import { API_ENDPOINTS } from './config/api';
import { FEATURES } from './config/features';
import { detectSitesInText, screenshotModalFor } from './utils/siteDetector';
import { LinkedText } from './utils/linkedText';
import { Hero, ScreenBody } from './components/Hero';
import { NavLink } from 'react-router-dom';
import { PLAYGROUND_FACT_CHECK } from './playgroundRoutes';
import { SpeakerIcon, StopIcon } from './components/SpeakerIcons';

// Four are drawn at random per load, so this pool is the site's shop window:
// whatever is in here is what a visitor is most likely to ask first.
//
// The first group deliberately points at the knowledge base's strongest
// material — the three major pieces of work, the scope/ownership framing, and
// the honest "why he would leave" answer. Those sections are the ones written
// to survive a reference check, and before this they only surfaced if a
// visitor happened to think of the question themselves.
//
// 'Where is he based?' was removed: the hero sub-line already says Metro
// Atlanta, so it spent a slot re-answering something on screen.
const QUESTION_POOL = [
    // the strong material
    'Give me an example of something he owned end to end',
    'Tell me about the odometer project',
    'What kind of role is he looking for?',
    'Why would he leave his current job?',
    'What is he like to work with?',
    // projects
    'What has Brian built recently?',
    'Tell me about AskGWINnett',
    "What's stilltrue?",
    'Tell me about Callmata',
    "What's RabinAI?",
    'Tell me about Lost Corridors',
    "What's Tellspinners?",
    // skills and hiring
    "What's his frontend stack?",
    'Does he work in Angular or React?',
    'Is he available for work?',
    'How do I contact him?',
    // Added 2026-09-04. Each points at knowledge-base material that answers
    // well but that a visitor would otherwise have to guess was there: the
    // ownership section, the Angular 15-to-20 upgrade, and his position on
    // verifying AI output. The analytics one earns its slot for a different
    // reason — it is the question that exposed the fabricated-denial bug, and
    // it is worth keeping in front of people now that it answers correctly.
    'What does he own at Safe-Guard?',
    'Tell me about the Angular upgrade',
    'How does he make sure AI answers are accurate?',
    'Has he set up analytics?',
    // Added 2026-09-10. The three major pieces of work currently only surface
    // odometer + Angular; the Heroku-to-AWS move (the one with a dollar figure
    // that survives a reference check) had no prompt. Security, remote, the
    // design background, and the live brand sites are the same pattern as the
    // 09-04 batch: the KB answers them well, a visitor would not guess to ask.
    'Tell me about the Heroku to AWS migration',
    'Does he own frontend security?',
    'Is he open to remote work?',
    'Does he have a design background?',
    'Which consumer sites has he shipped?',
    // Added 2026-09-12. People-management is the question recruiters actually
    // ask and the KB answers it cleanly; RabinAI Images and the architecture
    // write-ups are on the site but a visitor on this page would not guess to
    // ask about either.
    'Does he manage people?',
    'Can this site generate images?',
    'Has he written architecture docs?',
];

const pickQuestions = (pool, n) => {
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
};

// Generate a unique conversation ID
const generateConversationId = () => {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};


// Model ids arrive vendor-prefixed and long ('openai/gpt-oss-20b',
// 'qwen/qwen3-30b-a3b-2507', 'gemini-3.1-flash-lite'). The badge has room for
// the part a person recognises, and the full id stays in the tooltip.
const shortModel = (id) => {
    if (!id) return '';
    const tail = String(id).split('/').pop();
    return tail.length > 24 ? `${tail.slice(0, 23)}\u2026` : tail;
};

const Home = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Milliseconds the box has been building, straight from the stream's
    // heartbeat. Null when nothing is pending, or once text starts arriving.
    const [waitingMs, setWaitingMs] = useState(null);
    const [suggested, setSuggested] = useState(() => pickQuestions(QUESTION_POOL, 4));
    const [conversationId, setConversationId] = useState(() => {
        // Get or create conversation ID from localStorage
        const storedId = localStorage.getItem('conversationId');
        if (storedId) {
            return storedId;
        }
        const newId = generateConversationId();
        localStorage.setItem('conversationId', newId);
        return newId;
    });
    const [messages, setMessages] = useState(() => {
        // Load messages from local storage on initial render.
        const storedMessages = localStorage.getItem('assistantMessages');
        return storedMessages ? JSON.parse(storedMessages) : [];
    });
    const askCardRef = useRef(null);
    const stickToBottom = useRef(true);
    const clearingRef = useRef(false);
    const dispatch = useDispatch();

    /**
     * Ask the assistant, rendering the answer as it arrives when the server
     * streams it. The server sends SSE only when the local model is serving;
     * Gemini replies with a normal JSON body, so both shapes are handled and
     * onDelta simply never fires in the non-streaming case.
     */
    const fetchResponse = async (prompt, history, conversationId, onDelta, onWaiting) => {
        // Strip UI-only fields (engine, streaming) before sending history back:
        // Gemini rejects unknown keys inside contents[] with a 400.
        const apiHistory = (history || []).map((m) => ({ role: m.role, parts: m.parts }));

        const res = await fetch(API_ENDPOINTS.GEMINI_ASSISTANT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, history: apiHistory, conversationId, stream: true }),
        });
        if (!res.ok) throw new Error(`Assistant request failed (${res.status})`);

        if (!res.headers.get('content-type')?.includes('text/event-stream')) {
            const data = await res.json();
            const engine = data.engine || 'gemini';
            const model = data.model || null;
            // Only the box's JSON shape is grammar-enforced at the sampler;
            // Gemini's is merely requested, so a body that isn't valid JSON is
            // possible on exactly this path. An unguarded JSON.parse here threw
            // and showed "Something went wrong reaching the assistant" to a
            // visitor whose question the server had in fact answered — 200,
            // 21.5s, real content. Fall back to treating it as plain text.
            try {
                const parsed = JSON.parse(data.response);
                return { text: parsed.text ?? '', links: parsed.links ?? [], engine, model };
            } catch {
                const raw = typeof data.response === 'string' ? data.response.trim() : '';
                if (!raw) throw new Error('Assistant returned an unusable response');
                return { text: raw, links: [], engine, model };
            }
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let text = '';
        let links = [];
        let engine = 'rabinai';
        let model = null;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                let evt;
                try { evt = JSON.parse(line.slice(6)); } catch { continue; }
                if (evt.engine) engine = evt.engine;
                if (evt.model) model = evt.model;
                // Heartbeat while the box prefills. Carries no text — it exists
                // so the visitor sees the machine working instead of a still
                // screen, and so Heroku keeps the stream open.
                if (evt.waiting !== undefined) onWaiting?.(evt.waiting);
                if (evt.delta) {
                    text += evt.delta;
                    onDelta?.(text, engine, model);
                }
                if (evt.done) {
                    links = evt.links || [];
                    if (evt.engine) engine = evt.engine;
                    if (evt.model) model = evt.model;
                    // The server sends the authoritative text on done; trust it
                    // over the accumulated deltas, which can lag the final
                    // fragment.
                    //
                    // No length guard. It used to require done.text to be at
                    // least as long as the deltas, which was protecting against
                    // a lagging parser — but the server now also STRIPS
                    // scaffolding the model leaked into its own text ("Links: []"
                    // trailing an answer), and a tidied text is legitimately
                    // SHORTER. The guard would have rejected the correct value
                    // and left the leak on screen, making the server fix a no-op
                    // on exactly the path that streams.
                    if (typeof evt.text === 'string' && evt.text.length > 0) {
                        text = evt.text;
                    }
                }
            }
        }
        return { text, links, engine, model };
    };

    const handleThumbnailClick = (site) => {
        dispatch(openModal(screenshotModalFor(site)));
    };

    const handleSubmit = async (e, override) => {
        e?.preventDefault();

        const currentPrompt = (override ?? prompt).trim();
        if (!currentPrompt || isLoading) return;

        // Clear the input immediately
        setPrompt('');

        stickToBottom.current = true; // asking implies wanting to see the answer

        // Add user's message to the chat
        const userMessage = { role: 'user', parts: [{ text: currentPrompt }] };
        const newMessages = [...messages, userMessage]; // Create new array for immutability
        setMessages(newMessages); // Update state
        setIsLoading(true);
        setWaitingMs(null);

        try {
            // Render partial text in place as it streams in. SSE only opens
            // once RabinAI is actually answering, so the engine tag can show
            // from the first token instead of waiting for the finished reply.
            const onDelta = (sofar, engine) => {
                if (clearingRef.current) return;
                setWaitingMs(null); // text is arriving; the counter has done its job
                setMessages([...newMessages, { role: 'model', parts: [{ text: sofar }], streaming: true, engine }]);
            };

            const response = await fetchResponse(
                currentPrompt, messages, conversationId, onDelta, setWaitingMs,
            );
            if (clearingRef.current) return;
            const mockResponse = {
                role: 'model',
                parts: [{ text: response.text }],
                engine: response.engine,
                model: response.model,
            };

            if (response.links && response.links.length > 0) {
                response.links.forEach((link) => {
                    dispatch(addLink({ 'url': link, 'text': link }));
                });
            }
            setMessages([...newMessages, mockResponse]);
        } catch (error) {
            if (clearingRef.current) return;
            console.error('Assistant request failed:', error);
            setMessages([
                ...newMessages,
                { role: 'model', parts: [{ text: 'Something went wrong reaching the assistant. Please try again.' }] },
            ]);
        } finally {
            if (!clearingRef.current) setIsLoading(false);
        }
    };

    // Function to handle resetting the chat
    // ── Read aloud ─────────────────────────────────────────────────────
    // One <audio> for the whole page, not one per message: starting a second
    // answer must stop the first, and a shared element makes that automatic
    // rather than a bookkeeping exercise across N components.
    const audioRef = useRef(null);
    const audioUrlRef = useRef(null);
    // Bumped on every stop/start. An in-flight chunk fetch checks it before
    // playing, so audio from a cancelled answer can never jump the queue.
    const speechRunRef = useRef(0);
    const [speakingIndex, setSpeakingIndex] = useState(null);
    const [loadingSpeechIndex, setLoadingSpeechIndex] = useState(null);

    /**
     * Has this visitor ever asked for speech? Gates speculative prefetching.
     *
     * Most visitors never press the speaker, and prefetching for them spends
     * Brian's box (or his OpenAI bill) on audio nobody hears. One click is
     * enough evidence of intent to start warming the next answer.
     */
    const hasUsedSpeechRef = useRef(false);

    // Answers carry anchor markup (LinkedText renders it), and a speech engine
    // would happily read "a href equals https colon" out loud. Strip to the
    // words a person would actually say.
    const spokenTextFor = (html) => {
        const el = document.createElement('div');
        el.innerHTML = html.replace(/\*\*(.+?)\*\*/g, '$1');
        return (el.textContent || '').replace(/\s+/g, ' ').trim();
    };

    /**
     * Split an answer into speakable chunks on sentence boundaries.
     *
     * The whole point is time-to-first-audio. Synthesising a full answer took
     * ~9s measured end to end; one sentence takes a fraction of that, and the
     * rest is fetched while the reader is already listening. Chunks are capped
     * so a single runaway sentence cannot recreate the original wait.
     */
    const CHUNK_TARGET_CHARS = 220;

    const chunkForSpeech = (text) => {
        // Split AFTER terminal punctuation, keeping it attached — a chunk that
        // ends mid-clause is audible as a wrong pause.
        const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
        const chunks = [];
        let current = '';
        for (const sentence of sentences) {
            if (current && (current + sentence).length > CHUNK_TARGET_CHARS) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current += sentence;
            }
        }
        if (current.trim()) chunks.push(current.trim());
        return chunks.filter(Boolean);
    };

    const stopSpeaking = () => {
        // Invalidate anything still in flight before touching the element.
        speechRunRef.current += 1;
        // Pause but KEEP the element: it carries the browser's permission to
        // play (see unlockAudio), and throwing it away would mean asking for
        // that permission again at a moment when we no longer have a gesture.
        if (audioRef.current) audioRef.current.pause();
        if (audioUrlRef.current) {
            // Blob URLs leak until revoked; a long chat would pin every clip.
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        setSpeakingIndex(null);
    };

    /**
     * Claim playback permission SYNCHRONOUSLY, while the click is still the
     * browser's idea of a user gesture.
     *
     * Chrome grants transient activation for only a few seconds. Speech for a
     * full answer takes ~9s to synthesise, so by the time the audio arrives the
     * original click has expired and play() fails with NotAllowedError — on a
     * long answer, for a real user, having worked fine on a short one in
     * testing. Playing a silent clip inside the handler marks this element as
     * user-activated once; every later play() on the SAME element is allowed,
     * however long the fetch took. Chunking shortens that gap but does not
     * remove it, so this stays.
     */
    const SILENT_WAV =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

    const unlockAudio = () => {
        if (!audioRef.current) audioRef.current = new Audio(SILENT_WAV);
        // Rejection is fine and expected on browsers that need no unlocking.
        audioRef.current.play().catch(() => {});
        return audioRef.current;
    };

    /**
     * Synthesised audio, keyed by the exact text spoken.
     *
     * WHY BLOBS AND NOT BLOB URLs. A cached URL has to stay un-revoked to be
     * reusable, and every un-revoked URL pins its buffer for the life of the
     * page — a long chat would hold every clip it ever played. Caching the
     * Blob instead lets playback keep its existing create-then-revoke
     * discipline while the underlying audio is still reused.
     *
     * Keyed by TEXT, not by message index, so the same sentence appearing in
     * two answers is synthesised once — and so a cache entry cannot go stale
     * against the message it came from.
     *
     * Bounded, because this is a tab that may stay open all day.
     */
    const speechCacheRef = useRef(new Map());
    const SPEECH_CACHE_MAX = 60;

    /** One chunk of speech as a blob URL, or null if the run was cancelled. */
    const fetchSpeech = async (chunk, run) => {
        const key = chunk.slice(0, 4096);
        const cached = speechCacheRef.current.get(key);
        if (cached) {
            // A cancelled run must not resurrect audio, cached or not.
            if (run !== undefined && speechRunRef.current !== run) return null;
            return URL.createObjectURL(cached);
        }

        const res = await fetch(API_ENDPOINTS.READ_ALOUD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // The server rejects anything longer, so trim here rather than
            // trading a spoken answer for a 400.
            body: JSON.stringify({ prompt: key }),
        });
        if (!res.ok) throw new Error(`read aloud failed: ${res.status}`);

        const blob = await res.blob();
        // Insertion order is age order, so the first key is the oldest.
        speechCacheRef.current.set(key, blob);
        while (speechCacheRef.current.size > SPEECH_CACHE_MAX) {
            speechCacheRef.current.delete(speechCacheRef.current.keys().next().value);
        }

        if (run !== undefined && speechRunRef.current !== run) return null;
        return URL.createObjectURL(blob);
    };

    /**
     * Warm the cache for a chunk without playing it. Errors are swallowed on
     * purpose: a failed prefetch must never surface, because the visitor did
     * not ask for anything — they just have not clicked yet.
     */
    const prefetchSpeech = async (chunk) => {
        const key = chunk.slice(0, 4096);
        if (!key || speechCacheRef.current.has(key)) return;
        try {
            const url = await fetchSpeech(key);
            // fetchSpeech hands back a URL; the cache holds the Blob, so this
            // one is surplus and would leak if we kept it.
            if (url) URL.revokeObjectURL(url);
        } catch {
            /* speculative work; the click path will try again and report */
        }
    };

    /** Play one blob URL to completion on the shared element. */
    const playUrl = (audio, url) =>
        new Promise((resolve, reject) => {
            audioUrlRef.current = url;
            audio.src = url;
            audio.onended = resolve;
            audio.onerror = () => reject(new Error('audio decode failed'));
            // Never await play(): its promise can sit pending indefinitely when
            // the browser defers playback, which shows up as a button stuck
            // mid-load with a successful 200 behind it. onended drives us
            // forward instead; a genuine rejection still surfaces here.
            audio.play().catch(reject);
        });

    const handleReadAloud = async (index, html) => {
        // Belt and braces: the button is not rendered when the flag is off, but
        // the handler is the thing that spends money, so it checks too.
        if (!FEATURES.readAloud) return;
        // Second click on the message that is talking = stop.
        if (speakingIndex === index) {
            stopSpeaking();
            return;
        }
        stopSpeaking();

        const text = spokenTextFor(html);
        if (!text) return;

        // Must happen before the first await, or the gesture is already gone.
        const audio = unlockAudio();
        // Evidence of intent: from here on, warming the next answer's first
        // chunk is spending on something this visitor demonstrably wants.
        hasUsedSpeechRef.current = true;
        const run = speechRunRef.current;
        const chunks = chunkForSpeech(text);

        setLoadingSpeechIndex(index);
        try {
            // Pipeline: the next chunk is synthesised while the current one
            // plays, so the reader waits only for the FIRST one. Kick off chunk
            // 0 and then always stay one request ahead.
            let pending = fetchSpeech(chunks[0], run);

            for (let i = 0; i < chunks.length; i += 1) {
                const url = await pending;
                if (speechRunRef.current !== run) return; // stopped mid-flight
                if (!url) return;

                // Start the NEXT synthesis before playing this one — that
                // overlap is the entire speed-up.
                pending =
                    i + 1 < chunks.length
                        ? fetchSpeech(chunks[i + 1], run)
                        : Promise.resolve(null);

                if (i === 0) {
                    setLoadingSpeechIndex(null);
                    setSpeakingIndex(index);
                }
                await playUrl(audio, url);
                URL.revokeObjectURL(url);
                if (audioUrlRef.current === url) audioUrlRef.current = null;
                if (speechRunRef.current !== run) return;
            }
            setSpeakingIndex(null);
        } catch (err) {
            console.error('read aloud:', err);
            if (speechRunRef.current === run) stopSpeaking();
        } finally {
            setLoadingSpeechIndex((current) => (current === index ? null : current));
        }
    };

    // Leaving the page mid-sentence should not keep talking.
    useEffect(() => stopSpeaking, []);

    /**
     * WARM THE FIRST CHUNK of a new answer, for someone who has already shown
     * they want speech.
     *
     * Speech stays OPT-IN per answer (Brian, 2026-09-17: a universal toggle
     * was built and rejected — the per-answer button is the control). This
     * does not change that; it only removes the wait from the click.
     *
     * Why just the first chunk, and not the whole answer: most answers are
     * never played, each synthesis costs the box ~14% of the assistant's
     * generation speed while it runs, and on the cloud fallback it costs real
     * money. handleReadAloud already pipelines every later chunk behind
     * playback, so the first chunk IS the perceived latency — warming it buys
     * effectively all of the speed-up for one short request.
     *
     * And only once hasUsedSpeechRef is set, so a visitor who never presses
     * the speaker never costs anything at all.
     *
     * Keyed on the index of the last message, not its text: an answer still
     * streaming must not be synthesised in pieces.
     */
    const lastWarmedIndexRef = useRef(-1);
    useEffect(() => {
        if (!FEATURES.readAloud) return;
        if (!hasUsedSpeechRef.current) return;
        const index = messages.length - 1;
        const msg = messages[index];
        if (!msg || msg.role !== 'model' || msg.streaming) return;
        if (lastWarmedIndexRef.current === index) return; // already warmed

        const text = spokenTextFor(msg.parts?.[0]?.text || '');
        if (!text) return;
        lastWarmedIndexRef.current = index;
        prefetchSpeech(chunkForSpeech(text)[0] || '');
        // The helpers are recreated every render; depending on them would
        // re-fire this for the same answer. The index guard is what makes it
        // idempotent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    const handleResetChat = () => {
        if (clearingRef.current) return;
        clearingRef.current = true;
        // Stop pinning the composer so the ride to the top isn't fought.
        stickToBottom.current = false;
        stopSpeaking();
        // Ride the existing thread to the top, THEN unmount it. Deleting
        // first collapses the page and the viewport snaps — that's the jump.
        scrollToPageTopThen(() => {
            localStorage.removeItem('assistantMessages');
            const newConversationId = generateConversationId();
            localStorage.setItem('conversationId', newConversationId);
            setConversationId(newConversationId);
            setMessages([]);
            setPrompt('');
            setIsLoading(false);
            setSuggested(pickQuestions(QUESTION_POOL, 4));
            clearingRef.current = false;
        });
    };

    // Nudge the assistant's prefix cache as soon as someone lands, so the box
    // is usually warm by the time they finish reading and type a question.
    // Fire-and-forget: failures are irrelevant since the answer path falls
    // back to the cloud model on its own.
    useEffect(() => {
        fetch(API_ENDPOINTS.ASSISTANT_WARM, { method: 'POST' }).catch(() => {});
    }, []);

    useEffect(() => {
        const onScroll = () => {
            const el = askCardRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            stickToBottom.current = rect.bottom < window.innerHeight + 160;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        // Pin the composer (bottom of the card) in view. Scrolling a sentinel
        // in the thread used to land mid-card and hide the input under the fold.
        if (messages.length > 0 && stickToBottom.current) {
            askCardRef.current?.scrollIntoView({
                block: 'end',
                behavior: isLoading ? 'auto' : 'smooth',
            });
        }

        // Save messages to local storage whenever they change
        localStorage.setItem('assistantMessages', JSON.stringify(messages));
    }, [messages, isLoading]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <>
            <Hero variant="assistant">
                <h1 className="hero-h1">Ask me about Brian Foster.</h1>
                <p className="hero-sub">
                    Senior UI engineer in Metro Atlanta. This project: RabinAI, runs on hardware in his basement he configured himself.
                </p>
                <form onSubmit={handleSubmit} className="ask-form">
                    <div ref={askCardRef} className={`ask-card${messages.length > 0 ? ' ask-card--live' : ''}`}>
                        {messages.length > 0 && (
                            <>
                            <button
                                type="button"
                                className="btn btn-ghost ask-card-restart"
                                onClick={handleResetChat}
                            >
                                Start Over
                            </button>
                            {/* One switch for the whole conversation, rather
                                than a decision per answer. aria-pressed is the
                                honest role here: it is a toggle, not a command,
                                and a screen reader should say so. */}
                            <div className="ask-card-thread">
                                {messages.map((msg, index) => {
                                    const isAssistantMessage = msg.role === 'model';
                                    const isStreaming = !!msg.streaming;
                                    const rawText = msg.parts[0].text;
                                    const messageText = isStreaming ? rawText.replace(/<[^>]*$/, '') : rawText;
                                    const detectedSites =
                                        isAssistantMessage && !isStreaming ? detectSitesInText(messageText) : [];

                                    if (!isAssistantMessage) {
                                        return (
                                            <div key={index} className="msg-user">{messageText}</div>
                                        );
                                    }

                                    const engineLabel =
                                        msg.engine === 'gemini' ? 'Gemini'
                                        : msg.engine === 'rabinai' ? 'RabinAI'
                                        : null;

                                    return (
                                        <div key={index} className="msg-assistant">
                                            {engineLabel && (
                                                <span
                                                    className={`engine-tag engine-${msg.engine}`}
                                                    title={
                                                        msg.engine === 'rabinai'
                                                            ? `Answered by Brian's home inference box${msg.model ? ` running ${msg.model}` : ''}`
                                                            : `Answered by Google Gemini (RabinAI was offline or busy)${msg.model ? ` — ${msg.model}` : ''}`
                                                    }
                                                >
                                                    <span className="engine-tag-dot" aria-hidden="true" />
                                                    {engineLabel}
                                                    {msg.model && (
                                                        // Which model, not just which engine. The box can be
                                                        // swapped and Gemini can fall back to a different
                                                        // version, so the engine alone no longer identifies
                                                        // what actually answered.
                                                        <span className="engine-tag-model">{shortModel(msg.model)}</span>
                                                    )}
                                                </span>
                                            )}
                                            {FEATURES.readAloud && !isStreaming && messageText.trim() && (
                                                <button
                                                    type="button"
                                                    className={`read-aloud-btn${
                                                        loadingSpeechIndex === index ? ' is-loading' : ''
                                                    }`}
                                                    onClick={() => handleReadAloud(index, messageText)}
                                                    disabled={loadingSpeechIndex === index}
                                                    aria-label={
                                                        speakingIndex === index ? 'Stop reading' : 'Read this answer aloud'
                                                    }
                                                    title={
                                                        speakingIndex === index ? 'Stop reading' : 'Read this answer aloud'
                                                    }
                                                >
                                                    {speakingIndex === index ? <StopIcon /> : <SpeakerIcon />}
                                                </button>
                                            )}
                                            <span className="msg-text">
                                                <LinkedText text={messageText} />
                                            </span>
                                            {detectedSites.length > 0 && (
                                                <div className="site-thumbnails-container">
                                                    {detectedSites.map((site) => (
                                                        <button
                                                            key={site.key}
                                                            type="button"
                                                            className={`site-thumbnail${site.imageFit === 'contain' ? ' site-thumbnail--contain' : ''}`}
                                                            onClick={() => handleThumbnailClick(site)}
                                                            title={`View ${site.displayName}`}
                                                        >
                                                            <img
                                                                src={site.screenshotPath}
                                                                alt=""
                                                                className="site-thumbnail-image"
                                                            />
                                                            <span className="site-thumbnail-label">
                                                                {site.displayName}
                                                                <span> · {site.chipSuffix || 'screenshot'}</span>
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* Pending row: the box is prefilling and has sent
                                    no text yet. Before this, the visitor watched a
                                    still screen for up to 45s and reasonably
                                    concluded it had hung — the machine was working
                                    the whole time (GPU memory visibly filling), it
                                    just had nothing to say yet. The seconds come
                                    from the stream's heartbeat, not a local timer,
                                    so the number is the box's actual elapsed work
                                    rather than the browser's guess about it. */}
                                {isLoading && waitingMs !== null && (
                                    <div className="msg-pending" role="status" aria-live="polite">
                                        <span className="msg-pending-dot" aria-hidden="true" />
                                        <span>RabinAI is building an answer</span>
                                        <span className="msg-pending-secs">{Math.floor(waitingMs / 1000)}s</span>
                                    </div>
                                )}
                            </div>
                            </>
                        )}
                        <div className="ask-card-composer">
                            <textarea
                                rows="2"
                                placeholder={
                                    messages.length === 0
                                        ? "Ask about his stack, what he's shipped, or whether he's available…"
                                        : ''
                                }
                                aria-label="Your question"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <div className="ask-card-footer">
                                <span>Enter to send · Shift+Enter for a new line</span>
                                <div className="ask-card-actions">
                                    {messages.length > 0 && (
                                        <button type="button" className="btn btn-ghost" onClick={handleResetChat}>
                                            Clear
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                        {isLoading ? <span className="spinner" /> : <>Send <span aria-hidden="true">↑</span></>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
                {/* Always rendered, never gated on messages.length. Unmounting these
                    the moment a question was submitted collapsed the page height and
                    jerked the scroll position upward mid-answer. They are also still
                    useful once a conversation is underway — a visitor who has read one
                    answer is exactly who wants an easy second question. */}
                <div className="popular-questions">
                    <div className="eyebrow">Popular questions</div>
                    {suggested.map((q) => (
                        <button
                            key={q}
                            type="button"
                            className="popular-row"
                            onClick={() => handleSubmit(null, q)}
                            disabled={isLoading}
                        >
                            {q}
                            <span aria-hidden="true">→</span>
                        </button>
                    ))}
                </div>
            </Hero>
            <ScreenBody width="assistant">
                <section className="trust-band">
                    <h2>How this is built</h2>
                    <div className="trust-band-grid">
                        <div>
                            <div className="trust-band-title">Same source as the resume</div>
                            <p>Answers come from the document Brian keeps for this site — the same one that generates the PDF. Update it once, and both stay in sync.</p>
                        </div>
                        <div>
                            <div className="trust-band-title">Home box, or Gemini</div>
                            <p>RabinAI runs on hardware in his house. If it's cold or busy, Gemini takes the turn and the reply is tagged. You always get an answer, and you always know which model wrote it.</p>
                        </div>
                        <div>
                            <div className="trust-band-title">A judge you can run</div>
                            <p>
                                stilltrue is his open-source fact checker — the same machinery behind AskGWINnett.
                                Open{' '}
                                <NavLink to={PLAYGROUND_FACT_CHECK}>Fact Check</NavLink>
                                , paste a claim and a source, and it rules whether the source actually backs the sentence.
                            </p>
                        </div>
                    </div>
                </section>
            </ScreenBody>
        </>
    );
}

export default Home;
