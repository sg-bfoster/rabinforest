// Menu.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PLAYGROUND_CHAT_BOTS, PLAYGROUND_IMAGERY } from './playgroundRoutes';

const Menu = ({ isMenuOpen, toggleMenu, isDesktop, setIsPanelOpen, setIsDesktop }) => {
    const { pathname } = useLocation();

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

    const isActive = (path) => pathname === path;

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
                    <li className={isActive(PLAYGROUND_CHAT_BOTS) ? 'active' : ''}>
                        <Link to={PLAYGROUND_CHAT_BOTS} onClick={() => handleLinkClick(PLAYGROUND_CHAT_BOTS)}>&#8226; AI Chat Bots</Link>
                    </li>
                    <li className={isActive(PLAYGROUND_IMAGERY) ? 'active' : ''}>
                        <Link to={PLAYGROUND_IMAGERY} onClick={() => handleLinkClick(PLAYGROUND_IMAGERY)}>&#8226; AI Imagery</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Menu;
