const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

let gameRunning = false;

const player = {
  x: 50,
  y: 400,
  width: 30,
  height: 30,
  dx: 0,
  dy: 0,
  color: 'red',
  onGround: false,
  skin: 'red',
};

const gravity = 0.8;
const friction = 0.9;
const jumpStrength = -15;

let cameraX = 0;
let platforms = [];
let coins = [];
let lavaDrops = [];
let enemies = [];
let destructibleBlocks = [];
let powerUps = [];

let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let lastPlatformX = 0;
let biomeIndex = 0;
const biomeDistance = 1000;
const groundHeight = 470;

const biomes = [
  { name: "Les", bg: '#87CEEB', platformColor: 'green', groundColor: '#228B22', groundType: 'safe', floorType: 'grass' },
  { name: "Poušť", bg: '#ffe4b5', platformColor: '#c2b280', groundColor: '#edc9af', groundType: 'safe', floorType: 'sand' },
  { name: "Láva", bg: '#330000', platformColor: '#ff4500', groundColor: 'darkred', groundType: 'lava', floorType: 'lava' },
  { name: "Led", bg: '#d0f0ff', platformColor: '#a0e9f0', groundColor: '#b0e0e6', groundType: 'ice', floorType: 'ice' },
  { name: "Toxický", bg: '#2f4f4f', platformColor: '#39ff14', groundColor: '#006400', groundType: 'toxic', floorType: 'toxic' },
];

const floorColors = {
  grass: '#228B22',
  sand: '#edc9af',
  lava: '#ff3300',
  ice: '#b0e0e6',
  toxic: '#006400',
};

const skins = {
  red: 'red',
  gold: 'gold',
  blue: 'blue',
  green: 'green',
};

let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

function generateRandomName() {
  const adjectives = ['Rychlý', 'Silný', 'Chytrý', 'Divoký', 'Statečný'];
  const animals = ['Lev', 'Vlk', 'Orel', 'Tygr', 'Medvěd'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + animals[Math.floor(Math.random() * animals.length)];
}

let playerName = localStorage.getItem('playerName') || generateRandomName();
localStorage.setItem('playerName', playerName);

function getCurrentBiome() {
  biomeIndex = Math.floor(player.x / biomeDistance) % biomes.length;
  return biomes[biomeIndex];
}

function spawnLava() {
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

setInterval(() => {
  if (getCurrentBiome().name === "Láva") spawnLava();
}, 1500);

function spawnEnemy() {
  if (Math.random() < 0.01) {
    enemies.push({
      x: cameraX + canvas.width + 50,
      y: groundHeight - 30,
      width: 30,
      height: 30,
      dx: -2 - Math.random() * 2,
      dy: 0,
      color: 'purple',
      onGround: true,
    });
  }
}

function spawnPowerUp() {
  if (Math.random() < 0.005) {
    powerUps.push({
      x: cameraX + canvas.width + 50,
      y: groundHeight - 50,
      width: 20,
      height: 20,
      type: 'jumpBoost',
      collected: false,
      color: 'cyan',
    });
  }
}

function generatePlatforms() {
  const maxVerticalGap = 100;
  const maxHorizontalGap = 200;

  let lastY = platforms.length ? platforms[platforms.length - 1].y : 350;

  while (lastPlatformX < player.x + 800) {
    const height = 10;
    const width = 100;

    const x = lastPlatformX + 100 + Math.random() * (maxHorizontalGap - 100);
    let yOffset = (Math.random() - 0.5) * maxVerticalGap * 2;
    let y = lastY + yOffset;

    y = Math.max(150, Math.min(y, groundHeight - 50));

    platforms.push({ x, y, width, height, destructible: false, hitsLeft: 0 });

    if (Math.random() < 0.3 && getCurrentBiome().name === "Láva") {
      destructibleBlocks.push({ x, y: y - 20, width: 50, height: 20, hitsLeft: 3 });
    }

    if (Math.random() < 0.5) {
      coins.push({ x: x + 20 + Math.random() * 60, y: y - 30, collected: false });
    }

    lastPlatformX = x;
    lastY = y;
  }

  platforms = platforms.filter(p => p.x > player.x - 800);
  coins = coins.filter(c => c.x > player.x - 800);
  lavaDrops = lavaDrops.filter(l => l.y < canvas.height + 50 && l.x > cameraX - 50 && l.x < cameraX + canvas.width + 50);
  destructibleBlocks = destructibleBlocks.filter(b => b.x > player.x - 800);
  enemies = enemies.filter(e => e.x > player.x - 800);
  powerUps = powerUps.filter(p => p.x > player.x - 800);
}

function showDeathScreen() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }
  updateLeaderboard(playerName, score);
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
  enemies = [];
  destructibleBlocks = [];
  powerUps = [];
  generatePlatforms();
  hideDeathScreen();
}

