/**
 * Headless checks for win order, console bump, and self-collision.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "public", "js");
const context = {
  console,
  AudioMgr: {
    playSfx() {},
    playMusic() {},
  },
  UI: {
    hideOverlays() {},
    updateConsole() {},
    showOverlay(name) {
      context._overlay = name;
    },
  },
  Math,
  performance: { now: Date.now },
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, "levels.js"), "utf8") + "\nthis.LEVELS = LEVELS;",
  context
);
vm.runInContext(
  fs.readFileSync(path.join(root, "game.js"), "utf8") +
    "\nObject.assign(this, { Game, setupPlay, moveSnake });",
  context
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

context.setupPlay(0);
assert(context.Game.snake.length === 3, "snake starts at length 3");
assert(context.Game.tiles.length === 4, "level 1 has 4 keyword tiles");

const printTile = context.Game.tiles.find((t) => t.text === "print");
context.Game.snake = [
  { x: printTile.x - 1, y: printTile.y },
  { x: printTile.x - 2, y: printTile.y },
  { x: printTile.x - 3, y: printTile.y },
];
context.Game.dir = { x: 1, y: 0 };
context.Game.nextDir = { x: 1, y: 0 };
context.moveSnake();
assert(
  context.Game.overlay === "levelComplete" || context._overlay === "levelComplete",
  "eating print wins level 1"
);
assert(JSON.stringify(context.Game.collected) === '["print"]', "collected print in order");

context.setupPlay(3);
const defTile = context.Game.tiles.find((t) => t.text === "def");
const returnTile = context.Game.tiles.find((t) => t.text === "return");
context.Game.snake = [
  { x: returnTile.x - 1, y: returnTile.y },
  { x: returnTile.x - 2, y: returnTile.y },
  { x: returnTile.x - 3, y: returnTile.y },
];
context.Game.dir = { x: 1, y: 0 };
context.Game.nextDir = { x: 1, y: 0 };
context.moveSnake();
assert(context.Game.collected[0] === "return", "can eat return first");
assert(!context.Game.overlay, "wrong order does not win level 4");

context.Game.snake = [
  { x: defTile.x - 1, y: defTile.y },
  { x: defTile.x - 2, y: defTile.y },
  { x: defTile.x - 3, y: defTile.y },
];
context.Game.dir = { x: 1, y: 0 };
context.Game.nextDir = { x: 1, y: 0 };
context.moveSnake();
assert(JSON.stringify(context.Game.collected) === '["return","def"]', "order preserved");
assert(!context.Game.overlay, "return then def still does not win");

context.Game.nextDir = { x: 0, y: -1 };
context.Game.dir = { x: 0, y: -1 };
context.Game.snake[0] = { x: 5, y: 0 };
const before = context.Game.collected.length;
context.moveSnake();
assert(context.Game.collected.length === before - 1, "bumping console undoes last keyword");

context.setupPlay(0);
context.Game.snake = [
  { x: 5, y: 5 },
  { x: 4, y: 5 },
  { x: 3, y: 5 },
];
context.Game.dir = { x: -1, y: 0 };
context.Game.nextDir = { x: -1, y: 0 };
context.moveSnake();
assert(
  context.Game.overlay === "gameOver" || context._overlay === "gameOver",
  "self-collision is fatal"
);

context.setupPlay(4);
assert(context.Game.enemy && context.Game.enemy.body.length === 4, "boss snake exists");
const breakTile = context.Game.tiles.find((t) => t.text === "break");
context.Game.snake = [
  { x: breakTile.x - 1, y: breakTile.y },
  { x: breakTile.x - 2, y: breakTile.y },
  { x: breakTile.x - 3, y: breakTile.y },
];
context.Game.dir = { x: 1, y: 0 };
context.Game.nextDir = { x: 1, y: 0 };
context.moveSnake();
assert(context.Game.enemy.frozen, "break freezes the enemy");
assert(
  context.Game.overlay === "gameComplete" || context._overlay === "gameComplete",
  "last level goes to game complete"
);

console.log("All gameplay checks passed.");

const renderCtx = {
  console,
  performance: { now: Date.now },
  Game: context.Game,
  GRID_W: 18,
  GRID_H: 12,
  currentLevel() {
    return context.LEVELS[context.Game.levelIndex];
  },
  document: {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return { imageSmoothingEnabled: false, fillStyle: "", fillRect() {} };
        },
      };
    },
  },
};
vm.createContext(renderCtx);
vm.runInContext(
  fs.readFileSync(path.join(root, "render.js"), "utf8"),
  renderCtx
);

assert(renderCtx.splitWord("continue").join("/") === "cont/inue", "continue wraps at midpoint");
assert(renderCtx.splitWord("display").join("/") === "disp/lay", "display wraps at midpoint");
assert(renderCtx.readableFloor(40) === 12, "readable floor is 12px on normal cells");
assert(renderCtx.readableFloor(26) === 11, "readable floor is 11px on small cells");

renderCtx.buildEnemySet(false);
renderCtx.buildEnemySet(true);

const fakeCtx = {
  font: "",
  measureText(text) {
    const match = this.font.match(/(\d+)px/);
    const size = match ? Number(match[1]) : 12;
    return { width: text.length * size * 0.62 };
  },
};
const short = renderCtx.layoutKeyword(fakeCtx, "if", 40);
assert(short.lines.length === 1 && short.lines[0] === "if", "short words stay on one line");
assert(short.size >= 12, "short words stay at readable size");
const long = renderCtx.layoutKeyword(fakeCtx, "continue", 40);
assert(long.lines.length === 2, "continue wraps instead of shrinking below the floor");
assert(long.size >= 12, "wrapped keywords stay readable");

console.log("Render helper checks passed.");
