import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import { reviewEssay, getEssayHistory, reviewResume, getResumeHistory, getWorknetXml } from '../api/career.js';
import { parseWorknetDetail, parseWorknetList } from '../utils/worknetXml.js';
import { scanAllNewsPostings } from '../utils/worknetScan.js';
import { ApiError } from '../api/client.js';
import { useCareer } from '../context/CareerContext.jsx';

// 이력서 · 자소서 첨삭 — 두 개의 탭으로 구성:
//  - 자기소개서 첨삭: 실제 OpenAI 호출(career-backend EssayReviewService).
//  - 이력서 첨삭: PDF/DOCX 업로드(또는 직접 작성) → career-backend
//    ResumeReviewService가 텍스트를 뽑아 AI로 분석한다. HWP는 제외(README 참고).
// 채용공고/기업 연동(TargetPicker)은 두 탭이 공유한다 — 어느 쪽을 첨삭받든 같은 지원
// 대상 기준으로 맞추는 게 자연스러워서 탭 스위처 위, 배너 형태로 뺐다.
//
// Differentiation vs. "그냥 AI 사이트에 붙여넣기" (per the user's own ask):
// 1) target picker 배너가 AI의 평가 기준을 실제 채용공고/기업 정보에 맞춰 세팅하고,
// 2) 성공한 첨삭은 기존 EXP + 자소서 능력치 루프에 그대로 이어지며(growth 토스트),
// 3) 모든 첨삭은 저장되어 아래 점수 추이 스파크라인으로 이어진다.
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

