// Menu.js
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';

const Menu = ({ isMenuOpen, toggleMenu }) => {
  return (
    <div className={`menu-panel ${isMenuOpen ? 'open' : ''}`}>
      <div className="menu-header">
      <FontAwesomeIcon icon={faClose} className="navbar-hamburger" onClick={toggleMenu} />
      <h2>Menu</h2>

      </div>
      <div className="menu-content">
        <ul>
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;