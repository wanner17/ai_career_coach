import { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import JobCard from '../components/jobs/JobCard.jsx';
import JobDetail from '../components/jobs/JobDetail.jsx';
import Pagination from '../components/jobs/Pagination.jsx';
import { getWorknetXml } from '../api/career.js';
import { parseWorknetDetail, parseWorknetList } from '../utils/worknetXml.js';
import { scanAllNewsPostings } from '../utils/worknetScan.js';
import { idParamsFor } from '../utils/worknetParams.js';
import { useCareer } from '../context/CareerContext.jsx';

const FAVORITES_KEY = 'careermate_favorite_companies_v1';
const ANALYSIS_QUEST_TITLE = '기업분석 1회 완료';

async function findRelatedNews(coNm) {
  const { items, scanned, scannedAll } = await scanAllNewsPostings();
  return { items: items.filter((item) => item.company === coNm), scanned, scannedAll };
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 기업분석 — work24 공채기업정보(COMPANY) 검색·상세 + 그 기업의 관련 채용공고
// (NEWS, 기업명 best-effort 검색) + 관심기업 등록. 목록/상세 렌더링은
// pages/Jobs.jsx와 같은 컴포넌트(JobCard/JobDetail)를 그대로 재사용한다.
export default function CompanyAnalysis({ navigate }) {
  const { quests, requestCompleteQuest, pushToast } = useCareer();

  const [favorites, setFavorites] = useState(loadFavorites);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null); // { empCoNo, company } | null
  const [relatedNews, setRelatedNews] = useState(null); // 회사 상세와 따로 늦게 채워짐 — 전체 스캔이라 오래 걸림
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [newsDetail, setNewsDetail] = useState(null); // 관련 채용공고를 눌렀을 때 그 공고 하나의 상세 — 뒤로가기는 회사 상세로 돌아감
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (!keyword) { setList(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWorknetXml({ type: 'COMPANY', callTp: 'L', keyword, startPage: page })
      .then((xml) => { if (!cancelled) setList(parseWorknetList(xml, 'COMPANY')); })
      .catch(() => { if (!cancelled) setError('기업 정보를 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [keyword, page]);

  const handleSearch = () => {
    setDetail(null);
    setNewsDetail(null);
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  // 회사 정보(빠름, 조회 1건)와 관련 채용공고(느림, 공채속보 전체 스캔 —
  // see utils/worknetScan.js)를 한 Promise.all로 묶으면 화면 전체가 스캔이
  // 끝날 때까지 안 뜬다. 회사 정보부터 먼저 그리고, 관련 채용공고는 그 뒤에
  // 따로 불러와서 그 섹션만 자기 로딩 상태를 갖는다.
  const openDetail = async (empCoNo, coNm) => {
    setLoading(true);
    setError(null);
    setNewsDetail(null);
    setRelatedNews(null);
    try {
      const companyXml = await getWorknetXml({ type: 'COMPANY', callTp: 'D', empCoNo });
      setDetail({ empCoNo, company: parseWorknetDetail(companyXml, 'COMPANY') });
      window.scrollTo(0, 0);
    } catch {
      setError('기업 상세 정보를 불러오지 못했습니다.');
      setLoading(false);
      return;
    }
    setLoading(false);

    setRelatedLoading(true);
    try {
      setRelatedNews(await findRelatedNews(coNm));
    } catch {
      setRelatedNews({ items: [], scanned: 0, scannedAll: true });
    } finally {
      setRelatedLoading(false);
    }
  };

  // 관련 채용공고 카드를 누르면 그 공고 자체의 상세(취업공고 · 공채속보와
  // 같은 JobDetail)를 보여준다 — 뒤로가기는 검색 목록이 아니라 지금 보던
  // 회사 상세로 돌아간다.
  const openNewsDetail = async (item) => {
    setLoading(true);
    setError(null);
    try {
      const xml = await getWorknetXml({ type: 'NEWS', callTp: 'D', ...idParamsFor('NEWS', item) });
      setNewsDetail(parseWorknetDetail(xml, 'NEWS'));
      window.scrollTo(0, 0);
    } catch {
      setError('채용공고 상세 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (empCoNo) => favorites.some((f) => f.empCoNo === empCoNo);

  const toggleFavorite = () => {
    if (!detail) return;
    const { empCoNo, company } = detail;
    if (isFavorite(empCoNo)) {
      setFavorites((prev) => prev.filter((f) => f.empCoNo !== empCoNo));
      return;
    }
    setFavorites((prev) => [...prev, { empCoNo, coNm: company.title }]);
    pushToast(`⭐ ${company.title} 관심기업으로 등록했어요.`);

    const analysisQuest = quests.find((q) => q.title === ANALYSIS_QUEST_TITLE);
    if (analysisQuest && !analysisQuest.completed) requestCompleteQuest(analysisQuest);
  };

  const totalPages = list ? Math.max(1, Math.ceil(list.total / 10)) : 1;

  return (
    <AppShell activePath="/company" navigate={navigate} title="기업분석" subtitle="관심 있는 기업을 검색하고 채용정보를 함께 확인해보세요.">
      {!detail && favorites.length > 0 && (
        <div className="fav-company-row">
          <span className="fav-company-row__label">⭐ 관심기업</span>
          {favorites.map((f) => (
            <button key={f.empCoNo} className="fav-company-chip" onClick={() => openDetail(f.empCoNo, f.coNm)}>
              {f.coNm}
            </button>
          ))}
        </div>
      )}

      {!detail && (
        <div className="jobs-toolbar">
          <input
            className="jobs-search-input"
            placeholder="기업명을 입력하세요 (예: 삼성, 카카오)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="jobs-search-btn" onClick={handleSearch}>검색</button>
        </div>
      )}

      <article className="card jobs-panel">
        {loading && <p className="jobs-loading">불러오는 중...</p>}
        {!loading && error && <p className="jobs-empty">{error}</p>}

        {!loading && !error && newsDetail && (
          <JobDetail type="NEWS" detail={newsDetail} onBack={() => setNewsDetail(null)} backLabel="◀ 뒤로가기" />
        )}

        {!loading && !error && !newsDetail && detail && (
          <>
            <JobDetail
              type="COMPANY"
              detail={detail.company}
              onBack={() => setDetail(null)}
              headerExtra={(
                <button className={`fav-toggle-btn ${isFavorite(detail.empCoNo) ? 'is-active' : ''}`} onClick={toggleFavorite}>
                  {isFavorite(detail.empCoNo) ? '★ 관심기업' : '☆ 관심기업 등록'}
                </button>
              )}
            />
            <h3 className="job-detail__section">관련 채용공고</h3>
            {relatedLoading && <p className="jobs-loading">관련 채용공고를 찾는 중...</p>}
            {!relatedLoading && relatedNews && relatedNews.items.length > 0 && (
              <div className="jobs-list">
                {relatedNews.items.map((item) => (
                  <JobCard key={item.key} type="NEWS" item={item} onClick={() => openNewsDetail(item)} />
                ))}
              </div>
            )}
            {!relatedLoading && relatedNews && relatedNews.items.length === 0 && (
              <p className="jobs-empty">현재 올라온 채용공고가 없어요 ㅠ.ㅠ</p>
            )}
          </>
        )}

        {!loading && !error && !detail && !keyword && (
          <div className="jobs-empty-box">
            <span className="jobs-empty-icon">🏢</span>
            <strong>기업명을 검색해보세요.</strong>
            {/* <p>work24 공채기업정보에서 기업 소개·복리후생·연혁을 확인할 수 있어요.</p> */}
          </div>
        )}

        {!loading && !error && !detail && keyword && list && (
          <>
            <div className="jobs-total">전체 <b>{list.total.toLocaleString()}</b>건</div>
            {list.items.length === 0 && (
              <div className="jobs-empty-box">
                <span className="jobs-empty-icon">🔍</span>
                <strong>검색 결과가 없습니다.</strong>
                <p>다른 검색어로 다시 시도해보세요.</p>
              </div>
            )}
            <div className="jobs-list">
              {list.items.map((item) => (
                <JobCard key={item.key} type="COMPANY" item={item} onClick={() => openDetail(item.empCoNo, item.title)} />
              ))}
            </div>
            {list.total > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
          </>
        )}
      </article>
    </AppShell>
  );
}
