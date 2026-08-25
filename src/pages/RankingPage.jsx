import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import { getRanking } from '../api/career.js';
import { ApiError } from '../api/client.js';
import { useCareer } from '../context/CareerContext.jsx';
import { useAvatarGender } from '../context/AvatarGenderContext.jsx';
import { getAvatarImage } from '../config/avatarEvolution.js';
import { calculateExpPercent } from '../utils/careerLevel.js';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const PERIODS = [
  { key: 'ALL', label: '전체' },
  { key: 'WEEK', label: '이번 주' },
  { key: 'MONTH', label: '이번 달' },
];

// 백엔드가 아직 옛 응답 형식이거나(재배포 타이밍 어긋남) 값이 없을 때 toLocaleString()에서
// 그대로 죽지 않도록 하는 방어용 포맷터 — 0으로 대체.
const fmt = (n) => (n ?? 0).toLocaleString();

function RankAvatar({ level, avatarGender, className = '' }) {
  return (
    <div className={`ranking-avatar ${className}`}>
      <img src={getAvatarImage(level, avatarGender)} alt="" />
    </div>
  );
}

// 다른 학생은 서버가 마스킹한 이름(maskedName)을 그대로 보여주지만, 본인 행은
// 이미 알고 있는 자기 이름이라 마스킹할 이유가 없다 — myName이 오면 그걸 우선한다.
function PodiumCard({ entry, myName }) {
  return (
    <article className={`ranking-podium ranking-podium--${entry.rank} ${entry.isMe ? 'is-me' : ''}`}>
      <span className="ranking-podium__medal">{MEDAL[entry.rank]}</span>
      <RankAvatar level={entry.level} avatarGender={entry.avatarGender} className="ranking-podium__avatar" />
      <strong className="ranking-podium__name">{entry.isMe && myName ? myName : entry.maskedName}{entry.isMe && <span className="ranking-row__me-tag">나</span>}</strong>
      <span className="ranking-podium__exp">{fmt(entry.exp)} EXP</span>
    </article>
  );
}

function TableRow({ entry, myName }) {
  return (
    <div className={`ranking-row ${entry.isMe ? 'is-me' : ''}`}>
      <span className={`ranking-row__rank ${entry.rank <= 3 ? `is-top${entry.rank}` : ''}`}>{entry.rank}</span>
      <div className="ranking-row__who">
        <RankAvatar level={entry.level} avatarGender={entry.avatarGender} className="ranking-row__avatar" />
        <strong>{entry.isMe && myName ? myName : entry.maskedName}</strong>
        {entry.isMe && <span className="ranking-row__me-tag">나</span>}
      </div>
      <span className="ranking-row__grade">{entry.grade ? `${entry.grade}학년` : '-'}</span>
      <span className="ranking-row__level">Lv.{entry.level}</span>
      <span className="ranking-row__exp">{fmt(entry.exp)} EXP</span>
    </div>
  );
}

// 우리 학교 학생들끼리의 EXP 순위 — 완료 퀘스트마다 시각이 남기 때문에(QuestService)
// "이번 주"/"이번 달"도 "전체"와 같은 방식으로 실제 집계된다(RankingService 참고).
// 이름은 서버가 이미 마스킹해서 내려온다(첫 글자만 노출).
export default function RankingPage({ navigate }) {
  const { user, quests } = useCareer();
  const { avatarGender } = useAvatarGender();
  const [period, setPeriod] = useState('ALL');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getRanking(period)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : '순위를 불러오지 못했습니다.'));
  }, [period]);

  const completedQuestCount = quests.filter((q) => q.completed).length;
  const meInTop = data?.me && data.entries.some((e) => e.isMe);
  const podium = data ? [data.entries[1], data.entries[0], data.entries[2]].filter(Boolean) : [];
  const expPercent = calculateExpPercent(user.currentExp, user.nextLevelExp);

  return (
    <AppShell activePath="/ranking" navigate={navigate} title="🏆 성장 랭킹" subtitle="퀘스트를 완료하고 순위를 높여보세요">
      {error && <p className="jobs-empty">{error}</p>}
      {!error && !data && <p className="jobs-loading">불러오는 중...</p>}

      {data && (
        <>
          <section className="ranking-stats-row">
            <article className="card ranking-me-card">
              <span className="ranking-me-card__label">나의 성장</span>
              <RankAvatar level={user.level} avatarGender={avatarGender} className="ranking-me-card__avatar" />
              <div className="ranking-me-card__body">
                <div className="ranking-me-card__name-row">
                  <strong>{user.name}</strong>
                  {data.me && <span className="ranking-me-card__rank-pill">🛡 {data.me.rank}위</span>}
                </div>
                <div className="ranking-me-card__level-row">
                  <b>Lv.{user.level}</b>
                  <span>{fmt(user.currentExp)} EXP</span>
                </div>
                <div className="ranking-me-card__progress">
                  <span>다음 레벨까지 {fmt(user.nextLevelExp - user.currentExp)} EXP</span>
                  <div className="progress"><i style={{ width: `${expPercent}%` }} /></div>
                  <small>{fmt(user.currentExp)} / {fmt(user.nextLevelExp)} EXP</small>
                </div>
              </div>
            </article>

            <article className="card ranking-stat-card">
              <span className="ranking-stat-card__icon">📈</span>
              <span className="ranking-stat-card__label">이번 주 획득 EXP</span>
              <strong>{fmt(data.weeklyExpGained)}</strong>
              <span className="ranking-stat-card__unit">EXP</span>
            </article>

            <article className="card ranking-stat-card">
              <span className="ranking-stat-card__icon">✅</span>
              <span className="ranking-stat-card__label">완료한 퀘스트</span>
              <strong>{completedQuestCount}</strong>
              <span className="ranking-stat-card__unit">개</span>
            </article>
          </section>

          {podium.length > 0 && (
            <section className="ranking-podium-section">
              <h2>TOP 3</h2>
              <div className="ranking-podium-row">
                {podium.map((entry) => <PodiumCard key={entry.rank} entry={entry} myName={user.name} />)}
              </div>
            </section>
          )}

          <article className="card ranking-list-card">
            <div className="card-head">
              <h2>전체 랭킹</h2>
              <div className="ranking-period-tabs">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    className={`ranking-period-tab ${period === p.key ? 'is-active' : ''}`}
                    onClick={() => setPeriod(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ranking-row ranking-row--head">
              <span>순위</span><span>이름</span><span>학년</span><span>레벨</span><span>EXP</span>
            </div>
            <div className="ranking-list">
              {data.entries.map((entry) => <TableRow key={entry.rank} entry={entry} myName={user.name} />)}
              {data.entries.length === 0 && <p className="jobs-empty">아직 순위 데이터가 없습니다.</p>}
              {data.me && !meInTop && <TableRow entry={data.me} myName={user.name} />}
            </div>
          </article>
        </>
      )}
    </AppShell>
  );
}
