const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

let gameStarted = false;

const player = {
  x: 50,
  y: 0,
  width: 30,
  height: 30,
  dx: 0,
  dy: 0,
  color: 'red',
  onGround: false,
};

const gravity = 0.8;
const friction = 0.9;
const jumpStrength = -15;

let cameraX = 0;
let platforms = [];
let coins = [];
let lavaDrops = [];

let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let lastPlatformX = 0;
let biomeIndex = 0;
const biomeDistance = 1000;

function getGroundHeight() {
  return canvas.height - 30;
}
let groundHeight = getGroundHeight();

const biomes = [
  { name: "Les", bg: '#87CEEB', platformColor: 'green', groundColor: '#228B22', groundType: 'safe' },
  { name: "Poušť", bg: '#ffe4b5', platformColor: '#c2b280', groundColor: '#edc9af', groundType: 'safe' },
  { name: "Láva", bg: '#330000', platformColor: '#ff4500', groundColor: 'darkred', groundType: 'lava' },
  { name: "Led", bg: '#d0f0ff', platformColor: '#a0e9f0', groundColor: '#b0e0e6', groundType: 'ice' },
  { name: "Toxický", bg: '#2f4f4f', platformColor: '#39ff14', groundColor: '#006400', groundType: 'toxic' },
];

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

let lavaInterval;

function startLavaSpawn() {
  lavaInterval = setInterval(spawnLava, 1500);
}

function stopLavaSpawn() {
  clearInterval(lavaInterval);
}

function generatePlatforms() {
  const maxVerticalGap = 100;
  const maxHorizontalGap = 200;

  let lastY = platforms.length ? platforms[platforms.length - 1].y : groundHeight - 120;

  while (lastPlatformX < player.x + canvas.width + 200) {
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

  platforms = platforms.filter(p => p.x > player.x - canvas.width - 200);
  coins = coins.filter(c => c.x > player.x - canvas.width - 200);
  lavaDrops = lavaDrops.filter(l => l.y < canvas.height + 50 && l.x > cameraX - 50 && l.x < cameraX + canvas.width + 50);
}

function showDeathScreen() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }
  document.getElementById('deathScreen').style.display = 'flex';
  stopLavaSpawn();
}

function hideDeathScreen() {
  document.getElementById('deathScreen').style.display = 'none';
}

function resetGame() {
  player.x = 50;
  player.y = groundHeight - player.height;
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
  startLavaSpawn();
  gameStarted = true;
}

document.getElementById('startBtn').addEventListener('click', () => {
  const colorSelect = document.getElementById('colorSelect');
  player.color = colorSelect.value === 'gold' && score < 100 ? 'red' : colorSelect.value;
  if (colorSelect.value === 'gold' && score < 100) {
    alert("Zlatá barva se odemkne po dosažení skóre 100!");
    return;
  }
  document.getElementById('mainMenu').style.display = 'none';
  resetGame();
  updateLeaderboardUI();
  update();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('deathScreen').style.display = 'none';
  resetGame();
});

function update() {
  if (!gameStarted) return;

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

  const biome = getCurrentBiome();

  if (player.y + player.height >= groundHeight) {
    if (biome.groundType !== 'safe') {
      showDeathScreen();
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
      return;
    }
  }

  cameraX = player.x - canvas.width / 2;
  draw();
  requestAnimationFrame(update);
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

function updateLeaderboardUI() {
  const leaderboardList = document.getElementById('leaderboardList');
  leaderboardList.innerHTML = '';
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leaderboard.sort((a,b) => b.score - a.score);
  leaderboard.slice(0, 10).forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name}: ${entry.score}`;
    leaderboardList.appendChild(li);
  });
}

function generateRandomName() {
  const adjectives = ['Rychlý', 'Silný', 'Šťastný', 'Divoký', 'Mocný', 'Zářivý'];
  const nouns = ['Lev', 'Tygr', 'Orlice', 'Vlčák', 'Jaguár', 'Havran'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function saveScoreToLeaderboard(score) {
  let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  if (!leaderboard.find(e => e.name === playerName)) {
    leaderboard.push({ name: playerName, score });
  } else {
    leaderboard = leaderboard.map(e => {
      if (e.name === playerName && score > e.score) return { name: playerName, score };
      return e;
    });
  }
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
}

const playerName = generateRandomName();

showMainMenu();

function showMainMenu() {
  document.getElementById('mainMenu').style.display = 'flex';
  document.getElementById('deathScreen').style.display = 'none';
  updateLeaderboardUI();
}
