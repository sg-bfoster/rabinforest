// Footer.js
import React from 'react';

const Footer = ({isPanelOpen}) => (
  <div className={`footer ${isPanelOpen ? 'open' : ''}`}>
    <p>© {new Date().getFullYear()} www.rabinforest.com</p>
  </div>
);

export default Footer;
