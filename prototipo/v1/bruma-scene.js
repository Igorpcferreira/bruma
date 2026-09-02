// Cena 3D da BRUMA (peça conceitual da Kyber Tech, estudo digital 2026).
// Um frasco de gin em vidro com transmissão física, líquido, bolhas e botânicos que
// orbitam. Tudo é dirigido pelo objeto `pose` que a página envia a cada quadro.
import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const out = (t) => 1 - Math.pow(1 - t, 3);
const TAU = Math.PI * 2;

const CORES = {
  fundo: 0x0E0F11,
  cobre: 0xB86B3A,
  liquido: { violeta: 0x5B60C8, rose: 0xCF6E90, ambar: 0xC27A2E },
};

// Gerador determinístico: a composição dos botânicos é sempre a mesma.
let semente = 7;
const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };

function rOmbro(y) {
  const p = clamp((y - 0.5) / 0.7, 0, 1);
  return 0.21 + 0.41 * (0.5 + 0.5 * Math.cos(Math.PI * p));
}
function perfilGarrafa() {
  const P = [];
  const add = (r, y) => P.push(new THREE.Vector2(r, y));
  add(0, -1.5); add(0.5, -1.5); add(0.585, -1.47); add(0.62, -1.39); add(0.62, 0.5);
  for (let k = 1; k <= 14; k++) { const y = 0.5 + 0.7 * k / 14; add(rOmbro(y), y); }
  add(0.21, 1.6); add(0.25, 1.62); add(0.25, 1.78); add(0.19, 1.78); add(0.16, 1.7);
  return P;
}
function perfilLiquido() {
  const P = [], k = 0.93, nivel = 0.72;
  const add = (r, y) => P.push(new THREE.Vector2(r, y));
  add(0, -1.43); add(0.47, -1.43); add(0.55, -1.4); add(0.62 * k, -1.33); add(0.62 * k, 0.5);
  for (let i = 1; i <= 14; i++) { const y = 0.5 + 0.7 * i / 14; if (y >= nivel) break; add(rOmbro(y) * k, y); }
  add(rOmbro(nivel) * k, nivel); add(0, nivel);
  return P;
}

function quandoFonte(cb) {
  cb();
  try { if (document.fonts && document.fonts.load) document.fonts.load('400 160px Italiana').then(cb).catch(() => {}); } catch (e) {}
}

function texturaRotulo(variante) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 448;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  quandoFonte(() => {
    g.fillStyle = '#ECE7DC'; g.fillRect(0, 0, 1024, 448);
    g.strokeStyle = '#B86B3A'; g.lineWidth = 4; g.strokeRect(36, 36, 952, 376);
    g.lineWidth = 1.5; g.strokeRect(52, 52, 920, 344);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#15161A'; g.font = '400 168px Italiana, Georgia, serif';
    if ('letterSpacing' in g) g.letterSpacing = '22px';
    g.fillText('BRUMA', 523, 186);
    g.font = '500 30px "JetBrains Mono", monospace'; if ('letterSpacing' in g) g.letterSpacing = '10px';
    g.fillStyle = '#6B5646'; g.fillText('GIN DO CERRADO', 517, 298);
    g.fillStyle = '#B86B3A'; g.fillRect(432, 330, 160, 2);
    g.font = '400 26px "JetBrains Mono", monospace'; g.fillStyle = '#15161A'; g.fillText(variante, 517, 372);
    t.needsUpdate = true;
  });
  return t;
}
function texturaTitulo() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  quandoFonte(() => {
    g.clearRect(0, 0, 2048, 512);
    g.fillStyle = '#D9D9E3'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 400px Italiana, Georgia, serif'; if ('letterSpacing' in g) g.letterSpacing = '60px';
    g.fillText('BRUMA', 1054, 268);
    t.needsUpdate = true;
  });
  return t;
}
function texturaFundo() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#0E0F11'; g.fillRect(0, 0, 512, 512);
  let gr = g.createRadialGradient(256, 256, 0, 256, 256, 190);
  gr.addColorStop(0, 'rgba(96,102,178,0.62)'); gr.addColorStop(0.5, 'rgba(96,102,178,0.2)'); gr.addColorStop(1, 'rgba(96,102,178,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  gr = g.createRadialGradient(340, 340, 0, 340, 340, 120);
  gr.addColorStop(0, 'rgba(184,107,58,0.28)'); gr.addColorStop(1, 'rgba(184,107,58,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texturaBrilho() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
function texturaNevoa() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 512, y = rnd() * 256, r = 30 + rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,' + (0.05 + rnd() * 0.1).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// Caixa de luz para os reflexos do vidro: substitui o RoomEnvironment dos exemplos,
// que precisa de import map. Quatro painéis emissivos bastam para um frasco.
function ambiente(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: 0x0a0a0d, side: THREE.BackSide })));
  const painel = (w, h, cor, forca, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  painel(2.5, 6, 0xFFE9D2, 7, 4.5, 3.5, 2.5);
  painel(6, 1.6, 0xB8C0FF, 3.5, -5, 2, 1.5);
  painel(0.6, 8, 0xFFFFFF, 14, 2, 0.5, -6);
  painel(8, 0.8, 0xD08A5A, 2.2, 0, -5.5, 1);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture; pm.dispose();
  return tex;
}

