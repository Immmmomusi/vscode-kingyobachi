import type { FishBehavior, GoldfishState } from '../shared/types';
import { SPRITE_SIZE, WATER_SURFACE_Y_RATIO } from '../shared/constants';
import type { FoodEntity } from './food-entity';

/** Margin from aquarium edges (px) */
const MARGIN_LEFT_PX = 10;
const MARGIN_RIGHT_PX = 30;

/** Drawable area margin (bottom: sand floor) */
const MARGIN_BOTTOM_RATIO = 0.12;

/** Speed per behavior (px/frame) */
const SWIM_SPEED = 0.2;
const CHASE_SPEED = 0.4;

/** Arrival threshold distance to target (px) */
const SWIM_ARRIVE_THRESHOLD = 5;

/** Velocity threshold for direction update */
const DIRECTION_THRESHOLD = 0.1;

/** Probability of entering rest (per frame) */
const REST_CHANCE = 0.002;
/** Min/max rest duration in frames */
const MIN_REST_FRAMES = 60;
const MAX_REST_FRAMES = 180;
/** Rest wobble frequency and amplitude */
const REST_WOBBLE_FREQUENCY = 0.05;
const REST_WOBBLE_AMPLITUDE = 0.1;

/** Distance at which fish can eat food (px) */
const EAT_REACH_DISTANCE = 10;
/** Eating animation duration in frames */
const EAT_DURATION = 30;

/** Number of swim animation frames */
const SWIM_ANIM_FRAMES = 4;
/** Animation update interval (frames) */
const ANIM_UPDATE_INTERVAL = 20; // ~200ms @60fps

/** Float speed after death (px/frame) */
const DEAD_FLOAT_SPEED = 0.3;
/** Dead fish wobble frequency and amplitude */
const DEAD_WOBBLE_FREQUENCY = 0.02;
const DEAD_WOBBLE_AMPLITUDE = 0.2;

/** Entity representing a single fish in the Webview */
export class FishEntity {
  state: GoldfishState;

  x: number;
  y: number;
  /** Facing direction (1=right, -1=left) */
  direction: 1 | -1;
  behavior: FishBehavior;

  private velocityX: number;
  private velocityY: number;
  private restTimer = 0;
  private swimTargetX: number;
  private swimTargetY: number;
  /** Animation frame index (0-3) */
  animFrame = 0;
  private frameTick = 0;
  /** Food currently being chased */
  private targetFood: FoodEntity | null = null;
  /** Remaining frames for eating animation */
  private eatTimer = 0;

  constructor(state: GoldfishState, canvasWidth: number, canvasHeight: number) {
    this.state = state;
    this.behavior = state.alive ? 'swim' : 'dead';
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.velocityX = 0;
    this.velocityY = 0;

    // Initial position: random location within the tank
    const bounds = calculateSwimBounds(canvasWidth, canvasHeight);
    this.x = bounds.left + Math.random() * (bounds.right - bounds.left);
    this.y = bounds.top + Math.random() * (bounds.bottom - bounds.top);
    this.swimTargetX = this.x;
    this.swimTargetY = this.y;
  }

  get spriteSize(): number {
    return SPRITE_SIZE[this.state.size] ?? 32;
  }

  /** Return the food currently being chased (for target distribution) */
  getTargetFood(): FoodEntity | null {
    return this.targetFood;
  }

  /**
   * Extension から stateUpdate を受け取った際に呼ぶ。
   * 位置・アニメーション状態は保持したまま、ゲームロジック側の状態を更新する。
   */
  updateState(newState: GoldfishState): void {
    const wasAlive = this.state.alive;
    this.state = newState;
    // 生存→死亡に遷移したら死亡行動に切り替え
    if (wasAlive && !newState.alive) {
      this.behavior = 'dead';
      this.targetFood = null;
    }
  }

  /** Update for one frame. Notifies via onAte callback when fish eats food */
  update(canvasWidth: number, canvasHeight: number, foods: FoodEntity[], onAte?: () => void, claimedFoods?: Set<FoodEntity>): void {
    // Increment frameTick regardless of behavior state
    this.frameTick++;

    if (!this.state.alive) {
      this.updateDead(canvasHeight);
      return;
    }

    // Transition from swim/rest to chaseFood when food is available
    if (this.behavior === 'swim' || this.behavior === 'rest') {
      const nearestFood = this.findNearestFood(foods, claimedFoods);
      if (nearestFood) {
        this.behavior = 'chaseFood';
        this.targetFood = nearestFood;
      }
    }

    switch (this.behavior) {
      case 'swim':
        this.updateSwim(canvasWidth, canvasHeight);
        break;
      case 'rest':
        this.updateRest(canvasWidth, canvasHeight);
        break;
      case 'chaseFood':
        this.updateChaseFood(canvasWidth, canvasHeight, foods, onAte, claimedFoods);
        break;
      case 'eat':
        this.updateEat(canvasWidth, canvasHeight);
        break;
    }

    this.updateAnimation();
  }

  /**
   * Find the nearest uneaten food.
   * Deprioritize food already chased by other fish; prefer unclaimed food when possible.
   */
  private findNearestFood(foods: FoodEntity[], claimedFoods?: Set<FoodEntity>): FoodEntity | null {
    let nearest: FoodEntity | null = null;
    let minDist = Infinity;
    let nearestUnclaimed: FoodEntity | null = null;
    let minUnclaimedDist = Infinity;

    for (const food of foods) {
      if (food.eaten) {
        continue;
      }
      const dist = Math.hypot(food.x - this.x, food.y - this.y);

      if (dist < minDist) {
        minDist = dist;
        nearest = food;
      }

      // Prefer food not being chased by other fish
      if (claimedFoods && !claimedFoods.has(food) && dist < minUnclaimedDist) {
        minUnclaimedDist = dist;
        nearestUnclaimed = food;
      }
    }

    return nearestUnclaimed ?? nearest;
  }

