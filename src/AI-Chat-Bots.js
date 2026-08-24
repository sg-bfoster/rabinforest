import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';

const AIChatBots = () => {
    const [messages, setMessages] = useState([]); // State for messages
    const [isActive, setIsActive] = useState(false);
    const [topic, setTopic] = useState('');
    const conLength = 8;
    const messagesEndRef = useRef(null);

    // Bot A (left) is Gemini — the site's house model; Bot B (right) is OpenAI.
    const ENGINES = ["gemini", "openai"];

    let assistantAHistory = [];
    let assistantBHistory = [];

    const resetConversation = (newSubject) => {
        setMessages([]); // Clear only the state, NOT localStorage
        localStorage.removeItem("messages");
        assistantAHistory = newSubject
            ? [{ role: "user", content: newSubject }]
            : [];
        assistantBHistory = newSubject
            ? [{ role: "assistant", content: newSubject }]
            : [];
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
        const { data } = await axios.post(API_ENDPOINTS.AI_CHAT, { messages: conversation, engine });
        return data.response;
    };

    const startDiscussion = async (e) => {
        e.preventDefault();
        const subject = topic.trim();
        if (!subject || isActive) return;

        resetConversation(subject);
        setIsActive(true);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const assistants = ["AssistantA", "AssistantB"];
        let currentAssistant = 1; // Start with AssistantB

        assistantAHistory.push({ role: "user", content: subject });
        assistantBHistory.push({ role: "user", content: subject });

        setMessages([{ assistant: assistants[0], message: subject }]);
        scrollToBottom();
        await delay(1000);

        try {
            for (let i = 0; i < conLength; i++) {
                const assistantIndex = currentAssistant; // Capture current value of `currentAssistant`

                const history = assistantIndex === 0 ? assistantAHistory : assistantBHistory;

                const response = await fetchResponse(history, i >= conLength - 2, ENGINES[assistantIndex]);

                if (assistantIndex === 0) {
                    assistantAHistory.push({ role: "assistant", content: response });
                    assistantBHistory.push({ role: "user", content: response });
                } else {
                    assistantBHistory.push({ role: "assistant", content: response });
                    assistantAHistory.push({ role: "user", content: response });
                }

                setMessages((prev) => [
                    ...prev,
                    { assistant: assistants[assistantIndex], message: response },
                ]);

                currentAssistant = 1 - currentAssistant; // Toggle between 0 (A) and 1 (B)
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
        // Load messages from localStorage on first mount
        const storedMessages = localStorage.getItem("messages");
        if (storedMessages) {
            setMessages(JSON.parse(storedMessages));
        }
    }, []);

    useEffect(() => {
        // Save messages to localStorage when messages state changes
        if (messages.length > 0) {
            localStorage.setItem("messages", JSON.stringify(messages));
        }
    }, [messages]);

    return (
        <div>
            <h2 className="screen-h2">Two bots, one topic.</h2>
            <p className="screen-sub">
                Give a subject and Gemini and OpenAI talk it out — eight turns, then they wrap up.
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
                    {messages.map((msg, idx) =>
                        msg.assistant === "AssistantA" ? (
                            <div key={idx} className="msg-assistant msg-labeled">
                                <span className="bot-label">Gemini</span>
                                <p className="msg-text" style={{ margin: 0 }}>{msg.message}</p>
                            </div>
                        ) : (
                            <div key={idx} className="msg-labeled-right">
                                <span className="bot-label">OpenAI</span>
                                <div className="msg-user">{msg.message}</div>
                            </div>
                        )
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
    );
};

export default AIChatBots;
