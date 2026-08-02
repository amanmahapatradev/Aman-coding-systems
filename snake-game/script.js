/* ════════════════════════════════════════════════════════════
   NEON SNAKE – script.js
   Pure Vanilla JS. No frameworks. No external deps.
════════════════════════════════════════════════════════════ */

// ── Constants ────────────────────────────────────────────────
const CELL        = 20;          // grid cell size in px
const COLS        = 24;          // grid columns
const ROWS        = 24;          // grid rows
const CANVAS_SIZE = CELL * COLS; // 480 px

// Speed (ms per tick) by difficulty
const SPEED = { easy: 160, medium: 110, hard: 70 };

// How many points before levelling up
const LEVEL_STEP = 50;

// Power-up types
const POWERUPS = ['speed_boost', 'slow', 'double_score', 'shrink'];

// Neon colours for food
const FOOD_COLORS = ['#ff2d78', '#00f5ff', '#ffe600', '#bf5fff', '#ff6b35'];

// ── localStorage keys ────────────────────────────────────────
const LS_BEST   = 'neonSnake_best';
const LS_SCORES = 'neonSnake_scores';

// ── DOM refs ─────────────────────────────────────────────────
const screens = {
  start:    document.getElementById('screen-start'),
  game:     document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover'),
};

const canvas  = document.getElementById('game-canvas');
const ctx     = canvas.getContext('2d');

// Set fixed canvas size
canvas.width  = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Scale the canvas-frame so it fits small screens
function scaleCanvas() {
  const frame = canvas.parentElement;
  if (!frame) return;
  const maxPx = Math.min(window.innerWidth * 0.94, window.innerHeight * 0.52, CANVAS_SIZE);
  const scale = maxPx / CANVAS_SIZE;
  frame.style.width  = (CANVAS_SIZE * scale) + 'px';
  frame.style.height = (CANVAS_SIZE * scale) + 'px';
  canvas.style.width  = '100%';
  canvas.style.height = '100%';
}
scaleCanvas();
window.addEventListener('resize', scaleCanvas);

// ── Audio (Web Audio API – no files needed) ──────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audio;
try { audio = new AudioCtx(); } catch (_) { audio = null; }

function beep(freq, type, duration, vol = 0.3) {
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();
  const osc  = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  gain.gain.setValueAtTime(vol, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

const sfx = {
  eat:    () => { beep(520, 'square', 0.08); beep(780, 'square', 0.12); },
  die:    () => { beep(200, 'sawtooth', 0.4, 0.4); beep(100, 'sawtooth', 0.6, 0.4); },
  click:  () => beep(440, 'sine', 0.07, 0.2),
  level:  () => { beep(660, 'square', 0.15); beep(880, 'square', 0.2); },
  power:  () => { beep(1000, 'sine', 0.05); beep(1400, 'sine', 0.1); },
};

// ── Game state ───────────────────────────────────────────────
let state = {
  screen:      'start',   // 'start' | 'game' | 'gameover'
  difficulty:  'easy',
  mode:        'classic', // 'classic' | 'obstacles'
  snake:       [],        // [{x,y}, …]  head = [0]
  dir:         { x: 1, y: 0 },
  nextDir:     { x: 1, y: 0 },
  food:        null,      // {x, y, color}
  powerUp:     null,      // {x, y, type, timer}
  obstacles:   [],        // [{x,y}, …]
  score:       0,
  level:       1,
  paused:      false,
  running:     false,
  doubleScore: false,
  speedBoost:  false,
  slowActive:  false,
  doubleScoreTimer: 0,
  speedBoostTimer:  0,
  slowActiveTimer:  0,
};

let rafId   = null;   // requestAnimationFrame id
let lastTick = 0;     // timestamp of last game tick

// ── Screen switcher ──────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  state.screen = name;
}

// ── Helpers ──────────────────────────────────────────────────
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function cellOccupied(x, y, extraList = []) {
  if (state.snake.some(s => s.x === x && s.y === y)) return true;
  if (extraList.some(o => o.x === x && o.y === y))    return true;
  return false;
}

function randomCell(extra = []) {
  let x, y;
  do { x = rng(0, COLS - 1); y = rng(0, ROWS - 1); }
  while (cellOccupied(x, y, extra));
  return { x, y };
}

function randomFoodColor() {
  return FOOD_COLORS[rng(0, FOOD_COLORS.length - 1)];
}

// ── Obstacle generation ──────────────────────────────────────
function generateObstacles() {
  if (state.mode !== 'obstacles') { state.obstacles = []; return; }
  const count = 8 + state.level * 2;
  state.obstacles = [];
  for (let i = 0; i < count; i++) {
    const cell = randomCell(state.obstacles);
    // Keep centre clear for snake start
    if (Math.abs(cell.x - 12) < 3 && Math.abs(cell.y - 12) < 3) { i--; continue; }
    state.obstacles.push(cell);
  }
}

// ── Init / Reset ─────────────────────────────────────────────
function initGame() {
  // Snake starts at centre, 3 segments, moving right
  state.snake   = [{ x: 13, y: 12 }, { x: 12, y: 12 }, { x: 11, y: 12 }];
  state.dir     = { x: 1, y: 0 };
  state.nextDir = { x: 1, y: 0 };
  state.score   = 0;
  state.level   = 1;
  state.paused  = false;
  state.running = true;
  state.doubleScore = false;
  state.speedBoost  = false;
  state.slowActive  = false;
  state.doubleScoreTimer = 0;
  state.speedBoostTimer  = 0;
  state.slowActiveTimer  = 0;
  state.powerUp     = null;

  generateObstacles();

  state.food = { ...randomCell(state.obstacles), color: randomFoodColor() };

  updateHUD();
  hidePauseOverlay();
}

// ── HUD updates ───────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-score').textContent = state.score;
  document.getElementById('hud-best').textContent  = getBest();
  document.getElementById('hud-level').textContent = state.level;
}

