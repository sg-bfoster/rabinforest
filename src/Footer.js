import React from 'react';
import { NavLink } from 'react-router-dom';

const Footer = () => (
  <footer className="site-footer">
    <div className="site-footer-inner">
      <span>
        © {new Date().getFullYear()} rabinforest.com — a portfolio you can talk to.
        {' · '}
        <NavLink to="/contact">Contact</NavLink>
      </span>
      <span>RabinAI · Gemini · stilltrue</span>
    </div>
  </footer>
);

export default Footer;
