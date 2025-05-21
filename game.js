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
const friction = 0.9;
const jumpStrength = -15;

let cameraX = 0;
let platforms = [];
let coins = [];
let weatherParticles = [];

let score = 0;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let lastPlatformX = 0;
const groundHeight = 470;

const biomes = [
  { name: "Les", bg: '#87CEEB', platformColor: 'green', groundColor: '#228B22', groundType: 'safe', weather: 'rain' },
  { name: "Poušť", bg: '#ffe4b5', platformColor: '#c2b280', groundColor: '#edc9af', groundType: 'safe', weather: null },
  { name: "Láva", bg: '#330000', platformColor: '#ff4500', groundColor: 'darkred', groundType: 'lava', weather: 'lavaDrops' },
  { name: "Led", bg: '#d0f0ff', platformColor: '#a0e9f0', groundColor: '#b0e0e6', groundType: 'ice', weather: 'snow' },
  { name: "Toxický", bg: '#2f4f4f', platformColor: '#39ff14', groundColor: '#006400', groundType: 'toxic', weather: 'toxicDrops' },
];

function getCurrentBiome() {
  const idx = Math.floor(player.x / 1000) % biomes.length;
  return biomes[idx];
}

function lerpColor(a, b, t) {
  // linear interpolation between two hex colors a and b, t in [0,1]
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b_ = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b_})`;
}
function hexToRgb(hex) {
  const bigint = parseInt(hex.replace('#',''),16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function getBiomeTransitionColor() {
  const playerPos = player.x;
  const biomeIndex = Math.floor(playerPos / 1000);
  const nextBiomeIndex = (biomeIndex + 1) % biomes.length;
  const t = (playerPos % 1000) / 1000;
  const currentBiome = biomes[biomeIndex % biomes.length];
  const nextBiome = biomes[nextBiomeIndex];
  return lerpColor(currentBiome.bg, nextBiome.bg, t);
}

function generatePlatforms() {
  const maxVerticalGap = 80;
  const maxHorizontalGap = 150; // tak aby se doskočilo
  let lastY = platforms.length ? platforms[platforms.length - 1].y : 350;

  while (lastPlatformX < player.x + 800) {
    const width = 100;
    // Horizontální vzdálenost max 150 (alespoň tak, aby se dalo doskočit)
    const x = lastPlatformX + 70 + Math.random() * (maxHorizontalGap - 70);
    let yOffset = (Math.random() - 0.5) * maxVerticalGap * 2;
    let y = lastY + yOffset;

    y = Math.max(150, Math.min(y, groundHeight - 50));

    platforms.push({ x, y, width, height: 10 });

    // Přidej max jednu minci na platformu
    if (Math.random() < 0.5) {
      coins.push({ x: x + width / 2, y: y - 20, collected: false });
    }

    lastPlatformX = x;
    lastY = y;
  }

  // Odstraň platformy daleko za hráčem
  platforms = platforms.filter(p => p.x > player.x - 800);
  coins = coins.filter(c => c.x > player.x - 800);
}

function updatePlayer() {
  if (keys.ArrowLeft) player.dx = -5;
  else if (keys.ArrowRight) player.dx = 5;
  else player.dx *= friction;

  if (keys.Space && player.onGround) {
    player.dy = jumpStrength;
    player.onGround = false;
  }

  player.dy += gravity;

  // Pokud je v ledovém biomu, sníž tření, tedy klouzání
  if (getCurrentBiome().groundType === 'ice') {
    player.dx *= 0.98;
  }

  player.x += player.dx;
  player.y += player.dy;

  player.onGround = false;

  for (let p of platforms) {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y + player.height <= p.y + 10 &&
      player.y + player.height + player.dy >= p.y
    ) {
      player.dy = 0;
      player.y = p.y - player.height;
      player.onGround = true;
    }
  }

  // Kolize se zemí (podlahou podle biomu)
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

  // Sbírání mincí
  for (let coin of coins) {
    if (
      !coin.collected &&
      player.x < coin.x + 10 &&
      player.x + player.width > coin.x &&
      player.y < coin.y + 10 &&
      player.y + player.height > coin.y
    ) {
      coin.collected = true;
      score++;
    }
  }
}

function updateCamera() {
  cameraX = player.x - canvas.width / 2;
}

function drawPlatforms() {
  const biome = getCurrentBiome();
  const offsetX = -cameraX;
  ctx.fillStyle = biome.platformColor;
  for (let p of platforms) {
    ctx.fillRect(p.x + offsetX, p.y, p.width, p.height);
  }
}

function drawCoins() {
  const offsetX = -cameraX;
  ctx.fillStyle = 'yellow';
  for (let coin of coins) {
    if (!coin.collected) {
      ctx.beginPath();
      ctx.arc(coin.x + offsetX, coin.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer() {
  const offsetX = -cameraX;
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x + offsetX, player.y, player.width, player.height);
}

function drawGround() {
  const biome = getCurrentBiome();
  const offsetX = 0;
  ctx.fillStyle = biome.groundColor;
  ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight);
}

function drawScore() {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`Skóre: ${score}`, 10, 30);
  ctx.fillText(`Nejlepší: ${highScore}`, 10, 60);
  ctx.fillText(`Biom: ${getCurrentBiome().name}`, 10, 90);
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
  generatePlatforms();
  hideDeathScreen();
}

function updateWeather() {
  const biome = getCurrentBiome();

  weatherParticles = weatherParticles.filter(p => p.y < canvas.height);

  if (biome.weather === 'rain') {
    if (Math.random() < 0.2) {
      weatherParticles.push({
        x: Math.random() * canvas.width,
        y: 0,
        dy: 4 + Math.random() * 4,
        type: 'rain',
      });
    }
  } else if (biome.weather === 'snow') {
    if (Math.random() < 0.1) {
      weatherParticles.push({
        x: Math.random() * canvas.width,
        y: 0,
        dy: 1 + Math.random() * 2,
        type: 'snow',
      });
    }
  } else if (biome.weather === 'lavaDrops') {
    if (Math.random() < 0.15) {
      weatherParticles.push({
        x: Math.random() * canvas.width,
        y: 0,
        dy: 5 + Math.random() * 3,
        type: 'lava',
        radius: 10,
        dx: (Math.random() - 0.5) * 2,
      });
    }
  } else if (biome.weather === 'toxicDrops') {
    if (Math.random() < 0.15) {
      weatherParticles.push({
        x: Math.random() * canvas.width,
        y: 0,
        dy: 3 + Math.random() * 2,
        type: 'toxic',
        radius: 8,
        dx: (Math.random() - 0.5) * 1,
      });
    }
  }

  for (let p of weatherParticles) {
    p.x += p.dx || 0;
    p.y += p.dy;
  }
}

function drawWeather() {
  const offsetX = 0;
  for (let p of weatherParticles) {
    if (p.type === 'rain') {
      ctx.strokeStyle = 'rgba(173,216,230,0.7)';
      ctx.beginPath();
      ctx.moveTo(p.x + offsetX, p.y);
      ctx.lineTo(p.x + offsetX, p.y + 10);
      ctx.stroke();
    } else if (p.type === 'snow') {
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(p.x + offsetX, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'lava') {
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(p.x + offsetX, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'toxic') {
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(p.x + offsetX, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function gameLoop() {
  updatePlayer();
  updateCamera();
  generatePlatforms();
  updateWeather();

  // Pozadí s plynulým přechodem mezi biomy (bez fade overlay, prostě přímý lerp barev)
  const bgColor = getBiomeTransitionColor();
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGround();
  drawPlatforms();
  drawCoins();
  drawPlayer();
  drawWeather();
  drawScore();

  requestAnimationFrame(gameLoop);
}

document.getElementById('restartBtn').addEventListener('click', () => {
  resetGame();
});

resetGame();
gameLoop();
