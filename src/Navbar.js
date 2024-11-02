import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const Navbar = ({ togglePanel, toggleMenu, newLinks, isDesktop, isPanelOpen }) => {
  return (
    <div className={`navbar ${isPanelOpen ? 'open' : ''}`}>
      <div className="navbar-content">
        {/* Hamburger icon triggers the left panel */}
        {!isDesktop && (<FontAwesomeIcon icon={faBars} className="navbar-hamburger" onClick={toggleMenu} />)}
        {/* Logo */}
        <Link to="/"><img src="/favicon.png" alt="Logo" className="navbar-logo" /></Link>
        <div className="navbar-title">
          <h1>Rabin Forest</h1>
          <p className="subheader">AI Personal Assistant<br />for Brian Foster</p>
        </div>
      </div>
      <div>
        {!isDesktop && (
          <button className="toggle-panel-btn" onClick={togglePanel}>
            Links {newLinks.length > 0 && <span className="badge">{newLinks.length}</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;