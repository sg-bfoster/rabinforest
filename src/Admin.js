import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from './config/api';
import axios from 'axios';

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
    }, [isAuthenticated]);
    
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
                </div>
            </div>
        </div>
    );
};

export default Admin;

