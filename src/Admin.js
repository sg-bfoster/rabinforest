import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, ADMIN_KEY_STORAGE, getAdminHeaders, clearAdminSession } from './config/api';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { openModal, closeModal } from './features/modalSlice';
import { Hero, ScreenBody } from './components/Hero';

const Admin = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => Boolean(sessionStorage.getItem(ADMIN_KEY_STORAGE)),
    );
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loginBusy, setLoginBusy] = useState(false);

    // New state for conversation logs
    const [activeSection, setActiveSection] = useState('content');
    const [conversationLogs, setConversationLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);
    const [deleteAllMessage, setDeleteAllMessage] = useState(null);
    const dispatch = useDispatch();

    const rejectAdminSession = useCallback((message) => {
        clearAdminSession();
        setIsAuthenticated(false);
        setPasswordError(message);
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
            const response = await axios.get(API_ENDPOINTS.CONVERSATION_LOGS, {
                headers: getAdminHeaders(),
            });
            setConversationLogs(response.data.logs || []);
        } catch (err) {
            console.error('Error fetching conversation logs:', err);
            const status = err.response?.status;
            if (status === 401 || status === 503) {
                rejectAdminSession(
                    status === 503
                        ? 'Admin key is not configured on the server.'
                        : 'API rejected admin key.',
                );
                return;
            }
            setLogsError('Failed to load conversation logs');
        } finally {
            setLogsLoading(false);
        }
    }, [isAuthenticated, activeSection, rejectAdminSession]);

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

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        const typed = password;
        if (!typed) {
            setPasswordError('Enter the admin key');
            return;
        }
        setLoginBusy(true);
        setPasswordError('');
        try {
            await axios.post(
                API_ENDPOINTS.ADMIN_VERIFY,
                {},
                { headers: { 'X-Admin-Key': typed } },
            );
            sessionStorage.setItem(ADMIN_KEY_STORAGE, typed);
            setIsAuthenticated(true);
            setPassword('');
        } catch (err) {
            const status = err.response?.status;
            if (status === 503) {
                setPasswordError('Admin key is not configured on the server.');
            } else if (status === 429) {
                setPasswordError('Too many failed attempts. Try again in 15 minutes.');
            } else {
                setPasswordError('Incorrect password');
            }
            setPassword('');
        } finally {
            setLoginBusy(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveMessage(null);
            setError(null);
            await axios.put(
                API_ENDPOINTS.ASSISTANT_BFOSTER_SAVE,
                { content },
                { headers: getAdminHeaders() },
            );
            setSaveMessage('Content saved successfully!');
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err) {
            console.error('Error saving assistant content:', err);
            const status = err.response?.status;
            if (status === 401 || status === 503) {
                rejectAdminSession(
                    status === 503
                        ? 'Admin key is not configured on the server.'
                        : 'API rejected admin key.',
                );
                setError(null);
            } else {
                setError('Failed to save assistant content');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAllLogs = async () => {
        const visibleCount = conversationLogs.length;
        const confirmed = window.confirm(
            visibleCount >= 100
                ? `Delete all conversation logs? This cannot be undone.\n\n${visibleCount} logs are listed here; any additional logs not shown will also be deleted.`
                : `Delete all ${visibleCount} conversation log${visibleCount === 1 ? '' : 's'}? This cannot be undone.`,
        );
        if (!confirmed) return;

        try {
            setDeletingAll(true);
            setLogsError(null);
            setDeleteAllMessage(null);
            const response = await axios.delete(API_ENDPOINTS.CONVERSATION_LOGS, {
                headers: getAdminHeaders(),
            });
            dispatch(closeModal());
            setConversationLogs([]);
            const deleted = typeof response.data?.deleted === 'number' ? response.data.deleted : 0;
            setDeleteAllMessage(`Deleted ${deleted} conversation log${deleted === 1 ? '' : 's'}.`);
            setTimeout(() => setDeleteAllMessage(null), 4000);
        } catch (err) {
            console.error('Error deleting all conversation logs:', err);
            const status = err.response?.status;
            if (status === 401 || status === 503) {
                rejectAdminSession(
                    status === 503
                        ? 'Admin key is not configured on the server.'
                        : 'API rejected admin key.',
                );
                return;
            }
            setLogsError('Failed to delete conversation logs');
        } finally {
            setDeletingAll(false);
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
            <>
                <Hero>
                    <h1 className="hero-h1">Admin</h1>
                    <p className="hero-sub hero-sub--page">Enter the admin key to manage assistant content and logs.</p>
                </Hero>
                <ScreenBody width="page">
                <form onSubmit={handlePasswordSubmit} style={{ maxWidth: '360px' }}>
                    <div className="field">
                        <label htmlFor="admin-key">Admin key</label>
                        <input
                            id="admin-key"
                            className="input"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError('');
                            }}
                            placeholder="Enter password"
                            autoFocus
                        />
                    </div>
                    {passwordError && <p className="error-message" style={{ marginTop: 'var(--space-2)' }}>{passwordError}</p>}
                    <button type="submit" className="btn btn-primary" disabled={loginBusy} style={{ marginTop: 'var(--space-3)' }}>
                        {loginBusy ? 'Checking…' : 'Login'}
                    </button>
                </form>
                </ScreenBody>
            </>
        );
    }

    return (
        <>
            <Hero>
                <h1 className="hero-h1">Admin</h1>
            </Hero>
            <ScreenBody width="page">
            <div className="admin-tabs">
                <button
                    className={`admin-tab${activeSection === 'content' ? ' active' : ''}`}
                    onClick={() => setActiveSection('content')}
                >
                    Assistant Content
                </button>
                <button
                    className={`admin-tab${activeSection === 'logs' ? ' active' : ''}`}
                    onClick={() => setActiveSection('logs')}
                >
                    Conversation Logs
                </button>
            </div>

            {/* Content Section */}
            {activeSection === 'content' && (
                <>
                    {loading && <p className="admin-status">Loading assistant content…</p>}
                    {error && <p className="error-message">Error: {error}</p>}
                    {saveMessage && <p className="admin-status ok">{saveMessage}</p>}
                    {!loading && !error && (
                        <>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                            <textarea
                                className="input admin-content-textarea"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </>
                    )}
                </>
            )}

            {/* Conversation Logs Section */}
            {activeSection === 'logs' && (
                <>
                    {logsLoading && <p className="admin-status">Loading conversation logs…</p>}
                    {logsError && <p className="error-message">Error: {logsError}</p>}
                    {deleteAllMessage && <p className="admin-status ok">{deleteAllMessage}</p>}
                    {!logsLoading && !logsError && (
                        conversationLogs.length === 0 ? (
                            <p className="admin-status">No conversation logs found.</p>
                        ) : (
                            <>
                                <div className="admin-log-toolbar">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleDeleteAllLogs}
                                        disabled={deletingAll}
                                    >
                                        {deletingAll ? 'Deleting…' : 'Delete all'}
                                    </button>
                                </div>
                                <div className="admin-log-list">
                                {conversationLogs.map((log) => (
                                    <button
                                        key={log.id}
                                        type="button"
                                        className="admin-log-card"
                                        onClick={() => handleLogClick(log)}
                                    >
                                        <span className="admin-log-meta">
                                            <span>{formatTimestamp(log.lastActivity || log.updatedAt || log.timestamp || log.createdAt)}</span>
                                            <span className="admin-log-id">ID: {formatConversationId(log.conversationId || log.id)}</span>
                                        </span>
                                        <span className="admin-log-preview" style={{ display: 'block' }}>
                                            {log.firstMessage || 'No preview available'}
                                        </span>
                                        <span className="admin-log-count">
                                            {log.messageCount || log.messages?.length || 0} messages
                                        </span>
                                    </button>
                                ))}
                                </div>
                            </>
                        )
                    )}
                </>
            )}
            </ScreenBody>
        </>
    );
};

export default Admin;
