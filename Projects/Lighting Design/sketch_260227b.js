// --- ml5 & video ---
let handPose;
let video;
let hands = [];

// --- sounds ---
let bgmSound;
let explosionSound;
let laserSound;

// --- textures ---
let moonTexture;
let earthTexture;
let backgroundTexture;

// --- player 2 & state ---
let p2Ship;
let meteorites = [];
let p1Health = 100;

// --- rocket state ---
let pos;
let vel;
let accel;
let angle = 90;
let p1Trail = [];
let currentJoyDX = 0;
let currentJoyDY = 0;

// --- Game State & VFX (Merged) ---
let energyOrbs = [];
let energyProgress = 0; // 清洁能源收集进度 (0-100)
let particles = [];
let shakeMag = 0;
let stars = [];
let gridOffset = 0;
let missionResult = null; // 'SUCCESS' or 'FAILED'
let missionResultTimer = 0;

// --- scene transition state ---
let isTransitioning = false;
let isFlipped = false;
let orbitAngle = 0;
let orbitRadius = 0;
let orbitTargetAngle = 0;

// --- physics constants ---
const FRICTION = 0.95;
const POWER = 0.3;
let MAX_SPEED = 4; // Will be updated dynamically in draw()

function preload() {
  handPose = ml5.handPose();
  bgmSound = loadSound('SoundEffect/bgm.mp3');
  explosionSound = loadSound('SoundEffect/explosion.mp3');
  laserSound = loadSound('SoundEffect/lazer.mp3');
  moonTexture = loadImage('image/moon.png');
  earthTexture = loadImage('image/earth.png');
  backgroundTexture = loadImage('image/background.jpeg');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  pos = createVector(width / 4, height / 2);
  vel = createVector(0, 0);
  accel = createVector(0, 0);

  // Init player 2 ship
  p2Ship = new Player2Ship();

  for (let i = 0; i < 4; i++) {
    meteorites.push(new Meteorite());
  }

  for (let i = 0; i < 5; i++) {
    energyOrbs.push(new EnergyOrb());
  }

  for (let i = 0; i < 150; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1.5, 3.5),
      offset: random(TWO_PI),
      speed: random(0.02, 0.08)
    });
  }

  frameRate(30); // Stable frame rate, dual-hand gesture recognition is computationally expensive
}

// ----------------------------------------------------
// UI & Visual Effects Functions
// ----------------------------------------------------

function drawGrid() {
  push();
  stroke(0, 255, 255, 15);
  strokeWeight(1);
  gridOffset += vel.mag() * 0.5;
  if (gridOffset > 40) gridOffset = 0;

  for (let x = -width; x < width * 2; x += 40) {
    line(x - gridOffset, 0, x - gridOffset, height);
  }
  for (let y = -height; y < height * 2; y += 40) {
    line(0, y, width, y);
  }
  pop();
}

function drawStars() {
  push();
  noStroke();
  for (let s of stars) {
    let alpha = map(sin(frameCount * s.speed + s.offset), -1, 1, 10, 255);
    fill(255, 255, 255, alpha * 0.3);
    circle(s.x, s.y, s.size * 2.5);
    fill(255, 255, 255, alpha);
    circle(s.x, s.y, s.size);
  }
  pop();
}

// Ensure audio starts on first user interaction if blocked by browser
function mousePressed() {
  userStartAudio();
  if (!bgmSound.isPlaying()) {
    bgmSound.setLoop(true);
    bgmSound.loop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Core helper function: Maps the raw camera coordinates to our mirrored canvas
function getMappedPoint(keypoint) {
  // Note that width and 0 are flipped here to match the mirrored effect of scale(-1, 1)
  let mx = map(keypoint.x, 0, video.width, width, 0);
  let my = map(keypoint.y, 0, video.height, 0, height);
  return createVector(mx, my);
}

function triggerShake(magnitude) {
  shakeMag = magnitude;
}

function spawnExplosion(x, y, col, count = 20) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, col));
  }
}

