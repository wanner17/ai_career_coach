import { useCareer } from '../../context/CareerContext.jsx';

// Single quest row. Shared by the Dashboard widget and the full Quest list page.
export default function QuestItem({ quest, showCategory = false }) {
  const { requestCompleteQuest } = useCareer();

  return (
    <div className={`quest-item ${quest.completed ? 'done' : ''}`}>
      <span className="quest-check">{quest.completed ? '✓' : ''}</span>
      <strong>
        {quest.title}
        {showCategory && <em style={{ display: 'block', marginTop: 2 }}>{quest.category}</em>}
      </strong>
      <em>EXP +{quest.exp}</em>
      {quest.completed ? (
        <button disabled>완료</button>
      ) : (
        <button className="primary-mini" onClick={() => requestCompleteQuest(quest)}>진행하기</button>
      )}
    </div>
  );
}
