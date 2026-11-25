const canvas = document.getElementById("scene");
const loader = document.getElementById("loader");
const loaderStatus = document.querySelector(".loader-status");

const panel = document.getElementById("panel");
const panelTag = document.getElementById("panel-tag");
const panelTitle = document.getElementById("panel-title");
const panelText = document.getElementById("panel-text");
const panelLink = document.getElementById("panel-link");
document.getElementById("panel-close").addEventListener("click", () => panel.classList.remove("open"));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);
scene.fog = new THREE.Fog(0x111118, 60, 160);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 8, 14);

scene.add(new THREE.HemisphereLight(0x8888ff, 0x1a1a24, 0.7));

const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.far = 160;
scene.add(sun);
scene.add(sun.target);

const BOUND = 105;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0x15151d, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(240, 80, 0x2a2a3c, 0x1e1e2c);
grid.position.y = 0.02;
scene.add(grid);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3c, roughness: 0.6 });
[[0, -BOUND, 220, 2], [0, BOUND, 220, 2], [-BOUND, 0, 2, 220], [BOUND, 0, 2, 220]].forEach(([x, z, w, d]) => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat);
  wall.position.set(x, 1.5, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
});

const ACCENT = 0x7c5cff;
const ACCENT2 = 0x00e0c6;

const obstacles = [];

function addBlock(x, z, w, d, h, color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
  m.position.set(x, h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h });
  return m;
}

function addTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, 1.4, 7),
    new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 })
  );
  trunk.position.y = 0.7;
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x3ba874, roughness: 0.8 })
  );
  crown.position.y = 2.9;
  trunk.castShadow = crown.castShadow = true;
  g.add(trunk, crown);
  g.position.set(x, 0, z);
  scene.add(g);
  obstacles.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6, h: 3 });
}

function labelSprite(text, colorCss) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.font = "800 52px 'Unbounded', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.6)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = colorCss;
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(13, 3.25, 1);
  return sp;
}

const ramps = [];

function addRamp(x, z, length, width, h, axis, lowSign) {
  const slope = Math.atan2(h, length);
  const geo = new THREE.BoxGeometry(axis === "x" ? length : width, 0.6, axis === "x" ? width : length);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3d3d54, roughness: 0.7 }));
  const centerAlong = lowSign * (length / 2);
  if (axis === "x") {
    m.position.set(x + centerAlong, h / 2, z);
  } else {
    m.position.set(x, h / 2, z + centerAlong);
  }
  m.rotation[axis === "x" ? "z" : "x"] = -lowSign * slope * (axis === "x" ? 1 : 1);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);

  ramps.push({
    minX: axis === "x" ? x - length / 2 : x - width / 2,
    maxX: axis === "x" ? x + length / 2 : x + width / 2,
    minZ: axis === "x" ? z - width / 2 : z - length / 2,
    maxZ: axis === "x" ? z + width / 2 : z + length / 2,
    axis,
    xc: x,
    zc: z,
    length,
    h,
    lowSign
  });
}

function groundHeightAt(x, z) {
  let hmax = 0;
  for (const r of ramps) {
    if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
    let t;
    if (r.axis === "x") t = (r.lowSign > 0 ? x - r.xc : r.xc - x) / r.length + 0.5;
    else t = (r.lowSign > 0 ? z - r.zc : r.zc - z) / r.length + 0.5;
    hmax = Math.max(hmax, r.h * THREE.MathUtils.clamp(t, 0, 1));
  }
  return hmax;
}

const POIS = [
  {
    x: 0, z: -42, tag: "обо мне", title: "Привет, я Артём",
    text: "Креативный фронтенд-разработчик. Делаю интерфейсы, анимации и 3D-эксперименты в браузере. Этот мир — моя визитка: катайся и найди всё.",
    color: ACCENT, colorCss: "#a892ff"
  },
  {
    x: 40, z: -20, tag: "проект", title: "Nebula",
    text: "Иммерсивный лендинг для стартапа: WebGL-сцена, шейдерные переходы, 60 fps даже на средних телефонах.",
    color: ACCENT2, colorCss: "#5cffea", link: "https://github.com", linkText: "Открыть проект →"
  },
  {
    x: -40, z: -20, tag: "проект", title: "Pulse",
    text: "Аналитический дашборд в реальном времени: websocket-потоки, графики на D3, тёмная тема.",
    color: 0xff5c9f, colorCss: "#ff9ec4", link: "https://github.com", linkText: "Открыть проект →"
  },
  {
    x: -40, z: 28, tag: "проект", title: "Orbit",
    text: "Сайт дизайн-студии со скролл-анимациями и параллаксом. Awwwards Honorable Mention.",
    color: 0xffc85c, colorCss: "#ffdf9e", link: "https://github.com", linkText: "Открыть проект →"
  },
  {
    x: 0, z: 46, tag: "контакт", title: "Напиши мне",
    text: "Есть идея? Пришли письмо — отвечаю в течение дня.",
    color: ACCENT2, colorCss: "#5cffea", link: "mailto:hi@vetrov.dev", linkText: "hi@vetrov.dev →"
  }
];

