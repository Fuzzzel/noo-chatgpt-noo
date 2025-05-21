const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fullscreen canvas + resize handling
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  Space: false,
};

document.addEventListener('keydown', e => {
  if (e.code in keys) keys[e.code] = true;
});
document.addEventListener('keyup', e => {
  if (e.code in keys) keys[e.code] = false;
});

const player = {
  x: 50,
  y: 400,
  width: 30,
  height: 30,
  dx: 0,
  dy: 0,
  color: 'red',
  onGround: false,
};

const gravity = 0.8;
const friction = 0.85;
const jumpStrength = -15;

let cameraX = 0;
let platforms = [];
let coins = [];
let lavaDrops = [];

let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let lastPlatformX = 0;
let biomeIndex = 0;

const groundHeight = canvas.height - 30; // spodní "podlaha"

const biomes = [
  { name: "Les", bg: '#87CEEB', platformColor: 'green', groundColor: '#228B22', groundType: 'safe' },
  { name: "Poušť", bg: '#ffe4b5', platformColor: '#c2b280', groundColor: '#edc9af', groundType: 'safe' },
  { name: "Láva", bg: '#330000', platformColor: '#ff4500', groundColor: '#aa2200', groundType: 'lava' },
  { name: "Led", bg: '#d0f0ff', platformColor: '#a0e9f0', groundColor: '#b0e0e6', groundType: 'ice' },
  { name: "Vodní", bg: '#a0c4ff', platformColor: '#3399ff', groundColor: '#004080', groundType: 'water' },
];

function getCurrentBiome() {
  biomeIndex = Math.floor(player.x / 1000) % biomes.length;
  return biomes[biomeIndex];
}

// Spawning a simple lava drop for lava biome
function spawnLava() {
  const biome = getCurrentBiome();
  if (biome.groundType !== 'lava') return;

  const speedX = (Math.random() - 0.5) * 2;  
  const speedY = 2 + Math.random() * 3;      

  lavaDrops.push({
    x: cameraX + Math.random() * canvas.width,
    y: 0,
    radius: 10,
    dx: speedX,
    dy: speedY,
  });
}

setInterval(spawnLava, 1500);

function generatePlatforms() {
  const maxVerticalGap = 100;
  const maxHorizontalGap = 200;

  let lastY = platforms.length ? platforms[platforms.length - 1].y : 350;

  while (lastPlatformX < player.x + canvas.width) {
    const height = 10;
    const width = 100;

    const x = lastPlatformX + 100 + Math.random() * (maxHorizontalGap - 100);
    let yOffset = (Math.random() - 0.5) * maxVerticalGap * 2;
    let y = lastY + yOffset;

    y = Math.max(150, Math.min(y, groundHeight - 50));

    platforms.push({ x, y, width, height });

    if (Math.random() < 0.5) {
      coins.push({ x: x + 20 + Math.random() * 60, y: y - 30, collected: false });
    }

    lastPlatformX = x;
    lastY = y;
  }

  // Cleanup old platforms and coins to save memory
  platforms = platforms.filter(p => p.x > player.x - canvas.width);
  coins = coins.filter(c => c.x > player.x - canvas.width);
  lavaDrops = lavaDrops.filter(l => l.y < canvas.height + 50 && l.x > cameraX - 50 && l.x < cameraX + canvas.width + 50);
}

function showDeathScreen() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }
  document.getElementById('deathScreen').style.display = 'flex';
}

function hideDeathScreen() {
  document.getElementById('deathScreen').style.display = 'none';
}

function resetGame() {
  player.x = 50;
  player.y = 400;
  player.dx = 0;
  player.dy = 0;
  score = 0;
  cameraX = 0;
  lastPlatformX = 0;
  platforms = [];
  coins = [];
  lavaDrops = [];
  generatePlatforms();
  hideDeathScreen();
}

document.getElementById('restartBtn').addEventListener('click', resetGame);

