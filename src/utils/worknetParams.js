// Shared between pages/Jobs.jsx and pages/CompanyAnalysis.jsx — each work24
// item type needs different id fields to look up its detail (see
// WorknetService's callTp=D branch).
export function idParamsFor(type, item) {
  if (type === 'EVENT') return { areaCd: item.areaCd, eventNo: item.eventNo };
  if (type === 'NEWS') return { empSeqno: item.empSeqno };
  return { empCoNo: item.empCoNo };
}
