import Modal from '../common/Modal.jsx';
import { useCareer } from '../../context/CareerContext.jsx';

export default function QuestConfirmModal() {
  const { confirmQuest, cancelCompleteQuest, confirmCompleteQuest } = useCareer();
  if (!confirmQuest) return null;

  return (
    <Modal onClose={cancelCompleteQuest}>
      <h3>{confirmQuest.title}</h3>
      <p>이 퀘스트를 완료하시겠습니까?<br />완료 시 EXP +{confirmQuest.exp}이 지급됩니다.</p>
      <div className="modal-actions">
        <button onClick={cancelCompleteQuest}>취소</button>
        <button className="primary" onClick={confirmCompleteQuest}>완료 처리</button>
      </div>
    </Modal>
  );
}
