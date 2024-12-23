// src/components/Modal.js
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectModal, closeModal } from './features/modalSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Modal = () => {
    const dispatch = useDispatch();
    const { isVisible, type, title } = useSelector(selectModal);

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
                            Rabin Forest is an AI Personal Assistant designed using ChatGPT and Gemini APIs to answer questions about Brian Foster. It's built using React and Node.js.
                        </p>
                        <button onClick={handleClose}>Dismiss</button>
                    </div>
                );
            case 'chat':
                return (
                    <div>
                        <h2>AI Chat - Gemini</h2>
                        <p>This page utilizies Google Gemini AI APIs for queries.</p>
                        <button onClick={handleClose}>Dismiss</button>
                    </div>
                );
            case 'chat-bots':
                return (
                    <div>
                        <h2>AI Chat Bots</h2>
                        <p>This page allows two ChatGPT chat bots to discuss the topic you provide.</p>
                        <button onClick={handleClose}>Dismiss</button>
                    </div>
                );
            case 'custom':
                return (
                    <div>
                        <button onClick={handleClose}>Close</button>
                    </div>
                );
            // Add more cases as needed
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose} aria-modal="true" role="dialog">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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