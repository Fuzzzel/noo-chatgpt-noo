const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

let enemies = []
let enemyProjectiles = []

let weaponPowerUpActive = false
let weaponPowerUpTimer = 0
let score = 0
let lastPlatformIndex = -1
let playerProjectiles = []


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
  },
  {
    name: 'Nebeský',
    bg: '#cceeff',
    platformColor: '#99ccff',
    groundColor: '#6699cc',
    floorType: 'sky'
  },
  {
    name: 'Temný hvozd',
    bg: '#1a1a1a',
    platformColor: '#2d2d2d',
    groundColor: '#141414',
    floorType: 'darkforest'
  },
  {
    name: 'Měsíční krajina',
    bg: '#ccddee',
    platformColor: '#9999aa',
    groundColor: '#666677',
    floorType: 'moon'
  },
  {
    name: 'Kyberpunk',
    bg: '#1f0033',
    platformColor: '#cc00ff',
    groundColor: '#330066',
    floorType: 'cyber'
  },
  {
    name: 'Podvodní',
    bg: '#004466',
    platformColor: '#007788',
    groundColor: '#002233',
    floorType: 'ocean'
  }
]

const biomeDistance = 4500
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

  const fadeStart = 1  // kde začíná fade
  const fadeEnd = 5    // kde končí fade
  const fadeRange = fadeEnd - fadeStart

  if (biomePosInSegment > fadeStart) {
    fading = true
    fadeAlpha = (biomePosInSegment - fadeStart) / fadeRange
    fadeFromBiome = biomes[currentBiomeIndex % biomes.length]
    fadeToBiome = biomes[(currentBiomeIndex + 1) % biomes.length]
  } else {
    fading = false
    fadeAlpha = 0
  }
}

function activateWeaponPowerUp() {
  weaponPowerUpActive = true
  weaponPowerUpTimer = 15 * 60 // 15 sekund při 60 fps
}

function updatePlayerProjectiles() {
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    let proj = playerProjectiles[i]
    proj.x += proj.dx
    proj.y += proj.dy

    if (
      proj.x < cameraX - 50 ||
      proj.x > cameraX + canvas.width + 50 ||
      proj.y < -50 ||
      proj.y > canvas.height + 50
    ) {
      playerProjectiles.splice(i, 1)
      continue
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      let e = enemies[j]
      if (
        proj.x < e.x + e.width &&
        proj.x + proj.width > e.x &&
        proj.y < e.y + e.height &&
        proj.y + proj.height > e.y
      ) {
        enemies.splice(j, 1)
        playerProjectiles.splice(i, 1)
        score += 10
        break
      }
    }
  }
}   

function shootPlayerProjectile() {
  if (!weaponPowerUpActive) return
  let speed = 10
  playerProjectiles.push({
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    dx: speed,
    dy: 0,
    width: 10,
    height: 5
  })
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    weaponPowerUpActive = true
    weaponPowerUpTimer = 900 // 15 sekund při 60 FPS
  }

  if (e.code === 'KeyJ' && weaponPowerUpActive) {
    shootAtNearestEnemy()
  }
})



function updateScore() {
  let platformIndex = Math.floor(player.x / 250) // platforma každých 250 px
  if (platformIndex > lastPlatformIndex) {
    score += (platformIndex - lastPlatformIndex)
    lastPlatformIndex = platformIndex
  }
}

function createEnemies() {
  enemies = []
  for (let biomeIndex = 0; biomeIndex < biomes.length; biomeIndex++) {
    let biome = biomes[biomeIndex]
    for (let i = 0; i < 4; i++) {
      let x = biomeIndex * biomeDistance + 100 + Math.random() * (biomeDistance - 200)
      let y = groundHeight - 40

      enemies.push({
        x: x,
        y: y,
        width: 40,
        height: 40,
        speed: 1 + Math.random(),
        direction: 1,
        shootCooldown: Math.floor(Math.random() * 180), // náhodný cooldown na startu
        biome: biome
      })
    }
  }
}

