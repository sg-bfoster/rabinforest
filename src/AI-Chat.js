import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const AIChat = () => {
    const [messages, setMessages] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [subjectInput, setSubjectInput] = useState(""); // Input for the starting question
    const [initialSubject, setInitialSubject] = useState("What dog breed do you think is the best?");
    const pauseRef = useRef(false); // Mutable ref to control pausing in async loop
    const conLength = 8;
    const reset = useRef(false); // Mutable ref to control resetting the conversation
    const messagesEndRef = useRef(null); // Ref for scrolling to the last message
    const conversationRef = useRef(null);

    let assistantAHistory = [{ role: "user", content: initialSubject }];
    let assistantBHistory = [{ role: "assistant", content: initialSubject }];

    const resetConversation = (newSubject = initialSubject) => {
        reset.current = true;
        setMessages([]);
        assistantAHistory = [{ role: "user", content: newSubject }];
        assistantBHistory = [{ role: "assistant", content: newSubject }];
        setInitialSubject(newSubject);

        setIsActive(false);
        setIsPaused(false);
        pauseRef.current = false;
    };

    const startOrPauseDiscussion = () => {
        reset.current = false;
        if (isActive) {
            setIsPaused((prev) => !prev);
            pauseRef.current = !pauseRef.current;
        } else {
            startDiscussion();
        }
    };

    const fetchResponse = async (history, ending) => {
        const conversation = [
            ...history,
            {
                role: "system",
                content: ending
                    ? "Finish up this conversation now. Be kind. Don't ask any followup questions."
                    : "Be curious. Respond as a human. Answer with 30 words or fewer. Ask a follow up question.",
            },
        ];
        const { data } = await axios.post('https://bfoster-services.herokuapp.com/ai/ai-chat', { messages: conversation });
        return data.response;
    };


    const startDiscussion = async () => {
        setIsActive(true);
        setIsPaused(false); // Reset paused state
        pauseRef.current = false;

        let assistantA = "AssistantA";
        let assistantB = "AssistantB";
        let currentAssistant = assistantA; // Start with AssistantA

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        setMessages((prev) => [
            ...prev,
            { assistant: "AssistantA", message: initialSubject },
        ]);

        scrollToBottom(); // Ensure the initial message is in view

        // Delay before the next response
        await delay(2000);

        try {
            for (let i = 0; i < conLength; i++) {
                if (reset.current === true) {
                    break; // Exit the loop
                }
                while (pauseRef.current) {
                    console.log("Paused...");
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                const assistantCopy = currentAssistant;
                const currentHistory = assistantCopy === assistantA ? assistantAHistory : assistantBHistory;

                // Fetch the response
                const response = await fetchResponse(currentHistory, i > conLength - 3);

                // Update conversation history and switch assistants
                if (assistantCopy === assistantA) {
                    assistantAHistory.push({ role: "assistant", content: response });
                    assistantBHistory.push({ role: "user", content: response });
                    currentAssistant = assistantB;
                } else {
                    assistantBHistory.push({ role: "assistant", content: response });
                    assistantAHistory.push({ role: "user", content: response });
                    currentAssistant = assistantA;
                }

                // Update UI messages state
                setMessages((prev) => [
                    ...prev,
                    { assistant: assistantCopy === assistantA ? "AssistantB" : "AssistantA", message: response },
                ]);

                scrollToBottom(); // Scroll to the new message

                // Delay before the next response
                await delay(3000);
            }
        } catch (error) {
            console.error("Error during discussion:", error);
        } finally {
            setIsActive(false);
        }
    };

    const updateSubject = () => {
        if (subjectInput.trim()) {
            resetConversation(subjectInput.trim());
            setSubjectInput("");
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Adjust conversation height
    const adjustConversationHeight = () => {
        const headerHeight = document.querySelector('.navbar').offsetHeight;
        const footerHeight = document.querySelector('.footer').offsetHeight;
        const inputHeight = document.querySelector('.chat-input-area').offsetHeight;

        const availableHeight = window.innerHeight - headerHeight - inputHeight - footerHeight;
        if (conversationRef.current) {
            conversationRef.current.style.height = `${availableHeight - 5}px`;
        }
    };


    useEffect(() => {
        scrollToBottom(); // Ensure the conversation is scrolled to the bottom on new messages
    }, [messages]);

    useEffect(() => {
        window.addEventListener('resize', adjustConversationHeight);
        adjustConversationHeight();

        return () => {
            window.removeEventListener('resize', adjustConversationHeight);
        };
    }, []);

    return (
        <div className="ai-chat-container">
            <h2 className="ai-chat-header">AI Chat</h2>
            <div className="chat-messages" ref={conversationRef}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`message-bubble ${msg.assistant === "AssistantA" ? "assistant-a" : "assistant-b"}`}
                    >
                        <p className="message-text">
                            {msg.message}
                        </p>
                    </div>
                ))}
                <div ref={messagesEndRef} /> {/* Reference to scroll into view */}
            </div>
            <div className="chat-input-area">
                <textarea
                    rows="2"
                    className="subject-input"
                    placeholder="Enter a topic. Ex: What is your favorite movie?"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    disabled={isActive}
                />
                <div className="chat-buttons">
                    <button onClick={updateSubject} disabled={isActive || !subjectInput.trim()}>
                        Set Starting Topic
                    </button>
                    <button onClick={startOrPauseDiscussion}>
                        {isActive ? (isPaused ? "Resume Discussion" : "Pause Discussion") : "Start Discussion"}
                    </button>
                    <button onClick={() => resetConversation()} disabled={isActive && !isPaused}>
                        New Conversation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;