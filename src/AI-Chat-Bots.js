import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';
import { FEATURES } from './config/features';
import { Hero, ScreenBody } from './components/Hero';

/**
 * Three bots, one topic. Gemini and OpenAI are cloud models; RabinAI is the
 * home inference box, which is part-time by design — when it's off the
 * conversation keeps going and the box's turn is a sleeping mini-PC.
 *
 * The box being unreachable used to hang the whole panel: axios had no
 * timeout, and only a JSON 503 { asleep: true } counted as a skip. Heroku
 * H12s, tunnel timeouts, and network errors all throw instead — so Gemini
 * and OpenAI never got their remaining turns. Any RabinAI miss is now
 * asleep, and once it's down we stop asking for the rest of the run.
 */
const BOTS = [
    { id: 'AssistantA', label: 'Gemini', engine: 'gemini', side: 'left' },
    { id: 'AssistantB', label: 'OpenAI', engine: 'openai', side: 'right' },
    { id: 'AssistantC', label: 'RabinAI', engine: 'rabinai', side: 'center' },
];

// Which model occupies the local seat. Keys ONLY — the server owns the mapping
// to real model ids (RABINAI_MODELS in ai.js), because letting a browser name a
// model would be asking the box to load whatever a visitor typed.
//
// A toggle rather than a fourth bot on purpose: Chat Bots runs strictly
// sequentially, so a fourth speaker would add ~33% to every round, undoing the
// turn/token tuning. Swapping the local seat shows the same thing — the box
// runs more than one model — at no cost to conversation length.
const LOCAL_MODELS = {
    primary: { label: 'Primary' },
    alt: { label: 'Alternate' },
};

// One line of steering each — the tone slot in the panel prompt. Proven by the
// original hard-coded "polite agreement is boring", which reliably produced
// pushback from all three engines.
const TONES = {
    argumentative: {
        label: 'Argumentative',
        prompt: 'Take strong positions and push back hard on the other speakers — polite agreement is boring. Concede nothing without a fight.',
    },
    agreeable: {
        label: 'Agreeable',
        prompt: "Look for common ground: build on the other speakers' points, extend their examples, and say where you agree before adding nuance.",
    },
    passive: {
        label: 'Passive',
        prompt: 'Be hesitant and mild. Hedge your claims, defer to the stronger voices, and phrase opinions as tentative suggestions.',
    },
    skeptical: {
        label: 'Skeptical',
        prompt: 'Question everything. Ask for evidence, poke holes in confident claims, and take nothing at face value.',
    },
    enthusiastic: {
        label: 'Enthusiastic',
        prompt: 'Be energised and optimistic. Find the exciting angle in every point and run with it.',
    },
    deadpan: {
        label: 'Deadpan',
        prompt: 'Dry wit: flat, understated delivery, with the occasional cutting one-liner.',
    },
};

// A little longer than the box's 30s abort so a slow-but-awake reply still
// lands; short enough that a connection that never closes cannot freeze the
// panel. Subsequent RabinAI turns in the same run do not wait this out again.
const RABINAI_CLIENT_MS = 32_000;

/**
 * Starter topics, four drawn at random per page load — same empty-box
 * problem the imagery page solved with chips. Short enough to read as a
 * chip, concrete enough that three models can spend nine turns on them
 * without collapsing into "it depends".
 */
const TOPIC_POOL = [
    'Is a hot dog a sandwich?',
    'Should cities ban cars downtown?',
    'Is remote work here to stay?',
    'Does AI-generated art count as art?',
    'Are open offices a mistake?',
    'Should we bring back physical media?',
    'Is college still worth the cost?',
    'Can nuclear power carry the grid?',
    'Is nostalgia ruining new movies?',
    'Should phones be banned in schools?',
    'Do we have too many streaming apps?',
    'Is the 4-day work week inevitable?',
];

const pickTopics = (pool, n) => {
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
};

