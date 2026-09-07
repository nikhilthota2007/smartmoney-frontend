import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { createEmptyDebt, createEmptyProfile, toFinancialData } from '../lib/profile';
import { loadProfile, saveProfile, clearProfile } from '../lib/storage';

const ProfileContext = createContext(null);

const touch = (profile) => ({ ...profile, updatedAt: new Date().toISOString() });

export const profileReducer = (profile, action) => {
  switch (action.type) {
    case 'SET_SUMMARY_FIELD':
      return touch({
        ...profile,
        summary: { ...profile.summary, [action.field]: action.value },
      });

    case 'ADD_DEBT': {
      const nextId = Math.max(...profile.debts.map((d) => d.id), 0) + 1;
      return touch({ ...profile, debts: [...profile.debts, createEmptyDebt(nextId)] });
    }

    case 'REMOVE_DEBT':
      // Always leave one row so the calculator never renders empty.
      if (profile.debts.length <= 1) return profile;
      return touch({ ...profile, debts: profile.debts.filter((d) => d.id !== action.id) });

    case 'UPDATE_DEBT':
      return touch({
        ...profile,
        debts: profile.debts.map((d) =>
          d.id === action.id ? { ...d, [action.field]: action.value } : d
        ),
      });

    case 'REPLACE_PROFILE':
      return touch(action.profile);

    case 'RESET':
      return createEmptyProfile();

    default:
      return profile;
  }
};

// Read storage once, at module init, so the first render already has the
// user's data and no empty frame flashes on reload.
const initialProfile = () => loadProfile() || createEmptyProfile();

export const ProfileProvider = ({ children }) => {
  const [profile, dispatch] = useReducer(profileReducer, null, initialProfile);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const value = useMemo(
    () => ({
      profile,
      financialData: toFinancialData(profile),
      debts: profile.debts,
      setSummaryField: (field, value) => dispatch({ type: 'SET_SUMMARY_FIELD', field, value }),
      addDebt: () => dispatch({ type: 'ADD_DEBT' }),
      removeDebt: (id) => dispatch({ type: 'REMOVE_DEBT', id }),
      updateDebt: (id, field, value) => dispatch({ type: 'UPDATE_DEBT', id, field, value }),
      replaceProfile: (next) => dispatch({ type: 'REPLACE_PROFILE', profile: next }),
      resetProfile: () => {
        clearProfile();
        dispatch({ type: 'RESET' });
      },
    }),
    [profile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside a ProfileProvider');
  return context;
};
