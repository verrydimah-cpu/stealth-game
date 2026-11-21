// Shadow Ledger — the guards: patrols, vision cones, suspicion and alarm.
// One job: move the guards and decide what they can see.
import { GUARD_DEFS, TUNING } from './config.js';
import { inShadow, lineOfSight, moveCircle, tileCenter } from './world.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createGuards() {
  return GUARD_DEFS.map((def) => {
    const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
    return {
      name: def.name,
      waypoints: def.waypoints.map(([c, r]) => tileCenter(c, r)),
      speed: def.speed,
      x: start.x,
      y: start.y,
      facing: 0,
      waypointIndex: 1,
      patrolDir: 1,
      state: 'patrol', // patrol | pause | investigate | scan | chase | return
      stateTime: 0,
      target: null, // {x, y} for investigate / chase
      seesPlayer: false,
      lastSeen: null,
    };
  });
}

// Can this guard see the player right now? Cone + range + line of sight.
export function guardSeesPlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > TUNING.coneRange) return false;
  if (dist > 1 && Math.abs(angleDiff(Math.atan2(dy, dx), guard.facing)) > TUNING.coneHalfAngle) {
    return false;
  }
  return lineOfSight(guard.x, guard.y, player.x, player.y);
}

// How fast suspicion climbs while this guard watches the player.
export function detectionRate(guard, player) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  let rate = TUNING.detectBase * (1.15 - (dist / TUNING.coneRange) * 0.75);
  if (player.sneaking) rate *= 0.45;
  if (inShadow(player.x, player.y)) rate *= 0.4;
  if (!player.moving) rate *= 0.8;
  return rate;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  // Guards slide around walls and crates like the thief does.
  const next = moveCircle(guard.x, guard.y, 12, (dx / dist) * step, (dy / dist) * step);
  const moved = Math.hypot(next.x - guard.x, next.y - guard.y);
  guard.x = next.x;
  guard.y = next.y;
  if (moved > 0.01) guard.facing = Math.atan2(dy, dx);
  return dist - step < 4;
}

// Step one guard. Returns an event string ('alarm' | 'investigate' | null).
export function updateGuard(guard, dt, game) {
  const { player } = game;
  guard.stateTime += dt;
  guard.seesPlayer = guardSeesPlayer(guard, player);

  if (guard.seesPlayer) {
    guard.lastSeen = { x: player.x, y: player.y };
    if (game.alarm) {
      guard.state = 'chase';
      guard.target = { x: player.x, y: player.y };
    } else if (game.suspicion >= TUNING.investigateAt) {
      guard.state = 'investigate';
      guard.target = { ...guard.lastSeen };
    }
  }

  switch (guard.state) {
    case 'patrol': {
      const wp = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, wp.x, wp.y, guard.speed, dt)) {
        guard.state = 'pause';
        guard.stateTime = 0;
      }
      break;
    }
    case 'pause': {
      // Look around at the end of a patrol leg before moving on.
      guard.facing += dt * 1.6;
      if (guard.stateTime > 0.9) {
        guard.waypointIndex += guard.patrolDir;
        if (guard.waypointIndex >= guard.waypoints.length || guard.waypointIndex < 0) {
          guard.patrolDir *= -1;
          guard.waypointIndex += guard.patrolDir * 2;
        }
        guard.state = 'patrol';
        guard.stateTime = 0;
      }
      break;
    }
    case 'investigate': {
      if (guard.target && moveToward(guard, guard.target.x, guard.target.y, TUNING.guardInvestigate, dt)) {
        guard.state = 'scan';
        guard.stateTime = 0;
      }
      // Give up looking if the spot cannot be reached (walled off).
      if (guard.stateTime > 4) {
        guard.state = 'scan';
        guard.stateTime = 0;
      }
      break;
    }
    case 'scan': {
      guard.facing += dt * 2.2;
      if (guard.stateTime > 2 || guard.seesPlayer) {
        guard.state = 'return';
        guard.stateTime = 0;
        guard.target = null;
      }
      break;
    }
    case 'chase': {
      if (guard.target) moveToward(guard, guard.target.x, guard.target.y, TUNING.guardChase, dt);
      if (!game.alarm) {
        guard.state = 'return';
        guard.stateTime = 0;
        guard.target = null;
      }
      break;
    }
    case 'return': {
      // Walk back to the nearest patrol waypoint, then resume the route.
      let best = 0;
      let bestDist = Infinity;
      guard.waypoints.forEach((wp, i) => {
        const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const wp = guard.waypoints[best];
      if (moveToward(guard, wp.x, wp.y, guard.speed, dt)) {
        guard.waypointIndex = best;
        guard.state = 'patrol';
        guard.stateTime = 0;
      }
      // Give up the walk home if the waypoint cannot be reached.
      if (guard.stateTime > 6) {
        guard.waypointIndex = best;
        guard.state = 'patrol';
        guard.stateTime = 0;
      }
      break;
    }
    default:
      guard.state = 'patrol';
  }

  // A guard close enough to touch the thief catches them.
  if (Math.hypot(player.x - guard.x, player.y - guard.y) < TUNING.catchDistance) {
    return 'caught';
  }
  return null;
}
