const gameState = {
  score: 0,
  lives: 5,
  combo: 1,
  bestScore: 0,
  mode: "survival",
  timeLeft: null,
  isGameActive: false,
  isPaused: false,
  isMuted: false,
  countdownRemaining: null,
  objects: [],
  particles: [],
  splashes: [],
  trails: [],
  floatingTexts: [],
  lastFrameTime: 0,
  spawnInterval: 1180,
  lastSpawnTime: 0,
  difficultyTime: 0,
  waveCount: 0,
  spawnTimeouts: [],
  handLandmarks: null,
  pointerFallback: false,
  fingerTip: { x: 0.5, y: 0.5, z: 0 },
  prevFingerTip: { x: 0.5, y: 0.5, z: 0 },
  fingerScreen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  prevFingerScreen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  lastSliceTime: 0,
  lastComboTime: 0,
  trackingFrame: 0,
  inputReady: false,
  viewport: { width: 1, height: 1 },
  audio: null,
};

const {
  gameModes,
  formatTime,
  formatLives,
  calculateWaveSize,
  calculateSliceReward,
  nextSpawnInterval,
  bombChance,
  smoothPoint,
  nextCombo,
  bestScoreKey,
  storedScoreValue,
  updateBestScore,
  togglePause,
  cameraConstraints,
  advanceTimedMode,
  frameDeltas,
  resolveLifePenalty,
  countdownLabel,
  scoreRank,
  canSpawnObject,
  sliceHitRadius,
  sanitizeInputPoint,
  cameraLandmarkToScreenPoint,
  cameraLandmarksToScreenPoints,
  initialInputState,
  startRunState,
  modeChangeState,
  finishRunState,
} = window.HandSliceCore;

const videoElement = document.getElementById("video");
const gameCanvas = document.getElementById("game-canvas");
const fxCanvas = document.getElementById("fx-canvas");
const handCanvas = document.getElementById("hand-canvas");
const fxCtx = fxCanvas.getContext("2d");
const handCtx = handCanvas.getContext("2d");
const scoreElement = document.getElementById("score");
const comboElement = document.getElementById("combo");
const livesElement = document.getElementById("lives");
const timeLeftElement = document.getElementById("time-left");
const bestScoreElement = document.getElementById("best-score");
const finalScoreElement = document.getElementById("final-score");
const finalRankElement = document.getElementById("final-rank");
const nextRankElement = document.getElementById("next-rank");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over");
const loadingScreen = document.getElementById("loading");
const loadingMessage = document.getElementById("loading-message");
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownLabelElement = document.getElementById("countdown-label");
const trackingStatus = document.getElementById("tracking-status");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const pauseButton = document.getElementById("pause-button");
const muteButton = document.getElementById("mute-button");
const resumeButton = document.getElementById("resume-button");
const pauseOverlay = document.getElementById("pause-overlay");
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
const MAX_PARTICLES = 180;
const MAX_SPLASHES = 180;
const MAX_TRAILS = 480;
const FRAME_FALLBACK_MS = 120;
let frameScheduled = false;
let animationFrameId = null;
let frameFallbackId = null;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x091015, 18, 52);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 24);

const renderer = new THREE.WebGLRenderer({
  canvas: gameCanvas,
  alpha: true,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.45);
keyLight.position.set(-8, 12, 12);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8deeff, 0.9);
rimLight.position.set(8, 4, 10);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 26, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0x071012, transparent: true, opacity: 0.24 })
);
floor.position.set(0, -15.8, -4);
floor.rotation.x = -Math.PI * 0.47;
scene.add(floor);

const fruitTypes = [
  { name: "apple", color: 0xd8332f, accent: 0xff756c, juice: "rgba(245,64,58,0.9)", radius: 1.32, score: 1 },
  { name: "orange", color: 0xf58b25, accent: 0xffc15a, juice: "rgba(255,148,38,0.9)", radius: 1.25, score: 1 },
  { name: "melon", color: 0x36a34a, accent: 0x7bd94b, juice: "rgba(99,220,76,0.9)", radius: 1.48, score: 2 },
  { name: "lemon", color: 0xffd744, accent: 0xfff6a1, juice: "rgba(255,225,69,0.9)", radius: 1.18, score: 1 },
  { name: "plum", color: 0x8a49d8, accent: 0xd189ff, juice: "rgba(183,89,255,0.9)", radius: 1.22, score: 1 },
];

function updateHud() {
  scoreElement.textContent = String(gameState.score);
  comboElement.textContent = `x${gameState.combo}`;
  livesElement.textContent = formatLives(gameState.mode, gameState.lives);
  timeLeftElement.textContent = formatTime(gameState.timeLeft);
  bestScoreElement.textContent = String(gameState.bestScore);
}

function loadBestScore(modeId) {
  return storedScoreValue(localStorage.getItem(bestScoreKey(modeId)));
}

function saveBestScore(modeId, score) {
  localStorage.setItem(bestScoreKey(modeId), String(storedScoreValue(score)));
}

