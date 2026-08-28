import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { deriveTheme, isValidHex } from '../../utils/colorTheme.js';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

// Edits the same careermate_university row ThemeContext.jsx reads (see its
// javadoc) — this is the first admin screen this project has that actually
// changes something outside its own table. Saving doesn't hot-swap the
// theme in any tab that's already open (no live-broadcast), so the form
// says so plainly and offers a reload instead of pretending it's instant.
export default function AdminSettings({ navigate }) {
  const theme = useTheme();
  const [name, setName] = useState(theme.name);
  const [logo, setLogo] = useState(theme.logo || '');
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [careerRoadmapUrl, setCareerRoadmapUrl] = useState(theme.careerRoadmapUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Re-sync if the theme finishes its own async upgrade (see ThemeProvider)
  // after this form already mounted with the static fallback.
  useEffect(() => {
    setName(theme.name);
    setLogo(theme.logo || '');
    setPrimaryColor(theme.primaryColor);
    setCareerRoadmapUrl(theme.careerRoadmapUrl || '');
  }, [theme]);

  const validHex = isValidHex(primaryColor);
  const derived = validHex ? deriveTheme(primaryColor) : null;

  const save = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim() || !validHex || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateAdminUniversity(theme.code, {
        name: name.trim(),
        logo: logo.trim(),
        careerRoadmapUrl: careerRoadmapUrl.trim(),
        ...derived,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [name, logo, careerRoadmapUrl, derived, validHex, saving, theme.code]);

  return (
    <AdminLayout active="settings" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>설정</h1>
          <p>{theme.name}({theme.code})의 브랜드 컬러와 로고를 관리합니다.</p>
        </div>
      </div>

      <article className="card admin-settings-card">
        <form onSubmit={save}>
          <div className="admin-form-grid">
            <div className="full">
              <label>대학명</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="full">
              <label>로고 URL <span className="admin-settings__hint">(비워두면 기본 아이콘으로 표시)</span></label>
              <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="/assets/logo/sample.png" />
            </div>
            <div className="full">
              <label>커리어로드맵 메뉴 URL <span className="admin-settings__hint">(비워두면 마이페이지 아래 메뉴 자체가 숨겨짐)</span></label>
              <input
                type="url"
                value={careerRoadmapUrl}
                onChange={(e) => setCareerRoadmapUrl(e.target.value)}
                placeholder="https://univ.ac.kr/career-roadmap"
              />
              <p className="admin-settings__hint admin-settings__hint--block">대학 홈페이지 자체의 커리어로드맵 페이지 주소입니다. 학생 화면의 사이드바 틀 안에 그대로 표시됩니다(해당 페이지가 iframe 삽입을 막아둔 경우 표시되지 않을 수 있습니다).</p>
            </div>
            <div className="full">
              <label>기본 색상</label>
              <div className="admin-color-picker">
                <input type="color" value={validHex ? primaryColor : '#7053f6'} onChange={(e) => setPrimaryColor(e.target.value)} />
                <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#7053f6" />
              </div>
              {!validHex && <p className="admin-settings__error">올바른 hex 색상 코드를 입력해주세요 (예: #7053f6)</p>}
            </div>
          </div>

          {derived && (
            <div className="admin-theme-preview">
              <span className="admin-theme-preview__label">자동 생성된 팔레트</span>
              <div className="admin-theme-preview__swatches">
                {[
                  ['기본', derived.primaryColor],
                  ['호버', derived.primaryColorHover],
                  ['라이트', derived.primaryColorLight],
                  ['소프트', derived.primaryColorSoft],
                  ['보조', derived.primaryColor2],
                ].map(([label, hex]) => (
                  <div key={label} className="admin-swatch">
                    <span className="admin-swatch__chip" style={{ background: hex }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="admin-theme-preview__button" style={{ background: derived.primaryColor }}>
                버튼 미리보기
              </button>
            </div>
          )}

          {error && <p className="admin-settings__error">{error}</p>}
          {saved && (
            <p className="admin-settings__saved">
              저장했어요. 이미 열려 있는 화면에는 바로 반영되지 않으니 새로고침해주세요.
              <button type="button" onClick={() => window.location.reload()}>지금 새로고침</button>
            </p>
          )}

          <div className="modal-actions admin-settings__actions">
            <button type="submit" className="primary" disabled={saving || !validHex || !name.trim()}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </article>
    </AdminLayout>
  );
}
