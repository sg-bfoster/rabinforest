// Menu.js
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const Menu = ({ isMenuOpen, toggleMenu }) => {
    const handleLinkClick = () => {
        toggleMenu();
    };

    return (
        <div className={`menu-panel ${isMenuOpen ? 'open' : ''}`}>
            <div className="menu-header">
                <FontAwesomeIcon icon={faClose} className="navbar-hamburger" onClick={toggleMenu} />
                <h2>Menu</h2>
            </div>
            <div className="menu-content">
                <ul>
                    <li><Link to="/" onClick={handleLinkClick}>Home</Link></li>
                    <li><Link to="/playground" onClick={handleLinkClick}>Playground</Link></li>
                </ul>
            </div>
        </div>
    );
};

export default Menu;