function updateControlButtons() {
  pauseButton.classList.toggle("active", gameState.isPaused);
  pauseButton.textContent = gameState.isPaused ? "▶" : "Ⅱ";
  pauseButton.setAttribute("aria-label", gameState.isPaused ? "Resume game" : "Pause game");
  muteButton.classList.toggle("active", gameState.isMuted);
  muteButton.textContent = gameState.isMuted ? "×" : "♪";
  muteButton.setAttribute("aria-label", gameState.isMuted ? "Unmute" : "Mute");
}

function updateCountdown(deltaTime, timestamp) {
  if (gameState.countdownRemaining === null) return false;

  gameState.countdownRemaining = Math.max(0, gameState.countdownRemaining - deltaTime);
  countdownLabelElement.textContent = countdownLabel(gameState.countdownRemaining);
  countdownOverlay.style.display = "flex";

  if (gameState.countdownRemaining <= 0) {
    gameState.countdownRemaining = null;
    countdownOverlay.style.display = "none";
    gameState.lastSpawnTime = timestamp;
    playTone(760, 0.11, "triangle", 0.05);
  }

  return true;
}

function setPaused(nextPaused) {
  const next = togglePause({
    isGameActive: gameState.isGameActive,
    isPaused: gameState.isPaused,
  });

  if (typeof nextPaused === "boolean" && gameState.isGameActive) {
    gameState.isPaused = nextPaused;
  } else {
    gameState.isPaused = next.isPaused;
  }

  pauseOverlay.style.display = gameState.isPaused ? "flex" : "none";
  updateControlButtons();
}

function ensureAudio() {
  if (gameState.audio || !window.AudioContext && !window.webkitAudioContext) return;
  const AudioClass = window.AudioContext || window.webkitAudioContext;
  gameState.audio = new AudioClass();
}

function playTone(frequency, duration, type = "sine", gain = 0.06, delay = 0) {
  if (!gameState.audio || gameState.isMuted) return;
  const ctx = gameState.audio;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  envelope.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  envelope.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + delay + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration + 0.025);
}

function playSliceSound(combo) {
  playTone(520 + combo * 44, 0.09, "triangle", 0.055);
  playTone(920 + combo * 22, 0.07, "sine", 0.035, 0.025);
}

function playBombSound() {
  playTone(90, 0.24, "sawtooth", 0.07);
  playTone(54, 0.32, "square", 0.045, 0.02);
}

function playMissSound() {
  playTone(180, 0.16, "triangle", 0.035);
}

function playStartSound() {
  playTone(330, 0.08, "triangle", 0.05);
  playTone(494, 0.08, "triangle", 0.05, 0.08);
  playTone(660, 0.12, "triangle", 0.05, 0.16);
}

function currentTimestamp() {
  return window.performance && typeof window.performance.now === "function" ? window.performance.now() : Date.now();
}

function scheduleGameLoop() {
  if (frameScheduled) return;
  frameScheduled = true;
  let completed = false;

  const runFrame = (timestamp) => {
    if (completed) return;
    completed = true;
    frameScheduled = false;
    animationFrameId = null;
    if (frameFallbackId !== null) {
      window.clearTimeout(frameFallbackId);
      frameFallbackId = null;
    }
    gameLoop(timestamp || currentTimestamp());
  };

  animationFrameId = window.requestAnimationFrame(runFrame);
  frameFallbackId = window.setTimeout(() => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    runFrame(currentTimestamp());
  }, FRAME_FALLBACK_MS);
}

function isMobileDevice() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

function resizeCanvases() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);

  fxCanvas.width = Math.floor(width * window.devicePixelRatio);
  fxCanvas.height = Math.floor(height * window.devicePixelRatio);
  fxCanvas.style.width = `${width}px`;
  fxCanvas.style.height = `${height}px`;
  fxCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

  const panel = document.getElementById("camera-panel");
  handCanvas.width = Math.max(1, Math.floor(panel.clientWidth * window.devicePixelRatio));
  handCanvas.height = Math.max(1, Math.floor(panel.clientHeight * window.devicePixelRatio));
  handCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

  const distance = camera.position.z;
  gameState.viewport.height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
  gameState.viewport.width = gameState.viewport.height * camera.aspect;

  if (!gameState.inputReady) {
    resetInputState();
  }
}

function normalizedToWorld(point) {
  return {
    x: (point.x - 0.5) * gameState.viewport.width,
    y: (0.5 - point.y) * gameState.viewport.height,
  };
}

function worldToScreen(position) {
  const vector = new THREE.Vector3(position.x, position.y, position.z || 0);
  vector.project(camera);
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
  };
}

