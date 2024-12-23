import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

import { openModal } from './features/modalSlice';
import { useDispatch } from 'react-redux';

const Navbar = ({ togglePanel, toggleMenu, newLinks, isDesktop, isPanelOpen }) => {
  const dispatch = useDispatch();


  const handleOpenModal = () => {
    dispatch(
      openModal({
        title: '',
        type: 'about',
      })
    );
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
            onClick={handleOpenModal}
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

    </>
  );
};

export default Navbar;