import type { AquariumColors } from '../shared/types';
import { WATER_SURFACE_Y_RATIO } from '../shared/constants';
import { hexToRgb, lightenHex } from './color-utils';

const DEFAULT_COLORS: AquariumColors = {
  waterColorTop: '#0a2a4a',
  waterColorBottom: '#0d1b2a',
  sandColor: '#3a2f1a',
};

/** Sand parameters */
const SAND_HEIGHT_RATIO = 0.1;
const SAND_GRAIN_LIGHTEN = 16;
const SAND_GRAIN_STEP = 6;
const SAND_GRAIN_OFFSET_FACTOR = 7;
const SAND_GRAIN_OFFSET_RANGE = 4;
const SAND_GRAIN_Y_PADDING = 2;
const SAND_GRAIN_SIZE = 2;

/** Pixel art gradient stripe height (px) */
const WATER_STRIPE_HEIGHT = 16;

/** Water surface parameters */
const WATER_SURFACE_COLOR = 'rgba(178, 235, 242, 0.5)';
const WATER_SURFACE_LINE_WIDTH = 2;
const WAVE_X_STEP = 4;
const WAVE_FREQUENCY = 0.02;
const WAVE_AMPLITUDE = 2;
const WAVE_SPEED = 0.3;

/** Bubble parameters */
const BUBBLE_COLOR = 'rgba(255, 255, 255, 0.6)';
const BUBBLE_SPAWN_CHANCE = 0.005;
const BUBBLE_SPAWN_Y_RATIO = 0.85;
const BUBBLE_RADIUS_MIN = 1;
const BUBBLE_RADIUS_RANGE = 2;
const BUBBLE_SPEED_MIN = 0.1;
const BUBBLE_SPEED_RANGE = 0.2;
const BUBBLE_WOBBLE_FREQUENCY = 0.05;
const BUBBLE_WOBBLE_AMPLITUDE = 0.3;

/** Renderer for aquarium background, water surface, and bubbles */
export class AquariumRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bubbles: Bubble[] = [];
  private tick = 0;
  private colors: AquariumColors = { ...DEFAULT_COLORS };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get Canvas 2D context');
    }
    this.ctx = ctx;
    this.resize();
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  resize(): void {
    // Intentionally ignore devicePixelRatio to maintain coarse pixel art rendering
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    // Prevent pixel art from being blurred
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Update color settings */
  updateColors(colors: AquariumColors): void {
    this.colors = colors;
  }

  /** Render one frame of the background */
  renderBackground(): void {
    this.tick++;
    this.ctx.imageSmoothingEnabled = false;
    // Clear previous frame: keep area above waves transparent as VSCode background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawWaterBody();
    this.drawSandBottom();
    this.drawWaterSurface();
    this.updateAndDrawBubbles();
  }

  /** Draw pixel art striped gradient in the water area using the wave as clip boundary */
  private drawWaterBody(): void {
    const waveY = this.canvas.height * WATER_SURFACE_Y_RATIO;

    this.ctx.save();
    this.ctx.beginPath();
    // Start from bottom-left, trace the wave path, and close to define the water area (snap wave Y)
    this.ctx.moveTo(0, this.canvas.height);
    for (let x = 0; x <= this.canvas.width; x += WAVE_X_STEP) {
      const y = Math.floor(waveY + Math.sin((x + this.tick * WAVE_SPEED) * WAVE_FREQUENCY) * WAVE_AMPLITUDE);
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.clip();

    // Use stripes for a stepped gradient instead of a smooth gradient
    const waterTop = Math.floor(waveY - WAVE_AMPLITUDE);
    const waterBottom = this.canvas.height;
    const waterHeight = waterBottom - waterTop;
    const stripes = Math.ceil(waterHeight / WATER_STRIPE_HEIGHT);
    const topRgb = hexToRgb(this.colors.waterColorTop);
    const botRgb = hexToRgb(this.colors.waterColorBottom);

    for (let i = 0; i < stripes; i++) {
      const t = i / (stripes - 1);
      const r = Math.round(topRgb[0] + (botRgb[0] - topRgb[0]) * t);
      const g = Math.round(topRgb[1] + (botRgb[1] - topRgb[1]) * t);
      const b = Math.round(topRgb[2] + (botRgb[2] - topRgb[2]) * t);
      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx.fillRect(0, waterTop + i * WATER_STRIPE_HEIGHT, this.canvas.width, WATER_STRIPE_HEIGHT);
    }

    this.ctx.restore();
  }

  private drawSandBottom(): void {
    const sandHeight = this.canvas.height * SAND_HEIGHT_RATIO;
    const sandY = this.canvas.height - sandHeight;
    this.ctx.fillStyle = this.colors.sandColor;
    this.ctx.fillRect(0, sandY, this.canvas.width, sandHeight);

    // Render sand grain texture using dots (slightly lightened sand color)
    this.ctx.fillStyle = lightenHex(this.colors.sandColor, SAND_GRAIN_LIGHTEN);
    for (let x = 0; x < this.canvas.width; x += SAND_GRAIN_STEP) {
      const offset = (x * SAND_GRAIN_OFFSET_FACTOR) % SAND_GRAIN_OFFSET_RANGE;
      this.ctx.fillRect(x, sandY + offset + SAND_GRAIN_Y_PADDING, SAND_GRAIN_SIZE, SAND_GRAIN_SIZE);
    }
  }

  private drawWaterSurface(): void {
    const waveY = this.canvas.height * WATER_SURFACE_Y_RATIO;
    this.ctx.fillStyle = WATER_SURFACE_COLOR;

    // Draw snapped wave as 1px-height horizontal bars at pixel boundaries
    for (let x = 0; x <= this.canvas.width; x += WAVE_X_STEP) {
      const y = Math.floor(waveY + Math.sin((x + this.tick * WAVE_SPEED) * WAVE_FREQUENCY) * WAVE_AMPLITUDE);
      this.ctx.fillRect(x, y, WAVE_X_STEP, WATER_SURFACE_LINE_WIDTH);
    }
  }

  private updateAndDrawBubbles(): void {
    // Randomly spawn bubbles
    if (Math.random() < BUBBLE_SPAWN_CHANCE) {
      this.bubbles.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height * BUBBLE_SPAWN_Y_RATIO,
        radius: BUBBLE_RADIUS_MIN + Math.random() * BUBBLE_RADIUS_RANGE,
        speed: BUBBLE_SPEED_MIN + Math.random() * BUBBLE_SPEED_RANGE,
      });
    }

    this.ctx.fillStyle = BUBBLE_COLOR;

    this.bubbles = this.bubbles.filter((bubble) => {
      bubble.y -= bubble.speed;
      bubble.x += Math.sin(bubble.y * BUBBLE_WOBBLE_FREQUENCY) * BUBBLE_WOBBLE_AMPLITUDE;

      if (bubble.y < this.canvas.height * WATER_SURFACE_Y_RATIO) {
        return false;
      }

      // Use square bubbles for pixel art aesthetic
      const size = Math.round(bubble.radius) * 2;
      this.ctx.fillRect(Math.floor(bubble.x), Math.floor(bubble.y), size, size);
      return true;
    });
  }
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
}

