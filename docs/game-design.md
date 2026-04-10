# Game System Design

## Concept

Gameplay is minimal. The main purpose is to watch the fish; the most interaction expected is occasionally feeding them.

## Goldfish State

```typescript
interface GoldfishState {
  id: string;
  type: 'orange' | 'kouhaku';  // Goldfish color variations
  name: string;
  hunger: number;       // Hunger level 0-100
  growth: number;       // Growth level 0-100
  age: number;          // Age in days
  alive: boolean;
  size: 'small' | 'medium' | 'large';
  lastFedAt: number;    // Last feeding time (UNIX ms)
}
```

## Time Progression

- 1 in-game day = 24 real-time hours
- On extension startup, state is recalculated based on the difference from `lastFedAt`
- Hunger level decreases by a fixed amount each day
- If hunger stays at 0 for 2 consecutive days, the fish dies

## Feeding

- Via the command `kingyobachi.feed` or by clicking in the Webview
- Food drops from the water surface -> the goldfish chases and eats it
- Hunger level recovers by +20
- Food is unlimited (no cost management)

## Adding Goldfish

- Command `kingyobachi.addFish` -> select color (orange / red-and-white)
- No limit on additions (though around 5 fish is recommended given the tank area)

## Growth

- small (days 0-30) -> medium (days 31-70) -> large (day 71+)
- Sprite display sizes: 48x48 -> 64x64 -> 80x80 (source art is 16x16, scaled by integer multiples)

## Goldfish Behavior AI

```
SWIM       -> Moves randomly within the tank, reverses at walls
CHASE_FOOD -> When food exists, accelerates toward it
EAT        -> Reaches food, plays eating animation
REST       -> Randomly rests near the bottom
DEAD       -> Floats belly-up at the water surface
```

## Tank Rendering

- Background: Light blue gradient + sandy bottom
- Water surface: Wave animation based on sine waves
- Bubbles: Randomly rising particle effects

## Sprite Sheet Specification

One PNG per color variation (frames arranged horizontally in a single row):

```
[swim0][swim1][swim2][swim3]
 index:  0      1      2      3
```

- Source art size: 16x16px per frame (scaled by integer multiples at display time)
- Swimming: 4-frame loop (index 0-3)
- Eating / resting / dead: Reuses index 0 (first swimming frame)
- Only left-facing sprites are created. Code flips horizontally for rightward movement
- On death, code flips vertically + applies semi-transparency
