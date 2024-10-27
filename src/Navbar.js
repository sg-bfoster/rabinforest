import React from 'react';

const Navbar = ({ togglePanel, newLinks, isPanelOpen, isDesktop }) => (
  <div className={`navbar ${isPanelOpen ? 'open' : ''}`} >
    <div className="navbar-content">
      {/* Logo added here */}
      <img src="/favicon.png" alt="Logo" className="navbar-logo" />
      <div className="navbar-title">
        <h1>Rabin Forest</h1>
        <p className="subheader">AI Personal Assistant<br />for Brian Foster</p>
      </div>
    </div>
    <div>
      {!isDesktop && <button className="toggle-panel-btn" onClick={togglePanel}>
        Links {newLinks.length > 0 && <span className="badge">{newLinks.length}</span>}
      </button>
      }
    </div>
  </div>
);

export default Navbar;