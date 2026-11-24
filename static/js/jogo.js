// Coordenadas em pixels da imagem original (1672 x 941)
const W = 1672, H = 941;
const BASES = ['img/partes/', 'img/partes-m/'];   // 0 = mulher, 1 = homem
const base = () => BASES[personagem.genero || 0];

const INICIAL = {
  jogar:        [572, 442, 1110, 550],
  ranking:      [572, 565, 1110, 668],
  personalizar: [572, 680, 1110, 788]
};
const ABAS = [  // [x1, y1, x2, y2, rÃ³tulo, Ã­cone]
  [701, 176, 886, 300, 'CABELO', 'ðŸ’‡'], [890, 180, 1067, 291, 'ROUPA', 'ðŸ‘•'],
  [1076, 180, 1264, 291, 'ACESSÃ“RIOS', 'ðŸŽ€'], [1270, 180, 1454, 291, 'PELE', 'ðŸ™‚'],
  [1462, 180, 1622, 291, 'COR', 'ðŸŽ¨']
];
const VOLTAR = [[50, 840, 323, 925], [92, 32, 204, 128]];
const CONFIRMAR = [1308, 840, 1632, 925];

// ===== Estado do personagem =====
// PadrÃ£o: personagem careca com roupa bÃ¡sica (dÃ¡ para tirar a roupa)
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
const telaRanking = document.getElementById('tela-ranking'); const telaConfig = document.getElementById('tela-config'); const telaFases = document.getElementById('tela-fases');
const aviso = document.getElementById('aviso');

function posicionar(el, [x1, y1, x2, y2]) {
  el.style.left = (x1 / W * 100) + '%'; el.style.top = (y1 / H * 100) + '%';
  el.style.width = ((x2 - x1) / W * 100) + '%'; el.style.height = ((y2 - y1) / H * 100) + '%';
}
function criarZona(pai, r, rotulo, aoClicar) {
  const b = document.createElement('button');
  b.className = 'zona'; b.setAttribute('aria-label', rotulo); posicionar(b, r);
  b.addEventListener('click', (e) => {
    bip(1040);
    const imagem = b.dataset.botao && document.querySelector(`[data-botao="${b.dataset.botao}"]`);
    if (!imagem) { aoClicar(b); return; }
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.gsap && !reduzido) gsap.timeline().to(imagem, { scale:.93, duration:.09, ease:'power2.out' }).to(imagem, { scale:1, duration:.2, ease:'back.out(2)' });
    if (window.dispararEfeitoClique && e.detail) window.dispararEfeitoClique(e.clientX, e.clientY);
    setTimeout(() => aoClicar(b), 140);
  });
  pai.appendChild(b); return b;
}
let audioCtx, ultimoSomUI = 0;
function bip(freq = 880) { const agora = performance.now(); if (agora - ultimoSomUI < 110) return; ultimoSomUI = agora;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .12);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + .12);
  } catch (e) {}
}
document.addEventListener('pointerdown', e => { if (e.target.closest('button,.zona')) bip(760); }, true); let timerAviso;
function mostrarAviso(txt) {
  aviso.textContent = txt; aviso.classList.add('mostrar');
  clearTimeout(timerAviso); timerAviso = setTimeout(() => aviso.classList.remove('mostrar'), 1800);
}
// Movimento de entrada e flutuação das opções usando GSAP
function animarEntradaTela(nome) {
  if (!window.gsap) return;
  gsap.killTweensOf(document.querySelectorAll('.tela,.config-opcao,.mapa-acoes button,.mapa-titulo,.mapa-voltar,#personagem,#painel'));
  const tela = document.querySelector('.tela.ativa');
  if (!tela) return;
  const itens = tela.querySelectorAll('.zona,.botao-inicial,.ranking-painel,#personagem,#painel,.aba,.config-opcao,.mapa-titulo,.mapa-voltar,.mapa-acoes button');
  gsap.killTweensOf(itens);
  if (itens.length) gsap.fromTo(itens, { y:16, scale:.97, opacity:0 }, { y:0, scale:1, opacity:1, duration:.5, stagger:.035, ease:'back.out(1.45)', clearProps:'opacity' });
  if (nome === 'config-dificuldade' || nome === 'config-musica') { const baixo = nome === 'config-musica'; gsap.fromTo(tela, { backgroundSize:'100% 200%', backgroundPosition:baixo ? 'center bottom' : 'center top' }, { backgroundSize:'102% 204%', backgroundPosition:baixo ? 'center bottom' : 'center top', duration:14, repeat:-1, yoyo:true, ease:'sine.inOut' }); } if (nome === 'config-dificuldade') gsap.to(tela.querySelectorAll('[data-dificuldade]'), { y:-9, duration:1.15, stagger:.15, repeat:-1, yoyo:true, ease:'sine.inOut' });
  if (nome === 'config-musica') gsap.to(tela.querySelectorAll('[data-musica]'), { y:-8, duration:1.1, stagger:.18, repeat:-1, yoyo:true, ease:'sine.inOut' });
  if (nome === 'mapa-fases') gsap.fromTo(tela, { backgroundPosition:'48% 52%', backgroundSize:'106% 106%' }, { backgroundPosition:'52% 48%', backgroundSize:'110% 110%', duration:16, repeat:-1, yoyo:true, ease:'sine.inOut' }); if (nome === 'mapa-fases') gsap.to(tela.querySelectorAll('.mapa-acoes button,.mapa-titulo'), { y:-6, duration:1.5, stagger:.2, repeat:-1, yoyo:true, ease:'sine.inOut' });
  if (nome === 'personalizar') gsap.to(tela.querySelectorAll('#personagem,.aba'), { y:-5, duration:2.4, stagger:.12, repeat:-1, yoyo:true, ease:'sine.inOut' });
} let atual = 'inicial';

// Logo animado com GSAP e particulas 3D decorativas com Three.js.
function iniciarEfeitosInicial() {
  const logo = document.getElementById('logo-bolo');
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.gsap && logo && !movimentoReduzido) {
    gsap.fromTo(logo, { y:24, scale:.88, opacity:0 }, { y:0, scale:1, opacity:1, duration:1.05, delay:.12, ease:'back.out(1.5)' });
    gsap.to(logo, { y:-5, rotation:.25, duration:2.6, repeat:-1, yoyo:true, ease:'sine.inOut', delay:1.2 });
  }
  const canvas = document.getElementById('efeitos-inicial');
  if (!canvas || !window.THREE || movimentoReduzido) return;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1672 / 941, .1, 100); camera.position.z = 18;
    const colors = [0xff75ad, 0xffd66e, 0xffffff, 0xb77cff];
    const candy = new THREE.Group(); scene.add(candy);
    for (let i=0; i<24; i++) {
      const geo = i%3 === 0 ? new THREE.SphereGeometry(.11 + Math.random()*.08, 10, 8) : new THREE.CapsuleGeometry(.055, .12, 3, 6);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:colors[i%colors.length], transparent:true, opacity:.65 }));
      mesh.position.set((Math.random()-.5)*21, (Math.random()-.5)*11, (Math.random()-.5)*4);
      mesh.userData.phase = Math.random()*Math.PI*2; mesh.userData.y = mesh.position.y; candy.add(mesh);
    }
    function resize() { const rect=canvas.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix(); }
    resize(); window.addEventListener('resize', resize);
    const clock3d = new THREE.Clock();
    window.dispararEfeitoClique = (px, py) => {
      const rect = canvas.getBoundingClientRect();
      const distancia = camera.position.z - 2;
      const altura = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distancia;
      const origem = new THREE.Vector3((px / rect.width - .5) * altura * camera.aspect, (.5 - py / rect.height) * altura, 2);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 6, 24), new THREE.MeshBasicMaterial({ color:0xff4d9a, transparent:true, opacity:.95, depthWrite:false }));
      anel.position.copy(origem); scene.add(anel);
      const limpar = () => { scene.remove(anel); anel.geometry.dispose(); anel.material.dispose(); };
      if (window.gsap) {
        gsap.to(anel.scale, { x:3, y:3, z:3, duration:.42, ease:'back.out(1.6)' });
        gsap.to(anel.material, { opacity:0, duration:.4, onComplete:limpar });
      } else setTimeout(limpar, 450);
      for (let i=0; i<8; i++) {
        const particula = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color:colors[i%colors.length], transparent:true, opacity:.95, depthWrite:false }));
        particula.position.copy(origem); scene.add(particula);
        const angulo = Math.PI * 2 * i / 8, alcance = .55 + Math.random() * .35;
        const fim = { x:origem.x + Math.cos(angulo)*alcance, y:origem.y + Math.sin(angulo)*alcance };
        const remover = () => { scene.remove(particula); particula.geometry.dispose(); particula.material.dispose(); };
        if (window.gsap) gsap.to(particula.position, { ...fim, duration:.42, ease:'power2.out' });
        if (window.gsap) gsap.to(particula.material, { opacity:0, duration:.42, onComplete:remover });
        else setTimeout(remover, 450);
      }
    };
    function frame() { if (!canvas.isConnected) return; if (telaInicial.classList.contains('ativa')) { const t=clock3d.getElapsedTime(); candy.children.forEach((m,i)=>{m.position.y=m.userData.y+Math.sin(t*.7+m.userData.phase)*.16; m.rotation.z += .001+(i%4)*.0004;}); renderer.render(scene,camera); } requestAnimationFrame(frame); }
    frame();
  } catch (e) { /* Mantem a tela funcional quando WebGL nao estiver disponivel. */ }
}
iniciarEfeitosInicial();

