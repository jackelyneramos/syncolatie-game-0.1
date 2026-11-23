// ============================================================================
// ajustes.js  —  carregue DEPOIS de jogo.js (no index.html):
//   <script src="js/jogo.js"></script>
//   <script src="js/ajustes.js"></script>
//   <script src="js/corrida.js"></script>
//
// O que este arquivo corrige:
//  1) PELE ESCURA BORRADA: nova recolorir() com máscara suave de pele, referência
//     de brilho única (corpo e rosto ficam do mesmo tom) e contorno que acompanha o tom.
//  2) ROUPA TORTA: toda peça da mesma categoria usa a MESMA escala (antes cada peça
//     era esticada para caber numa caixa, então ficavam com tamanhos diferentes).
//  3) MODO DE AJUSTE (F2): mexe peça por peça ou categoria inteira, com as setas.
// ============================================================================

const AJ = {};            // ajustes: "gen/cat" (categoria) e "gen/cat/indice" (peça) -> {dx, dy, k}
const ESC_CAT = {};       // escala única por categoria
const REF_PELE = {};      // brilho de referência da pele, por gênero
let MODO_AJUSTE = false, AJ_CAMADA = 'top', AJ_ESCOPO = 'peca';
// Estes recortes já são conjuntos completos (blusa e saia/calça no mesmo PNG).
// A camada inferior selecionada continua salva, mas fica escondida enquanto o conjunto estiver vestido.
const CONJUNTOS_COMPLETOS = {
  0: new Set([5, 6, 7, 9, 11, 13, 14]), // mulher
  1: new Set([8, 13, 14, 15])           // homem
};

/* ---------------- 1) Pele ---------------- */
const _lum = (r, g, b) => .299 * r + .587 * g + .114 * b;
const _cl = (v) => Math.max(0, Math.min(1, v));
function pesoPele(r, g, b) {                       // 0..1: o quanto o pixel é "pele"
  if (!(r >= g - 3 && g >= b - 6)) return 0;
  return _cl((_lum(r, g, b) - 75) / 35) * _cl((r - b - 10) / 12);
}
function refPeleDe(p) {                            // brilho médio da pele original
  let s = 0, n = 0;
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 0 && pesoPele(p[i], p[i + 1], p[i + 2]) > .9) { s += _lum(p[i], p[i + 1], p[i + 2]); n++; }
  return n ? s / n : 200;
}
function pintarPele(p, alvo, ref) {
  const tl = _lum(alvo[0], alvo[1], alvo[2]);
  const kc = Math.min(1, .45 + .55 * Math.min(1, tl * 1.6 / ref));   // contorno acompanha o tom
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    const r = p[i], g = p[i + 1], b = p[i + 2], L = _lum(r, g, b), w = pesoPele(r, g, b);
    if (w > 0) {
      const f = Math.max(.55, Math.min(1.2, L / ref));
      p[i]     = r * (1 - w) + Math.min(255, alvo[0] * f) * w;
      p[i + 1] = g * (1 - w) + Math.min(255, alvo[1] * f) * w;
      p[i + 2] = b * (1 - w) + Math.min(255, alvo[2] * f) * w;
    }
    if (w < .2 && L < 120 && (r - b) > -10) { p[i] *= kc; p[i + 1] *= kc; p[i + 2] *= kc; }
  }
}

function recolorir(im, chave, alvo, modo) {
  const k = chave + '|' + alvo + '|' + modo;
  if (cacheCor[k]) return cacheCor[k];
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  if (modo === 'pele') {
    const gk = String(personagem.genero || 0);
    if (!REF_PELE[gk]) REF_PELE[gk] = refPeleDe(p);          // o corpo é desenhado primeiro
    pintarPele(p, alvo, REF_PELE[gk]);
  } else {                                                    // cabelo / roupa: igual ao original
    let s = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 200) { s += _lum(p[i], p[i + 1], p[i + 2]); n++; }
    const media = (s / n) || 1;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 0) {
      const f = _lum(p[i], p[i + 1], p[i + 2]) / media;
      for (let j = 0; j < 3; j++) p[i + j] = Math.min(255, alvo[j] * f);
    }
  }
  x.putImageData(d, 0, 0); return (cacheCor[k] = c);
}

