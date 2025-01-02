import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { openModal } from './features/modalSlice';
import { useDispatch } from 'react-redux';
import { addLink } from './features/assistantSlice';

function App() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState(() => {
        // Load messages from local storage on initial render.
        const storedMessages = localStorage.getItem('chatMessages');
        return storedMessages ? JSON.parse(storedMessages) : [];
    });
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const dispatch = useDispatch();

    const fetchResponse = async (prompt, history) => {
        const { data } = await axios.post('https://bfoster-services.herokuapp.com/ai/generate-text-gemini', { prompt: prompt, history: history });
        return JSON.parse(data.response);
    };

    const handleOpenModal = () => {
        dispatch(
            openModal({
                title: '',
                type: 'chat',
            })
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!prompt.trim()) return;

        // Add user's message to the chat
        const userMessage = { role: 'user', parts: [{ text: prompt.trim() }] };
        const newMessages = [...messages, userMessage]; // Create new array for immutability
        setMessages(newMessages); // Update state

        const response = await fetchResponse(prompt, messages);
        setPrompt('');
        const mockResponse = { role: 'model', parts: [{ text: response.text }] };

        if (response.links && response.links.length > 0) {
            response.links.forEach((link) => {
                dispatch(addLink({ 'url': link, 'text': link }));
            });
        }
        const updatedMessages = [...newMessages, mockResponse]; // Create new array for immutability
        setMessages(updatedMessages); // Update state
    };

    // Function to handle resetting the chat
    const handleResetChat = () => {
        localStorage.removeItem('chatMessages');
        setMessages([]);
    };

    // Adjust conversation height
    const adjustConversationHeight = () => {
        const headerHeight = document.querySelector('.navbar').offsetHeight;
        const footerHeight = document.querySelector('.footer').offsetHeight;
        const headerRow = document.querySelector('.header-row').offsetHeight;
        const headerH1 = document.querySelector('.playground-h1').offsetHeight;
        const inputHeight = document.querySelector('.chat-input-area').offsetHeight;

        const availableHeight = window.innerHeight - headerHeight - headerRow - headerH1 - inputHeight - footerHeight;
        if (messagesContainerRef.current) {
            messagesContainerRef.current.style.height = `${availableHeight - 80}px`;
        }
    };

    useEffect(() => {
        window.addEventListener('resize', adjustConversationHeight);
        adjustConversationHeight();

        return () => {
            window.removeEventListener('resize', adjustConversationHeight);
        };
    }, []);


    useEffect(() => {
        // Scroll to bottom when messages change
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }

        // Save messages to local storage whenever they change
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }, [messages]);

    return (
        <div className="ai-chat-container">
            <div className="header-row">
                <h2 className="ai-chat-header">AI Chat - Gemini</h2>
                <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="playground-help-icon"
                    onClick={() => handleOpenModal()}
                    title="AI Chat - Gemini"
                />
            </div>
            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`message-bubble ${msg.role === 'user' ? "assistant-b" : "assistant-a"}`}>
                        <span dangerouslySetInnerHTML={{ __html: msg.parts[0].text }}></span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">

                <form className="chat-buttons" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        style={{ minWidth: '1%' }}
                        placeholder="Enter your prompt..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <button type="submit">Send</button>
                    <button
                        className="reset-chat"
                        type="button"
                        onClick={handleResetChat}
                    >
                        Reset
                    </button>

                </form>

            </div>

        </div>
    );
}

export default App;