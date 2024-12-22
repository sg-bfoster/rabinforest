import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';

const AIChatBots = () => {
    const [messages, setMessages] = useState([]); // State for messages
    const [isActive, setIsActive] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const conLength = 8;
    const messagesEndRef = useRef(null);
    const conversationRef = useRef(null);

    let assistantAHistory = [];
    let assistantBHistory = [];

    // Adjust conversation height
    const adjustConversationHeight = () => {
        const headerHeight = document.querySelector('.navbar').offsetHeight;
        const footerHeight = document.querySelector('.footer').offsetHeight;
        const headerRow = document.querySelector('.header-row').offsetHeight;
        const headerH1 = document.querySelector('.playground-h1').offsetHeight;
        const inputHeight = document.querySelector('.chat-input-area').offsetHeight;

        const availableHeight = window.innerHeight - headerHeight - headerRow - headerH1 - inputHeight - footerHeight;
        if (conversationRef.current) {
            conversationRef.current.style.height = `${availableHeight - 103}px`;
        }
    };

    useEffect(() => {
        window.addEventListener('resize', adjustConversationHeight);
        adjustConversationHeight();

        return () => {
            window.removeEventListener('resize', adjustConversationHeight);
        };
    }, []);


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
        const { data } = await axios.post('https://bfoster-services.herokuapp.com/ai/ai-chat', { messages: conversation });
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
        <div className="ai-chat-container">
            <div className="header-row">
                <h2 className="ai-chat-header">AI Chat Bots - ChatGPT</h2>
                <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="playground-help-icon"
                    onClick={() => setShowModal(true)}
                    title="AI Chat Bots"
                />
            </div>

            <div className="chat-messages" ref={conversationRef}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`message-bubble ${msg.assistant === "AssistantA" ? "assistant-a" : "assistant-b"}`}
                    >
                        <p className="message-text">{msg.message}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                <div className="chat-buttons">
                    <button onClick={startDiscussion} disabled={isActive}>
                        {isActive ? "Conversation Active" : "Start New Conversation"}
                    </button>
                    <button onClick={() => resetConversation("")} disabled={isActive}>
                        Clear Conversation
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>AI Chat Bots</h3>
                        <p>This page allows two ChatGPT chat bots to discuss the topic you provide.</p>
                        <button className="close-button" onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIChatBots;