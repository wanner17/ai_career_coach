// Shared between pages/Jobs.jsx and pages/CompanyAnalysis.jsx.
export default function Pagination({ page, totalPages, onChange }) {
  const groupSize = 5;
  const currentGroup = Math.ceil(page / groupSize);
  const start = (currentGroup - 1) * groupSize + 1;
  const end = Math.min(currentGroup * groupSize, totalPages);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="pagination">
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(1)}>«</button>
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === page ? 'is-active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(totalPages)}>»</button>
    </div>
  );
}
