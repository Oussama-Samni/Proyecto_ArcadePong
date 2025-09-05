// =================== Config y estado ===================
let canvas, ctx;
let lastTime = 0;
let isRunning = false;
let paused = false;          // ⬅️ pausa global (toggle con Space)

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Paletas
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 100;
const PADDLE_MARGIN = 24;
const PADDLE_SPEED = 420;

// Pelota
const BALL_RADIUS = 8;
const BALL_SPEED_START = 360;
const BALL_SPEED_MAX = 720;
const BALL_SPEED_INC = 1.03;

// Entidades
let leftPaddle, rightPaddle, ball;
let inputState;

// UI refs
let elHero, elBoard, elStartBtn, elNameModal, elNameForm, elNameP1, elNameP2, elCancelModal;

// Jugadores + marcador
const players = {
  p1: { name: "Jugador 1", score: 0 },
  p2: { name: "Jugador 2", score: 0 }
};

// Countdown
let countdown = 0;
let countdownText = "";

// Audio
let audioCtx = null;

// =================== Utilidades ===================
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return (dx*dx + dy*dy) <= (radius*radius);
}
function randomSignish() {
  let v = Math.random() * 2 - 1;
  if (Math.abs(v) < 0.2) v = v < 0 ? -0.2 : 0.2;
  return v;
}

// =================== Audio ===================
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function beep({ freq = 440, duration = 0.06, gain = 0.05, type = "sine" } = {}) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}
function sfxPaddle(){ beep({ freq: 520, duration: 0.05, gain: 0.06, type: "square" }); }
function sfxWall(){   beep({ freq: 380, duration: 0.04, gain: 0.05, type: "triangle" }); }
function sfxScore(){  beep({ freq: 240, duration: 0.12, gain: 0.07, type: "sawtooth" }); }

// =================== Entidades ===================
function createPaddle(x){
  return { x, y: (GAME_HEIGHT - PADDLE_HEIGHT)/2, w: PADDLE_WIDTH, h: PADDLE_HEIGHT, dy: 0, speed: PADDLE_SPEED };
}
function createBall(){
  const dirX = Math.random() < 0.5 ? -1 : 1;
  return { x: GAME_WIDTH/2, y: GAME_HEIGHT/2, r: BALL_RADIUS, vx: dirX, vy: randomSignish(), speed: BALL_SPEED_START };
}
function createInputState(){ return { w:false, s:false, ArrowUp:false, ArrowDown:false, " ":false }; }

// =================== UI ===================
function bindUI(){
  elHero = document.getElementById("hero");
  elBoard = document.getElementById("board");
  elStartBtn = document.getElementById("btn-start");
  elNameModal = document.getElementById("name-modal");
  elNameForm = document.getElementById("name-form");
  elNameP1 = document.getElementById("name-p1");
  elNameP2 = document.getElementById("name-p2");
  elCancelModal = document.getElementById("cancel-modal");

  elStartBtn.addEventListener("click", () => {
    ensureAudio();
    elNameP1.value = players.p1.name;
    elNameP2.value = players.p2.name;
    elNameModal.classList.remove("hidden");
    elNameP1.focus();
  });

  elCancelModal.addEventListener("click", () => {
    elNameModal.classList.add("hidden");
  });

  elNameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    players.p1.name = (elNameP1.value || "Jugador 1").trim();
    players.p2.name = (elNameP2.value || "Jugador 2").trim();
    players.p1.score = 0; players.p2.score = 0;
    elNameModal.classList.add("hidden");

    elHero.classList.add("hidden");
    elBoard.classList.remove("hidden");

    resetMatch();
    startGame();       // loop activo
    startCountdown(3); // 3-2-1 antes de mover pelota
  });
}

// =================== Teclado ===================
function bindKeyboard(){
  // Evitar scroll con flechas/espacio
  window.addEventListener("keydown", (e)=>{
    if (["ArrowUp","ArrowDown"," "].includes(e.key)) e.preventDefault();
  }, { passive:false });

  window.addEventListener("keydown", (e)=>{
    // Movimiento
    if (e.key in inputState) inputState[e.key] = true;

    // PAUSA con Space
    if (e.key === " " || e.code === "Space") togglePause();
  }, { passive:false });

  window.addEventListener("keyup", (e)=>{
    if (e.key in inputState) inputState[e.key] = false;
  }, { passive:false });
}