  private updateSwim(canvasWidth: number, canvasHeight: number): void {
    const bounds = calculateSwimBounds(canvasWidth, canvasHeight);

    // Pick a new target when the current one is reached
    const distToTarget = Math.hypot(this.swimTargetX - this.x, this.swimTargetY - this.y);
    if (distToTarget < SWIM_ARRIVE_THRESHOLD) {
      this.pickNewSwimTarget(bounds);
    }

    // Move toward the target
    const angle = Math.atan2(this.swimTargetY - this.y, this.swimTargetX - this.x);
    this.velocityX = Math.cos(angle) * SWIM_SPEED;
    this.velocityY = Math.sin(angle) * SWIM_SPEED;

    this.x += this.velocityX;
    this.y += this.velocityY;

    // Update facing direction
    if (this.velocityX > DIRECTION_THRESHOLD) {
      this.direction = 1;
    } else if (this.velocityX < -DIRECTION_THRESHOLD) {
      this.direction = -1;
    }

    // Reverse at walls
    this.clampToBounds(bounds);

    // Randomly enter rest state
    if (Math.random() < REST_CHANCE) {
      this.behavior = 'rest';
      this.restTimer = Math.floor(Math.random() * MAX_REST_FRAMES) + MIN_REST_FRAMES;
    }
  }

  private updateChaseFood(
    canvasWidth: number,
    canvasHeight: number,
    foods: FoodEntity[],
    onAte?: () => void,
    claimedFoods?: Set<FoodEntity>,
  ): void {
    // Re-search if target was eaten or no longer exists
    if (!this.targetFood || this.targetFood.eaten) {
      this.targetFood = this.findNearestFood(foods, claimedFoods);
      if (!this.targetFood) {
        this.behavior = 'swim';
        return;
      }
    }

    const dist = Math.hypot(this.targetFood.x - this.x, this.targetFood.y - this.y);

    // Reached food -> eat it
    if (dist < EAT_REACH_DISTANCE) {
      this.targetFood.markEaten();
      this.targetFood = null;
      this.behavior = 'eat';
      this.eatTimer = EAT_DURATION;
      onAte?.();
      return;
    }

    // Accelerate toward food
    const angle = Math.atan2(this.targetFood.y - this.y, this.targetFood.x - this.x);
    this.velocityX = Math.cos(angle) * CHASE_SPEED;
    this.velocityY = Math.sin(angle) * CHASE_SPEED;
    this.x += this.velocityX;
    this.y += this.velocityY;

    if (this.velocityX > DIRECTION_THRESHOLD) {
      this.direction = 1;
    } else if (this.velocityX < -DIRECTION_THRESHOLD) {
      this.direction = -1;
    }

    const bounds = calculateSwimBounds(canvasWidth, canvasHeight);
    this.clampToBounds(bounds);
  }

  private updateEat(canvasWidth: number, canvasHeight: number): void {
    // Mouth animation during eating (rapid animFrame toggle)
    this.eatTimer--;
    if (this.eatTimer <= 0) {
      this.behavior = 'swim';
      const bounds = calculateSwimBounds(canvasWidth, canvasHeight);
      this.pickNewSwimTarget(bounds);
    }
  }

  private updateRest(canvasWidth: number, canvasHeight: number): void {
    // Gently sway
    this.x += Math.sin(this.frameTick * REST_WOBBLE_FREQUENCY) * REST_WOBBLE_AMPLITUDE;

    this.restTimer--;
    if (this.restTimer <= 0) {
      this.behavior = 'swim';
      const bounds = calculateSwimBounds(canvasWidth, canvasHeight);
      this.pickNewSwimTarget(bounds);
    }
  }

  private updateDead(canvasHeight: number): void {
    // Float to the surface
    if (this.y > canvasHeight * WATER_SURFACE_Y_RATIO) {
      this.y -= DEAD_FLOAT_SPEED;
    }
    // Drift side to side
    this.x += Math.sin(this.frameTick * DEAD_WOBBLE_FREQUENCY) * DEAD_WOBBLE_AMPLITUDE;
  }

  private updateAnimation(): void {
    // Update animation at fixed frame intervals
    if (this.frameTick % ANIM_UPDATE_INTERVAL === 0) {
      this.animFrame = (this.animFrame + 1) % SWIM_ANIM_FRAMES;
    }
  }

  private pickNewSwimTarget(bounds: SwimBounds): void {
    this.swimTargetX = bounds.left + Math.random() * (bounds.right - bounds.left);
    this.swimTargetY = bounds.top + Math.random() * (bounds.bottom - bounds.top);
  }

  private clampToBounds(bounds: SwimBounds): void {
    if (this.x < bounds.left) {
      this.x = bounds.left;
      this.direction = 1;
      this.pickNewSwimTarget(bounds);
    }
    if (this.x > bounds.right) {
      this.x = bounds.right;
      this.direction = -1;
      this.pickNewSwimTarget(bounds);
    }
    if (this.y < bounds.top) {
      this.y = bounds.top;
      this.pickNewSwimTarget(bounds);
    }
    if (this.y > bounds.bottom) {
      this.y = bounds.bottom;
      this.pickNewSwimTarget(bounds);
    }
  }
}

interface SwimBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function calculateSwimBounds(canvasWidth: number, canvasHeight: number): SwimBounds {
  return {
    left: MARGIN_LEFT_PX,
    right: canvasWidth - MARGIN_RIGHT_PX,
    top: canvasHeight * WATER_SURFACE_Y_RATIO,
    bottom: canvasHeight * (1 - MARGIN_BOTTOM_RATIO),
  };
}
