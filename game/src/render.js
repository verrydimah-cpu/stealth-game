// Shadow Ledger — drawing: the museum floor, cones, guards, thief and HUD.
// One job: turn the game state into pixels on the canvas.
import { COLS, MAP, ROWS, TILE, TUNING, VIEW_H, VIEW_W } from './config.js';
import { pointBlocked, tileCenter } from './world.js';
import { PLAYER_RADIUS } from './player.js';

const FLOOR_A = '#232a3d';
const FLOOR_B = '#202635';
const WALL = '#11141d';
const WALL_EDGE = '#39415e';
const SHADOW_FILL = 'rgba(4, 6, 12, 0.55)';
const CRATE = '#5a4632';
const CRATE_EDGE = '#8a6f4d';

function coneColor(suspicion, alarm) {
  if (alarm) return 'rgba(255, 64, 48, 0.34)';
  const t = Math.min(1, suspicion / 100);
  const r = Math.round(255 - (255 - 240) * (1 - t));
  const g = Math.round(214 - 150 * t);
  return `rgba(${r}, ${g}, 80, ${0.22 + 0.12 * t})`;
}

// The cone's outline, clipped by walls and crates: march a ray along each
// edge angle until it hits something solid, so light never leaks through a wall.
function coneOutline(guard) {
  const range = TUNING.coneRange;
  const half = TUNING.coneHalfAngle;
  const steps = 28;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = guard.facing - half + (2 * half * i) / steps;
    let d = range;
    for (let r = 8; r <= range; r += 6) {
      if (pointBlocked(guard.x + Math.cos(a) * r, guard.y + Math.sin(a) * r)) {
        d = r;
        break;
      }
    }
    pts.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
  }
  return pts;
}

function drawCone(ctx, guard, suspicion, alarm) {
  const range = TUNING.coneRange;
  const pts = coneOutline(guard);
  const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, range);
  grad.addColorStop(0, coneColor(suspicion, alarm));
  grad.addColorStop(1, 'rgba(255, 220, 90, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  // Cone edge lines, so the field of view reads at a glance.
  ctx.strokeStyle = alarm ? 'rgba(255, 80, 60, 0.55)' : 'rgba(255, 220, 110, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(pts[0].x, pts[0].y);
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
}

function drawGuard(ctx, guard, suspicion, alarm) {
  const alerted = alarm || suspicion >= TUNING.investigateAt;
  // Body: a night-watchman in a dark uniform with a pale cap.
  ctx.fillStyle = alerted ? '#8c2f26' : '#2e4a6b';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alerted ? '#ff6a55' : '#7fa3d0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cap brim points where the guard looks.
  ctx.fillStyle = '#d8cdb4';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 8, guard.y + Math.sin(guard.facing) * 8, 5, 0, Math.PI * 2);
  ctx.fill();
  // "!" when the guard is suspicious or chasing.
  if (alerted) {
    ctx.fillStyle = alarm ? '#ff5040' : '#ffd75e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(alarm ? '!' : '?', guard.x, guard.y - 20);
  }
}

