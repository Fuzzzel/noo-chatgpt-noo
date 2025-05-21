const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
document.addEventListener('keydown', e => { if (e.code in keys) keys[e.code] = true; });
document.addEventListener('keyup', e => { if (e.code in keys) keys[e.code] = false; });

const skins = [
  { name: "Červená", color: 'red', unlockScore: 0 },
  { name: "Zlatá", color: 'gold', unlockScore: 100 },
  { name: "Modrá", color: 'deepskyblue', unlockScore: 300 },
];

let selectedSkinIndex = 0;

const player = {
  x: 50, y: 400, width: 30, height: 30,
  dx: 0, dy: 0, onGround: false,
  speed: 5, jumpStrength: -15,
  color: skins[selectedSkinIndex].color,
  shield: false,
  doubleJumpAvailable: true,
};

const gravity = 0.8;
const friction = 0.85;
const groundHeight = 470;

let cameraX = 0;
let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let lastPlatformX = 0;
let platforms = [];
let coins = [];
let lavaDrops = [];
let enemies = [];
let powerUps = [];
let achievements = new Set();
let biomeIndex = 0;
const biomeDistance = 1000;
let weather = 'clear';
let weatherTimer = 0;

const biomes = [
  { name: "Les", bg: '#87CEEB', platformColor: 'green', groundColor: '#228B22', groundType: 'safe', weatherTypes: ['clear', 'rain'] },
  { name: "Poušť", bg: '#ffe4b5', platformColor: '#c2b280', groundColor: '#edc9af', groundType: 'safe', weatherTypes: ['clear', 'sandstorm'] },
  { name: "Láva", bg: '#330000', platformColor: '#ff4500', groundColor: 'darkred', groundType: 'lava', weatherTypes: ['clear', 'ash'] },
  { name: "Led", bg: '#d0f0ff', platformColor: '#a0e9f0', groundColor: '#b0e0e6', groundType: 'ice', weatherTypes: ['clear', 'snow'] },
  { name: "Toxický", bg: '#2f4f4f', platformColor: '#39ff14', groundColor: '#006400', groundType: 'toxic', weatherTypes: ['clear', 'fog'] },
];

function getCurrentBiome() {
  biomeIndex = Math.floor(player.x / biomeDistance) % biomes.length;
  return biomes[biomeIndex];
}

