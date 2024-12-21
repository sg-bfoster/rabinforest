import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const Navbar = ({ togglePanel, toggleMenu, newLinks, isDesktop, isPanelOpen }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      <div className={`navbar ${isPanelOpen ? 'open' : ''}`}>
        <div className="navbar-content">
          {/* Hamburger icon triggers the left panel */}
          {!isDesktop && (
            <FontAwesomeIcon
              icon={faBars}
              className="navbar-hamburger"
              onClick={(e) => {
                toggleMenu();
                console.log("Panel and menu toggled!");
              }}
            />
          )}
          {/* Logo */}
          <Link to="/">
            <img src="/favicon.png" alt="Logo" className="navbar-logo" />
          </Link>
          <div className="navbar-title">
            <h1>Rabin Forest</h1>
            <p className="subheader">
              AI Personal Assistant
              <br />
              for Brian Foster
            </p>
          </div>
          <FontAwesomeIcon
            icon={faCircleQuestion}
            className="navbar-help-icon"
            onClick={toggleModal}
            title="About Rabin Forest"
          />

        </div>
        <div className="navbar-links">
          {!isDesktop && (
            <button
              className="toggle-panel-btn"
              onClick={(e) => {
                togglePanel();
              }}
            >
              Links {newLinks.length > 0 && <span className="badge">{newLinks.length}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={toggleModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>About Rabin Forest</h2>
            <p>
              Rabin Forest is an AI Personal Assistant designed using ChatGPT and Gemini APIs to answer questions about Brian Foster. It's built using React and Node.js.  
            </p>
            <button className="modal-close-btn" onClick={toggleModal}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;