function drawPlayer(ctx, player, hasPrize) {
  // The thief: a hooded figure, cloak dark, hood up when sneaking.
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facing);
  ctx.fillStyle = player.sneaking ? '#3d2f5b' : '#4a3560';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b79ce0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e8ddff';
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The stolen ledger glows at the thief's belt once grabbed.
  if (hasPrize) {
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(player.x - 10, player.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Footstep noise ring while running.
  if (player.noisePulse > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * player.noisePulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS + (1 - player.noisePulse) * TUNING.noiseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLedger(ctx, x, y, time) {
  const bob = Math.sin(time * 2.4) * 3;
  const glow = ctx.createRadialGradient(x, y + bob, 4, x, y + bob, 46);
  glow.addColorStop(0, 'rgba(255, 215, 94, 0.55)');
  glow.addColorStop(1, 'rgba(255, 215, 94, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + bob, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(x - 13, y - 17 + bob, 26, 34);
  ctx.fillStyle = '#f4d35e';
  ctx.fillRect(x - 10, y - 14 + bob, 20, 28);
  ctx.fillStyle = '#7a5c10';
  ctx.fillRect(x - 6, y - 8 + bob, 12, 3);
  ctx.fillRect(x - 6, y - 1 + bob, 12, 3);
  ctx.fillRect(x - 6, y + 6 + bob, 12, 3);
}

function drawExit(ctx, x, y, hasPrize, time) {
  const open = hasPrize;
  const pulse = open ? 0.55 + Math.sin(time * 3) * 0.2 : 0.18;
  ctx.fillStyle = `rgba(64, 220, 120, ${pulse})`;
  ctx.fillRect(x - TILE / 2 + 2, y - TILE / 2 + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = open ? '#7dffab' : '#3a7d54';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - TILE / 2 + 3, y - TILE / 2 + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = open ? '#d8ffe4' : '#9fc7ae';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', x, y + 4);
}

export function render(ctx, game, time) {
  const { player, guards, suspicion, alarm, hasPrize, ledgerTaken } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // Floor: a chequered marble hall.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }
  // Shadow patches: dark pools where the thief is hard to spot.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (MAP[row][col] !== 'S') continue;
      ctx.fillStyle = SHADOW_FILL;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      ctx.strokeStyle = 'rgba(120, 140, 200, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(col * TILE + 0.5, row * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Exit and the ledger.
  const exit = tileCenter(game.exitTile.col, game.exitTile.row);
  drawExit(ctx, exit.x, exit.y, hasPrize, time);
  if (!ledgerTaken) {
    const led = tileCenter(game.ledgerTile.col, game.ledgerTile.row);
    drawLedger(ctx, led.x, led.y, time);
  }
  // Crates and walls.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = MAP[row][col];
      if (t === 'C') {
        ctx.fillStyle = CRATE;
        ctx.fillRect(col * TILE + 3, row * TILE + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = CRATE_EDGE;
        ctx.lineWidth = 2;
        ctx.strokeRect(col * TILE + 4, row * TILE + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(col * TILE + 4, row * TILE + 4);
        ctx.lineTo((col + 1) * TILE - 4, (row + 1) * TILE - 4);
        ctx.stroke();
      } else if (t === '#') {
        ctx.fillStyle = WALL;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
        ctx.strokeStyle = WALL_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(col * TILE + 0.5, row * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }
  }
  // Vision cones under the guards, then the guards, then the thief.
  for (const guard of guards) drawCone(ctx, guard, suspicion, alarm);
  for (const guard of guards) drawGuard(ctx, guard, suspicion, alarm);
  drawPlayer(ctx, player, hasPrize);

  // Soft night vignette so the lit cones read as light.
  const vg = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95,
  );
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// HUD text and meters live in the DOM; this keeps them in sync.
export function updateHud(game) {
  const objective = document.getElementById('objective');
  const meter = document.getElementById('suspicion-fill');
  const meterLabel = document.getElementById('suspicion-label');
  const timer = document.getElementById('timer');
  const alarm = document.getElementById('alarm');
  if (!objective) return;
  objective.textContent = game.hasPrize
    ? 'Ledger stolen — reach the green EXIT, unseen.'
    : 'Steal the golden Ledger, then reach the EXIT.';
  meter.style.width = `${Math.round(game.suspicion)}%`;
  meter.style.background = game.alarm
    ? '#ff5040'
    : game.suspicion >= 55 ? '#ff9a3d' : '#ffd75e';
  meterLabel.textContent = game.alarm
    ? 'ALARM'
    : game.suspicion >= 55 ? 'SUSPICIOUS' : 'UNSEEN';
  const t = Math.floor(game.elapsed);
  timer.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  alarm.hidden = !game.alarm;
}