function respawnPlayer1() {
  p1Health = 100;
  energyProgress = 0; // 重生时清零能量进度，增加惩罚感
  isFlipped = false;
  isTransitioning = false;
  pos.x = 150;
  pos.y = height / 2;
  vel.set(0, 0);
  accel.set(0, 0);
  angle = HALF_PI;
  p1Trail = [];

  for (let m of meteorites) {
    if (m) m.reset();
  }
  for (let orb of energyOrbs) {
    if (orb) orb.reset();
  }
  if (p2Ship) p2Ship.lasers = [];
  if (typeof explosionSound !== 'undefined' && explosionSound.isLoaded()) {
    explosionSound.play();
  }
}

function draw() {
  // Healthに比例して最高速度を動的に変更する（完全に止まらないように最低速度0.2を保証）
  MAX_SPEED = 2 * max(0.5, p1Health / 100);

  if (backgroundTexture) {
    image(backgroundTexture, 0, 0, width, height);
  } else {
    background(5, 10, 25);
  }

  push(); // MAIN SCREEN SHAKE PUSH
  if (shakeMag > 0.1) {
    translate(random(-shakeMag, shakeMag), random(-shakeMag, shakeMag));
    shakeMag *= 0.85;
  }

  // Draw mirrored video at low opacity.
  // Using globalAlpha instead of tint() for hardware-accelerated blending.
  push();
  translate(width, 0);
  scale(-1, 1);
  drawingContext.globalAlpha = 50 / 255;
  image(video, 0, 0, width, height);
  drawingContext.globalAlpha = 1.0;
  pop();

  drawGrid();
  drawStars();

  // ==========================================
  // --- Screen Divider ---
  // ==========================================
  push();
  stroke(0, 200, 255, 150);
  strokeWeight(2);
  drawingContext.setLineDash([15, 15]); // Dashed line effect
  line(width / 2, 0, width / 2, height);
  pop();

  // ==========================================
  // --- Edge Decorative Orbs ---
  // ==========================================
  push();
  if (isFlipped) {
    // Left side orb is now P2 zone (moon texture)
    if (moonTexture) {
      imageMode(CENTER);
      image(earthTexture, 0, height / 2, width * 0.2, width * 0.2);
      imageMode(CORNER);
    } else {
      noStroke();
      fill(150, 255, 150, 30);
      ellipse(0, height / 2, width * 0.2, height * 0.4);
    }
    // Right side orb is now P1 zone (earth texture)
    if (earthTexture) {
      imageMode(CENTER);
      image(moonTexture, width, height / 2, width * 0.2, width * 0.2);
      imageMode(CORNER);
    } else {
      noStroke();
      fill(0, 150, 255, 30);
      ellipse(width, height / 2, width * 0.2, height * 0.4);
    }
  } else {
    // Left side orb (P1 zone) - earth texture
    if (earthTexture) {
      imageMode(CENTER);
      image(earthTexture, 0, height / 2, width * 0.2, width * 0.2);
      imageMode(CORNER);
    } else {
      noStroke();
      fill(0, 150, 255, 30);
      ellipse(0, height / 2, width * 0.2, height * 0.4);
    }
    // Right side orb (P2 zone) - moon texture
    if (moonTexture) {
      imageMode(CENTER);
      image(moonTexture, width, height / 2, width * 0.2, width * 0.2);
      imageMode(CORNER);
    } else {
      noStroke();
      fill(150, 255, 150, 30);
      ellipse(width, height / 2, width * 0.2, height * 0.4);
    }
  }
  pop();

  // ==========================================
  // --- Hand Separation and Assignment Logic ---
  // ==========================================
  let p1Hand = null;
  let p2Hand = null;

  for (let hand of hands) {
    let mappedWrist = getMappedPoint(hand.wrist);
    // Determine if the hand is on the left or right side of the screen
    if (mappedWrist.x < width / 2) {
      p1Hand = hand;
    } else {
      p2Hand = hand;
    }
  }

  // ==========================================
  // --- Player 1 Logic (Left Half) ---
  // ==========================================
  if (!isTransitioning) {
    if (!p1Hand) {
      currentJoyDX = lerp(currentJoyDX, 0, 0.2); // Smoothly return to center when hand is lost
      currentJoyDY = lerp(currentJoyDY, 0, 0.2);
    }

    let controlOriginX = width * 0.25;
    let controlOriginY = height / 2;

    if (p1Hand) {
      let wrist = getMappedPoint(p1Hand.wrist);
      let indexTip = getMappedPoint(p1Hand.index_finger_tip);
      let thumbTip = getMappedPoint(p1Hand.thumb_tip);

      // 基準点と手の位置（手首）から角度を計算
      let dx = wrist.x - controlOriginX;
      let dy = wrist.y - controlOriginY;

      currentJoyDX = dx;
      currentJoyDY = dy;

      let targetAngle = angle;
      // 中心から20px以上離れている時だけ角度を更新（手ブレ防止）
      if (dist(0, 0, dx, dy) > 20) {
        targetAngle = atan2(dy, dx) + HALF_PI;
      }
      angle = lerpAngle(angle, targetAngle, 0.15);

      let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);

      if (d > 40) { // Open fingers -> Thrust
        let dynamicPower = map(d, 40, 150, 0.1, POWER * 2.5, true);
        let force = p5.Vector.fromAngle(angle - HALF_PI);
        force.mult(dynamicPower);
        accel.add(force);
      }
    }

    // Physics update
    vel.add(accel);
    vel.limit(MAX_SPEED);
    vel.mult(FRICTION);
    pos.add(vel);
    accel.mult(0);

    p1Trail.push(createVector(pos.x, pos.y));
    if (p1Trail.length > 15) p1Trail.shift();

    // Check transition trigger (Right -> Left OR Left -> Right)
    // Trigger when rocket gets within 50px of the moon circle
    let moonCenterX = width;
    let moonCenterY = height / 2;
    let moonRadius = width * 0.1;
    let distToMoon = dist(pos.x, pos.y, moonCenterX, moonCenterY);
    
    if (!isFlipped && distToMoon <= moonRadius + 50) {
      // Trigger orbit around RIGHT orb
      isTransitioning = true;
      let centerX = width;      // Align with moon texture center
      let centerY = height / 2;
      orbitRadius = dist(pos.x, pos.y, centerX, centerY);
      // Ensure orbit is outside the circle (moon width * 0.1 = radius, so add 50 to be outside)
      orbitRadius = max(orbitRadius, width * 0.1 + 50);
      orbitAngle = atan2(pos.y - centerY, pos.x - centerX);
      if (orbitAngle < 0) orbitAngle += TWO_PI;
      orbitTargetAngle = orbitAngle + TWO_PI; // Orbit full circle (clockwise-ish from math)
    } else if (isFlipped && pos.x < 100) {
      if (energyProgress >= 100) {
        missionResult = 'SUCCESS';
      } else {
        missionResult = 'FAILED';
      }
      missionResultTimer = 120; // 显示4秒
      respawnPlayer1();
    }
  } else {
    // =====================================
    // ▼ ここからが円を回る「Orbit Animation」
    // =====================================
    // Rotation logic relies purely on the P1 side (Right orb)
    let centerX = width;      // Align with moon texture center
    let centerY = height / 2;

    orbitAngle += 0.05;

    // 三角関数（cos と sin）を使って、中心点からの円周上の座標を計算
    pos.x = centerX + cos(orbitAngle) * orbitRadius;
    pos.y = centerY + sin(orbitAngle) * orbitRadius;

    // Point tangentially based on orbit direction
    // ロケットの機首（0度=上）を円の進行方向（時計回りの接線方向）へ向ける
    angle = orbitAngle + Math.PI;

    p1Trail.push(createVector(pos.x, pos.y));
    if (p1Trail.length > 15) p1Trail.shift();

    // Check completion condition
    let finishedTrans = (orbitAngle >= orbitTargetAngle);

    if (finishedTrans) {
      // 1周終わったらフラグを戻し、シーンを切り替える
      isTransitioning = false;
      isFlipped = true;

      // Position after orbit completion
      pos.x = width - 150;
      pos.y = height / 2;
      angle = PI + HALF_PI; // Face entirely left
      vel.set(0, 0);
      p1Health = 100; // HP回復
      p1Trail = [];

      for (let m of meteorites) {
        m.reset();
      }
      for (let orb of energyOrbs) {
        orb.reset();
      }
    }
  }

  // ==========================================
  // --- Energy Orbs Logic ---
  // ==========================================
  if (!isFlipped) {
    for (let orb of energyOrbs) {
      if (!isTransitioning) {
        orb.update();

        // 1. P1 拾取能源球 (推进任务进度)
        if (dist(orb.x, orb.y, pos.x, pos.y) < orb.size / 2 + 15) {
          energyProgress = min(100, energyProgress + 50); // 每次收集增加 50%
          spawnExplosion(orb.x, orb.y, color(50, 255, 100), 20);
          orb.reset();
        }
      }
      orb.draw();
    }
  }

  // ==========================================
  // --- Meteorites Logic ---
  // ==========================================
  for (let m of meteorites) {
    if (!isTransitioning) {
      m.update();
      if (dist(m.x, m.y, pos.x, pos.y) < m.size / 2 + 15) {
        p1Health -= 15;
        triggerShake(15);
        spawnExplosion(pos.x, pos.y, color(255, 150, 50), 30);
        if (typeof explosionSound !== 'undefined' && explosionSound.isLoaded()) explosionSound.play();
        m.reset();
      }
    }
    m.draw();
  }

  // ==========================================
  // --- Player 2 Update & Laser collisions ---
  // ==========================================
  if (!isTransitioning) {
    p2Ship.update(p2Hand); // Pass the assigned right-hand data to Player 2
    for (let i = p2Ship.lasers.length - 1; i >= 0; i--) {
      let laser = p2Ship.lasers[i];
      let laserHit = false;

      // Laser hits Energy Orb (Only in Phase 1)
      if (!isFlipped) {
        for (let orb of energyOrbs) {
          if (dist(laser.x, laser.y, orb.x, orb.y) < orb.size) {
            spawnExplosion(orb.x, orb.y, color(255, 255, 50), 50);
            triggerShake(25);
            if (typeof explosionSound !== 'undefined' && explosionSound.isLoaded()) explosionSound.play();

            // Collateral damage to P1
            if (dist(orb.x, orb.y, pos.x, pos.y) < 150) {
              p1Health -= 30;
              spawnExplosion(pos.x, pos.y, color(255, 50, 50), 30);
            }

            orb.reset();
            laserHit = true;
            break;
          }
        }
      }

      // Laser hits P1 rocket directly
      if (!laserHit && dist(laser.x, laser.y, pos.x, pos.y) < 35) {
        p1Health -= 10;
        triggerShake(8);
        spawnExplosion(laser.x, laser.y, color(255, 50, 50), 15);
        if (typeof explosionSound !== 'undefined' && explosionSound.isLoaded()) explosionSound.play();
        laserHit = true;
      }

      if (laserHit) {
        p2Ship.lasers.splice(i, 1);
      }
    }
  }
  p2Ship.draw();

  // ==========================================
  // --- Particles & Death Check ---
  // ==========================================
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  if (p1Health <= 0 && !isTransitioning) {
    push();
    fill(255, 0, 0, 150);
    rect(-width, -height, width * 3, height * 3); // Large rect for screen shake
    pop();
    spawnExplosion(pos.x, pos.y, color(255, 200, 0), 100);
    triggerShake(30);
    respawnPlayer1();
  }

  // Draw players
  handleEdges();
  drawRocket(pos.x, pos.y, angle, vel.mag() > 0.5 && !isTransitioning);

  if (missionResultTimer > 0) {
    missionResultTimer--;
  }

  pop(); // END MAIN SCREEN SHAKE PUSH
  drawUI();
}

