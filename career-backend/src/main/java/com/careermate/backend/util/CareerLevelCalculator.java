package com.careermate.backend.util;

/**
 * Java port of the frontend's src/utils/careerLevel.js — same EXP required per
 * level (level * 250) and the same level-up rollover logic. Keeping the two
 * in lockstep matters: once the frontend switches from mock data to this API,
 * a player mid-level should see identical numbers, not a jump caused by two
 * different formulas.
 */
public final class CareerLevelCalculator {

    private CareerLevelCalculator() {
    }

    public static int getRequiredExp(int level) {
        return level * 250;
    }

    public static Result applyExp(int level, int currentExp, int amount) {
        int newLevel = level;
        int exp = currentExp + amount;
        int required = getRequiredExp(newLevel);
        int fromLevel = newLevel;

        while (exp >= required) {
            exp -= required;
            newLevel += 1;
            required = getRequiredExp(newLevel);
        }

        return new Result(newLevel, exp, required, newLevel > fromLevel, fromLevel);
    }

    public record Result(int level, int currentExp, int nextLevelExp, boolean leveledUp, int fromLevel) {
    }
}