// ── LocalStorage helpers ──────────────────────────────────────
function getBest() {
  try {
    return parseInt(localStorage.getItem(LS_BEST) || '0', 10);
  } catch (e) {
    return 0;
  }
}

function saveScore(score) {
  try {
    const prev = getBest();
    if (score > prev) localStorage.setItem(LS_BEST, score);

    const list = getLeaderboard();
    list.push(score);
    list.sort((a, b) => b - a);
    localStorage.setItem(LS_SCORES, JSON.stringify(list.slice(0, 10)));
  } catch (e) {
    // Ignore storage errors
  }
}

function getLeaderboard() {
  try {
    const data = localStorage.getItem(LS_SCORES);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed : [];
  }
  catch (_) { return []; }
}

// ── Game speed (ms per tick) ──────────────────────────────────
function tickInterval() {
  let base = SPEED[state.difficulty];
  if (state.speedBoost) base *= 0.55;
  if (state.slowActive) base *= 1.7;
  // Level increases speed by 5 ms per level (min 40)
  base = Math.max(40, base - (state.level - 1) * 5);
  return base;
}

// ── Main game loop (requestAnimationFrame) ────────────────────
function gameLoop(timestamp) {
  rafId = requestAnimationFrame(gameLoop);

  if (state.paused || !state.running) return;

  if (timestamp - lastTick < tickInterval()) return;
  lastTick = timestamp;

  tick();
}

// ── One game tick ─────────────────────────────────────────────
function tick() {
  // Commit next direction
  state.dir = { ...state.nextDir };

  // New head position
  const head  = state.snake[0];
  const newHead = {
    x: (head.x + state.dir.x + COLS) % COLS,
    y: (head.y + state.dir.y + ROWS) % ROWS,
  };

  // Wall collision (wrap disabled for hard mode)
  if (state.difficulty === 'hard') {
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      gameOver(); return;
    }
    // Recalculate without wrap
    newHead.x = head.x + state.dir.x;
    newHead.y = head.y + state.dir.y;
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      gameOver(); return;
    }
  }

  // Self collision (excluding the tail if the snake won't grow/eat in this tick)
  const willEat = newHead.x === state.food.x && newHead.y === state.food.y;
  const selfCollisionSegments = willEat ? state.snake : state.snake.slice(0, -1);
  if (selfCollisionSegments.some(s => s.x === newHead.x && s.y === newHead.y)) {
    gameOver(); return;
  }

  // Obstacle collision
  if (state.obstacles.some(o => o.x === newHead.x && o.y === newHead.y)) {
    gameOver(); return;
  }

  // Move snake
  state.snake.unshift(newHead);

  // Food collision
  let ate = false;
  if (newHead.x === state.food.x && newHead.y === state.food.y) {
    ate = true;
    const pts = state.doubleScore ? 20 : 10;
    state.score += pts;
    sfx.eat();

    // Level up
    const newLevel = Math.floor(state.score / LEVEL_STEP) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      sfx.level();
      if (state.mode === 'obstacles') generateObstacles();
    }

    // Spawn new food
    state.food = { ...randomCell(state.obstacles), color: randomFoodColor() };

    // Random chance to spawn a power-up (20%)
    if (!state.powerUp && Math.random() < 0.20) {
      spawnPowerUp();
    }

    updateHUD();
  }

  // Power-up collision
  if (state.powerUp && newHead.x === state.powerUp.x && newHead.y === state.powerUp.y) {
    activatePowerUp(state.powerUp.type);
    state.powerUp = null;
  }

  // Decrement power-up timer
  if (state.powerUp) {
    state.powerUp.timer--;
    if (state.powerUp.timer <= 0) state.powerUp = null;
  }

  // Decrement active power-up durations
  if (state.speedBoostTimer > 0) {
    state.speedBoostTimer--;
    if (state.speedBoostTimer <= 0) state.speedBoost = false;
  }
  if (state.slowActiveTimer > 0) {
    state.slowActiveTimer--;
    if (state.slowActiveTimer <= 0) state.slowActive = false;
  }
  if (state.doubleScoreTimer > 0) {
    state.doubleScoreTimer--;
    if (state.doubleScoreTimer <= 0) state.doubleScore = false;
  }

  if (!ate) state.snake.pop(); // remove tail only if didn't eat

  draw();
}