function togglePause(){
  paused = !paused;
  if (!paused) {
    // Al reanudar, evitamos que el primer dt sea gigante
    lastTime = performance.now();
  }
}

// =================== Canvas / Init ===================
function initCanvas(){
  canvas = document.getElementById("game-canvas");
  if(!canvas) throw new Error("No canvas.");
  ctx = canvas.getContext("2d");
  if(!ctx) throw new Error("No 2D ctx.");
  canvas.width = GAME_WIDTH; canvas.height = GAME_HEIGHT;
}

function createGameObjects(){
  leftPaddle = createPaddle(PADDLE_MARGIN);
  rightPaddle = createPaddle(GAME_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH);
  ball = createBall();
  inputState = createInputState();
  bindKeyboard();
}

function resetBall(direction=1){
  ball.x = GAME_WIDTH/2; ball.y = GAME_HEIGHT/2;
  ball.vx = direction; ball.vy = randomSignish(); ball.speed = BALL_SPEED_START;
}

function resetMatch(){
  createGameObjects();
  players.p1.score = 0; players.p2.score = 0;
}

// =================== Countdown ===================
function startCountdown(seconds){
  countdown = seconds;
  countdownText = String(countdown);
  const tick = () => {
    if (countdown <= 0) { countdownText = ""; return; }
    countdownText = String(countdown);
    sfxWall();
    countdown -= 1;
    setTimeout(tick, 700);
  };
  tick();
}

// =================== Update ===================
function applyInput(){
  leftPaddle.dy = 0; if (inputState.w) leftPaddle.dy -= 1; if (inputState.s) leftPaddle.dy += 1;
  rightPaddle.dy = 0; if (inputState.ArrowUp) rightPaddle.dy -= 1; if (inputState.ArrowDown) rightPaddle.dy += 1;
}
function updatePaddles(dt){
  leftPaddle.y += leftPaddle.dy * leftPaddle.speed * dt;
  rightPaddle.y += rightPaddle.dy * rightPaddle.speed * dt;
  leftPaddle.y = clamp(leftPaddle.y, 0, GAME_HEIGHT - leftPaddle.h);
  rightPaddle.y = clamp(rightPaddle.y, 0, GAME_HEIGHT - rightPaddle.h);
}
function onScore(side){
  if (side === "left") players.p2.score += 1;
  else players.p1.score += 1;
  sfxScore();
  resetBall(side === "left" ? 1 : -1);
  startCountdown(2);
}
function updateBall(dt){
  // No mover la bola durante countdown
  if (countdownText) return;

  ball.x += ball.vx * ball.speed * dt;
  ball.y += ball.vy * ball.speed * dt;

  // Techo/suelo
  if (ball.y - ball.r <= 0){ ball.y = ball.r; ball.vy *= -1; sfxWall(); }
  else if (ball.y + ball.r >= GAME_HEIGHT){ ball.y = GAME_HEIGHT - ball.r; ball.vy *= -1; sfxWall(); }

  // Paletas
  if (circleRectCollision(ball.x, ball.y, ball.r, leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h)){
    ball.x = leftPaddle.x + leftPaddle.w + ball.r;
    ball.vx = Math.abs(ball.vx);
    const hit = (ball.y - (leftPaddle.y + leftPaddle.h/2)) / (leftPaddle.h/2);
    ball.vy = hit;
    const m = Math.hypot(ball.vx, ball.vy); ball.vx/=m; ball.vy/=m;
    ball.speed = Math.min(ball.speed * BALL_SPEED_INC, BALL_SPEED_MAX);
    sfxPaddle();
  }
  if (circleRectCollision(ball.x, ball.y, ball.r, rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h)){
    ball.x = rightPaddle.x - ball.r;
    ball.vx = -Math.abs(ball.vx);
    const hit = (ball.y - (rightPaddle.y + rightPaddle.h/2)) / (rightPaddle.h/2);
    ball.vy = hit;
    const m = Math.hypot(ball.vx, ball.vy); ball.vx/=m; ball.vy/=m;
    ball.speed = Math.min(ball.speed * BALL_SPEED_INC, BALL_SPEED_MAX);
    sfxPaddle();
  }

  // Punto
  if (ball.x + ball.r < 0) onScore("left");
  else if (ball.x - ball.r > GAME_WIDTH) onScore("right");
}

function update(dt){
  if (paused) return;                            // ⬅️ no actualizar física si está pausado
  if (!leftPaddle || !rightPaddle || !ball) return;
  applyInput();
  updatePaddles(dt);
  updateBall(dt);
}