function irPara(nome) {
  atual = nome;
  telaInicial.classList.toggle('ativa', nome === 'inicial');
  telaPers.classList.toggle('ativa', nome === 'personalizar');
  telaRanking.classList.toggle('ativa', nome === 'ranking'); telaConfig.classList.toggle('ativa', nome === 'config-dificuldade' || nome === 'config-musica'); telaConfig.classList.toggle('escolha-musica', nome === 'config-musica'); telaFases.classList.toggle('ativa', nome === 'mapa-fases');
  document.getElementById('tela-jogo').classList.toggle('ativa', nome === 'jogo');
  if (nome === 'personalizar') desenhar();
  if (nome === 'jogo') Corrida.iniciar(); else Corrida.parar(); animarEntradaTela(nome);
}

// ===== Tela inicial =====
const botoesInicio = [
  criarZona(telaInicial, INICIAL.jogar, 'Jogar', () => irPara('config-dificuldade')),
  criarZona(telaInicial, INICIAL.ranking, 'Ranking', () => { atualizarRanking(); irPara('ranking'); }),
  criarZona(telaInicial, INICIAL.personalizar, 'Personalizar personagem', () => irPara('personalizar'))
];
botoesInicio.forEach((botao, i) => { botao.dataset.botao = ['jogar', 'ranking', 'personalizar'][i]; });
const RANKING_KEY = 'jogoRanking';
function lerRanking() { try { const r = JSON.parse(localStorage.getItem(RANKING_KEY) || '[]'); return Array.isArray(r) ? r : []; } catch (e) { return []; } }
function registrarPontuacao(pontos) {
  let nome = 'Jogador'; try { nome = (localStorage.getItem('nomeRanking') || nome).trim().slice(0, 16) || 'Jogador'; } catch (e) {}
  const r = lerRanking();
  r.push({ nome, pontos: Math.max(0, Math.floor(pontos)), data: Date.now() });
  r.sort((a, b) => b.pontos - a.pontos || a.data - b.data);
  try { localStorage.setItem(RANKING_KEY, JSON.stringify(r.slice(0, 10))); } catch (e) {}
}
function atualizarRanking() {
  const lista = document.getElementById('lista-ranking'); lista.replaceChildren();
  const r = lerRanking();
  if (!r.length) { const li = document.createElement('li'); li.className = 'ranking-vazio'; li.textContent = 'Ainda nÃ£o hÃ¡ pontuaÃ§Ãµes. Jogue uma partida!'; lista.append(li); return; }
  r.forEach((item, i) => { const li = document.createElement('li'), n = document.createElement('span'), p = document.createElement('strong'); n.textContent = `${i + 1}. ${item.nome}`; p.textContent = `${Number(item.pontos).toLocaleString('pt-BR')} pts`; li.append(n, p); lista.append(li); });
}
document.getElementById('voltar-ranking').addEventListener('click', () => { bip(650); irPara('inicial'); });
let idxInicio = 0;
function marcarInicio() { botoesInicio.forEach((b, i) => b.classList.toggle('ativo', i === idxInicio)); }
botoesInicio.forEach((b, i) => {
  const animarHover = ativo => {
    const imagem = document.querySelector(`[data-botao="${['jogar', 'ranking', 'personalizar'][i]}"]`);
    if (!window.gsap || !imagem || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.to(imagem, { scale:ativo ? 1.045 : 1, filter:ativo ? 'brightness(1.08)' : 'brightness(1)', duration:ativo ? .24 : .18, ease:ativo ? 'back.out(2)' : 'power2.out', overwrite:'auto' });
  };
  b.addEventListener('mouseenter', () => { idxInicio = i; marcarInicio(); bip(660); animarHover(true); });
  b.addEventListener('mouseleave', () => animarHover(false));
  b.addEventListener('focus', () => animarHover(true));
  b.addEventListener('blur', () => animarHover(false));
});
animarEntradaTela('inicial');

// ===== PeÃ§as do personagem (manifesto + imagens) =====
let M = null, MS = [];              // manifesto atual e os dois (mulher/homem)
const cacheImg = {}, cacheCor = {};
function carregar(cat, i) {
  const k = base() + cat + '/' + i;
  if (!cacheImg[k]) cacheImg[k] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = k + '.png'; });
  return cacheImg[k];
}

