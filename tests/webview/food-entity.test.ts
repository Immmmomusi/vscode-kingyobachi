import { FoodEntity } from '../../src/webview/food-entity';
import { WATER_SURFACE_Y_RATIO } from '../../src/shared/constants';

/** テスト用定数 (food-entity.ts のモジュール内定数と同じ値) */
const FOOD_FALL_SPEED = 0.3;
const FOOD_FLOOR_Y_RATIO = 0.88;
const SETTLE_DURATION = 120;

const CANVAS_HEIGHT = 600;

describe('FoodEntity', () => {
  describe('constructor', () => {
    it('水面Y座標に配置される', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      expect(food.y).toBe(CANVAS_HEIGHT * WATER_SURFACE_Y_RATIO);
    });

    it('指定した x 座標に配置される', () => {
      const food = new FoodEntity(150, CANVAS_HEIGHT);
      expect(food.x).toBe(150);
    });
  });

  describe('update - 落下', () => {
    it('初回フレームで FOOD_FALL_SPEED 分だけ y が増加する', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      const initialY = food.y;
      food.update();
      // wobble の影響で x は変わるが、y の増分は FOOD_FALL_SPEED
      expect(food.y).toBeCloseTo(initialY + FOOD_FALL_SPEED, 5);
    });

    it('複数フレームで x が wobble で左右に変化する', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      const initialX = food.x;
      // 数フレーム進めて x が初期値から変化することを確認
      for (let i = 0; i < 10; i++) {
        food.update();
      }
      expect(food.x).not.toBe(initialX);
    });

    it('未着底のとき false を返す', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      expect(food.update()).toBe(false);
    });
  });

  describe('update - 着底', () => {
    it('底に到達すると y が floorY にクランプされる', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      const floorY = CANVAS_HEIGHT * FOOD_FLOOR_Y_RATIO;

      // floorY に到達するまで更新
      while (food.y < floorY) {
        food.update();
      }
      expect(food.y).toBe(floorY);
    });

    it('着底後 SETTLE_DURATION 未満のとき false を返す', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      const floorY = CANVAS_HEIGHT * FOOD_FLOOR_Y_RATIO;

      // 着底させる
      while (food.y < floorY) {
        food.update();
      }
      // 着底直後 (settleTimer はまだ小さい)
      expect(food.update()).toBe(false);
    });

    it('着底後 SETTLE_DURATION フレーム経過で true を返す', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      const floorY = CANVAS_HEIGHT * FOOD_FLOOR_Y_RATIO;

      // 着底させる
      while (food.y < floorY) {
        food.update();
      }
      // SETTLE_DURATION フレーム分更新 (着底後のフレームなので +1 しておく)
      for (let i = 0; i < SETTLE_DURATION; i++) {
        food.update();
      }
      // 次のフレームで消滅
      expect(food.update()).toBe(true);
    });
  });

  describe('update - eaten', () => {
    it('eaten が true のとき即座に true を返す', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      food.markEaten();
      expect(food.update()).toBe(true);
    });
  });

  describe('markEaten', () => {
    it('eaten が true になる', () => {
      const food = new FoodEntity(100, CANVAS_HEIGHT);
      expect(food.eaten).toBe(false);
      food.markEaten();
      expect(food.eaten).toBe(true);
    });
  });
});
