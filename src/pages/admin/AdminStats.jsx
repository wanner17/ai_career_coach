import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { skillMeta } from '../../data/mockUser.js';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

const barClassBySkill = {
  jobSkill: '', resume: 'bluebar', interview: 'orangebar', companyAnalysis: 'purplebar', careerReadiness: 'yellowbar',
};

const TOPIC_ICONS = { 직무역량: '💼', 자기소개서: '✍️', 면접: '🎤', 기업분석: '🔍', 취업준비: '🎯', 진로탐색: '🧭', 기타: '💬' };

// GET /api/admin/stats — every number here is real, computed from the same
// tables the student-facing screens read (see AdminStatsService), not mock
// data. Reuses the skill-bar (SkillCard) and insight-bar (AI 상담) visual
// language rather than inventing a third bar style for the same idea.
export default function AdminStats({ navigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.getAdminStats());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <AdminLayout active="stats" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>통계</h1>
          <p>전체 학생의 성장 지표를 한눈에 확인합니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-table-wrap"><div className="admin-empty">불러오는 중...</div></div>
      ) : error ? (
        <div className="admin-table-wrap">
          <div className="admin-empty">
            {error}
            <div><button className="btn-primary" onClick={loadStats}>다시 시도</button></div>
          </div>
        </div>
      ) : (
        <>
          <div className="admin-stats-tiles">
            <div className="admin-stat-tile"><span>총 학생 수</span><strong>{stats.studentCount}명</strong></div>
            <div className="admin-stat-tile"><span>평균 레벨</span><strong>Lv.{stats.avgLevel.toFixed(1)}</strong></div>
            <div className="admin-stat-tile"><span>평균 EXP</span><strong>{Math.round(stats.avgExp).toLocaleString()}</strong></div>
          </div>

          <div className="admin-stats-grid">
            <article className="card skill-card">
              <div className="card-head"><h2>능력치 평균</h2></div>
              <div className="skill-list">
                {Object.entries(skillMeta).map(([key, meta]) => (
                  <div className="skill-row" key={key}>
                    <span className={`skill-icon ${meta.colorClass}`}>{meta.icon}</span>
                    <b>{meta.label}</b>
                    <div className={`mini-progress ${barClassBySkill[key]}`}><i style={{ width: `${stats.avgSkills[key]}%` }} /></div>
                    <strong>{stats.avgSkills[key]}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="card ai-insights">
              <h2 className="job-detail__section">AI상담 관심 주제 분포 (전체)</h2>
              {stats.topicDistribution.length === 0 ? (
                <p className="admin-empty">아직 쌓인 상담 데이터가 없어요.</p>
              ) : (
                <ul className="ai-insights__list">
                  {stats.topicDistribution.map((t) => {
                    const max = Math.max(...stats.topicDistribution.map((x) => x.count));
                    return (
                      <li key={t.topic}>
                        <span className="ai-insights__label">{TOPIC_ICONS[t.topic] || '💬'} {t.topic}</span>
                        <div className="ai-insights__bar"><span style={{ width: `${(t.count / max) * 100}%` }} /></div>
                        <span className="ai-insights__count">{t.count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          </div>

          <article className="card admin-quest-stat-card">
            <div className="card-head"><h2>퀘스트별 완료율</h2></div>
            <ul className="admin-quest-bars">
              {stats.questCompletion.map((q) => (
                <li key={q.questId}>
                  <span className="admin-quest-bars__label">{q.title}</span>
                  <div className="admin-quest-bars__bar"><span style={{ width: `${q.rate * 100}%` }} /></div>
                  <span className="admin-quest-bars__count">{q.completedCount} / {stats.studentCount}</span>
                </li>
              ))}
            </ul>
          </article>
        </>
      )}
    </AdminLayout>
  );
}
