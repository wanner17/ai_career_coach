import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import Modal from '../../components/common/Modal.jsx';
import { CATEGORIES } from '../../data/mockQuests.js';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

const TARGETS = ['전체', '1학년', '2학년', '3학년', '4학년'];
const STATUSES = ['사용', '미사용'];

const emptyForm = { name: '', description: '', category: CATEGORIES[0], target: '전체', exp: 100, period: '상시', status: '사용' };

// GET/POST/PUT/DELETE /api/admin/quests — no local mock array anymore. Every
// mutation re-fetches the list afterward instead of patching local state, so
// the table can never drift from what the server actually has.
export default function AdminQuest({ navigate }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadQuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuests(await api.getAdminQuests());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const visible = quests.filter((q) => {
    if (search && !q.name.includes(search)) return false;
    if (statusFilter !== '전체' && q.status !== statusFilter) return false;
    if (categoryFilter !== '전체' && q.category !== categoryFilter) return false;
    return true;
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (q) => { setEditingId(q.id); setForm({ ...q }); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form, exp: Number(form.exp) };
      if (editingId) {
        await api.updateAdminQuest(editingId, payload);
      } else {
        await api.createAdminQuest(payload);
      }
      setFormOpen(false);
      await loadQuests();
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
      await loadQuests();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout active="quest" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>Quest 관리</h1>
          <p>학생에게 노출되는 퀘스트를 등록/수정/삭제합니다.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Quest 등록</button>
      </div>

      <div className="admin-toolbar">
        <input placeholder="Quest명 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="전체">전체 카테고리</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="전체">전체 상태</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : error ? (
          <div className="admin-empty">
            {error}
            <div><button className="btn-primary" onClick={loadQuests}>다시 시도</button></div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quest명</th><th>대상</th><th>카테고리</th><th>EXP</th><th>기간</th><th>상태</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((q) => (
                <tr key={q.id}>
                  <td>{q.name}</td>
                  <td>{q.target}</td>
                  <td>{q.category}</td>
                  <td>{q.exp}</td>
                  <td>{q.period}</td>
                  <td><span className={`status-pill ${q.status === '사용' ? 'on' : 'off'}`}>{q.status}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <button onClick={() => openEdit(q)}>수정</button>
                      <button className="danger" onClick={() => setDeleteTarget(q)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && visible.length === 0 && <div className="admin-empty">조건에 맞는 Quest가 없습니다.</div>}
      </div>

      {formOpen && (
        <QuestFormModal
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
          <p>이 Quest를 삭제하시겠습니까?<br />삭제하면 되돌릴 수 없습니다.</p>
          <div className="modal-actions">
            <button onClick={() => setDeleteTarget(null)} disabled={submitting}>취소</button>
            <button className="primary" onClick={confirmDelete} disabled={submitting}>삭제</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function QuestFormModal({ form, setForm, editing, submitting, onSubmit, onClose }) {
  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal onClose={onClose} boxClassName="admin-modal-box">
      <h3>{editing ? 'Quest 수정' : 'Quest 등록'}</h3>
      <form onSubmit={onSubmit}>
        <div className="admin-form-grid">
          <div className="full">
            <label>Quest명</label>
            <input value={form.name} onChange={update('name')} required />
          </div>
          <div className="full">
            <label>설명</label>
            <textarea value={form.description} onChange={update('description')} />
          </div>
          <div>
            <label>Category</label>
            <select value={form.category} onChange={update('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
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
          <div>
            <label>기간</label>
            <input value={form.period} onChange={update('period')} placeholder="상시 또는 YYYY.MM.DD ~ YYYY.MM.DD" />
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
