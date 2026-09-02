import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FEATURES } from '../config/features';
import { PLAYGROUND_CHAT_BOTS, PLAYGROUND_FACT_CHECK, PLAYGROUND_RABINAI_IMAGERY } from '../playgroundRoutes';
import RabinAIStatus from './RabinAIStatus';

export const SynapseLogo = ({ size = 24 }) => (
  <svg viewBox="0 0 28 28" style={{ width: size, height: size, display: 'block' }} aria-hidden="true">
    <line x1="14" y1="24" x2="14" y2="13" stroke="rgba(207,226,242,0.55)" strokeWidth="1.2" />
    <line x1="14" y1="13" x2="6" y2="7" stroke="rgba(207,226,242,0.55)" strokeWidth="1.2" />
    <line x1="14" y1="13" x2="22" y2="7" stroke="rgba(207,226,242,0.55)" strokeWidth="1.2" />
    <line x1="14" y1="17" x2="21" y2="15" stroke="rgba(207,226,242,0.55)" strokeWidth="1.2" />
    <circle cx="14" cy="13" r="2.4" fill="#cfe2f2" />
    <circle cx="6" cy="7" r="1.8" fill="#cfe2f2" />
    <circle cx="22" cy="7" r="1.8" fill="#cfe2f2" />
    <circle cx="21" cy="15" r="1.5" fill="#ec3013" />
    <circle cx="14" cy="24" r="1.5" fill="rgba(207,226,242,0.7)" />
  </svg>
);

const navClass = ({ isActive }) => `site-nav-link${isActive ? ' active' : ''}`;

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (e) => {
      if (!e.target.closest('.site-header')) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button
          type="button"
          className={`nav-toggle${menuOpen ? ' open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-bars" aria-hidden="true" />
        </button>
        <div className="brand-cluster">
          <NavLink to="/" className="brand">
            <SynapseLogo />
            Rabin Forest
          </NavLink>
          {FEATURES.rabinaiStatus && <RabinAIStatus />}
        </div>
        <nav
          id="site-nav"
          className={`site-nav${menuOpen ? ' open' : ''}`}
          aria-label="Site"
          onClick={(e) => {
            if (e.target.closest('a')) setMenuOpen(false);
          }}
        >
          <NavLink to="/" end className={navClass}>
            Assistant
          </NavLink>
          <NavLink to={PLAYGROUND_CHAT_BOTS} className={navClass}>
            Chat Bots
          </NavLink>
          {FEATURES.rabinaiImagery && (
            <NavLink to={PLAYGROUND_RABINAI_IMAGERY} className={navClass}>
              RabinAI Images
            </NavLink>
          )}
          <NavLink to={PLAYGROUND_FACT_CHECK} className={navClass}>
            Fact Check
          </NavLink>
          <NavLink to="/resume" className={navClass}>
            Resume
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
