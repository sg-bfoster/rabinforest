import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';

/**
 * Three bots, one topic. Gemini and OpenAI are cloud models; RabinAI is the
 * home inference box, which is part-time by design — when it's off the server
 * answers 503 { asleep: true } and it sits that turn out rather than breaking
 * the conversation.
 */
const BOTS = [
    { id: 'AssistantA', label: 'Gemini', engine: 'gemini', side: 'left' },
    { id: 'AssistantB', label: 'OpenAI', engine: 'openai', side: 'right' },
    { id: 'AssistantC', label: 'RabinAI', engine: 'rabinai', side: 'center' },
];

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

const AIChatBots = () => {
    const [messages, setMessages] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [topic, setTopic] = useState('');
    // Mixed defaults on purpose, so a first visit shows the dropdowns matter.
    const [tones, setTones] = useState(['argumentative', 'agreeable', 'skeptical']);
    const conLength = 9; // multiple of 3 so every bot gets equal turns — 2 substantive rounds + 1 closing round. 12 was tried; the growing history compounds RabinAI's prefill each turn, and 9 keeps the late rounds well clear of the deadline instead of brushing it.

    // One history per bot: its own lines are "assistant", everyone else's are
    // "user", which is how each model sees itself as a participant.
    const histories = useRef(BOTS.map(() => []));

    const resetConversation = (newSubject) => {
        setMessages([]);
        localStorage.removeItem("messages");
        histories.current = BOTS.map(() =>
            newSubject ? [{ role: "user", content: newSubject }] : []
        );
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
        try {
            const { data } = await axios.post(API_ENDPOINTS.AI_CHAT, { messages: conversation, engine });
            return data.response;
        } catch (error) {
            // The box being off is expected, not exceptional.
            if (error.response?.status === 503 && error.response?.data?.asleep) return null;
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

    const startDiscussion = async (e) => {
        e.preventDefault();
        const subject = topic.trim();
        if (!subject || isActive) return;

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

    // After React commits the new bubble (and its height), scroll the page.
    // Calling this next to setMessages aimed at the old document height, so
    // the last message sat below the fold. Instant jump: a sticky footer
    // plus smooth animation undershoots the same way.
    useEffect(() => {
        if (messages.length === 0) return;
        const id = requestAnimationFrame(() => {
            // Follow the conversation only if the reader is already near the
            // bottom. The reveal updates state every ~26ms, so an unconditional
            // scroll here meant anyone who scrolled up to re-read got yanked
            // back down for the entire life of every typing bubble.
            const nearBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 240;
            if (nearBottom) {
                window.scrollTo({ top: document.documentElement.scrollHeight });
            }
        });
        return () => cancelAnimationFrame(id);
        // isActive: the New-topic button renders when the run ends — after the
        // last message's scroll has already fired — so scroll once more then.
    }, [messages, isActive]);

    const botFor = (id) => BOTS.find((b) => b.id === id) || BOTS[0];

    return (
        <div>
            <h2 className="screen-h2">Three bots, one topic.</h2>
            <p className="screen-sub">
                Give a subject and Gemini, OpenAI, and RabinAI — a model running on a
                mini PC in my basement — talk it out. Nine turns, then they wrap up.
            </p>
            <form onSubmit={startDiscussion}>
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
                            <span className="tone-pick-label">{bot.label}</span>
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
            </form>
            {messages.length > 0 && (
                <div className="conversation">
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
                        return (
                            <div key={idx} className={cls}>
                                <span className="bot-label">{msg.isTopic ? 'Topic' : bot.label}</span>
                                <div className={bubble} style={msg.asleep ? { opacity: 0.6, fontStyle: 'italic' } : undefined}>
                                    {msg.message}
                                    {msg.streaming && <span className="stream-cursor">▍</span>}
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
        </div>
    );
};

export default AIChatBots;
