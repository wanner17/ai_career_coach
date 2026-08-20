import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import Modal from '../../components/common/Modal.jsx';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

const UNLOCK_TYPES = ['QUEST', 'LEVEL'];
const MEDAL_CLASSES = ['gold', 'blue', 'purple'];

const emptyForm = { name: '', unlockType: 'QUEST', unlockValue: 5, icon: '★', medalClass: 'gold' };

// GET/POST/PUT/DELETE /api/admin/badges — same "no local mock array,
// refetch after every mutation" pattern as AdminQuest.jsx.
export default function AdminBadge({ navigate }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBadges(await api.getAdminBadges());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (b) => { setEditingId(b.id); setForm({ ...b, unlockValue: b.unlockValue ?? 5 }); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form, unlockValue: form.unlockType === 'LEVEL' ? Number(form.unlockValue) : null };
      if (editingId) {
        await api.updateAdminBadge(editingId, payload);
      } else {
        await api.createAdminBadge(payload);
      }
      setFormOpen(false);
      await loadBadges();
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
      await api.deleteAdminBadge(deleteTarget.id);
      setDeleteTarget(null);
      await loadBadges();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout active="badges" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>Badge 관리</h1>
          <p>학생에게 노출되는 배지를 등록/수정/삭제합니다.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Badge 등록</button>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : error ? (
          <div className="admin-empty">
            {error}
            <div><button className="btn-primary" onClick={loadBadges}>다시 시도</button></div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>아이콘</th><th>Badge명</th><th>획득 조건</th><th>메달 색상</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {badges.map((b) => (
                <tr key={b.id}>
                  <td>{b.icon}</td>
                  <td>{b.name}</td>
                  <td>{b.unlockType === 'LEVEL' ? `Lv.${b.unlockValue} 달성` : '퀘스트 달성 시 지급'}</td>
                  <td><span className={`status-pill on`}>{b.medalClass}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <button onClick={() => openEdit(b)}>수정</button>
                      <button className="danger" onClick={() => setDeleteTarget(b)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && badges.length === 0 && <div className="admin-empty">등록된 Badge가 없습니다.</div>}
      </div>

      {formOpen && (
        <BadgeFormModal
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
          <p>이 Badge를 삭제하시겠습니까?<br />이미 학생에게 지급된 배지는 삭제할 수 없습니다.</p>
          <div className="modal-actions">
            <button onClick={() => setDeleteTarget(null)} disabled={submitting}>취소</button>
            <button className="primary" onClick={confirmDelete} disabled={submitting}>삭제</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function BadgeFormModal({ form, setForm, editing, submitting, onSubmit, onClose }) {
  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal onClose={onClose} boxClassName="admin-modal-box">
      <h3>{editing ? 'Badge 수정' : 'Badge 등록'}</h3>
      <form onSubmit={onSubmit}>
        <div className="admin-form-grid">
          <div className="full">
            <label>Badge명</label>
            <input value={form.name} onChange={update('name')} required />
          </div>
          <div>
            <label>획득 조건</label>
            <select value={form.unlockType} onChange={update('unlockType')}>
              {UNLOCK_TYPES.map((t) => <option key={t} value={t}>{t === 'LEVEL' ? '레벨 달성' : '퀘스트 달성'}</option>)}
            </select>
          </div>
          {form.unlockType === 'LEVEL' && (
            <div>
              <label>필요 레벨</label>
              <input type="number" min="1" value={form.unlockValue} onChange={update('unlockValue')} required />
            </div>
          )}
          <div>
            <label>아이콘 (이모지)</label>
            <input value={form.icon} onChange={update('icon')} maxLength={4} required />
          </div>
          <div>
            <label>메달 색상</label>
            <select value={form.medalClass} onChange={update('medalClass')}>
              {MEDAL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
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
