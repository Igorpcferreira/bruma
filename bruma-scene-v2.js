// Cena 3D da BRUMA V2 · estudo autoral da Kyber Tech (2026).
// Frasco com vidro físico, líquido com absorção e frente de difusão, rótulo com hot stamping,
// botânicos reconhecíveis e ambiente de estúdio procedural (sem HDRI remoto).
// A página envia a cada quadro um `pose` (interpolado no scroll) e um `input` discreto
// (líquido 0..1, botânico em foco, expressão ativa, paralaxe, congelar).
// Three.js r169 versionado em /vendor, e não importado do unpkg em tempo de execução: o
// handoff da V2 pede isso para produção, e sem ele a cena inteira depende de uma CDN de
// terceiro estar no ar. Trocar de versão é trocar o arquivo em vendor/ e anotar no README.
import * as THREE from '/vendor/three.module.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const out3 = (t) => 1 - Math.pow(1 - t, 3);

// Semente determinística: mesma composição em todo carregamento e na captura.
let semente = 7;
const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
const hash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v), lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v), w);
}

const COR = {
  fundo: 0x0E0F11, cobre: 0xB86B3A, ciano: 0x53E8FF,
  liquido: {
    violeta: { denso: 0x3B378E, borda: 0x968CE8 },
    rose: { denso: 0xA8486E, borda: 0xF2A7BF },
    ambar: { denso: 0x7E4412, borda: 0xE0A050 },
  },
};

// ---------- Perfis do frasco ----------
function rOmbro(y) { // ombro 0.5 → 1.2: raio 0.62 → 0.21, transição de propósito não perfeita
  const p = clamp((y - 0.5) / 0.7, 0, 1);
  const c = 0.5 + 0.5 * Math.cos(Math.PI * p);
  const q = 1 - Math.pow(p, 1.35);
  return 0.21 + 0.41 * lerp(c, q, 0.28);
}
function rVidro(y) {
  if (y < -1.36) return 0.62 * clamp((y + 1.5) / 0.14, 0, 1);
  if (y <= 0.5) return 0.62;
  if (y <= 1.2) return rOmbro(y);
  return 0.21;
}
function perfilGarrafa() {
  const P = [], add = (r, y) => P.push(new THREE.Vector2(r, y));
  add(0, -1.33); add(0.16, -1.36); add(0.30, -1.42); add(0.42, -1.48); add(0.50, -1.50); // fundo com punt
  add(0.575, -1.49); add(0.607, -1.455); add(0.62, -1.40); add(0.62, -1.36); // quina chanfrada
  add(0.62, 0.5);
  for (let k = 1; k <= 20; k++) { const y = 0.5 + 0.7 * k / 20; add(rOmbro(y), y); }
  add(0.208, 1.40); add(0.205, 1.58);
  add(0.232, 1.60); add(0.25, 1.635); add(0.25, 1.755); add(0.236, 1.78); add(0.17, 1.78); // lábio
  add(0.158, 1.73); add(0.158, 1.56); add(0, 1.56); // boca
  return P;
}
const NIVEL = 0.62, ALT_LIQ = 1.85;
function perfilLiquido() { // fundo grosso (0.30 de vidro), parede visível (k = 0.9), menisco no topo
  const P = [], k = 0.9, add = (r, y) => P.push(new THREE.Vector2(r, y + 1.20));
  add(0, -1.20); add(0.36, -1.20); add(0.50, -1.17); add(0.548, -1.11); add(0.558, -1.02);
  add(0.558, 0.5);
  for (let i = 1; i <= 20; i++) { const y = 0.5 + 0.7 * i / 20; if (y >= NIVEL) break; add(rOmbro(y) * k, y); }
  const rn = rOmbro(NIVEL) * k;
  add(rn, NIVEL); add(rn + 0.006, NIVEL + 0.028); add(rn - 0.02, NIVEL + 0.008); add(rn - 0.08, NIVEL); add(0, NIVEL);
  return P;
}
function perfilRolha() {
  const P = [], add = (r, y) => P.push(new THREE.Vector2(r, y));
  add(0, 1.50); add(0.146, 1.50); add(0.152, 1.56); add(0.168, 1.80); add(0.172, 1.87); add(0, 1.87);
  return P;
}
function perfilTampa() {
  const P = [], add = (r, y) => P.push(new THREE.Vector2(r, y));
  add(0, 1.86); add(0.255, 1.86); add(0.274, 1.876); add(0.282, 1.905); add(0.282, 2.02); add(0.27, 2.048); add(0.24, 2.066); add(0, 2.066);
  return P;
}
function perfilColar() {
  const P = [], add = (r, y) => P.push(new THREE.Vector2(r, y));
  add(0.209, 1.20); add(0.236, 1.20); add(0.247, 1.213); add(0.247, 1.287); add(0.236, 1.30); add(0.209, 1.30);
  return P;
}

