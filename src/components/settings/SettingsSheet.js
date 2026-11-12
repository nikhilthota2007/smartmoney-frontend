import React from 'react';
import { Settings2 } from 'lucide-react';
import Sheet from '../common/Sheet';
import DarkModeToggle from '../common/DarkModeToggle';
import ProfileFileControls from '../intake/ProfileFileControls';
import AiKeyField from './AiKeyField';
import { useStatement } from '../../app/StatementContext';
import { useTheme } from '../../context/ThemeContext';

/** Everything that is not the plan itself, in one place. */
const SettingsSheet = ({ onClose, onClearChat, onKeyChange }) => {
  const { saved, remove } = useStatement();
  const { darkMode } = useTheme();

  return (
    <Sheet onClose={onClose} labelledBy="settings-title">
      <header className="sheet-head">
        <span className="eyebrow">
          <Settings2 size={14} aria-hidden="true" />
          Settings
        </span>
        <h2 className="sheet-title" id="settings-title">
          Settings
        </h2>
      </header>

      <div className="sheet-body settings">
        <section className="settings-section" aria-labelledby="settings-ai">
          <h3 className="sheet-section-title" id="settings-ai">
            Your own AI key (optional)
          </h3>
          <AiKeyField onChange={onKeyChange} />
        </section>

        <section className="settings-section" aria-labelledby="settings-look">
          <h3 className="sheet-section-title" id="settings-look">
            Appearance
          </h3>
          <div className="settings-row">
            <span>{darkMode ? 'Dark theme' : 'Light theme'}</span>
            <DarkModeToggle className="icon-btn" />
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-data">
          <h3 className="sheet-section-title" id="settings-data">
            Your data
          </h3>
          <ProfileFileControls />
          <div className="settings-actions">
            {saved && (
              <button className="btn btn-outline btn-small" onClick={remove}>
                Remove statement
              </button>
            )}
            <button
              className="btn btn-outline btn-small"
              onClick={() => {
                onClearChat();
                onClose();
              }}
            >
              Clear conversation
            </button>
          </div>
          <p className="settings-note">
            Educational information, not licensed financial advice. For big decisions, talk to a licensed professional.
          </p>
        </section>
      </div>
    </Sheet>
  );
};

export default SettingsSheet;
