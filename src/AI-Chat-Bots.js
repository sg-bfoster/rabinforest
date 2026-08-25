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

const AIChatBots = () => {
    const [messages, setMessages] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [topic, setTopic] = useState('');
    const conLength = 9; // multiple of 3 so every bot gets equal turns
    const messagesEndRef = useRef(null);

    // One history per bot: its own lines are "assistant", everyone else's are
    // "user", which is how each model sees itself as a participant.
    const histories = useRef(BOTS.map(() => []));

    const resetConversation = (newSubject) => {
        setMessages([]);
        localStorage.removeItem("messages");
        histories.current = BOTS.map(() =>
            newSubject ? [{ role: "user", content: newSubject }] : []
        );
        setIsActive(false);
    };

    const fetchResponse = async (history, ending, engine) => {
        const conversation = [
            ...history,
            {
                role: "system",
                content: ending
                    ? "Finish up this conversation now. Be kind. Don't ask any follow-up questions."
                    : "Be curious. Respond as a human. Answer with 30 words or fewer. Ask a follow-up question.",
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

    const startDiscussion = async (e) => {
        e.preventDefault();
        const subject = topic.trim();
        if (!subject || isActive) return;

        resetConversation(subject);
        setIsActive(true);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        histories.current.forEach((h) => h.push({ role: "user", content: subject }));

        setMessages([{ assistant: BOTS[0].id, message: subject, isTopic: true }]);
        scrollToBottom();
        await delay(1000);

        try {
            for (let i = 0; i < conLength; i++) {
                const turn = i % BOTS.length;
                const bot = BOTS[turn];
                const response = await fetchResponse(
                    histories.current[turn],
                    i >= conLength - BOTS.length,
                    bot.engine,
                );

                if (response === null) {
                    setMessages((prev) => [
                        ...prev,
                        { assistant: bot.id, message: `${bot.label} is asleep 🌲`, asleep: true },
                    ]);
                    scrollToBottom();
                    await delay(400);
                    continue;
                }

                histories.current.forEach((h, idx) =>
                    h.push({ role: idx === turn ? "assistant" : "user", content: response })
                );

                setMessages((prev) => [...prev, { assistant: bot.id, message: response }]);
                scrollToBottom();
                await delay(1000);
            }
        } catch (error) {
            console.error("Error during discussion:", error);
        } finally {
            setIsActive(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const storedMessages = localStorage.getItem("messages");
        if (storedMessages) {
            setMessages(JSON.parse(storedMessages));
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem("messages", JSON.stringify(messages));
        }
    }, [messages]);

    const botFor = (id) => BOTS.find((b) => b.id === id) || BOTS[0];

    return (
        <div>
            <h2 className="screen-h2">Three bots, one topic.</h2>
            <p className="screen-sub">
                Give a subject and Gemini, OpenAI, and RabinAI — a model running on a
                mini PC in my house — talk it out. Nine turns, then they wrap up.
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
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
    );
};

export default AIChatBots;
