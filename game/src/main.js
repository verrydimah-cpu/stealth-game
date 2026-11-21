// Shadow Ledger — the game loop: states, suspicion, alarm, win and loss.
// One job: own the game state and step it every frame.
import { EXIT_TILE, LEDGER_TILE, TUNING, VIEW_H, VIEW_W } from './config.js';
import { createInput, keyVector } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuards, detectionRate, guardSeesPlayer, updateGuard } from './guards.js';
import { render, updateHud } from './render.js';
import { inShadow, lineOfSight, tileCenter } from './world.js';
import { initAudio, sfx, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  phase: 'title', // title | playing | won | caught
  player: createPlayer(),
  guards: createGuards(),
  suspicion: 0,
  alarm: false,
  alarmUnseen: 0,
  alarms: 0,
  hasPrize: false,
  ledgerTaken: false,
  elapsed: 0,
  frozen: false, // staged screenshot mode: render once, never step
  ledgerTile: LEDGER_TILE,
  exitTile: EXIT_TILE,
};

const input = createInput(canvas);
input.attach();

function showOverlay(id) {
  for (const name of ['title', 'won', 'caught']) {
    document.getElementById(`overlay-${name}`).hidden = name !== id;
  }
}

function startGame() {
  game.phase = 'playing';
  game.elapsed = 0;
  game.suspicion = 0;
  game.alarm = false;
  game.alarms = 0;
  game.hasPrize = false;
  game.ledgerTaken = false;
  game.player = createPlayer();
  game.guards = createGuards();
  showOverlay(null);
  initAudio();
  sfx.click();
}

function endGame(won) {
  game.phase = won ? 'won' : 'caught';
  if (won) {
    const mins = Math.floor(game.elapsed / 60);
    const secs = Math.floor(game.elapsed % 60);
    document.getElementById('win-stats').textContent =
      `Escaped in ${mins}:${String(secs).padStart(2, '0')} with ${game.alarms} alarm${game.alarms === 1 ? '' : 's'} raised.`;
    sfx.win();
  } else {
    sfx.caught();
  }
  showOverlay(game.phase);
}

// Staged states for screenshots (?shot=cover|close|prize): fixed poses,
// frozen so the frame is identical every time it is captured.
function applyShot(shot) {
  game.phase = 'playing';
  game.frozen = true;
  showOverlay(null);
  const p = game.player;
  const [rook, bishop, knight] = game.guards;
  if (shot === 'cover') {
    // Mid-sneak in the open corridor, a cone sweeping toward the thief.
    p.x = 9.5 * 40;
    p.y = 7.5 * 40;
    p.sneaking = true;
    p.facing = Math.PI;
    bishop.x = 14.5 * 40;
    bishop.y = 6.5 * 40;
    bishop.facing = Math.PI;
    rook.x = 3.5 * 40;
    rook.y = 3.5 * 40;
    rook.facing = Math.PI / 2;
    game.suspicion = 12;
  } else if (shot === 'close') {
    // A heartbeat from detection: the vault guard turns onto the thief
    // reaching for the ledger one tile below him (clear of the crate).
    p.x = 12.5 * 40;
    p.y = 13.5 * 40;
    p.sneaking = true;
    p.facing = -Math.PI / 2;
    knight.x = 12.5 * 40;
    knight.y = 11.5 * 40;
    knight.facing = Math.PI / 2;
    knight.state = 'investigate';
    game.suspicion = 78;
  } else if (shot === 'prize') {
    // The ledger lifts off its plinth; the exit glows green.
    const led = tileCenter(LEDGER_TILE.col, LEDGER_TILE.row);
    p.x = led.x;
    p.y = led.y;
    p.facing = Math.PI / 2;
    game.hasPrize = true;
    game.ledgerTaken = true;
    bishop.x = 16.5 * 40;
    bishop.y = 6.5 * 40;
    bishop.facing = Math.PI;
    knight.x = 9.5 * 40;
    knight.y = 11.5 * 40;
    knight.facing = 0;
    game.suspicion = 25;
  }
}

