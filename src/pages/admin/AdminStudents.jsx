import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { skillMeta } from '../../data/mockUser.js';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

// Read-only roster — GET /api/admin/students, search/filter stays
// client-side on the small MVP dataset, same pattern as AdminQuest.jsx.
export default function AdminStudents({ navigate }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStudents(await api.getAdminStudents());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const visible = students.filter((s) => {
    if (!search) return true;
    const q = search.trim();
    return s.name.includes(q) || (s.major || '').includes(q) || (s.desiredJob || '').includes(q);
  });

  return (
    <AdminLayout active="students" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>학생관리</h1>
          <p>가입한 학생들의 레벨·EXP·능력치·퀘스트 진행 현황을 확인합니다.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input placeholder="이름·전공·희망직무 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : error ? (
          <div className="admin-empty">
            {error}
            <div><button className="btn-primary" onClick={loadStudents}>다시 시도</button></div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th><th>대학</th><th>학과/학년</th><th>희망직무</th>
                <th>레벨</th><th>EXP</th><th>능력치</th><th>퀘스트</th><th>가입일</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.universityCode}</td>
                  <td>{s.major || '-'} {s.grade}학년</td>
                  <td>{s.desiredJob || '-'}</td>
                  <td>Lv.{s.level}</td>
                  <td>{s.currentExp.toLocaleString()} / {s.nextLevelExp.toLocaleString()}</td>
                  <td>
                    {s.skills && (
                      <div className="admin-skill-chips">
                        {Object.entries(skillMeta).map(([key, meta]) => (
                          <span key={key} title={meta.label}>{meta.icon} {s.skills[key]}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{s.questsCompleted} / {s.questsTotal}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && visible.length === 0 && <div className="admin-empty">조건에 맞는 학생이 없습니다.</div>}
      </div>
    </AdminLayout>
  );
}
