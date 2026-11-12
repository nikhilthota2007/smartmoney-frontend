import React from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../brand/Mark';
import DarkModeToggle from '../common/DarkModeToggle';

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer-top">
      <Link to="/" className="site-footer-brand" aria-label="SmartMoney home">
        <Wordmark />
      </Link>
      <DarkModeToggle className="icon-btn site-footer-theme" />
    </div>
    <p className="site-footer-note">
      Educational information, not licensed financial, tax or legal advice. © {new Date().getFullYear()} SmartMoney
    </p>
  </footer>
);

export default SiteFooter;