// ---------- Texturas geradas ----------
function quandoFonte(cb) {
  cb();
  try {
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('400 160px Italiana'), document.fonts.load('500 30px "JetBrains Mono"')]).then(cb).catch(() => {});
    }
  } catch (e) {}
}
let ANISO = 8;
function canvasTex(w, h, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return { c, g: c.getContext('2d'), t };
}
// Rótulo: quatro mapas desenhados com o mesmo layout (cor, rugosidade, metal, relevo).
function texturasRotulo(variante, alta) {
  const W = alta ? 2048 : 1024, H = Math.round(W / 2.2), k = W / 2048;
  const cor = canvasTex(W, H, true), rug = canvasTex(W, H, false), met = canvasTex(W, H, false), rel = canvasTex(W, H, false);
  const fibras = [];
  for (let i = 0; i < 1400; i++) fibras.push([rnd() * W, rnd() * H, (6 + rnd() * 40) * k, rnd() * TAU, rnd()]);
  const grao = [];
  for (let i = 0; i < 2600; i++) grao.push([rnd() * W, rnd() * H, rnd()]);
  const desenhar = (g, modo) => {
    // fundo
    g.fillStyle = modo === 'cor' ? '#EBE4D5' : modo === 'rug' ? 'rgb(232,232,232)' : modo === 'met' ? '#000' : 'rgb(128,128,128)';
    g.fillRect(0, 0, W, H);
    if (modo === 'cor' || modo === 'rel' || modo === 'rug') {
      g.lineWidth = 1 * k;
      for (const f of fibras) {
        g.strokeStyle = modo === 'cor' ? `rgba(90,70,50,${(0.04 + f[4] * 0.05).toFixed(3)})` : modo === 'rug' ? `rgba(255,255,255,${(0.08 + f[4] * 0.1).toFixed(3)})` : `rgba(${f[4] > 0.5 ? 255 : 0},${f[4] > 0.5 ? 255 : 0},${f[4] > 0.5 ? 255 : 0},0.10)`;
        g.beginPath(); g.moveTo(f[0], f[1]); g.lineTo(f[0] + Math.cos(f[3]) * f[2], f[1] + Math.sin(f[3]) * f[2]); g.stroke();
      }
      for (const p of grao) {
        g.fillStyle = modo === 'cor' ? `rgba(60,45,35,${(0.03 + p[2] * 0.05).toFixed(3)})` : `rgba(${p[2] > 0.5 ? 255 : 0},${p[2] > 0.5 ? 255 : 0},${p[2] > 0.5 ? 255 : 0},0.12)`;
        g.fillRect(p[0], p[1], 1.5 * k, 1.5 * k);
      }
    }
    if (modo === 'cor') { // vinheta muito leve do papel
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(70,50,30,0.14)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    // moldura
    const corMold = modo === 'cor' ? '#B86B3A' : modo === 'rug' ? 'rgb(90,90,90)' : modo === 'met' ? 'rgb(210,210,210)' : 'rgb(170,170,170)';
    g.strokeStyle = corMold; g.lineWidth = 5 * k; g.strokeRect(70 * k, 66 * k, W - 140 * k, H - 132 * k);
    g.lineWidth = 1.6 * k; g.strokeRect(96 * k, 92 * k, W - 192 * k, H - 184 * k);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = W / 2;
    // topo
    g.font = `500 ${26 * k}px "JetBrains Mono", monospace`; if ('letterSpacing' in g) g.letterSpacing = `${8 * k}px`;
    g.fillStyle = modo === 'cor' ? '#6B5646' : modo === 'rug' ? 'rgb(150,150,150)' : modo === 'met' ? '#000' : 'rgb(140,140,140)';
    g.fillText('DESTILARIA · CERRADO GOIANO', cx + 4 * k, H * 0.17);
    // BRUMA em hot stamping de cobre
    g.font = `400 ${330 * k}px Italiana, Georgia, serif`; if ('letterSpacing' in g) g.letterSpacing = `${40 * k}px`;
    if (modo === 'cor') {
      const gr = g.createLinearGradient(0, H * 0.24, 0, H * 0.6);
      gr.addColorStop(0, '#8E4F25'); gr.addColorStop(0.45, '#D9A57F'); gr.addColorStop(0.55, '#C98C5E'); gr.addColorStop(1, '#8A4B22');
      g.fillStyle = gr;
    } else g.fillStyle = modo === 'rug' ? 'rgb(58,58,58)' : modo === 'met' ? '#fff' : 'rgb(190,190,190)';
    g.fillText('BRUMA', cx + 20 * k, H * 0.415);
    // linha e subtítulo
    g.font = `500 ${34 * k}px "JetBrains Mono", monospace`; if ('letterSpacing' in g) g.letterSpacing = `${12 * k}px`;
    g.fillStyle = modo === 'cor' ? '#1E1C24' : modo === 'rug' ? 'rgb(140,140,140)' : modo === 'met' ? '#000' : 'rgb(118,118,118)';
    g.fillText('GIN DO CERRADO', cx + 6 * k, H * 0.635);
    g.fillStyle = corMold; g.fillRect(cx - 110 * k, H * 0.695, 220 * k, 2.5 * k);
    g.font = `400 ${30 * k}px "JetBrains Mono", monospace`; if ('letterSpacing' in g) g.letterSpacing = `${6 * k}px`;
    g.fillStyle = modo === 'cor' ? '#1E1C24' : modo === 'rug' ? 'rgb(140,140,140)' : modo === 'met' ? '#000' : 'rgb(118,118,118)';
    g.fillText(variante, cx + 3 * k, H * 0.765);
    g.font = `400 ${21 * k}px "JetBrains Mono", monospace`; if ('letterSpacing' in g) g.letterSpacing = `${5 * k}px`;
    g.fillStyle = modo === 'cor' ? '#7A6555' : modo === 'rug' ? 'rgb(160,160,160)' : modo === 'met' ? '#000' : 'rgb(132,132,132)';
    g.fillText('LOTE 02 · SERRA DOS PIRENEUS · GO · ESTUDO CONCEITUAL', cx + 3 * k, H * 0.875);
  };
  quandoFonte(() => {
    desenhar(cor.g, 'cor'); cor.t.needsUpdate = true;
    desenhar(rug.g, 'rug'); rug.t.needsUpdate = true;
    desenhar(met.g, 'met'); met.t.needsUpdate = true;
    desenhar(rel.g, 'rel'); rel.t.needsUpdate = true;
  });
  return { cor: cor.t, rug: rug.t, met: met.t, rel: rel.t };
}
function texturaTitulo(alta) { // alta resolução + alpha-to-coverage: borda das letras sem serrilhado
  const W = alta ? 4096 : 2048, H = W / 4, k = W / 2048;
  const { g, t } = canvasTex(W, H, true);
  quandoFonte(() => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#D9D9E3'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `400 ${400 * k}px Italiana, Georgia, serif`; if ('letterSpacing' in g) g.letterSpacing = `${60 * k}px`;
    g.fillText('BRUMA', W / 2 + 30 * k, H * 0.523);
    t.needsUpdate = true;
  });
  return t;
}
function texturaFundo() {
  const { g, t } = canvasTex(512, 512, true);
  g.fillStyle = '#0E0F11'; g.fillRect(0, 0, 512, 512);
  let gr = g.createRadialGradient(256, 236, 0, 256, 236, 200);
  gr.addColorStop(0, 'rgba(96,102,178,0.55)'); gr.addColorStop(0.5, 'rgba(96,102,178,0.18)'); gr.addColorStop(1, 'rgba(96,102,178,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  gr = g.createRadialGradient(340, 330, 0, 340, 330, 130);
  gr.addColorStop(0, 'rgba(184,107,58,0.24)'); gr.addColorStop(1, 'rgba(184,107,58,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  return t;
}
function texturaBrilho() {
  const { g, t } = canvasTex(256, 256, false);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return t;
}
function texturaChao() { // alfa do chão: presente sob o frasco, dissolvido ao fundo (sem linha de horizonte)
  const { g, t } = canvasTex(256, 256, false);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgb(255,255,255)'); gr.addColorStop(0.35, 'rgb(200,200,200)'); gr.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return t;
}
function texturaSombra() { // sombra de contato: núcleo definido, borda macia (o plano é achatado em 2:1)
  const { g, t } = canvasTex(256, 256, false);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.28, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return t;
}
function texturaNevoa() {
  const { g, t } = canvasTex(512, 256, false);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 512, y = rnd() * 256, r = 30 + rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,' + (0.05 + rnd() * 0.1).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function texturaCortica() {
  const cor = canvasTex(256, 256, true), rel = canvasTex(256, 256, false);
  cor.g.fillStyle = '#3F2E26'; cor.g.fillRect(0, 0, 256, 256);
  rel.g.fillStyle = 'rgb(128,128,128)'; rel.g.fillRect(0, 0, 256, 256);
  const tons = ['#5B4536', '#2B1F19', '#6B5343', '#4A3529', '#332520'];
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 0.8 + rnd() * 3.2, q = rnd();
    cor.g.fillStyle = tons[Math.floor(q * tons.length)]; cor.g.beginPath(); cor.g.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * TAU, 0, TAU); cor.g.fill();
    rel.g.fillStyle = q > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'; rel.g.beginPath(); rel.g.arc(x, y, r, 0, TAU); rel.g.fill();
  }
  cor.t.wrapS = cor.t.wrapT = rel.t.wrapS = rel.t.wrapT = THREE.RepeatWrapping;
  cor.t.needsUpdate = rel.t.needsUpdate = true;
  return { cor: cor.t, rel: rel.t };
}
function texturaEscovado() { // rugosidade do cobre: riscos horizontais quase invisíveis
  const { g, t } = canvasTex(512, 128, false);
  g.fillStyle = 'rgb(200,200,200)'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 900; i++) {
    const y = rnd() * 128, w = 20 + rnd() * 220, x = rnd() * 512, q = rnd();
    g.strokeStyle = q > 0.5 ? `rgba(255,255,255,${(0.05 + q * 0.12).toFixed(3)})` : `rgba(0,0,0,${(0.05 + (1 - q) * 0.12).toFixed(3)})`;
    g.lineWidth = 0.6 + rnd() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + (rnd() - 0.5) * 1.5); g.stroke();
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.needsUpdate = true;
  return t;
}
function texturaMicroRug() { // imperfeições microscópicas do vidro
  const { g, t } = canvasTex(256, 256, false);
  g.fillStyle = 'rgb(215,215,215)'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { const q = rnd(); g.fillStyle = q > 0.5 ? `rgba(255,255,255,${(q * 0.3).toFixed(3)})` : `rgba(0,0,0,${((1 - q) * 0.3).toFixed(3)})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.needsUpdate = true;
  return t;
}

// Estúdio procedural: softboxes verticais longos (revelam o formato do vidro), topo macio,
// contraluz violeta, recorte frio e rebatedor de cobre. Sem HDRI externo.
function ambiente(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x06060A, side: THREE.BackSide })));
  const painel = (w, h, cor, forca, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  painel(1.1, 9, 0xFFF1E4, 7.5, 4.6, 1.2, 3.2);     // softbox direito
  painel(0.9, 9, 0xF4F0FF, 5.5, -4.8, 1.6, 2.6);    // softbox esquerdo
  painel(6, 2.4, 0xFFF6EE, 2.6, 0.5, 6.5, 1.5);     // topo
  painel(5, 5, 0x6E74E0, 2.8, 0.6, 0.8, -6.5);      // contraluz violeta
  painel(0.4, 8, 0xB8C8FF, 6, -3.2, 2.2, -3.5);     // recorte frio
  painel(4.5, 1.1, 0xD08A5A, 2.4, 2.6, -3.6, 3.4);  // rebatedor de cobre
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture; pm.dispose();
  s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return tex;
}

// ---------- Líquido: absorção + frente de difusão (violeta → rosé) ----------
function materialLiquido(cores, u) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.7 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vLocalP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalP = position;');
    sh.fragmentShader = `uniform vec3 uDense; uniform vec3 uRim; uniform vec3 uDense2; uniform vec3 uRim2; uniform float uFront; uniform float uTime; uniform float uBand; uniform float uGlow;
varying vec3 vLocalP; float brFr; float brM; vec3 brRim;\n` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  { vec3 nrm = normalize(vNormal); vec3 vdir = normalize(vViewPosition);
    brFr = pow(1.0 - clamp(dot(nrm, vdir), 0.0, 1.0), 2.3);
    float d = 1.0 - vLocalP.y / ${ALT_LIQ.toFixed(3)};
    float wob = sin(vLocalP.x * 9.0 + uTime * 0.6) * 0.05 + sin(vLocalP.z * 7.0 - uTime * 0.45) * 0.05;
    float F = uFront * 1.35 - 0.15;
    brM = 1.0 - smoothstep(F - 0.18, F + 0.05, d + wob);
    vec3 dense = mix(uDense, uDense2, brM); brRim = mix(uRim, uRim2, brM);
    diffuseColor.rgb = mix(dense, brRim, brFr);
    float band = exp(-pow((d + wob - F) * 9.0, 2.0)) * uBand;
    diffuseColor.rgb += brRim * band * 0.7; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += brRim * (brFr * uGlow + uBand * 0.05);`);
  };
  m.customProgramCacheKey = () => 'bruma-liquido';
  return m;
}
function uniformsLiquido(base, alvo) {
  const c = (h) => new THREE.Color(h);
  return { uDense: { value: c(base.denso) }, uRim: { value: c(base.borda) }, uDense2: { value: c(alvo.denso) }, uRim2: { value: c(alvo.borda) }, uFront: { value: 0 }, uTime: { value: 0 }, uBand: { value: 0 }, uGlow: { value: 0.22 } };
}
// Vidro leve para celular: sem transmissão, mas com reflexos do estúdio e alfa por Fresnel.
function materialVidroLeve(env) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xE6EAFF, roughness: 0.05, metalness: 0, envMapIntensity: 1.7, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 1, depthWrite: false, envMap: env });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  { float fr = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.0); diffuseColor.a *= mix(0.2, 0.9, fr); }`);
  };
  m.customProgramCacheKey = () => 'bruma-vidro-leve';
  return m;
}

// ---------- Botânicos ----------
function pintar(geo, fn) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const cols = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(c, pos.getX(i), pos.getY(i), pos.getZ(i), nor ? nor.getX(i) : 0, nor ? nor.getY(i) : 1, nor ? nor.getZ(i) : 0);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
function rugar(geo, amp, freq) { // desloca pela normal com ruído posicional: não racha a costura da esfera
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const d = (noise(x * freq + 11, y * freq + 5, z * freq + 3) - 0.5) * 2 * amp;
    pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
  }
  pos.needsUpdate = true; geo.computeVertexNormals(); return geo;
}
function fundir(geos) {
  const arrs = { position: [], normal: [], color: [] }; let n = 0;
  for (let g of geos) {
    if (g.index) g = g.toNonIndexed();
    const cnt = g.attributes.position.count;
    for (const k in arrs) { const a = g.attributes[k]; arrs[k].push(a ? a.array : new Float32Array(cnt * 3)); }
    n += cnt;
  }
  const out = new THREE.BufferGeometry();
  for (const k in arrs) { const f = new Float32Array(n * 3); let o = 0; for (const a of arrs[k]) { f.set(a, o); o += a.length; } out.setAttribute(k, new THREE.BufferAttribute(f, 3)); }
  return out;
}
function geoZimbro() {
  const g = new THREE.SphereGeometry(0.072, 24, 18); g.scale(1, 0.94, 1);
  rugar(g, 0.0035, 60);
  const base = new THREE.Color(0x393E74), bloom = new THREE.Color(0x8C93BF), marca = new THREE.Color(0x1B1C2E);
  return pintar(g, (c, x, y, z) => {
    const n = noise(x * 38 + 3, y * 38, z * 38);
    c.copy(base).lerp(bloom, sstep(0.45, 0.9, n) * 0.75);
    c.lerp(marca, sstep(0.052, 0.066, y));
  });
}
function geoPequi() {
  const g = new THREE.SphereGeometry(0.115, 30, 22); g.scale(1, 0.86, 0.94);
  rugar(g, 0.011, 42);
  const a = new THREE.Color(0xC98A32), b = new THREE.Color(0x7B4A18);
  return pintar(g, (c, x, y, z) => { const n = noise(x * 60, y * 60, z * 60); c.copy(a).lerp(b, n * 0.8); });
}
function geoBaru() {
  const g = new THREE.SphereGeometry(0.06, 20, 16); g.scale(0.95, 1.75, 0.62);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) + 0.022 * Math.pow(y / 0.105, 2)); }
  g.computeVertexNormals();
  const a = new THREE.Color(0x553622), b = new THREE.Color(0x9A7248), t = new THREE.Color(0x2F1E12);
  return pintar(g, (c, x, y, z, nx) => { const n = noise(x * 70, y * 70, z * 70); c.copy(a).lerp(t, n * 0.35); c.lerp(b, sstep(0.55, 0.95, nx)); });
}
function geoCapim() {
  const g = new THREE.PlaneGeometry(0.036, 0.72, 2, 18);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), t = (y + 0.36) / 0.72;
    pos.setXYZ(i, x * (1 - 0.78 * t), y, 0.2 * t * t + 0.02 * Math.sin(t * 9));
  }
  g.computeVertexNormals();
  const a = new THREE.Color(0xD6DB92), b = new THREE.Color(0x6C9A4E), v = new THREE.Color(0x4F7A3A);
  return pintar(g, (c, x, y) => { const t = (y + 0.36) / 0.72; c.copy(a).lerp(b, sstep(0.05, 0.9, t)); if (Math.abs(x) < 0.004) c.lerp(v, 0.6); });
}
function geoLaranja() { // fita com espessura torcida em hélice: face externa com poros, interna clara
  const g = new THREE.BoxGeometry(0.10, 0.016, 0.95, 2, 1, 48);
  const pos = g.attributes.position, cols = [];
  const fora = new THREE.Color(0xE9853B), poro = new THREE.Color(0xB75A1C), dentro = new THREE.Color(0xF3E1BE), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (z + 0.475) / 0.95, a = t * TAU * 1.5, R = lerp(0.14, 0.10, t) + y;
    pos.setXYZ(i, Math.cos(a) * R, (t - 0.5) * 0.42 + x, Math.sin(a) * R);
    const n = noise(t * 40, x * 90, 0.5);
    if (y > 0) c.copy(fora).lerp(poro, sstep(0.55, 0.85, n) * 0.9); else c.copy(dentro);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}
function geoFada() { // flor fada-azul: duas camadas de cinco pétalas em funil e um miolo claro
  const partes = [];
  const petala = (esc, tilt, rotY, dy) => {
    const g = new THREE.PlaneGeometry(0.078, 0.1, 6, 8);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y0 = pos.getY(i), s = (y0 + 0.05) / 0.1;
      const x = x0 * (0.22 + 0.78 * Math.pow(Math.max(0, Math.sin(s * Math.PI)), 0.55));
      pos.setXYZ(i, x * esc, (y0 + 0.05) * esc, (10 * x * x + 0.006 * Math.sin(s * 7)) * esc);
    }
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2 + tilt); g.rotateY(rotY); g.translate(0, dy, 0);
    return g;
  };
  for (let i = 0; i < 5; i++) partes.push(petala(1, 0.5, i * TAU / 5, 0));
  for (let i = 0; i < 5; i++) partes.push(petala(0.72, 0.85, i * TAU / 5 + TAU / 10, 0.012));
  const g = fundir(partes);
  const borda = new THREE.Color(0x5A64D8), meio = new THREE.Color(0x8F97F0), centro = new THREE.Color(0xF2F1FF);
  pintar(g, (c, x, y, z) => { const r = Math.hypot(x, z); c.copy(centro).lerp(meio, sstep(0.008, 0.035, r)).lerp(borda, sstep(0.05, 0.095, r)); });
  const miolo = new THREE.SphereGeometry(0.011, 10, 8); miolo.translate(0, 0.014, 0);
  pintar(miolo, (c) => c.set(0xFBF7E6));
  return fundir([g, miolo]);
}
function geoFolha() { // grade deformada: dobra na nervura central, ponta levemente curvada, nervuras pintadas
  const g = new THREE.PlaneGeometry(0.3, 0.48, 8, 20);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), y = pos.getY(i), t = (y + 0.24) / 0.48;
    const x = x0 * Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.75) * (1.05 - 0.25 * t);
    pos.setXYZ(i, x, y, 0.5 * Math.abs(x) + 0.09 * t * t);
  }
  g.computeVertexNormals();
  const a = new THREE.Color(0x2B6642), b = new THREE.Color(0x3F7F52), nerv = new THREE.Color(0x86B486), sec = new THREE.Color(0x4F9062);
  return pintar(g, (c, x, y) => {
    const t = (y + 0.24) / 0.48; c.copy(a).lerp(b, t * 0.7);
    if (Math.abs(x) < 0.008) c.lerp(nerv, 0.8);
    else { const v = ((y - Math.abs(x) * 0.8) * 7) % 1; if (Math.abs(Math.abs(v) - 0.5) < 0.045) c.lerp(sec, 0.55); }
  });
}
function criarBotanicos(perfil) {
  const n = perfil === 'alta' ? [7, 2, 3, 5, 3, 4, 5] : perfil === 'media' ? [5, 1, 2, 3, 2, 3, 3] : [4, 1, 2, 2, 2, 2, 2];
  const mat = (rug, dupla) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rug, metalness: 0, side: dupla ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: 0.55 });
  const tipos = [
    { geo: geoZimbro(), mat: mat(0.5), esc: [0.95, 1.35] },
    { geo: geoPequi(), mat: mat(0.95), esc: [0.9, 1.1] },
    { geo: geoBaru(), mat: mat(0.72), esc: [0.9, 1.2] },
    { geo: geoCapim(), mat: mat(0.65, true), esc: [0.8, 1.2] },
    { geo: geoLaranja(), mat: mat(0.48), esc: [0.85, 1.1] },
    { geo: geoFada(), mat: mat(0.7, true), esc: [1.4, 1.9] },
    { geo: geoFolha(), mat: mat(0.6, true), esc: [0.8, 1.2] },
  ];
  const grupo = new THREE.Group(), itens = [];
  tipos.forEach((t, k) => {
    const im = new THREE.InstancedMesh(t.geo, t.mat, n[k]);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < n[k]; i++) {
      itens.push({ im, i, t: k, r: 1.15 + rnd() * 0.95, h: -1.25 + rnd() * 2.6, ph: rnd() * TAU, sp: (0.055 + rnd() * 0.045) * (rnd() < 0.5 ? 1 : -1), rx: 0.1 + rnd() * 0.22, ry: 0.1 + rnd() * 0.22, rz: 0.06 + rnd() * 0.16, esc: lerp(t.esc[0], t.esc[1], rnd()), bob: rnd() * TAU, dx: (rnd() - 0.5) * 0.7, dy: (rnd() - 0.5) * 0.6, dz: (rnd() - 0.5) * 0.4 });
    }
    grupo.add(im);
  });
  return { grupo, itens, tipos };
}
function criarBolhas(n) { // microbolhas na parede interna, sempre dentro do vidro e com profundidade real
  const geo = new THREE.SphereGeometry(0.011, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0xF4F2FF, roughness: 0.1, metalness: 0, envMapIntensity: 1.2, emissive: 0x8A8FE8, emissiveIntensity: 0.25 });
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const b = [];
  for (let i = 0; i < n; i++) b.push({ off: (rnd() - 0.5) * 2.0, y: -1.1 + rnd() * 1.6, v: 0.08 + rnd() * 0.16, s: 0.6 + rnd() * 0.9, w: rnd() * TAU });
  return { im, b, geo, mat };
}

export function createScene(opts) {
  const canvas = opts.canvas;
  const perfil = opts.profile === 'alta' || opts.profile === 'media' || opts.profile === 'leve' ? opts.profile : 'alta';
  const alta = perfil === 'alta';
  const reduced = !!opts.reduced;
  let velocidade = typeof opts.speed === 'number' ? opts.speed : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  const dprMax = alta ? 2 : perfil === 'media' ? 1.5 : 1.25;
  let dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  renderer.setPixelRatio(dpr);
  ANISO = Math.min(16, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = alta ? 0.85 : 0.5;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COR.fundo);
  const env = ambiente(renderer);
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
  camera.position.set(0, 0.3, 9);

  scene.add(new THREE.AmbientLight(0x6E74B0, 0.22));
  const chave = new THREE.DirectionalLight(0xFFE6CF, 1.9); chave.position.set(3.5, 5, 4); scene.add(chave);
  const frio = new THREE.DirectionalLight(0xA6B4FF, 0.55); frio.position.set(-4, 1.5, 1); scene.add(frio);
  const cobreLuz = new THREE.PointLight(COR.cobre, 5, 14, 2); cobreLuz.position.set(1.6, -1.9, 2.2); scene.add(cobreLuz);
  const contraluz = new THREE.PointLight(0x8A8FE8, 18, 16, 2); contraluz.position.set(-0.5, 0.7, -2.3); scene.add(contraluz); // acende o líquido por trás
  const ciano = new THREE.PointLight(COR.ciano, 0, 10, 2); ciano.position.set(2.2, 1.6, 1.2); scene.add(ciano); // único reflexo do cristal Kyber (cap. 07)

  // Fundo dentro da cena: só objetos opacos entram no passe de transmissão, então é este plano que o vidro refrata.
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({ map: texturaFundo() }));
  fundo.position.z = -14; scene.add(fundo);
  const texBrilho = texturaBrilho();
  const sprite = (tam, cor, op, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.MeshBasicMaterial({ map: texBrilho, color: cor, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.z = z; scene.add(m); return m; };
  const brilho = sprite(9, 0x5A5FAE, 0.36, -2.6);
  const brilho2 = sprite(4.5, 0x9C5A2C, 0.2, -2.2);
  const brilho3 = sprite(4, 0x53E8FF, 0, -2.0);

  // Chão de estúdio + sombra de contato (a garrafa pesa quando está apoiada)
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshStandardMaterial({ color: 0x14151A, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, transparent: true, opacity: 0, depthWrite: false, alphaMap: texturaChao() }));
  chao.rotation.x = -Math.PI / 2; chao.position.set(0, -1.6, -1); scene.add(chao);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, opacity: 0, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.renderOrder = 1; scene.add(sombra);
  const poca = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: texBrilho, color: 0x6A6FD0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  poca.rotation.x = -Math.PI / 2; poca.renderOrder = 1; scene.add(poca);

  const nevoas = [];
  for (let i = 0; i < (alta ? 4 : 2); i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.5), new THREE.MeshBasicMaterial({ map: texturaNevoa(), color: 0xAAB0E0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, -0.6 + i * 0.45, -2.6 + i * 0.7); scene.add(m); nevoas.push(m);
  }
  const nPart = alta ? 120 : 40;
  const pos = new Float32Array(nPart * 3);
  for (let i = 0; i < nPart; i++) { pos[i * 3] = (rnd() - 0.5) * 12; pos[i * 3 + 1] = (rnd() - 0.5) * 8; pos[i * 3 + 2] = -3 + rnd() * 4; }
  const geoPart = new THREE.BufferGeometry(); geoPart.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particulas = new THREE.Points(geoPart, new THREE.PointsMaterial({ size: 0.02, color: 0xC9CCE8, transparent: true, opacity: 0.35, depthWrite: false, sizeAttenuation: true }));
  scene.add(particulas);

  // Título opaco com recorte por alphaTest: entra no passe de transmissão e o vidro refrata as letras.
  const corTitulo = new THREE.Color(0xD9D9E3), corFundo = new THREE.Color(COR.fundo);
  const titulo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texturaTitulo(alta), alphaTest: 0.04, alphaToCoverage: true, color: 0xD9D9E3 }));
  titulo.position.set(0, 0, -1.3); scene.add(titulo);

  // ---------- Frasco ----------
  const seg = alta ? 128 : 72;
  const geoVidro = new THREE.LatheGeometry(perfilGarrafa(), seg);
  const geoLiquido = new THREE.LatheGeometry(perfilLiquido(), alta ? 96 : 56);
  const geoRotulo = new THREE.CylinderGeometry(0.627, 0.627, 0.6, alta ? 96 : 48, 1, true, -1.05, 2.1);
  const geoRolha = new THREE.LatheGeometry(perfilRolha(), 40);
  const geoTampa = new THREE.LatheGeometry(perfilTampa(), alta ? 96 : 48);
  const geoColar = new THREE.LatheGeometry(perfilColar(), alta ? 96 : 48);
  const microRug = alta ? texturaMicroRug() : null;
  const matVidro = alta ? new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF, metalness: 0, roughness: 0.035, roughnessMap: microRug, transmission: 1, thickness: 0.55, ior: 1.5,
    attenuationColor: new THREE.Color(0xDCE0FF), attenuationDistance: 6, specularIntensity: 1, envMapIntensity: 1.25,
    clearcoat: 0.2, clearcoatRoughness: 0.06, transparent: true, opacity: 1,
  }) : materialVidroLeve(env);
  const cort = texturaCortica();
  const matRolha = new THREE.MeshStandardMaterial({ map: cort.cor, bumpMap: cort.rel, bumpScale: 0.6, roughness: 0.95, metalness: 0, transparent: true });
  const escovado = texturaEscovado();
  const matCobre = new THREE.MeshStandardMaterial({ color: COR.cobre, roughness: 0.34, roughnessMap: escovado, metalness: 1, envMapIntensity: 1.4, transparent: true });
  const ctx = { geoVidro, geoLiquido, geoRotulo, geoRolha, geoTampa, geoColar, matVidro, matRolha, matCobre };

  function criarGarrafa(cores, alvo, rotulo, principalRotuloAlto) {
    const g = new THREE.Group();
    g.rotation.order = 'ZYX'; // gira em torno do próprio eixo e SÓ DEPOIS inclina
    const vidro = new THREE.Mesh(ctx.geoVidro, ctx.matVidro); vidro.renderOrder = 2; g.add(vidro);
    const u = uniformsLiquido(cores, alvo);
    const matLiq = materialLiquido(cores, u);
    const liq = new THREE.Mesh(ctx.geoLiquido, matLiq); liq.position.y = -1.20; g.add(liq); // OPACO de propósito: entra no passe de transmissão
    const maps = texturasRotulo(rotulo, alta && principalRotuloAlto);
    const matRot = new THREE.MeshStandardMaterial({ map: maps.cor, roughnessMap: maps.rug, metalnessMap: maps.met, bumpMap: maps.rel, bumpScale: alta ? 0.9 : 0.5, roughness: 1, metalness: 1, transparent: true, opacity: 1 });
    const rot = new THREE.Mesh(ctx.geoRotulo, matRot); rot.position.y = -0.42; rot.renderOrder = 3; g.add(rot);
    const rolha = new THREE.Mesh(ctx.geoRolha, ctx.matRolha); g.add(rolha);
    const tampa = new THREE.Mesh(ctx.geoTampa, ctx.matCobre); g.add(tampa);
    const colar = new THREE.Mesh(ctx.geoColar, ctx.matCobre); g.add(colar);
    const bolhas = criarBolhas(alta ? 16 : 9); bolhas.im.visible = false; g.add(bolhas.im);
    return { g, vidro, liq, matLiq, u, matRot, maps, bolhas, rot };
  }

  const principal = criarGarrafa(COR.liquido.violeta, COR.liquido.rose, 'ORIGINAL · 44% ALC. · 750 ML', true);
  scene.add(principal.g);
  const variantes = [
    criarGarrafa(COR.liquido.rose, COR.liquido.rose, 'ROSÉ · 42% ALC. · 750 ML', false),
    criarGarrafa(COR.liquido.ambar, COR.liquido.ambar, 'RESERVA · 46% ALC. · 750 ML', false),
  ];
  for (const v of variantes) { v.g.visible = false; scene.add(v.g); }
  const garrafas = [principal, ...variantes];

  // Malha (cap. 06): geometria de construção em resolução de leitura, não a malha final (que viraria uma silhueta sólida)
  const geoVidroFio = new THREE.LatheGeometry(perfilGarrafa(), 28);
  const geoLiquidoFio = new THREE.LatheGeometry(perfilLiquido(), 20);
  const matFio = new THREE.MeshBasicMaterial({ wireframe: true, color: COR.cobre, transparent: true, opacity: 0, depthWrite: false });
  const matFioLiq = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x8A8FD8, transparent: true, opacity: 0, depthWrite: false });
  const fio = new THREE.Group(); fio.rotation.order = 'ZYX';
  fio.add(new THREE.Mesh(geoVidroFio, matFio));
  const fioLiq = new THREE.Mesh(geoLiquidoFio, matFioLiq); fioLiq.position.y = -1.20; fio.add(fioLiq);
  fio.visible = false; scene.add(fio);
  const grade = new THREE.GridHelper(16, 32, 0xD9A57F, 0x3C332C);
  grade.material.transparent = true; grade.material.opacity = 0; grade.visible = false; scene.add(grade);

  const bots = criarBotanicos(perfil);
  scene.add(bots.grupo);
  const dummy = new THREE.Object3D();
  const foco = [0, 0, 0, 0, 0, 0, 0];
  const qInv = new THREE.Quaternion(), dirLocal = new THREE.Vector3();
  const slotsCur = garrafas.map(() => ({ x: 0, y: 0, z: 0, s: 1, r: 0 }));

  let inicio = 0, tempo = 0, spinAcc = 0, parX = 0, parY = 0;
  let quadros = 0, fpsMarca = 0, fps = 0, lentoDesde = 0;
  let W = 1, H = 1, tanMeio = Math.tan(13 * Math.PI / 180);

  function redimensionar() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, true); // canvas em px reais: captura e impressão não esticam o quadro
    camera.aspect = W / H;
    camera.fov = camera.aspect < 0.85 ? 40 : camera.aspect < 1.2 ? 32 : 26; // ~65 a 85 mm no desktop
    camera.updateProjectionMatrix();
    tanMeio = Math.tan(camera.fov / 2 * Math.PI / 180);
  }
  redimensionar();

  function atualizarBolhas(bo, dtv, forca, quat, topo, t) {
    if (forca < 0.01) { bo.im.visible = false; return; }
    bo.im.visible = true;
    qInv.copy(quat).invert(); dirLocal.set(0, 0, 1).applyQuaternion(qInv);
    const frente = Math.atan2(dirLocal.z, dirLocal.x);
    for (let i = 0; i < bo.b.length; i++) {
      const b = bo.b[i];
      b.y += b.v * dtv * (0.6 + forca);
      if (b.y > topo - 0.06) b.y = -1.1;
      const ang = frente + b.off, r = rVidro(b.y) * 0.9 + 0.022;
      dummy.position.set(Math.cos(ang) * r, b.y + Math.sin(t * 1.3 + b.w) * 0.01, Math.sin(ang) * r);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(b.s * forca * (0.6 + 0.4 * clamp((b.y + 1.1) / (topo + 1.1), 0, 1)));
      dummy.updateMatrix(); bo.im.setMatrixAt(i, dummy.matrix);
    }
    bo.im.instanceMatrix.needsUpdate = true;
  }
  function atualizarBotanicos(t, p, spread, vis, inp, dt) {
    let focoMax = 0;
    for (let k = 0; k < 7; k++) { const alvo = inp.botFocus === k ? 1 : 0; foco[k] += (alvo - foco[k]) * Math.min(1, dt * 4); if (foco[k] > focoMax) focoMax = foco[k]; }
    for (const it of bots.itens) {
      const f = foco[it.t];
      const a = it.ph + t * it.sp * p.botSpeed * lerp(1, 0.25, f);
      // A órbita não invade a faixa da régua (borda direita): limite = meia largura visível menos 0.7 unidade.
      const limX = tanMeio * (camera.position.z - (p.botCz + Math.sin(a) * it.r * spread * 0.65)) * camera.aspect - 0.7;
      const ox = Math.min(limX, p.botCx + Math.cos(a) * it.r * spread), oy = p.botCy + it.h * spread * 0.85 + Math.sin(t * 0.8 + it.bob) * 0.06, oz = p.botCz + Math.sin(a) * it.r * spread * 0.65;
      const fx = p.fx + it.dx, fy = p.fy + it.dy + Math.sin(t * 0.9 + it.bob) * 0.04, fz = p.fz + it.dz;
      dummy.position.set(lerp(ox, fx, f), lerp(oy, fy, f), lerp(oz, fz, f));
      const rs = lerp(1, 0.3, f);
      dummy.rotation.set(t * it.rx * rs + it.ph, t * it.ry * rs, t * it.rz * rs);
      const dim = lerp(1, 0.72, clamp(focoMax - f, 0, 1));
      dummy.scale.setScalar(Math.max(0.0001, it.esc * vis * lerp(1, 1.9, f) * dim));
      dummy.updateMatrix(); it.im.setMatrixAt(it.i, dummy.matrix);
    }
    for (const im of bots.grupo.children) im.instanceMatrix.needsUpdate = true;
  }

  function render(p, dt, now, inp) {
    inp = inp || {};
    if (!inicio) inicio = now;
    const T = (now - inicio) / 1000;
    // Entrada: exposição → filete de cobre na tampa → reflexos → violeta enche → rótulo → botânicos
    const iExpo = reduced ? 1 : out3(clamp(T / 0.7, 0, 1));
    const iCobre = reduced ? 1 : out3(clamp((T - 0.15) / 1.0, 0, 1));
    const iEnv = reduced ? 1 : out3(clamp((T - 0.35) / 1.0, 0, 1));
    const iEnche = reduced ? 1 : lerp(0.04, 1, out3(clamp((T - 0.5) / 1.5, 0, 1)));
    const iRot = reduced ? 1 : out3(clamp((T - 1.3) / 0.6, 0, 1));
    const iBot = reduced ? 1 : out3(clamp((T - 1.2) / 1.5, 0, 1));
    const bolhasIntro = reduced ? 0 : sstep(0.7, 1.4, T) * (1 - sstep(3.2, 4.8, T));
    const vel = reduced ? 0 : velocidade;
    const dtv = inp.freeze ? 0 : dt * vel;
    tempo += dtv;
    const pe = inp.parallax === false ? 0 : 1;
    parX += (((inp.px || 0) * pe) - parX) * Math.min(1, dt * 3.5);
    parY += (((inp.py || 0) * pe) - parY) * Math.min(1, dt * 3.5);

    camera.position.set(parX * 0.14, p.camY - parY * 0.07, p.camZ);
    camera.lookAt(0, p.camY - 0.35, 0);
    renderer.toneMappingExposure = lerp(0.12, 1.0, iExpo);
    chave.intensity = 1.9 * iExpo;
    matVidro.envMapIntensity = (alta ? 1.25 : 1.7) * iEnv;
    matCobre.envMapIntensity = 1.4 * lerp(0.35, 1, iEnv);

    // Posições: pose ou vagas do trio (com amortecimento próprio para a troca de expressão)
    const trio = clamp(p.trio, 0, 1), te = trio * trio * (3 - 2 * trio);
    const hw = tanMeio * (p.camZ - p.bz) * camera.aspect;
    const foc = ((inp.trioFocus | 0) % 3 + 3) % 3;
    for (let k = 0; k < 3; k++) {
      const rel = (k - foc + 4) % 3; // 0 esquerda · 1 centro · 2 direita
      let tx, ty, tz, ts, tr;
      if (inp.trioSingle) { tx = p.bx + (rel - 1) * hw * 2.4; ty = p.by; tz = p.bz; ts = rel === 1 ? 1 : 0.6; tr = 0; }
      else { tx = p.bx + (rel - 1) * hw * 0.42; ty = rel === 1 ? p.by : p.by - 0.12; tz = rel === 1 ? p.bz + 0.2 : p.bz - 1.0; ts = rel === 1 ? 1 : 0.86; tr = rel === 1 ? 0 : rel === 0 ? 0.38 : -0.38; }
      const s = slotsCur[k];
      const kk = te > 0.001 ? 1 - Math.pow(1 - 0.075, dt * 60) : 1;
      s.x += (tx - s.x) * kk; s.y += (ty - s.y) * kk; s.z += (tz - s.z) * kk; s.s += (ts - s.s) * kk; s.r += (tr - s.r) * kk;
    }
    // Rotação: pose de repouso + balanço leve + giro só quando o capítulo pede
    spinAcc += dtv * p.spin;
    if (p.spin < 0.01) { const alvo = Math.round(spinAcc / TAU) * TAU; spinAcc += (alvo - spinAcc) * Math.min(1, dt * 2.5); }
    const sway = Math.sin(tempo * 0.35) * p.sway;
    const G = principal.g, s0 = slotsCur[0];
    const bx = lerp(p.bx, s0.x, te), by = lerp(p.by, s0.y, te), bz = lerp(p.bz, s0.z, te);
    G.position.set(bx, by, bz);
    G.rotation.set(0, p.yaw + sway + spinAcc + parX * 0.12 + s0.r * te, p.brz);
    const escala = p.bs * lerp(0.94, 1, iExpo) * lerp(1, s0.s, te);
    G.scale.setScalar(Math.max(0.001, escala));
    principal.liq.scale.y = iEnche;
    const liq = clamp(inp.liq || 0, 0, 1);
    principal.u.uFront.value = liq; principal.u.uTime.value = tempo;
    principal.u.uBand.value = sstep(0.02, 0.15, liq) * (1 - sstep(0.85, 1, liq));
    principal.u.uGlow.value = 0.22 * lerp(0.6, 1, clamp(p.glow, 0, 1));
    contraluz.position.set(bx - 0.5, by + 0.7, bz - 2.3);
    contraluz.intensity = 18 * iEnv * (1 + 0.6 * principal.u.uBand.value);
    cobreLuz.position.set(bx + 1.0, lerp(by + 2.1 * escala, by - 1.9, iCobre), bz + 2.2);
    cobreLuz.intensity = lerp(11, 5, iCobre) * iExpo;
    const topo = -1.20 + ALT_LIQ * iEnche;
    const bub = Math.max(bolhasIntro, sstep(0.02, 0.2, liq) * (1 - sstep(0.7, 0.95, liq)));
    atualizarBolhas(principal.bolhas, dtv, bub, G.quaternion, topo, tempo);

    variantes.forEach((v, k) => {
      const vis = te > 0.003;
      v.g.visible = vis; if (!vis) return;
      const s = slotsCur[k + 1];
      v.g.position.set(lerp(bx, s.x, te), lerp(by - 0.1, s.y, te), lerp(bz - 0.8, s.z, te));
      v.g.scale.setScalar(Math.max(0.001, p.bs * s.s * te));
      v.g.rotation.set(0, sway * 0.6 + s.r + parX * 0.12, 0);
      v.liq.scale.y = iEnche; v.u.uTime.value = tempo; v.u.uGlow.value = 0.2;
      v.bolhas.im.visible = false;
    });

    // Botânicos: órbita (herbário) ou foco em um espécime
    const spread = lerp(3.2, p.botSpread, iBot);
    const vis = clamp(p.botVis, 0, 1) * iBot;
    bots.grupo.visible = vis > 0.003;
    if (bots.grupo.visible) atualizarBotanicos(tempo, p, spread, vis, inp, dt);

    // Título refratado
    const hwT = tanMeio * (p.camZ + 1.3) * camera.aspect;
    const larg = hwT * 2 * (camera.aspect < 0.85 ? 0.94 : 0.64);
    titulo.scale.set(larg, larg / 4, 1);
    titulo.material.color.copy(corFundo).lerp(corTitulo, clamp(p.title, 0, 1) * iExpo);
    titulo.visible = clamp(p.title, 0, 1) * iExpo > 0.004;
    titulo.position.set(p.tX, p.tY, -1.3);
    fundo.position.set(bx * 2.6, by * 2.6 + 0.6, -14);
    const gl = clamp(p.glow, 0, 1);
    fundo.material.color.setScalar(lerp(0.35, 1, gl));

    // Malha
    const w = clamp(p.wire, 0, 1);
    matVidro.opacity = 1 - w;
    principal.liq.visible = w < 0.5;
    matRolha.opacity = 1 - w; matCobre.opacity = 1 - w;
    principal.matRot.opacity = iRot * (1 - w);
    principal.matRot.transparent = iRot < 1 || w > 0;
    G.visible = w < 0.995;
    fio.visible = w > 0.004;
    if (fio.visible) {
      fio.position.copy(G.position); fio.rotation.copy(G.rotation); fio.scale.copy(G.scale);
      matFio.opacity = 0.7 * w; matFioLiq.opacity = 0.4 * w; fioLiq.scale.y = iEnche;
    }
    grade.visible = w > 0.004 && p.grid > 0;
    grade.material.opacity = 0.55 * w * clamp(p.grid, 0, 1);

    // Chão, sombra de contato e poça de luz (só quando a garrafa está apoiada)
    const rest = clamp(p.rest, 0, 1) * (1 - w * 0.6) * iExpo;
    const baseY = by - 1.5 * escala;
    chao.position.set(bx, baseY - 0.004, bz - 1); chao.material.opacity = rest * 0.9;
    grade.position.y = baseY - 0.002;
    sombra.position.set(bx, baseY - 0.001, bz); sombra.scale.setScalar(escala); sombra.material.opacity = rest * 0.9;
    poca.position.set(bx - 0.2, baseY, bz - 0.6); poca.scale.setScalar(escala); poca.material.opacity = rest * 0.16 * gl;
    variantes.forEach((v) => { v.g.visible = v.g.visible && te > 0.003; });

    // Ciano da Kyber (cap. 07): um reflexo, não uma pintura azul
    const cy = clamp(p.cyan, 0, 1);
    ciano.intensity = 14 * cy; ciano.position.set(bx + 2.0, by + 1.4, bz + 1.4);
    brilho3.material.opacity = 0.3 * cy; brilho3.position.set(bx + 1.6, by + 1.0, -2.0);

    // Atmosfera
    brilho.material.opacity = 0.36 * gl; brilho.position.set(bx * 0.5, by * 0.5 + 0.2, -2.6);
    brilho2.material.opacity = 0.2 * gl; brilho2.position.set(bx * 0.5 + 1.4, by * 0.5 - 1.4, -2.2);
    const fog = clamp(p.fog, 0, 1);
    nevoas.forEach((m, i) => { m.material.map.offset.x += dtv * (0.005 + i * 0.003); m.material.opacity = (0.045 + i * 0.02) * lerp(0.3, 1.2, fog) * iExpo; });
    const arr = geoPart.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) { arr[i] += dtv * 0.04; if (arr[i] > 4) arr[i] = -4; }
    geoPart.attributes.position.needsUpdate = true;
    particulas.material.opacity = 0.35 * (0.4 + 0.6 * gl) * iExpo;

    renderer.render(scene, camera);
    quadros++;
    if (now - fpsMarca > 1000) {
      fps = Math.round(quadros * 1000 / (now - fpsMarca)); quadros = 0; fpsMarca = now;
      // Degradação elegante: se o quadro cair de forma sustentada, reduz DPR (nunca abaixo de 1).
      if (fps < 38 && fps > 0 && !inp.freeze) { lentoDesde++; } else lentoDesde = 0;
      if (lentoDesde >= 3 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); redimensionar(); lentoDesde = 0; if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5; }
    }
  }

  function stats() {
    return { tris: renderer.info.render.triangles, calls: renderer.info.render.calls, fps, w: canvas.width, h: canvas.height, dpr, profile: perfil };
  }
  function setOptions(o) { if (o && typeof o.speed === 'number') velocidade = o.speed; }
  function destroy() {
    const mapas = ['map', 'roughnessMap', 'metalnessMap', 'bumpMap', 'alphaMap', 'envMap'];
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m) for (const mm of Array.isArray(m) ? m : [m]) { for (const k of mapas) if (mm[k] && mm[k] !== env) mm[k].dispose(); mm.dispose(); }
    });
    env.dispose();
    renderer.dispose();
  }

  return { render, stats, setOptions, resize: redimensionar, destroy, profile: perfil };
}
