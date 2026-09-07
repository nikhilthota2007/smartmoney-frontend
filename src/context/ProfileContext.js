import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { LIST_SECTIONS, createEmptyProfile, getSectionList, migrateProfile, toFinancialData } from '../lib/profile';
import { loadProfile, saveProfile, clearProfile } from '../lib/storage';

const ProfileContext = createContext(null);

const touch = (profile) => ({ ...profile, updatedAt: new Date().toISOString() });

/** Replace one repeating section, wherever it lives in the profile tree. */
const withSection = (profile, section, nextList) => {
  const [head, tail] = LIST_SECTIONS[section].path;
  if (!tail) return { ...profile, [head]: nextList };
  return { ...profile, [head]: { ...profile[head], [tail]: nextList } };
};

const nextId = (list) => Math.max(...list.map((item) => item.id), 0) + 1;

export const profileReducer = (profile, action) => {
  switch (action.type) {
    case 'SET_SUMMARY_FIELD':
      return touch({ ...profile, summary: { ...profile.summary, [action.field]: action.value } });

    case 'SET_INSURANCE':
      return touch({
        ...profile,
        protection: {
          ...profile.protection,
          insurance: { ...profile.protection.insurance, [action.kind]: action.covered },
        },
      });

    case 'ADD_ITEM': {
      const list = getSectionList(profile, action.section);
      const item = { ...LIST_SECTIONS[action.section].factory(nextId(list)), ...action.values };
      return touch(withSection(profile, action.section, [...list, item]));
    }

    case 'UPDATE_ITEM': {
      const list = getSectionList(profile, action.section);
      return touch(
        withSection(
          profile,
          action.section,
          list.map((item) => (item.id === action.id ? { ...item, [action.field]: action.value } : item))
        )
      );
    }

    case 'REMOVE_ITEM': {
      const list = getSectionList(profile, action.section);
      return touch(withSection(profile, action.section, list.filter((item) => item.id !== action.id)));
    }

    case 'REPLACE_PROFILE':
      return touch(migrateProfile(action.profile));

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
      setInsurance: (kind, covered) => dispatch({ type: 'SET_INSURANCE', kind, covered }),

      addItem: (section, values) => dispatch({ type: 'ADD_ITEM', section, values }),
      updateItem: (section, id, field, value) => dispatch({ type: 'UPDATE_ITEM', section, id, field, value }),
      removeItem: (section, id) => dispatch({ type: 'REMOVE_ITEM', section, id }),

      // The debt calculator predates the generic list actions and still speaks
      // in debts; these keep its call sites unchanged.
      addDebt: () => dispatch({ type: 'ADD_ITEM', section: 'debts' }),
      removeDebt: (id) => dispatch({ type: 'REMOVE_ITEM', section: 'debts', id }),
      updateDebt: (id, field, value) => dispatch({ type: 'UPDATE_ITEM', section: 'debts', id, field, value }),

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