function updateEnemies() {
  for (let enemy of enemies) {
    enemy.x += enemy.speed * enemy.direction
    let biomeStart = Math.floor(enemy.x / biomeDistance) * biomeDistance
    if (enemy.x < biomeStart + 50) enemy.direction = 1
    if (enemy.x > biomeStart + biomeDistance - 50) enemy.direction = -1

    enemy.shootCooldown -= 1
    if (enemy.shootCooldown <= 0) {
      enemy.shootCooldown = 120 + Math.random() * 120

      let diffX = player.x - (enemy.x + enemy.width / 2)
      let diffY = player.y - (enemy.y + enemy.height / 2)
      let dist = Math.sqrt(diffX * diffX + diffY * diffY)
      let speed = 6
      let projDx = (diffX / dist) * speed
      let projDy = (diffY / dist) * speed

      let projectileType
      switch (enemy.biome.name) {
        case 'Les': projectileType = 'stick'; break
        case 'Láva': projectileType = 'fireball'; break
        case 'Poušť': projectileType = 'sandblast'; break
        case 'Led': projectileType = 'iceShard'; break
        default: projectileType = 'generic'
      }

      enemyProjectiles.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        dx: projDx,
        dy: projDy,
        width: 15,
        height: 15,
        type: projectileType
      })
    }
  }
}

function updateEnemyProjectiles() {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    let p = enemyProjectiles[i]
    p.x += p.dx
    p.y += p.dy

    if (p.x < cameraX - 50 || p.x > cameraX + canvas.width + 50) {
      enemyProjectiles.splice(i, 1)
      continue
    }

    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      gameStarted = false
      alert('Prohrál jsi! Zkus to znovu.')
      document.getElementById('menu').style.display = 'block'
      return
    }
  }
}

function drawEnemies() {
  ctx.save()
  ctx.translate(-cameraX, 0)
  for (let enemy of enemies) {
    ctx.fillStyle = enemy.biome.platformColor
    ctx.beginPath()
    ctx.moveTo(enemy.x + enemy.width / 2, enemy.y) // vrchol
    ctx.lineTo(enemy.x, enemy.y + enemy.height)   // levý spodní
    ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height) // pravý spodní
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawEnemyProjectiles() {
  ctx.save()
  ctx.translate(-cameraX, 0)
  for (let p of enemyProjectiles) {
    switch (p.type) {
      case 'stick':
        ctx.fillStyle = 'saddlebrown'
        ctx.fillRect(p.x, p.y, p.width, p.height)
        break
      case 'fireball':
        ctx.fillStyle = 'orangered'
        ctx.beginPath()
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'sandblast':
        ctx.fillStyle = 'khaki'
        ctx.fillRect(p.x, p.y, p.width, p.height)
        break
      case 'iceShard':
        ctx.fillStyle = 'lightblue'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y + p.height)
        ctx.lineTo(p.x + p.width / 2, p.y)
        ctx.lineTo(p.x + p.width, p.y + p.height)
        ctx.closePath()
        ctx.fill()
        break
      default:
        ctx.fillStyle = 'gray'
        ctx.fillRect(p.x, p.y, p.width, p.height)
    }
  }
  ctx.restore()
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
  let lastX = 100
  let lastY = groundHeight - 150

  const maxJumpTime = Math.abs((2 * jumpPower) / gravity) // doba ve vzduchu
  const maxJumpDistance = player.speed * maxJumpTime * 0.8 // fakticky dosažitelná vzdálenost

  platforms.push({
    x: lastX,
    y: lastY,
    width: 150,
    height: 20,
    biome: biomes[0]
  })

  for (let i = 1; i < 100; i++) {
    let biomeIndex = Math.floor(lastX / biomeDistance) % biomes.length
    let biome = biomes[biomeIndex]

    // šířka platformy: krátké 50-80, normální 100-140
    let width = Math.random() < 0.4
      ? 70 + Math.random() * 30
      : 120 + Math.random() * 40

    let minGap = 70
    let maxGap = maxJumpDistance - width - 10
    if (maxGap < minGap) maxGap = minGap + 10

    let gap = minGap + Math.random() * (maxGap - minGap)

    let x = lastX + platforms[platforms.length - 1].width + gap

    let yChange = (Math.random() - 0.5) * 70 // menší změny výšky
    let y = Math.max(groundHeight - 280, Math.min(groundHeight - 70, lastY + yChange))

    // občas přeskočíme platformu s větší mezerou, ale max maxJumpDistance
    if (Math.random() < 0.05) {
      let extraGap = 20 + Math.random() * 40
      x += extraGap
    }

    platforms.push({
      x: x,
      y: y,
      width: width,
      height: 20,
      biome: biome
    })

    lastX = x
    lastY = y
  }

  player.x = platforms[0].x + 10
  player.y = platforms[0].y - player.height
  player.dy = 0
}