/* ---------------- 2) Escala única por categoria ---------------- */
function _imgSeguro(url) {                          // não trava se faltar um arquivo
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
}
async function escalaCat(cat, n, maxW, maxH) {
  const k = (personagem.genero || 0) + '/' + cat;
  if (ESC_CAT[k]) return ESC_CAT[k];
  const ims = await Promise.all(Array.from({ length: n }, (_, i) => _imgSeguro(base() + cat + '/' + i + '.png')));
  const v = ims.filter(Boolean).map(im => Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight)).sort((a, b) => a - b);
  return (ESC_CAT[k] = v.length ? v[v.length >> 1] : 1);   // mediana: todas as peças usam a mesma escala
}
function ajuste(cat, i) {                           // soma ajuste da categoria + ajuste da peça
  const g = personagem.genero || 0, p = AJ[`${g}/${cat}/${i}`] || {}, c = AJ[`${g}/${cat}`] || {};
  return { dx: (p.dx || 0) + (c.dx || 0), dy: (p.dy || 0) + (c.dy || 0), k: (p.k || 1) * (c.k || 1) };
}

async function desenhar() {
  if (!M) return;
  if (desenhando) { refazer = true; return; }
  desenhando = true;
  try {
    const s = personagem, C = M.cfg, ctx = canvas.getContext('2d');
    const ld = (cat, i) => (i === null || i === undefined ? null : carregar(cat, i));
    const [corpo, rosto, cabelo, sapato, top, bot, ac] = await Promise.all([carregar('corpo', 0), carregar('rosto', s.rosto),
      ld('cabelo', s.cabelo), ld('calcado', s.sapato), ld('top', s.top), ld('bottom', s.bottom), ld('acess', s.acess)]);
    if (!corpo || !rosto) return;
    const rgb = (lista, i) => (i === null || i === undefined ? null : lista[i]);
    const peca = (im, cat, i, cor, modo) => im && cor ? recolorir(im, s.genero + cat + i, cor, modo) : im;
    const pele = rgb(M.pele, s.pele);
    const bw = corpo.naturalWidth * C.esc, bh = corpo.naturalHeight * C.esc, pe = BT + bh + C.shoeD;
    const [eTop, eBot, eSap] = await Promise.all([
      escalaCat('top', M.top.length, bw * .94, bh * .34),
      escalaCat('bottom', M.bottom.length, bw * .96, bh * .42),
      escalaCat('calcado', M.calcado.length, bw * .68, bh * .19)]);
    const R = 880 / (pe - (BT + C.topo));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(R, 0, 0, R, 520 - CX * R, 1220 - pe * R); ctx.imageSmoothingQuality = 'high';
    const tam = (im) => [im.naturalWidth || im.width, im.naturalHeight || im.height];
    const cam = (im, w, h, dx, t) => ctx.drawImage(im, CX + dx - w / 2, t, w, h);
    const pecaUnica = (im, cat, i, cor, esc, t) => {           // escala única + ajuste fino
      const p = peca(im, cat, i, cor, 'cor'), [iw, ih] = tam(p), a = ajuste(cat, i);
      cam(p, iw * esc * a.k, ih * esc * a.k, a.dx, t + a.dy);
    };
    cam(peca(corpo, 'corpo', 0, pele, 'pele'), bw, bh, 0, BT);
    if (sapato) {
      const [sw, sh] = tam(sapato), a = ajuste('calcado', s.sapato), e = eSap * a.k;
      cam(sapato, sw * e, sh * e, a.dx, BT + bh - sh * e + C.shoeD + a.dy);
    }
    const conjuntoCompleto = CONJUNTOS_COMPLETOS[s.genero || 0]?.has(s.top);
    if (bot && !conjuntoCompleto) pecaUnica(bot, 'bottom', s.bottom, rgb(M.extra, s.corBottom), eBot, BT + bh * C.botF);
    if (top) pecaUnica(top, 'top', s.top, rgb(M.extra, s.corTop), eTop, BT + bh * C.topF);
    { const [rw, rh] = tam(rosto), a = ajuste('rosto', s.rosto);
      cam(peca(rosto, 'rosto', s.rosto, pele, 'pele'), rw * C.faceS * a.k, rh * C.faceS * a.k, a.dx, BT + C.faceT + a.dy); }
    if (cabelo) { const p = peca(cabelo, 'cabelo', s.cabelo, rgb(M.corhair, s.corCabelo), 'cor'), [hw, hh] = tam(p), a = ajuste('cabelo', s.cabelo);
      cam(p, hw * C.hairS * a.k, hh * C.hairS * a.k, a.dx, BT + C.hairT + a.dy); }
    if (ac) { const c = M.acess[s.acess], a = ajuste('acess', s.acess);
      cam(ac, c.w * c.s * a.k, c.h * c.s * a.k, c.dx + a.dx, BT + c.t + a.dy); }
    if (MODO_AJUSTE) {                                          // guias: centro e caixa do corpo
      ctx.save(); ctx.lineWidth = 1 / R; ctx.strokeStyle = 'rgba(0,160,255,.9)'; ctx.setLineDash([4 / R, 4 / R]);
      ctx.beginPath(); ctx.moveTo(CX, BT - 10); ctx.lineTo(CX, BT + bh + 10); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,200,120,.8)'; ctx.strokeRect(CX - bw / 2, BT, bw, bh); ctx.restore();
    }
  } finally { desenhando = false; }
  if (refazer) { refazer = false; desenhar(); }
}

