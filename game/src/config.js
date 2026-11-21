// Shadow Ledger — tuning, level layout and guard patrols.
// One job: every number and tile that defines the museum level.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Legend: # wall, . floor, S shadow floor, C crate (cover, blocks sight),
// P player start, L the ledger (prize), E exit.
export const MAP = [
  '########################',
  '#......#.......#......E#',
  '#..S...#...C...#..S....#',
  '#......#.......#.......#',
  '#..C...#...S...#..C....#',
  '#......#.......#.......#',
  '#..S...............S...#',
  '#......#...C...#.......#',
  '###.####...####.####.###',
  '#......#.......#.......#',
  '#..C...#...S...#..C....#',
  '#......#.......#.......#',
  '#..S...#...C...#..S....#',
  '#......#.......#.......#',
  '#P.....#...L...#..C....#',
  '########################',
];

export const PLAYER_START = { col: 1, row: 14 };
export const LEDGER_TILE = { col: 11, row: 14 };
export const EXIT_TILE = { col: 22, row: 1 };

// Patrols ping-pong along their waypoint lists (tile coordinates).
export const GUARD_DEFS = [
  { name: 'Rook', waypoints: [[2, 2], [5, 2], [5, 5], [2, 5]], speed: 52 },
  // Bishop walks the open east-west corridor, row 6, end to end.
  { name: 'Bishop', waypoints: [[8, 6], [21, 6]], speed: 60 },
  { name: 'Knight', waypoints: [[9, 11], [13, 11], [13, 13], [9, 13]], speed: 52 },
  { name: 'Queen', waypoints: [[18, 10], [21, 10], [21, 13], [18, 13]], speed: 58 },
];

export const TUNING = {
  playerWalk: 118, // px per second, running
  playerSneak: 62, // px per second, holding Shift
  guardChase: 102,
  guardInvestigate: 78,
  coneRange: 195, // guard sight distance in px
  coneHalfAngle: 0.62, // ~35 degrees each side
  detectBase: 62, // suspicion per second at point blank
  detectDecay: 26, // suspicion per second while unseen
  alarmDecay: 42, // suspicion per second after the alarm ends
  investigateAt: 55, // suspicion where a guard walks over to look
  alarmAt: 100,
  alarmCooldown: 4, // seconds unseen before the alarm ends
  noiseRadius: 95, // running footsteps heard this far
  catchDistance: 17, // a guard this close catches the thief
  grabDistance: 26, // close enough to lift the ledger
  exitDistance: 26, // close enough to slip out
};