function updatePlayerMovement() {
  if (keys.ArrowLeft) player.dx = -5;
  else if (keys.ArrowRight) player.dx = 5;
  else player.dx *= friction;

  // Skok ovlivní jen vertikální rychlost, horizontální se nemění
  if (keys.Space && player.onGround) {
    player.dy = jumpStrength;
    player.onGround = false;
  }
}

function checkPlayerGroundCollision() {
  player.onGround = false;

  for (let p of platforms) {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y + player.height <= p.y &&
      player.y + player.height + player.dy >= p.y
    ) {
      player.dy = 0;
      player.y = p.y - player.height;
      player.onGround = true;
      return;
    }
  }

  const biome = getCurrentBiome();

  if (player.y + player.height >= groundHeight) {
    if (biome.groundType !== 'safe' && biome.groundType !== 'water') {
      showDeathScreen();
    } else {
      player.y = groundHeight - player.height;
      player.dy = 0;
      player.onGround = true;
    }
  }
}

function update() {
  updatePlayerMovement();

  player.dy += gravity;

  player.x += player.dx;
  player.y += player.dy;

  generatePlatforms();

  checkPlayerGroundCollision();

  // Coins collection
  for (let coin of coins) {
    if (!coin.collected &&
        player.x < coin.x + 10 &&
        player.x + player.width > coin.x &&
        player.y < coin.y + 10 &&
        player.y + player.height > coin.y) {
      coin.collected = true;
      score++;
    }
  }

  // Lava collision
  for (let lava of lavaDrops) {
    lava.x += lava.dx;
    lava.y += lava.dy;
    if (
      player.x < lava.x + lava.radius &&
      player.x + player.width > lava.x - lava.radius &&
      player.y < lava.y + lava.radius &&
      player.y + player.height > lava.y - lava.radius
    ) {
      showDeathScreen();
      return;
    }
  }

  cameraX = player.x - canvas.width / 2;
  draw();
  requestAnimationFrame(update);
}

function drawGround(biome) {
  const offsetX = -cameraX;

  if (biome.groundType === 'lava') {
    ctx.fillStyle = '#aa2200';
    ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight);
    for(let i=0; i<canvas.width; i+=30) {
      ctx.fillStyle = 'rgba(255,69,0,0.5)';
      ctx.beginPath();
      ctx.arc(i + (Date.now()/100)%30, groundHeight + 10 + Math.sin(i/10 + Date.now()/200)*5, 10, 0, Math.PI*2);
      ctx.fill();
    }
  } else if (biome.groundType === 'water') {
    ctx.fillStyle = '#004080';
    ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight);
    for(let i=0; i<canvas.width; i+=40) {
      ctx.fillStyle = 'rgba(173,216,230,0.6)';
      ctx.beginPath();
      ctx.arc(i + (Date.now()/150)%40, groundHeight + 15 + Math.sin(i/15 + Date.now()/300)*3, 8, 0, Math.PI*2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = biome.groundColor;
    ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight);
  }
}

function draw() {
  const biome = getCurrentBiome();
  const offsetX = -cameraX;

  ctx.fillStyle = biome.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGround(biome);

  ctx.fillStyle = biome.platformColor;
  for (let p of platforms) {
    ctx.fillRect(p.x + offsetX, p.y, p.width, p.height);
  }

  ctx.fillStyle = 'yellow';
  for (let coin of coins) {
    if (!coin.collected) {
      ctx.beginPath();
      ctx.arc(coin.x + offsetX, coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'orange';
  for (let lava of lavaDrops) {
    ctx.beginPath();
    ctx.arc(lava.x + offsetX, lava.y, lava.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x + offsetX, player.y, player.width, player.height);

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Nejlepší: ${highScore}`, 10, 60);
  ctx.fillText(`Biom: ${biome.name}`, 10, 90);
}

resetGame();
update();