// ── Power-ups ─────────────────────────────────────────────────
function spawnPowerUp() {
  const type = POWERUPS[rng(0, POWERUPS.length - 1)];
  const cell = randomCell([...state.obstacles, state.food]);
  state.powerUp = { ...cell, type, timer: 40 }; // vanishes after 40 ticks
}

function activatePowerUp(type) {
  sfx.power();
  if (type === 'speed_boost') {
    state.speedBoost = true;
    state.speedBoostTimer = 40; // ~4 seconds at 100ms average tick
  } else if (type === 'slow') {
    state.slowActive = true;
    state.slowActiveTimer = 40;
  } else if (type === 'double_score') {
    state.doubleScore = true;
    state.doubleScoreTimer = 60; // ~6 seconds
  } else if (type === 'shrink') {
    // Remove last 3 segments
    state.snake.splice(Math.max(1, state.snake.length - 3));
  }
}

const POWERUP_COLORS = {
  speed_boost:  '#ffe600',
  slow:         '#00f5ff',
  double_score: '#39ff14',
  shrink:       '#bf5fff',
};
const POWERUP_LABELS = {
  speed_boost:  '⚡',
  slow:         '❄',
  double_score: '✕2',
  shrink:       '↓',
};

// ── Drawing ───────────────────────────────────────────────────
function draw() {
  // Clear
  ctx.fillStyle = '#050b12';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawGrid();
  drawObstacles();
  drawFood();
  drawPowerUp();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(15,42,61,0.6)';
  ctx.lineWidth   = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, CANVAS_SIZE);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(CANVAS_SIZE, r * CELL);
    ctx.stroke();
  }
}

function drawObstacles() {
  ctx.fillStyle = '#bf5fff';
  state.obstacles.forEach(o => {
    const x = o.x * CELL + 2;
    const y = o.y * CELL + 2;
    const s = CELL - 4;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#bf5fff';
    ctx.fillRect(x, y, s, s);
    ctx.shadowBlur  = 0;
  });
}

function drawFood() {
  const { x, y, color } = state.food;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r  = CELL / 2 - 2;
  const t  = Date.now() / 400;

  ctx.save();
  ctx.shadowBlur  = 18 + Math.sin(t) * 6;
  ctx.shadowColor = color;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerUp() {
  if (!state.powerUp) return;
  const { x, y, type } = state.powerUp;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const color = POWERUP_COLORS[type];
  const label = POWERUP_LABELS[type];
  const t = Date.now() / 300;

  ctx.save();
  ctx.shadowBlur  = 14 + Math.sin(t) * 6;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font      = `${CELL * 0.55}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.restore();
}

function drawSnake() {
  state.snake.forEach((seg, i) => {
    const x = seg.x * CELL + 1;
    const y = seg.y * CELL + 1;
    const s = CELL - 2;

    // Gradient from bright head to dimmer tail
    const ratio = i / state.snake.length;
    const alpha = 1 - ratio * 0.6;

    ctx.save();
    if (i === 0) {
      // Head glows more
      ctx.shadowBlur  = 16;
      ctx.shadowColor = '#39ff14';
    } else {
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#39ff14';
    }

    ctx.fillStyle = `rgba(57,255,20,${alpha})`;
    const rr = i === 0 ? 5 : 3;
    roundRect(ctx, x, y, s, s, rr);
    ctx.fill();
    ctx.restore();
  });

  // Eyes on head
  drawEyes();
}

function drawEyes() {
  if (state.snake.length === 0) return;
  const head = state.snake[0];
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  const { x: dx, y: dy } = state.dir;
  const offset = CELL * 0.22;
  const eyeR   = 2.5;

  // Perpendicular offset for two eyes
  const px = -dy * offset;
  const py =  dx * offset;

  // Forward offset
  const fx = dx * offset;
  const fy = dy * offset;

  const eyes = [
    { x: cx + fx + px, y: cy + fy + py },
    { x: cx + fx - px, y: cy + fy - py },
  ];

  ctx.fillStyle = '#050b12';
  eyes.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, eyeR, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── Utility: rounded rect (Canvas 2D polyfill) ────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Game Over ─────────────────────────────────────────────────
function gameOver() {
  state.running = false;
  cancelAnimationFrame(rafId);
  sfx.die();

  const prev = getBest();
  saveScore(state.score);
  const isNew = state.score > 0 && state.score >= prev + 1;

  document.getElementById('go-score').textContent = state.score;
  document.getElementById('go-best').textContent  = getBest();
  document.getElementById('go-level').textContent = state.level;

  const badge = document.getElementById('new-hs-badge');
  badge.classList.toggle('hidden', !isNew);

  buildLeaderboard();
  showScreen('gameover');
}

// ── Leaderboard render ────────────────────────────────────────
function buildLeaderboard() {
  const list = getLeaderboard().slice(0, 5);
  const ol   = document.getElementById('lb-list');
  ol.innerHTML = '';
  if (list.length === 0) {
    ol.innerHTML = '<li style="justify-content:center;color:#4a7a9b">No scores yet</li>';
    return;
  }
  list.forEach((score, i) => {
    const li = document.createElement('li');
    li.innerHTML =
      `<span class="lb-rank">#${i + 1}</span>` +
      `<span class="lb-score">${score}</span>`;
    ol.appendChild(li);
  });
}

