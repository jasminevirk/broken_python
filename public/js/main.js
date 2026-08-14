const UI = {
  screens: {},
  overlays: {},
  muteButtons: [],
};

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  Object.entries(UI.screens).forEach(([key, node]) => {
    node.classList.toggle("active", key === name);
  });
}

UI.hideOverlays = function hideOverlays() {
  Object.values(UI.overlays).forEach((node) => node.classList.remove("active"));
};

UI.showOverlay = function showOverlay(name) {
  UI.hideOverlays();
  const node = UI.overlays[name];
  if (node) node.classList.add("active");
};

UI.updateConsole = function updateConsole() {
  if (!Game.playing) return;
  const level = currentLevel();
  $("level-label").textContent = `LEVEL ${Game.levelIndex + 1}/${LEVELS.length}  ·  ${level.title}`;
  $("collect-label").textContent = `${Math.min(Game.collected.length, level.required.length)}/${level.required.length}`;
  $("hint").textContent = level.hint;

  let slot = 0;
  const code = level.template.replace(/_____/g, () => {
    const word = Game.collected[slot];
    const expected = level.required[slot];
    slot += 1;
    if (!word) return '<span class="blank">_____</span>';
    const ok = word === expected;
    return `<span class="kw ${ok ? "ok" : "bad"}">${word}</span>`;
  });
  $("code-view").innerHTML = `${code}\n<span class="comment">${level.comment}</span>`;
  $("event-log").textContent = Game.log.slice(-3).join("   ·   ");
};

UI.toggleMute = function toggleMute() {
  const muted = AudioMgr.toggleMute();
  syncMuteButtons(muted);
};

function syncMuteButtons(muted) {
  const label = muted ? "Unmute" : "Mute";
  UI.muteButtons.forEach((btn) => {
    btn.textContent = label;
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
  });
}

function syncSettings() {
  $("music-vol").value = String(AudioMgr.musicVol);
  $("sfx-vol").value = String(AudioMgr.sfxVol);
  $("music-vol-val").textContent = Math.round(AudioMgr.musicVol * 100) + "%";
  $("sfx-vol-val").textContent = Math.round(AudioMgr.sfxVol * 100) + "%";
  syncMuteButtons(AudioMgr.muted);
}

function goMenu() {
  stopPlay();
  UI.hideOverlays();
  showScreen("menu");
  AudioMgr.playMusic("menu");
}

function startGame() {
  showScreen("play");
  setupPlay(0);
  resizeCanvas();
}

function resizeCanvas() {
  const canvas = $("game");
  const wrap = $("canvas-wrap");
  if (!canvas || !wrap) return;
  const maxW = wrap.clientWidth;
  const maxH = wrap.clientHeight;
  const cell = Math.max(18, Math.floor(Math.min(maxW / GRID_W, maxH / GRID_H)));
  Game.cell = cell;
  canvas.width = cell * GRID_W;
  canvas.height = cell * GRID_H;
}

async function boot() {
  UI.screens = {
    splash: $("screen-splash"),
    logo: $("screen-logo"),
    menu: $("screen-menu"),
    howto: $("screen-howto"),
    settings: $("screen-settings"),
    credits: $("screen-credits"),
    play: $("screen-play"),
  };
  UI.overlays = {
    pause: $("overlay-pause"),
    levelComplete: $("overlay-level"),
    gameOver: $("overlay-over"),
    gameComplete: $("overlay-complete"),
  };
  UI.muteButtons = Array.from(document.querySelectorAll("[data-mute]"));

  AudioMgr.load();
  syncSettings();
  await loadSprites();
  $("btn-start").disabled = false;
  $("btn-start").textContent = "Click or tap to start";

  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  bindInput(canvas);
  window.addEventListener("resize", resizeCanvas);

  document.querySelectorAll("[data-click]").forEach((btn) => {
    btn.addEventListener("click", () => AudioMgr.playSfx("click"));
  });

  $("btn-start").addEventListener("click", async () => {
    await AudioMgr.unlock();
    showScreen("splash");
    AudioMgr.playMusic("menu");
    window.setTimeout(() => {
      if (!UI.screens.splash.classList.contains("active")) return;
      showScreen("logo");
      window.setTimeout(() => {
        if (!UI.screens.logo.classList.contains("active")) return;
        showScreen("menu");
      }, 1800);
    }, 2000);
  });

  $("btn-play").addEventListener("click", startGame);
  $("btn-howto").addEventListener("click", () => showScreen("howto"));
  $("btn-settings").addEventListener("click", () => {
    syncSettings();
    showScreen("settings");
  });
  $("btn-credits").addEventListener("click", () => showScreen("credits"));
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", goMenu);
  });

  $("btn-pause").addEventListener("click", togglePause);
  $("btn-resume").addEventListener("click", togglePause);
  $("btn-pause-menu").addEventListener("click", goMenu);
  $("btn-continue").addEventListener("click", continueLevel);
  $("btn-retry").addEventListener("click", retryLevel);
  $("btn-over-menu").addEventListener("click", goMenu);
  $("btn-again").addEventListener("click", playAgain);
  $("btn-complete-menu").addEventListener("click", goMenu);

  UI.muteButtons.forEach((btn) => {
    btn.addEventListener("click", () => UI.toggleMute());
  });

  $("music-vol").addEventListener("input", (event) => {
    AudioMgr.setMusicVol(Number(event.target.value));
    syncSettings();
  });
  $("sfx-vol").addEventListener("input", (event) => {
    AudioMgr.setSfxVol(Number(event.target.value));
    syncSettings();
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(50, now - last);
    last = now;
    tick(dt);
    if (UI.screens.play.classList.contains("active") && Game.playing) {
      drawGame(ctx, canvas);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", boot);
