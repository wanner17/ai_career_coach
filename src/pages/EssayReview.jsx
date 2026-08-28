import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import Modal from '../components/common/Modal.jsx';
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
const IMPACT_LABEL = { HIGH: '영향도 높음', MEDIUM: '영향도 중간', LOW: '영향도 낮음' };

// 종합점수를 학점 스타일 등급으로 — 또래 백분위(실제 비교 데이터가 없음) 대신
// 점수 구간만으로 정하는 순수 파생값이라 서버 데이터 없이 프론트에서 바로 계산한다.
function gradeForScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  return 'D';
}

function findSection(sections, name) {
  return sections?.find((s) => s.name === name);
}

// 의존성 없는 손그림 레이더 차트 — N각형 그리드 + 데이터 폴리곤. axes: [{label, value(0~100)}].
// 기존(220px) 대비 1.36배 키움 + 각 축 라벨 옆에 점수도 같이 표시.
function RadarChart({ axes }) {
  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 46;
  const n = axes.length;
  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointAt = (i, ratio) => {
    const a = angleFor(i);
    return [center + Math.cos(a) * radius * ratio, center + Math.sin(a) * radius * ratio];
  };
  const dataPoints = axes.map((ax, i) => pointAt(i, Math.max(0, Math.min(100, ax.value || 0)) / 100));
  const dataPath = `${dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}Z`;

  return (
    <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon key={lvl} points={axes.map((_, i) => pointAt(i, lvl).join(',')).join(' ')} className="radar-chart__grid" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pointAt(i, 1);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} className="radar-chart__axis" />;
      })}
      <path d={dataPath} className="radar-chart__area" />
      {dataPoints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} className="radar-chart__dot" />)}
      {axes.map((ax, i) => {
        const [x, y] = pointAt(i, 1.22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-chart__label">
            <tspan x={x} dy="-0.35em">{ax.label}</tspan>
            <tspan x={x} dy="1.15em" className="radar-chart__label-score">{Math.round(ax.value || 0)}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

// AI 분석 대시보드 — 종합점수 + 직무매칭/키워드충족/등급 + 레이더차트 + 강점TOP3 +
// 가장 시급한 개선 콜아웃을 한 카드에. 또래 비교(동일 직무 평균/백분위)는 일부러
// 뺐다 — 지금 비교할 실제 데이터가 없어서 지어낸 숫자를 보여주는 게 되기 때문.
function ResumeDashboardCard({ result }) {
  const radarAxes = [
    { label: '직무적합도', value: result.jobFitScore ?? findSection(result.sections, '경력/프로젝트')?.score },
    { label: '경력/프로젝트', value: findSection(result.sections, '경력/프로젝트')?.score },
    { label: '성과구체성', value: findSection(result.sections, '성과구체성')?.score },
    { label: '기술경쟁력', value: findSection(result.sections, '기술경쟁력')?.score },
    { label: '정보완성도', value: findSection(result.sections, '정보완성도')?.score },
    { label: '자기소개', value: findSection(result.sections, '자기소개')?.score },
  ];
  const keywordPct = result.totalKeywordCount > 0 ? Math.round((result.matchedKeywordCount / result.totalKeywordCount) * 100) : null;

  return (
    <article className="card resume-dashboard-card">
      <h2>AI 분석 대시보드</h2>
      <div className="resume-dashboard-grid">
        <div className="resume-dashboard-score">
          <div className="essay-score__ring" style={{ '--pct': result.overallScore }}>
            <strong>{result.overallScore}</strong>
            <span>/ 100</span>
          </div>
        </div>

        <div className="resume-dashboard-mid">
          <div className="resume-stat-row">
            <div className="resume-stat-chip">
              <span>직무 매칭도</span>
              {result.jobFitScore != null
                ? <strong>{result.jobFitScore}%</strong>
                : <strong className="is-muted">미연동</strong>}
            </div>
            <div className="resume-stat-chip">
              <span>핵심 키워드</span>
              {keywordPct != null
                ? <><strong>{result.matchedKeywordCount} / {result.totalKeywordCount}</strong><small>충족률 {keywordPct}%</small></>
                : <strong className="is-muted">미연동</strong>}
            </div>
            <div className="resume-stat-chip">
              <span>서류등급</span>
              <strong>{gradeForScore(result.overallScore)}</strong>
            </div>
          </div>
          <RadarChart axes={radarAxes} />
        </div>

        <div className="resume-dashboard-side">
          {result.strengths?.length > 0 && (
            <div className="resume-strengths">
              <h3>강점 TOP 3</h3>
              <ol>{result.strengths.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
            </div>
          )}
          {result.topImprovementSummary && (
            <div className="resume-top-improvement">
              <span>🎯 가장 먼저 개선할 부분</span>
              <p>{result.topImprovementSummary}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// 90점 이상은 기존 primary(보라/블루 계열), 70~89점은 blue, 70점 미만은 orange —
// 서비스 기본 컬러 톤 안에서 이미 쓰던 토큰만 재사용(새 색 도입 안 함).
function barColorFor(score) {
  if (score >= 90) return 'var(--career-primary)';
  if (score >= 70) return 'var(--career-blue)';
  return 'var(--career-orange)';
}

// 세부 평가 — 항목명/막대바/점수/한 줄 설명. gap(감점 이유)이 없으면 evidence로 대체
// (점수가 높아 딱히 감점 사유가 없는 항목도 한 줄은 항상 보이게 — 백엔드도 "없음"류
// 빈 문구 대신 항상 의미 있는 한 줄을 주도록 프롬프트에 명시돼 있음).
function SectionBarRow({ section }) {
  return (
    <div className="section-bar-row">
      <span className="section-bar-row__name">{section.name}</span>
      <div className="bar"><span style={{ width: `${section.score}%`, background: barColorFor(section.score) }} /></div>
      <b className="section-bar-row__score">{section.score}</b>
      <span className="section-bar-row__desc">{section.gap || section.evidence}</span>
    </div>
  );
}

// 문장별 정밀 첨삭 — 원문(그대로 인용) | 문제점 | 개선 예시 3열. AI가 없는 성과/수치를
// 지어내지 않는다는 전제로 만들어짐 (ResumeReviewService 참고).
function ExcerptReviewCard({ review }) {
  return (
    <article className="excerpt-review-row">
      <span className="excerpt-review-row__tag">{review.section}</span>
      <div className="excerpt-review-row__grid">
        <div className="excerpt-review-row__col">
          <span>원문</span>
          <blockquote>“{review.originalText}”</blockquote>
        </div>
        <div className="excerpt-review-row__col">
          <span>문제점</span>
          <p>{review.issue}</p>
        </div>
        <div className="excerpt-review-row__col is-improved">
          <span>💡 개선 예시</span>
          <p>{review.improvedExample}</p>
          {review.note && <small>{review.note}</small>}
          {review.requiresUserFact && <span className="user-fact-badge">⚠ 실제 경험 확인 필요</span>}
        </div>
      </div>
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
        <span className="priority-card__rank">{item.priority}순위</span>
        <strong>{item.title}</strong>
        {item.impactLevel && (
          <span className={`priority-card__impact is-${item.impactLevel.toLowerCase()}`}>
            {IMPACT_LABEL[item.impactLevel] || item.impactLevel}
          </span>
        )}
      </div>
      <p className="priority-card__diagnosis">{item.diagnosis}</p>
      <div className="priority-card__meta">
        {item.relatedExperienceOptions?.length > 0 && <span>✓ 보완 가능한 경험 {item.relatedExperienceOptions.length}개</span>}
        {item.expectedScoreGain && <span>✓ 예상 개선 효과 {item.expectedScoreGain}</span>}
        {item.recommendedAreas?.length > 0 && <span>✓ 추천 항목 {item.recommendedAreas.join(', ')}</span>}
      </div>
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
          {item.note && <small>{item.note}</small>}
          {item.requiresUserFact && <span className="user-fact-badge">⚠ 수치를 확인한 후 사용해주세요</span>}
        </div>
      )}
    </article>
  );
}

// AI 첨삭 적용 예상 — 지금 점수 + priorityImprovements를 다 반영했다고 가정한 추정치.
// "적용 예상"이라고 항상 같이 표기 — 확정된 결과가 아니라 추정임을 분명히 한다.
function ProjectedRow({ item }) {
  const gain = Math.max(0, item.after - item.before);
  return (
    <div className="projected-row">
      <span className="projected-row__label">{item.label}</span>
      <div className="projected-row__track">
        <i className="projected-row__before" style={{ width: `${item.before}%` }} />
        <i className="projected-row__gain" style={{ left: `${item.before}%`, width: `${gain}%` }} />
      </div>
      <span className="projected-row__nums">{item.before} → <b>{item.after}</b></span>
    </div>
  );
}

// 카드 제목 줄을 눌러서 접고 펼 수 있게 — 세부평가/우선개선/문장별첨삭/적용예상처럼
// 내용이 긴 섹션들의 체감 페이지 길이를 줄인다. 기본은 펼친 상태(defaultOpen)라
// 처음 보이는 정보가 줄어들진 않는다.
function CollapsibleCard({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <article className="card resume-detail-card">
      <button type="button" className="resume-detail-card__toggle" onClick={() => setOpen((o) => !o)}>
        <h2>{title}</h2>
        <span className={`resume-detail-card__chevron ${open ? 'is-open' : ''}`}>▾</span>
      </button>
      {open && <div className="resume-detail-card__body">{children}</div>}
    </article>
  );
}

// 상단 "첨삭 히스토리" 버튼으로 여는 우측 Drawer — 하단에 따로 목록을 또 보여주던
// 것(중복)을 대체한다. 항목 클릭하면 그 과거 분석 결과를 그대로 다시 볼 수 있게
// onSelect로 result를 채워준다 — v3에서 새로 생긴 필드(강점/예상점수/원문 등)는
// DB에 저장 안 해서(ResumeReviewService#persist 참고) 과거 기록엔 없을 수 있는데,
// 각 섹션이 데이터 없으면 알아서 숨어서 화면이 깨지진 않는다.
function ResumeHistoryDrawer({ open, history, onClose, onSelect }) {
  if (!open) return null;
  return (
    <div className="history-drawer-overlay" onClick={onClose}>
      <aside className="history-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="history-drawer__head">
          <h2>첨삭 히스토리</h2>
          <button type="button" className="history-drawer__close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="history-drawer__list">
          {(!history || history.length === 0) && <p className="jobs-empty">아직 첨삭 이력이 없습니다.</p>}
          {history?.map((item) => (
            <button type="button" key={item.id} className="history-drawer__item" onClick={() => onSelect(item)}>
              <span className="history-drawer__date">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
              <strong>{item.fileName || item.targetLabel || '일반 첨삭'}</strong>
              <span className="history-drawer__score">{item.overallScore}점</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

// 이력서 첨삭 — PDF/DOCX 업로드(또는 직접 작성한 텍스트를 .txt로 감싸서) →
// career-backend ResumeReviewService가 텍스트를 뽑아 AI로 분석한다. HWP는
// career-backend가 명확한 안내 메시지로 거절한다(오픈소스 파서가 부실해서 이번
// 단계는 제외 — career-backend/README 참고).
const RESUME_FILE_EXTENSIONS = ['.pdf', '.docx'];

function ResumeReviewPanel({ target, historyOpen, onCloseHistory }) {
  const { pushToast } = useCareer();
  const [file, setFile] = useState(null);
  const [writing, setWriting] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [result, setResult] = useState(null);
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [showFullText, setShowFullText] = useState(false);
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

  // 파일 선택/작성 취소 — 드롭존을 빈 상태로 되돌림. input의 value도 비워야
  // 같은 파일을 다시 골라도 onChange가 다시 뜬다(브라우저가 "같은 파일"이면
  // change 이벤트를 안 쏘는 문제 방지).
  const removeFile = () => {
    setFile(null);
    setResumeText('');
    setWriting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 분석 결과까지 나온 뒤 "삭제하고 다시 올리기" — 업로드 화면으로 완전히 되돌림.
  const removeUpload = () => {
    removeFile();
    setResult(null);
    setAnalyzedAt(null);
    setError(null);
  };

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
      setAnalyzedAt(new Date());
      if (res.growth?.expGained > 0) pushToast(`🎯 이력서 첨삭 완료! +${res.growth.expGained} EXP`);
      if (res.growth?.leveledUp) pushToast(`🎉 Lv.${res.growth.fromLevel} → Lv.${res.growth.toLevel}`);
      getResumeHistory().then(setHistory).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '이력서 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const reanalyze = () => handleSubmit();

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx" hidden onChange={onFileChange} />

      {!result && (
        <>
          <article className="card resume-upload-card">
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
                <div className="resume-dropzone__actions">
                  <button type="button" className="resume-dropzone__btn" onClick={pickFile}>
                    {displayName ? '다른 파일 선택' : '파일 선택'}
                  </button>
                  {file && (
                    <button type="button" className="resume-dropzone__remove" onClick={removeFile}>✕ 삭제</button>
                  )}
                </div>
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
        </>
      )}

      {result && (
        <div className="resume-dashboard-wrap">
          <article className="card resume-text-bar">
            <span className="resume-text-bar__icon">📄</span>
            <div className="resume-text-bar__body">
              <strong>이력서 본문</strong>
              <p>{(result.resumeText || '').replace(/\s+/g, ' ').trim().slice(0, 90)}{result.resumeText?.length > 90 ? '…' : ''}</p>
            </div>
            <button type="button" className="resume-text-bar__link" onClick={() => setShowFullText(true)}>본문 전체 보기 ↗</button>
            <button className="essay-submit-btn resume-text-bar__analyze" onClick={reanalyze} disabled={loading}>
              {loading ? '분석 중...' : '✨ AI 이력서 분석하기'}
            </button>
            <button type="button" className="resume-text-bar__remove" onClick={removeUpload} disabled={loading}>🗑 삭제</button>
            {analyzedAt && (
              <span className="resume-text-bar__meta">
                ✓ 분석 완료 · {analyzedAt.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {error && <p className="essay-error">{error}</p>}
          </article>

          {showFullText && (
            <Modal onClose={() => setShowFullText(false)} boxClassName="resume-fulltext-modal">
              <h3>이력서 본문</h3>
              <pre className="resume-fulltext-modal__text">{result.resumeText}</pre>
            </Modal>
          )}

          <ResumeDashboardCard result={result} />

          <div className="resume-detail-row">
            <CollapsibleCard title="세부 평가">
              <div className="resume-section-bar-list">
                {result.sections?.map((s) => <SectionBarRow key={s.name} section={s} />)}
              </div>
            </CollapsibleCard>

            {result.priorityImprovements?.length > 0 && (
              <CollapsibleCard title="우선 개선 과제">
                <div className="priority-card-list">
                  {[...result.priorityImprovements].sort((a, b) => a.priority - b.priority).map((item, i) => <PriorityImprovementCard key={i} item={item} />)}
                </div>
              </CollapsibleCard>
            )}
          </div>

          {result.excerptReviews?.length > 0 && (
            <CollapsibleCard title="문장별 정밀 첨삭">
              <div className="excerpt-review-list">
                {result.excerptReviews.map((r, i) => <ExcerptReviewCard key={i} review={r} />)}
              </div>
            </CollapsibleCard>
          )}

          {result.missingKeywords?.length > 0 && (
            <CollapsibleCard title="부족한 키워드">
              <div className="keyword-card-list">
                {result.missingKeywords.map((kw) => <MissingKeywordCard key={kw.keyword} kw={kw} />)}
              </div>
            </CollapsibleCard>
          )}

          {result.projectedImprovements?.length > 0 && (
            <CollapsibleCard title="AI 첨삭 적용 예상">
              <div className="projected-row-list">
                {result.projectedImprovements.map((p, i) => <ProjectedRow key={i} item={p} />)}
              </div>
              <p className="resume-projected-note">※ AI가 제안한 첨삭을 모두 반영했을 때의 예상 결과입니다. 실제 합격 확률이 아니라 서비스 내부 평가 기준상의 예상 개선치입니다.</p>
            </CollapsibleCard>
          )}
        </div>
      )}

      <ResumeHistoryDrawer
        open={historyOpen}
        history={history}
        onClose={onCloseHistory}
        onSelect={(item) => {
          setResult({
            overallScore: item.overallScore,
            summary: item.summary,
            jobFitScore: item.jobFitScore,
            sections: item.sections,
            excerptReviews: item.excerptReviews,
            missingKeywords: item.missingKeywords,
            priorityImprovements: item.priorityImprovements,
            // v3에서 새로 생긴 필드(강점/적용예상/키워드 카운트/원문)는 히스토리엔 없음 — 아래
            // 참고, 해당 UI 블록들은 데이터 없으면 그냥 안 보일 뿐 깨지지 않는다.
          });
          setAnalyzedAt(new Date(item.createdAt));
          onCloseHistory();
        }}
      />
    </>
  );
}

// 자소서 첨삭 결과 한 건 — 여러 문항 올릴 때 문항마다 이 몸통을 반복해서 씀.
function EssayResultBody({ result }) {
  return (
    <>
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
    </>
  );
}

let essayEntrySeq = 1;
const newEssayEntry = () => ({ id: essayEntrySeq++, question: '', content: '' });

export default function EssayReview({ navigate }) {
  const { pushToast } = useCareer();
  const [activeTab, setActiveTab] = useState('ESSAY'); // ESSAY | RESUME
  // 자소서는 문항이 보통 여러 개(지원동기/성장과정/입사후포부 등)라 한 번에
  // 여러 개 올려서 각각 첨삭받게 함 — entries 배열, id는 순증 카운터(삭제해도
  // key 겹칠 일 없게 index 대신 씀).
  const [entries, setEntries] = useState([newEssayEntry()]);
  const [target, setTarget] = useState(null);
  const [results, setResults] = useState(null); // entries와 같은 순서의 결과 배열
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);
  const [resumeHistoryOpen, setResumeHistoryOpen] = useState(false);
  const historyRef = useRef(null);

  const loadHistory = async () => {
    try {
      setHistory(await getEssayHistory());
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const addEntry = () => setEntries((prev) => [...prev, newEssayEntry()]);
  const removeEntry = (id) => setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  const updateEntry = (id, key, value) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: value } : e)));

  const handleSubmit = async () => {
    const filled = entries.filter((e) => e.content.trim());
    if (filled.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      // 순차 처리 — OpenAI 호출을 한 번에 N개 동시로 쏘지 않고 하나씩, 문항이
      // 많아도 백엔드/API 쪽에 부담 없게. 실패한 문항이 있어도 나머지는 계속.
      const out = [];
      let totalExp = 0;
      for (const entry of filled) {
        try {
          const res = await reviewEssay({ question: entry.question.trim(), content: entry.content.trim(), ...target });
          out.push({ id: entry.id, question: entry.question.trim(), result: res });
          if (res.growth?.expGained > 0) totalExp += res.growth.expGained;
        } catch (err) {
          out.push({ id: entry.id, question: entry.question.trim(), error: err instanceof ApiError ? err.message : '첨삭 요청에 실패했습니다.' });
        }
      }
      setResults(out);
      if (totalExp > 0) pushToast(`🎯 자기소개서 첨삭 완료! +${totalExp} EXP`);
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '첨삭 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 탭마다 "히스토리"의 의미가 다르다 — 자소서는 페이지 하단 점수 추이 그래프로
  // 스크롤, 이력서는 우측 Drawer(ResumeHistoryDrawer)를 연다.
  const openHistory = () => {
    if (activeTab === 'RESUME') {
      setResumeHistoryOpen(true);
      return;
    }
    historyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AppShell activePath="/essay" navigate={navigate} title="이력서 · 자소서 첨삭" subtitle="AI가 당신의 강점을 발견하고, 더 설득력 있는 지원서로 완성해 드립니다.">
      <div className="essay-page-actions">
        <button type="button" className="essay-history-btn" onClick={openHistory}>◷ 첨삭 히스토리</button>
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
              {entries.map((entry, i) => (
                <div className="essay-entry" key={entry.id}>
                  {entries.length > 1 && (
                    <div className="essay-entry__head">
                      <b>문항 {i + 1}</b>
                      <button type="button" className="essay-entry__remove" onClick={() => removeEntry(entry.id)}>✕ 삭제</button>
                    </div>
                  )}
                  <div className="essay-field">
                    <label htmlFor={`essay-question-${entry.id}`}>자기소개서 질문 <span className="essay-field__optional">(선택)</span></label>
                    <input
                      id={`essay-question-${entry.id}`}
                      placeholder="예: 지원 동기를 작성해주세요"
                      value={entry.question}
                      onChange={(e) => updateEntry(entry.id, 'question', e.target.value)}
                    />
                  </div>
                  <div className="essay-field">
                    <label htmlFor={`essay-content-${entry.id}`}>자기소개서 내용</label>
                    <textarea
                      id={`essay-content-${entry.id}`}
                      rows={10}
                      placeholder="첨삭받고 싶은 자기소개서를 붙여넣어주세요."
                      value={entry.content}
                      onChange={(e) => updateEntry(entry.id, 'content', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <button type="button" className="essay-add-entry-btn" onClick={addEntry}>+ 문항 추가</button>

              <button className="essay-submit-btn" onClick={handleSubmit} disabled={loading || entries.every((e) => !e.content.trim())}>
                {loading ? '첨삭 중...' : `✨ AI 첨삭 받기 (${entries.filter((e) => e.content.trim()).length}건)`}
              </button>
              {error && <p className="essay-error">{error}</p>}
            </article>

            <HowItWorksCard
              steps={ESSAY_STEPS}
              tip="채용공고를 연동하면 직무 역량과 기업 인재상을 반영한 더 정확한 첨삭을 받을 수 있어요!"
            />
          </>
        ) : (
          <ResumeReviewPanel
            target={target}
            historyOpen={resumeHistoryOpen}
            onCloseHistory={() => setResumeHistoryOpen(false)}
          />
        )}
      </div>

      {activeTab === 'ESSAY' && results?.map((r, i) => (
        <article className="card essay-result-card" key={r.id}>
          {results.length > 1 && (
            <h3 className="essay-result-card__label">문항 {i + 1}{r.question ? ` — ${r.question}` : ''}</h3>
          )}
          {r.error ? (
            <p className="essay-error">{r.error}</p>
          ) : (
            <EssayResultBody result={r.result} />
          )}
        </article>
      ))}

      {activeTab === 'ESSAY' && <HistorySection historyRef={historyRef} history={history} />}
    </AppShell>
  );
}
