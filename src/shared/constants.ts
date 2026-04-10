import type { FishSize, FishType } from './types';

/** One in-game day = 60 minutes real time (ms) */
export const GAME_DAY_MS = 60 * 60 * 24 * 1000;

/** Hunger recovery per feeding */
export const FEED_HUNGER_RECOVERY = 20;

/** Maximum hunger value */
export const MAX_HUNGER = 100;

/** Hunger decay per day */
export const HUNGER_DECAY_PER_DAY = 25;

/** Days of zero hunger before death */
export const STARVATION_DAYS = 2;

/** Age thresholds for size changes */
export const SIZE_THRESHOLDS = {
  medium: 31,
  large: 71,
} as const;

/** Sprite pixel size per fish size */
export const SPRITE_SIZE: Record<FishSize, number> = {
  small: 32,
  medium: 48,
  large: 64,
};

/** Fish type labels (for UI display) */
export const FISH_TYPE_LABELS: Record<FishType, string> = {
  orange: 'Goldfish (Orange)',
  kouhaku: 'Goldfish (Red & White)',
};

/** Recommended maximum number of fish in the bowl */
export const RECOMMENDED_MAX_FISH = 5;

/** Hunger threshold for hunger warnings */
export const HUNGER_WARNING_THRESHOLD = 20;

/** Water surface Y position ratio (0-1, shared across files) */
export const WATER_SURFACE_Y_RATIO = 0.2;
