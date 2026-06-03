function Game(opts) {
  this.width = opts.width;
  this.height = opts.height;
  this.container = opts.container;
  this.loader = opts.loader;

  this.projector = new THREE.Projector();
  this.scene = new THREE.Scene();
  this.splashedJuice = [];

  // create camera
  this.camera = new THREE.OrthographicCamera(-640, 640, 480, -480, 1, 1000000);
  this.camera.position.set(0, 0, 2500);
  this.scene.add(this.camera);

  // create lights
  var ambient = new THREE.AmbientLight(0xcccccc);
  this.scene.add(ambient);

  var mainLight = new THREE.DirectionalLight(0xffffff, 0.3);
  mainLight.position.set(0, 0, 1);
  this.scene.add(mainLight);

  // create renderer
  this.renderer = new THREE.WebGLRenderer({ antialias: true });
  this.renderer.setSize(this.width, this.height);
  $(this.container).append(this.renderer.domElement);
  $(this.renderer.domElement).css({
    'position' : 'absolute',
    'left' : (window.innerWidth - this.width) / 2,
    'top' : (window.innerHeight - this.height) / 2,
    'z-index': '11'
  });

  // create background 2d canvas
  this.bgCanvas = new LayeredCanvas(this.width, this.height);
  $(this.bgCanvas.mainCanvas).css({
    'position' : 'absolute',
    'left' : (window.innerWidth - this.width) / 2,
    'top' : (window.innerHeight - this.height) / 2,
    'box-shadow' : '5px 5px 25px #000'
  });
  $(this.container).append(this.bgCanvas.mainCanvas);

  // create fx 2d canvas for blade trails
  this.fxCanvas = document.createElement('canvas');
  this.fxCanvas.width = this.width;
  this.fxCanvas.height = this.height;
  $(this.fxCanvas).css({
    'position' : 'absolute',
    'left' : (window.innerWidth - this.width) / 2,
    'top' : (window.innerHeight - this.height) / 2,
    'pointer-events': 'none',
    'z-index': '12',
    'mix-blend-mode': 'screen'
  });
  $(this.container).append(this.fxCanvas);
  this.fxCtx = this.fxCanvas.getContext('2d');

  this.stats = new Stats();
  this.stats.domElement.style.position = 'absolute';
  this.stats.domElement.style.top = '0px';
  $(this.container).append(this.stats.domElement);

  // game rules variables
  this.mode = 'classic';
  this.bladeStyle = 'default';
  this.dojoTheme = 'classic';
  this.scoreNumber = 0;
  this.lives = 3;
  this.timeLeft = 0;
  this.comboCount = 1;
  this.lastComboTime = 0;
  this.trails = [];
  this.floatingTexts = [];
  this.bestScores = { classic: 0, rush: 0, focus: 0 };
  
  // Load best scores from localStorage
  try {
    var stored = localStorage.getItem('fn_best_scores');
    if (stored) this.bestScores = JSON.parse(stored);
  } catch(e) {}

  // audio variables
  this.isMuted = false;
  this.audio = null;
  this.soundBuffers = {};
  this.soundsLoaded = false;
  this.currentBgm = null;
  this.bgmName = null;

  // register mouse/pointer events
  this._mouseDown = false;
  this.prevMouse = [0, 0];
  $('#container').mousedown(this.onDocumentMouseDown.bind(this));
  $('#container').mouseup(this.onDocumentMouseUp.bind(this));
  $('#container').mousemove(this.onDocumentMouseMove.bind(this));

  // Initialize UI Bindings
  this.initHtmlUI();
}

