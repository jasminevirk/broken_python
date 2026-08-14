const AudioMgr = (() => {
  const sfx = {};
  let musicEl = null;
  let currentTrack = null;
  let musicVol = 0.5;
  let sfxVol = 0.5;
  let muted = false;
  let unlocked = false;

  const SFX_FILES = {
    eat: "assets/audio/eat.mp3",
    bump: "assets/audio/console_bump.mp3",
    crash: "assets/audio/crash_into_wall.mp3",
    overflow: "assets/audio/console_overflow.mp3",
    level: "assets/audio/level_complete.mp3",
    complete: "assets/audio/game_complete.mp3",
    gameover: "assets/audio/game_over.mp3",
    click: "assets/audio/menu_button.mp3",
  };

  const MUSIC = {
    menu: "assets/audio/menu_music.mp3",
    game: "assets/audio/game_music.mp3",
    boss: "assets/audio/boss_music.mp3",
  };

  function restore() {
    try {
      const raw = localStorage.getItem("brokenPythonSettings");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.musicVol === "number") musicVol = saved.musicVol;
      if (typeof saved.sfxVol === "number") sfxVol = saved.sfxVol;
      if (typeof saved.muted === "boolean") muted = saved.muted;
    } catch {
      /* ignore */
    }
  }

  function save() {
    try {
      localStorage.setItem(
        "brokenPythonSettings",
        JSON.stringify({ musicVol, sfxVol, muted })
      );
    } catch {
      /* ignore */
    }
  }

  function applyVol() {
    if (musicEl) musicEl.volume = muted ? 0 : musicVol;
    for (const node of Object.values(sfx)) {
      node.volume = muted ? 0 : sfxVol;
    }
  }

  function load() {
    restore();
    for (const [key, src] of Object.entries(SFX_FILES)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      sfx[key] = audio;
    }
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = "auto";
    applyVol();
  }

  async function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      musicEl.volume = 0;
      await musicEl.play();
      musicEl.pause();
      musicEl.currentTime = 0;
      applyVol();
    } catch {
      /* still locked until a later gesture */
      unlocked = true;
    }
  }

  function playSfx(name) {
    const src = sfx[name];
    if (!src) return;
    const node = src.cloneNode();
    node.volume = muted ? 0 : sfxVol;
    node.play().catch(() => {});
  }

  function playMusic(track) {
    const src = MUSIC[track];
    if (!src || !musicEl) return;
    if (currentTrack === track && !musicEl.paused) return;
    currentTrack = track;
    musicEl.src = src;
    musicEl.loop = true;
    musicEl.volume = muted ? 0 : musicVol;
    musicEl.play().catch(() => {});
  }

  function stopMusic() {
    currentTrack = null;
    if (musicEl) musicEl.pause();
  }

  return {
    load,
    unlock,
    playSfx,
    playMusic,
    stopMusic,
    save,
    get musicVol() {
      return musicVol;
    },
    get sfxVol() {
      return sfxVol;
    },
    get muted() {
      return muted;
    },
    get unlocked() {
      return unlocked;
    },
    setMusicVol(value) {
      musicVol = Math.max(0, Math.min(1, value));
      applyVol();
      save();
    },
    setSfxVol(value) {
      sfxVol = Math.max(0, Math.min(1, value));
      applyVol();
      save();
    },
    setMuted(value) {
      muted = Boolean(value);
      applyVol();
      save();
    },
    toggleMute() {
      muted = !muted;
      applyVol();
      save();
      return muted;
    },
  };
})();