// Recolore uma peÃ§a (cabelo/roupa: mantÃ©m luz e sombra; pele: sÃ³ os pixels de pele)
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
const CX = 87, BT = 24;     // centro e topo do corpo (unidades lÃ³gicas); a escala se ajusta ao tamanho do personagem
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
  const R = 880 / (pe - (BT + C.topo));      // altura fixa na tela, para o personagem nÃ£o ficar gigante
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
  if (nenhum) add(null, document.createTextNode('ðŸš«'), cores ? ' cor' : '');
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
  [['ðŸ‘© MULHER', 0], ['ðŸ‘¨ HOMEM', 1]].forEach(([txt, g]) => {
    const b = document.createElement('button'); b.className = 'gen' + (personagem.genero === g ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', () => { if (personagem.genero === g) return; bip(900); personagem = { ...personagem, genero: g, ...padraoG() }; M = MS[g]; montarPainel(); desenhar(); });
    gb.appendChild(b);
  });
  painel.appendChild(gb);
  switch (personagem.aba) {
    case 0:
      secao('ESTILO DE CABELO'); grade('cabelo', { cat: 'cabelo', n: M.cabelo.length, colunas: 7, nenhum: true });
      secao('COR DO CABELO'); grade('corCabelo', { cores: M.corhair, n: M.corhair.length, colunas: 10, nenhum: true });
      secao('ACESSÃ“RIOS DE CABELO'); grade('acess', { cat: 'acess', n: M.acess.length, colunas: 7, nenhum: true }); break;
    case 1:
      const tr = document.createElement('button'); tr.className = 'tirar'; tr.textContent = 'ðŸš« TIRAR TODA A ROUPA';
      tr.addEventListener('click', () => { bip(500); Object.assign(personagem, { top: null, bottom: null, sapato: null }); montarPainel(); desenhar(); });
      painel.appendChild(tr);
      secao('PARTE DE CIMA'); grade('top', { cat: 'top', n: M.top.length, colunas: 7, nenhum: true });
      secao('PARTE DE BAIXO'); grade('bottom', { cat: 'bottom', n: M.bottom.length, colunas: 7, nenhum: true });
      secao('CALÃ‡ADOS'); grade('sapato', { cat: 'calcado', n: M.calcado.length, colunas: 7, nenhum: true }); break;
    case 2:
      secao('ACESSÃ“RIOS'); grade('acess', { cat: 'acess', n: M.acess.length, colunas: 7, nenhum: true }); break;
    case 3:
      secao('TOM DE PELE'); grade('pele', { cores: M.pele, n: M.pele.length, colunas: 10, nenhum: true });
      secao('EXPRESSÃƒO'); grade('rosto', { cat: 'rosto', n: M.rosto.length, colunas: 6 }); break;
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

// ===== Seleção de dificuldade e música =====
let dificuldadeEscolhida = 'normal', musicaEscolhida = 0;
const MAPAS_FASES = {
  facil: { nome:'FÁCIL', arquivo:'mapa_facil (1).png' },
  normal: { nome:'NORMAL', arquivo:'mapa_normal.png' },
  dificil: { nome:'DIFÍCIL', arquivo:'mapa_dificil.png' }
};
function montarMapaFases() {
  const mapa = MAPAS_FASES[dificuldadeEscolhida];
  telaFases.style.backgroundImage = 'url("img/' + encodeURIComponent(mapa.arquivo) + '")';
  telaFases.querySelector('.mapa-titulo').textContent = 'MAPA ' + mapa.nome;
}
document.querySelector('.mapa-voltar').addEventListener('click', () => { bip(650); irPara('config-dificuldade'); });
document.querySelector('.mapa-iniciar').addEventListener('click', () => {
  bip(1040); Corrida.configurar(dificuldadeEscolhida, musicaEscolhida); irPara('jogo');
});
document.querySelector('.mapa-musica').addEventListener('click', () => { bip(820); irPara('config-musica'); });
document.querySelectorAll('[data-dificuldade]').forEach(botao => botao.addEventListener('click', () => {
  dificuldadeEscolhida = botao.dataset.dificuldade;
  telaConfig.querySelectorAll('[data-dificuldade]').forEach(b => b.classList.toggle('selecionada', b === botao));
  bip(880); montarMapaFases(); irPara('mapa-fases');
}));
document.querySelectorAll('[data-musica]').forEach(botao => botao.addEventListener('click', () => {
  musicaEscolhida = Number(botao.dataset.musica);
  telaConfig.querySelectorAll('[data-musica]').forEach(b => b.classList.toggle('selecionada', b === botao));
  bip(1040); irPara('mapa-fases');
}));document.querySelector('.config-voltar').addEventListener('click', () => { bip(650);
  if (atual === 'config-musica') irPara('mapa-fases'); else irPara('inicial');
});

// ===== Teclado =====
document.addEventListener('keydown', (e) => {
  if (atual === 'inicial') {
    if (e.key === 'ArrowDown') { idxInicio = (idxInicio + 1) % 3; marcarInicio(); bip(660); }
    else if (e.key === 'ArrowUp') { idxInicio = (idxInicio + 2) % 3; marcarInicio(); bip(660); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); botoesInicio[idxInicio].click(); }
  } else if (atual === 'jogo') Corrida.tecla(e); else if (e.key === 'Escape' && (atual.startsWith('config-') || atual === 'mapa-fases')) { if (atual === 'config-musica') irPara('mapa-fases'); else if (atual === 'mapa-fases') irPara('config-dificuldade'); else irPara('inicial'); }
  else if (e.key === 'Escape') irPara('inicial');
});

// ===== InÃ­cio =====
// As peÃ§as em camadas foram substituÃ­das pela seleÃ§Ã£o de personagens completos.







