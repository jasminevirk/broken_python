const Sprites = {
  snakeHead: null,
  snakeBody: null,
  snakeTail: null,
  snakeCorner: null,
};

const EnemyArt = {
  live: null,
  frozen: null,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load " + src));
    img.src = src;
  });
}

function paintPixelMap(size, rows, colors) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    if (row.length !== size) {
      throw new Error(`Enemy sprite row ${y} is ${row.length}px, expected ${size}`);
    }
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function buildEnemySet(frozen) {
  const pal = frozen
    ? {
        o: "#163040",
        d: "#2e6a82",
        m: "#4eb3d4",
        h: "#d7f6ff",
        g: "#9ee7ff",
        e: "#f4fdff",
        p: "#0b1c24",
        s: "#ffffff",
      }
    : {
        o: "#2a0810",
        d: "#8b1028",
        m: "#e02340",
        h: "#ff6b81",
        g: "#e040fb",
        e: "#fff5c0",
        p: "#1a0508",
        s: "#ffd43b",
      };

  const head = [
    "................",
    "......ssss......",
    ".....oooooo.....",
    "....oddddddo....",
    "...odhmmmhdo....",
    "...odhpephdo....",
    "...odmmgmmmdo...",
    "....odggggdo....",
    "....odmddmdo....",
    ".....oddddo.....",
    ".....odhhdo.....",
    "......oooo......",
    "................",
    "................",
    "................",
    "................",
  ];

  const body = [
    "................",
    "................",
    "................",
    "....oooooooo....",
    "...odmmmmmmdo...",
    "...odhhhhhhdo...",
    "...odmmggmmdo...",
    "...odmmmmmmdo...",
    "...oddddddddo...",
    "....oooooooo....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];

  const tail = [
    "................",
    ".......ss.......",
    "......oooo......",
    "......oddo......",
    ".....odmmdo.....",
    ".....odhhdo.....",
    "....odmmmmdo....",
    "....odmggmdo....",
    "....odmmmmdo....",
    ".....oddddo.....",
    "......oooo......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];

  const corner = [
    "................",
    "................",
    "......oooo......",
    "......oddo......",
    "......oddooooo..",
    "......odhhhhdo..",
    "......odmmgmdo..",
    "......odmmmmdo..",
    ".......oddddo...",
    "........oooo....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];

  return {
    head: paintPixelMap(16, head, pal),
    body: paintPixelMap(16, body, pal),
    tail: paintPixelMap(16, tail, pal),
    corner: paintPixelMap(16, corner, pal),
  };
}

async function loadSprites() {
  const [snakeHead, snakeBody, snakeTail, snakeCorner] = await Promise.all([
    loadImage("assets/sprites/snake_head.png"),
    loadImage("assets/sprites/snake_body.png"),
    loadImage("assets/sprites/snake_tail.png"),
    loadImage("assets/sprites/snake_corner.png"),
  ]);
  Sprites.snakeHead = snakeHead;
  Sprites.snakeBody = snakeBody;
  Sprites.snakeTail = snakeTail;
  Sprites.snakeCorner = snakeCorner;
  EnemyArt.live = buildEnemySet(false);
  EnemyArt.frozen = buildEnemySet(true);
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
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, -cell / 2, -cell / 2, cell, cell);
  ctx.restore();
}

function drawGrid(ctx, w, h, cell) {
  const boss = Boolean(Game.enemy);
  ctx.fillStyle = boss ? "#1c1218" : "#181d29";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = boss ? "rgba(255,80,90,0.12)" : "rgba(255,255,255,0.05)";
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

  ctx.fillStyle = boss ? "rgba(224, 35, 64, 0.28)" : "rgba(55, 118, 171, 0.18)";
  ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = boss ? "#ffb4bc" : "#9ecbff";
  ctx.font = `${Math.max(10, Math.floor(cell * 0.28))}px "IBM Plex Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const banner = boss
    ? "▲  CONSOLE  —  eat break to freeze the rogue process"
    : "▲  CONSOLE  —  bump this wall to undo a keyword";
  ctx.fillText(banner, w / 2, cell * 0.42);
}

function drawSnakeBody(ctx, snake, sprites, cell) {
  for (let i = 0; i < snake.length; i++) {
    const part = snake[i];
    if (i === 0) {
      blitSprite(ctx, sprites.snakeHead, part.x, part.y, cell, dirAngle(Game.dir.x, Game.dir.y));
      continue;
    }
    if (i === snake.length - 1) {
      blitSprite(ctx, sprites.snakeTail, part.x, part.y, cell, tailAngle(part, snake[i - 1]));
      continue;
    }
    const prev = snake[i - 1];
    const next = snake[i + 1];
    if (prev.x === next.x) {
      blitSprite(ctx, sprites.snakeBody, part.x, part.y, cell, pygameToCanvas(90));
    } else if (prev.y === next.y) {
      blitSprite(ctx, sprites.snakeBody, part.x, part.y, cell, pygameToCanvas(0));
    } else {
      blitSprite(ctx, sprites.snakeCorner, part.x, part.y, cell, cornerAngle(prev, part, next));
    }
  }
}

function drawEnemyGlow(ctx, x, y, cell, frozen) {
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const pulse = 0.32 + 0.08 * Math.sin(performance.now() / 180);
  ctx.save();
  ctx.globalAlpha = frozen ? 0.38 : pulse;
  const gradient = ctx.createRadialGradient(cx, cy, cell * 0.1, cx, cy, cell * 0.55);
  gradient.addColorStop(0, frozen ? "#c8f4ff" : "#ff4d6d");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, cell) {
  if (!Game.enemy) return;
  const art = Game.enemy.frozen ? EnemyArt.frozen : EnemyArt.live;
  if (!art) return;
  const body = Game.enemy.body;

  for (let i = 0; i < body.length; i++) {
    drawEnemyGlow(ctx, body[i].x, body[i].y, cell, Game.enemy.frozen);
  }

  for (let i = 0; i < body.length; i++) {
    const part = body[i];
    if (i === 0) {
      blitSprite(ctx, art.head, part.x, part.y, cell, dirAngle(Game.enemy.dir.x, Game.enemy.dir.y));
      continue;
    }
    if (i === body.length - 1) {
      blitSprite(ctx, art.tail, part.x, part.y, cell, tailAngle(part, body[i - 1]));
      continue;
    }
    const prev = body[i - 1];
    const next = body[i + 1];
    if (prev.x === next.x) {
      blitSprite(ctx, art.body, part.x, part.y, cell, pygameToCanvas(90));
    } else if (prev.y === next.y) {
      blitSprite(ctx, art.body, part.x, part.y, cell, pygameToCanvas(0));
    } else {
      blitSprite(ctx, art.corner, part.x, part.y, cell, cornerAngle(prev, part, next));
    }
  }

  if (Game.enemy.frozen) {
    const head = body[0];
    const labelY = Math.min(GRID_H - 1, head.y + 1) * cell + cell * 0.18;
    ctx.save();
    ctx.font = `600 ${Math.max(11, Math.floor(cell * 0.28))}px "IBM Plex Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0b1c24";
    ctx.fillRect(head.x * cell + 2, labelY - cell * 0.2, cell - 4, cell * 0.36);
    ctx.fillStyle = "#d7f6ff";
    ctx.fillText("FROZEN", head.x * cell + cell / 2, labelY);
    ctx.restore();
  }
}

function isRequiredWord(word) {
  return currentLevel().required.includes(word);
}

function splitWord(text) {
  const mid = Math.ceil(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
}

function readableFloor(cell) {
  return cell < 28 ? 11 : 12;
}

function layoutKeyword(ctx, text, cell) {
  const floor = readableFloor(cell);
  const start = Math.min(16, Math.max(floor, Math.floor(cell * 0.34)));
  const pad = text.length >= 5 ? Math.max(2, cell * 0.04) : Math.max(3, cell * 0.08);
  const maxWidth = cell - pad * 2;

  for (let size = start; size >= floor; size--) {
    ctx.font = `600 ${size}px "IBM Plex Mono", monospace`;
    if (ctx.measureText(text).width <= maxWidth) {
      return { lines: [text], size, pad };
    }
  }

  ctx.font = `600 ${floor}px "IBM Plex Mono", monospace`;
  return { lines: splitWord(text), size: floor, pad };
}

function drawTiles(ctx, cell) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const tile of Game.tiles) {
    const good = isRequiredWord(tile.text);
    const layout = layoutKeyword(ctx, tile.text, cell);
    const px = tile.x * cell;
    const py = tile.y * cell;
    const innerX = px + layout.pad;
    const innerY = py + layout.pad;
    const innerW = cell - layout.pad * 2;
    const innerH = cell - layout.pad * 2;

    ctx.save();
    roundRect(ctx, innerX, innerY, innerW, innerH, Math.max(4, cell * 0.12));
    ctx.fillStyle = good ? "rgba(46, 160, 90, 0.92)" : "rgba(180, 60, 70, 0.88)";
    ctx.fill();
    ctx.strokeStyle = good ? "#9be9a8" : "#ffb1b7";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    ctx.fillStyle = "#fff";
    ctx.font = `600 ${layout.size}px "IBM Plex Mono", monospace`;
    if (layout.lines.length === 1) {
      ctx.fillText(layout.lines[0], px + cell / 2, py + cell / 2 + 1);
    } else {
      const gap = layout.size * 0.95;
      ctx.fillText(layout.lines[0], px + cell / 2, py + cell / 2 - gap / 2 + 1);
      ctx.fillText(layout.lines[1], px + cell / 2, py + cell / 2 + gap / 2 + 1);
    }
    ctx.restore();
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
  drawSnakeBody(ctx, Game.snake, Sprites, cell);
  drawEnemy(ctx, cell);

  ctx.restore();

  ctx.strokeStyle = Game.enemy ? "#e02340" : "#c8c8c8";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

this.splitWord = splitWord;
this.readableFloor = readableFloor;
this.layoutKeyword = layoutKeyword;
this.buildEnemySet = buildEnemySet;
