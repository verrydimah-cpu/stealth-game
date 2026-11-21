// Shadow Ledger — the level: grid queries, collision and line of sight.
// One job: answer questions about the map, never draw or decide anything.
import { COLS, MAP, ROWS, TILE } from './config.js';

export const TILE_WALL = '#';
export const TILE_CRATE = 'C';
export const TILE_SHADOW = 'S';

export function tileAt(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return MAP[row][col];
}

export function isSolidTile(col, row) {
  const t = tileAt(col, row);
  return t === '#' || t === 'C';
}

export function isShadowTile(col, row) {
  return tileAt(col, row) === 'S';
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

// True when the point (px) sits inside a solid tile.
export function pointBlocked(x, y) {
  return isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

// Circle (x, y, r) against solid tiles: slide along one axis at a time.
export function moveCircle(x, y, r, dx, dy) {
  let nx = x + dx;
  if (dx !== 0) {
    const top = Math.floor((y - r) / TILE);
    const bottom = Math.floor((y + r) / TILE);
    const edge = dx > 0 ? Math.floor((nx + r) / TILE) : Math.floor((nx - r) / TILE);
    for (let row = top; row <= bottom; row++) {
      if (isSolidTile(edge, row)) {
        nx = dx > 0 ? edge * TILE - r - 0.01 : (edge + 1) * TILE + r + 0.01;
        break;
      }
    }
  }
  let ny = y + dy;
  if (dy !== 0) {
    const left = Math.floor((nx - r) / TILE);
    const right = Math.floor((nx + r) / TILE);
    const edge = dy > 0 ? Math.floor((ny + r) / TILE) : Math.floor((ny - r) / TILE);
    for (let col = left; col <= right; col++) {
      if (isSolidTile(col, edge)) {
        ny = dy > 0 ? edge * TILE - r - 0.01 : (edge + 1) * TILE + r + 0.01;
        break;
      }
    }
  }
  return { x: nx, y: ny };
}

// Line of sight: sample the segment; a solid tile anywhere blocks it.
export function lineOfSight(x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

// Is the point (px) standing in a shadow patch?
export function inShadow(x, y) {
  return isShadowTile(Math.floor(x / TILE), Math.floor(y / TILE));
}

// Breadth-first reachability over walkable tiles (used by the playtest).
export function reachable(fromCol, fromRow, toCol, toRow) {
  const key = (c, r) => r * COLS + c;
  const seen = new Set([key(fromCol, fromRow)]);
  const queue = [[fromCol, fromRow]];
  while (queue.length) {
    const [c, r] = queue.shift();
    if (c === toCol && r === toRow) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (isSolidTile(nc, nr) || seen.has(key(nc, nr))) continue;
      seen.add(key(nc, nr));
      queue.push([nc, nr]);
    }
  }
  return false;
}
