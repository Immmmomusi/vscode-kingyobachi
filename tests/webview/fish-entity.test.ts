import { FishEntity } from '../../src/webview/fish-entity';
import { FoodEntity } from '../../src/webview/food-entity';
import { createFishState } from '../test-utils/helpers';
import { WATER_SURFACE_Y_RATIO, SPRITE_SIZE } from '../../src/shared/constants';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;

/** テスト用 FishEntity を生成 (Math.random を固定して初期位置を決定的にする) */
function createFish(overrides?: Parameters<typeof createFishState>[0]): FishEntity {
  const state = createFishState(overrides);
  return new FishEntity(state, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/** 指定座標に FoodEntity を生成 */
function createFoodAt(x: number, y: number): FoodEntity {
  const food = new FoodEntity(x, CANVAS_HEIGHT);
  // y 座標を直接設定 (private でないので)
  food.y = y;
  return food;
}

/** 複数フレーム update を回す */
function advanceFrames(fish: FishEntity, frames: number, foods: FoodEntity[] = []): void {
  for (let i = 0; i < frames; i++) {
    fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, foods);
  }
}

describe('FishEntity', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- constructor ---

  describe('constructor', () => {
    it('alive な金魚は behavior が swim になる', () => {
      const fish = createFish({ alive: true });
      expect(fish.behavior).toBe('swim');
    });

    it('dead な金魚は behavior が dead になる', () => {
      const fish = createFish({ alive: false });
      expect(fish.behavior).toBe('dead');
    });

    it('初期位置が swim bounds 内にある', () => {
      const fish = createFish();
      const waterSurfaceY = CANVAS_HEIGHT * WATER_SURFACE_Y_RATIO;
      expect(fish.x).toBeGreaterThanOrEqual(10); // MARGIN_LEFT_PX
      expect(fish.x).toBeLessThanOrEqual(CANVAS_WIDTH - 30); // MARGIN_RIGHT_PX
      expect(fish.y).toBeGreaterThanOrEqual(waterSurfaceY);
      expect(fish.y).toBeLessThanOrEqual(CANVAS_HEIGHT * 0.88);
    });

    it('spriteSize が state.size に対応する', () => {
      const small = createFish({ size: 'small' });
      const medium = createFish({ size: 'medium' });
      const large = createFish({ size: 'large' });
      expect(small.spriteSize).toBe(SPRITE_SIZE.small);
      expect(medium.spriteSize).toBe(SPRITE_SIZE.medium);
      expect(large.spriteSize).toBe(SPRITE_SIZE.large);
    });
  });

  // --- swim 行動 ---

  describe('swim 行動', () => {
    it('update を呼ぶと位置が変化する', () => {
      vi.restoreAllMocks();
      // random を変えて初期位置とターゲットをずらす
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        return callCount % 2 === 0 ? 0.8 : 0.2;
      });

      const fish = createFish();
      const initialX = fish.x;
      const initialY = fish.y;
      advanceFrames(fish, 50);

      const moved = fish.x !== initialX || fish.y !== initialY;
      expect(moved).toBe(true);
    });

    it('右に移動する場合 direction が 1 になる', () => {
      vi.restoreAllMocks();
      // ターゲットを右端に設定
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        // constructor: direction=右(0.5→1), 位置=左寄り(0.1)
        // pickNewSwimTarget: x=右端(0.99), y=中央(0.5)
        if (callCount <= 1) return 0.9; // direction → 1 (>0.5)
        if (callCount <= 3) return 0.1; // 初期位置を左寄りに
        return 0.99; // ターゲットを右端に
      });

      const fish = createFish();
      fish.x = 20; // 左端
      advanceFrames(fish, 30);

      expect(fish.direction).toBe(1);
    });

    it('左に移動する場合 direction が -1 になる', () => {
      vi.restoreAllMocks();
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      const fish = createFish();
      fish.x = CANVAS_WIDTH - 50; // 右寄り
      advanceFrames(fish, 30);

      expect(fish.direction).toBe(-1);
    });

    it('境界を超えるとクランプされる', () => {
      const fish = createFish();
      // 左端を超えさせる
      fish.x = 0;
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, []);

      expect(fish.x).toBeGreaterThanOrEqual(10); // MARGIN_LEFT_PX
    });
  });

  // --- rest 行動 ---

  describe('rest 行動', () => {
    it('restTimer 満了後に swim に遷移する', () => {
      vi.restoreAllMocks();
      // REST_CHANCE=0.002 で Math.random が 0.001 を返すと rest に入る
      let frame = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        frame++;
        // constructor で使われる呼び出しの後、swim 中の REST_CHANCE チェックで 0.001 を返す
        if (frame > 4) return 0.001; // REST_CHANCE (0.002) 未満 → rest に入る
        return 0.5;
      });

      const fish = createFish();

      // 数フレーム更新して rest に入るのを待つ
      for (let i = 0; i < 10; i++) {
        fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, []);
        if (fish.behavior === 'rest') break;
      }
      expect(fish.behavior).toBe('rest');

      // rest 中に十分なフレーム更新で swim に戻る (MAX_REST_FRAMES=180)
      vi.restoreAllMocks();
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // rest に再度入らない
      advanceFrames(fish, 250);

      expect(fish.behavior).toBe('swim');
    });
  });

  // --- 餌検知 ---

  describe('餌検知', () => {
    it('swim 中に餌がある場合 chaseFood に遷移する', () => {
      const fish = createFish();
      expect(fish.behavior).toBe('swim');

      const food = createFoodAt(fish.x + 30, fish.y + 20);
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);

      expect(fish.behavior).toBe('chaseFood');
    });

    it('餌がない場合 swim を維持する', () => {
      const fish = createFish();
      advanceFrames(fish, 10);
      expect(fish.behavior).toBe('swim');
    });
  });

  // --- findNearestFood (間接テスト) ---

  describe('findNearestFood (間接テスト)', () => {
    it('複数の餌から最も近いものを追跡する', () => {
      const fish = createFish();
      fish.x = 100;
      fish.y = 100;

      const farFood = createFoodAt(300, 200);
      const nearFood = createFoodAt(120, 110);

      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [farFood, nearFood]);

      expect(fish.behavior).toBe('chaseFood');
      expect(fish.getTargetFood()).toBe(nearFood);
    });

    it('eaten 済みの餌はスキップされる', () => {
      const fish = createFish();

      const eatenFood = createFoodAt(fish.x + 10, fish.y);
      eatenFood.markEaten();
      const availableFood = createFoodAt(fish.x + 100, fish.y + 50);

      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [eatenFood, availableFood]);

      expect(fish.getTargetFood()).toBe(availableFood);
    });

    it('他の魚が追跡中の餌より未追跡の餌を優先する', () => {
      const fish = createFish();
      fish.x = 100;
      fish.y = 100;

      const claimedFood = createFoodAt(110, 100); // 近い
      const unclaimedFood = createFoodAt(200, 150); // 遠い

      const claimedFoods = new Set([claimedFood]);
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [claimedFood, unclaimedFood], undefined, claimedFoods);

      expect(fish.getTargetFood()).toBe(unclaimedFood);
    });

    it('全て追跡済みなら最も近い餌にフォールバックする', () => {
      const fish = createFish();
      fish.x = 100;
      fish.y = 100;

      const nearFood = createFoodAt(110, 100);
      const farFood = createFoodAt(300, 200);

      const claimedFoods = new Set([nearFood, farFood]);
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [nearFood, farFood], undefined, claimedFoods);

      expect(fish.getTargetFood()).toBe(nearFood);
    });
  });

  // --- chaseFood 行動 ---

  describe('chaseFood 行動', () => {
    it('餌に向かって移動する', () => {
      const fish = createFish();
      fish.x = 100;
      fish.y = 100;

      const food = createFoodAt(200, 150);
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);
      expect(fish.behavior).toBe('chaseFood');

      const prevX = fish.x;
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);

      // 餌 (200) に向かって右に移動しているはず
      expect(fish.x).toBeGreaterThan(prevX);
    });

    it('餌が食べられた場合に別の餌を再検索する', () => {
      const fish = createFish();
      const food1 = createFoodAt(fish.x + 50, fish.y);
      const food2 = createFoodAt(fish.x + 100, fish.y);

      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food1, food2]);
      expect(fish.getTargetFood()).toBe(food1);

      // food1 が別の魚に食べられた
      food1.markEaten();
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food1, food2]);

      expect(fish.getTargetFood()).toBe(food2);
    });

    it('全ての餌がなくなると swim に遷移する', () => {
      const fish = createFish();
      const food = createFoodAt(fish.x + 50, fish.y);

      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);
      expect(fish.behavior).toBe('chaseFood');

      food.markEaten();
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);

      expect(fish.behavior).toBe('swim');
    });

    it('餌に到達すると markEaten して eat に遷移する', () => {
      const fish = createFish();
      const food = createFoodAt(fish.x + 5, fish.y); // EAT_REACH_DISTANCE (10) 以内

      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);

      expect(food.eaten).toBe(true);
      expect(fish.behavior).toBe('eat');
    });

    it('餌に到達すると onAte コールバックが呼ばれる', () => {
      const fish = createFish();
      const food = createFoodAt(fish.x + 5, fish.y);
      const onAte = vi.fn();

      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food], onAte);

      expect(onAte).toHaveBeenCalledOnce();
    });
  });

  // --- eat 行動 ---

  describe('eat 行動', () => {
    it('eatTimer 中は eat を維持する', () => {
      const fish = createFish();
      const food = createFoodAt(fish.x + 5, fish.y);
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);
      expect(fish.behavior).toBe('eat');

      // 数フレーム後もまだ eat
      advanceFrames(fish, 10);
      expect(fish.behavior).toBe('eat');
    });

    it('eatTimer 満了後に swim に遷移する', () => {
      const fish = createFish();
      const food = createFoodAt(fish.x + 5, fish.y);
      fish.update(CANVAS_WIDTH, CANVAS_HEIGHT, [food]);
      expect(fish.behavior).toBe('eat');

      // EAT_DURATION (30) フレーム + 余裕
      advanceFrames(fish, 35);
      expect(fish.behavior).toBe('swim');
    });
  });

  // --- dead 行動 ---

  describe('dead 行動', () => {
    it('水面より下にいると浮き上がる', () => {
      const fish = createFish({ alive: false });
      fish.y = CANVAS_HEIGHT * 0.5; // 水面より下
      const initialY = fish.y;

      advanceFrames(fish, 10);

      expect(fish.y).toBeLessThan(initialY);
    });

    it('水面に到達すると浮上が止まる', () => {
      const fish = createFish({ alive: false });
      fish.y = CANVAS_HEIGHT * WATER_SURFACE_Y_RATIO; // 水面ちょうど

      const prevY = fish.y;
      advanceFrames(fish, 10);

      // 水面以下にはならない
      expect(fish.y).toBeGreaterThanOrEqual(CANVAS_HEIGHT * WATER_SURFACE_Y_RATIO - 1);
    });

    it('死亡中は x が揺れる', () => {
      const fish = createFish({ alive: false });
      fish.y = CANVAS_HEIGHT * WATER_SURFACE_Y_RATIO;
      const initialX = fish.x;

      advanceFrames(fish, 50);

      expect(fish.x).not.toBe(initialX);
    });
  });

  // --- animation ---

  describe('animation', () => {
    it('ANIM_UPDATE_INTERVAL フレームごとに animFrame がインクリメントする', () => {
      const fish = createFish();
      expect(fish.animFrame).toBe(0);

      // ANIM_UPDATE_INTERVAL = 20 フレーム
      advanceFrames(fish, 20);
      expect(fish.animFrame).toBe(1);

      advanceFrames(fish, 20);
      expect(fish.animFrame).toBe(2);
    });
  });
});