function makeMaterial(color, roughness = 0.54, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

function disposeObject(object3D) {
  if (!object3D || object3D.userData.disposed) return;
  object3D.userData.disposed = true;
  object3D.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function removeSceneObject(object3D) {
  if (object3D && object3D.parent) {
    object3D.parent.remove(object3D);
  } else {
    scene.remove(object3D);
  }
  disposeObject(object3D);
}

function clearSpawnTimeouts() {
  gameState.spawnTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  gameState.spawnTimeouts = [];
}

function resetInputState() {
  Object.assign(gameState, initialInputState(window.innerWidth, window.innerHeight));
}

function clearOverlayCanvases() {
  fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  handCtx.clearRect(0, 0, handCanvas.clientWidth, handCanvas.clientHeight);
}

function createFruitMesh(type) {
  const group = new THREE.Group();
  const bodyMaterial = makeMaterial(type.color, 0.5);
  const accentMaterial = makeMaterial(type.accent, 0.42);
  const darkMaterial = makeMaterial(0x1c5c2e, 0.7);

  const body = new THREE.Mesh(new THREE.SphereGeometry(type.radius, 32, 24), bodyMaterial);
  body.scale.y = type.name === "lemon" ? 0.86 : 1;
  body.scale.x = type.name === "melon" ? 1.16 : 1;
  group.add(body);

  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(type.radius * 0.22, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.38 })
  );
  shine.position.set(-type.radius * 0.38, type.radius * 0.42, type.radius * 0.72);
  group.add(shine);

  if (type.name === "apple" || type.name === "plum") {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.7, 10), makeMaterial(0x5b351d, 0.82));
    stem.position.y = type.radius * 0.9;
    stem.rotation.z = -0.32;
    group.add(stem);

    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), makeMaterial(0x49bd6b, 0.54));
    leaf.scale.set(1.4, 0.42, 0.7);
    leaf.position.set(0.32, type.radius * 1.05, 0.06);
    leaf.rotation.z = -0.55;
    group.add(leaf);
  }

  if (type.name === "melon") {
    for (let i = -2; i <= 2; i += 1) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(type.radius * (0.66 + Math.abs(i) * 0.05), 0.035, 8, 32), darkMaterial);
      stripe.rotation.x = Math.PI / 2;
      stripe.rotation.y = i * 0.18;
      stripe.position.x = i * 0.18;
      group.add(stripe);
    }
  }

  if (type.name === "orange" || type.name === "lemon") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(type.radius * 0.65, 0.045, 8, 34), accentMaterial);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.z = type.radius * 0.04;
    group.add(ring);
  }

  group.userData.color = type.color;
  group.userData.juice = type.juice;
  group.userData.radius = type.radius;
  return group;
}

function createBombMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 28, 20),
    new THREE.MeshStandardMaterial({ color: 0x16191d, roughness: 0.34, metalness: 0.18 })
  );
  group.add(body);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.35, 16), makeMaterial(0x5e6369, 0.42, 0.2));
  cap.position.y = 1.02;
  group.add(cap);

  const fuse = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 18), makeMaterial(0xd89f45, 0.68));
  fuse.position.set(0.1, 1.28, 0);
  fuse.rotation.z = 0.72;
  group.add(fuse);

  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7040 })
  );
  ember.position.set(0.48, 1.48, 0);
  group.add(ember);

  group.userData.radius = 1.22;
  return group;
}

function spawnObject() {
  if (!canSpawnObject(gameState)) return;
  const mode = gameModes[gameState.mode];
  const isBomb = Math.random() < bombChance(mode, gameState.difficultyTime);
  const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
  const mesh = isBomb ? createBombMesh() : createFruitMesh(fruitType);
  const radius = mesh.userData.radius || fruitType.radius;

  const xRange = gameState.viewport.width * (isMobileDevice() ? 0.62 : 0.72);
  mesh.position.set((Math.random() - 0.5) * xRange, -gameState.viewport.height * 0.57 - radius, Math.random() * 1.2 - 0.6);
  mesh.rotation.set(Math.random() * 1.4, Math.random() * 1.4, Math.random() * 1.4);

  const speedBoost = Math.min(gameState.difficultyTime * 0.08, 4);
  const object = {
    mesh,
    type: isBomb ? "bomb" : "fruit",
    fruitType,
    radius,
    sliced: false,
    velocity: {
      x: (Math.random() - 0.5) * (4.8 + speedBoost * 0.2),
      y: 28 + Math.random() * 8 + speedBoost,
      z: (Math.random() - 0.5) * 0.8,
      rotationX: (Math.random() - 0.5) * 0.1,
      rotationY: (Math.random() - 0.5) * 0.12,
      rotationZ: (Math.random() - 0.5) * 0.1,
    },
  };

  gameState.objects.push(object);
  scene.add(mesh);
}

function spawnWave() {
  const mode = gameModes[gameState.mode];
  const waveSize = calculateWaveSize(mode, gameState.difficultyTime, gameState.score, Math.random());

  for (let i = 0; i < waveSize; i += 1) {
    const timeoutId = window.setTimeout(() => {
      gameState.spawnTimeouts = gameState.spawnTimeouts.filter((id) => id !== timeoutId);
      spawnObject();
    }, i * (90 + Math.random() * 85));
    gameState.spawnTimeouts.push(timeoutId);
  }
}

