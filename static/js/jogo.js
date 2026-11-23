// Coordenadas em pixels da imagem original (1672 x 941)
const W = 1672, H = 941;
const BASES = ['img/partes/', 'img/partes-m/'];   // 0 = mulher, 1 = homem
const base = () => BASES[personagem.genero || 0];

const INICIAL = {
  jogar:        [572, 442, 1110, 550],
  ranking:      [572, 565, 1110, 668],
  personalizar: [572, 680, 1110, 788]
};
const ABAS = [  // [x1, y1, x2, y2, rótulo, ícone]
  [701, 176, 886, 300, 'CABELO', '💇'], [890, 180, 1067, 291, 'ROUPA', '👕'],
  [1076, 180, 1264, 291, 'ACESSÓRIOS', '🎀'], [1270, 180, 1454, 291, 'PELE', '🙂'],
  [1462, 180, 1622, 291, 'COR', '🎨']
];
const VOLTAR = [[50, 840, 323, 925], [92, 32, 204, 128]];
const CONFIRMAR = [1308, 840, 1632, 925];

// ===== Estado do personagem =====
// Padrão: personagem careca com roupa básica (dá para tirar a roupa)
const padraoG = () => ({ cabelo: null, corCabelo: null, acess: null, top: 1, bottom: 0, sapato: 0,
                         corTop: null, corBottom: null, rosto: 0 });
let personagem = { aba: 0, genero: 0, pele: null, ...padraoG() };

async function carregarPersonagem() {
  try { const r = await fetch('/api/personagem'); if (!r.ok) throw 0; return await r.json(); }
  catch (e) { try { return JSON.parse(localStorage.getItem('personagem') || 'null'); } catch (e2) { return null; } }
}
async function salvarPersonagem() {
  try {
    const r = await fetch('/api/personagem', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                               body: JSON.stringify(personagem) });
    if (!r.ok) throw 0;
  } catch (e) { try { localStorage.setItem('personagem', JSON.stringify(personagem)); } catch (e2) {} }
}

// ===== Utilidades =====
const telaInicial = document.getElementById('tela-inicial');
const telaPers = document.getElementById('tela-personalizar');
const aviso = document.getElementById('aviso');

function posicionar(el, [x1, y1, x2, y2]) {
  el.style.left = (x1 / W * 100) + '%'; el.style.top = (y1 / H * 100) + '%';
  el.style.width = ((x2 - x1) / W * 100) + '%'; el.style.height = ((y2 - y1) / H * 100) + '%';
}
function criarZona(pai, r, rotulo, aoClicar) {
  const b = document.createElement('button');
  b.className = 'zona'; b.setAttribute('aria-label', rotulo); posicionar(b, r);
  b.addEventListener('click', () => { bip(1040); aoClicar(b); });
  pai.appendChild(b); return b;
}
let audioCtx;
function bip(freq = 880) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .12);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + .12);
  } catch (e) {}
}
let timerAviso;
function mostrarAviso(txt) {
  aviso.textContent = txt; aviso.classList.add('mostrar');
  clearTimeout(timerAviso); timerAviso = setTimeout(() => aviso.classList.remove('mostrar'), 1800);
}
let atual = 'inicial';
function irPara(nome) {
  atual = nome;
  telaInicial.classList.toggle('ativa', nome === 'inicial');
  telaPers.classList.toggle('ativa', nome === 'personalizar');
  document.getElementById('tela-jogo').classList.toggle('ativa', nome === 'jogo');
  if (nome === 'personalizar') desenhar();
  if (nome === 'jogo') Corrida.iniciar(); else Corrida.parar();
}

// ===== Tela inicial =====
const botoesInicio = [
  criarZona(telaInicial, INICIAL.jogar, 'Jogar', () => irPara('jogo')),
  criarZona(telaInicial, INICIAL.ranking, 'Ranking', () => mostrarAviso('Ranking (tela ainda não criada)')),
  criarZona(telaInicial, INICIAL.personalizar, 'Personalizar personagem', () => irPara('personalizar'))
];
let idxInicio = 0;
function marcarInicio() { botoesInicio.forEach((b, i) => b.classList.toggle('ativo', i === idxInicio)); }
botoesInicio.forEach((b, i) => b.addEventListener('mouseenter', () => { idxInicio = i; marcarInicio(); bip(660); }));

