// Navbar.js
import React from 'react';

const Navbar = ({ togglePanel, newLinks }) => (
  <div className="navbar">
    <h1>Rabin Forest</h1>
    <p className="subheader">AI Personal Assistant<br />for Brian Foster</p>
    <button className="toggle-panel-btn" onClick={togglePanel}>
      Links {newLinks.length > 0 && <span className="badge">{newLinks.length}</span>}
    </button>
  </div>
);

export default Navbar;