import type { AquariumState, GoldfishState } from '../../src/shared/types';

/** テスト用の GoldfishState を生成 */
export function createFishState(overrides?: Partial<GoldfishState>): GoldfishState {
  return {
    id: 'test-fish-001',
    type: 'orange',
    name: 'テスト金魚',
    hunger: 50,
    growth: 0,
    age: 0,
    alive: true,
    size: 'small',
    lastFedAt: Date.now(),
    ...overrides,
  };
}

/** テスト用の AquariumState を生成 */
export function createAquariumState(overrides?: Partial<AquariumState>): AquariumState {
  return {
    fish: [],
    lastTickAt: Date.now(),
    ...overrides,
  };
}