Game.prototype = {
  initScene: function() {
    var self = this;
    console.log('Initializing UI manager for game!');
    this.um = new UIManager(this.scene);
    this.um.init(this.loader, {
      home: [
        { name: 'about', fruit: 'orange', position: new THREE.Vector3(300, 0, 100), rotation: new THREE.Vector3(0, 0, 0), rotationDelta: new THREE.Vector3(0.02, 0, 0.01), eulerOrder: 'ZYX' },
        { name: 'game', fruit: 'apple', position: new THREE.Vector3(0, 0, 200), rotation: new THREE.Vector3(0, 0, 0.3), rotationDelta: new THREE.Vector3(0, 0.04, 0) },
        { name: 'swag', fruit: 'watermelon', position: new THREE.Vector3(-300, 0, 100), rotation: new THREE.Vector3(0, 0, 0), rotationDelta: new THREE.Vector3(0.02, 0.01, 0) }
      ],
      about: [
        { name: 'back', fruit: 'banana', position: new THREE.Vector3(450, -350, 100), rotation: new THREE.Vector3(0, 0, 0.3), rotationDelta: new THREE.Vector3(0, 0.08, 0)}
      ],
      swag: [
        { name: 'back', fruit: 'banana', position: new THREE.Vector3(400, -300, 100), rotation: new THREE.Vector3(0, 0, 0.3), rotationDelta: new THREE.Vector3(0, 0.08, 0)}
      ],
      score: [],
      game: [],
      paused: []
    });

    // background image
    this.bgCanvas.addLayer('static', 'global', 'bg', [
                           { image: this.loader.images['bg1'], x: 0, y: 0, noShortCut: true}
    ]);
    this.bgCanvas.addLayer('animated', 'global', 'slash', []);
    
    // scene-based rotating circle
    this.bgCanvas.addLayer('animated', 'sceneBased', 'circle', {
      home: [
        {image: this.loader.images['gameRing'], x: 0, y: 0, animations: [
          { animateFuc: this.bgCanvas.animations.rotate, timingFuc: this.bgCanvas.timingFuctions.linear(0.02, 0) }
        ]},
        {image: this.loader.images['swagRing'], x: -300, y: 0, animations: [
          { animateFuc: this.bgCanvas.animations.rotate, timingFuc: this.bgCanvas.timingFuctions.linear(0.02, 0) }
        ]},
        {image: this.loader.images['aboutRing'], x: 300, y: 0, animations: [
          { animateFuc: this.bgCanvas.animations.rotate, timingFuc: this.bgCanvas.timingFuctions.linear(0.02, 0) }
        ]}
      ],
      about: [
        {image: this.loader.images['backRing'], x: 450, y: -350, animations: [
          { animateFuc: this.bgCanvas.animations.rotate, timingFuc: this.bgCanvas.timingFuctions.linear(0.02, 0) }
        ]}
      ]
    });

    // Hide original 2D canvas score/pause layer (we use HTML5 overlays instead!)
    this.bgCanvas.addLayer('static', 'sceneBased', 'score', {
      game: [],
      score: []
    });

    console.log('Creating fsm for game!');
    this.fsm = StateMachine.create({
      initial: 'home',
      events: [
        { name: 'enterAbout', from: 'home', to: 'about'},
        { name: 'exitAbout', from: 'about', to: 'home' },
        { name: 'startGame', from: 'home', to: 'game' },
        { name: 'pauseGame', from: 'game', to: 'paused' },
        { name: 'returnGame', from: 'paused', to: 'game' },
        { name: 'exitGame', from: ['paused', 'game'], to: 'home' },
        { name: 'retryGame', from: ['paused', 'score'], to: 'game' },
        { name: 'endGame', from: 'game', to: 'score' },
        { name: 'returnHome', from: 'score', to: 'home' }
      ],
      callbacks: {
        onenterabout: this.enterAboutCallback.bind(this),
        onleaveabout: this.leaveAboutCallback.bind(this),
        onenterhome: this.enterHomeCallback.bind(this),
        onleavehome: this.leaveHomeCallback.bind(this),
        onentergame: this.enterGameCallback.bind(this),
        onleavegame: this.leaveGameCallback.bind(this),
        onenterpaused: this.enterPausedCallback.bind(this),
        onleavepaused: this.leavePausedCallback.bind(this),
        onenterscore: this.enterScoreCallback.bind(this),
        onleavescore: this.leaveScoreCallback.bind(this)
      }
    });

    // Set resize listener to center canvases
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.onWindowResize();

    // Start playing home music on first user click
    const startBgmOnInteraction = () => {
      self.initSounds();
      window.removeEventListener('click', startBgmOnInteraction);
      window.removeEventListener('touchstart', startBgmOnInteraction);
    };
    window.addEventListener('click', startBgmOnInteraction);
    window.addEventListener('touchstart', startBgmOnInteraction);
  },

  onWindowResize: function() {
    var left = (window.innerWidth - this.width) / 2;
    var top = (window.innerHeight - this.height) / 2;
    $(this.renderer.domElement).css({ 'left': left, 'top': top });
    $(this.bgCanvas.mainCanvas).css({ 'left': left, 'top': top });
    $(this.fxCanvas).css({ 'left': left, 'top': top });
  },

  initHtmlUI: function() {
    var self = this;
    
    // Customization Selection
    $('#mode-select .mode-button').click(function() {
      $('#mode-select .mode-button').removeClass('active');
      $(this).addClass('active');
      self.mode = $(this).data('mode');
      self.initSounds();
    });

    $('#dojo-theme').change(function() {
      self.setDojoTheme($(this).val());
      self.initSounds();
    });

    $('#blade-style').change(function() {
      self.bladeStyle = $(this).val();
      self.initSounds();
    });

    // Mute Button
    $('#mute-button').click(function() {
      self.isMuted = !self.isMuted;
      $(this).text(self.isMuted ? '🔇' : '🔊');
      if (self.isMuted) {
        if (self.currentBgm) {
          try { self.currentBgm.stop(); } catch(e) {}
          self.currentBgm = null;
        }
      } else {
        self.playBgm(self.fsm.current === 'game' ? 'game_bgm' : 'home_bgm');
      }
    });

    // Pause Button
    $('#pause-button').click(function() {
      if (self.fsm.current === 'game') {
        self.fsm.pauseGame();
      }
    });

    // Resume Button
    $('#resume-button').click(function() {
      self.fsm.returnGame();
    });

    // Restart Button (Paused)
    $('#restart-button-paused').click(function() {
      self.fsm.retryGame();
    });

    // Exit Button (Paused)
    $('#exit-button-paused').click(function() {
      self.fsm.exitGame();
    });

    // Restart Button (Game Over)
    $('#restart-button').click(function() {
      self.fsm.retryGame();
    });

    // Exit Button (Game Over)
    $('#exit-button').click(function() {
      self.fsm.returnHome();
    });
  },

  setDojoTheme: function(theme) {
    this.dojoTheme = theme;
    var bgImg = this.loader.images['bg1']; // classic Wood
    if (theme === 'sakura') {
      bgImg = this.loader.images['bg_sakura'];
    } else if (theme === 'cyber') {
      bgImg = this.loader.images['bg_cyber'];
    }
    this.bgCanvas.layers[0].textures = [
      { image: bgImg, x: 0, y: 0, noShortCut: true }
    ];
    this.bgCanvas.layers[0].needUpdate = true;
    this._updateCanvas();
  },

  // Audio Context & Sounds loaded dynamically
  initSounds: function() {
    if (this.audio) return;
    var AudioClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioClass) return;
    
    this.audio = new AudioClass();
    var self = this;
    
    var soundUrls = {
      slice: 'sounds/slice.mp3',
      miss: 'sounds/00000001.mp3',
      bomb_explode: 'sounds/0000001b.mp3',
      game_start: 'sounds/game_start.mp3',
      game_over: 'sounds/0000002d.mp3',
      combo3: 'sounds/0000001c.mp3',
      combo4: 'sounds/0000001d.mp3',
      combo5: 'sounds/0000001e.mp3',
      home_bgm: 'sounds/home_bgm.mp3',
      game_bgm: 'sounds/game_bgm.mp3'
    };

    var loadSound = function(name, url) {
      fetch(url)
        .then(function(res) { return res.arrayBuffer(); })
        .then(function(buffer) { return self.audio.decodeAudioData(buffer); })
        .then(function(decoded) {
          self.soundBuffers[name] = decoded;
          if (name === 'home_bgm' && self.fsm.current === 'home') {
            self.playBgm('home_bgm');
          }
        })
        .catch(function(err) {
          console.warn('Failed to load audio: ' + name, err);
        });
    };

    Object.keys(soundUrls).forEach(function(name) {
      loadSound(name, soundUrls[name]);
    });
  },

  playTone: function(frequency, duration, type, gainValue) {
    if (this.isMuted || !this.audio) return;
    var ctx = this.audio;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(gainValue || 0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  },

  playSound: function(name, volume, loop) {
    if (this.isMuted || !this.audio) return null;
    var buffer = this.soundBuffers[name];
    
    // Synthesizer Fallbacks if file not yet loaded
    if (!buffer) {
      if (name === 'slice') this.playTone(600, 0.08, 'triangle', 0.05);
      else if (name === 'bomb_explode') this.playTone(80, 0.3, 'sawtooth', 0.1);
      else if (name === 'miss') this.playTone(180, 0.15, 'triangle', 0.03);
      else if (name === 'game_start') this.playTone(440, 0.1, 'sine', 0.05);
      return null;
    }

    var source = this.audio.createBufferSource();
    source.buffer = buffer;
    source.loop = !!loop;
    
    var gainNode = this.audio.createGain();
    gainNode.gain.setValueAtTime(volume || 0.5, this.audio.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(this.audio.destination);
    source.start(0);
    
    return source;
  },

  playBgm: function(name) {
    if (this.isMuted) return;
    if (this.currentBgm && this.bgmName === name) return;
    
    if (this.currentBgm) {
      try { this.currentBgm.stop(); } catch(e) {}
    }
    
    this.bgmName = name;
    this.currentBgm = this.playSound(name, name === 'game_bgm' ? 0.28 : 0.3, true);
  },

  // FSM Callback functions
  enterAboutCallback: function(event, from, to, msg) {
    this.um.reset('about');
    this.um.add('about');
  },

  leaveAboutCallback: function(event, from, to, msg) {
    this.um.remove('about');
  },



  enterHomeCallback: function(event, from, to, msg) {
    this.um.reset('home');
    this.um.add('home');
    
    // Restore home HUD overlay & BGM
    $('#start-card').show();
    $('#hud').hide();
    $('#paused-overlay').hide();
    $('#game-over').hide();
    this.playBgm('home_bgm');
  },

  leaveHomeCallback: function(event, from, to, msg) {
    this.um.remove('home');
    $('#start-card').hide();
  },

  enterGameCallback: function(event, from, to, msg) {
    var self = this;
    if (from !== 'paused') {
      this.um.reset('game');
      this.um.add('game');
      
      this.scoreNumber = 0;
      this.comboCount = 1;
      this.lastComboTime = 0;
      this.trails = [];
      this.floatingTexts = [];
      
      if (this.mode === 'classic') {
        this.lives = 3;
        $('#hud-lives-item').show();
        $('#hud-timer-item').hide();
        this.updateLivesDisplay();
      } else {
        this.timeLeft = (this.mode === 'rush') ? 60 : 90;
        $('#hud-lives-item').hide();
        $('#hud-timer-item').show();
        $('#hud-timer').text(this.timeLeft + 's');
      }
      
      $('#hud-score').text(this.scoreNumber);
      $('#hud-best-score').text(this.bestScores[this.mode] || 0);
      $('#hud-mode-display').text(this.mode === 'classic' ? '经典体感' : (this.mode === 'rush' ? '疯狂极速' : '纯享专注'));
      
      // Countdown trigger
      this.triggerCountdown(function() {
        $('#hud').show();
        self.playBgm('game_bgm');
        self.playSound('game_start', 0.6);
        self.startGameWaves();
      });
    } else {
      // Resumed
      $('#hud').show();
      this.playBgm('game_bgm');
      this.startGameWaves();
    }
  },

  leaveGameCallback: function(event, from, to, msg) {
    if (to === 'score') {
      this.um.remove('game');
      $('#hud').hide();
    }
  },

  enterPausedCallback: function(event, from, to, msg) {
    $('#paused-overlay').show();
    if (this.currentBgm) {
      try { this.currentBgm.stop(); } catch(e) {}
      this.currentBgm = null;
    }
  },

  leavePausedCallback: function(event, from, to, msg) {
    $('#paused-overlay').hide();
    if (to === 'home') {
      this.um.remove('game');
    }
  },

  enterScoreCallback: function(event, from, to, msg) {
    var self = this;
    
    // Save high scores
    if (this.scoreNumber > (this.bestScores[this.mode] || 0)) {
      this.bestScores[this.mode] = this.scoreNumber;
      try {
        localStorage.setItem('fn_best_scores', JSON.stringify(this.bestScores));
      } catch(e) {}
    }
    
    // Rank logic
    var rankLabel = "懵懂菜鸟";
    if (this.scoreNumber >= 150) rankLabel = "水果刀神 🏆";
    else if (this.scoreNumber >= 75) rankLabel = "斩击大师 ⚔️";
    else if (this.scoreNumber >= 25) rankLabel = "见习学徒 🍎";
    
    $('#game-over-score').text(this.scoreNumber);
    $('#score-rank').text('称号：' + rankLabel);
    $('#best-score-display').text('历史最高得分：' + (this.bestScores[this.mode] || 0));
    
    $('#game-over').show();
    this.playSound('game_over', 0.7);
    this.playBgm('home_bgm');
  },

  leaveScoreCallback: function(event, from, to, msg) {
    $('#game-over').hide();
  },

  triggerCountdown: function(callback) {
    var self = this;
    var overlay = $('#countdown-overlay');
    var label = $('#countdown-label');
    
    overlay.css('display', 'flex');
    var count = 3;
    label.text(count);
    this.playTone(760, 0.1, 'triangle', 0.05);

    var tick = function() {
      count--;
      if (count <= 0) {
        overlay.hide();
        callback();
      } else {
        label.text(count);
        self.playTone(760, 0.1, 'triangle', 0.05);
        setTimeout(tick, 1000);
      }
    };
    setTimeout(tick, 1000);
  },

  updateLivesDisplay: function() {
    var hearts = '';
    for (var i = 0; i < 3; i++) {
      hearts += (i < this.lives) ? '❤️' : '🖤';
    }
    $('#hud-lives').text(hearts);
  },

  startGameWaves: function() {
    // Generate fruits periodically
    this._generateFruit();
  },

  renderLoop: function() {
    var self = this;
    (function loop() {
      requestAnimationFrame(loop);
      self._update();
      self._render();
    })();
  },

  _update: function() {
    var self = this;

    if (window.calibrationActive) {
      this.gestureActive = false;
      this._mouseDown = false;
      return;
    }

    // Sub-stepping interpolation for gesture hands (simulating 500Hz/high frame rate input)
    if (this.gestureActive && this.targetGestureX !== undefined && this.targetGestureY !== undefined) {
      if (this.currentGestureX === undefined || this.currentGestureX === null) {
        this.currentGestureX = this.targetGestureX;
        this.currentGestureY = this.targetGestureY;
      }
      
      var steps = 8; // 8 sub-steps * 60fps = 480Hz ~ 500Hz interpolation
      for (var k = 0; k < steps; k++) {
        var factor = 0.22;
        var nextX = this.currentGestureX + (this.targetGestureX - this.currentGestureX) * factor;
        var nextY = this.currentGestureY + (this.targetGestureY - this.currentGestureY) * factor;
        
        this.onDocumentMouseMove({
          offsetX: nextX,
          offsetY: nextY,
          preventDefault: function() {}
        });
        
        this.currentGestureX = nextX;
        this.currentGestureY = nextY;
      }
    }

    this.splashedJuice.forEach(function(juice) {
      juice.update(self.scene);
    });
    this._updateUI();
    this._updateCanvas();
    this._updateCamera();
    this.stats.update();

    // Timer and countdown update
    if (this.fsm.current === 'game') {
      var now = performance.now();
      if (!this._lastTimeUpdate) this._lastTimeUpdate = now;
      var elapsed = (now - this._lastTimeUpdate) / 1000;
      this._lastTimeUpdate = now;

      if (this.mode !== 'classic') {
        this.timeLeft -= elapsed;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.fsm.endGame();
        }
        $('#hud-timer').text(Math.ceil(this.timeLeft) + 's');
      }

      // Cleanup fallen fruits / Miss detection
      var gameGroup = this.um.ui.game;
      if (gameGroup) {
        for (var i = gameGroup.children.length - 1; i >= 0; i--) {
          var child = gameGroup.children[i];
          var outY = -600;
          if (child.position.y < outY || (child.sliced && child.children[0].position.y < outY)) {
            // Miss penalty for classic mode
            if (!child.sliced && child.kind !== 'bomb') {
              this.handleMiss();
            }
            gameGroup.remove(child);
          }
        }
      }
    } else {
      this._lastTimeUpdate = null;
    }

    // Render 2D blade FX trail
    this.drawFxTrails();
  },

  handleMiss: function() {
    if (this.fsm.current !== 'game') return;
    this.playSound('miss', 0.4);
    
    // flash red screen briefly
    $('#bomb-flash').addClass('active');
    setTimeout(function() { $('#bomb-flash').removeClass('active'); }, 120);

    if (this.mode === 'classic') {
      this.lives--;
      this.updateLivesDisplay();
      if (this.lives <= 0) {
        this.fsm.endGame();
      }
    }
  },

  drawFxTrails: function() {
    var now = performance.now();
    var ctx = this.fxCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Update & draw texts
    this.floatingTexts = this.floatingTexts.filter(function(item) {
      var age = now - item.createTime;
      if (age >= item.lifetime) return false;
      var t = age / item.lifetime;
      var y = item.y - t * 45;
      var opacity = 1 - t;
      
      ctx.globalAlpha = opacity;
      ctx.font = '900 24px Outfit, Inter, sans-serif';
      ctx.fillStyle = item.color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(item.text, item.x, y);
      ctx.fillText(item.text, item.x, y);
      return true;
    });

    var self = this;
    this.trails = this.trails.filter(function(trail) {
      var age = now - trail.createTime;
      if (age >= trail.lifetime) return false;
      var alpha = 1 - age / trail.lifetime;
      
      var gradient = ctx.createLinearGradient(trail.x1, trail.y1, trail.x2, trail.y2);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');

      var shadowColor = 'rgba(134,226,255,0.9)';
      
      if (self.bladeStyle === 'flame') {
        gradient.addColorStop(0.25, 'rgba(255,90,0,' + (alpha * 0.7) + ')');
        gradient.addColorStop(1, 'rgba(255,210,0,' + alpha + ')');
        shadowColor = 'rgba(255,60,0,' + alpha + ')';
      } else if (self.bladeStyle === 'ice') {
        gradient.addColorStop(0.25, 'rgba(0,190,255,' + (alpha * 0.7) + ')');
        gradient.addColorStop(1, 'rgba(200,240,255,' + alpha + ')');
        shadowColor = 'rgba(0,210,255,' + alpha + ')';
      } else if (self.bladeStyle === 'rainbow') {
        var hue1 = (now / 4.5) % 360;
        var hue2 = (now / 4.5 + 80) % 360;
        gradient.addColorStop(0.25, 'hsla(' + hue1 + ', 100%, 65%, ' + (alpha * 0.75) + ')');
        gradient.addColorStop(1, 'hsla(' + hue2 + ', 100%, 75%, ' + alpha + ')');
        shadowColor = 'hsla(' + hue1 + ', 100%, 60%, ' + alpha + ')';
      } else if (self.bladeStyle === 'shadow') {
        gradient.addColorStop(0.25, 'rgba(100,0,200,' + (alpha * 0.6) + ')');
        gradient.addColorStop(1, 'rgba(240,160,255,' + alpha + ')');
        shadowColor = 'rgba(160,0,255,' + alpha + ')';
      } else {
        // Classic Gold / Default
        gradient.addColorStop(0.25, 'rgba(255,200,50,' + (alpha * 0.65) + ')');
        gradient.addColorStop(1, 'rgba(255,255,200,' + alpha + ')');
        shadowColor = 'rgba(255,210,100,' + (alpha * 0.9) + ')';
      }

      ctx.globalAlpha = 1;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = trail.width * alpha;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 24 * alpha;
      ctx.shadowColor = shadowColor;
      ctx.beginPath();
      ctx.moveTo(trail.x1, trail.y1);
      ctx.lineTo(trail.x2, trail.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      return true;
    });
  },

  addTrail: function(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var speed = Math.hypot(dx, dy);

    this.trails.push({
      x1: x1, y1: y1,
      x2: x2, y2: y2,
      createTime: performance.now(),
      lifetime: 220,
      width: Math.min(22, 6 + speed * 0.15)
    });
  },

  addFloatingText: function(text, x, y, color) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color || '#ffb72b',
      createTime: performance.now(),
      lifetime: 800
    });
  },

  _updateCanvas: function() {
    this.bgCanvas.update(this.fsm.current);
  },

  _updateUI: function() {
    this.um.update(this.fsm.current);
  },

  _updateCamera: function() {
    this.camera.lookAt(this.scene.position);
  },

  _render: function() {
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
  },

  onDocumentMouseUp: function(event) {
    if (window.calibrationActive) return;
    this._mouseDown = false;
  },

  onDocumentMouseMove: function(event) {
    if (window.calibrationActive) return;
    var self = this;
    var offX, offY;
    if (!event.offsetX) {
      offX = event.clientX - $(event.target).position().left;
      offY = event.clientY - $(event.target).position().top;
    } else {
      offX = event.offsetX;
      offY = event.offsetY;
    }

    if (this._mouseDown) {
      // Draw trail
      this.addTrail(this.prevMouse[0], this.prevMouse[1], offX, offY);

      var dir = this._getDirection(this.prevMouse[0], this.prevMouse[1], offX, offY);
      
      // Calculate distance for path interpolation to prevent jumping over fruits (especially at 30Hz camera rate)
      var dx = offX - this.prevMouse[0];
      var dy = offY - this.prevMouse[1];
      var dist = Math.hypot(dx, dy);
      
      // Interpolate points to check collision along the swipe segment (every 10 pixels)
      var steps = Math.max(1, Math.ceil(dist / 10));
      
      // Get all active fruits/bombs in the current UI layer
      var gameGroup = this.um.ui[this.fsm.current];
      if (gameGroup && gameGroup.children) {
        var candidates = gameGroup.children.slice(); // slice to avoid loop mutation issues
        
        candidates.forEach(function(parentObject) {
          if (parentObject.sliced) return;

          // Map 3D coordinate to 2D Orthographic screen-space coordinate
          var fx = (parentObject.position.x + 640) / 1280 * self.width;
          var fy = (480 - parentObject.position.y) / 960 * self.height;

          // Proximity test along the line segment
          var hit = false;
          var hitX = offX, hitY = offY;
          for (var s = 0; s <= steps; s++) {
            var t = s / steps;
            var interpX = self.prevMouse[0] + dx * t;
            var interpY = self.prevMouse[1] + dy * t;
            
            var d = Math.hypot(interpX - fx, interpY - fy);
            var threshold = (parentObject.name === 'bomb') ? 95 : 110; // 110px for fruit, 95px for bomb
            if (d < threshold) {
              hit = true;
              hitX = interpX;
              hitY = interpY;
              break;
            }
          }

          if (hit) {
            // Bomb Hit Event
            if (parentObject.name === 'bomb') {
              self.playSound('bomb_explode', 0.8);
              $('#bomb-flash').addClass('active');
              setTimeout(function() { $('#bomb-flash').removeClass('active'); }, 150);

              self.ps = new JuiceParticleSystem(parentObject.position.x, parentObject.position.y, dir, 'orange', true);
              self.scene.add(self.ps);
              self.splashedJuice.push(self.ps);

              gameGroup.remove(parentObject);

              if (self.fsm.current === 'game') {
                if (self.mode === 'classic') {
                  self.lives = 0;
                  self.updateLivesDisplay();
                  self.fsm.endGame();
                } else if (self.mode === 'rush') {
                  self.scoreNumber = Math.max(0, self.scoreNumber - 10);
                  $('#hud-score').text(self.scoreNumber);
                }
              }
            } 
            // Fruit Hit Event
            else if (parentObject.kind && parentObject.sliced === false) {
              var now = performance.now();
              if (now - self.lastComboTime < 780) {
                self.comboCount = Math.min(8, self.comboCount + 1);
              } else {
                self.comboCount = 1;
              }
              self.lastComboTime = now;

              if (self.fsm.current === 'game') {
                self.scoreNumber += self.comboCount;
                $('#hud-score').text(self.scoreNumber);
                
                if (self.comboCount >= 3) {
                  self.addFloatingText(self.comboCount + ' 连击!', hitX, hitY - 30, '#ffac36');
                  self.playSound('combo' + Math.min(5, self.comboCount), 0.6);
                } else {
                  self.playSound('slice', 0.5);
                }
              } else {
                self.playSound('slice', 0.5);
              }

              self.ps = new JuiceParticleSystem(parentObject.position.x, parentObject.position.y, dir, parentObject.kind, true);
              self.scene.add(self.ps);
              self.splashedJuice.push(self.ps);

              var juiceColor = 'Yellow';
              if (parentObject.kind === 'watermelon') juiceColor = 'Red';
              else if (parentObject.kind === 'orange') juiceColor = 'Orange';

              var juiceType = Math.ceil(Math.random() * 2);
              self.bgCanvas.layers[1].add({
                image: self.loader.images['splash' + juiceColor + juiceType],
                x: parentObject.position.x,
                y: parentObject.position.y,
                frame: 60,
                animations: [
                  { animateFuc: self.bgCanvas.animations.alpha, timingFuc: self.bgCanvas.timingFuctions.linear(-0.01, 1) },
                  { animateFuc: self.bgCanvas.animations.rotate, timingFuc: self.bgCanvas.timingFuctions.linear(0, dir) }
                ]
              });

              parentObject.drop(true, dir);

              if (parentObject.name === 'about') {
                setTimeout(function() { self.fsm.enterAbout(); }, 800);
              } else if (parentObject.name === 'game') {
                setTimeout(function() { self.fsm.startGame(); }, 800);
              } else if (parentObject.name === 'back') {
                setTimeout(function() {
                  if (self.fsm.current === 'about') self.fsm.exitAbout();
                }, 800);
              }
            }
          }
        });
      }
      this.prevMouse = [offX, offY];
    }
  },

  onDocumentMouseDown: function(event) {
    if (window.calibrationActive) return;
    this._mouseDown = true;
    event.preventDefault();
    var offX, offY;
    if (!event.offsetX) {
      offX = event.clientX - $(event.target).position().left;
      offY = event.clientY - $(event.target).position().top;
    } else {
      offX = event.offsetX;
      offY = event.offsetY;
    }
    this.prevMouse = [offX, offY];

    // Trigger audio activation
    this.initSounds();
  },

  _getDirection: function(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.atan2(dy, dx);
  },

  _hasIntersection: function(x, y) {
    var mouseX = (x / this.width) * 2 - 1;
    var mouseY = -(y / this.height) * 2 + 1;

    var vector = new THREE.Vector3(mouseX, mouseY, 1);
    this.projector.unprojectVector(vector, this.camera);

    var ray = new THREE.Ray(vector, new THREE.Vector3(0, 0, 1));
    var intersects = ray.intersectObjects(this.um.getIntersectionList(this.fsm.current));
    if (intersects.length > 0) {
      return intersects;
    }
    return false;
  },

  _generateFruit: function() {
    if (this.fsm.current !== 'game') return;
    var self = this;

    // Wave spawning size
    var minCount = 1, maxCount = 2;
    if (this.mode === 'rush') { minCount = 2; maxCount = 4; }
    var count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

    for (var i = 0; i < count; i++) {
      (function(index) {
        setTimeout(function() {
          if (self.fsm.current !== 'game') return;

          var item;
          // Spawn bomb chance
          var isBomb = false;
          if (self.mode === 'classic') {
            isBomb = Math.random() < 0.06;
          } else if (self.mode === 'rush') {
            isBomb = Math.random() < 0.04;
          }

          if (isBomb) {
            item = new BombMesh();
          } else {
            var fruits = ['apple', 'banana', 'watermelon', 'kiwi', 'lemon', 'orange'];
            var type = fruits[Math.floor(Math.random() * fruits.length)];
            item = new Fruit(self.loader, type);
          }

          item.reset();
          item.rotationDelta = new THREE.Vector3(Math.random() * 0.1, Math.random() * 0.1, 0);
          
          // Spawn along bottom screen with randomized trajectories
          var spawnX = (Math.random() * 800) - 400; // centered horizontally
          item.position.set(spawnX, -500, 100);
          
          // Velocity aimed upwards
          var velX = (Math.random() * 14 - 7) - (spawnX * 0.015);
          var velY = Math.random() * 3 + 13.5;
          item.velocity = new THREE.Vector3(velX, velY, 0);

          self.um.ui.game.add(item);
        }, index * 250);
      })(i);
    }

    // Next wave frequency
    var nextWaveDelay = (this.mode === 'rush') ? 2200 : 3500;
    setTimeout(function() { self._generateFruit(); }, nextWaveDelay);
  }
};
