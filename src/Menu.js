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

    const isActive = (path) => {
        const [pathname, search] = path.split('?');
        return (
            window.location.pathname === pathname &&
            (!search || window.location.search === `?${search}`)
        );
    };

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
                    <li className={isActive('/playground?view=aichat') ? 'active' : ''}>
                        <Link to="/playground?view=aichat" onClick={() => handleLinkClick('/playground')}>&#8226; AI Chat</Link>
                    </li>
                    <li className={isActive('/playground?view=aichatbots') ? 'active' : ''}>
                        <Link to="/playground?view=aichatbots" onClick={() => handleLinkClick('/playground')}>&#8226; AI Chat Bots</Link>
                    </li>
                    <li className={isActive('/playground?view=dalle') ? 'active' : ''}>
                        <Link to="/playground?view=dalle" onClick={() => handleLinkClick('/playground')}>&#8226; Dalle-3</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Menu;