function calculateHandSpeed() {
  const dx = gameState.fingerTip.x - gameState.prevFingerTip.x;
  const dy = gameState.fingerTip.y - gameState.prevFingerTip.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  const projection = { x: start.x + t * dx, y: start.y + t * dy };
  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function checkCollisions() {
  if (!gameState.inputReady || !gameState.isGameActive) return;

  const speed = calculateHandSpeed();
  if (speed < 0.00036) return;

  const finger = normalizedToWorld(gameState.fingerTip);
  const prevFinger = normalizedToWorld(gameState.prevFingerTip);

  for (const object of gameState.objects) {
    if (object.sliced) continue;
    const objectPoint = { x: object.mesh.position.x, y: object.mesh.position.y };
    const distance = distanceToSegment(objectPoint, prevFinger, finger);
    if (distance <= sliceHitRadius(object.radius, speed)) {
      sliceObject(object);
    }
  }
}

function sliceObject(object) {
  object.sliced = true;
  removeSceneObject(object.mesh);

  const screen = worldToScreen(object.mesh.position);
  if (object.type === "bomb") {
    const mode = gameModes[gameState.mode];
    const lifeResult = resolveLifePenalty(mode, gameState.lives, "bomb");
    gameState.lives = lifeResult.lives;
    gameState.combo = 1;
    createBurst(object.mesh.position, 0xff5a3d, 24, 1.3);
    addSplash(screen.x, screen.y, "rgba(255,76,54,0.95)", 28);
    addFloatingText(lifeResult.penalty > 0 ? `-${lifeResult.penalty} lives` : "boom", screen.x, screen.y, "#ff806c");
    playBombSound();
    flashDanger();
    if (lifeResult.shouldEnd) {
      endGame();
    }
    updateHud();
    return;
  }

  const now = performance.now();
  gameState.combo = nextCombo(gameState.combo, now - gameState.lastComboTime);
  gameState.lastComboTime = now;
  gameState.lastSliceTime = now;

  const earned = calculateSliceReward(object.fruitType, gameState.combo);
  gameState.score += earned;
  const nextBest = updateBestScore(gameState.bestScore, gameState.score);
  if (nextBest !== gameState.bestScore) {
    gameState.bestScore = nextBest;
    saveBestScore(gameState.mode, nextBest);
  }

  createSliceHalves(object.mesh.position, object.fruitType.color, object.radius);
  createBurst(object.mesh.position, object.fruitType.color, 18 + gameState.combo * 2, 1);
  addSplash(screen.x, screen.y, object.fruitType.juice, 20 + gameState.combo * 3);
  addFloatingText(`+${earned}`, screen.x, screen.y, "#fff1a8");
  if (gameState.combo >= 3) {
    addFloatingText(`${gameState.combo} cut`, screen.x, screen.y - 34, "#85e5f2");
  }
  playSliceSound(gameState.combo);
  updateHud();
}

function createSliceHalves(position, color, radius) {
  for (const side of [-1, 1]) {
    while (gameState.particles.length >= MAX_PARTICLES) {
      const oldest = gameState.particles.shift();
      if (oldest) removeSceneObject(oldest.mesh);
    }

    const half = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.74, 18, 12),
      makeMaterial(color, 0.62)
    );
    half.scale.set(0.58, 1, 0.9);
    half.position.copy(position);
    half.position.x += side * radius * 0.18;
    half.rotation.z = side * 0.72;

    const particleObject = {
      mesh: half,
      createTime: performance.now(),
      lifetime: 760,
      velocity: {
        x: side * (5.5 + Math.random() * 2),
        y: 3.5 + Math.random() * 3,
        z: (Math.random() - 0.5) * 1.2,
        rotationX: side * 0.16,
        rotationY: (Math.random() - 0.5) * 0.18,
        rotationZ: side * 0.19,
      },
    };
    gameState.particles.push(particleObject);
    scene.add(half);
  }
}

function createBurst(position, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    while (gameState.particles.length >= MAX_PARTICLES) {
      const oldest = gameState.particles.shift();
      if (oldest) removeSceneObject(oldest.mesh);
    }

    const size = 0.14 + Math.random() * 0.28;
    const geometry = Math.random() > 0.45
      ? new THREE.DodecahedronGeometry(size, 0)
      : new THREE.SphereGeometry(size, 8, 6);
    const particle = new THREE.Mesh(geometry, makeMaterial(color, 0.58));
    particle.position.copy(position);

    const angle = Math.random() * Math.PI * 2;
    const up = (Math.random() - 0.15) * 8;
    const speed = (5 + Math.random() * 8) * force;
    const particleObject = {
      mesh: particle,
      createTime: performance.now(),
      lifetime: 720 + Math.random() * 520,
      velocity: {
        x: Math.cos(angle) * speed,
        y: up,
        z: Math.sin(angle) * speed * 0.25,
        rotationX: (Math.random() - 0.5) * 0.32,
        rotationY: (Math.random() - 0.5) * 0.32,
        rotationZ: (Math.random() - 0.5) * 0.32,
      },
    };
    gameState.particles.push(particleObject);
    scene.add(particle);
  }
}

