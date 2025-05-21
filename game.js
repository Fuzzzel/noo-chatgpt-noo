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

// Generate random user name for leaderboard
function generateRandomName() {
  const adjectives = ['Rychlý', 'Tichý', 'Divoký', 'Šťastný', 'Hbitý', 'Moudrý'];
  const animals = ['Králík', 'Lev', 'Ježek', 'Sova', 'Rys', 'Orel'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return adj + ' ' + animal + Math.floor(Math.random() * 100);
}

const leaderboardKey = 'mario_leaderboard';
let leaderboard = JSON.parse(localStorage.getItem(leaderboardKey)) || [];

// Add or update leaderboard entry
function updateLeaderboard(name, score) {
  const entry = leaderboard.find(e => e.name === name);
  if (!entry) {
    leaderboard.push({ name, score });
  } else if (score > entry.score) {
    entry.score = score;
  }
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 10) leaderboard.length = 10;
  localStorage.setItem(leaderboardKey, JSON.stringify(leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  const ul = document.getElementById('leaderboardList');
  if (!ul) return;
  ul.innerHTML = '';
  for (const entry of leaderboard) {
    const li = document.createElement('li');
    li.textContent = `${entry.name}: ${entry.score}`;
    ul.appendChild(li);
  }
}

renderLeaderboard();

const player = {
  x: 50,
  y: 400,
  width: 30,
  height: 30,
  dx: 0,
  dy: 0,
  color: 'red',
  onGround: false,
  invincible: false,
  powerUpTime: 0,
  highJump: false,
};

const gravity = 0.8;
const friction = 0.8;
const iceFriction = 0.95;
const jumpStrength = -15;
const highJumpStrength = -25;

let cameraX = 0;
let platforms = [];
let coins = [];
let lavaDrops = [];
let enemies = [];
let powerUps = [];

let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let lastPlatformX = 0;
let biomeIndex = 0;
const biomeDistance = 1000;
const groundHeight = 470;

const weatherStates = ['clear', 'rain', 'storm'];
let currentWeather = 'clear';
let weatherTimer = 0;

const achievements = {
  firstCoin: false,
  score50: false,
  score100: false,
  invincibleUsed: false,
};

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

function spawnWeatherEffects() {
  if (currentWeather === 'rain') {
    for (let i = 0; i < 5; i++) {
      const rainX = Math.random() * canvas.width;
      const rainY = Math.random() * canvas.height;
      ctx.strokeStyle = 'rgba(174,194,224,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rainX, rainY);
      ctx.lineTo(rainX, rainY + 10);
      ctx.stroke();
    }
  } else if (currentWeather === 'storm') {
    if (Math.random() < 0.02) {
      ctx.fillStyle = 'white';
      const flashX = Math.random() * canvas.width;
      ctx.fillRect(flashX, 0, 5, canvas.height);
    }
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

    // Destructible blocks only in lava biome
    const biome = getCurrentBiome();
    const destructible = biome.groundType === 'lava' && Math.random() < 0.3;

    platforms.push({ x, y, width, height, destructible, destructionTimer: 0 });

    if (Math.random() < 0.5) {
      coins.push({ x: x + 20 + Math.random() * 60, y: y - 30, collected: false });
    }

    // Spawn enemies on platforms randomly
    if (Math.random() < 0.1) {
      enemies.push({ x: x + 10, y: y - 30, width: 30, height: 30, dx: 1, alive: true, platformX: x, platformWidth: width });
    }

    // Spawn power-ups randomly
    if (Math.random() < 0.05) {
      powerUps.push({ x: x + 50, y: y - 40, width: 20, height: 20, type: Math.random() < 0.5 ? 'invincible' : 'highjump', active: true });
    }

    lastPlatformX = x;
    lastY = y;
  }

  platforms = platforms.filter(p => p.x > player.x - 800);
  coins = coins.filter(c => c.x > player.x - 800);
  lavaDrops = lavaDrops.filter(l => l.y < canvas.height + 50 && l.x > cameraX - 50 && l.x < cameraX + canvas.width + 50);
  enemies = enemies.filter(e => e.x > player.x - 800);
  powerUps = powerUps.filter(pu => pu.x > player.x - 800 && pu.active);
}

function showDeathScreen() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }
  updateLeaderboard(playerName, score);

  const deathScreen = document.getElementById('deathScreen');
  const statsText = `
    Skóre: ${score}
    Nejlepší skóre: ${highScore}
    Biom: ${getCurrentBiome().name}
    Achievements: ${Object.keys(achievements).filter(k => achievements[k]).join(', ') || 'Žádné'}
  `;
  document.getElementById('stats').textContent = statsText;
  deathScreen.style.display = 'flex';
}

