import React from 'react';

const EDGE_LAYERS = 6;

/**
 * An HTML/CSS phone, drawn at twice its display size and scaled down by half
 * so its text stays sharp while the hero pulls back from 8x.
 *
 *   .phone-dolly  distance from the camera (--z), animated by the hero
 *   .phone-tilt   rotateX / rotateY / drift, animated by the hero
 *   .phone-fit    centres the phone on the tilt origin and halves it
 *   .phone        the device: edge layers for thickness, frame, screen
 */
const Phone = ({ children }) => (
  <div className="phone-dolly">
    <div className="phone-tilt">
      <div className="phone-fit">
        <div className="phone">
          {Array.from({ length: EDGE_LAYERS }, (_, i) => (
            <span key={i} className="phone-edge" style={{ '--n': i + 1 }} />
          ))}
          <span className="phone-button phone-button-action" />
          <span className="phone-button phone-button-up" />
          <span className="phone-button phone-button-down" />
          <span className="phone-button phone-button-side" />

          <div className="phone-frame">
            <span className="phone-sheen" />
            <div className="phone-bezel">
              <div className="phone-screen">
                {children}
                <div className="phone-glass">
                  <span className="phone-glass-sky ambient" />
                </div>
                <span className="phone-glare" />
              </div>
              <span className="phone-island" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Phone;
