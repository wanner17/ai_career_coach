package com.careermate.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.careermate.backend.domain.Badge;

@Mapper
public interface BadgeMapper {

    /**
     * All badges with `earned` reflecting the QUEST-type grants stored in
     * user_badge. LEVEL-type rows always come back earned=false here —
     * BadgeServiceImpl overlays the real value from user.level afterwards.
     */
    List<Badge> findAllForUser(@Param("userId") Long userId);

    /** Plain catalog, no per-user `earned` — backs Admin Badge 관리. */
    List<Badge> findAllCatalog();

    Badge findById(@Param("id") Long id);

    void insert(Badge badge);

    void update(Badge badge);

    void deleteById(@Param("id") Long id);
}
