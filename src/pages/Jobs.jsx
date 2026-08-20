import { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import JobCard from '../components/jobs/JobCard.jsx';
import JobDetail from '../components/jobs/JobDetail.jsx';
import Pagination from '../components/jobs/Pagination.jsx';
import { getWorknetXml } from '../api/career.js';
import { parseWorknetDetail, parseWorknetList } from '../utils/worknetXml.js';
import { idParamsFor } from '../utils/worknetParams.js';
import { scanAllNewsPostings } from '../utils/worknetScan.js';

const TABS = [
  { type: 'EVENT', label: '채용행사' },
  { type: 'NEWS', label: '공채속보' },
  { type: 'COMPANY', label: '공채기업정보' },
];

// 취업 공고 — proxies work24.go.kr through career-backend's /worknet endpoint
// (see WorknetService) and renders the same list/detail shape an existing
// JSP+jQuery page did, just as React state instead of innerHTML strings.
export default function Jobs({ navigate }) {
  const [tab, setTab] = useState('EVENT');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [sortOrderBy, setSortOrderBy] = useState('desc');
  const [list, setList] = useState(null); // { total, items }
  const [detail, setDetail] = useState(null); // { params, data } | null — non-null = detail view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 공채속보(NEWS) 검색은 제목뿐 아니라 기업명으로도 걸리게 하고 싶은데,
  // work24 API의 keyword는 공고 제목만 본다 (기업명 파라미터는 없음 — see
  // utils/worknetScan.js). 그래서 검색어가 있을 때는 API 페이지네이션 대신
  // 전체를 훑어서 제목·기업명 둘 다에 대해 프론트에서 직접 필터링한다.
  // 스캔 결과는 키워드가 바뀌기 전까지 캐싱해서, 페이지만 넘길 때는
  // 네트워크 요청 없이 이미 걸러둔 배열만 슬라이스한다.
  const newsSearchCache = useRef({ keyword: null, items: [] });

  const loadNewsSearch = useCallback(async (targetPage) => {
    if (newsSearchCache.current.keyword !== keyword) {
      const { items } = await scanAllNewsPostings();
      const q = keyword.toLowerCase();
      const matched = items.filter((item) => item.title?.toLowerCase().includes(q) || item.company?.toLowerCase().includes(q));
      newsSearchCache.current = { keyword, items: matched };
    }
    const ordered = sortOrderBy === 'asc' ? [...newsSearchCache.current.items].reverse() : newsSearchCache.current.items;
    const start = (targetPage - 1) * 10;
    setList({ total: ordered.length, items: ordered.slice(start, start + 10) });
  }, [keyword, sortOrderBy]);

  const loadList = useCallback(async (targetPage) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'NEWS' && keyword) {
        await loadNewsSearch(targetPage);
      } else {
        const xml = await getWorknetXml({
          type: tab, callTp: 'L', keyword, startPage: targetPage,
          sortOrderBy: tab === 'NEWS' ? sortOrderBy : undefined,
        });
        setList(parseWorknetList(xml, tab));
      }
    } catch {
      setError('채용정보를 불러오지 못했습니다.');
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [tab, keyword, sortOrderBy, loadNewsSearch]);

  useEffect(() => {
    setDetail(null);
    loadList(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, keyword, page, sortOrderBy]);

  const handleTabChange = (type) => {
    if (type === tab) return;
    setTab(type);
    setKeywordInput('');
    setKeyword('');
    setPage(1);
    // Without this, the render right after setTab (but before the effect
    // above runs) pairs the NEW tab's type with the OLD tab's detail shape —
    // e.g. `type="NEWS"` while `detail.data` is still an EVENT object, so
    // JobDetail's NEWS branch reads `detail.selections.length` off a field
    // that doesn't exist on that shape and throws mid-render (blank white
    // page, no error boundary to catch it). Reset it in the same batch.
    setDetail(null);
  };

  const handleSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const openDetail = async (idParams) => {
    setLoading(true);
    setError(null);
    try {
      const xml = await getWorknetXml({ type: tab, callTp: 'D', ...idParams });
      const parsedDetail = parseWorknetDetail(xml, tab);
      setDetail({ data: parsedDetail });
      window.scrollTo(0, 0);
    } catch {
      setError('상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = list ? Math.max(1, Math.ceil(list.total / 10)) : 1;

  return (
    <AppShell activePath="/jobs" navigate={navigate} title="취업 공고" subtitle="work24 채용행사·공채속보·공채기업정보를 한곳에서 확인해보세요.">
      <div className="quest-category-tabs">
        {TABS.map((t) => (
          <button key={t.type} className={`quest-category-tab ${tab === t.type ? 'is-active' : ''}`} onClick={() => handleTabChange(t.type)}>
            {t.label}
          </button>
        ))}
      </div>

      {!detail && (
        <div className="jobs-toolbar">
          <input
            className="jobs-search-input"
            placeholder={tab === 'NEWS' ? '공고 제목 또는 기업명으로 검색' : '검색어를 입력하세요'}
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="jobs-search-btn" onClick={handleSearch}>검색</button>
          {tab === 'NEWS' && (
            <select className="jobs-sort-select" value={sortOrderBy} onChange={(e) => { setPage(1); setSortOrderBy(e.target.value); }}>
              <option value="desc">최신순</option>
              <option value="asc">오래된순</option>
            </select>
          )}
        </div>
      )}

      <article className="card jobs-panel">
        {loading && <p className="jobs-loading">불러오는 중...</p>}
        {!loading && error && <p className="jobs-empty">{error}</p>}

        {!loading && !error && detail && (
          <JobDetail type={tab} detail={detail.data} onBack={() => setDetail(null)} />
        )}

        {!loading && !error && !detail && list && (
          <>
            <div className="jobs-total">전체 <b>{list.total.toLocaleString()}</b>건</div>
            {list.items.length === 0 && (
              <div className="jobs-empty-box">
                <span className="jobs-empty-icon">🔍</span>
                <strong>검색 결과가 없습니다.</strong>
                <p>검색어를 확인하거나 다른 탭을 선택해보세요.</p>
              </div>
            )}
            <div className="jobs-list">
              {list.items.map((item) => (
                <JobCard key={item.key} type={tab} item={item} onClick={() => openDetail(idParamsFor(tab, item))} />
              ))}
            </div>
            {list.total > 0 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </article>
    </AppShell>
  );
}
