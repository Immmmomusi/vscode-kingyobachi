import type { FishSize, FishType } from '../shared/types';

import { FishEntity } from './fish-entity';
import type { SpriteSheet } from './sprite-sheet';

/** Fish color palette by type (for fallback rendering) */
const FISH_COLORS: Record<FishType, { body: string; fin: string; eye: string }> = {
  orange: { body: '#ff8c00', fin: '#ff6600', eye: '#1a1a1a' },
  kouhaku: { body: '#ffffff', fin: '#ff4040', eye: '#1a1a1a' },
};

const DEFAULT_COLOR = FISH_COLORS.orange;

/** Fallback rendering: body size ratios */
const BODY_WIDTH_RATIO = 0.7;
const BODY_HEIGHT_RATIO = 0.45;

/** Fallback rendering: tail fin */
const TAIL_SIZE_RATIO = 0.4;
const TAIL_WAG_AMPLITUDE = 3;

/** Fallback rendering: dorsal fin */
const DORSAL_FIN_X_RATIO = 0.1;
const DORSAL_FIN_END_X_RATIO = 0.25;
const DORSAL_FIN_HEIGHT_RATIO = 0.12;

/** Fallback rendering: eye */
const EYE_X_RATIO = 0.2;
const EYE_PUPIL_X_RATIO = 0.22;
const EYE_Y_RATIO = 0.1;
const EYE_WHITE_RADIUS_RATIO = 0.06;
const EYE_PUPIL_RADIUS_RATIO = 0.03;
const EYE_WHITE_COLOR = '#ffffff';

/** Sprite sheet cache (keyed by type-size) */
const spriteCache = new Map<string, SpriteSheet>();

/** Register a sprite sheet */
export function registerSprite(type: FishType, size: FishSize, sprite: SpriteSheet): void {
  spriteCache.set(`${type}-${size}`, sprite);
}

/** Draw a fish. Uses sprite if available, otherwise falls back to programmatic rendering */
export function drawFish(ctx: CanvasRenderingContext2D, fish: FishEntity): void {
  const spriteKey = `${fish.state.type}-${fish.state.size}`;
  const sprite = spriteCache.get(spriteKey);

  if (sprite?.loaded) {
    const drawn = sprite.draw(
      ctx, fish.x, fish.y,
      fish.behavior, fish.animFrame,
      fish.direction, fish.state.alive,
    );
    if (drawn) {
      return;
    }
  }

  // Fallback: programmatic rendering
  drawFishFallback(ctx, fish);
}

/** Fallback rendering without sprites */
function drawFishFallback(ctx: CanvasRenderingContext2D, fish: FishEntity): void {
  const colors = FISH_COLORS[fish.state.type] ?? DEFAULT_COLOR;
  const size = fish.spriteSize;
  const halfSize = size / 2;

  ctx.save();
  ctx.translate(fish.x, fish.y);

  if (fish.direction === -1) {
    ctx.scale(-1, 1);
  }

  if (!fish.state.alive) {
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.5;
  }

  // Body
  const bodyWidth = size * BODY_WIDTH_RATIO;
  const bodyHeight = size * BODY_HEIGHT_RATIO;
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail fin
  const tailWag = Math.sin(fish.animFrame * Math.PI / 2) * TAIL_WAG_AMPLITUDE;
  ctx.fillStyle = colors.fin;
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2, 0);
  ctx.lineTo(-bodyWidth / 2 - halfSize * TAIL_SIZE_RATIO, -bodyHeight / 2 + tailWag);
  ctx.lineTo(-bodyWidth / 2 - halfSize * TAIL_SIZE_RATIO, bodyHeight / 2 + tailWag);
  ctx.closePath();
  ctx.fill();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-bodyWidth * DORSAL_FIN_X_RATIO, -bodyHeight / 2);
  ctx.lineTo(bodyWidth * DORSAL_FIN_X_RATIO, -bodyHeight / 2 - size * DORSAL_FIN_HEIGHT_RATIO);
  ctx.lineTo(bodyWidth * DORSAL_FIN_END_X_RATIO, -bodyHeight / 2);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = EYE_WHITE_COLOR;
  ctx.beginPath();
  ctx.arc(bodyWidth * EYE_X_RATIO, -bodyHeight * EYE_Y_RATIO, size * EYE_WHITE_RADIUS_RATIO, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.eye;
  ctx.beginPath();
  ctx.arc(bodyWidth * EYE_PUPIL_X_RATIO, -bodyHeight * EYE_Y_RATIO, size * EYE_PUPIL_RADIUS_RATIO, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
