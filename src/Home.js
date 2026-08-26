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

    /**
     * Ask the assistant, rendering the answer as it arrives when the server
     * streams it. The server sends SSE only when the local model is serving;
     * Gemini replies with a normal JSON body, so both shapes are handled and
     * onDelta simply never fires in the non-streaming case.
     */
    const fetchResponse = async (prompt, history, conversationId, onDelta) => {
        // Strip UI-only fields (engine, streaming) before sending history back:
        // Gemini rejects unknown keys inside contents[] with a 400.
        const apiHistory = (history || []).map((m) => ({ role: m.role, parts: m.parts }));

        const res = await fetch(API_ENDPOINTS.GEMINI_ASSISTANT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, history: apiHistory, conversationId, stream: true }),
        });
        if (!res.ok) throw new Error(`Assistant request failed (${res.status})`);

        if (!res.headers.get('content-type')?.includes('text/event-stream')) {
            const data = await res.json();
            return { ...JSON.parse(data.response), engine: data.engine || 'gemini' };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let text = '';
        let links = [];
        let engine = 'rabinai';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                let evt;
                try { evt = JSON.parse(line.slice(6)); } catch { continue; }
                if (evt.engine) engine = evt.engine;
                if (evt.delta) {
                    text += evt.delta;
                    onDelta?.(text, engine);
                }
                if (evt.done) {
                    links = evt.links || [];
                    if (evt.engine) engine = evt.engine;
                    // The server sends the complete text on done; trust it over
                    // the accumulated deltas, which can lag the final fragment.
                    if (typeof evt.text === 'string' && evt.text.length >= text.length) {
                        text = evt.text;
                    }
                }
            }
        }
        return { text, links, engine };
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

        stickToBottom.current = true; // asking implies wanting to see the answer

        // Add user's message to the chat
        const userMessage = { role: 'user', parts: [{ text: currentPrompt }] };
        const newMessages = [...messages, userMessage]; // Create new array for immutability
        setMessages(newMessages); // Update state
        setIsLoading(true);

        try {
            // Render partial text in place as it streams in. SSE only opens
            // once RabinAI is actually answering, so the engine tag can show
            // from the first token instead of waiting for the finished reply.
            const onDelta = (sofar, engine) =>
                setMessages([...newMessages, { role: 'model', parts: [{ text: sofar }], streaming: true, engine }]);

            const response = await fetchResponse(currentPrompt, messages, conversationId, onDelta);
            const mockResponse = {
                role: 'model',
                parts: [{ text: response.text }],
                engine: response.engine,
            };

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

    // Stick to the bottom while an answer streams in, but stop fighting the
    // user the moment they scroll up to re-read something.
    const stickToBottom = useRef(true);

    // Nudge the assistant's prefix cache as soon as someone lands, so the box
    // is usually warm by the time they finish reading and type a question.
    // Fire-and-forget: failures are irrelevant since the answer path falls
    // back to the cloud model on its own.
    useEffect(() => {
        fetch(API_ENDPOINTS.ASSISTANT_WARM, { method: 'POST' }).catch(() => {});
    }, []);

    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement;
            stickToBottom.current =
                doc.scrollHeight - (window.scrollY + window.innerHeight) < 160;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        // Scroll the PAGE to the bottom rather than aligning the end-of-list
        // marker: that marker sits above the input form, so scrolling it into
        // view pushes the form off-screen and can even scroll upward.
        if (messages.length > 0 && stickToBottom.current) {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                // Smooth animation can't keep up with streaming deltas and ends
                // up trailing the text, so jump instantly while a reply lands.
                behavior: isLoading ? 'auto' : 'smooth',
            });
        }

        // Save messages to local storage whenever they change
        localStorage.setItem('assistantMessages', JSON.stringify(messages));
    }, [messages, isLoading]);

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
            <p className="intro-note">
                Answers come from <strong>RabinAI</strong> — a Qwen3-30B model Brian runs on a mini
                PC in his basement — and fall back to Google Gemini automatically when it's offline or
                busy. Same answers either way; he built the routing.
            </p>
            {messages.length > 0 && (
                <div className="conversation">
                    {messages.map((msg, index) => {
                        const isAssistantMessage = msg.role === 'model';
                        const isStreaming = !!msg.streaming;
                        const rawText = msg.parts[0].text;

                        // While an answer streams, the text is partial: a trailing
                        // "<a href='..." would render as literal markup, so trim any
                        // half-written tag until the closing bracket arrives.
                        const messageText = isStreaming ? rawText.replace(/<[^>]*$/, '') : rawText;

                        // Site thumbnails are computed from the finished answer only.
                        // Running detection on every delta remounts the <img> tags
                        // repeatedly, aborting their loads mid-flight and leaving
                        // broken-image icons behind.
                        const detectedSites =
                            isAssistantMessage && !isStreaming ? detectSitesInText(messageText) : [];

                        if (!isAssistantMessage) {
                            return (
                                <div key={index} className="msg-user">{messageText}</div>
                            );
                        }

                        const engineLabel =
                            msg.engine === 'gemini' ? 'Gemini'
                            : msg.engine === 'rabinai' ? 'RabinAI'
                            : null;

                        return (
                            <div key={index} className="msg-assistant">
                                {engineLabel && (
                                    <span
                                        className={`engine-tag engine-${msg.engine}`}
                                        title={
                                            msg.engine === 'rabinai'
                                                ? "Answered by Brian's home inference box"
                                                : 'Answered by Google Gemini (RabinAI was offline or busy)'
                                        }
                                    >
                                        {engineLabel}
                                    </span>
                                )}
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