function addSplash(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    while (gameState.splashes.length >= MAX_SPLASHES) {
      gameState.splashes.shift();
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    gameState.splashes.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3 + Math.random() * 12,
      color,
      createTime: performance.now(),
      lifetime: 520 + Math.random() * 420,
    });
  }
}

function addFloatingText(text, x, y, color) {
  gameState.floatingTexts.push({
    text,
    x,
    y,
    color,
    createTime: performance.now(),
    lifetime: 820,
  });
}

function addTrail() {
  const speed = calculateHandSpeed();
  if (speed < 0.00018) return;
  while (gameState.trails.length >= MAX_TRAILS) {
    gameState.trails.shift();
  }

  gameState.trails.push({
    x1: gameState.prevFingerScreen.x,
    y1: gameState.prevFingerScreen.y,
    x2: gameState.fingerScreen.x,
    y2: gameState.fingerScreen.y,
    createTime: performance.now(),
    lifetime: 220,
    width: Math.min(22, 7 + speed * 33 * 240),
  });
}

function flashDanger() {
  document.body.classList.remove("flash-danger");
  window.setTimeout(() => document.body.classList.add("flash-danger"), 0);
  window.setTimeout(() => document.body.classList.remove("flash-danger"), 260);
}

function updateObjects(deltaTime) {
  const gravity = 27 + Math.min(gameState.difficultyTime * 0.04, 4);
  const bottomLimit = -gameState.viewport.height * 0.66;
  let shouldEndAfterUpdate = false;

  gameState.objects = gameState.objects.filter((object) => {
    object.velocity.y -= gravity * deltaTime;
    object.mesh.position.x += object.velocity.x * deltaTime;
    object.mesh.position.y += object.velocity.y * deltaTime;
    object.mesh.position.z += object.velocity.z * deltaTime;
    object.mesh.rotation.x += object.velocity.rotationX;
    object.mesh.rotation.y += object.velocity.rotationY;
    object.mesh.rotation.z += object.velocity.rotationZ;

    if (object.mesh.position.y < bottomLimit) {
      if (!object.sliced && object.type === "fruit") {
        const mode = gameModes[gameState.mode];
        const lifeResult = resolveLifePenalty(mode, gameState.lives, "miss");
        gameState.lives = lifeResult.lives;
        gameState.combo = 1;
        updateHud();
        if (lifeResult.penalty > 0) {
          playMissSound();
          addFloatingText("miss", worldToScreen(object.mesh.position).x, window.innerHeight - 90, "#a8c2cf");
        }
        if (lifeResult.shouldEnd) {
          shouldEndAfterUpdate = true;
        }
      }
      removeSceneObject(object.mesh);
      return false;
    }
    return !object.sliced;
  });

  if (shouldEndAfterUpdate) {
    endGame();
  }
}

function updateParticles(deltaTime) {
  const now = performance.now();
  gameState.particles = gameState.particles.filter((particle) => {
    particle.velocity.y -= 18 * deltaTime;
    particle.mesh.position.x += particle.velocity.x * deltaTime;
    particle.mesh.position.y += particle.velocity.y * deltaTime;
    particle.mesh.position.z += particle.velocity.z * deltaTime;
    particle.mesh.rotation.x += particle.velocity.rotationX;
    particle.mesh.rotation.y += particle.velocity.rotationY;
    particle.mesh.rotation.z += particle.velocity.rotationZ;

    const age = now - particle.createTime;
    const opacity = 1 - age / particle.lifetime;
    particle.mesh.material.transparent = true;
    particle.mesh.material.opacity = Math.max(0, opacity);
    if (age >= particle.lifetime) {
      removeSceneObject(particle.mesh);
      return false;
    }
    return true;
  });
}

