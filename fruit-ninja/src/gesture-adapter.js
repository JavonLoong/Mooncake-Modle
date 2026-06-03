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
  const alpha = 0.68; // Smoothing factor (higher = faster response, lower = smoother)
  let inputActive = false;

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

      // Draw Comfort Zone (Active Play Area) Box
      ctx.strokeStyle = 'rgba(133, 229, 242, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(
        0.18 * handCanvas.width,
        0.15 * handCanvas.height,
        0.64 * handCanvas.width,
        0.70 * handCanvas.height
      );
      ctx.setLineDash([]); // reset

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

      trackingStatus.textContent = "🎯 手势锁定成功";

      // Forward inputs to window.game for sub-step 500Hz interpolation
      if (window.game) {
        // Map camera coordinates with custom comfort zone [0.18, 0.82] to full game window width
        const mappedX = (smoothedX - 0.18) / 0.64;
        const mappedY = (smoothedY - 0.15) / 0.70;
        
        // Clamp to [0, 1] bounds
        const clampedX = Math.max(0, Math.min(1, mappedX));
        const clampedY = Math.max(0, Math.min(1, clampedY));

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
