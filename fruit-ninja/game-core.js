(function handSliceCoreFactory(globalScope) {
  const gameModes = {
    survival: {
      label: "Survival",
      lives: 5,
      duration: null,
      bombBase: 0.04,
      bombGrowth: 0.0006,
      missPenalty: 1,
      bombPenalty: 2,
      spawnBase: 1120,
      spawnFloor: 440,
      waveBase: 1,
    },
    rush: {
      label: "Rush",
      lives: 3,
      duration: 60,
      bombBase: 0.06,
      bombGrowth: 0.0008,
      missPenalty: 0,
      bombPenalty: 1,
      spawnBase: 760,
      spawnFloor: 300,
      waveBase: 2,
    },
    focus: {
      label: "Focus",
      lives: 0,
      duration: 90,
      bombBase: 0,
      bombGrowth: 0,
      missPenalty: 0,
      bombPenalty: 0,
      spawnBase: 960,
      spawnFloor: 430,
      waveBase: 1,
    },
  };

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function positiveNumber(value) {
    return Math.max(0, finiteNumber(value, 0));
  }

  function positiveDimension(value) {
    const number = finiteNumber(value, 1);
    return number > 0 ? number : 1;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatTime(timeLeft) {
    if (timeLeft === null || timeLeft === undefined) return "∞";
    return String(Math.ceil(positiveNumber(timeLeft)));
  }

  function formatLives(modeId, lives) {
    return modeId === "focus" ? "∞" : String(Math.floor(positiveNumber(lives)));
  }

  function calculateWaveSize(mode, difficultyTime, score, randomFactor) {
    const safeDifficulty = positiveNumber(difficultyTime);
    const safeScore = positiveNumber(score);
    const safeRandom = clamp(finiteNumber(randomFactor, 0), 0, 1);
    const progressBoost = Math.min(Math.floor(safeDifficulty / 18), 3);
    const scoreBoost = Math.min(Math.floor(safeScore / 18), 2);
    const randomBoost = safeRandom > 0.45 ? 1 : 0;
    return Math.min(5, mode.waveBase + progressBoost + scoreBoost + randomBoost);
  }

  function calculateSliceReward(fruitType, combo) {
    const fruitScore = positiveNumber(fruitType && fruitType.score) || 1;
    const comboMultiplier = Math.max(1, Math.floor(positiveNumber(combo)));
    return fruitScore * comboMultiplier;
  }

  function nextSpawnInterval(mode, difficultyTime) {
    return Math.max(mode.spawnFloor, mode.spawnBase - positiveNumber(difficultyTime) * 10);
  }

  function bombChance(mode, difficultyTime) {
    return Math.min(0.12, mode.bombBase + positiveNumber(difficultyTime) * mode.bombGrowth);
  }

  function smoothPoint(previous, next, alpha) {
    const weight = Math.max(0, Math.min(1, alpha));
    const clean = (value) => Number(value.toFixed(6));
    return {
      x: clean(previous.x + (next.x - previous.x) * weight),
      y: clean(previous.y + (next.y - previous.y) * weight),
      z: clean(previous.z + (next.z - previous.z) * weight),
    };
  }

  function nextCombo(currentCombo, elapsedMs, comboWindowMs = 780, maxCombo = 8) {
    const ceiling = Math.max(1, Math.floor(positiveNumber(maxCombo)));
    const combo = clamp(Math.max(1, Math.floor(positiveNumber(currentCombo))), 1, ceiling);
    if (positiveNumber(elapsedMs) < positiveNumber(comboWindowMs)) {
      return Math.min(ceiling, combo + 1);
    }
    return 1;
  }

  function bestScoreKey(modeId) {
    return `hand-slice-best-${modeId}`;
  }

  function storedScoreValue(value) {
    return Math.floor(positiveNumber(value));
  }

  function updateBestScore(currentBest, score) {
    return Math.max(storedScoreValue(currentBest), storedScoreValue(score));
  }

  function togglePause(state) {
    if (!state.isGameActive) {
      return {
        isGameActive: state.isGameActive,
        isPaused: state.isPaused,
      };
    }

    return {
      isGameActive: state.isGameActive,
      isPaused: !state.isPaused,
    };
  }

  function cameraConstraints(isMobile) {
    return {
      video: {
        width: isMobile ? 360 : 640,
        height: isMobile ? 240 : 360,
        facingMode: "user",
      },
      audio: false,
    };
  }

  function advanceTimedMode(timeLeft, deltaTime) {
    if (timeLeft === null || timeLeft === undefined) {
      return { timeLeft: null, shouldEnd: false };
    }

    const nextTime = Math.max(0, finiteNumber(timeLeft, 0) - positiveNumber(deltaTime));
    return {
      timeLeft: nextTime,
      shouldEnd: nextTime <= 0,
    };
  }

  function frameDeltas(previousTimestamp, timestamp, maxPhysicsDelta = 0.04) {
    const elapsed = Math.max(0, (finiteNumber(timestamp, 0) - finiteNumber(previousTimestamp, 0)) / 1000);
    const clean = (value) => Number(value.toFixed(6));
    return {
      clockDelta: clean(elapsed),
      physicsDelta: clean(Math.min(elapsed, positiveNumber(maxPhysicsDelta))),
    };
  }

  function resolveLifePenalty(mode, lives, eventType) {
    const currentLives = positiveNumber(lives);
    const configuredPenalty = eventType === "bomb" ? mode.bombPenalty : mode.missPenalty;
    const nextLives = Math.max(0, currentLives - positiveNumber(configuredPenalty));
    const penalty = currentLives - nextLives;
    return {
      lives: nextLives,
      penalty,
      shouldEnd: penalty > 0 && positiveNumber(mode.lives) > 0 && nextLives <= 0,
    };
  }

  function countdownLabel(secondsRemaining) {
    if (secondsRemaining <= 0) return "GO";
    return String(Math.max(1, Math.ceil(secondsRemaining)));
  }

  function scoreRank(score) {
    if (score >= 150) return { label: "传奇忍者", nextAt: null };
    if (score >= 75) return { label: "刀锋大师", nextAt: 150 };
    if (score >= 25) return { label: "武者学徒", nextAt: 75 };
    return { label: "懵懂菜鸟", nextAt: 25 };
  }

  function canSpawnObject(state) {
    return Boolean(state.isGameActive && !state.isPaused && state.countdownRemaining === null);
  }

  function sliceHitRadius(radius, speed) {
    const objectRadius = positiveNumber(radius) || 1;
    const cappedSpeed = clamp(positiveNumber(speed), 0, 0.35);
    return Number((objectRadius * 1.28 + cappedSpeed * 16).toFixed(6));
  }

  function sanitizeInputPoint(point) {
    return {
      x: clamp(finiteNumber(point && point.x, 0.5), 0, 1),
      y: clamp(finiteNumber(point && point.y, 0.5), 0, 1),
      z: finiteNumber(point && point.z, 0),
    };
  }

  function cameraLandmarkToScreenPoint(landmark) {
    const point = sanitizeInputPoint(landmark);
    return {
      x: Number((1 - point.x).toFixed(6)),
      y: point.y,
      z: point.z,
    };
  }

  function cameraLandmarksToScreenPoints(landmarks) {
    if (!Array.isArray(landmarks)) return [];
    return landmarks.map(cameraLandmarkToScreenPoint);
  }

  function initialInputState(width, height) {
    const screenX = positiveDimension(width) / 2;
    const screenY = positiveDimension(height) / 2;
    return {
      fingerTip: { x: 0.5, y: 0.5, z: 0 },
      prevFingerTip: { x: 0.5, y: 0.5, z: 0 },
      fingerScreen: { x: screenX, y: screenY },
      prevFingerScreen: { x: screenX, y: screenY },
      handLandmarks: null,
      inputReady: false,
    };
  }

  function startRunState(mode, bestScore, width, height) {
    return {
      score: 0,
      lives: mode.lives,
      combo: 1,
      bestScore: positiveNumber(bestScore),
      timeLeft: mode.duration,
      isGameActive: true,
      isPaused: false,
      countdownRemaining: 3,
      objects: [],
      particles: [],
      splashes: [],
      trails: [],
      floatingTexts: [],
      lastFrameTime: 0,
      spawnInterval: mode.spawnBase,
      lastSpawnTime: 0,
      difficultyTime: 0,
      waveCount: 0,
      spawnTimeouts: [],
      lastSliceTime: 0,
      lastComboTime: 0,
      ...initialInputState(width, height),
    };
  }

  function modeChangeState(state, requestedModeId, modes) {
    const currentModeId = modes[state.mode] ? state.mode : "survival";
    const currentMode = modes[currentModeId];
    const requestedMode = modes[requestedModeId];

    if (!requestedMode || state.isGameActive) {
      return {
        mode: currentModeId,
        timeLeft: state.timeLeft === undefined ? currentMode.duration : state.timeLeft,
        lives: state.lives === undefined ? currentMode.lives : state.lives,
        changed: false,
      };
    }

    return {
      mode: requestedModeId,
      timeLeft: requestedMode.duration,
      lives: requestedMode.lives,
      changed: requestedModeId !== currentModeId,
    };
  }

  function finishRunState(width, height) {
    return {
      isGameActive: false,
      isPaused: false,
      countdownRemaining: null,
      objects: [],
      particles: [],
      splashes: [],
      trails: [],
      floatingTexts: [],
      spawnTimeouts: [],
      ...initialInputState(width, height),
    };
  }

  const core = {
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
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }

  if (globalScope) {
    globalScope.HandSliceCore = core;
  }
})(typeof window !== "undefined" ? window : undefined);