const poiMeshes = [];
for (const p of POIS) {
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(4.6, 4.6, 0.12, 40),
    new THREE.MeshStandardMaterial({ color: 0x1d1d2b, roughness: 0.4 })
  );
  disc.position.set(p.x, 0.06, p.z);
  disc.receiveShadow = true;
  scene.add(disc);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.6, 0.14, 12, 60),
    new THREE.MeshBasicMaterial({ color: p.color })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(p.x, 0.15, p.z);
  scene.add(ring);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.4, 7, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
  );
  beam.position.set(p.x, 3.5, p.z);
  scene.add(beam);

  const label = labelSprite(p.title.toUpperCase(), p.colorCss);
  label.position.set(p.x, 6.4, p.z);
  scene.add(label);

  poiMeshes.push({ data: p, ring, beam, label });
}

addBlock(-14, 6, 8, 3, 2.2, 0x2e2e42);
addBlock(16, -6, 3, 8, 2.2, 0x2e2e42);
addBlock(6, 20, 10, 2.4, 1.6, 0x34344a);
addBlock(-22, -10, 2.4, 10, 1.6, 0x34344a);
addBlock(26, 34, 6, 6, 3.5, 0x2e2e42);
addBlock(-30, 44, 6, 6, 3.5, 0x2e2e42);

for (let i = 0; i < 26; i++) {
  let x, z, ok = false;
  while (!ok) {
    x = (Math.random() - 0.5) * 180;
    z = (Math.random() - 0.5) * 180;
    ok = Math.hypot(x, z) > 14 && POIS.every((p) => Math.hypot(x - p.x, z - p.z) > 9);
  }
  addTree(x, z);
}

addRamp(20, 8, 10, 6, 2.2, "x", -1);
addRamp(-20, 36, 10, 6, 2.2, "z", 1);
addRamp(0, -16, 12, 7, 3, "z", -1);

const car = new THREE.Group();

const bodyMat = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.35, metalness: 0.15 });
const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 3.4), bodyMat);
body.position.y = 0.75;
body.castShadow = true;
car.add(body);

const cabinMat = new THREE.MeshStandardMaterial({ color: 0x15151d, roughness: 0.2, metalness: 0.4 });
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.7), cabinMat);
cabin.position.set(0, 1.35, -0.2);
cabin.castShadow = true;
car.add(cabin);

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 18);
wheelGeo.rotateZ(Math.PI / 2);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.9 });
const wheels = [];
[[-0.95, 1.15], [0.95, 1.15], [-0.95, -1.15], [0.95, -1.15]].forEach(([wx, wz], i) => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.position.set(wx, 0.42, wz);
  w.castShadow = true;
  car.add(w);
  wheels.push({ mesh: w, front: i < 2 });
});

const neon = new THREE.Mesh(
  new THREE.PlaneGeometry(1.9, 0.34),
  new THREE.MeshBasicMaterial({ color: ACCENT2, transparent: true, opacity: 0.85 })
);
neon.rotation.x = -Math.PI / 2.4;
neon.position.set(0, 0.34, -1.72);
car.add(neon);

scene.add(car);

const state = {
  pos: new THREE.Vector3(0, 0, 14),
  heading: Math.PI,
  speed: 0,
  vy: 0,
  airborne: false,
  steerVis: 0
};

const keys = { forward: false, back: false, left: false, right: false, horn: false };

const KEYMAP = {
  KeyW: "forward", ArrowUp: "forward",
  KeyS: "back", ArrowDown: "back",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
  ControlLeft: "horn", ControlRight: "horn"
};

window.addEventListener("keydown", (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  if (k === "horn") {
    if (!keys.horn) horn();
    keys.horn = true;
  } else keys[k] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
});

window.addEventListener("keyup", (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  keys[k] = false;
});

let audioCtx = null;
function horn() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "square";
    o.frequency.value = 420;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.32);
  } catch {}
}

document.querySelectorAll(".touch button").forEach((btn) => {
  const k = btn.dataset.k;
  const on = (e) => { e.preventDefault(); keys[k] = true; };
  const off = (e) => { e.preventDefault(); keys[k] = false; };
  btn.addEventListener("pointerdown", on);
  btn.addEventListener("pointerup", off);
  btn.addEventListener("pointerleave", off);
  btn.addEventListener("pointercancel", off);
});

let activePoi = null;

function updatePanel(p) {
  if (activePoi === p) return;
  activePoi = p;
  if (!p) {
    panel.classList.remove("open");
    return;
  }
  panelTag.textContent = p.data.tag;
  panelTitle.textContent = p.data.title;
  panelText.textContent = p.data.text;
  if (p.data.link) {
    panelLink.href = p.data.link;
    panelLink.textContent = p.data.linkText;
    panelLink.classList.add("show");
  } else {
    panelLink.classList.remove("show");
  }
  panel.classList.add("open");
}

