// Menu.js
import React from 'react';
import { Link } from 'react-router-dom';

const Menu = ({ isMenuOpen, toggleMenu, isDesktop, setIsPanelOpen, setIsDesktop }) => {
    const handleLinkClick = (targetPath) => {

        toggleMenu();

        if (targetPath === '/') {
            if (window.innerWidth >= 768) {
                setIsPanelOpen(true);  // Always open on desktop screens
                setIsDesktop(true);
            } else {
                setIsPanelOpen(false); // Always closed on smaller screens
                setIsDesktop(false);
            }
        }
    };

    return (
        <div className={`menu-panel ${isMenuOpen || isDesktop ? 'open' : ''}`}>
            <div className="menu-content">
                <ul>
                    <li>
                        <Link to="/" onClick={() => handleLinkClick('/')}>Home</Link>
                    </li>
                    <li>
                        <Link to="/playground" onClick={() => handleLinkClick('/playground')}>Playground</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Menu;