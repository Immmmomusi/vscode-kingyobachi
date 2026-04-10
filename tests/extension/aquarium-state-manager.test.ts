import { AquariumStateManager } from '../../src/extension/aquarium-state-manager';
import { createMockMemento } from '../test-utils/mock-vscode';
import { createFishState, createAquariumState } from '../test-utils/helpers';
import {
  GAME_DAY_MS,
  FEED_HUNGER_RECOVERY,
  MAX_HUNGER,
  HUNGER_DECAY_PER_DAY,
  STARVATION_DAYS,
  SIZE_THRESHOLDS,
} from '../../src/shared/constants';

const STATE_KEY = 'kingyobachi.aquariumState';

describe('AquariumStateManager', () => {
  let manager: AquariumStateManager;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager?.dispose();
    vi.useRealTimers();
  });

  /** Memento にデータを入れた状態で manager を作る */
  function createManager(initialState?: Record<string, unknown>): AquariumStateManager {
    const memento = createMockMemento(initialState);
    manager = new AquariumStateManager(memento);
    return manager;
  }

  // --- addFish ---

  describe('addFish', () => {
    it('正しい初期値で金魚が作られる', async () => {
      createManager();
      const fish = await manager.addFish('orange', 'テスト金魚');

      expect(fish.type).toBe('orange');
      expect(fish.name).toBe('テスト金魚');
      expect(fish.hunger).toBe(MAX_HUNGER);
      expect(fish.alive).toBe(true);
      expect(fish.size).toBe('small');
      expect(fish.age).toBe(0);
    });

    it('2回呼ぶと2匹になる', async () => {
      createManager();
      await manager.addFish('orange', '金魚A');
      await manager.addFish('kouhaku', '金魚B');

      const state = manager.getState();
      expect(state.fish).toHaveLength(2);
    });

    it('globalState に保存される', async () => {
      const memento = createMockMemento();
      manager = new AquariumStateManager(memento);
      await manager.addFish('orange', 'テスト');

      const saved = memento.get(STATE_KEY) as { fish: unknown[] };
      expect(saved.fish).toHaveLength(1);
    });
  });

  // --- removeFish ---

  describe('removeFish', () => {
    it('存在する ID の金魚を削除する', async () => {
      createManager();
      const fish = await manager.addFish('orange', 'テスト');
      await manager.removeFish(fish.id);

      expect(manager.getState().fish).toHaveLength(0);
    });

    it('存在しない ID を指定しても状態は変わらない', async () => {
      createManager();
      await manager.addFish('orange', 'テスト');
      await manager.removeFish('non-existent-id');

      expect(manager.getState().fish).toHaveLength(1);
    });
  });

  // --- fishAte ---

  describe('fishAte', () => {
    it('生存する金魚の hunger が FEED_HUNGER_RECOVERY 増加する', async () => {
      const fish = createFishState({ hunger: 50 });
      createManager({
        [STATE_KEY]: createAquariumState({ fish: [fish] }),
      });

      await manager.fishAte(fish.id);

      const updated = manager.getState().fish[0];
      expect(updated.hunger).toBe(50 + FEED_HUNGER_RECOVERY);
    });

    it('hunger が MAX_HUNGER を超えないようにクランプされる', async () => {
      const fish = createFishState({ hunger: MAX_HUNGER - 5 });
      createManager({
        [STATE_KEY]: createAquariumState({ fish: [fish] }),
      });

      await manager.fishAte(fish.id);

      expect(manager.getState().fish[0].hunger).toBe(MAX_HUNGER);
    });

    it('死亡した金魚は変化しない', async () => {
      const fish = createFishState({ alive: false, hunger: 0 });
      createManager({
        [STATE_KEY]: createAquariumState({ fish: [fish] }),
      });

      await manager.fishAte(fish.id);

      expect(manager.getState().fish[0].hunger).toBe(0);
    });

    it('存在しない ID を指定してもエラーにならない', async () => {
      createManager();
      await expect(manager.fishAte('non-existent')).resolves.toBeUndefined();
    });
  });

  // --- calculateTick (age/size) ---
  // lastTickAt を過去に設定し、コンストラクタの初回 processTickAsync で一括処理。
  // vi.advanceTimersByTime で大量の setInterval を発火させると
  // 途中で hunger が減り餓死するため、この方式を使う。

  describe('calculateTick - age と size', () => {
    it('1日経過すると age が 1 増加する', () => {
      const now = Date.now();
      const fish = createFishState({ age: 0, hunger: MAX_HUNGER, lastFedAt: now });
      createManager({
        [STATE_KEY]: createAquariumState({ fish: [fish], lastTickAt: now - GAME_DAY_MS }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.age).toBe(1);
    });

    it('31日経過すると size が medium になる', () => {
      const now = Date.now();
      const fish = createFishState({
        age: 0,
        hunger: MAX_HUNGER,
        lastFedAt: now, // 餓死防止: 今餌をやったばかり
      });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS * SIZE_THRESHOLDS.medium,
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.size).toBe('medium');
    });

    it('71日経過すると size が large になる', () => {
      const now = Date.now();
      const fish = createFishState({
        age: 0,
        hunger: MAX_HUNGER,
        lastFedAt: now,
      });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS * SIZE_THRESHOLDS.large,
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.size).toBe('large');
    });

    it('1日未満の経過では状態が変化しない', () => {
      const now = Date.now();
      const fish = createFishState({ age: 5, hunger: 80, lastFedAt: now });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS / 2, // 半日前
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.age).toBe(5);
      expect(updated.hunger).toBe(80);
    });
  });

  // --- calculateTick (hunger) ---

  describe('calculateTick - hunger', () => {
    it('1日経過すると hunger が HUNGER_DECAY_PER_DAY 減少する', () => {
      const now = Date.now();
      const fish = createFishState({ hunger: MAX_HUNGER, lastFedAt: now });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS,
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.hunger).toBe(MAX_HUNGER - HUNGER_DECAY_PER_DAY);
    });

    it('複数日経過すると hunger が比例して減少する', () => {
      const now = Date.now();
      const fish = createFishState({ hunger: MAX_HUNGER, lastFedAt: now });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS * 3,
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.hunger).toBe(MAX_HUNGER - HUNGER_DECAY_PER_DAY * 3);
    });

    it('hunger は 0 以下にならない', () => {
      const now = Date.now();
      const fish = createFishState({ hunger: 10, lastFedAt: now });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS,
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.hunger).toBe(0);
    });
  });

  // --- calculateTick (starvation) ---

  describe('calculateTick - 餓死', () => {
    it('hunger 0 が STARVATION_DAYS 未満なら生存する', () => {
      const now = Date.now();
      const fish = createFishState({
        hunger: 0,
        lastFedAt: now - GAME_DAY_MS * (STARVATION_DAYS - 1),
      });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS, // 1日経過
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.alive).toBe(true);
    });

    it('hunger 0 が STARVATION_DAYS 以上続くと死亡する', () => {
      const now = Date.now();
      const fish = createFishState({
        hunger: 0,
        lastFedAt: now - GAME_DAY_MS * STARVATION_DAYS,
      });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS, // 1日経過でチェック発動
        }),
      });

      const updated = manager.getState().fish[0];
      expect(updated.alive).toBe(false);
    });

    it('既に死亡した金魚は tick で処理されない', () => {
      const now = Date.now();
      const fish = createFishState({ alive: false, hunger: 0, age: 10 });
      createManager({
        [STATE_KEY]: createAquariumState({
          fish: [fish],
          lastTickAt: now - GAME_DAY_MS,
        }),
      });

      const updated = manager.getState().fish[0];
      // 死亡魚は age が変わらない
      expect(updated.age).toBe(10);
    });
  });

  // --- getState ---

  describe('getState', () => {
    it('コピーを返す (元の状態への参照ではない)', async () => {
      createManager();
      await manager.addFish('orange', 'テスト');

      const state1 = manager.getState();
      const state2 = manager.getState();
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
      expect(state1.fish[0]).not.toBe(state2.fish[0]);
    });
  });

  // --- loadState validation ---

  describe('loadState validation', () => {
    it('有効な保存データがあれば復元する', () => {
      const now = Date.now();
      const fish = createFishState({ name: '保存済み金魚' });
      createManager({
        [STATE_KEY]: createAquariumState({ fish: [fish], lastTickAt: now }),
      });

      expect(manager.getState().fish[0].name).toBe('保存済み金魚');
    });

    it('無効なデータの場合は空の状態をデフォルトにする', () => {
      createManager({
        [STATE_KEY]: { invalid: 'data' },
      });

      expect(manager.getState().fish).toHaveLength(0);
    });

    it('null の場合は空の状態をデフォルトにする', () => {
      createManager();

      expect(manager.getState().fish).toHaveLength(0);
    });
  });
});