/** Pixel mini-PC with floating zzz — same rect language as the header tree. */
const SleepingServer = () => (
    <svg
        className="asleep-server-svg"
        viewBox="0 0 80 52"
        width="80"
        height="52"
        aria-hidden="true"
    >
        <g fill="currentColor">
            <rect x="6" y="20" width="2" height="24" />
            <rect x="42" y="20" width="2" height="24" />
            <rect x="6" y="20" width="38" height="2" />
            <rect x="6" y="42" width="38" height="2" />
            <rect x="12" y="26" width="18" height="2" />
            <rect x="12" y="30" width="18" height="2" />
            <rect x="12" y="34" width="12" height="2" />
            <rect x="34" y="28" width="4" height="2" className="asleep-led" />
            <rect x="10" y="44" width="4" height="2" />
            <rect x="36" y="44" width="4" height="2" />
        </g>
        <text className="asleep-z asleep-z1" x="50" y="24">z</text>
        <text className="asleep-z asleep-z2" x="58" y="16">z</text>
        <text className="asleep-z asleep-z3" x="68" y="8">z</text>
    </svg>
);

const AIChatBots = () => {
    const [messages, setMessages] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [topic, setTopic] = useState('');
    const [topics] = useState(() => pickTopics(TOPIC_POOL, 4));
    // Mixed defaults on purpose, so a first visit shows the dropdowns matter.
    const [tones, setTones] = useState(['argumentative', 'agreeable', 'skeptical']);
    const [localModel, setLocalModel] = useState('primary');
    const conLength = 9; // multiple of 3 so every bot gets equal turns — 2 substantive rounds + 1 closing round. 12 was tried; the growing history compounds RabinAI's prefill each turn, and 9 keeps the late rounds well clear of the deadline instead of brushing it.

    // One history per bot: its own lines are "assistant", everyone else's are
    // "user", which is how each model sees itself as a participant.
    const histories = useRef(BOTS.map(() => []));
    const rabinAsleep = useRef(false);
    const conversationRef = useRef(null);
    const followRef = useRef(true);
    const wasActiveRef = useRef(false);

    const resetConversation = (newSubject) => {
        setMessages([]);
        localStorage.removeItem("messages");
        histories.current = BOTS.map(() =>
            newSubject ? [{ role: "user", content: newSubject }] : []
        );
        rabinAsleep.current = false;
        // Clearing (no new subject) should also empty the input — it's the
        // only visible state when there's no transcript, and leaving it made
        // the Clear button appear to do nothing.
        if (!newSubject) setTopic("");
        setIsActive(false);
    };

    const fetchResponse = async (history, ending, engine, tonePrompt) => {
        const conversation = [
            ...history,
            {
                role: "system",
                content: ending
                    ? `This is the final round — wrap up the discussion in the same tone you've used throughout. ${tonePrompt} State where you landed and the strongest point another speaker made, in 25-45 words, then close with ONE short sign-off sentence. No drawn-out goodbyes and no thanking the other speakers by turn.`
                    : `You are one voice in a panel discussion. ${tonePrompt} Back your points with a concrete example or a specific line of reasoning, in 25-50 words. Make one point well, not three points thinly. End with a question only if it genuinely moves the discussion somewhere new; statements are fine.`,
            },
        ];
        if (engine === 'rabinai' && rabinAsleep.current) return null;
        try {
            const { data } = await axios.post(
                API_ENDPOINTS.AI_CHAT,
                {
                    messages: conversation,
                    engine,
                    // Ignored by the cloud engines; the server resolves the key.
                    ...(engine === 'rabinai' ? { localModel } : {}),
                },
                engine === 'rabinai' ? { timeout: RABINAI_CLIENT_MS } : undefined,
            );
            const text = data?.response;
            if (engine === 'rabinai' && !text) {
                rabinAsleep.current = true;
                return null;
            }
            return text;
        } catch (error) {
            if (engine === 'rabinai') {
                rabinAsleep.current = true;
                return null;
            }
            throw error;
        }
    };

    // Reveal a reply word-by-word so it reads like the bot is typing. Purely
    // visual — the full text has already arrived; this is presentation, not
    // transport. Real SSE here would mean three engines' worth of streaming
    // paths for a page where only the effect matters (the assistant page is
    // where genuine streaming earns its complexity, and even there it owns
    // the H12 story). Word-chunked so mid-word flicker never shows; ~26ms per
    // word puts a 75-word panel reply at ~2s, a touch under reading speed.
    const revealMessage = (botId, fullText) =>
        new Promise((resolve) => {
            const words = fullText.split(/(\s+)/); // keep whitespace tokens
            setMessages((prev) => [...prev, { assistant: botId, message: "", streaming: true }]);
            let idx = 0;
            const tick = () => {
                idx = Math.min(idx + 2, words.length); // two tokens ≈ one word + space
                const text = words.slice(0, idx).join("");
                const done = idx >= words.length;
                setMessages((prev) => {
                    const next = prev.slice(0, -1);
                    next.push({ assistant: botId, message: text, streaming: !done });
                    return next;
                });
                if (done) resolve();
                else setTimeout(tick, 26);
            };
            tick();
        });

    const startDiscussion = async (e, override) => {
        e?.preventDefault();
        // A chip passes its text directly: setTopic is async, so reading the
        // state here would start the PREVIOUS topic on the first click.
        const subject = (override ?? topic).trim();
        if (!subject || isActive) return;
        if (override) setTopic(override);

        followRef.current = true;
        resetConversation(subject);
        setIsActive(true);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        histories.current.forEach((h) => h.push({ role: "user", content: subject }));

        setMessages([{ assistant: BOTS[0].id, message: subject, isTopic: true }]);
        await delay(1000);

        try {
            for (let i = 0; i < conLength; i++) {
                const turn = i % BOTS.length;
                const bot = BOTS[turn];
                const response = await fetchResponse(
                    histories.current[turn],
                    i >= conLength - BOTS.length,
                    bot.engine,
                    TONES[tones[turn]].prompt,
                );

                if (response === null) {
                    setMessages((prev) => [
                        ...prev,
                        { assistant: bot.id, message: `${bot.label} is asleep 🌲`, asleep: true },
                    ]);
                    await delay(400);
                    continue;
                }

                histories.current.forEach((h, idx) =>
                    h.push({ role: idx === turn ? "assistant" : "user", content: response })
                );

                await revealMessage(bot.id, response);
                await delay(400);
            }
        } catch (error) {
            console.error("Error during discussion:", error);
        } finally {
            setIsActive(false);
        }
    };

    useEffect(() => {
        const storedMessages = localStorage.getItem("messages");
        if (storedMessages) {
            setMessages(JSON.parse(storedMessages));
        }
    }, []);

    useEffect(() => {
        // Skip persistence while a bubble is mid-reveal: the typewriter updates
        // every ~18ms, and serialising the transcript on each tick is pure waste.
        if (messages.length > 0 && !messages.some((m) => m.streaming)) {
            localStorage.setItem("messages", JSON.stringify(messages));
        }
    }, [messages]);

    // Follow the latest bubble, then once more onto New topic when the run
    // ends. We used to gate on "already near the document bottom" — that
    // never fired from the form (hero + chips sit above the thread), so the
    // conversation grew off-screen. Stick-to-tail instead, same as Home:
    // follow until the reader scrolls up, resume if they come back down.
    useEffect(() => {
        const onScroll = () => {
            const tail = conversationRef.current?.lastElementChild;
            if (!tail) return;
            const rect = tail.getBoundingClientRect();
            followRef.current = rect.bottom <= window.innerHeight + 160;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (messages.length === 0) return;
        const runEnded = wasActiveRef.current && !isActive;
        wasActiveRef.current = isActive;
        // Restored transcripts stay at the top of the page. Only a live run
        // (or the New topic landing after one) should pull the viewport down.
        if (!isActive && !runEnded) return;
        if (!followRef.current && !runEnded) return;

        // After commit, one rAF has the new bubble's height. New topic mounts
        // in the same commit as isActive flipping off — a second rAF waits
        // until its height is in the layout before we aim at it.
        let inner = 0;
        const outer = requestAnimationFrame(() => {
            const tail = conversationRef.current?.lastElementChild;
            if (!tail) return;
            if (runEnded) {
                inner = requestAnimationFrame(() => {
                    tail.scrollIntoView({ block: 'end' });
                });
            } else {
                tail.scrollIntoView({ block: 'end' });
            }
        });
        return () => {
            cancelAnimationFrame(outer);
            cancelAnimationFrame(inner);
        };
    }, [messages, isActive]);

    const botFor = (id) => BOTS.find((b) => b.id === id) || BOTS[0];

    return (
        <>
            <Hero>
                <h1 className="hero-h1">Three bots, one topic.</h1>
                <p className="hero-sub hero-sub--page">
                    Give a subject and Gemini, OpenAI, and RabinAI — the model running on a
                    mini PC in Brian's basement — talk it out. Nine turns, then they wrap up.<br />&nbsp;
                </p>
            </Hero>
            <ScreenBody width="playground">
            <form onSubmit={startDiscussion} className="panel">
                <div className="chat-input-row">
                    <input
                        className="input"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Topic to discuss…"
                        aria-label="Conversation topic"
                        disabled={isActive}
                    />
                    <button type="submit" className="btn btn-primary" disabled={isActive || !topic.trim()}>
                        {isActive ? "Conversation active…" : "Start"}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => resetConversation("")} disabled={isActive}>
                        Clear
                    </button>
                </div>
                <div className="tone-row">
                    {BOTS.map((bot, idx) => (
                        <label key={bot.id} className="tone-pick">
                            <span className="tone-pick-label">{bot.label} tone</span>
                            <select
                                className="input tone-select"
                                value={tones[idx]}
                                disabled={isActive}
                                aria-label={`${bot.label} tone`}
                                onChange={(e) =>
                                    setTones((prev) => prev.map((t, i) => (i === idx ? e.target.value : t)))
                                }
                            >
                                {Object.entries(TONES).map(([key, t]) => (
                                    <option key={key} value={key}>{t.label}</option>
                                ))}
                            </select>
                        </label>
                    ))}
                </div>
                {FEATURES.localModelToggle && (
                    <div className="tone-row">
                        <label className="tone-pick">
                            <span className="tone-pick-label">RabinAI model</span>
                            <select
                                className="input tone-select"
                                value={localModel}
                                disabled={isActive}
                                aria-label="Which model runs on the local box"
                                onChange={(e) => setLocalModel(e.target.value)}
                            >
                                {Object.entries(LOCAL_MODELS).map(([key, m]) => (
                                    <option key={key} value={key}>{m.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}
            </form>
            <div className="idea-chips">
                <span className="idea-chips-label">Try one</span>
                {topics.map((idea) => (
                    <button
                        key={idea}
                        type="button"
                        className="idea-chip"
                        onClick={() => startDiscussion(null, idea)}
                        disabled={isActive}
                    >
                        {idea}
                    </button>
                ))}
            </div>
            {messages.length > 0 && (
                <div className="conversation" ref={conversationRef}>
                    {messages.map((msg, idx) => {
                        const bot = botFor(msg.assistant);
                        const cls =
                            bot.side === 'right' ? 'msg-labeled-right'
                            : bot.side === 'center' ? 'msg-labeled-center'
                            : 'msg-assistant msg-labeled';
                        const bubble =
                            bot.side === 'right' ? 'msg-user'
                            : bot.side === 'center' ? 'msg-local'
                            : 'msg-text';
                        const label = msg.isTopic
                            ? 'Topic'
                            : bot.side === 'center'
                                ? 'RabinAI · local'
                                : bot.label;
                        return (
                            <div key={idx} className={cls}>
                                <span className="bot-label">{label}</span>
                                <div
                                    className={msg.asleep ? `${bubble} asleep-bubble` : bubble}
                                    {...(msg.asleep ? { role: 'img', 'aria-label': `${bot.label} is asleep` } : {})}
                                >
                                    {msg.asleep ? (
                                        <SleepingServer />
                                    ) : (
                                        <>
                                            {msg.message}
                                            {msg.streaming && <span className="stream-cursor">▍</span>}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {!isActive && messages.length > 1 && (
                        <div className="chat-input-row" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    resetConversation("");
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                New topic
                            </button>
                        </div>
                    )}
                </div>
            )}
            </ScreenBody>
        </>
    );
};

export default AIChatBots;