// =================== Draw (tablero pro) ===================
function drawBackgroundGradient() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const g = ctx.createRadialGradient(
    GAME_WIDTH * 0.5, GAME_HEIGHT * -0.2, 120,
    GAME_WIDTH * 0.5, GAME_HEIGHT * 0.7, Math.max(GAME_WIDTH, GAME_HEIGHT)
  );
  g.addColorStop(0, "rgba(255,255,255,0.08)");
  g.addColorStop(0.35, "rgba(255,255,255,0.03)");
  g.addColorStop(1, "rgba(0,0,0,0.02)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}
function drawSubtleGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = step; x < GAME_WIDTH; x += step) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, GAME_HEIGHT); ctx.stroke();
  }
  for (let y = step; y < GAME_HEIGHT; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(GAME_WIDTH, y + 0.5); ctx.stroke();
  }
  ctx.restore();
}
function drawCenterLineNeon() {
  const segH = 22, gap = 16, barW = 6, x = (GAME_WIDTH - barW) / 2, r = 3;
  const makeGrad = (y) => {
    const gr = ctx.createLinearGradient(x, y, x, y + segH);
    gr.addColorStop(0, "rgba(0, 255, 224, 0.95)");
    gr.addColorStop(0.5, "rgba(255, 255, 255, 1.0)");
    gr.addColorStop(1, "rgba(255, 40, 184, 0.95)");
    return gr;
  };
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.55)";
  ctx.shadowBlur = 14;
  for (let y = 12; y < GAME_HEIGHT - segH; y += segH + gap) {
    ctx.fillStyle = makeGrad(y);
    roundedRectPath(ctx, x, y, barW, segH, r); ctx.fill();
  }
  ctx.restore();
}
// Fallback para rectángulos redondeados
function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
}
// Paletas con esquinas redondeadas
function drawPaddle(p){
  if (!p) return;
  const isLeft = (p === leftPaddle);
  const r = 8; // radio de esquina

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, r); ctx.fill();
  } else {
    roundedRectPath(ctx, p.x, p.y, p.w, p.h, r); ctx.fill();
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = isLeft ? "rgba(0, 255, 224, 0.65)" : "rgba(255, 40, 184, 0.65)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, r); ctx.fill();
  } else {
    roundedRectPath(ctx, p.x, p.y, p.w, p.h, r); ctx.fill();
  }
  ctx.restore();
}
function drawBall(b){
  if (!b) return;
  ctx.save();
  ctx.shadowColor = "rgba(200, 240, 255, 0.9)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawScore() {
  ctx.save();
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "left";
  ctx.fillText(`${players.p1.name}: ${players.p1.score}`, 20, 30);
  ctx.textAlign = "right";
  ctx.fillText(`${players.p2.name}: ${players.p2.score}`, GAME_WIDTH - 20, 30);
  ctx.restore();
}
function drawCountdown() {
  if (!countdownText) return;
  ctx.save();
  ctx.font = "800 120px Manrope, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,255,224,0.6)";
  ctx.shadowBlur = 20;
  ctx.fillText(countdownText, GAME_WIDTH/2, GAME_HEIGHT/2);
  ctx.restore();
}
function drawPauseOverlay(){
  if (!paused) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.font = "800 72px Manrope, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,255,224,0.6)";
  ctx.shadowBlur = 18;
  ctx.fillText("PAUSE", GAME_WIDTH/2, GAME_HEIGHT/2);
  ctx.restore();
}

function draw(){
  drawBackgroundGradient();
  drawSubtleGrid();
  drawCenterLineNeon();
  drawPaddle(leftPaddle);
  drawPaddle(rightPaddle);
  drawBall(ball);
  drawScore();
  drawCountdown();
  drawPauseOverlay(); // overlay de pausa (si aplica)
}

// =================== Loop ===================
function gameLoop(ts){
  const dt = (ts - lastTime)/1000;
  lastTime = ts;

  if (!paused) {
    update(dt);  // solo física si NO está pausado
  }
  draw();        // siempre pintamos (para ver overlay, contador, etc.)

  requestAnimationFrame(gameLoop);
}
function startGame(){
  if (!isRunning) {
    isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// =================== Entrada ===================
function init(){
  bindUI();
  initCanvas();
  // Creamos entidades cuando el usuario introduce nombres
}
window.addEventListener("DOMContentLoaded", init);
