const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

const gravity = 0.8;
const friction = 0.85;
const jumpPower = -15;

const player = {
  x: 100,
  y: 300,
  width: 40,
  height: 40,
  dx: 0,
  dy: 0,
  onGround: false,
  color: 'blue',
};

let cameraX = 0;
let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;

const biomeLength = 1500;

const biomes = [
  { name: 'Forest', bg: '#6ab04c', platformColor: '#227a1f', groundColor: '#145214', deadly: false, groundType: 'grass' },
  { name: 'Desert', bg: '#f6e27f', platformColor: '#c2b280', groundColor: '#e0c97b', deadly: true, groundType: 'sand' },
  { name: 'Lava', bg: '#300000', platformColor: '#ff4500', groundColor: '#7b0000', deadly: true, groundType: 'lava' },
  { name: 'Ice', bg: '#c4f0ff', platformColor: '#75c0e0', groundColor: '#a0d8f7', deadly: true, groundType: 'ice' },
  { name: 'Toxic', bg: '#2f4f4f', platformColor: '#39ff14', groundColor: '#1a401a', deadly: true, groundType: 'toxic' },
  { name: 'Swamp', bg: '#355e3b', platformColor: '#2d482c', groundColor: '#274024', deadly: false, groundType: 'swamp' },
];

let platforms = [];
let coins = [];
let hazards = [];

let lastPlatformX = 0;
let lastPlatformY = 300;

let fadeAlpha = 0;
let fadeDirection = 0;
let currentBiomeIndex = 0;
let nextBiomeIndex = 0;

function currentBiome() {
  return biomes[currentBiomeIndex];
}

function nextBiome() {
  return biomes[nextBiomeIndex];
}

function generatePlatforms() {
  while (lastPlatformX < player.x + canvas.width + 200) {
    let gapX = 150 + Math.random() * 250;
    let x = lastPlatformX + gapX;
    let yChange = (Math.random() - 0.5) * 150;
    let y = lastPlatformY + yChange;
    if (y > canvas.height - 120) y = canvas.height - 120;
    if (y < 100) y = 100;
    platforms.push({ x, y, width: 120, height: 20 });
    if (Math.random() < 0.6) {
      coins.push({ x: x + 50, y: y - 30, collected: false });
    }
    if (Math.random() < 0.15 && currentBiome().deadly) {
      hazards.push({ x: x + 40, y: y + 20, width: 40, height: 20, type: currentBiome().groundType });
    }
    lastPlatformX = x;
    lastPlatformY = y;
  }
  platforms = platforms.filter(p => p.x + p.width > player.x - 500);
  coins = coins.filter(c => c.x > player.x - 500 && !c.collected);
  hazards = hazards.filter(h => h.x + h.width > player.x - 500);
}

function drawBackground() {
  ctx.fillStyle = currentBiome().bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = currentBiome().groundColor;
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
}

function drawPlatforms() {
  ctx.fillStyle = currentBiome().platformColor;
  platforms.forEach(p => {
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height);
  });
}

function drawCoins() {
  ctx.fillStyle = 'gold';
  coins.forEach(c => {
    if (!c.collected) {
      ctx.beginPath();
      ctx.arc(c.x - cameraX, c.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawHazards() {
  hazards.forEach(h => {
    if (h.type === 'lava') ctx.fillStyle = 'red';
    else if (h.type === 'sand') ctx.fillStyle = '#c2b280';
    else if (h.type === 'ice') ctx.fillStyle = '#80c8f0';
    else if (h.type === 'toxic') ctx.fillStyle = '#39ff14';
    else ctx.fillStyle = 'darkgray';
    ctx.fillRect(h.x - cameraX, h.y, h.width, h.height);
  });
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x - cameraX, player.y, player.width, player.height);
}

function drawScore() {
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Highscore: ${highScore}`, 20, 70);
  ctx.fillText(`Biome: ${currentBiome().name}`, 20, 100);
}

function applyPhysics() {
  if (keys['ArrowLeft']) player.dx = -6;
  else if (keys['ArrowRight']) player.dx = 6;
  else player.dx *= friction;

  if (keys['Space'] && player.onGround) {
    player.dy = jumpPower;
    player.onGround = false;
  }

  player.dy += gravity;
  if (player.dy > 20) player.dy = 20;

  player.x += player.dx;
  player.y += player.dy;

  player.onGround = false;

  for (let p of platforms) {
    if (
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      player.y + player.height > p.y &&
      player.y + player.height < p.y + 15 &&
      player.dy >= 0
    ) {
      player.y = p.y - player.height;
      player.dy = 0;
      player.onGround = true;
    }
  }

  if (player.y + player.height > canvas.height - 100) {
    if (currentBiome().deadly) {
      gameOver();
    } else {
      player.y = canvas.height - 100 - player.height;
      player.dy = 0;
      player.onGround = true;
    }
  }
}

function collectCoins() {
  coins.forEach(c => {
    if (!c.collected &&
      player.x + player.width > c.x &&
      player.x < c.x &&
      player.y + player.height > c.y - 8 &&
      player.y < c.y + 8) {
      c.collected = true;
      score++;
      if (score > highScore) highScore = score;
    }
  });
}

function checkHazards() {
  for (let h of hazards) {
    if (
      player.x + player.width > h.x &&
      player.x < h.x + h.width &&
      player.y + player.height > h.y &&
      player.y < h.y + h.height
    ) {
      gameOver();
    }
  }
}

function updateBiome() {
  const newBiomeIndex = Math.floor(player.x / biomeLength) % biomes.length;
  if (newBiomeIndex !== currentBiomeIndex && fadeDirection === 0) {
    nextBiomeIndex = newBiomeIndex;
    fadeDirection = 1;
    fadeAlpha = 0;
  }
}

function fadeEffect() {
  if (fadeDirection === 1) {
    fadeAlpha += 0.02;
    if (fadeAlpha >= 1) {
      currentBiomeIndex = nextBiomeIndex;
      fadeDirection = -1;
    }
  } else if (fadeDirection === -1) {
    fadeAlpha -= 0.02;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fadeDirection = 0;
    }
  }
  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

let gameRunning = false;

function gameOver() {
  gameRunning = false;
  if (score > highScore) {
    localStorage.setItem('highScore', score);
  }
  document.getElementById('deathScreen').style.display = 'flex';
}

function resetGame() {
  player.x = 100;
  player.y = 300;
  player.dx = 0;
  player.dy = 0;
  player.onGround = false;
  score = 0;
  lastPlatformX = 0;
  lastPlatformY = 300;
  platforms = [];
  coins = [];
  hazards = [];
  cameraX = 0;
  currentBiomeIndex = 0;
  nextBiomeIndex = 0;
  fadeAlpha = 0;
  fadeDirection = 0;
  generatePlatforms();
  document.getElementById('deathScreen').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'none';
  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

function updateCamera() {
  cameraX = player.x - canvas.width / 3;
  if (cameraX < 0) cameraX = 0;
}

function gameLoop() {
  if (!gameRunning) return;
  updateBiome();
  applyPhysics();
  collectCoins();
  checkHazards();
  generatePlatforms();
  updateCamera();

  drawBackground();
  drawPlatforms();
  drawCoins();
  drawHazards();
  drawPlayer();
  drawScore();
  fadeEffect();

  requestAnimationFrame(gameLoop);
}

document.getElementById('startBtn').addEventListener('click', () => {
  resetGame();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  resetGame();
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

generatePlatforms();
drawBackground();
drawScore();
