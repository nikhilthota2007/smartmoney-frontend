import React from 'react';
import { Mark } from '../brand/Mark';
import ScreenLink from './ScreenLink';

/** The app screens' title: the mark and name, linking home when routed. */
const AppBrand = ({ className = '' }) => (
  <h1 className={`app-brand ${className}`.trim()}>
    <ScreenLink to="/" className="app-brand-link">
      <Mark size={26} />
      <span>SmartMoney</span>
    </ScreenLink>
  </h1>
);

export default AppBrand;
