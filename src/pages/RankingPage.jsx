import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import { getRanking } from '../api/career.js';
import { ApiError } from '../api/client.js';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function RankRow({ entry }) {
  return (
    <div className={`ranking-row ${entry.isMe ? 'is-me' : ''}`}>
      <span className="ranking-row__rank">{MEDAL[entry.rank] || entry.rank}</span>
      <div className="ranking-row__who">
        <strong>{entry.maskedName}{entry.isMe && <span className="ranking-row__me-tag">나</span>}</strong>
        <span>{[entry.major, entry.grade ? `${entry.grade}학년` : null].filter(Boolean).join(' · ') || '정보 없음'}</span>
      </div>
      <span className="ranking-row__level">Lv.{entry.level}</span>
      <span className="ranking-row__exp">{entry.currentExp.toLocaleString()} EXP</span>
    </div>
  );
}

// 우리 학교 학생들끼리의 Level 순위 — 이름은 서버에서 이미 마스킹돼서 온다(첫
// 글자만 노출, 나머지 마스킹 — see RankingService#maskName). 내 순위는 목록에
// 안 잡히더라도(상위 50위 밖) 항상 별도로 보여준다.
export default function RankingPage({ navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRanking()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : '순위를 불러오지 못했습니다.'));
  }, []);

  const meInTop = data?.me && data.entries.some((e) => e.isMe);

  return (
    <AppShell activePath="/ranking" navigate={navigate} title="🏆 성장 랭킹" subtitle="우리 학교 학생들과 성장을 비교해보세요.">
      {error && <p className="jobs-empty">{error}</p>}

      {!error && !data && <p className="jobs-loading">불러오는 중...</p>}

      {data && (
        <>
          {data.me && (
            <article className="card ranking-me-card">
              <span className="ranking-me-card__label">내 순위</span>
              <strong className="ranking-me-card__rank">{MEDAL[data.me.rank] || `${data.me.rank}위`}</strong>
              <span className="ranking-me-card__detail">전체 {data.totalStudents}명 중 · Lv.{data.me.level} · {data.me.currentExp.toLocaleString()} EXP</span>
            </article>
          )}

          <article className="card ranking-list-card">
            <div className="card-head">
              <h2>Level 순위 TOP {data.entries.length}</h2>
            </div>
            <div className="ranking-list">
              {data.entries.map((entry) => <RankRow key={entry.rank} entry={entry} />)}
              {data.entries.length === 0 && <p className="jobs-empty">아직 순위 데이터가 없습니다.</p>}
            </div>
          </article>

          {data.me && !meInTop && (
            <article className="card ranking-list-card">
              <div className="ranking-list">
                <RankRow entry={data.me} />
              </div>
            </article>
          )}
        </>
      )}
    </AppShell>
  );
}
