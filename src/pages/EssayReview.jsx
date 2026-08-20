import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import { reviewEssay, getEssayHistory, getWorknetXml } from '../api/career.js';
import { parseWorknetDetail, parseWorknetList } from '../utils/worknetXml.js';
import { ApiError } from '../api/client.js';
import { useCareer } from '../context/CareerContext.jsx';

// 자기소개서 첨삭 — real OpenAI call (see career-backend's EssayReviewService),
// not RAG: this is "critique this text against a fixed rubric", not a
// retrieval task, and there's no example-essay corpus in this project to
// retrieve from. Score bars reuse the same .skill/.icon/.bar/.score classes
// as the Dashboard hero card's 능력치 section for a consistent look.
//
// Differentiation vs. "그냥 AI 사이트에 붙여넣기" (per the user's own ask):
// 1) target picker below grounds the AI's rubric against a real job posting
//    / company pulled from the same Worknet data Jobs/CompanyAnalysis use,
// 2) a successful review feeds the existing EXP + 자소서 능력치 loop — see
//    the `growth` toast after submit,
// 3) every review is saved; the score-trend sparkline below plots history.
const CATEGORY_ICONS = { 구체성: '🔍', 직무연관성: '💼', '논리적 흐름': '🔗', 표현력: '✍️', 임팩트: '⚡' };

function buildTargetContext(type, list, detail) {
  if (type === 'NEWS') {
    const parts = [`채용공고: ${list.title}`, `기업명: ${list.company}`];
    if (detail?.method) parts.push(`전형방법: ${detail.method}`);
    if (detail?.docs) parts.push(`제출서류: ${detail.docs}`);
    if (detail?.selections?.length) parts.push(...detail.selections.map((s) => `${s.name}: ${s.content}`));
    return parts.filter(Boolean).join('\n');
  }
  // COMPANY
  const parts = [`기업명: ${list.title}`];
  if (list.intro) parts.push(`소개: ${list.intro}`);
  if (detail?.intro) parts.push(`상세 소개: ${detail.intro}`);
  return parts.filter(Boolean).join('\n');
}

