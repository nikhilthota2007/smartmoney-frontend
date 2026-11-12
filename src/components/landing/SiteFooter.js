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
      <nav className="site-footer-links" aria-label="Footer">
        <Link to="/start">Get my plan</Link>
        <Link to="/advisor">Ask the advisor</Link>
      </nav>
      <DarkModeToggle className="icon-btn site-footer-theme" />
    </div>
    <div className="site-footer-notes">
      <p>
        Saved on this device, not in an account. Your figures are sent to the AI model only when you ask a question.
      </p>
      <p>
        Educational information, not licensed financial, tax or legal advice. For big decisions, talk to a licensed
        professional.
      </p>
      <p>© {new Date().getFullYear()} SmartMoney</p>
    </div>
  </footer>
);

export default SiteFooter;
