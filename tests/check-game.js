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
