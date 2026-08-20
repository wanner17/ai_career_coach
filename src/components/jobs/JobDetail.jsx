// Shared between pages/Jobs.jsx and pages/CompanyAnalysis.jsx — same work24
// detail shapes (see utils/worknetXml.js parseWorknetDetail). `headerExtra`
// is an optional slot rendered next to the title (CompanyAnalysis uses it
// for the 관심기업 등록/해제 toggle — Jobs.jsx doesn't pass one). `backLabel`
// defaults to "목록으로" (Jobs.jsx's case — onBack really does return to a
// list) but CompanyAnalysis's 관련 채용공고 drill-down passes its own label
// since there onBack returns to the company detail, not a list.
export default function JobDetail({ type, detail, onBack, headerExtra, backLabel = '◀ 목록으로' }) {
  if (!detail) return <p className="jobs-empty">상세 정보가 없습니다.</p>;

  return (
    <div className="job-detail">
      <button className="job-detail__back" onClick={onBack}>{backLabel}</button>

      {type === 'EVENT' && (
        <>
          <h2 className="job-detail__title">{detail.title}</h2>
          <dl className="job-detail__table">
            {detail.place && <><dt>장소</dt><dd>{detail.place}</dd></>}
            {detail.term && <><dt>기간</dt><dd>{detail.term}</dd></>}
            {detail.tel && <><dt>문의처</dt><dd>{detail.tel}{detail.charger ? ` (${detail.charger})` : ''}</dd></>}
          </dl>
          {detail.joinInfo && <><h3 className="job-detail__section">참여기업정보</h3><p className="job-detail__text">{detail.joinInfo}</p></>}
          {detail.visitPath && <><h3 className="job-detail__section">오시는길</h3><p className="job-detail__text">{detail.visitPath}</p></>}
        </>
      )}

      {type === 'NEWS' && (
        <>
          {detail.company && <span className="job-detail__company">{detail.company}</span>}
          <h2 className="job-detail__title">{detail.title}</h2>
          {detail.selections.length > 0 && (
            <>
              <h3 className="job-detail__section">전형 단계</h3>
              {detail.selections.map((s, i) => (
                <div className="job-detail__sub" key={i}><b>{s.name}</b>{s.content}</div>
              ))}
            </>
          )}
          <dl className="job-detail__table">
            {detail.method && <><dt>접수방법</dt><dd>{detail.method}</dd></>}
            {detail.docs && <><dt>제출서류</dt><dd>{detail.docs}</dd></>}
            {detail.homepage && <><dt>홈페이지</dt><dd><a href={detail.homepage} target="_blank" rel="noreferrer">채용 페이지 바로가기</a></dd></>}
          </dl>
        </>
      )}

      {type === 'COMPANY' && (
        <>
          <div className="job-detail__title-row">
            <h2 className="job-detail__title">{detail.title}</h2>
            {headerExtra}
          </div>
          {detail.intro && <><h3 className="job-detail__section">기업 소개</h3><div className="job-detail__sub">{detail.intro}</div></>}
          {detail.welfare.length > 0 && (
            <>
              <h3 className="job-detail__section">복리후생</h3>
              {detail.welfare.map((w, i) => (
                <div className="job-detail__sub" key={i}><b>{w.name}</b>{w.content}</div>
              ))}
            </>
          )}
          {detail.history.length > 0 && (
            <>
              <h3 className="job-detail__section">연혁</h3>
              <div className="job-detail__history">
                {detail.history.map((h, i) => <div key={i}>{h.year}.{h.month} - {h.content}</div>)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
