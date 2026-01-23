import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from './config/api';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { openModal } from './features/modalSlice';

const Admin = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const contentRef = useRef(null);
    
    // New state for conversation logs
    const [activeSection, setActiveSection] = useState('content');
    const [conversationLogs, setConversationLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState(null);
    const dispatch = useDispatch();
    
    const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Tucker4848!!';

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchContent = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }
            
            // Only fetch content if we're on the content section
            if (activeSection !== 'content') {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(API_ENDPOINTS.ASSISTANT_BFOSTER);
                setContent(response.data.content || '');
            } catch (err) {
                console.error('Error fetching assistant content:', err);
                setError('Failed to load assistant content');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [isAuthenticated, activeSection]);

    // Fetch conversation logs when logs section is active
    const fetchLogs = useCallback(async () => {
        if (!isAuthenticated || activeSection !== 'logs') {
            return;
        }
        
        try {
            setLogsLoading(true);
            setLogsError(null);
            const response = await axios.get(API_ENDPOINTS.CONVERSATION_LOGS);
            setConversationLogs(response.data.logs || []);
        } catch (err) {
            console.error('Error fetching conversation logs:', err);
            setLogsError('Failed to load conversation logs');
        } finally {
            setLogsLoading(false);
        }
    }, [isAuthenticated, activeSection]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Listen for conversation deletion events to refresh the list
    useEffect(() => {
        const handleConversationDeleted = () => {
            if (activeSection === 'logs') {
                fetchLogs();
            }
        };

        window.addEventListener('conversationDeleted', handleConversationDeleted);
        return () => {
            window.removeEventListener('conversationDeleted', handleConversationDeleted);
        };
    }, [activeSection, fetchLogs]);
    
    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError('');
            setPassword('');
        } else {
            setPasswordError('Incorrect password');
            setPassword('');
        }
    };

    const adjustContentHeight = () => {
        const headerHeight = document.querySelector('.navbar')?.offsetHeight || 0;
        const footerHeight = document.querySelector('.footer')?.offsetHeight || 0;
        const headerH1 = document.querySelector('.playground-h1')?.offsetHeight || 0;
        const buttonArea = 80; // Approximate height for button area

        const availableHeight = window.innerHeight - headerHeight - headerH1 - footerHeight - buttonArea;
        if (contentRef.current) {
            contentRef.current.style.height = `${Math.max(400, availableHeight)}px`;
        }
    };

    useEffect(() => {
        window.addEventListener('resize', adjustContentHeight);
        adjustContentHeight();

        return () => {
            window.removeEventListener('resize', adjustContentHeight);
        };
    }, [content]);

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveMessage(null);
            setError(null);
            await axios.put(API_ENDPOINTS.ASSISTANT_BFOSTER_SAVE, { content });
            setSaveMessage('Content saved successfully!');
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err) {
            console.error('Error saving assistant content:', err);
            setError('Failed to save assistant content');
        } finally {
            setSaving(false);
        }
    };

    const handleLogClick = (log) => {
        dispatch(
            openModal({
                type: 'conversation-log',
                title: 'Conversation Log',
                payload: log
            })
        );
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown date';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (e) {
            return timestamp;
        }
    };

    const formatConversationId = (id) => {
        if (!id) return 'N/A';
        // Show a shortened version for display
        return id.length > 20 ? id.substring(0, 20) + '...' : id;
    };

    if (!isAuthenticated) {
        return (
            <div className={`Playground ${isDesktop ? 'open' : ''}`}>
                <div className="playground-content">
                    <h1 className='playground-h1'>Admin</h1>
                    <div className="ai-chat-container">
                        <div style={{ 
                            padding: '30px',
                            textAlign: 'center'
                        }}>
                            <h2 style={{ 
                                color: '#e0e0e0',
                                marginBottom: '20px'
                            }}>
                                Admin Access Required
                            </h2>
                            <form onSubmit={handlePasswordSubmit}>
                                <div style={{ marginBottom: '15px' }}>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setPasswordError('');
                                        }}
                                        placeholder="Enter password"
                                        className="form-textarea"
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            fontSize: '16px',
                                            color: '#e0e0e0',
                                            backgroundColor: '#2c2c2c',
                                            border: '1px solid #555',
                                            borderRadius: '8px',
                                            marginBottom: '10px'
                                        }}
                                        autoFocus
                                    />
                                    {passwordError && (
                                        <div className="error-message" style={{ 
                                            fontSize: '14px',
                                            marginTop: '5px'
                                        }}>
                                            {passwordError}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '12px 30px',
                                        fontSize: '16px',
                                        backgroundColor: '#4a90e2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Login
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`Playground ${isDesktop ? 'open' : ''}`}>
            <div className="playground-content">
                <h1 className='playground-h1'>Admin</h1>
                <div className="ai-chat-container">
                    {/* Section Tabs */}
                    <div style={{
                        display: 'flex',
                        marginBottom: '20px',
                        borderBottom: '2px solid #555',
                        gap: '0'
                    }}>
                        <button
                            onClick={() => setActiveSection('content')}
                            style={{
                                padding: '12px 24px',
                                fontSize: '16px',
                                backgroundColor: 'transparent',
                                color: activeSection === 'content' ? '#4a90e2' : '#999',
                                border: 'none',
                                borderBottom: activeSection === 'content' ? '3px solid #4a90e2' : '3px solid transparent',
                                cursor: 'pointer',
                                transition: 'color 0.2s, border-bottom-color 0.2s',
                                fontWeight: '600',
                                marginBottom: '-2px',
                                borderRadius: '0'
                            }}
                            onMouseEnter={(e) => {
                                if (activeSection !== 'content') {
                                    e.currentTarget.style.color = '#e0e0e0';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeSection !== 'content') {
                                    e.currentTarget.style.color = '#999';
                                }
                            }}
                        >
                            Assistant Content
                        </button>
                        <button
                            onClick={() => setActiveSection('logs')}
                            style={{
                                padding: '12px 24px',
                                fontSize: '16px',
                                backgroundColor: 'transparent',
                                color: activeSection === 'logs' ? '#4a90e2' : '#999',
                                border: 'none',
                                borderBottom: activeSection === 'logs' ? '3px solid #4a90e2' : '3px solid transparent',
                                cursor: 'pointer',
                                transition: 'color 0.2s, border-bottom-color 0.2s',
                                fontWeight: '600',
                                marginBottom: '-2px',
                                borderRadius: '0'
                            }}
                            onMouseEnter={(e) => {
                                if (activeSection !== 'logs') {
                                    e.currentTarget.style.color = '#e0e0e0';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeSection !== 'logs') {
                                    e.currentTarget.style.color = '#999';
                                }
                            }}
                        >
                            Conversation Logs
                        </button>
                    </div>

                    {/* Content Section */}
                    {activeSection === 'content' && (
                        <>
                            {loading && (
                                <div style={{ 
                                    padding: '20px', 
                                    textAlign: 'center', 
                                    color: '#e0e0e0',
                                    fontSize: '18px'
                                }}>
                                    Loading assistant content...
                                </div>
                            )}
                            {error && (
                                <div className="error-message" style={{ 
                                    padding: '20px', 
                                    textAlign: 'center',
                                    fontSize: '18px'
                                }}>
                                    Error: {error}
                                </div>
                            )}
                            {saveMessage && (
                                <div style={{ 
                                    padding: '10px 20px', 
                                    textAlign: 'center',
                                    fontSize: '16px',
                                    color: '#4caf50',
                                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                    borderRadius: '4px',
                                    marginBottom: '10px'
                                }}>
                                    {saveMessage}
                                </div>
                            )}
                            {!loading && !error && (
                                <>
                                    <div className="chat-input-area" style={{ paddingTop: '0', borderTop: 'none' }}>
                                        <div className="chat-buttons">
                                            <button 
                                                onClick={handleSave} 
                                                disabled={saving}
                                                style={{ 
                                                    marginBottom: '10px',
                                                    padding: '10px 20px',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        ref={contentRef}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="form-textarea"
                                        style={{
                                            width: '100%',
                                            minHeight: '400px',
                                            fontFamily: 'Montserrat, sans-serif',
                                            fontSize: '16px',
                                            lineHeight: '1.6',
                                            color: '#e0e0e0',
                                            backgroundColor: '#2c2c2c',
                                            border: '1px solid #555',
                                            padding: '20px',
                                            borderRadius: '8px',
                                            resize: 'vertical',
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {/* Conversation Logs Section */}
                    {activeSection === 'logs' && (
                        <>
                            {logsLoading && (
                                <div style={{ 
                                    padding: '20px', 
                                    textAlign: 'center', 
                                    color: '#e0e0e0',
                                    fontSize: '18px'
                                }}>
                                    Loading conversation logs...
                                </div>
                            )}
                            {logsError && (
                                <div className="error-message" style={{ 
                                    padding: '20px', 
                                    textAlign: 'center',
                                    fontSize: '18px'
                                }}>
                                    Error: {logsError}
                                </div>
                            )}
                            {!logsLoading && !logsError && (
                                <div style={{
                                    maxHeight: '70vh',
                                    overflowY: 'auto'
                                }}>
                                    {conversationLogs.length === 0 ? (
                                        <div style={{
                                            padding: '40px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '16px'
                                        }}>
                                            No conversation logs found.
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}>
                                            {conversationLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    onClick={() => handleLogClick(log)}
                                                    style={{
                                                        padding: '15px',
                                                        backgroundColor: '#2c2c2c',
                                                        border: '1px solid #555',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.2s, border-color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#3a3a3a';
                                                        e.currentTarget.style.borderColor = '#4a90e2';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#2c2c2c';
                                                        e.currentTarget.style.borderColor = '#555';
                                                    }}
                                                >
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#999',
                                                        marginBottom: '8px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <span>{formatTimestamp(log.lastActivity || log.updatedAt || log.timestamp || log.createdAt)}</span>
                                                        <span style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                                                            ID: {formatConversationId(log.conversationId || log.id)}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        fontSize: '14px',
                                                        color: '#e0e0e0',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {log.firstMessage || 'No preview available'}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#999'
                                                    }}>
                                                        {log.messageCount || log.messages?.length || 0} messages
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Admin;

