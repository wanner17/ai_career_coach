import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import Modal from '../../components/common/Modal.jsx';
import * as api from '../../api/career.js';
import { ApiError } from '../../api/client.js';

const KNOWLEDGE_FILE_EXTENSIONS = ['.pdf', '.txt', '.hwpx', '.docx', '.ppt', '.pptx'];

// ACE(사내 RAG) 응답의 로그 항목은 additionalProperties(자유 형식) 스키마라 필드가
// 고정돼 있지 않다 — 실제로 오는 값은 스네이크케이스일 가능성이 높아 그걸 우선
// 찾고, 없으면 후보 키를 순서대로 시도한다. 하나도 안 맞으면 화면에서 원본 JSON을
// 펼쳐볼 수 있게 raw를 그대로 들고 있는다(AdminAiKnowledge 아래 DocumentRow 참고).
function pick(log, ...keys) {
  for (const k of keys) {
    if (log[k] !== undefined && log[k] !== null && log[k] !== '') return log[k];
  }
  return null;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// AI 상담(AiChatService의 search_school_docs 도구)이 참고하는 ACE 지식베이스에
// 취업지원센터 자료를 등록/조회/삭제 — 실제 임베딩은 전부 career-backend의
// AceService가 대행하고, 여기선 그 REST 응답만 그린다.
export default function AdminAiKnowledge({ navigate }) {
  const [configured, setConfigured] = useState(null); // null = 확인 중
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [textOpen, setTextOpen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textCategory, setTextCategory] = useState('');
  const [submittingText, setSubmittingText] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await api.getAiKnowledgeStatus();
      setConfigured(!!status.configured);
      if (status.configured) {
        setDocs(await api.getAiKnowledgeDocuments());
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickFile = () => fileInputRef.current?.click();

  const applyFile = async (picked) => {
    if (!picked || uploading) return;
    const name = picked.name.toLowerCase();
    if (!KNOWLEDGE_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      window.alert(`지원하지 않는 파일 형식이에요. (지원: ${KNOWLEDGE_FILE_EXTENSIONS.join(', ')})`);
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadAiKnowledgeDocument(picked);
      if (res.status === 'accepted') {
        window.alert(`"${picked.name}" 업로드를 접수했어요. 처리 시간이 걸릴 수 있어 잠시 후 목록에서 확인해주세요.`);
      } else {
        window.alert(`"${picked.name}" 임베딩이 완료됐어요. (${res.chunksProcessed ?? 0}개 청크)`);
      }
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e) => { applyFile(e.target.files?.[0]); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); applyFile(e.dataTransfer.files?.[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };

  const submitText = async (e) => {
    e.preventDefault();
    if (!textContent.trim() || submittingText) return;
    setSubmittingText(true);
    try {
      await api.embedAiKnowledgeText({ content: textContent.trim(), category: textCategory.trim() || undefined });
      setTextOpen(false);
      setTextContent('');
      setTextCategory('');
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmittingText(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.deleteAiKnowledgeDocument(deleteTarget.sourceId);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout active="ai-knowledge" navigate={navigate}>
      <div className="admin-header">
        <div>
          <h1>AI 상담 지식베이스</h1>
          <p>AI 상담이 참고하는 취업지원센터 자료(공지·가이드·FAQ)를 등록·관리합니다. 등록한 자료는 ACE 지식베이스에 임베딩되어 학생 질문에 답할 때 검색됩니다.</p>
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
      ) : !configured ? (
        <div className="admin-table-wrap">
          <div className="admin-empty">
            AI 상담 지식베이스 연동이 아직 설정되지 않았습니다.<br />
            서버 환경변수 ACE_BASE_URL / ACE_API_KEY / ACE_BUCKET_ID를 설정한 뒤 다시 시도해주세요.
          </div>
        </div>
      ) : (
        <>
          <article className="card ai-knowledge-upload-card">
            <h2>자료 등록</h2>
            <div
              className={`resume-dropzone ai-knowledge-dropzone ${dragOver ? 'is-drag-over' : ''} ${uploading ? 'is-busy' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <span className="resume-dropzone__icon">📎</span>
              <p>{uploading ? '업로드 중...' : '파일을 여기로 끌어다 놓거나'}</p>
              <button type="button" className="resume-dropzone__btn" onClick={pickFile} disabled={uploading}>파일 선택</button>
              <small>지원 형식: PDF, TXT, HWPX, DOCX, PPT, PPTX</small>
              <input
                ref={fileInputRef}
                type="file"
                accept={KNOWLEDGE_FILE_EXTENSIONS.join(',')}
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <button type="button" className="ai-knowledge-text-toggle" onClick={() => setTextOpen((o) => !o)}>
              {textOpen ? '▲ 텍스트 직접 입력 닫기' : '▼ 텍스트로 직접 입력하기 (공지/FAQ 등)'}
            </button>
            {textOpen && (
              <form className="ai-knowledge-text-form" onSubmit={submitText}>
                <textarea
                  placeholder="임베딩할 텍스트 내용을 입력하세요. (예: 취업지원센터 프로그램 안내, 자주 묻는 질문 등)"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  required
                />
                <div className="ai-knowledge-text-form__row">
                  <input
                    placeholder="카테고리 (선택, 예: 학사공지)"
                    value={textCategory}
                    onChange={(e) => setTextCategory(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" disabled={!textContent.trim() || submittingText}>
                    {submittingText ? '등록 중...' : '등록'}
                  </button>
                </div>
              </form>
            )}
          </article>

          <div className="admin-table-wrap ai-knowledge-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>자료명</th><th>유형</th><th>청크 수</th><th>등록일</th><th>관리</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((log, i) => <DocumentRow key={i} log={log} onDelete={setDeleteTarget} />)}
              </tbody>
            </table>
            {docs.length === 0 && <div className="admin-empty">등록된 자료가 없습니다.</div>}
          </div>
        </>
      )}

      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <h3>{deleteTarget.name}</h3>
          <p>이 자료를 지식베이스에서 삭제하시겠습니까?<br />삭제하면 AI 상담이 더 이상 이 내용을 참고하지 않습니다.</p>
          <div className="modal-actions">
            <button onClick={() => setDeleteTarget(null)} disabled={deleting}>취소</button>
            <button className="primary" onClick={confirmDelete} disabled={deleting}>삭제</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

// ACE 로그 한 건 — 스키마가 자유 형식이라 흔히 쓰이는 스네이크케이스 키를 우선
// 찾아서 표시하고, source_id를 못 찾으면 삭제 버튼은 숨긴다(삭제 API가 source_id
// 필수라 잘못된 값으로 지웠다간 다른 자료가 삭제될 수 있어서).
function DocumentRow({ log, onDelete }) {
  const sourceId = pick(log, 'source_id', 'sourceId');
  const name = pick(log, 'source_name', 'sourceName', 'filename', 'name') || '(이름 없음)';
  const type = pick(log, 'source_type', 'sourceType') || '-';
  const chunks = pick(log, 'chunks_processed', 'chunksProcessed', 'chunk_count');
  const createdAt = pick(log, 'created_at', 'createdAt', 'timestamp');

  return (
    <tr>
      <td>{name}</td>
      <td><span className="status-pill on">{type}</span></td>
      <td>{chunks ?? '-'}</td>
      <td>{formatDate(createdAt)}</td>
      <td>
        <div className="admin-row-actions">
          {sourceId
            ? <button className="danger" onClick={() => onDelete({ sourceId, name })}>삭제</button>
            : <span className="ai-knowledge-no-id">삭제 불가</span>}
        </div>
      </td>
    </tr>
  );
}
