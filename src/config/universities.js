// University theme registry. Add new schools here — no code change needed elsewhere.
// Backend equivalent (2nd phase): GET /api/career/university/{code}
export const universities = {
  SAMPLE: {
    code: 'SAMPLE',
    name: '샘플대학교',
    primaryColor: '#7053f6',
    primaryColorHover: '#6044e6',
    primaryColorLight: '#f3efff',
    primaryColorSoft: '#f8f6ff',
    primaryColor2: '#8e71ff',
    primaryColorShadow: 'rgba(112, 83, 246, .24)',
    // intentionally missing file — exercises the Sidebar/AdminLayout <img onError> fallback path
    logo: '/assets/logo/sample.png',
  },
  UNIVERSITY_B: {
    code: 'UNIVERSITY_B',
    name: '미래대학교',
    primaryColor: '#1565c0',
    primaryColorHover: '#0d47a1',
    primaryColorLight: '#e8f1fb',
    primaryColorSoft: '#f3f8fd',
    primaryColor2: '#42a5f5',
    primaryColorShadow: 'rgba(21, 101, 192, .24)',
    logo: '',
  },
};

export const DEFAULT_UNIVERSITY = 'SAMPLE';

export function getUniversity(code) {
  return universities[code] || universities[DEFAULT_UNIVERSITY];
}
