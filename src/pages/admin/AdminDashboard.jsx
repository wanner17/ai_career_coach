import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

const SHORTCUTS = [
  { key: 'students', icon: '☺', label: '학생관리', desc: '학생별 레벨·능력치·퀘스트 진행 확인', path: '/admin/students' },
  { key: 'quest', icon: '▣', label: 'Quest 관리', desc: '퀘스트 등록·수정·삭제', path: '/admin/quest' },
  { key: 'programs', icon: '▤', label: '프로그램 관리', desc: '교내프로그램 등록·수정·삭제', path: '/admin/programs' },
  { key: 'badges', icon: '★', label: 'Badge 관리', desc: '배지 등록·수정·삭제', path: '/admin/badges' },
  { key: 'stats', icon: '▥', label: '통계', desc: '능력치·완료율·상담 주제 전체 집계', path: '/admin/stats' },
  { key: 'settings', icon: '⚙', label: '설정', desc: '브랜드 컬러·로고 관리', path: '/admin/settings' },
];

// GET /api/admin/dashboard — deliberately lighter than 통계: headline
// numbers + "무슨 일이 있었는지" 활동 피드 + 바로가기, not the full
// breakdown (see AdminStats.jsx for the deep numbers).
export default function AdminDashboard({ navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAdminDashboard());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '대시보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout active="dashboard" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>Dashboard</h1>
          <p>Career Growth 관리 콘솔 요약입니다.</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-table-wrap"><div className="admin-empty">불러오는 중...</div></div>
      ) : error ? (
        <div className="admin-table-wrap">
          <div className="admin-empty">
            {error}
            <div><button className="btn-primary" onClick={load}>다시 시도</button></div>
          </div>
        </div>
      ) : (
        <>
          <div className="admin-stats-tiles">
            <div className="admin-stat-tile"><span>총 학생 수</span><strong>{data.studentCount}명</strong></div>
            <div className="admin-stat-tile"><span>평균 레벨</span><strong>Lv.{data.avgLevel.toFixed(1)}</strong></div>
            <div className="admin-stat-tile"><span>누적 퀘스트 완료</span><strong>{data.totalCompletedQuests}건</strong></div>
          </div>

          <div className="admin-stats-grid">
            <article className="card admin-activity-card">
              <div className="card-head"><h2>최근 가입 학생</h2></div>
              {data.recentStudents.length === 0 ? (
                <p className="admin-empty">아직 가입한 학생이 없어요.</p>
              ) : (
                <ul className="admin-activity-list">
                  {data.recentStudents.map((s, i) => (
                    <li key={i}>
                      <span className="admin-activity-list__main">{s.name} <small>· {s.universityCode}</small></span>
                      <span className="admin-activity-list__side">Lv.{s.level} · {new Date(s.createdAt).toLocaleDateString('ko-KR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="card admin-activity-card">
              <div className="card-head"><h2>최근 퀘스트 완료</h2></div>
              {data.recentActivity.length === 0 ? (
                <p className="admin-empty">아직 완료된 퀘스트가 없어요.</p>
              ) : (
                <ul className="admin-activity-list">
                  {data.recentActivity.map((a, i) => (
                    <li key={i}>
                      <span className="admin-activity-list__main">{a.studentName} <small>· {a.questTitle}</small></span>
                      <span className="admin-activity-list__side">+{a.exp} EXP · {new Date(a.completedAt).toLocaleDateString('ko-KR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <div className="admin-shortcut-grid">
            {SHORTCUTS.map((s) => (
              <button key={s.key} className="admin-shortcut-card" onClick={() => navigate(s.path)}>
                <span className="admin-shortcut-card__icon">{s.icon}</span>
                <strong>{s.label}</strong>
                <span className="admin-shortcut-card__desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