// ===== Peças do personagem (manifesto + imagens) =====
let M = null, MS = [];              // manifesto atual e os dois (mulher/homem)
const cacheImg = {}, cacheCor = {};
function carregar(cat, i) {
  const k = base() + cat + '/' + i;
  if (!cacheImg[k]) cacheImg[k] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = k + '.png'; });
  return cacheImg[k];
}

// Recolore uma peça (cabelo/roupa: mantém luz e sombra; pele: só os pixels de pele)
function recolorir(im, chave, alvo, modo) {
  const k = chave + '|' + alvo + '|' + modo;
  if (cacheCor[k]) return cacheCor[k];
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const lum = (i) => .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2];
  if (modo === 'pele') {
    const eh = (i) => p[i + 3] > 180 && p[i] > 140 && p[i] > p[i + 1] && p[i + 1] > p[i + 2] && (p[i] - p[i + 2]) > 18;
    let soma = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) if (eh(i)) { soma += lum(i); n++; }
    const media = (soma / n) || 1;
    for (let i = 0; i < p.length; i += 4) if (eh(i)) {
      const f = lum(i) / media;
      for (let j = 0; j < 3; j++) p[i + j] = Math.min(255, alvo[j] * f);
    }
  } else {
    let s = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 200) { s += lum(i); n++; }
    const media = (s / n) || 1;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 0) {
      const f = lum(i) / media;
      for (let j = 0; j < 3; j++) p[i + j] = Math.min(255, alvo[j] * f);
    }
  }
  x.putImageData(d, 0, 0); return (cacheCor[k] = c);
}

// ===== Desenho do personagem (camadas) =====
const canvas = document.createElement('canvas');
canvas.id = 'personagem'; canvas.width = 1040; canvas.height = 1310;
const CX = 87, BT = 24;     // centro e topo do corpo (unidades lógicas); a escala se ajusta ao tamanho do personagem
let desenhando = false, refazer = false;
async function desenhar() {
  if (!M) return;
  if (desenhando) { refazer = true; return; }
  desenhando = true;
  const s = personagem, C = M.cfg, ctx = canvas.getContext('2d');
  const ld = (cat, i) => (i === null || i === undefined ? null : carregar(cat, i));
  const [corpo, rosto, cabelo, sapato, top, bot, ac] = await Promise.all([carregar('corpo', 0), carregar('rosto', s.rosto),
    ld('cabelo', s.cabelo), ld('calcado', s.sapato), ld('top', s.top), ld('bottom', s.bottom), ld('acess', s.acess)]);
  const rgb = (lista, i) => (i === null || i === undefined ? null : lista[i]);
  const peca = (im, cat, i, cor, modo) => cor ? recolorir(im, s.genero + cat + i, cor, modo) : im;
  const pele = rgb(M.pele, s.pele);
  const bw = corpo.naturalWidth * C.esc, bh = corpo.naturalHeight * C.esc, pe = BT + bh + C.shoeD;
  const R = 880 / (pe - (BT + C.topo));      // altura fixa na tela, para o personagem não ficar gigante
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(R, 0, 0, R, 520 - CX * R, 1220 - pe * R); ctx.imageSmoothingQuality = 'high';
  const cam = (im, w, h, dx, t) => ctx.drawImage(im, CX + dx - w / 2, t, w, h);
  const dim = (im, k = 1) => [(im.naturalWidth || im.width) * k, (im.naturalHeight || im.height) * k];
  const vestir = (im, cat, i, cor, maxW, maxH, t) => {
    const p = peca(im, cat, i, cor, 'cor');
    const [iw, ih] = dim(p), escala = Math.min(maxW / iw, maxH / ih);
    cam(p, iw * escala, ih * escala, 0, t);
  };
  cam(peca(corpo, 'corpo', 0, pele, 'pele'), bw, bh, 0, BT);
  if (sapato) {
    const [sw, sh] = dim(sapato), escalaSapato = Math.min(bw * .68 / sw, bh * .19 / sh);
    cam(sapato, sw * escalaSapato, sh * escalaSapato, 0, BT + bh - sh * escalaSapato + C.shoeD);
  }
  if (bot) vestir(bot, 'bottom', s.bottom, rgb(M.extra, s.corBottom), bw * .96, bh * .42, BT + bh * C.botF);
  if (top) vestir(top, 'top', s.top, rgb(M.extra, s.corTop), bw * .94, bh * .34, BT + bh * C.topF);
  cam(peca(rosto, 'rosto', s.rosto, pele, 'pele'), ...dim(rosto, C.faceS), 0, BT + C.faceT);
  if (cabelo) cam(peca(cabelo, 'cabelo', s.cabelo, rgb(M.corhair, s.corCabelo), 'cor'), ...dim(cabelo, C.hairS), 0, BT + C.hairT);
  if (ac) { const c = M.acess[s.acess]; cam(ac, c.w * c.s, c.h * c.s, c.dx, BT + c.t); }
  desenhando = false;
  if (refazer) { refazer = false; desenhar(); }
}

