// src/components/Modal.js
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectModal, closeModal, openModal } from './features/modalSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';

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
            
            await axios.delete(API_ENDPOINTS.DELETE_CONVERSATION(conversationId));
            
            // Close the modal after successful deletion
            onClose();
            
            // Dispatch a custom event to notify Admin component to refresh the list
            window.dispatchEvent(new CustomEvent('conversationDeleted', { detail: { conversationId } }));
        } catch (err) {
            console.error('Error deleting conversation:', err);
            setError('Failed to delete conversation. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {payload && messages && (
                <>
                    <div style={{ 
                        marginBottom: '20px', 
                        paddingBottom: '15px',
                        borderBottom: '1px solid #555',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                    }}>
                        <div>
                            <p style={{ color: '#999', fontSize: '14px', margin: '5px 0' }}>
                                <strong>Date:</strong> {formatTimestamp(payload.lastActivity || payload.updatedAt || payload.timestamp || payload.createdAt)}
                            </p>
                            <p style={{ color: '#999', fontSize: '14px', margin: '5px 0' }}>
                                <strong>Messages:</strong> {messages.length}
                            </p>
                            {(payload.conversationId || payload.id) && (
                                <p style={{ color: '#999', fontSize: '12px', margin: '5px 0', fontFamily: 'monospace' }}>
                                    <strong>Conversation ID:</strong> {payload.conversationId || payload.id}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleDeleteConversation}
                            disabled={deleting}
                            style={{
                                background: 'transparent',
                                border: '1px solid #f44336',
                                color: '#f44336',
                                cursor: deleting ? 'not-allowed' : 'pointer',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: deleting ? 0.5 : 1,
                                fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                                if (!deleting) {
                                    e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!deleting) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <FontAwesomeIcon icon={faTrash} />
                            {deleting ? 'Deleting...' : 'Delete Conversation'}
                        </button>
                    </div>
                    {error && (
                        <div style={{
                            padding: '10px',
                            marginBottom: '15px',
                            backgroundColor: 'rgba(244, 67, 54, 0.2)',
                            color: '#f44336',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '15px'
                    }}>
                        {messages.map((msg, index) => {
                            const isUser = msg.role === 'user';
                            const messageText = msg.parts && msg.parts[0] ? msg.parts[0].text : '';
                            return (
                                <div
                                    key={index}
                                    style={{
                                        padding: '15px',
                                        borderRadius: '8px',
                                        backgroundColor: isUser ? '#3a3a3a' : '#2c2c2c',
                                        borderLeft: `4px solid ${isUser ? '#4a90e2' : '#4caf50'}`,
                                        marginLeft: isUser ? '0' : '20px',
                                        marginRight: isUser ? '20px' : '0'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#999',
                                        marginBottom: '8px',
                                        fontWeight: 'bold'
                                    }}>
                                        {isUser ? 'User' : 'Assistant'}
                                    </div>
                                    <div 
                                        style={{
                                            color: '#e0e0e0',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: messageText }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button className="modal-dismiss-button" onClick={onClose}>Close</button>
                    </div>
                </>
            )}
            {(!payload || !messages || messages.length === 0) && (
                <div>
                    <p>No conversation data available.</p>
                    <button className="modal-dismiss-button" onClick={onClose}>Close</button>
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
                        <button className="modal-dismiss-button" onClick={handleClose}>Dismiss</button>
                    </div>
                );
            case 'chat':
                return (
                    <div>
                        <h2>AI Chat - Gemini</h2>
                        <p>This page utilizies Google Gemini AI APIs for queries.</p>
                        <button className="modal-dismiss-button" onClick={handleClose}>Dismiss</button>
                    </div>
                );
            case 'chat-bots':
                return (
                    <div>
                        <h2>AI Chat Bots</h2>
                        <p>This page allows two ChatGPT chat bots to discuss the topic you provide.</p>
                        <button className="modal-dismiss-button" onClick={handleClose}>Dismiss</button>
                    </div>
                );

                case 'assistant':
                    return (
                        <div>
                            <h2>Gemini AI Personal Assistant</h2>
                            <p>This page uses Gemini AI APIs to answer questions about Brian Foster.</p>
                            <button className="modal-dismiss-button" onClick={handleClose}>Dismiss</button>
                        </div>
                    );

            case 'screenshot':
                const handleOpenWebsite = () => {
                    if (payload && payload.url) {
                        window.open(payload.url, '_blank', 'noopener,noreferrer');
                    }
                };

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
                                alt={`${payload.siteName || 'Site'} screenshot`}
                                className="modal-screenshot"
                            />
                        )}

                        {hasMultipleImages && (
                            <div className="modal-gallery-controls">
                                <button
                                    className="modal-gallery-nav-button"
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
                                    className="modal-gallery-nav-button"
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
                                <button className="modal-open-website-button" onClick={handleOpenWebsite}>
                                    Open Website
                                </button>
                            )}
                            <button className="modal-dismiss-button" onClick={handleClose}>Close</button>
                        </div>
                    </div>
                );
            case 'conversation-log':
                return <ConversationLogContent payload={payload} onClose={handleClose} dispatch={dispatch} />;
            case 'custom':
                return (
                    <div>
                        <button className="modal-dismiss-button" onClick={handleClose}>Close</button>
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
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="modal-body">{renderContent()}</div>
            </div>
        </div>
    );
};

export default Modal;