const camGoal = new THREE.Vector3();
let wheelSpin = 0;

const clock = new THREE.Clock();

function step() {
  const dt = Math.min(clock.getDelta(), 0.05);

  const dirX = Math.sin(state.heading);
  const dirZ = Math.cos(state.heading);

  const accel = 26;
  const maxFwd = 24;
  const maxRev = 9;

  if (keys.forward) state.speed += accel * dt;
  if (keys.back) state.speed -= accel * 0.7 * dt;
  if (!keys.forward && !keys.back) state.speed *= Math.exp(-1.6 * dt);
  state.speed = THREE.MathUtils.clamp(state.speed, -maxRev, maxFwd);
  state.speed *= Math.exp(-0.12 * dt);

  const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  state.steerVis += (steerInput - state.steerVis) * Math.min(1, 10 * dt);
  const grip = Math.min(1, Math.abs(state.speed) / 7);
  state.heading += state.steerVis * 2.4 * grip * dt * Math.sign(state.speed || 1);

  state.pos.x += dirX * state.speed * dt;
  state.pos.z += dirZ * state.speed * dt;

  const R = 1.35;
  for (const o of obstacles) {
    if (
      state.pos.x > o.minX - R && state.pos.x < o.maxX + R &&
      state.pos.z > o.minZ - R && state.pos.z < o.maxZ + R &&
      state.pos.y < o.h - 0.3
    ) {
      const pushL = state.pos.x - (o.minX - R);
      const pushR = o.maxX + R - state.pos.x;
      const pushB = state.pos.z - (o.minZ - R);
      const pushT = o.maxZ + R - state.pos.z;
      const m = Math.min(pushL, pushR, pushB, pushT);
      if (m === pushL) state.pos.x = o.minX - R;
      else if (m === pushR) state.pos.x = o.maxX + R;
      else if (m === pushB) state.pos.z = o.minZ - R;
      else state.pos.z = o.maxZ + R;
      state.speed *= -0.25;
    }
  }

  if (state.pos.x < -BOUND + 2) { state.pos.x = -BOUND + 2; state.speed *= -0.25; }
  if (state.pos.x > BOUND - 2) { state.pos.x = BOUND - 2; state.speed *= -0.25; }
  if (state.pos.z < -BOUND + 2) { state.pos.z = -BOUND + 2; state.speed *= -0.25; }
  if (state.pos.z > BOUND - 2) { state.pos.z = BOUND - 2; state.speed *= -0.25; }

  const gh = groundHeightAt(state.pos.x, state.pos.z);
  if (state.airborne) {
    state.vy -= 30 * dt;
    state.pos.y += state.vy * dt;
    if (state.pos.y <= gh) {
      state.pos.y = gh;
      state.vy = 0;
      state.airborne = false;
    }
  } else if (gh < state.pos.y - 0.05) {
    state.airborne = true;
    state.vy = 0;
  } else {
    state.pos.y += (gh - state.pos.y) * Math.min(1, 14 * dt);
  }

  car.position.copy(state.pos);
  car.rotation.set(0, state.heading, 0);

  wheels.forEach((w) => {
    wheelSpin += (state.speed * dt) / 0.42;
    w.mesh.rotation.x = wheelSpin;
    if (w.front) w.mesh.rotation.y = state.steerVis * 0.45;
  });

  const hF = groundHeightAt(state.pos.x + dirX, state.pos.z + dirZ);
  const hB = groundHeightAt(state.pos.x - dirX, state.pos.z - dirZ);
  if (!state.airborne) car.rotation.x = Math.atan2(hB - hF, 2);

  let near = null;
  poiMeshes.forEach((p) => {
    const t = clock.elapsedTime;
    p.ring.rotation.z = t * 0.6;
    p.label.position.y = 6.4 + Math.sin(t * 1.4 + p.data.x) * 0.25;
    const d = Math.hypot(state.pos.x - p.data.x, state.pos.z - p.data.z);
    p.beam.material.opacity = d < 5.5 && !state.airborne ? 0.3 : 0.14;
    if (d < 5.5 && !state.airborne) near = p;
  });
  updatePanel(near);

  camGoal.set(
    state.pos.x - dirX * 11,
    Math.max(state.pos.y + 6.2, 4),
    state.pos.z - dirZ * 11
  );
  camera.position.lerp(camGoal, 1 - Math.exp(-4.5 * dt));
  camera.lookAt(state.pos.x, state.pos.y + 1.2, state.pos.z);

  sun.position.set(state.pos.x + 26, 40, state.pos.z + 18);
  sun.target.position.copy(state.pos);

  renderer.render(scene, camera);
  requestAnimationFrame(step);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loader.classList.add("done");
window.__sceneLoaded = true;
requestAnimationFrame(step);