// ── Pause / Resume ────────────────────────────────────────────
function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? '▶' : '⏸';
  if (state.paused) {
    document.getElementById('pause-overlay').classList.remove('hidden');
  } else {
    hidePauseOverlay();
    lastTick = performance.now(); // prevent time-skip after resume
  }
}

function hidePauseOverlay() {
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('btn-pause').textContent = '⏸';
}

// ── Start the loop ────────────────────────────────────────────
function startGame() {
  initGame();
  draw();
  lastTick = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
  showScreen('game');
}

// ── Keyboard input ────────────────────────────────────────────
const KEY_MAP = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y:  1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x:  1, y: 0 },
  w:          { x: 0, y: -1 },
  s:          { x: 0, y:  1 },
  a:          { x: -1, y: 0 },
  d:          { x:  1, y: 0 },
};

document.addEventListener('keydown', e => {
  // Prevent page scroll on arrow keys
  if (e.key.startsWith('Arrow')) e.preventDefault();

  // Pause toggle
  if ((e.key === 'p' || e.key === 'P') && state.screen === 'game') {
    togglePause(); return;
  }
  if (e.key === 'Escape' && state.screen === 'game') {
    togglePause(); return;
  }

  // Direction
  const dir = KEY_MAP[e.key];
  if (!dir || state.screen !== 'game' || state.paused) return;

  // Prevent reversing
  if (dir.x === -state.dir.x && dir.y === -state.dir.y) return;
  state.nextDir = dir;
});

// ── Touch / D-pad controls ────────────────────────────────────
function bindDpad() {
  const map = {
    'd-up':    { x: 0, y: -1 },
    'd-down':  { x: 0, y:  1 },
    'd-left':  { x: -1, y: 0 },
    'd-right': { x:  1, y: 0 },
  };
  Object.entries(map).forEach(([id, dir]) => {
    const btn = document.getElementById(id);
    const setDir = () => {
      if (state.paused) return;
      if (dir.x === -state.dir.x && dir.y === -state.dir.y) return;
      state.nextDir = dir;
    };
    btn.addEventListener('touchstart', e => { e.preventDefault(); setDir(); }, { passive: false });
    btn.addEventListener('mousedown', setDir);
  });
}
bindDpad();

// ── Swipe support ─────────────────────────────────────────────
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    dir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }
  if (dir.x === -state.dir.x && dir.y === -state.dir.y) return;
  state.nextDir = dir;
}, { passive: true });

// ── Button event listeners ─────────────────────────────────────
// Difficulty buttons
document.querySelectorAll('.btn-diff[data-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    sfx.click();
    document.querySelectorAll('.btn-diff[data-diff]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
  });
});

// Mode buttons
document.querySelectorAll('.btn-diff[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    sfx.click();
    document.querySelectorAll('.btn-diff[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });
});

document.getElementById('btn-start').addEventListener('click', () => {
  sfx.click(); startGame();
});

document.getElementById('btn-pause').addEventListener('click', () => {
  sfx.click(); togglePause();
});

document.getElementById('btn-resume').addEventListener('click', () => {
  sfx.click(); togglePause();
});

document.getElementById('btn-restart').addEventListener('click', () => {
  sfx.click(); startGame();
});

document.getElementById('btn-mainmenu').addEventListener('click', () => {
  sfx.click();
  cancelAnimationFrame(rafId);
  state.running = false;
  document.getElementById('start-hs').textContent = getBest();
  showScreen('start');
});

// ── Init start screen ─────────────────────────────────────────
document.getElementById('start-hs').textContent = getBest();