function update(dt) {
  const { player } = game;
  player.sneaking = input.sneak;
  const step = updatePlayer(player, dt, keyVector(input), input.consumeClick());
  if (step === 'step') sfx.step();

  // Suspicion: any guard with eyes on the thief raises it.
  let seen = false;
  let rate = 0;
  for (const guard of game.guards) {
    if (guardSeesPlayer(guard, player)) {
      seen = true;
      rate = Math.max(rate, detectionRate(guard, player));
    }
  }
  if (seen) {
    const before = game.suspicion;
    game.suspicion = Math.min(100, game.suspicion + rate * dt);
    if (before < TUNING.investigateAt && game.suspicion >= TUNING.investigateAt) sfx.investigate();
    if (before < TUNING.alarmAt && game.suspicion >= TUNING.alarmAt) {
      game.alarm = true;
      game.alarms += 1;
      game.alarmUnseen = 0;
      sfx.spotted();
    }
  } else {
    game.suspicion = Math.max(0, game.suspicion - (game.alarm ? 0 : TUNING.detectDecay) * dt);
  }

  // Alarm: while it lasts the guards chase; break sight and it cools off.
  if (game.alarm) {
    if (seen) {
      game.alarmUnseen = 0;
    } else {
      game.alarmUnseen += dt;
      if (game.alarmUnseen >= TUNING.alarmCooldown) {
        game.alarm = false;
        game.alarmUnseen = 0;
      }
    }
  }

  // Noisy running draws nearby guards to the thief's position.
  if (player.noisePulse > 0.9 && player.running) {
    for (const guard of game.guards) {
      const d = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (d < TUNING.noiseRadius && guard.state === 'patrol') {
        guard.state = 'investigate';
        guard.target = { x: player.x, y: player.y };
        guard.stateTime = 0;
      }
    }
  }

  for (const guard of game.guards) {
    const event = updateGuard(guard, dt, game);
    if (event === 'caught') {
      endGame(false);
      return;
    }
  }

  // The ledger, then the exit.
  const led = tileCenter(LEDGER_TILE.col, LEDGER_TILE.row);
  if (!game.ledgerTaken && Math.hypot(player.x - led.x, player.y - led.y) < TUNING.grabDistance) {
    game.ledgerTaken = true;
    game.hasPrize = true;
    sfx.pickup();
  }
  if (game.hasPrize) {
    const exit = tileCenter(EXIT_TILE.col, EXIT_TILE.row);
    if (Math.hypot(player.x - exit.x, player.y - exit.y) < TUNING.exitDistance) {
      endGame(true);
      return;
    }
  }

  game.elapsed += dt;
  updateHud(game);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.phase === 'playing' && !game.frozen) update(dt);
  render(ctx, game, now / 1000);
  // The HUD refreshes every frame, including frozen staged screenshots.
  updateHud(game);
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  initAudio();
  if (event.code === 'KeyM') toggleMute();
  if (game.phase === 'title' && (event.code === 'Enter' || event.code === 'Space')) {
    event.preventDefault();
    startGame();
  } else if ((game.phase === 'won' || game.phase === 'caught') && event.code === 'KeyR') {
    startGame();
  }
});
canvas.addEventListener('mousedown', () => initAudio());

// Debug handle for the automated playtest (read-only state, no cheats).
window.__shadowLedger = {
  game,
  state() {
    return {
      phase: game.phase,
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
      suspicion: Math.round(game.suspicion),
      alarm: game.alarm,
      alarms: game.alarms,
      hasPrize: game.hasPrize,
      shadow: inShadow(game.player.x, game.player.y),
      guards: game.guards.map((g) => ({
        name: g.name,
        state: g.state,
        sees: g.seesPlayer,
        x: Math.round(g.x),
        y: Math.round(g.y),
        facing: Math.round(g.facing * 100) / 100,
      })),
    };
  },
};

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot === 'cover' || shot === 'close' || shot === 'prize') {
  applyShot(shot);
} else {
  showOverlay('title');
}
updateHud(game);
render(ctx, game, 0);
requestAnimationFrame(frame);