function die() {
  alert('Padl jsi na zem! Restart hry.')
  gameStarted = false
  document.getElementById('menu').style.display = 'block'
}

function drawPlatforms() {
  for (let p of platforms) {
    if (p.x + p.width < cameraX - 100 || p.x > cameraX + canvas.width + 100) continue

    let color = p.biome.platformColor
    if (fading) {
      let t = Math.min(Math.max((player.x - p.x + 100) / 300, 0), 1)
      color = lerpColor(p.biome.platformColor, fadeToBiome.platformColor, fadeAlpha * t)
    }

    ctx.fillStyle = color
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height)
  }

  const biome = getCurrentBiome()
  let groundColor = fading
    ? lerpColor(fadeFromBiome.groundColor, fadeToBiome.groundColor, fadeAlpha)
    : biome.groundColor

  ctx.fillStyle = groundColor
  ctx.fillRect(0, groundHeight, canvas.width, canvas.height - groundHeight)

  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
  ctx.fillRect(0, groundHeight + 1, canvas.width, canvas.height - groundHeight) // smrtící část podlahy zvýrazněná červeně
}

function drawPlayer() {
  ctx.fillStyle = player.color
  ctx.fillRect(player.x - cameraX, player.y, player.width, player.height)
}

function updatePlayer() {
  if (keys['ArrowRight'] || keys['KeyD']) player.dx = player.speed
  else if (keys['ArrowLeft'] || keys['KeyA']) player.dx = -player.speed
  else player.dx = 0

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
    die()
  }

  if (player.x < 0) player.x = 0
}

function updateCamera() {
  cameraX = player.x - canvas.width / 4
  if (cameraX < 0) cameraX = 0
}

function draw() {
  updateFade()

  let bgColor = fading
    ? lerpColor(fadeFromBiome.bg, fadeToBiome.bg, fadeAlpha)
    : getCurrentBiome().bg
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawPlatforms()
  drawPlayer()
  drawEnemies()
  drawEnemyProjectiles()
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
    createEnemies()
    weatherParticles.length = 0
    requestAnimationFrame(update)
  }
})

function shootAtNearestEnemy() {
  if (enemies.length === 0) return

  const px = player.x + player.width / 2
  const py = player.y + player.height / 2

  let nearest = null
  let minDist = Infinity

  for (let e of enemies) {
    const ex = e.x + e.size / 2
    const ey = e.y + e.size / 2
    const dx = ex - px
    const dy = ey - py
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < minDist) {
      minDist = dist
      nearest = { x: ex, y: ey }
    }
  }

  if (!nearest) return

  const angle = Math.atan2(nearest.y - py, nearest.x - px)
  const speed = 10

  playerProjectiles.push({
    x: px,
    y: py,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    width: 8,
    height: 4
  })
}

function updatePlayerProjectiles() {
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    const proj = playerProjectiles[i]
    proj.x += proj.dx
    proj.y += proj.dy

    if (
      proj.x < cameraX - 50 ||
      proj.x > cameraX + canvas.width + 50 ||
      proj.y < 0 ||
      proj.y > canvas.height
    ) {
      playerProjectiles.splice(i, 1)
      continue
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j]
      if (
        proj.x < e.x + e.size &&
        proj.x + proj.width > e.x &&
        proj.y < e.y + e.size &&
        proj.y + proj.height > e.y
      ) {
        enemies.splice(j, 1)
        playerProjectiles.splice(i, 1)
        score += 10
        break
      }
    }
  }
}

function drawPlayerProjectiles() {
  ctx.fillStyle = 'yellow'
  for (let p of playerProjectiles) {
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height)
  }
}


function update() {
  if (!gameStarted) return
  updateEnemies()
  updateEnemyProjectiles()
  updatePlayer()
  updateCamera()
  updateFade()
  updateWeather()
  draw()
  drawWeather()
  drawFadeOverlay()
  requestAnimationFrame(update)
  updatePlayerProjectiles()
  drawPlayerProjectiles()


  if (weaponPowerUpActive) {
    weaponPowerUpTimer--
    if (weaponPowerUpTimer <= 0) {
      weaponPowerUpActive = false
    }
  }
  
}