function drawFx(deltaTime) {
  const now = performance.now();
  fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  gameState.splashes = gameState.splashes.filter((splash) => {
    const age = now - splash.createTime;
    if (age >= splash.lifetime) return false;
    const alpha = 1 - age / splash.lifetime;
    splash.vy += 420 * deltaTime;
    splash.x += splash.vx * deltaTime;
    splash.y += splash.vy * deltaTime;
    fxCtx.globalAlpha = alpha * 0.72;
    fxCtx.fillStyle = splash.color;
    fxCtx.beginPath();
    fxCtx.ellipse(splash.x, splash.y, splash.radius * (1.2 - alpha * 0.35), splash.radius * 0.46, splash.vx * 0.01, 0, Math.PI * 2);
    fxCtx.fill();
    return true;
  });

  gameState.trails = gameState.trails.filter((trail) => {
    const age = now - trail.createTime;
    if (age >= trail.lifetime) return false;
    const alpha = 1 - age / trail.lifetime;
    const gradient = fxCtx.createLinearGradient(trail.x1, trail.y1, trail.x2, trail.y2);
    gradient.addColorStop(0, `rgba(255,255,255,0)`);
    gradient.addColorStop(0.25, `rgba(145,238,255,${alpha * 0.65})`);
    gradient.addColorStop(1, `rgba(255,246,188,${alpha})`);
    fxCtx.globalAlpha = 1;
    fxCtx.strokeStyle = gradient;
    fxCtx.lineWidth = trail.width * alpha;
    fxCtx.lineCap = "round";
    fxCtx.shadowBlur = 24 * alpha;
    fxCtx.shadowColor = "rgba(134,226,255,0.9)";
    fxCtx.beginPath();
    fxCtx.moveTo(trail.x1, trail.y1);
    fxCtx.lineTo(trail.x2, trail.y2);
    fxCtx.stroke();
    fxCtx.shadowBlur = 0;
    return true;
  });

  gameState.floatingTexts = gameState.floatingTexts.filter((item) => {
    const age = now - item.createTime;
    if (age >= item.lifetime) return false;
    const t = age / item.lifetime;
    fxCtx.globalAlpha = 1 - t;
    fxCtx.fillStyle = item.color;
    fxCtx.font = "800 28px Inter, Segoe UI, Arial, sans-serif";
    fxCtx.textAlign = "center";
    fxCtx.fillText(item.text, item.x, item.y - t * 64);
    return true;
  });

  fxCtx.globalAlpha = 1;
}

function maybeSpawn(timestamp) {
  if (timestamp - gameState.lastSpawnTime < gameState.spawnInterval) return;
  const mode = gameModes[gameState.mode];
  gameState.lastSpawnTime = timestamp;
  gameState.difficultyTime += gameState.spawnInterval / 1000;
  gameState.waveCount += 1;
  gameState.spawnInterval = nextSpawnInterval(mode, gameState.difficultyTime);

  spawnWave();
}

function gameLoop(timestamp) {
  if (!gameState.lastFrameTime) {
    gameState.lastFrameTime = timestamp;
  }

  const { clockDelta, physicsDelta } = frameDeltas(gameState.lastFrameTime, timestamp);
  gameState.lastFrameTime = timestamp;

  if (gameState.isGameActive && !gameState.isPaused) {
    if (updateCountdown(clockDelta, timestamp)) {
      drawFx(physicsDelta);
      renderer.render(scene, camera);
      scheduleGameLoop();
      return;
    }

    const timer = advanceTimedMode(gameState.timeLeft, clockDelta);
    if (gameState.timeLeft !== timer.timeLeft) {
      gameState.timeLeft = timer.timeLeft;
      updateHud();
    }
    if (timer.shouldEnd) {
      endGame();
    }
  }

  if (gameState.isGameActive && !gameState.isPaused) {
    maybeSpawn(timestamp);
    updateObjects(physicsDelta);
    updateParticles(physicsDelta);

    if (!gameState.pointerFallback) {
      // 2000Hz 物理与轨迹子步进 (Sub-stepping 33 times per frame for 2000Hz precision)
      const SUB_STEPS = 33;
      for (let step = 0; step < SUB_STEPS; step++) {
        if (gameState.inputReady && gameState.targetFingerTip) {
          gameState.prevFingerTip = { ...gameState.fingerTip };
          gameState.prevFingerScreen = { ...gameState.fingerScreen };

          // 33次子步进，每步以 0.014 的权重平滑逼近目标点
          gameState.fingerTip = smoothPoint(gameState.fingerTip, gameState.targetFingerTip, 0.014);

          gameState.fingerScreen = {
            x: gameState.fingerTip.x * window.innerWidth,
            y: gameState.fingerTip.y * window.innerHeight,
          };
        }
        checkCollisions();
        if (gameState.inputReady) addTrail();
      }
    } else {
      // 鼠标/触摸模拟模式下无需插针，只进行单次更新与判定
      checkCollisions();
      if (gameState.inputReady) addTrail();
    }
  }

  drawFx(physicsDelta);
  renderer.render(scene, camera);
  scheduleGameLoop();
}

function resetGame() {
  ensureAudio();
  if (gameState.audio && gameState.audio.state === "suspended") {
    gameState.audio.resume();
  }
  playStartSound();

  const mode = gameModes[gameState.mode];
  clearSpawnTimeouts();
  gameState.objects.forEach((object) => removeSceneObject(object.mesh));
  gameState.particles.forEach((particle) => removeSceneObject(particle.mesh));
  Object.assign(gameState, startRunState(mode, loadBestScore(gameState.mode), window.innerWidth, window.innerHeight));
  clearOverlayCanvases();
  updateHud();
  countdownLabelElement.textContent = countdownLabel(gameState.countdownRemaining);
  countdownOverlay.style.display = "flex";
  pauseOverlay.style.display = "none";
  updateControlButtons();
  startScreen.style.display = "none";
  gameOverScreen.style.display = "none";
}

