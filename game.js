
const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

let cameraX = 0
const groundHeight = canvas.height * 0.8
let gameStarted = false

const biomes = [
  {
    name: 'Les',
    bg: '#88c070',
    platformColor: '#3a5a20',
    groundColor: '#2e4d14',
    floorType: 'water'
  },
  {
    name: 'Poušť',
    bg: '#d6b451',
    platformColor: '#c9a15a',
    groundColor: '#b2873c',
    floorType: 'sand'
  },
  {
    name: 'Láva',
    bg: '#d44242',
    platformColor: '#8b1c1c',
    groundColor: '#661010',
    floorType: 'lava'
  },
  {
    name: 'Led',
    bg: '#7ad0ff',
    platformColor: '#3b6ca5',
    groundColor: '#23548b',
    floorType: 'ice'
  },
  {
    name: 'Toxický',
    bg: '#52a852',
    platformColor: '#2e8f2e',
    groundColor: '#236023',
    floorType: 'toxic'
  }
]

const biomeDistance = 2000
let platforms = []
let player = {
  x: 100,
  y: groundHeight - 50,
  width: 50,
  height: 50,
  dy: 0,
  dx: 0,
  onGround: false,
  color: 'gold',
  speed: 5
}

const gravity = 0.7
const jumpPower = -15

let fadeAlpha = 0
let fading = false
let fadeFromBiome, fadeToBiome

const weatherParticles = []

let keys = {}

function lerpColor(a, b, t) {
  a = a.replace('#', '')
  b = b.replace('#', '')
  const ar = parseInt(a.substring(0, 2), 16)
  const ag = parseInt(a.substring(2, 4), 16)
  const ab = parseInt(a.substring(4, 6), 16)
  const br = parseInt(b.substring(0, 2), 16)
  const bg = parseInt(b.substring(2, 4), 16)
  const bb = parseInt(b.substring(4, 6), 16)

  const rr = Math.round(ar + (br - ar) * t)
  const rg = Math.round(ag + (bg - ag) * t)
  const rb = Math.round(ab + (bb - ab) * t)

  return `rgb(${rr},${rg},${rb})`
}

function hexToRgb(hex) {
  hex = hex.replace('#', '')
  let r = parseInt(hex.substring(0, 2), 16)
  let g = parseInt(hex.substring(2, 4), 16)
  let b = parseInt(hex.substring(4, 6), 16)
  return `${r},${g},${b}`
}

function getCurrentBiome() {
  let index = Math.floor(player.x / biomeDistance) % biomes.length
  if (index < 0) index += biomes.length
  return biomes[index]
}

function updateFade() {
  const currentBiomeIndex = Math.floor(player.x / biomeDistance)
  const biomePosInSegment = (player.x % biomeDistance) / biomeDistance

  if (biomePosInSegment > 0.8) {
    fading = true
    fadeAlpha = (biomePosInSegment - 0.8) / 0.2
    fadeFromBiome = biomes[currentBiomeIndex % biomes.length]
    fadeToBiome = biomes[(currentBiomeIndex + 1) % biomes.length]
  } else {
    fading = false
    fadeAlpha = 0
  }
}

function spawnWeatherParticle(biome) {
  switch (biome.name) {
    case 'Les':
      weatherParticles.push({
        x: cameraX + Math.random() * canvas.width,
        y: -10,
        dy: 1 + Math.random() * 1,
        dx: (Math.random() - 0.5) * 0.5,
        size: 3 + Math.random() * 3,
        color: 'rgba(50, 150, 50, 0.6)',
        type: 'leaf'
      })
      break
    case 'Poušť':
      weatherParticles.push({
        x: cameraX + Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dy: 0,
        dx: 1 + Math.random() * 2,
        size: 1 + Math.random() * 2,
        color: 'rgba(210,180,140,0.5)',
        type: 'sand'
      })
      break
    case 'Láva':
      weatherParticles.push({
        x: cameraX + Math.random() * canvas.width,
        y: canvas.height,
        dy: -2 - Math.random() * 2,
        dx: (Math.random() - 0.5) * 1,
        size: 2 + Math.random() * 3,
        color: 'rgba(255, 69, 0, 0.8)',
        type: 'spark'
      })
      break
    case 'Led':
      weatherParticles.push({
        x: cameraX + Math.random() * canvas.width,
        y: -10,
        dy: 1 + Math.random() * 2,
        dx: (Math.random() - 0.5) * 0.3,
        size: 3 + Math.random() * 3,
        color: 'rgba(230, 230, 255, 0.8)',
        type: 'snow'
      })
      break
    case 'Toxický':
      weatherParticles.push({
        x: cameraX + Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dy: 0,
        dx: 0.2 + Math.random() * 0.5,
        size: 5 + Math.random() * 5,
        color: 'rgba(57, 255, 20, 0.3)',
        type: 'bubble'
      })
      break
  }
}

