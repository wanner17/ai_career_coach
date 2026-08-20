import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import Modal from '../../components/common/Modal.jsx';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

const PROGRAM_CATEGORY = '교내프로그램';
const TARGETS = ['전체', '1학년', '2학년', '3학년', '4학년'];
const STATUSES = ['사용', '미사용'];

const emptyForm = { name: '', description: '', target: '전체', exp: 100, period: '', status: '사용' };

// 프로그램 = category='교내프로그램'인 Quest — 별도 테이블 없이 기존 Quest
// CRUD(/api/admin/quests)를 그대로 재사용하고, 이 화면에서만 그 카테고리로
// 보이고 저장되게 필터링한다. Quest 관리 화면에서도 같은 행이 그대로
// 보임(단일 소스) — "취업지원센터 프로그램 참여"가 실제 예시.
export default function AdminProgram({ navigate }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.getAdminQuests();
      setPrograms(all.filter((q) => q.category === PROGRAM_CATEGORY));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const visible = programs.filter((p) => !search || p.name.includes(search));

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (p) => { setEditingId(p.id); setForm({ ...p }); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form, category: PROGRAM_CATEGORY, exp: Number(form.exp) };
      if (editingId) {
        await api.updateAdminQuest(editingId, payload);
      } else {
        await api.createAdminQuest(payload);
      }
      setFormOpen(false);
      await loadPrograms();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || submitting) return;
    setSubmitting(true);
    try {
      await api.deleteAdminQuest(deleteTarget.id);
      setDeleteTarget(null);
      await loadPrograms();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout active="programs" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>프로그램 관리</h1>
          <p>취업지원센터 등 교내프로그램을 등록/수정/삭제합니다. Quest 관리의 '교내프로그램' 카테고리와 같은 데이터입니다.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ 프로그램 등록</button>
      </div>

      <div className="admin-toolbar">
        <input placeholder="프로그램명 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : error ? (
          <div className="admin-empty">
            {error}
            <div><button className="btn-primary" onClick={loadPrograms}>다시 시도</button></div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>프로그램명</th><th>대상</th><th>기간</th><th>EXP</th><th>상태</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.target}</td>
                  <td>{p.period}</td>
                  <td>{p.exp}</td>
                  <td><span className={`status-pill ${p.status === '사용' ? 'on' : 'off'}`}>{p.status}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <button onClick={() => openEdit(p)}>수정</button>
                      <button className="danger" onClick={() => setDeleteTarget(p)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && visible.length === 0 && <div className="admin-empty">등록된 프로그램이 없습니다.</div>}
      </div>

      {formOpen && (
        <ProgramFormModal
          form={form}
          setForm={setForm}
          editing={!!editingId}
          submitting={submitting}
          onSubmit={submitForm}
          onClose={closeForm}
        />
      )}

      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <h3>{deleteTarget.name}</h3>
          <p>이 프로그램을 삭제하시겠습니까?<br />삭제하면 되돌릴 수 없습니다.</p>
          <div className="modal-actions">
            <button onClick={() => setDeleteTarget(null)} disabled={submitting}>취소</button>
            <button className="primary" onClick={confirmDelete} disabled={submitting}>삭제</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function ProgramFormModal({ form, setForm, editing, submitting, onSubmit, onClose }) {
  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal onClose={onClose} boxClassName="admin-modal-box">
      <h3>{editing ? '프로그램 수정' : '프로그램 등록'}</h3>
      <form onSubmit={onSubmit}>
        <div className="admin-form-grid">
          <div className="full">
            <label>프로그램명</label>
            <input value={form.name} onChange={update('name')} required />
          </div>
          <div className="full">
            <label>설명</label>
            <textarea value={form.description} onChange={update('description')} />
          </div>
          <div>
            <label>대상 학년</label>
            <select value={form.target} onChange={update('target')}>
              {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>EXP</label>
            <input type="number" min="0" value={form.exp} onChange={update('exp')} required />
          </div>
          <div className="full">
            <label>운영 기간</label>
            <input value={form.period} onChange={update('period')} placeholder="예: 2026.03.01 ~ 2026.12.31" required />
          </div>
          <div>
            <label>사용 여부</label>
            <select value={form.status} onChange={update('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>취소</button>
          <button type="submit" className="primary" disabled={submitting}>{editing ? '수정 저장' : '등록'}</button>
        </div>
      </form>
    </Modal>
  );
}
