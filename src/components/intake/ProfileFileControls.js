import React, { useRef, useState } from 'react';
import { AlertCircle, Download, Upload } from 'lucide-react';
import { downloadProfile, parseProfileFile, readFileAsText } from '../../lib/profileFile';
import { useProfile } from '../../context/ProfileContext';

/**
 * Export and import the profile as JSON.
 * Until there are accounts, this is the only way to move data between browsers.
 */
const ProfileFileControls = () => {
  const { profile, replaceProfile } = useProfile();
  const fileInput = useRef(null);
  const [error, setError] = useState(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      replaceProfile(parseProfileFile(await readFileAsText(file)));
    } catch (importError) {
      setError(importError.message);
    } finally {
      // Allow re-selecting the same file after a failed import.
      event.target.value = '';
    }
  };

  return (
    <div className="file-controls">
      <p className="file-controls-note">Saved on this device only.</p>
      <div className="file-controls-buttons">
        <button className="btn btn-outline btn-small" onClick={() => downloadProfile(profile)}>
          <Download size={15} aria-hidden="true" />
          Export my data
        </button>

        <button className="btn btn-outline btn-small" onClick={() => fileInput.current?.click()}>
          <Upload size={15} aria-hidden="true" />
          Import
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="visually-hidden"
        aria-label="Import a profile file"
      />

      {error && (
        <p className="notice notice-danger file-controls-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default ProfileFileControls;