function endGame() {
  if (!gameState.isGameActive) return;
  gameState.isGameActive = false;
  gameState.isPaused = false;
  gameState.countdownRemaining = null;
  clearSpawnTimeouts();
  gameState.objects.forEach((object) => removeSceneObject(object.mesh));
  gameState.particles.forEach((particle) => removeSceneObject(particle.mesh));
  Object.assign(gameState, finishRunState(window.innerWidth, window.innerHeight));
  clearOverlayCanvases();
  finalScoreElement.textContent = String(gameState.score);
  const rank = scoreRank(gameState.score);
  finalRankElement.textContent = rank.label;
  nextRankElement.textContent = rank.nextAt === null ? "已达到最高段位" : `距离下一段位还需 ${rank.nextAt - gameState.score} 分`;
  countdownOverlay.style.display = "none";
  pauseOverlay.style.display = "none";
  updateControlButtons();
  gameOverScreen.style.display = "flex";
}

function drawHandLandmarks(landmarks) {
  const width = handCanvas.clientWidth;
  const height = handCanvas.clientHeight;
  handCtx.clearRect(0, 0, width, height);

  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17],
  ];

  handCtx.lineWidth = 2;
  handCtx.strokeStyle = "rgba(133,229,242,0.9)";
  handCtx.beginPath();
  for (const [startIndex, endIndex] of connections) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    handCtx.moveTo(start.x * width, start.y * height);
    handCtx.lineTo(end.x * width, end.y * height);
  }
  handCtx.stroke();

  for (let i = 0; i < landmarks.length; i += 1) {
    const point = landmarks[i];
    handCtx.fillStyle = i === 8 ? "rgba(255,225,138,0.98)" : "rgba(255,255,255,0.76)";
    handCtx.beginPath();
    handCtx.arc(point.x * width, point.y * height, i === 8 ? 5 : 3, 0, Math.PI * 2);
    handCtx.fill();
  }
}

function updatePointerControl(event) {
  if (!gameState.pointerFallback) return;
  const point = event.touches ? event.touches[0] : event;
  if (!point) return;

  const rawTip = sanitizeInputPoint({
    x: point.clientX / window.innerWidth,
    y: point.clientY / window.innerHeight,
    z: 0,
  });

  if (!gameState.inputReady) {
    gameState.fingerTip = rawTip;
    gameState.fingerScreen = { x: point.clientX, y: point.clientY };
    gameState.prevFingerTip = { ...gameState.fingerTip };
    gameState.prevFingerScreen = { ...gameState.fingerScreen };
    gameState.inputReady = true;
    return;
  }

  gameState.prevFingerTip = { ...gameState.fingerTip };
  gameState.prevFingerScreen = { ...gameState.fingerScreen };
  gameState.fingerTip = smoothPoint(gameState.fingerTip, rawTip, 0.72);
  gameState.fingerScreen = {
    x: gameState.fingerTip.x * window.innerWidth,
    y: gameState.fingerTip.y * window.innerHeight,
  };
  gameState.handLandmarks = [{ x: gameState.fingerTip.x, y: gameState.fingerTip.y, z: 0 }];
}

function enablePointerFallback() {
  if (gameState.pointerFallback) return;
  gameState.pointerFallback = true;
  trackingStatus.textContent = "🖱️ 鼠标/触摸模拟";
  window.addEventListener("mousemove", updatePointerControl);
  window.addEventListener("touchmove", updatePointerControl, { passive: true });
}

function getSmartSlicingPoint(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return cameraLandmarkToScreenPoint(null);
  }
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const indexTip = landmarks[8];
  const middleMcp = landmarks[9];
  
  const palmSize = dist(wrist, middleMcp) || 1;
  const indexRatio = dist(indexTip, indexMcp) / palmSize;
  
  // Decide whether pointing or fist using hysteresis to prevent coordinate wiggling
  if (gameState.isPointing === undefined) {
    gameState.isPointing = true;
  }

  // Hysteresis thresholds:
  // If pointing, require indexRatio to drop below 0.38 to switch to fist.
  // If fist, require indexRatio to rise above 0.48 to switch to pointing.
  if (gameState.isPointing) {
    if (indexRatio < 0.38) {
      gameState.isPointing = false;
    }
  } else {
    if (indexRatio > 0.48) {
      gameState.isPointing = true;
    }
  }

  // Lock to a single physical landmark (indexTip or middleMcp) to guarantee straight-line accuracy
  if (gameState.isPointing) {
    return indexTip;
  } else {
    return middleMcp;
  }
}

