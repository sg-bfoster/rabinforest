import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { openModal } from './features/modalSlice';
import { useDispatch } from 'react-redux';
import { addLink } from './features/assistantSlice';
import { API_ENDPOINTS } from './config/api';
import { detectSitesInText } from './utils/siteDetector';
import { LinkedText } from './utils/linkedText';
import PixelForest from './components/PixelForest';

// Generate a unique conversation ID
const generateConversationId = () => {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const Home = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(() => {
        // Get or create conversation ID from localStorage
        const storedId = localStorage.getItem('conversationId');
        if (storedId) {
            return storedId;
        }
        const newId = generateConversationId();
        localStorage.setItem('conversationId', newId);
        return newId;
    });
    const [messages, setMessages] = useState(() => {
        // Load messages from local storage on initial render.
        const storedMessages = localStorage.getItem('assistantMessages');
        return storedMessages ? JSON.parse(storedMessages) : [];
    });
    const messagesEndRef = useRef(null);
    const dispatch = useDispatch();

    const fetchResponse = async (prompt, history, conversationId) => {
        const { data } = await axios.post(API_ENDPOINTS.GEMINI_ASSISTANT, {
            prompt: prompt,
            history: history,
            conversationId: conversationId
        });
        return JSON.parse(data.response);
    };

    const handleThumbnailClick = (site) => {
        dispatch(
            openModal({
                type: 'screenshot',
                title: site.displayName,
                payload: {
                    screenshotPath: site.screenshotPath,
                    screenshotPaths: site.screenshotPaths || (site.screenshotPath ? [site.screenshotPath] : []),
                    summary: site.summary || '',
                    siteName: site.displayName,
                    url: site.url,
                    docs: site.docs || [],
                },
            })
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!prompt.trim() || isLoading) return;

        // Store the prompt value before clearing
        const currentPrompt = prompt.trim();

        // Clear the input immediately
        setPrompt('');

        // Add user's message to the chat
        const userMessage = { role: 'user', parts: [{ text: currentPrompt }] };
        const newMessages = [...messages, userMessage]; // Create new array for immutability
        setMessages(newMessages); // Update state
        setIsLoading(true);

        try {
            const response = await fetchResponse(currentPrompt, messages, conversationId);
            const mockResponse = { role: 'model', parts: [{ text: response.text }] };

            if (response.links && response.links.length > 0) {
                response.links.forEach((link) => {
                    dispatch(addLink({ 'url': link, 'text': link }));
                });
            }
            setMessages([...newMessages, mockResponse]);
        } catch (error) {
            console.error('Assistant request failed:', error);
            setMessages([
                ...newMessages,
                { role: 'model', parts: [{ text: 'Something went wrong reaching the assistant. Please try again.' }] },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to handle resetting the chat
    const handleResetChat = () => {
        localStorage.removeItem('assistantMessages');
        // Generate a new conversation ID for the new session
        const newConversationId = generateConversationId();
        localStorage.setItem('conversationId', newConversationId);
        setConversationId(newConversationId);
        setMessages([]);
    };

    useEffect(() => {
        // Scroll to the latest message when messages change
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

        // Save messages to local storage whenever they change
        localStorage.setItem('assistantMessages', JSON.stringify(messages));
    }, [messages]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div>
            <div className="forest-strip">
                <PixelForest />
            </div>
            <p className="intro-line">
                A virtual neural forest, grown from Brian Foster's work. Ask about his skills,
                projects, or availability.
            </p>
            <p className="intro-sub">
                Rabin Forest is the AI-powered portfolio of Brian Foster, a senior frontend / UI
                engineer in Metro Atlanta. Built for recruiters and hiring teams: ask the
                assistant anything you'd ask him, try the playground pages, or grab the{' '}
                <Link to="/resume">resume</Link>.
            </p>
            {messages.length > 0 && (
                <div className="conversation">
                    {messages.map((msg, index) => {
                        const isAssistantMessage = msg.role === 'model';
                        const messageText = msg.parts[0].text;
                        const detectedSites = isAssistantMessage ? detectSitesInText(messageText) : [];

                        if (!isAssistantMessage) {
                            return (
                                <div key={index} className="msg-user">{messageText}</div>
                            );
                        }

                        return (
                            <div key={index} className="msg-assistant">
                                <span className="msg-text">
                                    <LinkedText text={messageText} />
                                </span>
                                {detectedSites.length > 0 && (
                                    <div className="site-thumbnails-container">
                                        {detectedSites.map((site) => (
                                            <button
                                                key={site.key}
                                                type="button"
                                                className="site-thumbnail"
                                                onClick={() => handleThumbnailClick(site)}
                                                title={`Click to view ${site.displayName} screenshot`}
                                            >
                                                <img
                                                    src={site.screenshotPath}
                                                    alt={`${site.displayName} thumbnail`}
                                                    className="site-thumbnail-image"
                                                />
                                                <span className="site-thumbnail-label">{site.displayName}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="chat-input-row">
                    <textarea
                        className="input"
                        rows="2"
                        placeholder="Ask about skills, projects, or availability…"
                        aria-label="Your question"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? <span className="spinner" /> : 'Ask'}
                    </button>
                    {messages.length > 0 && (
                        <button type="button" className="btn btn-ghost" onClick={handleResetChat}>
                            Reset
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default Home;
