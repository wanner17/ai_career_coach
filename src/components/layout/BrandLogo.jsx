import { useState } from 'react';

// Shows the university logo when configured and loadable; falls back to the
// generic Career icon otherwise (missing `logo`, empty string, or a 404 image).
export default function BrandLogo({ logo, size = 30 }) {
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return <div className="career-brand__icon-fallback" style={{ fontSize: size }}>✦</div>;
  }

  return (
    <img
      className="career-brand__icon"
      src={logo}
      alt="대학 로고"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
