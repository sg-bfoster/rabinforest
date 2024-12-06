// Menu.js
import React from 'react';
import { Link } from 'react-router-dom';

const Menu = ({ isMenuOpen, toggleMenu, isDesktop, setIsPanelOpen, setIsDesktop }) => {
    const handleLinkClick = (targetPath) => {

        toggleMenu();

        if (window.innerWidth >= 768) {
            setIsPanelOpen(true);  // Always open on desktop screens
            setIsDesktop(true);
            if (targetPath === '/') {
                // special case for home page
            }
        } else {
            setIsPanelOpen(false); // Always closed on smaller screens
            setIsDesktop(false);
        }
    }

    const isActive = (path) => window.location.pathname === path; // Check if the path matches the current location

    return (
        <div className={`menu-panel ${isMenuOpen || isDesktop ? 'open' : ''}`}>
            <div className="menu-content">
                <ul>
                    <li className={isActive('/') ? 'active' : ''}>
                        <Link to="/" onClick={() => handleLinkClick('/')}>Home</Link>
                    </li>
                </ul>
                <span className='playground-menu-header'><i>Playground</i></span>
                <ul>
                    <li className={isActive('/playground') ? 'active' : ''}>
                        <Link to="/playground?view=dalle" onClick={() => handleLinkClick('/playground')}>&#8226; Dalle-3</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Menu;