document.getElementById('restartBtn').addEventListener('click', () => {
  resetGame();
  gameRunning = true;
  hideDeathScreen();
  update();
});

function updateLeaderboard(name, score) {
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
  updateLeaderboardUI();
}

function updateLeaderboardUI() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  list.innerHTML = '';
  leaderboard.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name}: ${entry.score}`;
    list.appendChild(li);
  });
}

function startGame() {
  resetGame();
  hideMainMenu();
  gameRunning = true;
  updateLeaderboardUI();
  update();
}

function showMainMenu() {
  const menu = document.getElementById('mainMenu');
  menu.style.display = 'flex';
}

function hideMainMenu() {
  const menu = document.getElementById('mainMenu');
  menu.style.display = 'none';
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (!gameRunning) {
    startGame();
  }
});

document.getElementById('colorSelect').addEventListener('change', (e) => {
  if (e.target.value === 'gold' && score < 100) {
    alert('Zlatý skin se odemkne po dosažení skóre 100!');
    e.target.value = player.skin;
    return;
  }
  player.skin = e.target.value;
  player.color = skins[player.skin];
  localStorage.setItem('playerSkin', player.skin);
});

player.skin = localStorage.getItem('playerSkin') || 'red';
player.color = skins[player.skin];

function update() {
  if (!gameRunning) return;

  if (keys.ArrowLeft) player.dx = -5;
  else if (keys.ArrowRight) player.dx = 5;
  else player.dx *= friction;

  if (keys.Space && player.onGround) {
    player.dy = jumpStrength;
    player.onGround = false;
  }

  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  generatePlatforms();

  player.onGround = false;
  for (let p of platforms) {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y + player.height < p.y + 10 &&
      player.y + player.height + player.dy >= p.y
    ) {
      player.dy = 0;
      player.y = p.y - player.height;
      player.onGround = true;
    }
  }

  for (let block of destructibleBlocks) {
    if (
      player.x < block.x + block.width &&
      player.x + player.width > block.x &&
      player.y + player.height < block.y + block.height &&
      player.y + player.height + player.dy >= block.y
    ) {
      player.dy = 0;
      player.y = block.y - player.height;
      player.onGround = true;
    }
  }

  const biome = getCurrentBiome();

  if (player.y + player.height >= groundHeight) {
    if (biome.groundType !== 'safe') {
      showDeathScreen();
      gameRunning = false;
      return;
    } else {
      player.y = groundHeight - player.height;
      player.dy = 0;
      player.onGround = true;
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
    }
  }

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
      gameRunning = false;
      return;
    }
  }

  for (let enemy of enemies) {
    enemy.x += enemy.dx;
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      showDeathScreen();
      gameRunning = false;
      return;
    }
  }

  for (let powerUp of powerUps) {
    if (!powerUp.collected &&
      player.x < powerUp.x + powerUp.width &&
      player.x + player.width > powerUp.x &&
      player.y < powerUp.y + powerUp.height &&
      player.y + player.height > powerUp.y) {
      powerUp.collected = true;
      if (powerUp.type === 'jumpBoost') {
        player.dy = jumpStrength * 1.5;
      }
    }
  }

  spawnEnemy();
  spawnPowerUp();

  cameraX = player.x - canvas.width / 2;

  draw();

  requestAnimationFrame(update);
}

function draw() {
  const biome = getCurrentBiome();
  const offsetX = -cameraX;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = biome.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = floorColors[biome.floorType] || biome.groundColor;
  ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight);

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

  ctx.fillStyle = 'purple';
  for (let enemy of enemies) {
    ctx.fillRect(enemy.x + offsetX, enemy.y, enemy.width, enemy.height);
  }

  ctx.fillStyle = 'brown';
  for (let block of destructibleBlocks) {
    ctx.fillRect(block.x + offsetX, block.y, block.width, block.height);
  }

  ctx.fillStyle = 'cyan';
  for (let powerUp of powerUps) {
    if (!powerUp.collected) {
      ctx.fillRect(powerUp.x + offsetX, powerUp.y, powerUp.width, powerUp.height);
    }
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x + offsetX, player.y, player.width, player.height);

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Nejlepší: ${highScore}`, 10, 60);
  ctx.fillText(`Biom: ${biome.name}`, 10, 90);
}

showMainMenu();
updateLeaderboardUI();
