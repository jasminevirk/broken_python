function bindInput(canvas) {
  const dirs = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    a: [-1, 0],
    s: [0, 1],
    d: [1, 0],
    W: [0, -1],
    A: [-1, 0],
    S: [0, 1],
    D: [1, 0],
  };

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key === "p" || event.key === "P" || event.key === "Escape") {
      event.preventDefault();
      if (typeof togglePause === "function") togglePause();
      return;
    }
    if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      UI.toggleMute();
      return;
    }
    const dir = dirs[event.key];
    if (!dir) return;
    event.preventDefault();
    setDirection(dir[0], dir[1]);
  });

  document.querySelectorAll("[data-dir]").forEach((btn) => {
    const send = (event) => {
      event.preventDefault();
      const map = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
      };
      const dir = map[btn.dataset.dir];
      if (dir) setDirection(dir[0], dir[1]);
    };
    btn.addEventListener("pointerdown", send);
  });

  let sx = 0;
  let sy = 0;
  let tracking = false;

  canvas.addEventListener("pointerdown", (event) => {
    tracking = true;
    sx = event.clientX;
    sy = event.clientY;
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - sx;
    const dy = event.clientY - sy;
    if (Math.hypot(dx, dy) < 28) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
    else setDirection(0, dy > 0 ? 1 : -1);
  });

  canvas.addEventListener("pointercancel", () => {
    tracking = false;
  });
}
