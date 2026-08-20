import { skillMeta } from '../../data/mockUser.js';

const barClassBySkill = {
  jobSkill: '', resume: 'bluebar', interview: 'orangebar', companyAnalysis: 'purplebar', careerReadiness: 'yellowbar',
};

// '나의 역량' card — five skill bars driven entirely by the skills mock object.
export default function SkillCard({ skills, navigate }) {
  return (
    <article className="card skill-card">
      <div className="card-head">
        <h2>나의 역량</h2>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate?.('/skills'); }}>자세히 보기 ›</a>
      </div>
      <div className="skill-list">
        {Object.entries(skills).map(([key, value]) => {
          const meta = skillMeta[key];
          if (!meta) return null;
          return (
            <div className="skill-row" key={key}>
              <span className={`skill-icon ${meta.colorClass}`}>{meta.icon}</span>
              <b>{meta.label}</b>
              <div className={`mini-progress ${barClassBySkill[key]}`}><i style={{ width: `${value}%` }} /></div>
              <strong>{value}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}
