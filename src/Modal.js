// src/components/Modal.js
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectModal, closeModal, openModal } from './features/modalSlice';
import axios from 'axios';
import { API_ENDPOINTS, getAdminHeaders, clearAdminSession } from './config/api';
import { LinkedText } from './utils/linkedText';

// Conversation Log Component with delete functionality
const ConversationLogContent = ({ payload, onClose, dispatch }) => {
    const [messages, setMessages] = useState(payload?.messages || []);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown date';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (e) {
            return timestamp;
        }
    };

    const handleDeleteConversation = async () => {
        if (!payload?.conversationId && !payload?.id) {
            setError('Cannot delete: No conversation ID');
            return;
        }

        const conversationId = payload.conversationId || payload.id;
        
        if (!window.confirm('Are you sure you want to delete this entire conversation? This action cannot be undone.')) {
            return;
        }

        try {
            setDeleting(true);
            setError(null);
            
            await axios.delete(API_ENDPOINTS.DELETE_CONVERSATION(conversationId), {
                headers: getAdminHeaders(),
            });
            
            // Close the modal after successful deletion
            onClose();
            
            // Dispatch a custom event to notify Admin component to refresh the list
            window.dispatchEvent(new CustomEvent('conversationDeleted', { detail: { conversationId } }));
        } catch (err) {
            console.error('Error deleting conversation:', err);
            if (err.response?.status === 401 || err.response?.status === 503) {
                clearAdminSession();
                setError('Admin session expired. Close this and log in again.');
            } else {
                setError('Failed to delete conversation. Please try again.');
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {payload && messages && (
                <>
                    <div className="modal-log-header">
                        <div>
                            <p className="modal-log-meta">
                                <strong>Date:</strong> {formatTimestamp(payload.lastActivity || payload.updatedAt || payload.timestamp || payload.createdAt)}
                            </p>
                            <p className="modal-log-meta">
                                <strong>Messages:</strong> {messages.length}
                            </p>
                            {(payload.conversationId || payload.id) && (
                                <p className="modal-log-meta modal-log-id">
                                    <strong>Conversation ID:</strong> {payload.conversationId || payload.id}
                                </p>
                            )}
                        </div>
                        <button
                            className="btn btn-ghost"
                            onClick={handleDeleteConversation}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Delete Conversation'}
                        </button>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-log-messages">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === 'user';
                            const messageText = msg.parts && msg.parts[0] ? msg.parts[0].text : '';
                            return isUser ? (
                                <div key={index} className="msg-user">{messageText}</div>
                            ) : (
                                <div key={index} className="msg-assistant">
                                    <span className="msg-text">
                                        <LinkedText text={messageText} />
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </>
            )}
            {(!payload || !messages || messages.length === 0) && (
                <div>
                    <p>No conversation data available.</p>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            )}
        </div>
    );
};

const Modal = () => {
    const dispatch = useDispatch();
    const { isVisible, type, title, payload } = useSelector(selectModal);
    const [galleryIndex, setGalleryIndex] = useState(0);

    const screenshotPaths = useMemo(() => {
        if (type !== 'screenshot') return [];
        if (payload && Array.isArray(payload.screenshotPaths) && payload.screenshotPaths.length > 0) {
            return payload.screenshotPaths.filter(Boolean);
        }
        if (payload && payload.screenshotPath) return [payload.screenshotPath];
        return [];
    }, [payload, type]);

    const activeScreenshotPath = screenshotPaths[galleryIndex] || screenshotPaths[0] || null;

    useEffect(() => {
        if (type !== 'screenshot') return;
        setGalleryIndex(0);
    }, [type, payload?.screenshotPath, payload?.screenshotPaths]);

    // IMPORTANT: Do not return early before hooks run, or hook order changes between renders.
    if (!isVisible) return null;

    const handleClose = () => {
        dispatch(closeModal());
    };

    const renderContent = () => {
        switch (type) {
            case 'about':
                return (
                    <div>
                        <h2>About Rabin Forest</h2>
                        <p>
                            Rabin Forest is an AI playground site using ChatGPT and Gemini APIs. It's built using React and Node.js.
                        </p>
                        <button className="btn btn-secondary" onClick={handleClose}>Dismiss</button>
                    </div>
                );
            case 'chat-bots':
                return (
                    <div>
                        <h2>AI Chat Bots</h2>
                        <p>This page has Google Gemini and OpenAI ChatGPT discuss the topic you provide.</p>
                        <button className="btn btn-secondary" onClick={handleClose}>Dismiss</button>
                    </div>
                );

                case 'assistant':
                    return (
                        <div>
                            <h2>Gemini AI Personal Assistant</h2>
                            <p>This page uses Gemini AI APIs to answer questions about Brian Foster.</p>
                            <button className="btn btn-secondary" onClick={handleClose}>Dismiss</button>
                        </div>
                    );

            case 'screenshot':
                const handleOpenWebsite = () => {
                    if (payload && payload.url) {
                        window.open(payload.url, '_blank', 'noopener,noreferrer');
                    }
                };

                const docs = Array.isArray(payload?.docs) ? payload.docs.filter((d) => d?.url) : [];

                const hasMultipleImages = screenshotPaths.length > 1;
                const canGoPrev = hasMultipleImages && galleryIndex > 0;
                const canGoNext = hasMultipleImages && galleryIndex < screenshotPaths.length - 1;

                return (
                    <div className="modal-screenshot-container">
                        {payload && payload.summary && (
                            <div className="modal-screenshot-summary">{payload.summary}</div>
                        )}

                        {activeScreenshotPath && (
                            <img
                                src={activeScreenshotPath}
                                alt={`${payload.siteName || 'Site'}${payload.imageFit === 'contain' ? '' : ' screenshot'}`}
                                className={`modal-screenshot${payload.imageFit === 'contain' ? ' modal-screenshot--contain' : ''}`}
                            />
                        )}

                        {hasMultipleImages && (
                            <div className="modal-gallery-controls">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setGalleryIndex((i) => Math.max(i - 1, 0))}
                                    disabled={!canGoPrev}
                                    type="button"
                                >
                                    Prev
                                </button>
                                <div className="modal-gallery-counter">
                                    {galleryIndex + 1} / {screenshotPaths.length}
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setGalleryIndex((i) => Math.min(i + 1, screenshotPaths.length - 1))}
                                    disabled={!canGoNext}
                                    type="button"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                        <div className="modal-screenshot-buttons">
                            {payload && payload.url && (
                                <button className="btn btn-primary" onClick={handleOpenWebsite}>
                                    {payload.urlLabel || 'Open Website'}
                                </button>
                            )}
                            {docs.map((doc) => (
                                <button
                                    key={doc.url}
                                    className="btn btn-secondary"
                                    type="button"
                                    onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                                >
                                    {doc.label || 'Architecture Doc'}
                                </button>
                            ))}
                            <button className="btn btn-secondary" onClick={handleClose}>Close</button>
                        </div>
                    </div>
                );
            case 'conversation-log':
                return <ConversationLogContent payload={payload} onClose={handleClose} dispatch={dispatch} />;
            case 'custom':
                return (
                    <div>
                        <button className="btn btn-secondary" onClick={handleClose}>Close</button>
                    </div>
                );
            // Add more cases as needed
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose} aria-modal="true" role="dialog">
            <div className={`modal-content ${type === 'screenshot' ? 'modal-screenshot' : 'modal-regular'}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    {title && <h2 className="modal-title">{title}</h2>}
                    <button className="modal-close-button" onClick={handleClose} aria-label="Close Modal">
                        ×
                    </button>
                </div>
                <div className="modal-body">{renderContent()}</div>
            </div>
        </div>
    );
};

export default Modal;