function geoFolha() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.24); s.bezierCurveTo(0.15, -0.12, 0.15, 0.12, 0, 0.24); s.bezierCurveTo(-0.15, 0.12, -0.15, -0.12, 0, -0.24);
  return new THREE.ShapeGeometry(s, 10);
}
function geoFlor() {
  const s = new THREE.Shape();
  for (let i = 0; i <= 72; i++) {
    const a = i / 72 * TAU, r = 0.055 + 0.05 * Math.cos(5 * a);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  return new THREE.ShapeGeometry(s, 6);
}
class Helice extends THREE.Curve {
  getPoint(t, o = new THREE.Vector3()) { const a = t * TAU * 2.6; return o.set(Math.cos(a) * 0.13, (t - 0.5) * 0.55, Math.sin(a) * 0.13); }
}

function criarBotanicos(low) {
  const grupo = new THREE.Group();
  const std = (cor, rug, dupla) => new THREE.MeshStandardMaterial({ color: cor, roughness: rug, metalness: 0, side: dupla ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: 0.6 });
  const tipos = [
    { n: low ? 8 : 13, geo: new THREE.SphereGeometry(0.075, 18, 12), mat: std(0x4C5290, 0.5), esc: [0.75, 1.25] },
    { n: low ? 1 : 2, geo: new THREE.SphereGeometry(0.13, 20, 14), mat: std(0xD59A2F, 0.85), esc: [0.9, 1.1] },
    { n: low ? 3 : 5, geo: new THREE.SphereGeometry(0.055, 12, 8).scale(1, 1.7, 0.8), mat: std(0x6B4324, 0.8), esc: [0.9, 1.2] },
    { n: low ? 3 : 6, geo: new THREE.PlaneGeometry(0.035, 0.62), mat: std(0x9DBB6A, 0.7, true), esc: [0.8, 1.2] },
    { n: low ? 2 : 3, geo: new THREE.TubeGeometry(new Helice(), 60, 0.03, 7, false), mat: std(0xE07A2E, 0.5), esc: [0.9, 1.1] },
    { n: low ? 3 : 5, geo: geoFlor(), mat: std(0x5E6BD6, 0.6, true), esc: [0.9, 1.3] },
    { n: low ? 3 : 6, geo: geoFolha(), mat: std(0x2F6B45, 0.6, true), esc: [0.8, 1.2] },
  ];
  const itens = [];
  for (const t of tipos) {
    const im = new THREE.InstancedMesh(t.geo, t.mat, t.n);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < t.n; i++) {
      itens.push({ im, i, r: 1.15 + rnd() * 0.95, h: -1.25 + rnd() * 2.6, ph: rnd() * TAU, sp: (0.12 + rnd() * 0.2) * (rnd() < 0.5 ? 1 : -1), rx: rnd() * 1.2, ry: rnd() * 1.2, rz: rnd() * 1.2, esc: lerp(t.esc[0], t.esc[1], rnd()), bob: rnd() * TAU });
    }
    grupo.add(im);
  }
  return { grupo, itens, tipos };
}

