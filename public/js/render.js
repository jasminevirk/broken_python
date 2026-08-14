const Sprites = {
  snakeHead: null,
  snakeBody: null,
  snakeTail: null,
  snakeCorner: null,
  enemyHead: null,
  enemyBody: null,
  enemyTail: null,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load " + src));
    img.src = src;
  });
}

async function loadSprites() {
  const [
    snakeHead,
    snakeBody,
    snakeTail,
    snakeCorner,
    enemyHead,
    enemyBody,
    enemyTail,
  ] = await Promise.all([
    loadImage("assets/sprites/snake_head.png"),
    loadImage("assets/sprites/snake_body.png"),
    loadImage("assets/sprites/snake_tail.png"),
    loadImage("assets/sprites/snake_corner.png"),
    loadImage("assets/sprites/enemy_head.png"),
    loadImage("assets/sprites/enemy_body.png"),
    loadImage("assets/sprites/enemy_tail.png"),
  ]);
  Sprites.snakeHead = snakeHead;
  Sprites.snakeBody = snakeBody;
  Sprites.snakeTail = snakeTail;
  Sprites.snakeCorner = snakeCorner;
  Sprites.enemyHead = enemyHead;
  Sprites.enemyBody = enemyBody;
  Sprites.enemyTail = enemyTail;
}

function pygameToCanvas(deg) {
  return (-deg * Math.PI) / 180;
}

function dirAngle(dx, dy) {
  if (dx === 1 && dy === 0) return pygameToCanvas(270);
  if (dx === -1 && dy === 0) return pygameToCanvas(90);
  if (dx === 0 && dy === 1) return pygameToCanvas(180);
  return pygameToCanvas(0);
}

function tailAngle(tail, prev) {
  const dx = prev.x - tail.x;
  const dy = prev.y - tail.y;
  if (dx === 1 && dy === 0) return pygameToCanvas(90);
  if (dx === -1 && dy === 0) return pygameToCanvas(270);
  if (dx === 0 && dy === 1) return pygameToCanvas(0);
  return pygameToCanvas(180);
}

function cornerAngle(prev, curr, next) {
  const prevV = { x: prev.x - curr.x, y: prev.y - curr.y };
  const nextV = { x: next.x - curr.x, y: next.y - curr.y };

  const is = (ax, ay, bx, by) =>
    (prevV.x === ax && prevV.y === ay && nextV.x === bx && nextV.y === by) ||
    (prevV.x === bx && prevV.y === by && nextV.x === ax && nextV.y === ay);

  if (is(0, -1, 1, 0)) return pygameToCanvas(270);
  if (is(1, 0, 0, 1)) return pygameToCanvas(180);
  if (is(0, 1, -1, 0)) return pygameToCanvas(90);
  if (is(-1, 0, 0, -1)) return pygameToCanvas(0);
  return 0;
}

function blitSprite(ctx, img, x, y, cell, angle) {
  if (!img) return;
  ctx.save();
  ctx.translate(x * cell + cell / 2, y * cell + cell / 2);
  ctx.rotate(angle);
  ctx.drawImage(img, -cell / 2, -cell / 2, cell, cell);
  ctx.restore();
}

function drawGrid(ctx, w, h, cell) {
  ctx.fillStyle = "#181d29";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cell + 0.5, 0);
    ctx.lineTo(x * cell + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell + 0.5);
    ctx.lineTo(w, y * cell + 0.5);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(55, 118, 171, 0.18)";
  ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = "#9ecbff";
  ctx.font = `${Math.max(10, Math.floor(cell * 0.28))}px "IBM Plex Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillText("▲  CONSOLE  —  bump this wall to undo a keyword", w / 2, cell * 0.42);
}

function drawSnakeBody(ctx, snake, sprites, cell, isEnemy) {
  const headImg = isEnemy ? sprites.enemyHead : sprites.snakeHead;
  const bodyImg = isEnemy ? sprites.enemyBody : sprites.snakeBody;
  const tailImg = isEnemy ? sprites.enemyTail : sprites.snakeTail;
  const cornerImg = isEnemy ? sprites.enemyBody : sprites.snakeCorner;

  for (let i = 0; i < snake.length; i++) {
    const part = snake[i];
    if (i === 0) {
      const dir = isEnemy ? Game.enemy.dir : Game.dir;
      blitSprite(ctx, headImg, part.x, part.y, cell, dirAngle(dir.x, dir.y));
      continue;
    }
    if (i === snake.length - 1) {
      blitSprite(ctx, tailImg, part.x, part.y, cell, tailAngle(part, snake[i - 1]));
      continue;
    }
    const prev = snake[i - 1];
    const next = snake[i + 1];
    if (prev.x === next.x) {
      blitSprite(ctx, bodyImg, part.x, part.y, cell, pygameToCanvas(90));
    } else if (prev.y === next.y) {
      blitSprite(ctx, bodyImg, part.x, part.y, cell, pygameToCanvas(0));
    } else {
      blitSprite(ctx, cornerImg, part.x, part.y, cell, cornerAngle(prev, part, next));
    }
  }
}

function isRequiredWord(word) {
  return currentLevel().required.includes(word);
}

function drawTiles(ctx, cell) {
  const fontSize = Math.max(11, Math.floor(cell * 0.32));
  ctx.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const tile of Game.tiles) {
    const good = isRequiredWord(tile.text);
    const px = tile.x * cell;
    const py = tile.y * cell;
    const pad = Math.max(3, cell * 0.08);
    ctx.fillStyle = good ? "rgba(46, 160, 90, 0.9)" : "rgba(180, 60, 70, 0.85)";
    roundRect(ctx, px + pad, py + pad, cell - pad * 2, cell - pad * 2, 6);
    ctx.fill();
    ctx.strokeStyle = good ? "#9be9a8" : "#ffb1b7";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(tile.text, px + cell / 2, py + cell / 2 + 1);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGame(ctx, canvas) {
  const cell = Game.cell;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  if (Game.shake > 0) {
    const mag = Math.min(8, Game.shake);
    ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag);
  }

  drawGrid(ctx, w, h, cell);
  drawTiles(ctx, cell);
  drawSnakeBody(ctx, Game.snake, Sprites, cell, false);
  if (Game.enemy) {
    ctx.save();
    if (Game.enemy.frozen) ctx.globalAlpha = 0.45;
    drawSnakeBody(ctx, Game.enemy.body, Sprites, cell, true);
    ctx.restore();
  }

  ctx.restore();

  ctx.strokeStyle = "#c8c8c8";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}
