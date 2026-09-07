import React from 'react';

/** Labelled dollar input used throughout the intake form. */
const CurrencyField = ({ label, name, value, onChange, placeholder }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={name}>{label}</label>
    <div className="input-wrapper">
      <span className="dollar-sign">$</span>
      <input
        id={name}
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  </div>
);

export default CurrencyField;
