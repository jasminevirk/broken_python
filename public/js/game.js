const GRID_W = 18;
const GRID_H = 12;

const Game = {
  snake: [],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  tiles: [],
  collected: [],
  log: [],
  shake: 0,
  enemy: null,
  moveAcc: 0,
  speed: 5,
  overlay: null,
  levelIndex: 0,
  cell: 40,
  playing: false,
};

function keyOf(x, y) {
  return x + "," + y;
}

function occupiedSet() {
  const used = new Set();
  for (const part of Game.snake) used.add(keyOf(part.x, part.y));
  for (const tile of Game.tiles) used.add(keyOf(tile.x, tile.y));
  if (Game.enemy) {
    for (const part of Game.enemy.body) used.add(keyOf(part.x, part.y));
  }
  return used;
}

function randomEmptyCell(minDist) {
  const head = Game.snake[0] || { x: 5, y: 5 };
  for (let attempt = 0; attempt < 250; attempt++) {
    const x = 1 + Math.floor(Math.random() * (GRID_W - 2));
    const y = 1 + Math.floor(Math.random() * (GRID_H - 2));
    if (occupiedSet().has(keyOf(x, y))) continue;
    if (Math.abs(head.x - x) + Math.abs(head.y - y) < 3) continue;
    let far = true;
    for (const tile of Game.tiles) {
      if (Math.abs(tile.x - x) + Math.abs(tile.y - y) < minDist) {
        far = false;
        break;
      }
    }
    if (far) return { x, y };
  }
  return { x: GRID_W - 2, y: GRID_H - 2 };
}

function currentLevel() {
  return LEVELS[Game.levelIndex];
}

function spawnTile(text) {
  const pos = randomEmptyCell(2);
  Game.tiles.push({ text, x: pos.x, y: pos.y });
}

function isLevelWon() {
  const needed = currentLevel().required;
  if (Game.collected.length !== needed.length) return false;
  return Game.collected.every((word, i) => word === needed[i]);
}

function setupPlay(levelIndex) {
  Game.levelIndex = levelIndex;
  Game.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ];
  Game.dir = { x: 1, y: 0 };
  Game.nextDir = { x: 1, y: 0 };
  Game.collected = [];
  Game.log = ["fill the blanks — bump the top wall to undo"];
  Game.tiles = [];
  Game.shake = 0;
  Game.overlay = null;
  Game.enemy = null;
  Game.moveAcc = 0;
  Game.speed = 4.6 + levelIndex * 0.4;
  Game.playing = true;

  const level = currentLevel();
  for (const word of level.options) {
    spawnTile(word);
  }

  if (level.boss) {
    Game.enemy = {
      body: [
        { x: GRID_W - 5, y: GRID_H - 4 },
        { x: GRID_W - 4, y: GRID_H - 4 },
        { x: GRID_W - 3, y: GRID_H - 4 },
        { x: GRID_W - 2, y: GRID_H - 4 },
      ],
      dir: { x: -1, y: 0 },
      frozen: false,
      skip: false,
    };
    AudioMgr.playMusic("boss");
  } else {
    AudioMgr.playMusic("game");
  }

  UI.hideOverlays();
  UI.updateConsole();
}

function setDirection(dx, dy) {
  if (!Game.playing || Game.overlay) return;
  if (dx === 0 && dy === 0) return;
  if (dx === -Game.nextDir.x && dy === -Game.nextDir.y) return;
  Game.nextDir = { x: dx, y: dy };
}

function onSnake(x, y, ignoreTail) {
  const last = Game.snake.length - 1;
  return Game.snake.some((part, i) => {
    if (ignoreTail && i === last) return false;
    return part.x === x && part.y === y;
  });
}

function enemyHits(x, y) {
  return Boolean(Game.enemy && Game.enemy.body.some((part) => part.x === x && part.y === y));
}

function bumpConsole() {
  Game.shake = 14;
  AudioMgr.playSfx("bump");
  if (Game.collected.length) {
    const removed = Game.collected.pop();
    Game.log.push("spit out: " + removed);
    spawnTile(removed);
  } else {
    Game.log.push("console: nothing to undo");
  }
}

function die() {
  if (Game.overlay) return;
  AudioMgr.playSfx("crash");
  AudioMgr.playSfx("gameover");
  Game.overlay = "gameOver";
  UI.showOverlay("gameOver");
}

function completeLevel() {
  const level = currentLevel();
  if (level.boss && Game.enemy) Game.enemy.frozen = true;
  if (Game.levelIndex >= LEVELS.length - 1) {
    AudioMgr.playSfx("complete");
    Game.overlay = "gameComplete";
    UI.showOverlay("gameComplete");
  } else {
    AudioMgr.playSfx("level");
    Game.overlay = "levelComplete";
    UI.showOverlay("levelComplete");
  }
}

