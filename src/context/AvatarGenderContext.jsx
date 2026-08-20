import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// The only avatar "choice" left in the app — which finished image set
// (FEMALE/MALE) to show at the student's current Career Level. Deliberately
// not named after real gender identity; it's just which pre-made art style
// renders. Mock-only (no backend field for this yet), persisted locally so
// it survives a reload — see config/avatarEvolution.js for how it's used.
const STORAGE_KEY = 'careermate_avatar_gender_v1';
const AvatarGenderContext = createContext(null);

export function AvatarGenderProvider({ children }) {
  const [avatarGender, setAvatarGenderState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'MALE' || stored === 'FEMALE' ? stored : 'FEMALE';
    } catch {
      return 'FEMALE';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, avatarGender);
    } catch {
      // storage unavailable — the choice just won't survive a reload, not fatal
    }
  }, [avatarGender]);

  const setAvatarGender = useCallback((gender) => {
    if (gender === 'FEMALE' || gender === 'MALE') setAvatarGenderState(gender);
  }, []);

  return (
    <AvatarGenderContext.Provider value={{ avatarGender, setAvatarGender }}>
      {children}
    </AvatarGenderContext.Provider>
  );
}

export function useAvatarGender() {
  const ctx = useContext(AvatarGenderContext);
  if (!ctx) throw new Error('useAvatarGender must be used inside <AvatarGenderProvider>');
  return ctx;
}
