// Parses work24.go.kr's Open API XML (채용행사/공채속보/공채기업정보) into plain
// JS data — Jobs.jsx renders it as JSX instead of the original JSP page's
// innerHTML-string building, but the field names/tag shapes below are
// unchanged from that original so this is a faithful, checkable port, not a
// rewrite from the API docs.
function parseXml(xmlText) {
  const cleaned = (xmlText || '').trim().replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, '&amp;');
  const doc = new DOMParser().parseFromString(cleaned, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  return doc;
}

function getVal(parent, tag) {
  if (!parent) return '';
  const node = parent.getElementsByTagName(tag)[0];
  return node ? node.textContent.trim() : '';
}

// Mirrors the original getListHtml's "drop items with no meaningful text"
// filter, but returns objects via `mapFn` instead of building an HTML string.
function getListVals(parent, listTag, itemTag, mapFn) {
  const listNode = parent?.getElementsByTagName(listTag)[0];
  if (!listNode) return [];
  const items = Array.from(listNode.getElementsByTagName(itemTag));
  return items
    .map(mapFn)
    .filter((entry) => Object.values(entry).some((v) => String(v ?? '').replace(/[-\s.]/g, '').length > 0));
}

export function formatWorknetDate(str) {
  if (!str || str.length !== 8) return str;
  return str.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
}

const LIST_ITEM_TAG = { EVENT: 'empEvent', NEWS: 'dhsOpenEmpInfo', COMPANY: 'dhsOpenEmpHireInfo' };

export function parseWorknetList(xmlText, type) {
  const doc = parseXml(xmlText);
  if (!doc) return null;
  const total = parseInt(getVal(doc, 'total') || '0', 10);
  const items = Array.from(doc.getElementsByTagName(LIST_ITEM_TAG[type]));

  const parsed = items.map((item) => {
    if (type === 'EVENT') {
      return { key: `${getVal(item, 'areaCd')}-${getVal(item, 'eventNo')}`, title: getVal(item, 'eventNm'), area: getVal(item, 'area'), term: getVal(item, 'eventTerm'), areaCd: getVal(item, 'areaCd'), eventNo: getVal(item, 'eventNo') };
    }
    if (type === 'NEWS') {
      return { key: getVal(item, 'empSeqno'), title: getVal(item, 'empWantedTitle'), company: getVal(item, 'empBusiNm'), start: formatWorknetDate(getVal(item, 'empWantedStdt')), end: formatWorknetDate(getVal(item, 'empWantedEndt')), empSeqno: getVal(item, 'empSeqno') };
    }
    // COMPANY
    return {
      key: getVal(item, 'empCoNo'),
      title: getVal(item, 'coNm'),
      intro: getVal(item, 'coIntroSummaryCont'),
      mainBusiness: getVal(item, 'mainBusiCont') || getVal(item, 'coMainBusiCont'),
      empCoNo: getVal(item, 'empCoNo'),
    };
  });

  return { total, items: parsed };
}

export function parseWorknetDetail(xmlText, type) {
  const doc = parseXml(xmlText);
  if (!doc) return null;

  if (type === 'EVENT') {
    const dtl = doc.getElementsByTagName('empEventDtl')[0];
    if (!dtl) return null;
    return {
      title: getVal(dtl, 'eventNm'),
      place: getVal(dtl, 'eventPlc'),
      term: getVal(dtl, 'eventTerm'),
      tel: getVal(dtl, 'inqTelNo'),
      charger: getVal(dtl, 'charger'),
      joinInfo: getVal(dtl, 'joinCoWantedInfo'),
      visitPath: getVal(dtl, 'visitPath'),
    };
  }

  if (type === 'NEWS') {
    const dtl = doc.getElementsByTagName('dhsOpenEmpInfoDetailRoot')[0];
    if (!dtl) return null;
    return {
      company: getVal(dtl, 'empBusiNm'),
      title: getVal(dtl, 'empWantedTitle'),
      selections: getListVals(dtl, 'empSelsList', 'empSelsListInfo', (i) => ({ name: getVal(i, 'selsNm'), content: getVal(i, 'selsCont') })),
      method: getVal(dtl, 'empRcptMthdCont'),
      docs: getVal(dtl, 'empSubmitDocCont'),
      homepage: getVal(dtl, 'empWantedHomepgDetail'),
    };
  }

  // COMPANY
  const dtl = doc.getElementsByTagName('dhsOpenEmpHireInfoDetailRoot')[0];
  if (!dtl) return null;
  return {
    title: getVal(dtl, 'coNm'),
    intro: getVal(dtl, 'coIntroCont'),
    welfare: getListVals(dtl, 'welfareList', 'welfareListInfo', (i) => ({ name: getVal(i, 'cdKorNm'), content: getVal(i, 'welfareCont') })),
    history: getListVals(dtl, 'historyList', 'historyListInfo', (i) => ({ year: getVal(i, 'histYr'), month: getVal(i, 'histMm'), content: getVal(i, 'histCont') })),
  };
}
