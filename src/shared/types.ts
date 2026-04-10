/** Fish color variation */
export type FishType = 'orange' | 'kouhaku';

/** Fish size (determined by age in days) */
export type FishSize = 'small' | 'medium' | 'large';

/** Fish behavior state */
export type FishBehavior = 'swim' | 'chaseFood' | 'eat' | 'rest' | 'dead';

/** State of a single goldfish */
export interface GoldfishState {
  id: string;
  type: FishType;
  name: string;
  /** Hunger level 0-100 */
  hunger: number;
  /** Growth level 0-100 */
  growth: number;
  /** Age in days */
  age: number;
  alive: boolean;
  size: FishSize;
  /** Last feeding time (UNIX ms) */
  lastFedAt: number;
}

/** Aquarium color settings */
export interface AquariumColors {
  waterColorTop: string;
  waterColorBottom: string;
  sandColor: string;
}

/** Overall aquarium state */
export interface AquariumState {
  fish: GoldfishState[];
  /** Last tick processing time (UNIX ms) */
  lastTickAt: number;
}
