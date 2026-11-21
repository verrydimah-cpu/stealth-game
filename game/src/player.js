// Shadow Ledger — the thief: movement, sneaking and noisy footsteps.
// One job: move the player and say how loud they are being.
import { PLAYER_START, TUNING } from './config.js';
import { moveCircle, tileCenter } from './world.js';

export const PLAYER_RADIUS = 13;

export function createPlayer() {
  const start = tileCenter(PLAYER_START.col, PLAYER_START.row);
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2, // facing up the museum at the start
    sneaking: false,
    moving: false,
    running: false,
    moveTarget: null, // click-to-move destination {x, y}
    stepTime: 0, // counts down to the next footstep noise pulse
    noisePulse: 0, // 0..1, drawn as an expanding ring when running
  };
}

// Keyboard vector, else steer toward the click target. Returns the
// direction moved this frame (0,0 when standing still).
export function updatePlayer(player, dt, keyVec, click) {
  if (click) player.moveTarget = click;
  let vx = keyVec.x;
  let vy = keyVec.y;
  if (vx === 0 && vy === 0 && player.moveTarget) {
    const dx = player.moveTarget.x - player.x;
    const dy = player.moveTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      player.moveTarget = null;
    } else {
      vx = dx / dist;
      vy = dy / dist;
    }
  }
  // Any key press cancels a click-to-move order.
  if (keyVec.x !== 0 || keyVec.y !== 0) player.moveTarget = null;

  player.moving = vx !== 0 || vy !== 0;
  player.running = player.moving && !player.sneaking;
  if (player.moving) {
    const speed = player.sneaking ? TUNING.playerSneak : TUNING.playerWalk;
    const next = moveCircle(player.x, player.y, PLAYER_RADIUS, vx * speed * dt, vy * speed * dt);
    player.x = next.x;
    player.y = next.y;
    player.facing = Math.atan2(vy, vx);
  }

  // Footsteps: a running thief is heard, a sneaking one is not.
  player.noisePulse = Math.max(0, player.noisePulse - dt * 2.2);
  if (player.running) {
    player.stepTime -= dt;
    if (player.stepTime <= 0) {
      player.stepTime = 0.42;
      player.noisePulse = 1;
      return 'step';
    }
  } else {
    player.stepTime = 0;
  }
  return null;
}