function moveEnemy() {
  const enemy = Game.enemy;
  if (!enemy || enemy.frozen) return;

  enemy.skip = !enemy.skip;
  if (enemy.skip) return;

  const head = enemy.body[0];
  const target = Game.snake[0];
  const dx = target.x - head.x;
  const dy = target.y - head.y;
  const candidates = [];

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx !== 0) candidates.push({ x: Math.sign(dx), y: 0 });
    if (dy !== 0) candidates.push({ x: 0, y: Math.sign(dy) });
  } else {
    if (dy !== 0) candidates.push({ x: 0, y: Math.sign(dy) });
    if (dx !== 0) candidates.push({ x: Math.sign(dx), y: 0 });
  }
  candidates.push({ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 });

  let chosen = enemy.dir;
  for (const dir of candidates) {
    if (dir.x === -enemy.dir.x && dir.y === -enemy.dir.y && enemy.body.length > 1) continue;
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;
    if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
    const hitsSelf = enemy.body.some(
      (part, i) => i < enemy.body.length - 1 && part.x === nx && part.y === ny
    );
    if (hitsSelf) continue;
    chosen = dir;
    break;
  }

  enemy.dir = chosen;
  enemy.body.unshift({ x: head.x + chosen.x, y: head.y + chosen.y });
  enemy.body.pop();
}

function moveSnake() {
  if (!Game.playing || Game.overlay) return;

  Game.dir = Game.nextDir;
  const head = Game.snake[0];
  const nx = head.x + Game.dir.x;
  const ny = head.y + Game.dir.y;

  if (ny < 0) {
    bumpConsole();
    Game.snake[0] = { x: head.x, y: 0 };
    const canLeft = head.x > 0;
    const canRight = head.x < GRID_W - 1;
    if (canLeft && canRight) {
      Game.dir = Math.random() < 0.5 ? { x: -1, y: 0 } : { x: 1, y: 0 };
    } else if (canLeft) {
      Game.dir = { x: -1, y: 0 };
    } else {
      Game.dir = { x: 1, y: 0 };
    }
    Game.nextDir = Game.dir;
    UI.updateConsole();
    return;
  }

  if (nx < 0 || nx >= GRID_W || ny >= GRID_H) {
    die();
    return;
  }

  if (onSnake(nx, ny, true)) {
    die();
    return;
  }

  if (Game.enemy && !Game.enemy.frozen && enemyHits(nx, ny)) {
    die();
    return;
  }

  Game.snake.unshift({ x: nx, y: ny });

  const tileIndex = Game.tiles.findIndex((tile) => tile.x === nx && tile.y === ny);
  let ate = false;
  if (tileIndex >= 0) {
    const tile = Game.tiles[tileIndex];
    const needed = currentLevel().required;
    if (Game.collected.length >= needed.length) {
      AudioMgr.playSfx("overflow");
      Game.log.push("console overflow — bump the top wall to undo");
      Game.tiles.splice(tileIndex, 1);
      spawnTile(tile.text);
      ate = true;
    } else {
      Game.collected.push(tile.text);
      Game.tiles.splice(tileIndex, 1);
      ate = true;
      AudioMgr.playSfx("eat");
      const expected = needed[Game.collected.length - 1];
      if (tile.text === expected) {
        Game.log.push("ate " + tile.text);
      } else {
        Game.log.push("wrong: " + tile.text + " — bump the top wall");
      }
    }
  }

  if (!ate) Game.snake.pop();

  moveEnemy();

  if (Game.enemy && !Game.enemy.frozen && enemyHits(Game.snake[0].x, Game.snake[0].y)) {
    die();
    return;
  }

  if (isLevelWon()) completeLevel();
  UI.updateConsole();
}

function tick(dt) {
  if (!Game.playing) return;
  if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - dt * 0.06);
  if (Game.overlay) return;
  Game.moveAcc += dt;
  const interval = 1000 / Game.speed;
  while (Game.moveAcc >= interval) {
    Game.moveAcc -= interval;
    moveSnake();
  }
}

function togglePause() {
  if (!Game.playing) return;
  if (Game.overlay === "pause") {
    Game.overlay = null;
    UI.hideOverlays();
    return;
  }
  if (Game.overlay) return;
  Game.overlay = "pause";
  UI.showOverlay("pause");
}

function continueLevel() {
  if (Game.levelIndex >= LEVELS.length - 1) {
    Game.overlay = "gameComplete";
    UI.showOverlay("gameComplete");
    return;
  }
  setupPlay(Game.levelIndex + 1);
}

function retryLevel() {
  setupPlay(Game.levelIndex);
}

function playAgain() {
  setupPlay(0);
}

function stopPlay() {
  Game.playing = false;
  Game.overlay = null;
  Game.enemy = null;
}
