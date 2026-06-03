(function() {
  console.log("Initializing Gesture Recognition Adapter...");

  // 1. Inject Styles dynamically for the camera panel
  const style = document.createElement('style');
  style.textContent = `
    #camera-panel {
      position: absolute;
      left: 18px;
      bottom: 18px;
      z-index: 10000;
      width: 240px;
      height: 180px;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 8px;
      background: rgba(5, 9, 12, 0.85);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      font-family: sans-serif;
    }
    #video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
      opacity: 0.7;
    }
    #hand-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10001;
    }
    #tracking-status {
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: 8px;
      padding: 4px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.65);
      color: #85e5f2;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      z-index: 10002;
    }
  `;
  document.head.appendChild(style);

  // 2. Inject DOM Elements for camera preview
  const cameraPanel = document.createElement('aside');
  cameraPanel.id = 'camera-panel';
  cameraPanel.innerHTML = `
    <video id="video" playsinline muted></video>
    <canvas id="hand-canvas"></canvas>
    <div id="tracking-status">正在加载 AI 手势追踪模型...</div>
  `;
  document.body.appendChild(cameraPanel);

  const videoElement = document.getElementById("video");
  const handCanvas = document.getElementById("hand-canvas");
  const trackingStatus = document.getElementById("tracking-status");

  // Dynamic canvas resizing
  function resizeCanvas() {
    handCanvas.width = handCanvas.offsetWidth;
    handCanvas.height = handCanvas.offsetHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Hand skeleton connection pairs
  const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [5,6],[6,7],[7,8],
    [9,10],[10,11],[11,12],
    [13,14],[14,15],[15,16],
    [17,18],[18,19],[19,20],
    [0,5],[5,9],[9,13],[13,17],[0,17]
  ];

  // Tracking state variables
  let smoothedX = null;
  let smoothedY = null;
  const alpha = 0.68; // Smoothing factor
  let inputActive = false;

  // Comfort Zone boundaries (defaults)
  let bounds = {
    minX: 0.18,
    maxX: 0.82,
    minY: 0.15,
    maxY: 0.85
  };

  // Calibration state variables
  window.calibrationActive = false;
  let calibrationStartTime = 0;
  let calibMinX = 1.0;
  let calibMaxX = 0.0;
  let calibMinY = 1.0;
  let calibMaxY = 0.0;

  // Grid Calibration Parameters
  const gridRows = 9;
  const gridCols = 12;
  let visitedGrid = null;
  let calibRect = null;

  // Load custom bounds if they exist in localStorage
  try {
    const savedBounds = localStorage.getItem('ninja_calib_bounds');
    if (savedBounds) {
      bounds = JSON.parse(savedBounds);
      console.log("Loaded custom hand bounds from localStorage:", bounds);
    }
  } catch (e) {
    console.warn("Could not read localStorage bounds:", e);
  }

  // Setup Calibration Button Event
  function initCalibrationButtons() {
    const calibBtn = document.getElementById('calibrate-button');
    const confirmBtn = document.getElementById('calibration-confirm-button');
    if (calibBtn && confirmBtn) {
      calibBtn.addEventListener('click', enterCalibration);
      confirmBtn.addEventListener('click', exitCalibration);
    } else {
      setTimeout(initCalibrationButtons, 200);
    }
  }
  initCalibrationButtons();

  function enterCalibration() {
    if (window.calibrationActive) return;
    window.calibrationActive = true;

    // Explicitly release any active game input state
    if (window.game) {
      window.game.gestureActive = false;
      window.game._mouseDown = false;
      try {
        window.game.onDocumentMouseUp({});
      } catch (e) {}
    }
    inputActive = false;

    // Initialize/Reset grid calibration states
    visitedGrid = Array(gridRows).fill().map(() => Array(gridCols).fill(false));
    calibRect = null;

    calibMinX = 1.0;
    calibMaxX = 0.0;
    calibMinY = 1.0;
    calibMaxY = 0.0;
    
    // Show calibration overlay
    const overlay = document.getElementById('calibration-overlay');
    if (overlay) overlay.style.display = 'flex';

    // Move camera preview to overlay container
    const calibContainer = document.getElementById('calibration-camera-container');
    if (calibContainer) {
      calibContainer.appendChild(videoElement);
      calibContainer.appendChild(handCanvas);
    }

    trackingStatus.textContent = "⚙️ 校准模式已开启：请在空中随意挥手，覆盖您的上下左右舒适边界。";
  }

  function exitCalibration() {
    if (!window.calibrationActive) return;
    window.calibrationActive = false;

    // Hide calibration overlay
    const overlay = document.getElementById('calibration-overlay');
    if (overlay) overlay.style.display = 'none';

    // Move camera preview back to default camera panel
    const cameraPanel = document.getElementById('camera-panel');
    if (cameraPanel) {
      cameraPanel.insertBefore(videoElement, trackingStatus);
      cameraPanel.insertBefore(handCanvas, trackingStatus);
    }

    const w = calibMaxX - calibMinX;
    const h = calibMaxY - calibMinY;

    if (w > 0.12 && h > 0.12) {
      // Comfort padding margins (3%)
      const padX = w * 0.03;
      const padY = h * 0.03;

      bounds.minX = Math.max(0.01, calibMinX + padX);
      bounds.maxX = Math.min(0.99, calibMaxX - padX);
      bounds.minY = Math.max(0.01, calibMinY + padY);
      bounds.maxY = Math.min(0.99, calibMaxY - padY);

      try {
        localStorage.setItem('ninja_calib_bounds', JSON.stringify(bounds));
      } catch (e) {}

      trackingStatus.textContent = "🎉 校准成功！已保存个人专属体感范围。";
    } else {
      trackingStatus.textContent = "❌ 校准未保存：手势挥舞范围不足。";
    }

    const calibBtn = document.getElementById('calibrate-button');
    if (calibBtn) {
      calibBtn.style.background = 'rgba(133, 229, 242, 0.22)';
      calibBtn.style.borderColor = 'rgba(133, 229, 242, 0.45)';
      calibBtn.textContent = "⚙️ 重新校准舒适范围";
    }
  }

  // 3. Request webcam immediately to bypass CDN loading latency
  trackingStatus.textContent = "正在启动摄像头...";
  const streamPromise = navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" },
    audio: false
  }).then(async (stream) => {
    videoElement.srcObject = stream;
    await videoElement.play();
    trackingStatus.textContent = "正在加载 AI 手势追踪模型...";
    return stream;
  }).catch((err) => {
    console.error("Camera setup failed:", err);
    trackingStatus.textContent = "❌ 摄像头启动失败";
    throw err;
  });

  // 4. Load MediaPipe Hands script dynamically
  const mpScript = document.createElement('script');
  mpScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
  mpScript.onload = () => {
    console.log("MediaPipe Hands script loaded. Initializing model...");
    initMediaPipe();
  };
  document.head.appendChild(mpScript);

  function initMediaPipe() {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4
    });

    hands.onResults(onHandResults);

    // Wait for the stream to be ready, then start processing frames
    streamPromise.then((stream) => {
      trackingStatus.textContent = "👋 等待手势...";
      startFrameLoop(hands);
    }).catch((err) => {
      // Already logged
    });
  }

  function startFrameLoop(hands) {
    // Offscreen canvas for active lighting boost and auto-exposure
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 320;
    offscreenCanvas.height = 240;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // Frame sending loop
    const sendFrame = async () => {
      if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          // Draw video to offscreen canvas
          offscreenCtx.drawImage(videoElement, 0, 0, 320, 240);
          
          // Fast brightness analysis
          const imgData = offscreenCtx.getImageData(0, 0, 320, 240);
          const data = imgData.data;
          let sum = 0;
          let count = 0;
          const step = 8; // sample every 8th pixel
          for (let i = 0; i < data.length; i += 4 * step) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const luma = (r * 299 + g * 587 + b * 114) / 1000;
            sum += luma;
            count++;
          }
          const avgBrightness = sum / count;

          // Apply dynamic visual booster filter based on ambient light
          let brightness = 1.0;
          let contrast = 1.0;
          
          if (avgBrightness < 55) {
            // Dark room
            brightness = 1.9;
            contrast = 1.45;
          } else if (avgBrightness < 95) {
            // Backlit / Silhouette
            brightness = 1.55;
            contrast = 1.3;
          } else if (avgBrightness > 185) {
            // Overexposed
            brightness = 0.85;
            contrast = 1.1;
          }

          // Redraw with image filters applied
          offscreenCtx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(1.25)`;
          offscreenCtx.drawImage(videoElement, 0, 0, 320, 240);
          offscreenCtx.filter = 'none'; // reset

          // Feed the enhanced offscreen canvas to MediaPipe Hands
          await hands.send({ image: offscreenCanvas });
        } catch (e) {
          console.error("Frame send error:", e);
        }
      }
      requestAnimationFrame(sendFrame);
    };
    sendFrame();
  }

  function onHandResults(results) {
    const ctx = handCanvas.getContext('2d');
    ctx.clearRect(0, 0, handCanvas.width, handCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Index finger tip is landmark 8
      const tip = landmarks[8];
      const rawX = 1 - tip.x; // Mirror X coordinates
      const rawY = tip.y;

      // Apply Exponential Smoothing
      if (smoothedX === null) {
        smoothedX = rawX;
        smoothedY = rawY;
      } else {
        smoothedX = smoothedX + alpha * (rawX - smoothedX);
        smoothedY = smoothedY + alpha * (rawY - smoothedY);
      }

      let mappedX, mappedY;

      // If Calibration is Active, record ranges and draw active box
      if (window.calibrationActive) {
        if (!visitedGrid) {
          visitedGrid = Array(gridRows).fill().map(() => Array(gridCols).fill(false));
        }

        let col = Math.floor(smoothedX * gridCols);
        let row = Math.floor(smoothedY * gridRows);
        col = Math.max(0, Math.min(gridCols - 1, col));
        row = Math.max(0, Math.min(gridRows - 1, row));

        visitedGrid[row][col] = true;

        if (!calibRect) {
          calibRect = { minRow: row, maxRow: row, minCol: col, maxCol: col };
        }

        // Expansion logic loop (only expand if user can reach the boundary cells)
        let expanded = true;
        while (expanded) {
          expanded = false;

          // Try expanding Left
          if (calibRect.minCol > 0) {
            let count = 0;
            const c = calibRect.minCol - 1;
            for (let r = calibRect.minRow; r <= calibRect.maxRow; r++) {
              if (visitedGrid[r][c]) count++;
            }
            const needed = Math.ceil((calibRect.maxRow - calibRect.minRow + 1) * 0.5);
            if (count >= needed) {
              calibRect.minCol--;
              expanded = true;
            }
          }

          // Try expanding Right
          if (calibRect.maxCol < gridCols - 1) {
            let count = 0;
            const c = calibRect.maxCol + 1;
            for (let r = calibRect.minRow; r <= calibRect.maxRow; r++) {
              if (visitedGrid[r][c]) count++;
            }
            const needed = Math.ceil((calibRect.maxRow - calibRect.minRow + 1) * 0.5);
            if (count >= needed) {
              calibRect.maxCol++;
              expanded = true;
            }
          }

          // Try expanding Up
          if (calibRect.minRow > 0) {
            let count = 0;
            const r = calibRect.minRow - 1;
            for (let c = calibRect.minCol; c <= calibRect.maxCol; c++) {
              if (visitedGrid[r][c]) count++;
            }
            const needed = Math.ceil((calibRect.maxCol - calibRect.minCol + 1) * 0.5);
            if (count >= needed) {
              calibRect.minRow--;
              expanded = true;
            }
          }

          // Try expanding Down
          if (calibRect.maxRow < gridRows - 1) {
            let count = 0;
            const r = calibRect.maxRow + 1;
            for (let c = calibRect.minCol; c <= calibRect.maxCol; c++) {
              if (visitedGrid[r][c]) count++;
            }
            const needed = Math.ceil((calibRect.maxCol - calibRect.minCol + 1) * 0.5);
            if (count >= needed) {
              calibRect.maxRow++;
              expanded = true;
            }
          }
        }

        calibMinX = calibRect.minCol / gridCols;
        calibMaxX = (calibRect.maxCol + 1) / gridCols;
        calibMinY = calibRect.minRow / gridRows;
        calibMaxY = (calibRect.maxRow + 1) / gridRows;

        // Draw grid cell feedback
        const cellWidth = handCanvas.width / gridCols;
        const cellHeight = handCanvas.height / gridRows;

        // 1. Draw visited cells with soft cyan glow
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            if (visitedGrid[r][c]) {
              ctx.fillStyle = 'rgba(0, 255, 200, 0.15)';
              ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
            }
          }
        }

        // 2. Draw grid lines subtly
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 1; i < gridCols; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cellWidth, 0);
          ctx.lineTo(i * cellWidth, handCanvas.height);
          ctx.stroke();
        }
        for (let j = 1; j < gridRows; j++) {
          ctx.beginPath();
          ctx.moveTo(0, j * cellHeight);
          ctx.lineTo(handCanvas.width, j * cellHeight);
          ctx.stroke();
        }

        // 3. Draw current bounding box in orange
        ctx.strokeStyle = 'rgba(255, 172, 54, 0.9)';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(
          calibRect.minCol * cellWidth,
          calibRect.minRow * cellHeight,
          (calibRect.maxCol - calibRect.minCol + 1) * cellWidth,
          (calibRect.maxRow - calibRect.minRow + 1) * cellHeight
        );

        // Map using running bounds
        const rX = calibMaxX - calibMinX;
        const rY = calibMaxY - calibMinY;
        mappedX = rX > 0.05 ? (smoothedX - calibMinX) / rX : smoothedX;
        mappedY = rY > 0.05 ? (smoothedY - calibMinY) / rY : smoothedY;
      } else {
        // Draw active Comfort Zone Box (Cyan dashed)
        ctx.strokeStyle = 'rgba(133, 229, 242, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(
          bounds.minX * handCanvas.width,
          bounds.minY * handCanvas.height,
          (bounds.maxX - bounds.minX) * handCanvas.width,
          (bounds.maxY - bounds.minY) * handCanvas.height
        );
        ctx.setLineDash([]); // reset

        // Map using stored bounds
        const rX = bounds.maxX - bounds.minX;
        const rY = bounds.maxY - bounds.minY;
        mappedX = (smoothedX - bounds.minX) / (rX || 1);
        mappedY = (smoothedY - bounds.minY) / (rY || 1);
      }

      // Draw Hand Connections
      ctx.strokeStyle = 'rgba(133, 229, 242, 0.8)';
      ctx.lineWidth = 3;
      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        ctx.beginPath();
        ctx.moveTo((1 - start.x) * handCanvas.width, start.y * handCanvas.height);
        ctx.lineTo((1 - end.x) * handCanvas.width, end.y * handCanvas.height);
        ctx.stroke();
      });

      // Draw joints
      landmarks.forEach((lm, idx) => {
        ctx.fillStyle = idx === 8 ? 'rgba(255, 225, 138, 1)' : 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc((1 - lm.x) * handCanvas.width, lm.y * handCanvas.height, idx === 8 ? 8 : 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      if (!window.calibrationActive) {
        trackingStatus.textContent = "🎯 手势锁定成功";
      }

      // Forward inputs to window.game for sub-step 500Hz interpolation
      if (window.game && !window.calibrationActive) {
        // Clamp to [0, 1] bounds
        const clampedX = Math.max(0, Math.min(1, mappedX));
        const clampedY = Math.max(0, Math.min(1, mappedY));

        const gameX = clampedX * window.game.width;
        const gameY = clampedY * window.game.height;

        if (!inputActive) {
          window.game.gestureActive = true;
          window.game.targetGestureX = gameX;
          window.game.targetGestureY = gameY;
          window.game.currentGestureX = gameX;
          window.game.currentGestureY = gameY;
          
          window.game._mouseDown = true;
          window.game.onDocumentMouseDown({
            offsetX: gameX,
            offsetY: gameY,
            preventDefault: () => {}
          });
          inputActive = true;
        } else {
          window.game.targetGestureX = gameX;
          window.game.targetGestureY = gameY;
        }
      }

    } else {
      // Hand lost: trigger mouseup once
      if (inputActive && window.game) {
        window.game.gestureActive = false;
        window.game._mouseDown = false;
        window.game.onDocumentMouseUp({});
        inputActive = false;
      }
      smoothedX = null;
      smoothedY = null;
      trackingStatus.textContent = "👋 等待手势...";
    }
  }

})();
