import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getUniversity as fetchUniversity } from '../api/career.js';
import { getUniversity as getStaticUniversity, DEFAULT_UNIVERSITY } from '../config/universities.js';

const ThemeContext = createContext(null);

function readUniversityParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('university') || DEFAULT_UNIVERSITY;
}

// Reads ?university=CODE from the URL and injects the matching --career-primary
// vars onto :root. Drives logo/name in Sidebar + Header for white-label reuse.
//
// Starts from the static config/universities.js entry (synchronous — same
// value this always rendered before) so there's no loading flash, then
// upgrades to GET /api/career/university/{code} once it resolves. That DB
// row is what Admin 설정 actually edits (see AdminSettings.jsx) — the
// static file is just the offline/first-paint fallback if that call fails
// (this widget is iframed into a real university page; a flaky theme
// endpoint shouldn't blank it).
export function ThemeProvider({ children }) {
  const code = useMemo(() => readUniversityParam(), []);
  const [university, setUniversity] = useState(() => getStaticUniversity(code));

  useEffect(() => {
    let cancelled = false;
    fetchUniversity(code)
      .then((u) => {
        if (!cancelled) setUniversity(u);
      })
      .catch(() => {
        // keep the static fallback already in state
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--career-primary', university.primaryColor);
    root.style.setProperty('--career-primary-hover', university.primaryColorHover);
    root.style.setProperty('--career-primary-light', university.primaryColorLight);
    root.style.setProperty('--career-primary-soft', university.primaryColorSoft);
    root.style.setProperty('--career-primary-2', university.primaryColor2);
    root.style.setProperty('--career-primary-shadow', university.primaryColorShadow);
  }, [university]);

  return <ThemeContext.Provider value={university}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
