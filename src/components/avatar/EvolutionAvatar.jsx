import { getAvatarImage, getAvatarStage } from '../../config/avatarEvolution.js';

// Single finished image per Career Level stage — no layering, no per-item
// positioning. `evolving` adds a one-shot fade+scale+glow (see .avatar-evolve
// in dashboard.css) for the moment a stage boundary is crossed (see
// LevelUpModal.jsx); every other render is just a static <img>.
//
// `fill`: renders a bare <img> meant to be the sole child of a
// `.avatar-stage` container (see career/ProfileSummaryCard.jsx) — the stage
// itself is the frame (object-fit:cover + object-position, no separate
// inner "photo card"), instead of the default contain-and-shrink-to-fit
// `.evolution-avatar` wrapper used everywhere else (Sidebar thumbnail, 나의
// 성장 preview, Level Up modal comparison).
export default function EvolutionAvatar({ level, avatarGender, className = '', evolving = false, fill = false }) {
  const stage = getAvatarStage(level);
  const image = getAvatarImage(level, avatarGender);

  if (fill) {
    return (
      <img
        className={`avatar-stage-img ${evolving ? 'avatar-evolve' : ''} ${className}`}
        src={image}
        alt={`${stage.name} 아바타`}
      />
    );
  }

  return (
    <div className={`evolution-avatar ${evolving ? 'avatar-evolve' : ''} ${className}`}>
      <img src={image} alt={`${stage.name} 아바타`} />
    </div>
  );
}