// Boundary handling: When the rocket reaches the edges, it loops to the opposite side
// It can cross the screen divider and move to the other side.
function handleEdges() {
  if (isTransitioning) return; // アニメーション中は壁の判定を無効化する

  // 左右（X軸）はループを廃止し、見えない壁にする（バグ防止）
  if (pos.x > width) {
    pos.x = width;
    vel.x = 0;
  }
  if (pos.x < 0) {
    pos.x = 0;
    vel.x = 0;
  }

  // 上下（Y軸）は今まで通りループさせる
  if (pos.y > height) pos.y = 0;
  if (pos.y < 0) pos.y = height;
}

// Shortest-path angle interpolation.
function lerpAngle(a, b, step) {
  let delta = b - a;
  if (delta > PI) delta -= TWO_PI;
  if (delta < -PI) delta += TWO_PI;
  return a + delta * step;
}

// ml5 callback — store latest hand results.
function gotHands(results) {
  hands = results;
}

// Draw the rocket at (x, y) with rotation a.
function drawRocket(x, y, a, isThrusting) {
  if (p1Trail.length > 2) {
    push();
    noFill();
    for (let i = 0; i < p1Trail.length - 1; i++) {
      let alpha = map(i, 0, p1Trail.length, 0, 150);
      stroke(0, 200, 255, alpha);
      strokeWeight(map(i, 0, p1Trail.length, 1, 6));
      line(p1Trail[i].x, p1Trail[i].y, p1Trail[i + 1].x, p1Trail[i + 1].y);
    }
    pop();
  }

  push();
  translate(x, y);
  rotate(a);
  scale(0.6);

  // Thruster flame
  if (isThrusting) {
    fill(255, 150, 0, 200);
    noStroke();
    ellipse(0, 30, random(10, 15), random(20, 40));
  }

  // Body
  fill(240);
  stroke(255);
  strokeWeight(2);
  beginShape();
  vertex(0, -35);  // nose
  vertex(-15, 15);  // bottom-left
  vertex(15, 15);  // bottom-right
  endShape(CLOSE);

  // Cockpit window
  fill(0, 150, 255);
  circle(0, -5, 10);

  pop();
}