function criarBolhas(n) {
  const geo = new THREE.SphereGeometry(0.016, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xF2F0FF, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false });
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.renderOrder = 3;
  const b = [];
  for (let i = 0; i < n; i++) {
    const ang = rnd() * TAU, rr = Math.sqrt(rnd()) * 0.5;
    b.push({ x: Math.cos(ang) * rr, z: Math.sin(ang) * rr, y: -1.38 + rnd() * 2.05, v: 0.15 + rnd() * 0.22, s: 0.5 + rnd() * 0.9, w: rnd() * TAU });
  }
  return { im, b, geo, mat };
}

export function createScene(opts) {
  const canvas = opts.canvas;
  const low = !!opts.low;
  const reduced = !!opts.reduced;
  let velocidade = opts.speed || 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = low ? 0.5 : 0.8;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CORES.fundo);
  scene.environment = ambiente(renderer);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
  camera.position.set(0, 0, 6.2);

  scene.add(new THREE.AmbientLight(0x8890c0, 0.35));
  const chave = new THREE.DirectionalLight(0xffe2c4, 2.2); chave.position.set(3, 4, 3); scene.add(chave);
  const frio = new THREE.DirectionalLight(0x9aa2ff, 0.9); frio.position.set(-4, 1, 2); scene.add(frio);
  const cobreLuz = new THREE.PointLight(CORES.cobre, 6, 14, 2); cobreLuz.position.set(1.5, -1.8, 2); scene.add(cobreLuz);
  // Contraluz violeta: é ela que acende o líquido por trás do vidro.
  const contraluz = new THREE.PointLight(0x8A8FE8, 22, 16, 2); contraluz.position.set(-0.6, 0.6, -2.2); scene.add(contraluz);

  // Fundo dentro da cena, com o brilho já pintado: só objetos OPACOS entram no passe de
  // transmissão do three.js, então é este plano que o vidro refrata onde não há mais nada.
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: texturaFundo() }));
  fundo.position.z = -14; scene.add(fundo);

  const texBrilho = texturaBrilho();
  const brilho = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: texBrilho, color: 0x5A5FAE, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  brilho.position.z = -2.6; scene.add(brilho);
  const brilho2 = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({ map: texBrilho, color: 0x9C5A2C, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  brilho2.position.set(1.4, -1.4, -2.2); scene.add(brilho2);

  const nevoas = [];
  for (let i = 0; i < (low ? 2 : 3); i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5), new THREE.MeshBasicMaterial({ map: texturaNevoa(), color: 0xAAB0E0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, -0.4 + i * 0.5, -2.3 + i * 0.6); scene.add(m); nevoas.push(m);
  }

  const nPart = low ? 140 : 380;
  const pos = new Float32Array(nPart * 3);
  for (let i = 0; i < nPart; i++) { pos[i * 3] = (rnd() - 0.5) * 12; pos[i * 3 + 1] = (rnd() - 0.5) * 8; pos[i * 3 + 2] = -3 + rnd() * 4; }
  const geoPart = new THREE.BufferGeometry(); geoPart.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particulas = new THREE.Points(geoPart, new THREE.PointsMaterial({ size: 0.022, color: 0xC9CCE8, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
  scene.add(particulas);

  // Título opaco com recorte por alphaTest: assim ele entra no passe de transmissão e o
  // vidro refrata as letras. O fade é feito pela cor, indo até a cor do fundo.
  const corTitulo = new THREE.Color(0xD9D9E3), corFundo = new THREE.Color(CORES.fundo);
  const titulo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texturaTitulo(), alphaTest: 0.5, color: 0xD9D9E3 }));
  titulo.position.set(0, 0, -1.3); scene.add(titulo);

  // Frasco
  const geoVidro = new THREE.LatheGeometry(perfilGarrafa(), 96);
  const geoLiquido = new THREE.LatheGeometry(perfilLiquido(), 72); geoLiquido.translate(0, 1.43, 0);
  const geoRotulo = new THREE.CylinderGeometry(0.628, 0.628, 0.55, 48, 1, true, -1.0, 2.0);
  const geoRolha = new THREE.CylinderGeometry(0.17, 0.19, 0.5, 32);
  const geoTampa = new THREE.CylinderGeometry(0.27, 0.27, 0.1, 48);
  const geoColar = new THREE.TorusGeometry(0.235, 0.02, 12, 48);
  const matVidro = new THREE.MeshPhysicalMaterial({
    color: 0xF4F6FF, metalness: 0, roughness: 0.04, transmission: low ? 0 : 1, thickness: 0.32, ior: 1.5,
    attenuationColor: new THREE.Color(0xD8DBFF), attenuationDistance: 9, specularIntensity: 1, envMapIntensity: 1.3,
    clearcoat: 0.25, clearcoatRoughness: 0.08, transparent: true, opacity: low ? 0.3 : 1, depthWrite: !low,
  });
  const matRolha = new THREE.MeshStandardMaterial({ color: 0x1e1c1c, roughness: 0.75, metalness: 0, transparent: true });
  const matCobre = new THREE.MeshStandardMaterial({ color: CORES.cobre, roughness: 0.28, metalness: 1, envMapIntensity: 1.4, transparent: true });
  const ctx = { geoVidro, geoLiquido, geoRotulo, geoRolha, geoTampa, geoColar, matVidro, matRolha, matCobre, low };

  function criarGarrafa(cor, rotulo) {
    const g = new THREE.Group();
    g.rotation.order = 'ZYX'; // gira em torno do próprio eixo e SÓ DEPOIS inclina
    const vidro = new THREE.Mesh(ctx.geoVidro, ctx.matVidro); vidro.renderOrder = 2; g.add(vidro);
    // Líquido OPACO de propósito: material transparente não entra no passe de transmissão
    // e sumiria dentro do vidro. As bolhas ignoram profundidade e são desenhadas por cima.
    const matLiq = new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.28, roughness: 0.1, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 0.9 });
    const liq = new THREE.Mesh(ctx.geoLiquido, matLiq); liq.position.y = -1.43; g.add(liq);
    const matRot = new THREE.MeshStandardMaterial({ map: texturaRotulo(rotulo), roughness: 0.85, metalness: 0 });
    const rot = new THREE.Mesh(ctx.geoRotulo, matRot); rot.position.y = -0.35; g.add(rot);
    const rolha = new THREE.Mesh(ctx.geoRolha, ctx.matRolha); rolha.position.y = 1.83; g.add(rolha);
    const tampa = new THREE.Mesh(ctx.geoTampa, ctx.matCobre); tampa.position.y = 1.9; g.add(tampa);
    const colar = new THREE.Mesh(ctx.geoColar, ctx.matCobre); colar.position.y = 1.22; colar.rotation.x = Math.PI / 2; g.add(colar);
    const bolhas = criarBolhas(ctx.low ? 24 : 46); g.add(bolhas.im);
    return { g, vidro, liq, matLiq, matRot, bolhas, rot };
  }

  const nomeCor = CORES.liquido[opts.liquid] ? opts.liquid : 'violeta';
  const corBase = new THREE.Color(CORES.liquido[nomeCor]);
  const corAlvo = new THREE.Color(nomeCor === 'rose' ? CORES.liquido.violeta : CORES.liquido.rose);
  const principal = criarGarrafa(corBase.getHex(), 'ORIGINAL · 44% ALC. · 750 ML');
  scene.add(principal.g);
  const variantes = [
    criarGarrafa(CORES.liquido.rose, 'ROSÉ · 42% ALC. · 750 ML'),
    criarGarrafa(CORES.liquido.ambar, 'RESERVA · 46% ALC. · 750 ML'),
  ];
  for (const v of variantes) { v.g.visible = false; scene.add(v.g); }

  // Malha (bastidores)
  const matFio = new THREE.MeshBasicMaterial({ wireframe: true, color: CORES.cobre, transparent: true, opacity: 0, depthWrite: false });
  const matFioLiq = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x8A8FD8, transparent: true, opacity: 0, depthWrite: false });
  const fio = new THREE.Group();
  fio.rotation.order = 'ZYX';
  fio.add(new THREE.Mesh(geoVidro, matFio));
  const fioLiq = new THREE.Mesh(geoLiquido, matFioLiq); fioLiq.position.y = -1.43; fio.add(fioLiq);
  fio.visible = false; scene.add(fio);
  const grade = new THREE.GridHelper(14, 28, CORES.cobre, 0x2A2420);
  grade.material.transparent = true; grade.material.opacity = 0; grade.position.y = -1.9; grade.visible = false; scene.add(grade);

  const bots = criarBotanicos(low);
  scene.add(bots.grupo);
  const dummy = new THREE.Object3D();

  let inicio = 0, tempo = 0, giro = 0, parX = 0, parY = 0;
  let slots = [-2.4, 0, 2.4];
  let quadros = 0, fpsMarca = 0, fps = 0;

  function redimensionar() {
    const w = window.innerWidth, h = window.innerHeight;
    // updateStyle=true: o canvas fica com tamanho em px, e não em 100%, para captura e impressão não esticarem o quadro.
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.85 ? 52 : camera.aspect < 1.2 ? 42 : 35;
    camera.updateProjectionMatrix();
    const tg = Math.tan(camera.fov / 2 * Math.PI / 180);
    const hw62 = tg * 6.2 * camera.aspect;
    const hw66 = tg * 6.6 * camera.aspect;
    slots = [-hw66 * 2 / 3, 0, hw66 * 2 / 3];
    // O plano do título fica 1.3 atrás do frasco: a escala compensa a distância extra.
    const W = Math.min(7.4, hw62 * 2.25);
    titulo.scale.set(W, W / 4, 1);
  }
  redimensionar();

  function atualizarBolhas(bo, dt, topo, t) {
    for (let i = 0; i < bo.b.length; i++) {
      const b = bo.b[i];
      b.y += b.v * dt;
      if (b.y > topo) b.y = -1.38;
      dummy.position.set(b.x + Math.sin(t * 1.3 + b.w) * 0.02, Math.min(b.y, topo), b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(b.s * (0.55 + 0.45 * clamp((b.y + 1.38) / (topo + 1.38), 0, 1)));
      dummy.updateMatrix(); bo.im.setMatrixAt(i, dummy.matrix);
    }
    bo.im.instanceMatrix.needsUpdate = true;
  }
  function atualizarBotanicos(t, p, spread, vis) {
    for (const it of bots.itens) {
      const a = it.ph + t * it.sp * p.botSpeed;
      dummy.position.set(p.botCx + Math.cos(a) * it.r * spread, p.botCy + it.h * spread * 0.85 + Math.sin(t * 0.8 + it.bob) * 0.06, p.botCz + Math.sin(a) * it.r * spread * 0.65);
      dummy.rotation.set(t * it.rx + it.ph, t * it.ry, t * it.rz);
      dummy.scale.setScalar(Math.max(0.0001, it.esc * vis));
      dummy.updateMatrix(); it.im.setMatrixAt(it.i, dummy.matrix);
    }
    for (const im of bots.grupo.children) im.instanceMatrix.needsUpdate = true;
  }

  function render(p, dt, now, px, py) {
    if (!inicio) inicio = now;
    const intro = out(clamp((now - inicio) / 1800, 0, 1));
    const enche = lerp(0.03, 1, out(clamp((now - inicio - 250) / 2300, 0, 1)));
    const vel = reduced ? 0 : velocidade;
    tempo += dt * vel;
    parX += ((px || 0) - parX) * Math.min(1, dt * 3.5);
    parY += ((py || 0) - parY) * Math.min(1, dt * 3.5);

    camera.position.set(parX * 0.22, -parY * 0.12, p.camZ);
    camera.lookAt(0, 0, 0);

    giro += p.spin * vel * dt;
    const trio = clamp(p.trio, 0, 1);
    const bx = lerp(p.bx, slots[0], trio);
    const G = principal.g;
    G.position.set(bx, p.by, p.bz);
    G.rotation.set(0, giro + parX * 0.3, p.brz);
    G.scale.setScalar(Math.max(0.001, p.bs * (0.55 + 0.45 * intro)));
    principal.liq.scale.y = enche;
    principal.matLiq.color.copy(corBase).lerp(corAlvo, clamp(p.liq, 0, 1));
    principal.matLiq.emissive.copy(principal.matLiq.color);
    contraluz.position.set(bx - 0.6, p.by + 0.6, -2.2);
    const topo = -1.43 + 2.15 * enche;
    atualizarBolhas(principal.bolhas, dt * vel, topo, tempo);

    variantes.forEach((v, k) => {
      const vis = trio > 0.005;
      v.g.visible = vis; if (!vis) return;
      v.g.position.set(slots[k + 1], p.by - (1 - trio) * 1.4, p.bz);
      v.g.scale.setScalar(Math.max(0.001, p.bs * trio));
      v.g.rotation.set(0, giro * (k ? 0.7 : 0.85) + (k + 1) * 1.1, 0);
      v.liq.scale.y = enche;
      atualizarBolhas(v.bolhas, dt * vel, topo, tempo);
    });

    const spread = lerp(3.4, p.botSpread, intro);
    const vis = clamp(p.botVis, 0, 1) * intro;
    bots.grupo.visible = vis > 0.003;
    if (bots.grupo.visible) atualizarBotanicos(tempo, p, spread, vis);

    titulo.material.color.copy(corFundo).lerp(corTitulo, clamp(p.title, 0, 1) * intro);
    titulo.visible = clamp(p.title, 0, 1) * intro > 0.004;
    titulo.position.set(bx * 0.4, p.by * 0.7 + 0.05, -1.3);
    fundo.position.set(bx * 3.25, p.by * 3.25, -14);

    const w = clamp(p.wire, 0, 1);
    matVidro.opacity = (low ? 0.3 : 1) * (1 - w);
    principal.liq.visible = w < 0.5;
    matRolha.opacity = 1 - w; matCobre.opacity = 1 - w;
    principal.matRot.transparent = w > 0; principal.matRot.opacity = 1 - w;
    principal.bolhas.mat.opacity = 0.5 * (1 - w);
    G.visible = w < 0.995;
    fio.visible = w > 0.004;
    if (fio.visible) {
      fio.position.copy(G.position); fio.rotation.copy(G.rotation); fio.scale.copy(G.scale);
      matFio.opacity = 0.85 * w; matFioLiq.opacity = 0.45 * w; fioLiq.scale.y = enche;
    }
    grade.visible = w > 0.004 && p.grid > 0;
    grade.material.opacity = 0.32 * w * clamp(p.grid, 0, 1);

    const glow = clamp(p.glow, 0, 1);
    brilho.material.opacity = 0.4 * glow; brilho.position.set(bx * 0.5, p.by * 0.5, -2.6);
    brilho2.material.opacity = 0.22 * glow; brilho2.position.set(bx * 0.5 + 1.4, p.by * 0.5 - 1.4, -2.2);
    nevoas.forEach((m, i) => { m.material.map.offset.x += dt * vel * (0.006 + i * 0.004); m.material.opacity = (0.05 + i * 0.02) * (0.35 + 0.65 * glow); });
    const arr = geoPart.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) { arr[i] += dt * vel * 0.05; if (arr[i] > 4) arr[i] = -4; }
    geoPart.attributes.position.needsUpdate = true;
    particulas.material.opacity = 0.55 * (0.4 + 0.6 * glow);

    renderer.render(scene, camera);
    quadros++;
    if (now - fpsMarca > 500) { fps = Math.round(quadros * 1000 / (now - fpsMarca)); quadros = 0; fpsMarca = now; }
  }

  function stats() {
    return { tris: renderer.info.render.triangles, calls: renderer.info.render.calls, fps, w: canvas.width, h: canvas.height, dpr: renderer.getPixelRatio() };
  }

  function setOptions(o) {
    if (o && typeof o.speed === 'number') velocidade = o.speed;
    if (o && o.liquid && CORES.liquido[o.liquid]) {
      corBase.setHex(CORES.liquido[o.liquid]);
      corAlvo.setHex(o.liquid === 'rose' ? CORES.liquido.violeta : CORES.liquido.rose);
    }
  }

  function destroy() {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m) { for (const mm of Array.isArray(m) ? m : [m]) { if (mm.map) mm.map.dispose(); mm.dispose(); } }
    });
    if (scene.environment) scene.environment.dispose();
    renderer.dispose();
  }

  return { render, stats, setOptions, resize: redimensionar, destroy, low };
}
