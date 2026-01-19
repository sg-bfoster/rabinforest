// src/components/Modal.js
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectModal, closeModal } from './features/modalSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Modal = () => {
    const dispatch = useDispatch();
    const { isVisible, type, title, payload } = useSelector(selectModal);

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
                return (
                    <div className="modal-screenshot-container">
                        {payload && payload.screenshotPath && (
                            <img
                                src={payload.screenshotPath}
                                alt={`${payload.siteName || 'Site'} screenshot`}
                                className="modal-screenshot"
                            />
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