// HUD: speed meter + direction compass (bottom-left corner).
function drawUI() {
  // 顶部全局状态栏
  push();
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, 0, width, 40);

  fill(0, 200, 255);
  textSize(16);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("ISD 60504 - FLY ME TO THE MOON", width / 2, 20);
  pop();

  // ------------------------------------------------
  // 顶部中央清洁能源进度条
  // ------------------------------------------------
  const topBarW = 300;
  const topBarH = 14;
  const topBarX = width / 2 - topBarW / 2;
  const topBarY = 55;

  push();
  fill(0, 0, 0, 150);
  stroke(0, 255, 150, 100);
  strokeWeight(1);
  rect(topBarX, topBarY, topBarW, topBarH, 6);

  noStroke();
  fill(0, 255, 150);
  rect(topBarX, topBarY, topBarW * (energyProgress / 100), topBarH, 6);

  fill(255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("CLEAN ENERGY COLLECTED: " + energyProgress + "%", width / 2, topBarY + topBarH / 2 + 1);
  pop();

  // 任务成功/失败高亮反馈
  if (missionResultTimer > 0) {
    push();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    let alpha = map(sin(frameCount * 0.2), -1, 1, 100, 255);

    textSize(48);
    if (missionResult === 'SUCCESS') {
      fill(0, 255, 150, alpha);
      text("MISSION SUCCESS", width / 2, height / 2 - 50);
      textSize(20);
      fill(255, alpha);
      text("CLEAN ENERGY AT 100% CAPACITY", width / 2, height / 2 + 10);
    } else {
      fill(255, 50, 50, alpha);
      text("MISSION FAILED", width / 2, height / 2 - 50);
      textSize(20);
      fill(255, alpha);
      text("NOT ENOUGH CLEAN ENERGY RETURNED", width / 2, height / 2 + 10);
    }
    pop();
  }

  // --- Player 1 Panel ---
  const panelW = 180;
  const panelH = 150;
  const p1PanelX = 20;
  const p1PanelY = height - 170;

  push();
  noStroke();
  fill(0, 0, 0, 160);
  rect(p1PanelX, p1PanelY, panelW, panelH, 12);

  let speed = vel.mag();
  let absoluteMaxSpeed = 2; // 体力MAX時の本当の最高速度
  let currentSpeedRatio = speed / absoluteMaxSpeed;
  let maxPotentialRatio = MAX_SPEED / absoluteMaxSpeed; // ダメージによる上限ライン

  fill(160);
  textSize(11);
  textAlign(LEFT, TOP);
  text('SPEED', p1PanelX + 12, p1PanelY + 12);
  fill(255);
  textSize(20);
  text(nf(speed, 1, 1), p1PanelX + 12, p1PanelY + 26);

  fill(160);
  textSize(11);
  text('INTEGRITY', p1PanelX + 90, p1PanelY + 12);
  fill(p1Health > 30 ? color(0, 200, 255) : color(255, 50, 50));
  textSize(20);
  text(max(0, p1Health) + '%', p1PanelX + 90, p1PanelY + 26);

  // Bar track for total possible speed
  fill(40);
  rect(p1PanelX + 12, p1PanelY + 52, panelW - 24, 10, 5);

  // ダメージによって到達不能になった部分を赤黒く可視化
  if (maxPotentialRatio < 1.0) {
    fill(80, 20, 20); // 暗めの赤
    let lostWidth = (panelW - 24) * (1.0 - maxPotentialRatio);
    let startX = (p1PanelX + 12) + (panelW - 24) * maxPotentialRatio;
    rect(startX, p1PanelY + 52, lostWidth, 10, 5);
  }

  // Bar fill — green → red with speed (現在のスピードバー)
  let barColor = lerpColor(color(0, 220, 120), color(255, 60, 60), currentSpeedRatio);
  fill(barColor);
  rect(p1PanelX + 12, p1PanelY + 52, (panelW - 24) * currentSpeedRatio, 10, 5);

  // Virtual Joystick UI (replaces direction compass)
  let cx1 = p1PanelX + panelW / 2;
  let cy1 = p1PanelY + 112;
  let r = 26; // Outer radius

  // Draw base
  stroke(80);
  strokeWeight(2);
  fill(0, 0, 0, 100);
  circle(cx1, cy1, r * 2);

  // Draw deadzone
  stroke(255, 255, 255, 50);
  strokeWeight(1);
  circle(cx1, cy1, r * 0.4);

  // Draw stick position
  // Physically 150 pixels displacement maps to the UI radius
  let stickRadius = min(r, dist(0, 0, currentJoyDX, currentJoyDY) * (r / 150));
  let stickHeading = atan2(currentJoyDY, currentJoyDX);

  let sx = cx1 + cos(stickHeading) * stickRadius;
  let sy = cy1 + sin(stickHeading) * stickRadius;

  stroke(0, 200, 255, 150);
  strokeWeight(2);
  line(cx1, cy1, sx, sy);

  noStroke();
  fill(0, 200, 255, 200);
  circle(sx, sy, 10);

  fill(255);
  circle(cx1, cy1, 4);
  pop();

  // --- Player 2 Panel ---
  const p2PanelX = width - 20 - panelW;
  const p2PanelY = height - 170;

  push();
  noStroke();
  fill(0, 0, 0, 160);
  rect(p2PanelX, p2PanelY, panelW, panelH, 12);

  fill(160);
  textSize(11);
  textAlign(LEFT, TOP);
  text('WEAPONS', p2PanelX + 12, p2PanelY + 12);

  let isReady = p2Ship && p2Ship.fireCooldown <= 0;
  fill(isReady ? color(150, 255, 150) : color(255, 100, 100));
  textSize(20);
  text(isReady ? "READY" : "COOL", p2PanelX + 12, p2PanelY + 26);

  fill(160);
  textSize(11);
  text('ACTIVE LASERS', p2PanelX + 90, p2PanelY + 12);
  fill(255);
  textSize(20);
  text(p2Ship ? p2Ship.lasers.length : 0, p2PanelX + 90, p2PanelY + 26);

  fill(40);
  rect(p2PanelX + 12, p2PanelY + 52, panelW - 24, 8, 4);

  let coolRatio = p2Ship ? map(p2Ship.fireCooldown, 15, 0, 0, 1, true) : 1;
  fill(150, 255, 150);
  rect(p2PanelX + 12, p2PanelY + 52, (panelW - 24) * coolRatio, 8, 4);

  let cx2 = p2PanelX + panelW / 2;
  let cy2 = p2PanelY + 112;

  stroke(isReady ? color(150, 255, 150) : color(255, 50, 50));
  strokeWeight(1.5);
  noFill();
  circle(cx2, cy2, r * 1.5);
  line(cx2 - r, cy2, cx2 + r, cy2);
  line(cx2, cy2 - r, cx2, cy2 + r);
  pop();
}