function updateWeather() {
  const biome = getCurrentBiome()
  for (let i = 0; i < 3; i++) spawnWeatherParticle(biome)
  for (let i = weatherParticles.length - 1; i >= 0; i--) {
    const p = weatherParticles[i]
    p.x += p.dx
    p.y += p.dy
    if (
      p.y > canvas.height + 20 ||
      p.y < -20 ||
      p.x < cameraX - 50 ||
      p.x > cameraX + canvas.width + 50
    ) weatherParticles.splice(i, 1)
  }
}

function drawWeather() {
  ctx.save()
  ctx.translate(-cameraX, 0)
  for (let p of weatherParticles) {
    ctx.fillStyle = p.color
    switch (p.type) {
      case 'leaf':
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, p.size, p.size / 2, Math.sin(p.x), 0, 2 * Math.PI)
        ctx.fill()
        break
      case 'sand':
        ctx.fillRect(p.x, p.y, p.size, p.size / 2)
        break
      case 'spark':
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'snow':
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'bubble':
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
        break
    }
  }
  ctx.restore()
}

function drawFadeOverlay() {
  if (!fading) return
  ctx.save()
  ctx.globalAlpha = fadeAlpha
  const bgColor = lerpColor(fadeFromBiome.bg, fadeToBiome.bg, fadeAlpha)
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = `rgba(${hexToRgb(fadeToBiome.groundColor)}, ${fadeAlpha})`
  ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight)
  for (let p of platforms) {
    ctx.fillStyle = `rgba(${hexToRgb(fadeToBiome.platformColor)}, ${fadeAlpha})`
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height)
  }
  ctx.restore()
}

function createPlatforms() {
  platforms = []
  for (let i = 0; i < 100; i++) {
    let biomeIndex = Math.floor((i * 200) / biomeDistance) % biomes.length
    let biome = biomes[biomeIndex]
    platforms.push({
      x: i * 200,
      y: groundHeight - 20 - Math.sin(i / 3) * 30,
      width: 150,
      height: 20,
      biome: biome
    })
  }
}

function drawPlatforms() {
  const biome = getCurrentBiome()
  for (let p of platforms) {
    if (p.x + p.width < cameraX - 100 || p.x > cameraX + canvas.width + 100) continue
    ctx.fillStyle = p.biome.platformColor
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height)
  }
  ctx.fillStyle = biome.groundColor
  ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight)
}

function drawPlayer() {
  ctx.fillStyle = player.color
  ctx.fillRect(player.x - cameraX, player.y, player.width, player.height)
}

function updatePlayer() {
  // horizontal movement
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.dx = player.speed
  } else if (keys['ArrowLeft'] || keys['KeyA']) {
    player.dx = -player.speed
  } else {
    player.dx = 0
  }

  player.x += player.dx

  player.dy += gravity
  player.y += player.dy

  player.onGround = false
  for (let p of platforms) {
    if (
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      player.y + player.height >= p.y &&
      player.y + player.height <= p.y + p.height + Math.abs(player.dy)
    ) {
      player.y = p.y - player.height
      player.dy = 0
      player.onGround = true
    }
  }
  if (!player.onGround && player.y + player.height > groundHeight) {
    player.y = groundHeight - player.height
    player.dy = 0
    player.onGround = true
  }
  // prevent falling off left side
  if (player.x < 0) player.x = 0
}

function updateCamera() {
  cameraX = player.x - canvas.width / 4
  if (cameraX < 0) cameraX = 0
}

function draw() {
  const biome = getCurrentBiome()
  ctx.fillStyle = biome.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawPlatforms()
  drawPlayer()
}

function jump() {
  if (player.onGround) {
    player.dy = jumpPower
    player.onGround = false
  }
}

document.addEventListener('keydown', (e) => {
  if (!gameStarted) return
  keys[e.code] = true
  if (e.code === 'Space' || e.code === 'ArrowUp') jump()
})

document.addEventListener('keyup', (e) => {
  keys[e.code] = false
})

document.getElementById('startBtn').addEventListener('click', () => {
  if (!gameStarted) {
    gameStarted = true
    document.getElementById('menu').style.display = 'none'
    player.x = 100
    player.y = groundHeight - player.height
    player.dy = 0
    player.dx = 0
    createPlatforms()
    weatherParticles.length = 0
    requestAnimationFrame(update)
  }
})

function update() {
  if (!gameStarted) return
  updatePlayer()
  updateCamera()
  updateFade()
  updateWeather()
  draw()
  drawWeather()
  drawFadeOverlay()
  requestAnimationFrame(update)
}
