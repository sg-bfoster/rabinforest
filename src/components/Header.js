import { FEATURES } from '../config/features';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { PLAYGROUND_CHAT_BOTS, PLAYGROUND_IMAGERY, PLAYGROUND_FACT_CHECK, PLAYGROUND_RABINAI_IMAGERY } from '../playgroundRoutes';

export const PixelTreeLogo = ({ size = 22 }) => (
  <svg viewBox="0 0 32 32" style={{ width: size, height: size, display: 'block' }} aria-hidden="true">
    <g style={{ fill: 'var(--color-text)' }}>
      <rect x="14.4" y="2.4" width="3.2" height="3.2" />
      <rect x="10.4" y="6.4" width="3.2" height="3.2" />
      <rect x="18.4" y="6.4" width="3.2" height="3.2" />
      <rect x="6.4" y="10.4" width="3.2" height="3.2" />
      <rect x="10.4" y="10.4" width="3.2" height="3.2" />
      <rect x="18.4" y="10.4" width="3.2" height="3.2" />
      <rect x="22.4" y="10.4" width="3.2" height="3.2" />
      <rect x="2.4" y="14.4" width="3.2" height="3.2" />
      <rect x="6.4" y="14.4" width="3.2" height="3.2" />
      <rect x="10.4" y="14.4" width="3.2" height="3.2" />
      <rect x="18.4" y="14.4" width="3.2" height="3.2" />
      <rect x="22.4" y="14.4" width="3.2" height="3.2" />
      <rect x="26.4" y="14.4" width="3.2" height="3.2" />
      <rect x="14.4" y="18.4" width="3.2" height="3.2" />
      <rect x="14.4" y="22.4" width="3.2" height="3.2" />
      <rect x="2.4" y="26.4" width="27.2" height="2.4" />
    </g>
    <rect x="14.4" y="6.4" width="3.2" height="3.2" style={{ fill: 'var(--color-accent)' }} />
    <rect x="14.4" y="10.4" width="3.2" height="3.2" style={{ fill: 'var(--color-accent)' }} />
    <rect x="14.4" y="14.4" width="3.2" height="3.2" style={{ fill: 'var(--color-accent)' }} />
  </svg>
);

const navClass = ({ isActive }) => `site-nav-link${isActive ? ' active' : ''}`;

const Header = () => (
  <header className="site-header">
    <div className="site-header-inner">
      <NavLink to="/" className="brand">
        <PixelTreeLogo />
        Rabin Forest
      </NavLink>
      <nav className="site-nav">
        <NavLink to="/" end className={navClass}>
          Assistant
        </NavLink>
        <NavLink to={PLAYGROUND_CHAT_BOTS} className={navClass}>
          Chat Bots
        </NavLink>
        <NavLink to={PLAYGROUND_IMAGERY} className={navClass}>
          Imagery
        </NavLink>
        <NavLink to={PLAYGROUND_FACT_CHECK} className={navClass}>
          Fact Check
        </NavLink>
        {FEATURES.rabinaiImagery && (
          <NavLink to={PLAYGROUND_RABINAI_IMAGERY} className={navClass}>
            RabinAI Draws
          </NavLink>
        )}
        <NavLink to="/resume" className={navClass}>
          Resume
        </NavLink>
      </nav>
    </div>
  </header>
);

export default Header;
