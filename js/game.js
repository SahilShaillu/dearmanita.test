/* =========================================================
   game.js
   "Save the Birthday Hearts" — a custom canvas mini-game.
   Catch falling love/cake/sparkle items, avoid gussa bombs,
   nakhre clouds and "3 months salary" warnings.
   Supports mouse, keyboard, and touch/drag controls.
   ========================================================= */

(function () {
  "use strict";

  const stage = document.getElementById("gameStage");
  const canvas = document.getElementById("gameCanvas");
  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d");
  const basket = document.getElementById("gameBasket");
  const scoreEl = document.getElementById("gameScore");
  const comboEl = document.getElementById("gameCombo");
  const livesEl = document.getElementById("gameLives");
  const toastEl = document.getElementById("gameToast");
  const overlayStart = document.getElementById("gameOverlay");
  const overlayEnd = document.getElementById("gameOverOverlay");
  const overlayEndText = document.getElementById("gameOverText");
  const startBtn = document.getElementById("gameStartBtn");
  const restartBtn = document.getElementById("gameRestartBtn");
  const codeBox = document.getElementById("gameCode");

  const GOOD = [
    { emoji: "❤️", points: 10, message: "+1 Love ❤️" },
    { emoji: "💗", points: 10, message: "+1 Love 💗" },
    { emoji: "🎂", points: 15, message: "Birthday calories don't count today. 🎂" },
    { emoji: "✨", points: 5, message: "+Sparkle ✨" }
  ];
  const BAD = [
    { emoji: "😂", message: "OH NO. RUN. 😂", type: "gussa" },
    { emoji: "😤", message: "Nakhre incoming... 😤", type: "nakhre" },
    { emoji: "💢", message: "3 MONTHS SALARY 💢", type: "salary" }
  ];

  const lowPower = window.VishiiEffects && window.VishiiEffects.isLowPower;

  let w, h, dpr;
  let items = [];
  let basketX = 0.5; // 0..1 fraction of width
  let score = 0;
  let combo = 1;
  let lives = 3;
  let level = 1;
  let spawnTimer = 0;
  let spawnInterval = 70; // frames
  let running = false;
  let rafId = null;
  let keysDown = {};
  let typedBuffer = "";
  let eggUnlocked = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = stage.clientWidth;
    h = stage.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function resetState() {
    items = [];
    score = 0;
    combo = 1;
    lives = 3;
    level = 1;
    spawnTimer = 0;
    spawnInterval = 70;
    basketX = 0.5;
    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = score;
    comboEl.textContent = "x" + combo;
    livesEl.textContent = lives;
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 900);
  }

  function spawnItem() {
    const isBad = Math.random() < Math.min(0.2 + level * 0.03, 0.4);
    const pool = isBad ? BAD : GOOD;
    const def = pool[Math.floor(Math.random() * pool.length)];
    items.push({
      x: Math.random() * (w - 40) + 20,
      y: -30,
      vy: (1.4 + level * 0.18) * (lowPower ? 0.85 : 1),
      size: 30 + Math.random() * 10,
      def,
      isBad,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 4
    });
  }

  function collide(item) {
    const bx = basketX * w;
    const by = h * 0.92;
    const dx = item.x - bx;
    const dy = item.y - by;
    return Math.sqrt(dx * dx + dy * dy) < item.size * 0.6 + 26;
  }

  function screenShake() {
    stage.style.transform = "translateX(-6px)";
    setTimeout(() => (stage.style.transform = "translateX(6px)"), 60);
    setTimeout(() => (stage.style.transform = ""), 120);
  }

  function update() {
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnItem();
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy;
      it.rotation += it.rotSpeed;

      if (collide(it)) {
        items.splice(i, 1);
        if (it.isBad) {
          lives--;
          combo = 1;
          screenShake();
          showToast(it.def.message);
          if (lives <= 0) {
            endGame();
            return;
          }
        } else {
          score += it.def.points * combo;
          combo = Math.min(combo + 1, 9);
          showToast(it.def.message);
        }
        updateHUD();
        continue;
      }

      if (it.y > h + 40) {
        items.splice(i, 1);
        if (!it.isBad) combo = 1; // missed love item resets combo
        updateHUD();
      }
    }

    // difficulty ramps with score
    level = 1 + Math.floor(score / 120);
    spawnInterval = Math.max(28, 70 - level * 4);

    basket.style.left = (basketX * 100) + "%";
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    items.forEach((it) => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate((it.rotation * Math.PI) / 180);
      ctx.font = it.size + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.def.emoji, 0, 0);
      ctx.restore();
    });
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startGame() {
    resetState();
    overlayStart.hidden = true;
    overlayEnd.hidden = true;
    codeBox.hidden = true;
    running = true;
    loop();
  }

  function endGame() {
    running = false;
    cancelAnimationFrame(rafId);
    const highScore = score >= 150;
    overlayEndText.textContent = highScore
      ? "Congratulations! You have successfully collected enough love for MANITA. ❤️  Score: " + score
      : "Hmm... clearly you need more practice loving the birthday girl. 😂  Score: " + score;
    overlayEnd.hidden = false;
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  /* ---------- Controls: mouse ---------- */
  stage.addEventListener("mousemove", (e) => {
    if (!running) return;
    const rect = stage.getBoundingClientRect();
    basketX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  });

  /* ---------- Controls: touch / drag ---------- */
  stage.addEventListener("touchmove", (e) => {
    if (!running) return;
    const rect = stage.getBoundingClientRect();
    const touch = e.touches[0];
    basketX = Math.min(1, Math.max(0, (touch.clientX - rect.left) / rect.width));
    e.preventDefault();
  }, { passive: false });

  /* ---------- Controls: keyboard ---------- */
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") keysDown.left = true;
    if (e.key === "ArrowRight") keysDown.right = true;

    // Easter egg: typing the birthday code anywhere unlocks an animation
    if (/^[0-9]$/.test(e.key)) {
      typedBuffer = (typedBuffer + e.key).slice(-8);
      if (typedBuffer === "13102003" && !eggUnlocked) {
        eggUnlocked = true;
        unlockBirthdayCode();
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keysDown.left = false;
    if (e.key === "ArrowRight") keysDown.right = false;
  });

  function keyboardLoop() {
    if (running) {
      if (keysDown.left) basketX = Math.max(0, basketX - 0.015);
      if (keysDown.right) basketX = Math.min(1, basketX + 0.015);
    }
    requestAnimationFrame(keyboardLoop);
  }
  requestAnimationFrame(keyboardLoop);

  function unlockBirthdayCode() {
    codeBox.hidden = false;
    if (window.VishiiEffects && window.VishiiEffects.fireFinaleBurst) {
      // small confetti moment reusing finale burst visuals if available
    }
    if (window.showEggToast) {
      window.showEggToast("Birthday code accepted! 🎉");
    }
  }
})();