function TargetPicker({ target, onPick, onClear }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('NEWS');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState(false);

  const search = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      const xml = await getWorknetXml({ type, callTp: 'L', keyword: keyword.trim(), startPage: 1 });
      setResults(parseWorknetList(xml, type)?.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pick = async (item) => {
    setPicking(true);
    try {
      const idParams = type === 'NEWS' ? { empSeqno: item.empSeqno } : { empCoNo: item.empCoNo };
      const xml = await getWorknetXml({ type, callTp: 'D', ...idParams });
      const detail = parseWorknetDetail(xml, type);
      onPick({
        targetType: type,
        targetLabel: type === 'NEWS' ? `${item.company} · ${item.title}` : item.title,
        targetContext: buildTargetContext(type, item, detail),
      });
      setOpen(false);
      setResults(null);
      setKeyword('');
    } catch {
      // best-effort — leave picker open so the student can retry
    } finally {
      setPicking(false);
    }
  };

  if (target) {
    return (
      <div className="essay-target essay-target--picked">
        <span className="essay-target__badge">{target.targetType === 'NEWS' ? '📋 채용공고' : '🏢 기업'}</span>
        <span className="essay-target__label">{target.targetLabel}</span>
        <button type="button" className="essay-target__clear" onClick={onClear}>✕</button>
      </div>
    );
  }

  return (
    <div className="essay-target">
      {!open ? (
        <button type="button" className="essay-target__open-btn" onClick={() => setOpen(true)}>
          🎯 채용공고/기업 연동해서 첨삭받기 (선택)
        </button>
      ) : (
        <div className="essay-target__panel">
          <div className="essay-target__tabs">
            <button type="button" className={type === 'NEWS' ? 'active' : ''} onClick={() => { setType('NEWS'); setResults(null); }}>채용공고</button>
            <button type="button" className={type === 'COMPANY' ? 'active' : ''} onClick={() => { setType('COMPANY'); setResults(null); }}>기업</button>
          </div>
          <div className="essay-target__search">
            <input
              placeholder={type === 'NEWS' ? '공고 제목으로 검색' : '기업명으로 검색'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
            <button type="button" onClick={search} disabled={searching || !keyword.trim()}>{searching ? '검색 중...' : '검색'}</button>
          </div>
          {results && (
            <ul className="essay-target__results">
              {results.length === 0 && <li className="essay-target__empty">검색 결과가 없어요.</li>}
              {results.slice(0, 8).map((item) => (
                <li key={item.key}>
                  <button type="button" disabled={picking} onClick={() => pick(item)}>
                    {type === 'NEWS' ? `${item.company} · ${item.title}` : item.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="essay-target__cancel" onClick={() => setOpen(false)}>닫기</button>
        </div>
      )}
    </div>
  );
}

function GrowthBanner({ growth }) {
  if (!growth) return null;
  return (
    <div className="essay-growth">
      {!growth.alreadyCompleted && growth.expGained > 0 && <span>🎯 +{growth.expGained} EXP</span>}
      {growth.alreadyCompleted && <span>✅ 퀘스트 완료 이력 있음</span>}
      <span>📈 자기소개서 능력치 {growth.resumeSkillBefore} → {growth.resumeSkillAfter}</span>
      {growth.leveledUp && <span>🎉 Lv.{growth.fromLevel} → Lv.{growth.toLevel}</span>}
    </div>
  );
}

function HistorySection({ history }) {
  if (!history || history.length === 0) return null;
  const points = [...history].reverse(); // oldest → newest for a left-to-right trend line
  const w = 320;
  const h = 72;
  const pad = 8;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + step * i;
    const y = h - pad - (p.overallScore / 100) * (h - pad * 2);
    return [x, y];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <article className="card essay-history-card">
      <h3 className="job-detail__section">첨삭 이력 &amp; 점수 추이</h3>
      <svg className="essay-trend" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={path} fill="none" stroke="var(--career-primary)" strokeWidth="2" />
        {coords.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 4 : 2.5} fill="var(--career-primary)" />)}
      </svg>
      <ul className="essay-history-list">
        {history.map((item) => (
          <li key={item.id}>
            <span className="essay-history-score">{item.overallScore}점</span>
            <span className="essay-history-label">{item.targetLabel || '일반 첨삭'}</span>
            <span className="essay-history-date">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function EssayReview({ navigate }) {
  const { pushToast } = useCareer();
  const [question, setQuestion] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);

  const loadHistory = async () => {
    try {
      setHistory(await getEssayHistory());
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = { question: question.trim(), content: content.trim(), ...target };
      const res = await reviewEssay(payload);
      setResult(res);
      if (res.growth?.expGained > 0) pushToast(`🎯 자기소개서 첨삭 완료! +${res.growth.expGained} EXP`);
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '첨삭 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell activePath="/essay" navigate={navigate} title="자기소개서 첨삭" subtitle="AI가 항목별로 점수와 개선 제안을 알려드려요.">
      <article className="card essay-form-card">
        <TargetPicker target={target} onPick={setTarget} onClear={() => setTarget(null)} />
        <div className="essay-field">
          <label htmlFor="essay-question">자소서 문항 <span className="essay-field__optional">(선택)</span></label>
          <input
            id="essay-question"
            placeholder="예: 지원 동기를 작성해주세요"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <div className="essay-field">
          <label htmlFor="essay-content">자소서 본문</label>
          <textarea
            id="essay-content"
            rows={10}
            placeholder="첨삭받고 싶은 자기소개서를 붙여넣어주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button className="essay-submit-btn" onClick={handleSubmit} disabled={loading || !content.trim()}>
          {loading ? '첨삭 중...' : '✨ AI 첨삭 받기'}
        </button>
        {error && <p className="essay-error">{error}</p>}
      </article>

      {result && (
        <article className="card essay-result-card">
          <div className="essay-score">
            <div className="essay-score__ring" style={{ '--pct': result.overallScore }}>
              <strong>{result.overallScore}</strong>
              <span>/ 100</span>
            </div>
            <p className="essay-summary">{result.summary}</p>
          </div>

          <GrowthBanner growth={result.growth} />

          <div className="divider" />

          <h3 className="job-detail__section">항목별 평가</h3>
          <div className="skills">
            {result.categories?.map((c) => (
              <div className="skill" key={c.name}>
                <div className="icon purple">{CATEGORY_ICONS[c.name] || '•'}</div>
                <div className="skill-name">{c.name}</div>
                <div className="bar"><span style={{ width: `${c.score}%` }} /></div>
                <div className="score">{c.score}</div>
              </div>
            ))}
          </div>
          {result.categories?.some((c) => c.comment) && (
            <ul className="essay-category-comments">
              {result.categories.map((c) => c.comment && <li key={c.name}><b>{c.name}</b> — {c.comment}</li>)}
            </ul>
          )}

          {result.suggestions?.length > 0 && (
            <>
              <h3 className="job-detail__section">개선 제안</h3>
              <ul className="essay-suggestions">
                {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}

          {result.rewrittenExample && (
            <>
              <h3 className="job-detail__section">고쳐 쓴 예시</h3>
              <div className="job-detail__sub essay-rewrite">{result.rewrittenExample}</div>
            </>
          )}
        </article>
      )}

      <HistorySection history={history} />
    </AppShell>
  );
}