function spawnLava() {
  if (getCurrentBiome().groundType === 'lava') {
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
}

setInterval(spawnLava, 1500);

function spawnEnemy() {
  if (Math.random() < 0.02) {
    const x = player.x + canvas.width + Math.random() * 500;
    const y = groundHeight - 30;
    enemies.push({ x, y, width: 30, height: 30, dx: -2 - Math.random() * 2 });
  }
}

function spawnPowerUp() {
  if (Math.random() < 0.01) {
    const x = player.x + canvas.width + Math.random() * 800;
    const y = groundHeight - 50 - Math.random() * 100;
    const types = ['shield', 'doubleJump', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push({ x, y, radius: 10, type, collected: false });
  }
}

function generatePlatforms() {
  const maxVerticalGap = 100;
  const maxHorizontalGap = 200;
  let lastY = platforms.length ? platforms[platforms.length - 1].y : 350;
  while (lastPlatformX < player.x + 1000) {
    const height = 10;
    const width = 100;
    const x = lastPlatformX + 100 + Math.random() * (maxHorizontalGap - 100);
    let yOffset = (Math.random() - 0.5) * maxVerticalGap * 2;
    let y = lastY + yOffset;
    y = Math.max(150, Math.min(y, groundHeight - 50));
    platforms.push({ x, y, width, height, destructible: getCurrentBiome().groundType === 'lava' && Math.random() < 0.3, destroyed: false });
    if (Math.random() < 0.5) {
      coins.push({ x: x + 20 + Math.random() * 60, y: y - 30, collected: false });
    }
    lastPlatformX = x;
    lastY = y;
  }
  platforms = platforms.filter(p => p.x > player.x - 800 && !p.destroyed);
  coins = coins.filter(c => c.x > player.x - 800 && !c.collected);
  lavaDrops = lavaDrops.filter(l => l.y < canvas.height + 50 && l.x > cameraX - 50 && l.x < cameraX + canvas.width + 50);
  enemies = enemies.filter(e => e.x + e.width > cameraX - 100);
  powerUps = powerUps.filter(p => p.x > cameraX - 100 && !p.collected);
}

function updateWeather() {
  weatherTimer--;
  if (weatherTimer <= 0) {
    const biome = getCurrentBiome();
    weather = biome.weatherTypes[Math.floor(Math.random() * biome.weatherTypes.length)];
    weatherTimer = 60 * 30;
  }
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
  player.shield = false;
  player.doubleJumpAvailable = true;
  score = 0;
  cameraX = 0;
  lastPlatformX = 0;
  platforms = [];
  coins = [];
  lavaDrops = [];
  enemies = [];
  powerUps = [];
  generatePlatforms();
  hideDeathScreen();
}

document.getElementById('restartBtn').addEventListener('click', resetGame);

function startGame() {
  resetGame();
  hideMainMenu();
  gameRunning = true;
  update();
}

document.getElementById('startBtn').addEventListener('click', () => {
  startGame();
});


function applyFriction() {
  if (getCurrentBiome().groundType === 'ice') {
    player.dx *= 0.98;
  } else {
    player.dx *= friction;
  }
}

function update() {
  updateWeather();
  if (keys.ArrowLeft) player.dx = -player.speed;
  else if (keys.ArrowRight) player.dx = player.speed;
  else applyFriction();

  if (keys.Space) {
    if (player.onGround) {
      player.dy = player.jumpStrength;
      player.onGround = false;
      player.doubleJumpAvailable = true;
    } else if (player.doubleJumpAvailable) {
      player.dy = player.jumpStrength;
      player.doubleJumpAvailable = false;
    }
  }

  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  generatePlatforms();
  spawnEnemy();
  spawnPowerUp();

  player.onGround = false;
  for (let p of platforms) {
    if (!p.destroyed &&
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y + player.height < p.y + 10 &&
      player.y + player.height + player.dy >= p.y) {
      player.dy = 0;
      player.y = p.y - player.height;
      player.onGround = true;
      player.doubleJumpAvailable = true;
      if (p.destructible) {
        p.destroyed = true;
      }
    }
  }

  const biome = getCurrentBiome();

  if (player.y + player.height >= groundHeight) {
    if (biome.groundType === 'lava') {
      if (!player.shield) {
        showDeathScreen();
        return;
      } else {
        player.y = groundHeight - player.height;
        player.dy = 0;
        player.onGround = true;
        player.shield = false;
      }
    } else if (biome.groundType === 'toxic') {
      if (!player.shield) {
        showDeathScreen();
        return;
      } else {
        player.y = groundHeight - player.height;
        player.dy = 0;
        player.onGround = true;
        player.shield = false;
      }
    } else {
      player.y = groundHeight - player.height;
      player.dy = 0;
      player.onGround = true;
      player.doubleJumpAvailable = true;
    }
  }

  for (let coin of coins) {
    if (!coin.collected &&
      player.x < coin.x + 10 &&
      player.x + player.width > coin.x &&
      player.y < coin.y + 10 &&
      player.y + player.height > coin.y) {
      coin.collected = true;
      score++;
      if (score >= 100) selectedSkinIndex = 1;
      if (score >= 300) selectedSkinIndex = 2;
      player.color = skins[selectedSkinIndex].color;
    }
  }

  for (let lava of lavaDrops) {
    lava.x += lava.dx;
    lava.y += lava.dy;
    if (
      player.x < lava.x + lava.radius &&
      player.x + player.width > lava.x - lava.radius &&
      player.y < lava.y + lava.radius &&
      player.y + player.height > lava.y - lava.radius) {
      if (!player.shield) {
        showDeathScreen();
        return;
      } else {
        lavaDrops = lavaDrops.filter(l => l !== lava);
        player.shield = false;
      }
    }
  }

  for (let enemy of enemies) {
    enemy.x += enemy.dx;
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y) {
      if (!player.shield) {
        showDeathScreen();
        return;
      } else {
        enemies = enemies.filter(e => e !== enemy);
        player.shield = false;
      }
    }
  }

  for (let pUp of powerUps) {
    if (!pUp.collected &&
      player.x < pUp.x + pUp.radius &&
      player.x + player.width > pUp.x - pUp.radius &&
      player.y < pUp.y + pUp.radius &&
      player.y + player.height > pUp.y - pUp.radius) {
      pUp.collected = true;
      if (pUp.type === 'shield') player.shield = true;
      if (pUp.type === 'doubleJump') player.doubleJumpAvailable = true;
      if (pUp.type === 'speed') player.speed = 8;
      setTimeout(() => player.speed = 5, 8000);
    }
  }

  cameraX = player.x - canvas.width / 2;
  draw();
  requestAnimationFrame(update);
}

function drawWeather() {
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  switch (weather) {
    case 'rain':
      for (let i = 0; i < 100; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 1, 10);
      }
      break;
    case 'snow':
      for (let i = 0; i < 100; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'sandstorm':
      ctx.fillStyle = 'rgba(210,180,140,0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    case 'ash':
      ctx.fillStyle = 'rgba(80,80,80,0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    case 'fog':
      ctx.fillStyle = 'rgba(34,139,34,0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
  }
}

function draw() {
  const biome = getCurrentBiome();
  const offsetX = -cameraX;

  ctx.fillStyle = biome.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = biome.groundColor;
  ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight);

  ctx.fillStyle = biome.platformColor;
  for (let p of platforms) {
    if (!p.destroyed) ctx.fillRect(p.x + offsetX, p.y, p.width, p.height);
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

  ctx.fillStyle = 'purple';
  for (let enemy of enemies) {
    ctx.fillRect(enemy.x + offsetX, enemy.y, enemy.width, enemy.height);
  }

  ctx.fillStyle = 'cyan';
  for (let pUp of powerUps) {
    if (!pUp.collected) {
      ctx.beginPath();
      ctx.arc(pUp.x + offsetX, pUp.y, pUp.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x + offsetX, player.y, player.width, player.height);

  if (player.shield) {
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x + offsetX - 3, player.y - 3, player.width + 6, player.height + 6);
  }

  drawWeather();

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Nejlepší: ${highScore}`, 10, 60);
  ctx.fillText(`Biom: ${biome.name}`, 10, 90);
  ctx.fillText(`Počasí: ${weather}`, 10, 120);
  ctx.fillText(`Skin: ${skins[selectedSkinIndex].name}`, 10, 150);
}

resetGame();
update();