function hideDeathScreen() {
  document.getElementById('deathScreen').style.display = 'none';
}

function resetGame() {
  player.x = 50;
  player.y = 400;
  player.dx = 0;
  player.dy = 0;
  player.invincible = false;
  player.powerUpTime = 0;
  player.highJump = false;
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

document.getElementById('restartBtn').addEventListener('click', () => {
  resetGame();
  update();
});

let playerName = generateRandomName();
updateLeaderboard(playerName, 0);

document.getElementById('startGameBtn').addEventListener('click', () => {
  const colorSelect = document.getElementById('colorSelect');
  let chosenColor = colorSelect.value;
  if (chosenColor === 'gold' && score < 100) {
    alert('Zlatá barva se odemkne po dosažení skóre 100!');
    return;
  }
  player.color = chosenColor;
  document.getElementById('mainMenu').style.display = 'none';
  resetGame();
  update();
});

// Unlock gold color if score >= 100
function updateColorOptions() {
  const colorSelect = document.getElementById('colorSelect');
  if (score >= 100) {
    const goldOption = [...colorSelect.options].find(o => o.value === 'gold');
    if (goldOption) goldOption.disabled = false;
  }
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update biome and background
  const biome = getCurrentBiome();
  ctx.fillStyle = biome.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Weather timer & switch
  weatherTimer--;
  if (weatherTimer <= 0) {
    currentWeather = weatherStates[Math.floor(Math.random() * weatherStates.length)];
    weatherTimer = 600 + Math.floor(Math.random() * 600);
  }

  // Spawn lava drops in lava biome during storm or rain
  if (biome.groundType === 'lava' && (currentWeather === 'rain' || currentWeather === 'storm') && Math.random() < 0.1) {
    spawnLava();
  }

  spawnWeatherEffects();

  generatePlatforms();

  // Update lava drops
  for (let i = lavaDrops.length - 1; i >= 0; i--) {
    let l = lavaDrops[i];
    l.x += l.dx;
    l.y += l.dy;

    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(l.x - cameraX, l.y, l.radius, 0, Math.PI * 2);
    ctx.fill();

    // Check collision with player
    if (
      l.x > player.x && l.x < player.x + player.width &&
      l.y > player.y && l.y < player.y + player.height
    ) {
      if (!player.invincible) showDeathScreen();
    }

    if (l.y > canvas.height) {
      lavaDrops.splice(i, 1);
    }
  }

  // Update enemies
  enemies.forEach(e => {
    if (!e.alive) return;
    e.x += e.dx;
    if (e.x < e.platformX) e.dx = 1;
    if (e.x + e.width > e.platformX + e.platformWidth) e.dx = -1;

    ctx.fillStyle = 'purple';
    ctx.fillRect(e.x - cameraX, e.y, e.width, e.height);

    // Player collision with enemy
    if (
      player.x < e.x + e.width && player.x + player.width > e.x &&
      player.y < e.y + e.height && player.y + player.height > e.y
    ) {
      if (!player.invincible) showDeathScreen();
      else e.alive = false;
    }
  });

  // Update power-ups
  powerUps.forEach(pu => {
    ctx.fillStyle = pu.type === 'invincible' ? 'yellow' : 'blue';
    ctx.fillRect(pu.x - cameraX, pu.y, pu.width, pu.height);

    // Player collects power-up
    if (
      player.x < pu.x + pu.width && player.x + player.width > pu.x &&
      player.y < pu.y + pu.height && player.y + player.height > pu.y
    ) {
      pu.active = false;
      if (pu.type === 'invincible') {
        player.invincible = true;
        player.powerUpTime = 600; // 10 seconds at 60fps
        achievements.invincibleUsed = true;
      } else if (pu.type === 'highjump') {
        player.highJump = true;
        player.powerUpTime = 600;
      }
    }
  });

  // Player physics
  if (keys.ArrowLeft) {
    player.dx -= 0.7;
  }
  if (keys.ArrowRight) {
    player.dx += 0.7;
  }

  // Jump
  if (keys.Space && player.onGround) {
    player.dy = player.highJump ? highJumpStrength : jumpStrength;
    player.onGround = false;
  }

  // Apply gravity
  player.dy += gravity;

  // Apply friction / ice friction
  const biomeType = biome.groundType;
  if (player.onGround) {
    player.dx *= (biomeType === 'ice') ? iceFriction : friction;
  } else {
    player.dx *= 0.95;
  }

  // Move player
  player.x += player.dx;
  player.y += player.dy;

  // Collision detection with platforms
  player.onGround = false;
  for (let p of platforms) {
    if (
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      player.y + player.height > p.y &&
      player.y + player.height < p.y + p.height + player.dy &&
      player.dy >= 0
    ) {
      player.y = p.y - player.height;
      player.dy = 0;
      player.onGround = true;

      // Handle destructible platforms
      if (p.destructible) {
        p.destructionTimer++;
        if (p.destructionTimer > 30) {
          platforms = platforms.filter(pl => pl !== p);
        }
      }
    }
  }

  // Collide with ground
  if (player.y + player.height > groundHeight) {
    if (biome.groundType === 'lava' && !player.invincible) {
      showDeathScreen();
    } else if (biome.groundType === 'toxic' && !player.invincible) {
      // Toxic effect slows down player and damages over time
      player.dx *= 0.7;
      player.dy += 0.5;
    } else {
      player.y = groundHeight - player.height;
      player.dy = 0;
      player.onGround = true;
    }
  }

  // Check coins
  for (let c of coins) {
    if (!c.collected && player.x < c.x + 20 && player.x + player.width > c.x &&
      player.y < c.y + 20 && player.y + player.height > c.y) {
      c.collected = true;
      score++;
      updateLeaderboard(playerName, score);
      if (!achievements.firstCoin) achievements.firstCoin = true;
      if (score >= 50) achievements.score50 = true;
      if (score >= 100) achievements.score100 = true;
    }
  }

  // Draw platforms
  platforms.forEach(p => {
    ctx.fillStyle = p.destructible ? 'darkorange' : biome.platformColor;
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height);
  });

  // Draw coins
  coins.forEach(c => {
    if (!c.collected) {
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      ctx.arc(c.x - cameraX + 10, c.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw player
  ctx.fillStyle = player.invincible ? 'yellow' : player.color;
  ctx.fillRect(player.x - cameraX, player.y, player.width, player.height);

  // Draw score
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`Skóre: ${score}`, 20, 30);
  ctx.fillText(`Nejlepší skóre: ${highScore}`, 20, 60);
  ctx.fillText(`Biom: ${biome.name}`, 20, 90);

  // Update power-up timer
  if (player.powerUpTime > 0) {
    player.powerUpTime--;
  } else {
    player.invincible = false;
    player.highJump = false;
  }

  // Update camera position smoothly
  cameraX += (player.x - cameraX - 100) * 0.05;

  updateColorOptions();

  if (document.getElementById('deathScreen').style.display !== 'flex') {
    requestAnimationFrame(update);
  }
}
