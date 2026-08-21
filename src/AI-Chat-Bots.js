import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';

const AIChatBots = () => {
    const [messages, setMessages] = useState([]); // State for messages
    const [isActive, setIsActive] = useState(false);
    const conLength = 8;
    const messagesEndRef = useRef(null);

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

    const fetchResponse = async (history, ending) => {
        const conversation = [
            ...history,
            {
                role: "system",
                content: ending
                    ? "Finish up this conversation now. Be kind. Don't ask any follow-up questions."
                    : "Be curious. Respond as a human. Answer with 30 words or fewer. Ask a follow-up question.",
            },
        ];
        const { data } = await axios.post(API_ENDPOINTS.AI_CHAT, { messages: conversation });
        return data.response;
    };

    const startDiscussion = async () => {
        const topic = prompt("Please enter a topic to start the conversation:");
        if (!topic || !topic.trim()) {
            alert("A topic is required to start the conversation.");
            return;
        }

        resetConversation(topic.trim());
        setIsActive(true);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const assistants = ["AssistantA", "AssistantB"];
        let currentAssistant = 1; // Start with AssistantB

        assistantAHistory.push({ role: "user", content: topic.trim() });
        assistantBHistory.push({ role: "user", content: topic.trim() });

        setMessages([{ assistant: assistants[0], message: topic.trim() }]);
        scrollToBottom();
        await delay(1000);

        try {
            for (let i = 0; i < conLength; i++) {
                const assistantIndex = currentAssistant; // Capture current value of `currentAssistant`

                const history = assistantIndex === 0 ? assistantAHistory : assistantBHistory;

                const response = await fetchResponse(history, i >= conLength - 2);

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
                Give ChatGPT a subject and two assistants talk it out — eight turns, then they wrap up.
            </p>
            <div className="screen-actions">
                <button className="btn btn-primary" onClick={startDiscussion} disabled={isActive}>
                    {isActive ? "Conversation active…" : "Start a new conversation"}
                </button>
                <button className="btn btn-ghost" onClick={() => resetConversation("")} disabled={isActive}>
                    Clear
                </button>
            </div>
            {messages.length > 0 && (
                <div className="conversation">
                    {messages.map((msg, idx) =>
                        msg.assistant === "AssistantA" ? (
                            <div key={idx} className="msg-assistant msg-labeled">
                                <span className="bot-label">Bot A</span>
                                <p className="msg-text" style={{ margin: 0 }}>{msg.message}</p>
                            </div>
                        ) : (
                            <div key={idx} className="msg-user">{msg.message}</div>
                        )
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
    );
};

export default AIChatBots;
