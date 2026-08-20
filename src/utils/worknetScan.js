import { getWorknetXml } from '../api/career.js';
import { parseWorknetList } from './worknetXml.js';

// Full-scan of 공채속보(NEWS) postings. work24's NEWS list has no real
// "search by company" param — its only text filter (`keyword`) matches
// against the posting TITLE, not the company name, and a company name
// almost never appears verbatim in a title (confirmed against the live
// API: searching keyword="카카오모빌리티", a company with real open
// postings, returns 0 — see pages/CompanyAnalysis.jsx's original note).
// `empBusiNm` isn't a real filter either — passing it is silently ignored.
//
// What IS reliable: every item in the plain (keyword-less) list carries its
// own accurate title AND company name. So both 기업분석's "관련 채용공고"
// and 취업공고's 공채속보 탭 기업명 검색 pull every page up to MAX_NEWS_PAGES
// and filter client-side instead of trusting the API to do it.
const MAX_NEWS_PAGES = 60; // safety cap, not a "recent window" — 600 postings

export async function scanAllNewsPostings() {
  const firstXml = await getWorknetXml({ type: 'NEWS', callTp: 'L', startPage: 1 });
  const first = parseWorknetList(firstXml, 'NEWS');
  if (!first) return { items: [], scanned: 0, scannedAll: true };

  const totalPages = Math.ceil(first.total / 10);
  const pagesToFetch = Math.min(totalPages, MAX_NEWS_PAGES);

  const rest = await Promise.all(
    Array.from({ length: pagesToFetch - 1 }, (_, i) =>
      getWorknetXml({ type: 'NEWS', callTp: 'L', startPage: i + 2 }).then((xml) => parseWorknetList(xml, 'NEWS'))
    )
  );

  const items = [first, ...rest].flatMap((p) => p?.items || []);
  return { items, scanned: items.length, scannedAll: pagesToFetch >= totalPages };
}
