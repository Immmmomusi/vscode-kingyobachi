import { WATER_SURFACE_Y_RATIO } from '../shared/constants';

/** Frames before disappearing after reaching the bottom */
const SETTLE_DURATION = 120;
/** Sand floor Y ratio (food cannot fall past this) */
const FOOD_FLOOR_Y_RATIO = 0.88;
/** Fall speed (px/frame) */
const FOOD_FALL_SPEED = 0.3;
/** Horizontal wobble frequency and amplitude */
const FOOD_WOBBLE_FREQUENCY = 0.08;
const FOOD_WOBBLE_AMPLITUDE = 0.2;

/** Rendering: pellet half-size (px) */
const FOOD_HALF_SIZE = 2;
const FOOD_HIGHLIGHT_HALF_SIZE = 1;
/** Rendering colors */
const FOOD_COLOR = '#8B4513';
const FOOD_HIGHLIGHT_COLOR = '#D2691E';

/** A single food pellet falling from the water surface */
export class FoodEntity {
  x: number;
  y: number;
  /** Whether the food has been eaten */
  eaten = false;
  /** Frames elapsed since reaching the bottom */
  private settleTimer = 0;
  /** Whether the food has settled at the bottom */
  private isSettled = false;

  private fallSpeed = FOOD_FALL_SPEED;
  private wobbleTick = 0;
  /** Sand floor Y coordinate. Food cannot fall past this */
  private floorY: number;

  constructor(x: number, canvasHeight: number) {
    this.x = x;
    // Start near the water surface
    this.y = canvasHeight * WATER_SURFACE_Y_RATIO;
    this.floorY = canvasHeight * FOOD_FLOOR_Y_RATIO;
  }

  /** Update for one frame. Returns true if the food should be removed */
  update(): boolean {
    if (this.eaten) {
      return true;
    }

    // Disappear after a set time once settled at the bottom
    if (this.isSettled) {
      this.settleTimer++;
      return this.settleTimer >= SETTLE_DURATION;
    }

    this.wobbleTick++;
    this.y += this.fallSpeed;
    // Fall while wobbling side to side
    this.x += Math.sin(this.wobbleTick * FOOD_WOBBLE_FREQUENCY) * FOOD_WOBBLE_AMPLITUDE;

    if (this.y >= this.floorY) {
      this.y = this.floorY;
      this.isSettled = true;
    }

    return false;
  }

  markEaten(): void {
    this.eaten = true;
  }
}

/** Draw food */
export function drawFood(ctx: CanvasRenderingContext2D, food: FoodEntity): void {
  if (food.eaten) {
    return;
  }
  ctx.fillStyle = FOOD_COLOR;
  ctx.fillRect(food.x - FOOD_HALF_SIZE, food.y - FOOD_HALF_SIZE, FOOD_HALF_SIZE * 2, FOOD_HALF_SIZE * 2);
  // Lighter highlight
  ctx.fillStyle = FOOD_HIGHLIGHT_COLOR;
  ctx.fillRect(food.x - FOOD_HIGHLIGHT_HALF_SIZE, food.y - FOOD_HIGHLIGHT_HALF_SIZE, FOOD_HIGHLIGHT_HALF_SIZE * 2, FOOD_HIGHLIGHT_HALF_SIZE * 2);
}
