import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
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
    <div className="profile-file-controls">
      <button className="text-btn" onClick={() => downloadProfile(profile)}>
        <Download size={16} />
        Export my data
      </button>

      <button className="text-btn" onClick={() => fileInput.current?.click()}>
        <Upload size={16} />
        Import
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="visually-hidden"
        aria-label="Import a profile file"
      />

      {error && <p className="import-error" role="alert">{error}</p>}
    </div>
  );
};

export default ProfileFileControls;
