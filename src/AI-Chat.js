import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';

function App() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const [showModal, setShowModal] = useState(false);


    const fetchResponse = async (prompt, history) => {
        const { data } = await axios.post('https://bfoster-services.herokuapp.com/ai/generate-text-gemini', { prompt: prompt, history: history });
        return data.response;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!prompt.trim()) return;

        // Add user's message to the chat
        const userMessage = { role: 'user', parts: [{ text: prompt.trim() }] };
        setMessages((prev) => [...prev, userMessage]);

        const response = await fetchResponse(prompt, messages);
        setPrompt('');
        const mockResponse = { role: 'model', parts: [{ text: response }] };
        setMessages((prev) => [...prev, mockResponse]);
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
                messagesContainerRef.current.style.height = `${availableHeight - 103}px`;
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
    }, [messages]);

    return (
        <div className="ai-chat-container">
            <div className="header-row">
                <h2 className="ai-chat-header">AI Chat - Gemini</h2>
                <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="playground-help-icon"
                    onClick={() => setShowModal(true)}
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
                    placeholder="Enter your prompt..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                <button type="submit" style={{ marginLeft: '5px' }}>Send</button>
            </form>

            </div>
            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>AI Chat - Gemini</h3>
                        <p>This page utilizies Google Gemini AI APIs for queries.</p>
                        <button className="close-button" onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;