// ===== Painel ao vivo =====
const painel = document.createElement('div'); painel.id = 'painel';
const abasEl = ABAS.map((a, i) => {
  const b = document.createElement('button'); b.className = 'aba';
  b.innerHTML = `<span class="ico">${a[5]}</span><span>${a[4]}</span>`; posicionar(b, a.slice(0, 4));
  b.addEventListener('click', () => { bip(900); personagem.aba = i; montarPainel(); });
  return b;
});

function secao(titulo) { const h = document.createElement('h3'); h.textContent = titulo; painel.appendChild(h); }
// chave = campo do estado; cat = pasta das imagens (ou null para cores); lista = cores; n = quantidade
function grade(chave, { cat, cores, n, colunas, nenhum }) {
  const g = document.createElement('div'); g.className = 'grade';
  g.style.gridTemplateColumns = `repeat(${colunas},1fr)`;
  const itens = [];
  const add = (valor, conteudo, extra) => {
    const b = document.createElement('button'); b.className = 'item' + (extra || '');
    if (typeof conteudo === 'string' && conteudo.startsWith('rgb')) b.style.background = conteudo; else if (conteudo) b.append(conteudo);
    b.classList.toggle('on', personagem[chave] === valor);
    b.addEventListener('click', () => { bip(1040); personagem[chave] = valor; itens.forEach(([v, el]) => el.classList.toggle('on', v === valor)); desenhar(); });
    g.appendChild(b); itens.push([valor, b]);
  };
  if (nenhum) add(null, document.createTextNode('🚫'), cores ? ' cor' : '');
  for (let i = 0; i < n; i++) {
    if (cores) { const [r, gg, b] = cores[i]; add(i, `rgb(${r},${gg},${b})`, ' cor'); }
    else { const im = new Image(); im.src = base() + cat + '/' + i + '.png'; im.loading = 'lazy'; add(i, im); }
  }
  painel.appendChild(g);
}
function montarPainel() {
  if (!M) return;
  abasEl.forEach((b, i) => b.classList.toggle('on', i === personagem.aba));
  painel.innerHTML = ''; painel.scrollTop = 0;
  const gb = document.createElement('div'); gb.className = 'generos';
  [['👩 MULHER', 0], ['👨 HOMEM', 1]].forEach(([txt, g]) => {
    const b = document.createElement('button'); b.className = 'gen' + (personagem.genero === g ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', () => { if (personagem.genero === g) return; bip(900); personagem = { ...personagem, genero: g, ...padraoG() }; M = MS[g]; montarPainel(); desenhar(); });
    gb.appendChild(b);
  });
  painel.appendChild(gb);
  switch (personagem.aba) {
    case 0:
      secao('ESTILO DE CABELO'); grade('cabelo', { cat: 'cabelo', n: M.cabelo.length, colunas: 7, nenhum: true });
      secao('COR DO CABELO'); grade('corCabelo', { cores: M.corhair, n: M.corhair.length, colunas: 10, nenhum: true });
      secao('ACESSÓRIOS DE CABELO'); grade('acess', { cat: 'acess', n: M.acess.length, colunas: 7, nenhum: true }); break;
    case 1:
      const tr = document.createElement('button'); tr.className = 'tirar'; tr.textContent = '🚫 TIRAR TODA A ROUPA';
      tr.addEventListener('click', () => { bip(500); Object.assign(personagem, { top: null, bottom: null, sapato: null }); montarPainel(); desenhar(); });
      painel.appendChild(tr);
      secao('PARTE DE CIMA'); grade('top', { cat: 'top', n: M.top.length, colunas: 7, nenhum: true });
      secao('PARTE DE BAIXO'); grade('bottom', { cat: 'bottom', n: M.bottom.length, colunas: 7, nenhum: true });
      secao('CALÇADOS'); grade('sapato', { cat: 'calcado', n: M.calcado.length, colunas: 7, nenhum: true }); break;
    case 2:
      secao('ACESSÓRIOS'); grade('acess', { cat: 'acess', n: M.acess.length, colunas: 7, nenhum: true }); break;
    case 3:
      secao('TOM DE PELE'); grade('pele', { cores: M.pele, n: M.pele.length, colunas: 10, nenhum: true });
      secao('EXPRESSÃO'); grade('rosto', { cat: 'rosto', n: M.rosto.length, colunas: 6 }); break;
    case 4:
      secao('COR DA PARTE DE CIMA'); grade('corTop', { cores: M.extra, n: M.extra.length, colunas: 10, nenhum: true });
      secao('COR DA PARTE DE BAIXO'); grade('corBottom', { cores: M.extra, n: M.extra.length, colunas: 10, nenhum: true }); break;
  }
}

// ===== Montagem da tela de personalizar =====
telaPers.append(canvas, painel, ...abasEl);
const plat = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
plat.setAttribute('class', 'plataforma'); plat.setAttribute('viewBox', `0 0 ${W} ${H}`);
plat.innerHTML = `<ellipse cx="350" cy="792" rx="262" ry="58" fill="#e4a7fd" stroke="#b57af8" stroke-width="5"/>
  <ellipse cx="350" cy="790" rx="222" ry="44" fill="#f8e0fd" stroke="#cb8dfb" stroke-width="4"/>
  <ellipse cx="350" cy="790" rx="190" ry="35" fill="#cfc0fd" stroke="#ac7af8" stroke-width="4"/>`;
telaPers.insertBefore(plat, canvas);
VOLTAR.forEach(r => criarZona(telaPers, r, 'Voltar', () => irPara('inicial')));
criarZona(telaPers, CONFIRMAR, 'Confirmar', async () => {
  await salvarPersonagem(); mostrarAviso('Personagem salvo!'); setTimeout(() => irPara('inicial'), 700);
});

// ===== Teclado =====
document.addEventListener('keydown', (e) => {
  if (atual === 'inicial') {
    if (e.key === 'ArrowDown') { idxInicio = (idxInicio + 1) % 3; marcarInicio(); bip(660); }
    else if (e.key === 'ArrowUp') { idxInicio = (idxInicio + 2) % 3; marcarInicio(); bip(660); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); botoesInicio[idxInicio].click(); }
  } else if (atual === 'jogo') Corrida.tecla(e);
  else if (e.key === 'Escape') irPara('inicial');
});

// ===== Início =====
Promise.all([...BASES.map(b => fetch(b + 'manifest.json').then(r => r.json())), carregarPersonagem()]).then(([mf, mh, salvo]) => {
  MS = [mf, mh]; if (salvo) Object.assign(personagem, salvo); M = MS[personagem.genero || 0];
  montarPainel(); desenhar();
});
