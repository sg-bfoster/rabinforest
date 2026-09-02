import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { openModal } from './features/modalSlice';
import { useDispatch } from 'react-redux';
import { addLink } from './features/assistantSlice';
import { API_ENDPOINTS } from './config/api';
import { FEATURES } from './config/features';
import { detectSitesInText } from './utils/siteDetector';
import { LinkedText } from './utils/linkedText';
import { Hero, ScreenBody } from './components/Hero';
import { NavLink } from 'react-router-dom';
import { PLAYGROUND_FACT_CHECK } from './playgroundRoutes';

const QUESTION_POOL = [
    'What has Brian built recently?',
    "What's his frontend stack?",
    'Tell me about AskGWINnett',
    "What's stilltrue?",
    'Tell me about Callmata',
    "What's RabinAI?",
    'Is he available for work?',
    'Where is he based?',
    'Does he work in Angular or React?',
    'Tell me about Lost Corridors',
    "What's Tellspinners?",
    'How do I contact him?',
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

const Home = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggested, setSuggested] = useState(() => pickQuestions(QUESTION_POOL, 3));
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
    const dispatch = useDispatch();

    /**
     * Ask the assistant, rendering the answer as it arrives when the server
     * streams it. The server sends SSE only when the local model is serving;
     * Gemini replies with a normal JSON body, so both shapes are handled and
     * onDelta simply never fires in the non-streaming case.
     */
    const fetchResponse = async (prompt, history, conversationId, onDelta) => {
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
            // Only the box's JSON shape is grammar-enforced at the sampler;
            // Gemini's is merely requested, so a body that isn't valid JSON is
            // possible on exactly this path. An unguarded JSON.parse here threw
            // and showed "Something went wrong reaching the assistant" to a
            // visitor whose question the server had in fact answered — 200,
            // 21.5s, real content. Fall back to treating it as plain text.
            try {
                const parsed = JSON.parse(data.response);
                return { text: parsed.text ?? '', links: parsed.links ?? [], engine };
            } catch {
                const raw = typeof data.response === 'string' ? data.response.trim() : '';
                if (!raw) throw new Error('Assistant returned an unusable response');
                return { text: raw, links: [], engine };
            }
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let text = '';
        let links = [];
        let engine = 'rabinai';
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
                if (evt.delta) {
                    text += evt.delta;
                    onDelta?.(text, engine);
                }
                if (evt.done) {
                    links = evt.links || [];
                    if (evt.engine) engine = evt.engine;
                    // The server sends the complete text on done; trust it over
                    // the accumulated deltas, which can lag the final fragment.
                    if (typeof evt.text === 'string' && evt.text.length >= text.length) {
                        text = evt.text;
                    }
                }
            }
        }
        return { text, links, engine };
    };

    const handleThumbnailClick = (site) => {
        dispatch(
            openModal({
                type: 'screenshot',
                title: site.displayName,
                payload: {
                    screenshotPath: site.screenshotPath,
                    screenshotPaths: site.screenshotPaths || (site.screenshotPath ? [site.screenshotPath] : []),
                    summary: site.summary || '',
                    siteName: site.displayName,
                    url: site.url,
                    docs: site.docs || [],
                },
            })
        );
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

        try {
            // Render partial text in place as it streams in. SSE only opens
            // once RabinAI is actually answering, so the engine tag can show
            // from the first token instead of waiting for the finished reply.
            const onDelta = (sofar, engine) =>
                setMessages([...newMessages, { role: 'model', parts: [{ text: sofar }], streaming: true, engine }]);

            const response = await fetchResponse(currentPrompt, messages, conversationId, onDelta);
            const mockResponse = {
                role: 'model',
                parts: [{ text: response.text }],
                engine: response.engine,
            };

            if (response.links && response.links.length > 0) {
                response.links.forEach((link) => {
                    dispatch(addLink({ 'url': link, 'text': link }));
                });
            }
            setMessages([...newMessages, mockResponse]);
        } catch (error) {
            console.error('Assistant request failed:', error);
            setMessages([
                ...newMessages,
                { role: 'model', parts: [{ text: 'Something went wrong reaching the assistant. Please try again.' }] },
            ]);
        } finally {
            setIsLoading(false);
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

    /** One chunk of speech as a blob URL, or null if the run was cancelled. */
    const fetchSpeech = async (chunk, run) => {
        const res = await fetch(API_ENDPOINTS.READ_ALOUD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // The server rejects anything longer, so trim here rather than
            // trading a spoken answer for a 400.
            body: JSON.stringify({ prompt: chunk.slice(0, 4096) }),
        });
        if (!res.ok) throw new Error(`read aloud failed: ${res.status}`);
        if (speechRunRef.current !== run) return null;
        return URL.createObjectURL(await res.blob());
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

    const handleResetChat = () => {
        localStorage.removeItem('assistantMessages');
        const newConversationId = generateConversationId();
        localStorage.setItem('conversationId', newConversationId);
        setConversationId(newConversationId);
        setMessages([]);
        setPrompt('');
        setIsLoading(false);
        stopSpeaking();
        setSuggested(pickQuestions(QUESTION_POOL, 3));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Stick to the bottom while an answer streams in, but stop fighting the
    // user the moment they scroll up to re-read something.
    const stickToBottom = useRef(true);

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
                <h1 className="hero-h1">Ask me about Brian.</h1>
                <p className="hero-sub">
                    Senior UI engineer in Metro Atlanta. RabinAI runs on hardware
                    in his basement he configured himself.
                </p>
                <form onSubmit={handleSubmit} className="ask-form">
                    <div ref={askCardRef} className={`ask-card${messages.length > 0 ? ' ask-card--live' : ''}`}>
                        {messages.length > 0 && (
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
                                                            ? "Answered by Brian's home inference box"
                                                            : 'Answered by Google Gemini (RabinAI was offline or busy)'
                                                    }
                                                >
                                                    <span className="engine-tag-dot" aria-hidden="true" />
                                                    {engineLabel}
                                                </span>
                                            )}
                                            {FEATURES.readAloud && !isStreaming && messageText.trim() && (
                                                <button
                                                    type="button"
                                                    className="read-aloud-btn"
                                                    onClick={() => handleReadAloud(index, messageText)}
                                                    disabled={loadingSpeechIndex === index}
                                                    aria-label={
                                                        speakingIndex === index ? 'Stop reading' : 'Read this answer aloud'
                                                    }
                                                    title={
                                                        speakingIndex === index ? 'Stop reading' : 'Read this answer aloud'
                                                    }
                                                >
                                                    {loadingSpeechIndex === index ? '…' : speakingIndex === index ? '◼' : '🔊'}
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
                                                            className="site-thumbnail"
                                                            onClick={() => handleThumbnailClick(site)}
                                                            title={`Click to view ${site.displayName} screenshot`}
                                                        >
                                                            <img
                                                                src={site.screenshotPath}
                                                                alt={`${site.displayName} thumbnail`}
                                                                className="site-thumbnail-image"
                                                            />
                                                            <span className="site-thumbnail-label">
                                                                {site.displayName}
                                                                <span> · screenshot</span>
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