function onHandResults(results) {
  gameState.trackingFrame += 1;
  const MAX_LOST_FRAMES = 8; // 8 frames buffer (approx 130ms at 60fps)

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    gameState.lostFramesCount = 0; // Reset lost frames
    
    const landmarks = results.multiHandLandmarks[0];
    const screenLandmarks = cameraLandmarksToScreenPoints(landmarks);
    const rawTip = getSmartSlicingPoint(screenLandmarks);
    gameState.handLandmarks = screenLandmarks;

    if (!gameState.inputReady) {
      gameState.targetFingerTip = rawTip;
      gameState.fingerTip = rawTip;
      gameState.fingerScreen = {
        x: gameState.fingerTip.x * window.innerWidth,
        y: gameState.fingerTip.y * window.innerHeight,
      };
      gameState.prevFingerTip = { ...gameState.fingerTip };
      gameState.prevFingerScreen = { ...gameState.fingerScreen };
      gameState.velocity = { x: 0, y: 0 };
      gameState.lostFramesCount = 0;
      gameState.inputReady = true;
    } else {
      const prevTarget = gameState.targetFingerTip || gameState.fingerTip;
      const dx = rawTip.x - prevTarget.x;
      const dy = rawTip.y - prevTarget.y;
      const dist = Math.hypot(dx, dy);

      // --- Maximum Speed Cap to prevent teleportation ---
      const MAX_STEP = 0.15;
      let targetTip = rawTip;
      if (dist > MAX_STEP && dist > 0) {
        const ratio = MAX_STEP / dist;
        targetTip = {
          x: prevTarget.x + dx * ratio,
          y: prevTarget.y + dy * ratio,
          z: rawTip.z
        };
      }

      gameState.targetFingerTip = targetTip;
      
      gameState.velocity = {
        x: targetTip.x - prevTarget.x,
        y: targetTip.y - prevTarget.y
      };
    }

    if (gameState.trackingFrame % 2 === 0) {
      drawHandLandmarks(screenLandmarks);
    }
    trackingStatus.textContent = "🎯 手势锁定成功";
  } else {
    // Hand NOT detected in this frame
    if (gameState.inputReady && (gameState.lostFramesCount || 0) < MAX_LOST_FRAMES) {
      gameState.lostFramesCount = (gameState.lostFramesCount || 0) + 1;
      
      // --- Inertial Prediction (惯性预测) ---
      if (gameState.velocity) {
        gameState.velocity.x *= 0.85;
        gameState.velocity.y *= 0.85;
      } else {
        gameState.velocity = { x: 0, y: 0 };
      }

      const prevTarget = gameState.targetFingerTip || gameState.fingerTip;
      gameState.targetFingerTip = {
        x: Math.max(0, Math.min(1, prevTarget.x + gameState.velocity.x)),
        y: Math.max(0, Math.min(1, prevTarget.y + gameState.velocity.y)),
        z: prevTarget.z
      };

      gameState.handLandmarks = null;
      handCtx.clearRect(0, 0, handCanvas.clientWidth, handCanvas.clientHeight);
      trackingStatus.textContent = "🎯 手势锁定成功 (惯性预测中)";
    } else {
      // Truly lost tracking
      gameState.inputReady = false;
      gameState.handLandmarks = null;
      gameState.velocity = { x: 0, y: 0 };
      gameState.lostFramesCount = 0;
      handCtx.clearRect(0, 0, handCanvas.clientWidth, handCanvas.clientHeight);
      if (!gameState.pointerFallback) {
        trackingStatus.textContent = "👋 请向镜头展示食指";
      }
    }
  }
}

async function setupHandTracking() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera access is not available in this browser.");
  }

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.48,
    minTrackingConfidence: 0.48,
  });

  hands.onResults(onHandResults);

  const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints(isMobileDevice()));
  videoElement.srcObject = stream;
  await videoElement.play();

  let sendingFrame = false;
  const processFrame = async () => {
    if (!sendingFrame && videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      sendingFrame = true;
      try {
        await hands.send({ image: videoElement });
      } finally {
        sendingFrame = false;
      }
    }

    requestAnimationFrame(processFrame);
  };

  requestAnimationFrame(processFrame);
}

async function init() {
  gameState.bestScore = loadBestScore(gameState.mode);
  updateHud();
  updateControlButtons();
  resizeCanvases();
  window.addEventListener("resize", resizeCanvases);
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = modeChangeState(gameState, button.dataset.mode || gameState.mode, gameModes);
      if (!nextMode.changed) return;

      gameState.mode = nextMode.mode;
      modeButtons.forEach((modeButton) => modeButton.classList.toggle("active", modeButton.dataset.mode === nextMode.mode));
      gameState.timeLeft = nextMode.timeLeft;
      gameState.lives = nextMode.lives;
      gameState.bestScore = loadBestScore(gameState.mode);
      updateHud();
    });
  });
  startButton.addEventListener("click", resetGame);
  restartButton.addEventListener("click", resetGame);
  pauseButton.addEventListener("click", () => setPaused());
  resumeButton.addEventListener("click", () => setPaused(false));
  muteButton.addEventListener("click", () => {
    gameState.isMuted = !gameState.isMuted;
    updateControlButtons();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "p") {
      setPaused();
    }
    if (event.key.toLowerCase() === "m") {
      gameState.isMuted = !gameState.isMuted;
      updateControlButtons();
    }
  });
  scheduleGameLoop();

  try {
    await setupHandTracking();
    loadingScreen.style.display = "none";
  } catch (error) {
    console.warn(error);
    enablePointerFallback();
    loadingMessage.textContent = "摄像头初始化失败。已自动降级为鼠标指针模拟模式。";
    loadingScreen.style.display = "none";
  }
}

init();