// 탭 스위처 위 공유 배너 — 골라둔 대상이 있으면 뱃지로, 없으면 검색 패널을 편다.
function TargetBanner({ target, onPick, onClear }) {
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
      if (type === 'NEWS') {
        // work24 NEWS API's keyword param only matches the posting TITLE, not
        // the company name (see utils/worknetScan.js) — scan+filter client-side,
        // same workaround as Jobs.jsx's 공채속보 tab, so a company-name search
        // actually finds something here too instead of silently returning 0.
        const { items } = await scanAllNewsPostings();
        const q = keyword.trim().toLowerCase();
        setResults(items.filter((item) => item.title?.toLowerCase().includes(q) || item.company?.toLowerCase().includes(q)));
      } else {
        const xml = await getWorknetXml({ type, callTp: 'L', keyword: keyword.trim(), startPage: 1 });
        setResults(parseWorknetList(xml, type)?.items ?? []);
      }
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
      <div className="essay-target essay-target--picked essay-target-banner">
        <span className="essay-target__badge">{target.targetType === 'NEWS' ? '📋 채용공고' : '🏢 기업'}</span>
        <span className="essay-target__label">{target.targetLabel}</span>
        <button type="button" className="essay-target__clear" onClick={onClear}>✕</button>
      </div>
    );
  }

  return (
    <div className="essay-target-banner">
      {!open ? (
        <button type="button" className="essay-target-banner__open-btn" onClick={() => setOpen(true)}>
          <strong>🎯 채용공고/기업 연동해서 첨삭받기 (선택)</strong>
          <span>선택한 채용공고의 직무·기업 기준으로 맞춤 분석을 제공합니다.</span>
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

function HistorySection({ historyRef, history }) {
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
    <article className="card essay-history-card" ref={historyRef}>
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

const ESSAY_STEPS = [
  { icon: '📝', title: '1. 문항/본문 작성', desc: '자소서 문항과 본문을 입력해주세요.' },
  { icon: '🔬', title: '2. AI 분석', desc: '직무 적합도, 표현력, 논리성 등을 종합 분석합니다.' },
  { icon: '✨', title: '3. 맞춤 첨삭 제공', desc: '강점은 더 돋보이게, 부족한 부분은 개선해 드립니다.' },
];

function HowItWorksCard({ steps, tip }) {
  return (
    <article className="card how-it-works-card">
      <h2>AI 첨삭은 이렇게 진행돼요</h2>
      <ol className="how-it-works-list">
        {steps.map((s) => (
          <li key={s.title}>
            <span className="how-it-works-list__icon">{s.icon}</span>
            <div>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="how-it-works-tip">
        <span>💡 TIP</span>
        <p>{tip}</p>
      </div>
    </article>
  );
}

const RESUME_ANALYSIS_ITEMS = ['직무 적합도 분석', '핵심 키워드 매칭', '경력/프로젝트 진단', '문장 및 표현 개선', 'ATS 최적화 진단'];

const IMPORTANCE_LABEL = { HIGH: '높음', MEDIUM: '중간', LOW: '낮음' };
const IMPORTANCE_ICON = { HIGH: '🔴', MEDIUM: '🟠', LOW: '🟢' };
const PRIORITY_ICON = { 1: '🔴', 2: '🟠', 3: '🟡' };

// 종합점수 표 — 항목별 점수 + 감점 이유를 한눈에. 직무 적합성 있으면 마지막 행에 같이.
function ResumeScoreTable({ sections, jobFitScore, jobFitReason }) {
  return (
    <div className="resume-score-table-wrap">
      <table className="resume-score-table">
        <thead>
          <tr><th>평가 항목</th><th>점수</th><th>주요 감점 이유</th></tr>
        </thead>
        <tbody>
          {sections?.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td className="resume-score-table__score">{s.score}</td>
              <td>{s.gap || '-'}</td>
            </tr>
          ))}
          {jobFitScore != null && (
            <tr className="resume-score-table__jobfit">
              <td>직무 적합성</td>
              <td className="resume-score-table__score">{jobFitScore}</td>
              <td>{jobFitReason || '-'}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// 항목별 상세 — 막대바 밑에 실제로 뭘 봤는지(✅)/뭐가 문제인지(⚠️)/어떻게 고칠지(💡)를
// 한 줄씩 — "마케팅 관련 경험이 부족합니다" 같은 한 줄 코멘트 대신 근거를 남긴다.
function ResumeSectionCard({ section }) {
  return (
    <div className="resume-section-card">
      <div className="resume-section-card__head">
        <span className={`icon ${section.present ? 'purple' : ''}`}>{section.present ? '✔' : '✕'}</span>
        <strong>{section.name}</strong>
        <div className="bar"><span style={{ width: `${section.score}%` }} /></div>
        <b>{section.score}</b>
      </div>
      {section.evidence && <p className="resume-section-card__line is-evidence">✅ {section.evidence}</p>}
      {section.gap && <p className="resume-section-card__line is-gap">⚠️ {section.gap}</p>}
      {section.suggestion && <p className="resume-section-card__line is-suggestion">💡 {section.suggestion}</p>}
    </div>
  );
}

// 원문 첨삭 — 이력서에서 실제로 뽑은 문장 → 문제 → (문제→행동→결과 구조의) 개선 예시.
// AI가 없는 성과/수치를 지어내지 않는다는 전제로 만들어짐 (ResumeReviewService 참고).
function ExcerptReviewCard({ review }) {
  return (
    <article className="excerpt-review-card">
      <span className="excerpt-review-card__section">{review.section}</span>
      <blockquote className="excerpt-review-card__original">“{review.originalText}”</blockquote>
      <p className="excerpt-review-card__issue">⚠️ {review.issue}</p>
      <div className="excerpt-review-card__improved">
        <span>개선 예시</span>
        <p>{review.improvedExample}</p>
      </div>
      {review.note && <p className="excerpt-review-card__note">💡 {review.note}</p>}
    </article>
  );
}

function MissingKeywordCard({ kw }) {
  return (
    <article className={`keyword-card is-${(kw.importance || '').toLowerCase()}`}>
      <div className="keyword-card__head">
        <span>{IMPORTANCE_ICON[kw.importance] || '⚪'}</span>
        <strong>{kw.keyword}</strong>
        <span className="keyword-card__importance">중요도 {IMPORTANCE_LABEL[kw.importance] || '-'}</span>
      </div>
      <p className="keyword-card__reason">{kw.reason}</p>
      <p className="keyword-card__recommendation">→ {kw.recommendation}</p>
    </article>
  );
}

// 방향 자체가 안 맞는 문제(relatedExperienceOptions)와 표현/구조가 문제(rewriteExample)를
// 구분해서 보여준다 — 전자는 "실제로 겪었다면"이라는 전제를 항상 같이 달아, 없는 경험을
// 있는 척 채우라는 뜻으로 읽히지 않게 한다.
function PriorityImprovementCard({ item }) {
  return (
    <article className="priority-card">
      <div className="priority-card__head">
        <span>{PRIORITY_ICON[item.priority] || '⚪'}</span>
        <strong>우선 개선 {item.priority} — {item.title}</strong>
      </div>
      <p className="priority-card__diagnosis">{item.diagnosis}</p>
      {item.relatedExperienceOptions?.length > 0 && (
        <div className="priority-card__options">
          <span>보완 가능한 경험</span>
          <ul>{item.relatedExperienceOptions.map((o) => <li key={o}>{o}</li>)}</ul>
          <p className="priority-card__note">실제로 경험한 항목이 있다면 프로젝트에 추가해주세요.</p>
        </div>
      )}
      {item.rewriteExample && (
        <div className="priority-card__rewrite">
          <span>추천 구조: 무엇을 → 어떻게 → 어떤 결과</span>
          <p>{item.rewriteExample}</p>
        </div>
      )}
    </article>
  );
}

function ResumeHistorySection({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <article className="card essay-history-card">
      <h3 className="job-detail__section">이력서 첨삭 이력</h3>
      <ul className="essay-history-list">
        {history.map((item) => (
          <li key={item.id}>
            <span className="essay-history-score">{item.overallScore}점</span>
            <span className="essay-history-label">{item.fileName || item.targetLabel || '일반 첨삭'}</span>
            <span className="essay-history-date">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// 이력서 첨삭 — PDF/DOCX 업로드(또는 직접 작성한 텍스트를 .txt로 감싸서) →
// career-backend ResumeReviewService가 텍스트를 뽑아 AI로 분석한다. HWP는
// career-backend가 명확한 안내 메시지로 거절한다(오픈소스 파서가 부실해서 이번
// 단계는 제외 — career-backend/README 참고).
const RESUME_FILE_EXTENSIONS = ['.pdf', '.docx'];

function ResumeReviewPanel({ target }) {
  const { pushToast } = useCareer();
  const [file, setFile] = useState(null);
  const [writing, setWriting] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getResumeHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const pickFile = () => fileInputRef.current?.click();

  // 파일 입력(input)이랑 드래그앤드롭 둘 다 여기로 모인다 — 확장자는 career-backend
  // ResumeReviewService가 실제로 파싱 가능한 PDF/DOCX만(HWP 등은 서버가 어차피
  // 명확히 거절하지만, 드롭은 input의 accept 필터를 안 타서 여기서 먼저 걸러준다).
  const applyFile = (picked) => {
    if (!picked) return;
    const name = picked.name.toLowerCase();
    if (!RESUME_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      pushToast('⚠ PDF 또는 DOCX 파일만 지원해요.');
      return;
    }
    setFile(picked);
    setWriting(false);
    setResumeText('');
  };

  const onFileChange = (e) => applyFile(e.target.files?.[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e) => {
    e.preventDefault(); // 안 해주면 브라우저가 드롭 자체를 안 받아줌
    setDragOver(true);
  };

  const startWriting = () => {
    setWriting(true);
    setFile(null);
  };

  const displayName = file?.name || (writing ? '직접 작성한 이력서' : null);

  const handleSubmit = async () => {
    const upload = writing
      ? (resumeText.trim() ? new File([resumeText], 'resume.txt', { type: 'text/plain' }) : null)
      : file;
    if (!upload) {
      pushToast(writing ? '⚠ 이력서 내용을 입력해주세요.' : '⚠ 이력서 파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await reviewResume(upload, target);
      setResult(res);
      if (res.growth?.expGained > 0) pushToast(`🎯 이력서 첨삭 완료! +${res.growth.expGained} EXP`);
      if (res.growth?.leveledUp) pushToast(`🎉 Lv.${res.growth.fromLevel} → Lv.${res.growth.toLevel}`);
      getResumeHistory().then(setHistory).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '이력서 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <article className="card resume-upload-card">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx" hidden onChange={onFileChange} />

        {!writing && (
          <div
            className={`resume-dropzone ${dragOver ? 'is-drag-over' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <span className="resume-dropzone__icon">📄</span>
            {displayName ? (
              <strong>{displayName}</strong>
            ) : (
              <>
                <strong>{dragOver ? '여기에 놓아주세요' : '이력서를 드래그하거나 업로드해주세요'}</strong>
                <p>PDF, DOCX 파일을 지원합니다.</p>
              </>
            )}
            <button type="button" className="resume-dropzone__btn" onClick={pickFile}>
              {displayName ? '다른 파일 선택' : '파일 선택'}
            </button>
          </div>
        )}

        {writing ? (
          <div className="essay-field">
            <div className="resume-write-field-head">
              <label htmlFor="resume-text">이력서 본문</label>
              <button type="button" className="resume-back-to-upload-btn" onClick={() => setWriting(false)}>📄 파일 업로드로 전환</button>
            </div>
            <textarea
              id="resume-text"
              rows={10}
              placeholder="이력서 내용을 붙여넣거나 직접 작성해주세요."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="resume-upload-divider"><span>또는</span></div>
            <button type="button" className="resume-write-btn" onClick={startWriting}>직접 이력서 작성하기</button>
          </>
        )}

        <button className="essay-submit-btn resume-analyze-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? '분석 중...' : '✨ AI 이력서 분석하기'}
        </button>
        {error && <p className="essay-error">{error}</p>}
      </article>

      <article className="card how-it-works-card">
        <h2>AI 분석 항목</h2>
        <ul className="resume-analysis-list">
          {RESUME_ANALYSIS_ITEMS.map((item) => <li key={item}>✔ {item}</li>)}
        </ul>
        <div className="how-it-works-tip">
          <span>💡 TIP</span>
          <p>채용공고를 연동하면 직무 기준으로 더 정확한 분석을 받을 수 있어요!</p>
        </div>
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

          <div className="divider" />

          <h3 className="job-detail__section">평가 항목별 점수</h3>
          <ResumeScoreTable sections={result.sections} jobFitScore={result.jobFitScore} jobFitReason={result.jobFitReason} />

          <h3 className="job-detail__section">이력서 구조 분석</h3>
          <div className="resume-section-list">
            {result.sections?.map((s) => <ResumeSectionCard key={s.name} section={s} />)}
          </div>

          {result.excerptReviews?.length > 0 && (
            <>
              <h3 className="job-detail__section">원문 첨삭</h3>
              <div className="excerpt-review-list">
                {result.excerptReviews.map((r, i) => <ExcerptReviewCard key={i} review={r} />)}
              </div>
            </>
          )}

          {result.missingKeywords?.length > 0 && (
            <>
              <h3 className="job-detail__section">부족한 키워드</h3>
              <div className="keyword-card-list">
                {result.missingKeywords.map((kw) => <MissingKeywordCard key={kw.keyword} kw={kw} />)}
              </div>
            </>
          )}

          {result.priorityImprovements?.length > 0 && (
            <>
              <h3 className="job-detail__section">우선순위별 개선 제안</h3>
              <div className="priority-card-list">
                {[...result.priorityImprovements].sort((a, b) => a.priority - b.priority).map((item, i) => <PriorityImprovementCard key={i} item={item} />)}
              </div>
            </>
          )}
        </article>
      )}

      <ResumeHistorySection history={history} />
    </>
  );
}

export default function EssayReview({ navigate }) {
  const { pushToast } = useCareer();
  const [activeTab, setActiveTab] = useState('ESSAY'); // ESSAY | RESUME
  const [question, setQuestion] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);
  const historyRef = useRef(null);

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

  const scrollToHistory = () => historyRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <AppShell activePath="/essay" navigate={navigate} title="이력서 · 자소서 첨삭" subtitle="AI가 당신의 강점을 발견하고, 더 설득력 있는 지원서로 완성해 드립니다.">
      <div className="essay-page-actions">
        <button type="button" className="essay-history-btn" onClick={scrollToHistory}>◷ 첨삭 히스토리</button>
      </div>

      <TargetBanner target={target} onPick={setTarget} onClear={() => setTarget(null)} />

      <div className="essay-tab-switcher">
        <button type="button" className={activeTab === 'ESSAY' ? 'is-active' : ''} onClick={() => setActiveTab('ESSAY')}>
          ✎ 자기소개서 첨삭
        </button>
        <button type="button" className={activeTab === 'RESUME' ? 'is-active' : ''} onClick={() => setActiveTab('RESUME')}>
          📋 이력서 첨삭
        </button>
      </div>

      <div className="essay-tab-grid">
        {activeTab === 'ESSAY' ? (
          <>
            <article className="card essay-form-card">
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

            <HowItWorksCard
              steps={ESSAY_STEPS}
              tip="채용공고를 연동하면 직무 역량과 기업 인재상을 반영한 더 정확한 첨삭을 받을 수 있어요!"
            />
          </>
        ) : (
          <ResumeReviewPanel target={target} />
        )}
      </div>

      {activeTab === 'ESSAY' && result && (
        <article className="card essay-result-card">
          <div className="essay-score">
            <div className="essay-score__ring" style={{ '--pct': result.overallScore }}>
              <strong>{result.overallScore}</strong>
              <span>/ 100</span>
            </div>
            <p className="essay-summary">{result.summary}</p>
          </div>

          {result.targetFitScore != null && (
            <>
              <div className="target-fit-meter">
                <span>🎯 지원 대상 적합도</span>
                <div className="progress"><i style={{ width: `${result.targetFitScore}%` }} /></div>
                <b>{result.targetFitScore}점</b>
              </div>
              {result.targetFitComment && <p className="target-fit-comment">{result.targetFitComment}</p>}
            </>
          )}

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

      {activeTab === 'ESSAY' && <HistorySection historyRef={historyRef} history={history} />}
    </AppShell>
  );
}