/* ---------------- 3) Modo de ajuste (F2) ---------------- */
const CAMADAS = { 1: ['top', 'top', 'ROUPA DE CIMA'], 2: ['bottom', 'bottom', 'ROUPA DE BAIXO'], 3: ['calcado', 'sapato', 'CALÇADO'],
                  4: ['cabelo', 'cabelo', 'CABELO'], 5: ['rosto', 'rosto', 'ROSTO'], 6: ['acess', 'acess', 'ACESSÓRIO'] };
const hudAj = document.createElement('div');
hudAj.style.cssText = 'position:absolute;left:1%;bottom:1%;z-index:9;display:none;padding:.6em .9em;border-radius:10px;' +
  'background:rgba(20,10,40,.88);color:#fff;font:600 13px/1.5 system-ui,sans-serif;white-space:pre;pointer-events:none';
telaPers.appendChild(hudAj);

function chaveAj() {
  const [cat, campo] = CAMADAS[Object.keys(CAMADAS).find(n => CAMADAS[n][0] === AJ_CAMADA)];
  const g = personagem.genero || 0, i = personagem[campo];
  return AJ_ESCOPO === 'peca' ? `${g}/${cat}/${i}` : `${g}/${cat}`;
}
function hud() {
  hudAj.style.display = MODO_AJUSTE && atual === 'personalizar' ? 'block' : 'none';
  if (!MODO_AJUSTE) return;
  const nome = Object.values(CAMADAS).find(c => c[0] === AJ_CAMADA)[2], a = AJ[chaveAj()] || { dx: 0, dy: 0, k: 1 };
  hudAj.textContent = `MODO AJUSTE (F2 sai)\n1 cima  2 baixo  3 calçado  4 cabelo  5 rosto  6 acessório\n` +
    `Camada: ${nome}   Escopo: ${AJ_ESCOPO === 'peca' ? 'só esta peça' : 'categoria inteira'}  (Tab troca)\n` +
    `Setas: mover (Shift = 5x)   + / - : tamanho   0: zerar   E: exportar\n` +
    `dx ${(a.dx || 0).toFixed(1)}   dy ${(a.dy || 0).toFixed(1)}   tamanho ${((a.k || 1) * 100).toFixed(0)}%`;
}
function salvarAj() { try { localStorage.setItem('ajustesPecas', JSON.stringify(AJ)); } catch (e) {} }
document.addEventListener('keydown', (e) => {
  if (atual !== 'personalizar') return;
  if (e.key === 'F2') { e.preventDefault(); MODO_AJUSTE = !MODO_AJUSTE; hud(); desenhar(); return; }
  if (!MODO_AJUSTE) return;
  const k = e.key, passo = e.shiftKey ? 5 : 1;
  if (CAMADAS[k]) { AJ_CAMADA = CAMADAS[k][0]; hud(); return; }
  if (k === 'Tab') { e.preventDefault(); AJ_ESCOPO = AJ_ESCOPO === 'peca' ? 'cat' : 'peca'; hud(); return; }
  if (k === 'e' || k === 'E') {
    const json = JSON.stringify(AJ, null, 1); console.log(json);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'ajustes.json'; a.click(); mostrarAviso('ajustes.json baixado: coloque em img/'); return;
  }
  const ch = chaveAj(), a = AJ[ch] || (AJ[ch] = { dx: 0, dy: 0, k: 1 });
  if (k === 'ArrowLeft') a.dx -= passo; else if (k === 'ArrowRight') a.dx += passo;
  else if (k === 'ArrowUp') a.dy -= passo; else if (k === 'ArrowDown') a.dy += passo;
  else if (k === '+' || k === '=') a.k *= e.shiftKey ? 1.05 : 1.01;
  else if (k === '-' || k === '_') a.k /= e.shiftKey ? 1.05 : 1.01;
  else if (k === '0') delete AJ[ch];
  else return;
  e.preventDefault(); salvarAj(); hud(); desenhar();
});

// carrega ajustes salvos: primeiro img/ajustes.json (arquivo), depois o que estiver no navegador
fetch('img/ajustes.json').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(o => {
  Object.assign(AJ, o);
  try { Object.assign(AJ, JSON.parse(localStorage.getItem('ajustesPecas') || '{}')); } catch (e) {}
  if (M) desenhar();
});
