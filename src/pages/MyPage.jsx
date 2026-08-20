import { useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import AvatarCard from '../components/avatar/AvatarCard.jsx';
import SkillCard from '../components/career/SkillCard.jsx';
import BadgeCard from '../components/career/BadgeCard.jsx';
import ScheduleCard from '../components/career/ScheduleCard.jsx';
import GoalProgress from '../components/career/GoalProgress.jsx';
import { mockSchedule } from '../data/mockSchedule.js';
import { useCareer } from '../context/CareerContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { ApiError } from '../api/client.js';

const GRADES = [1, 2, 3, 4];

function emptyFormFrom(user) {
  return { name: user.name, major: user.major || '', grade: user.grade, desiredJob: user.desiredJob || '' };
}

// 기본 정보 카드 — 읽기 전용 표시와 수정 폼 사이를 토글. 대학/완료 퀘스트는
// 학생이 직접 바꿀 값이 아니라(ThemeContext/퀘스트 진행에서 파생) 수정 모드에서도
// 계속 읽기 전용으로 남는다 — 폼에 안 넣는다.
function ProfileInfoCard({ user, universityName, questsCompletedLabel }) {
  const { updateProfile } = useCareer();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => emptyFormFrom(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const startEdit = () => {
    setForm(emptyFormFrom(user));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ ...form, name: form.name.trim(), grade: Number(form.grade) });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const infoRows = [
    ['이름', user.name],
    ['대학', universityName],
    ['학과', user.major || '미입력'],
    ['학년', `${user.grade}학년`],
    ['희망 직무', user.desiredJob || '미입력'],
    ['완료 퀘스트', questsCompletedLabel],
  ];

  return (
    <article className="card mypage-info-card">
      <div className="card-head mypage-info-card__head">
        <h2>기본 정보</h2>
        {!editing && <button type="button" className="mypage-edit-btn" onClick={startEdit}>수정</button>}
      </div>

      {editing ? (
        <form className="mypage-edit-form" onSubmit={save}>
          <label>
            이름
            <input value={form.name} onChange={update('name')} required />
          </label>
          <label>
            학과 <span className="mypage-edit-form__optional">(선택)</span>
            <input value={form.major} onChange={update('major')} placeholder="예: 컴퓨터공학과" />
          </label>
          <label>
            학년
            <select value={form.grade} onChange={update('grade')}>
              {GRADES.map((g) => <option key={g} value={g}>{g}학년</option>)}
            </select>
          </label>
          <label>
            희망 직무 <span className="mypage-edit-form__optional">(선택)</span>
            <input value={form.desiredJob} onChange={update('desiredJob')} placeholder="예: 백엔드 개발자" />
          </label>
          {error && <p className="mypage-edit-form__error">{error}</p>}
          <div className="mypage-edit-form__actions">
            <button type="button" onClick={cancel} disabled={saving}>취소</button>
            <button type="submit" className="primary" disabled={saving || !form.name.trim()}>{saving ? '저장 중...' : '저장'}</button>
          </div>
        </form>
      ) : (
        <dl className="mypage-info-list">
          {infoRows.map(([label, value]) => (
            <div className="mypage-info-row" key={label}>
              <dt>{label}</dt><dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

export default function MyPage({ navigate }) {
  const { user, skills, badges, quests } = useCareer();
  const theme = useTheme();
  const completed = quests.filter((q) => q.completed).length;

  return (
    <AppShell activePath="/mypage" navigate={navigate} title="마이페이지" subtitle="나의 커리어 성장 현황을 한눈에 확인해보세요.">
      <section className="top-grid mypage-grid">
        <AvatarCard user={user} />
        <SkillCard skills={skills} navigate={navigate} />
        <ProfileInfoCard user={user} universityName={theme.name} questsCompletedLabel={`${completed} / ${quests.length}`} />
      </section>
      <section className="mypage-badges">
        <BadgeCard badges={badges} />
      </section>
      <section className="mypage-schedule">
        <ScheduleCard schedule={mockSchedule} />
      </section>
      <GoalProgress />
    </AppShell>
  );
}
