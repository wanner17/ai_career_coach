// Shared between pages/Jobs.jsx and pages/CompanyAnalysis.jsx — same work24
// item shapes (see utils/worknetXml.js), same card treatment either place.
export default function JobCard({ type, item, onClick }) {
  return (
    <button type="button" className="job-card" onClick={onClick}>
      <strong className="job-card__title">{item.title}</strong>
      <div className="job-card__meta">
        {type === 'EVENT' && (
          <>
            <span><em>지역</em>{item.area || '전국'}</span>
            <span><em>기간</em>{item.term}</span>
          </>
        )}
        {type === 'NEWS' && (
          <>
            <span><em>기업명</em>{item.company}</span>
            <span><em>채용기간</em>{item.start} ~ {item.end}</span>
          </>
        )}
        {type === 'COMPANY' && (
          <>
            {item.mainBusiness && <span><em>주요사업</em>{item.mainBusiness}</span>}
            {!item.mainBusiness && item.intro && <span className="job-card__intro">{item.intro}</span>}
          </>
        )}
      </div>
    </button>
  );
}
