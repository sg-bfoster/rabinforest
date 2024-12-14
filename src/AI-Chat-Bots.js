import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const AIChatBots = () => {
    const [messages, setMessages] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const conLength = 8;
    const messagesEndRef = useRef(null);
    const conversationRef = useRef(null);

    let assistantAHistory = [];
    let assistantBHistory = [];

    const resetConversation = (newSubject) => {
        setMessages([]);
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
    
        // Add the initial message as the user's topic
        assistantAHistory.push({ role: "user", content: topic.trim() });
        assistantBHistory.push({ role: "user", content: topic.trim() });
    
        setMessages([{ assistant: assistants[0], message: topic.trim() }]);
        scrollToBottom();
        await delay(2000);
    
        try {
            for (let i = 0; i < conLength; i++) {
                const history = currentAssistant === 0 ? assistantAHistory : assistantBHistory;
                const assistantIndex = currentAssistant; // Capture current assistant index
    
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
                await delay(2000);
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

    const adjustConversationHeight = () => {
        const headerHeight = document.querySelector('.navbar')?.offsetHeight || 0;
        const footerHeight = document.querySelector('.footer')?.offsetHeight || 0;
        const inputHeight = document.querySelector('.chat-input-area')?.offsetHeight || 0;
        const availableHeight = window.innerHeight - headerHeight - footerHeight - inputHeight;

        if (conversationRef.current) {
            conversationRef.current.style.height = `${availableHeight - 5}px`;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        window.addEventListener('resize', adjustConversationHeight);
        adjustConversationHeight();

        return () => window.removeEventListener('resize', adjustConversationHeight);
    }, []);

    return (
        <div className="ai-chat-container">
            <h2 className="ai-chat-header">AI Chat Bots</h2>
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
        </div>
    );
};

export default AIChatBots;
