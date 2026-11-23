// ===== Mapa de corrida rÃ­tmica (arte e mÃºsica originais, feitas em cÃ³digo) =====
const Corrida = (() => {
  const cv = document.getElementById('cv-jogo'), g = cv.getContext('2d');
  const CW = 1672, CH = 941, FLOOR = 650, HITX = 420, PX = 270, VEL = 780;
  const BPM = 128, SPB = 60 / BPM; let JAN = 0.14, PERF = 0.07, dificuldadeJogo = 'normal', musicaJogo = 0;
  const PADROES = [ [[0,0],[2,0]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,1],[2,0],[3,1]],
    [[0,0],[1,0],[1.5,1],[2,0],[3,1],[3.5,1]], [[0,1],[.5,0],[1,1],[2,0],[2.5,1],[3,0]],
    [[0,0],[.5,0],[1,0],[1.5,1],[2,1],[2.5,0],[3,0],[3.5,1]] ];
  const SEQ = [0,0,1,1,2,2,3,3,1,2,4,4,3,5,4,5,2,3,4,5,1,1,5,5,4,4,3,5,5,5,5,1];
  const FIM = (4 + SEQ.length * 4) * SPB + 1.5;

  let ac, T0, rodando = false, pausado = false, fimTela = null, auto = false, raf = 0, timer = 0, proxStep = 0, pontuacaoRegistrada = false;
  let notas, efeitos, popups, placar, bgPronto, mapaCarregado = false, poses = null, posesId = '', hurtT = -9, ataque = { t: -9, lane: 0 }, movimentoMapa = { x:0 }, mapaTween = null;
  const PERSONAGENS = {
    jacky: { pasta: 'jacky_sprites_png/quadro_uniforme', prefixo: 'jacky', idle: 1, run: [15, 16, 18, 20], kick: 22, hurt: 8, jump: 16 },
    chocospeed: { pasta: 'ChocoSpeed_sprites_png', prefixo: 'chocospeed', idle: 1, run: [8, 9, 10, 11], kick: 20, hurt: 32, jump: 15 },
    champie: { pasta: 'Champie_sprites_png', prefixo: 'champie', idle: 1, run: [5, 6, 7, 8], kick: 26, hurt: 12, jump: 21 }
  };
  function carregarImagemPose(cfg, n) {
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      const nome = cfg.prefixo + '_' + String(n).padStart(2, '0') + '.png';
      const pasta = cfg.pasta.split('/').map(encodeURIComponent).join('/');
      im.src = 'img/personagem/' + pasta + '/' + nome + '?v=20261123b';
    });
  }
  function prepararPose(im) {
    if (!im) return null;
    const bruto = document.createElement('canvas'); bruto.width = im.naturalWidth; bruto.height = im.naturalHeight;
    const bx = bruto.getContext('2d', { willReadFrequently: true }); bx.drawImage(im, 0, 0);
    const px = bx.getImageData(0, 0, bruto.width, bruto.height).data, w = bruto.width, h = bruto.height;
    const visto = new Uint8Array(w * h), fila = new Int32Array(w * h);
    let melhor = null;
    for (let inicio = 0; inicio < w * h; inicio++) {
      if (visto[inicio] || px[inicio * 4 + 3] < 32) continue;
      let ini = 0, fim = 0, minX = w, minY = h, maxX = 0, maxY = 0;
      visto[inicio] = 1; fila[fim++] = inicio;
      while (ini < fim) {
        const p = fila[ini++], x = p % w, y = (p / w) | 0;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const q = ny * w + nx;
          if (!visto[q] && px[q * 4 + 3] >= 32) { visto[q] = 1; fila[fim++] = q; }
        }
      }
      if (!melhor || fim > melhor.area) melhor = { minX, minY, maxX, maxY, area: fim };
    }
    if (!melhor) return im;
    const pad = 3, sx = Math.max(0, melhor.minX - pad), sy = Math.max(0, melhor.minY - pad);
    const sw = Math.min(w - sx, melhor.maxX - melhor.minX + 1 + pad * 2), sh = Math.min(h - sy, melhor.maxY - melhor.minY + 1 + pad * 2);
    const frame = document.createElement('canvas'); frame.width = 360; frame.height = 330;
    const ctx = frame.getContext('2d'), escala = Math.min(330 / sh, 350 / sw), dw = sw * escala, dh = sh * escala;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bruto, sx, sy, sw, sh, (frame.width - dw) / 2, frame.height - dh, dw, dh);
    return frame;
  }
  function carregarPoses() {
    const id = localStorage.getItem('personagemEscolhido') || 'jacky';
    if (poses && posesId === id) return Promise.resolve();
    const cfg = PERSONAGENS[id] || PERSONAGENS.jacky;
    const numeros = [...new Set([cfg.idle, ...cfg.run, cfg.kick, cfg.hurt, cfg.jump])];
    return Promise.all(numeros.map(async n => [n, prepararPose(await carregarImagemPose(cfg, n))])).then(carregadas => {
      const frames = Object.fromEntries(carregadas.filter(([, im]) => im));
      const idle = frames[cfg.idle] || Object.values(frames)[0];
      if (!idle) { poses = null; return; }
      poses = {
        idle,
        run0: frames[cfg.run[0]] || idle, run1: frames[cfg.run[1]] || idle,
        run2: frames[cfg.run[2]] || idle, run3: frames[cfg.run[3]] || idle,
        kick: frames[cfg.kick] || idle, hurt: frames[cfg.hurt] || idle, jump: frames[cfg.jump] || idle
      };
      posesId = id;
    });
  }

  function novoJogo() {
    notas = []; efeitos = []; popups = [];
    SEQ.forEach((p, bar) => PADROES[p].forEach(([b, lane], i) => { if (dificuldadeJogo === 'facil' && (i + bar) % 3 === 2) return; const t = (4 + bar * 4 + b) * SPB; notas.push({ t, lane, feito: false }); if (dificuldadeJogo === 'dificil' && i % 2 === 1 && t + SPB / 2 < (4 + SEQ.length * 4) * SPB) notas.push({ t: t + SPB / 2, lane: 1 - lane, feito: false }); }));
    placar = { score: 0, combo: 0, maxCombo: 0, hp: 250, fever: 0, perfect: 0, great: 0, miss: 0 };
    fimTela = null; pausado = false; proxStep = 0; pontuacaoRegistrada = false; hurtT = -9; ataque = { t: -9, lane: 0 };
  }
  const tempo = () => ac.currentTime - T0;

  // ---------- Fundo (desenhado uma vez) ----------
  function criarFundoOriginal() {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const x = c.getContext('2d');
    let gr = x.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, '#150a2e'); gr.addColorStop(.6, '#2c1659'); gr.addColorStop(1, '#6a2a8f');
    x.fillStyle = gr; x.fillRect(0, 0, CW, CH);
    // arcos gÃ³ticos e pilares
    for (let i = 0; i < 8; i++) {
      const cx = 140 + i * 235; x.strokeStyle = 'rgba(150,110,230,.22)'; x.lineWidth = 6; x.fillStyle = 'rgba(20,8,48,.35)';
      x.beginPath(); x.moveTo(cx - 90, FLOOR - 20); x.lineTo(cx - 90, 330); x.quadraticCurveTo(cx - 90, 210, cx, 150); x.quadraticCurveTo(cx + 90, 210, cx + 90, 330); x.lineTo(cx + 90, FLOOR - 20); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(120,80,200,.28)'; x.fillRect(cx + 112, 300, 26, FLOOR - 320); x.fillRect(cx + 104, 292, 42, 14); x.fillRect(cx + 104, FLOOR - 40, 42, 20);
    }
    // losangos decorativos
    [[1500, 260], [90, 280]].forEach(([dx, dy]) => { x.save(); x.translate(dx, dy); x.rotate(Math.PI / 4); x.strokeStyle = 'rgba(190,150,255,.35)'; x.lineWidth = 5;
      for (let k = 1; k <= 3; k++) x.strokeRect(-40 * k, -40 * k, 80 * k, 80 * k); x.restore(); });
    // estÃ¡tuas de caveira
    [[930, 0], [1220, 1]].forEach(([sx, piscar]) => {
      x.fillStyle = 'rgba(25,10,55,.55)'; x.beginPath(); x.moveTo(sx - 110, FLOOR - 15); x.lineTo(sx - 110, 380); x.quadraticCurveTo(sx - 110, 260, sx, 230); x.quadraticCurveTo(sx + 110, 260, sx + 110, 380); x.lineTo(sx + 110, FLOOR - 15); x.fill();
      x.fillStyle = 'rgba(170,120,230,.6)'; x.beginPath(); x.arc(sx, 345, 52, 0, 7); x.fill(); x.fillRect(sx - 30, 380, 60, 38);
      x.fillStyle = '#1a0b36'; x.beginPath(); x.arc(sx - 20, 345, 13, 0, 7); x.arc(sx + 20, 345, 13, 0, 7); x.fill();
      x.fillStyle = '#ff5cc8'; x.beginPath(); x.arc(sx - 20, 345, 5, 0, 7); x.arc(sx + 20, 345, 5, 0, 7); x.fill();
      x.strokeStyle = 'rgba(170,120,230,.55)'; x.lineWidth = 8; x.beginPath(); x.moveTo(sx, 420); x.lineTo(sx, 520); x.moveTo(sx - 40, 440); x.quadraticCurveTo(sx, 470, sx + 40, 440); x.stroke();
      x.fillStyle = 'rgba(120,80,200,.55)'; x.fillRect(sx - 80, 535, 160, 75);
    });
    // estandarte com caveira
    x.fillStyle = '#a02a6a'; x.fillRect(1060, 0, 210, 180); x.fillStyle = '#126a88'; x.beginPath(); x.moveTo(1165 - 105, 180); x.lineTo(1165, 250); x.lineTo(1165 + 105, 180); x.fill();
    x.fillStyle = 'rgba(255,170,220,.75)'; x.beginPath(); x.arc(1165, 70, 46, 0, 7); x.fillRect(1140, 100, 50, 28); x.fill();
    x.fillStyle = '#7a1c52'; x.beginPath(); x.arc(1148, 66, 11, 0, 7); x.arc(1182, 66, 11, 0, 7); x.fill();
    // faixa inferior (caveiras escuras) e neon
    x.fillStyle = '#1b0a35'; x.fillRect(0, FLOOR + 50, CW, CH);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 24; i++) { x.fillStyle = 'rgba(70,35,130,.55)'; x.beginPath(); x.ellipse(i * 78 + (r % 2) * 39, FLOOR + 90 + r * 48, 26, 30, 0, 0, 7); x.fill(); }
    gr = x.createLinearGradient(0, FLOOR + 50, 0, CH); gr.addColorStop(0, 'rgba(255,60,190,0)'); gr.addColorStop(1, 'rgba(255,60,190,.85)'); x.fillStyle = gr; x.fillRect(0, FLOOR + 50, CW, CH);
    return c;
  }
  function carregarFundo() {
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = CW; c.height = CH;
        c.getContext('2d').drawImage(im, 0, 0, CW, CH);
        mapaCarregado = true; resolve(c);
      };
      im.onerror = () => { mapaCarregado = false; resolve(criarFundoOriginal()); };
      im.src = 'img/mapa-jogo.png?v=20261123c';
    });
  }

  // ---------- Desenho ----------
  function texto(t, px, py, tam, cor, borda, alinha = 'left') {
    g.font = `900 ${tam}px system-ui, sans-serif`; g.textAlign = alinha; g.lineJoin = 'round'; g.lineWidth = tam / 6;
    g.strokeStyle = borda; g.strokeText(t, px, py); g.fillStyle = cor; g.fillText(t, px, py);
  }
  function piso(t) {
    const w = 70, off = (t * VEL * .5) % (w * 2);
    for (let i = -2; i < CW / w + 3; i++) { g.fillStyle = i % 2 ? '#3a6e8e' : '#294d70'; g.fillRect(i * w - off, FLOOR, w, 28); g.fillStyle = i % 2 ? '#294d70' : '#3a6e8e'; g.fillRect(i * w - off, FLOOR + 28, w, 28); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, FLOOR + 56, CW, 6);
  }
  function ambiente(t) {
    g.save();
    g.globalCompositeOperation = 'screen';
    const pulso = .5 + Math.sin(t * 1.4) * .5;
    const luz = g.createRadialGradient(870 + Math.sin(t * .35) * 170, 390, 8, 870, 390, 470);
    luz.addColorStop(0, `rgba(255,105,205,${.08 + pulso * .07})`);
    luz.addColorStop(1, 'rgba(255,105,205,0)');
    g.fillStyle = luz;
    g.fillRect(250, 80, 1240, 620);
    for (let i = 0; i < 32; i++) {
      const x = (i * 197 + t * (12 + i % 4 * 7)) % (CW + 40) - 20;
      const y = 90 + (i * 89 % 510) + Math.sin(t * 1.3 + i * 2) * 16;
      const brilho = .35 + (Math.sin(t * 2.2 + i * 4) + 1) * .25;
      const r = i % 5 === 0 ? 3.5 : 2;
      g.globalAlpha = brilho;
      g.fillStyle = i % 3 === 0 ? '#ffb8e4' : i % 3 === 1 ? '#91eaff' : '#ffe997';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      if (i % 5 === 0) {
        g.globalAlpha = brilho * .65;
        g.fillRect(x - .8, y - 7, 1.6, 14);
        g.fillRect(x - 7, y - .8, 14, 1.6);
      }
    }
    g.restore();
  }
  function inimigo(n, t) {
    const x = HITX + (n.t - t) * VEL, bob = Math.sin(t * 6 + n.t * 3) * 6;
    const y = n.lane ? 400 + bob : FLOOR - 42 + bob * .4;
    if (x < -80 || x > CW + 80) return;
    g.save(); g.translate(x, y);
    if (n.lane) { g.fillStyle = '#b48bf0'; g.beginPath(); g.ellipse(-48, -6, 26, 14, -.5, 0, 7); g.ellipse(48, -6, 26, 14, .5, 0, 7); g.fill(); }
    g.fillStyle = n.lane ? '#7b4fd8' : '#e0489f'; g.strokeStyle = '#1a0b36'; g.lineWidth = 6;
    g.beginPath(); g.arc(0, 0, 42, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-15, -5, 10, 14, 0, 0, 7); g.ellipse(15, -5, 10, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#1a0b36'; g.beginPath(); g.arc(-13, -2, 5, 0, 7); g.arc(17, -2, 5, 0, 7); g.fill();
    g.strokeStyle = '#1a0b36'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, -26); g.lineTo(-30, -36); g.moveTo(14, -26); g.lineTo(30, -36); g.stroke();
    g.restore();
  }
  function jogador(t) {
    const dA = t - ataque.t, dH = t - hurtT, ativo = rodando && !pausado && !fimTela;
    let nome, pulo = 0, dx = 0, alfa = 1;
    if (fimTela) nome = fimTela.venceu ? 'jump' : 'hurt';
    else if (pausado) nome = 'idle';
    else if (dH >= 0 && dH < .55) { nome = 'hurt'; dx = -40 * (1 - dH / .55); alfa = Math.floor(dH * 18) % 2 ? .45 : 1; }
    else if (ataque.lane === 1 && dA >= 0 && dA < .45) { pulo = Math.sin(dA / .45 * Math.PI) * 190; nome = dA < .08 ? 'run3' : 'jump'; }
    else if (ataque.lane === 0 && dA >= 0 && dA < .26) { nome = 'kick'; dx = 18; }
    else nome = 'run' + (Math.floor(t * 12) % 4);
    const im = poses && poses[nome]; if (!im) return;
    const baseH = poses.idle.naturalHeight || poses.idle.height, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const esc = 330 / baseH, w = iw * esc, h = ih * esc;
    const quica = nome.startsWith('run') && ativo ? Math.abs(Math.sin(t * 12 * Math.PI / 2)) * 6 : 0;
    const px = PX + dx, base = FLOOR + 40 - pulo - quica;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(PX, FLOOR + 42, 80 - pulo / 6, 14, 0, 0, 7); g.fill();
    g.globalAlpha = alfa; g.drawImage(im, px - w / 2, base - h, w, h); g.globalAlpha = 1;
    if (ataque.lane === 0 && dA >= 0 && dA < .22 && !fimTela) {     // arco de ataque (chute)
      const a = dA / .22; g.save(); g.globalAlpha = 1 - a; g.strokeStyle = '#ff7bd5'; g.lineWidth = 26; g.lineCap = 'round';
      g.beginPath(); g.arc(px + 40, base - h * .3, 140 + a * 40, -.9, .9); g.stroke(); g.restore();
    } else if (ataque.lane === 1 && dA >= 0 && dA < .22 && !fimTela) {
      const a = dA / .22; g.save(); g.globalAlpha = 1 - a; g.strokeStyle = '#7be0ff'; g.lineWidth = 22; g.lineCap = 'round';
      g.beginPath(); g.arc(px + 40, base - h * .65, 130 + a * 40, -1.1, 1.1); g.stroke(); g.restore();
    }
  }
  function hud(t) {
    texto(String(placar.score).padStart(5, '0'), 50, 82, 70, '#fff', '#5a2fb0'); texto('SCORE', 50, 140, 42, '#b9a2ff', '#3a1a80');
    if (placar.combo >= 2) {
      g.save(); g.translate(830, 120); const s = 1 + Math.max(0, .25 - (t - (placar.ultimo || -9))) * 1.2; g.scale(s, s);
      g.fillStyle = '#ff2fb4'; g.beginPath(); g.ellipse(0, 0, 118, 70, 0, 0, 7); g.fill();
      texto(String(placar.combo), 0, 18, 84, '#ffe94a', '#7a1052', 'center'); texto('COMBO', 0, 56, 34, '#fff', '#7a1052', 'center'); g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(1530, 34, 14, 52); g.fillRect(1562, 34, 14, 52);   // botÃ£o pausa
    // barra de vida / fever
    const bx = 560, by = 858, bw = 560, bh = 60;
    g.fillStyle = '#1b0a35'; g.beginPath(); g.roundRect(bx, by, bw, bh, 16); g.fill(); g.strokeStyle = '#4fc3ff'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#ff2fa8'; g.beginPath(); g.roundRect(bx + 8, by + 18, (bw - 16) * Math.max(0, placar.hp) / 250, bh - 26, 10); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx + 40, by + 20); g.bezierCurveTo(bx + 10, by - 4, bx + 14, by + 36, bx + 40, by + 44); g.bezierCurveTo(bx + 66, by + 36, bx + 70, by - 4, bx + 40, by + 20); g.fill();
    texto(placar.hp + '/250', bx + bw / 2, by + 48, 32, '#fff', '#7a1052', 'center');
    texto('FEVER', bx + bw + 40, by + 44, 36, placar.fever >= 100 ? '#ffe94a' : '#6fd3ff', '#1a3a7a');
    g.fillStyle = '#6fd3ff'; g.fillRect(bx + 8, by + 8, (bw - 16) * Math.min(100, placar.fever) / 100, 8);
  }
  function botao(txt, x, y, w, h, cor) { g.fillStyle = cor; g.beginPath(); g.roundRect(x, y, w, h, 20); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke(); texto(txt, x + w / 2, y + h * .66, 44, '#fff', '#3a1a80', 'center'); }
  function overlay() {
    g.fillStyle = 'rgba(15,5,35,.78)'; g.fillRect(0, 0, CW, CH);
    if (pausado) { texto('PAUSADO', CW / 2, 330, 120, '#fff', '#5a2fb0', 'center'); botao('CONTINUAR', 560, 430, 550, 90, '#ff2fa8'); botao('MENU', 560, 550, 550, 90, '#6a4be0'); }
    else {
      texto(fimTela.venceu ? 'COMPLETO!' : 'FIM DE JOGO', CW / 2, 230, 120, '#fff', '#5a2fb0', 'center');
      const p = placar, tot = p.perfect + p.great + p.miss, pc = tot ? Math.round((p.perfect + p.great * .6) / tot * 100) : 0;
      const rank = !fimTela.venceu ? 'D' : pc > 95 ? 'S' : pc > 85 ? 'A' : pc > 70 ? 'B' : 'C';
      texto('Pontos ' + p.score, CW / 2, 330, 56, '#ffe94a', '#7a1052', 'center');
      texto(`Perfect ${p.perfect}   Great ${p.great}   Miss ${p.miss}`, CW / 2, 410, 44, '#fff', '#3a1a80', 'center');
      texto(`Combo mÃ¡x. ${p.maxCombo}   PrecisÃ£o ${pc}%   Nota ${rank}`, CW / 2, 480, 44, '#b9a2ff', '#3a1a80', 'center');
      botao('JOGAR DE NOVO', 560, 560, 550, 90, '#ff2fa8'); botao('MENU', 560, 680, 550, 90, '#6a4be0');
    }
  }
  function quadro() {
    raf = requestAnimationFrame(quadro);
    const t = tempo();
    if (!pausado && !fimTela) { logica(t); }
    g.save(); const dh = t - hurtT; if (dh >= 0 && dh < .25 && !pausado) g.translate((Math.random() - .5) * 18, (Math.random() - .5) * 12);
    const panMapa = window.gsap ? movimentoMapa.x : -55 + Math.sin(t * .3) * 55; g.drawImage(bgPronto, -110 + panMapa, -38, CW + 220, CH + 76); if (!mapaCarregado) piso(t);
    ambiente(t);
    for (const n of notas) if (!n.feito) inimigo(n, t);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 5; [FLOOR - 42, 400].forEach(y => { g.beginPath(); g.arc(HITX, y, 52, 0, 7); g.stroke(); });
    jogador(t);
    efeitos = efeitos.filter(e => t - e.t0 < .5);
    for (const e of efeitos) { const a = (t - e.t0) / .5; g.fillStyle = e.cor; g.globalAlpha = 1 - a; g.beginPath(); g.arc(e.x + e.vx * a, e.y + e.vy * a + 200 * a * a, 9 * (1 - a) + 2, 0, 7); g.fill(); g.globalAlpha = 1; }
    popups = popups.filter(p => t - p.t0 < .6);
    for (const p of popups) { const a = (t - p.t0) / .6; g.globalAlpha = 1 - a; texto(p.txt, HITX - 120, p.y - a * 60, 64, p.cor, '#7a1052', 'center'); g.globalAlpha = 1; }
    g.restore();
    if (t - hurtT >= 0 && t - hurtT < .3 && !pausado) { g.fillStyle = `rgba(255,30,60,${.32 * (1 - (t - hurtT) / .3)})`; g.fillRect(0, 0, CW, CH); }
    hud(t);
    if (pausado || fimTela) overlay();
    if (auto) texto('AUTO (A)', CW - 60, 140, 34, '#ffe94a', '#7a1052', 'right');
  }

  // ---------- LÃ³gica ----------
  function acertar(n, dt, t) {
    n.feito = true; const perf = Math.abs(dt) <= PERF, p = placar;
    p.combo++; p.maxCombo = Math.max(p.maxCombo, p.combo); p.ultimo = t; p.fever = Math.min(100, p.fever + 3);
    p.score += (perf ? 500 : 300) + Math.min(p.combo, 50) * 10; perf ? p.perfect++ : p.great++; p.hp = Math.min(250, p.hp + 2);
    ataque = { t, lane: n.lane }; popups.push({ t0: t, txt: perf ? 'PERFECT' : 'GREAT', cor: perf ? '#ff7bd5' : '#7be0ff', y: n.lane ? 330 : 520 });
    const y = n.lane ? 400 : FLOOR - 42;
    for (let i = 0; i < 14; i++) efeitos.push({ t0: t, x: HITX, y, vx: (Math.random() - .3) * 260, vy: (Math.random() - .8) * 200, cor: ['#ff7bd5', '#7be0ff', '#ffe94a'][i % 3] });
    sfx(n.lane ? 880 : 440, .09, 'square', .1);
  }
  function logica(t) {
    for (const n of notas) {
      if (n.feito) continue;
      if (auto && t >= n.t) { acertar(n, 0, t); continue; }
      if (t > n.t + JAN) { n.feito = true; placar.combo = 0; placar.miss++; placar.hp -= 20; hurtT = t; placar.fever = Math.max(0, placar.fever - 10); sfx(110, .15, 'sawtooth', .08); }
    }
    if (placar.hp <= 0) fimTela = { venceu: false };
    else if (t > FIM) fimTela = { venceu: true };
    if (fimTela && !pontuacaoRegistrada && !auto) { pontuacaoRegistrada = true; if (typeof registrarPontuacao === 'function') registrarPontuacao(placar.score); }
    musica(t);
  }
  function bater(lane) {
    if (!rodando || pausado || fimTela) return;
    const t = tempo(); let alvo = null;
    for (const n of notas) if (!n.feito && n.lane === lane && Math.abs(n.t - t) <= JAN && (!alvo || n.t < alvo.t)) alvo = n;
    if (alvo) acertar(alvo, t - alvo.t, t); else { ataque = { t, lane }; sfx(200, .05, 'triangle', .05); }
  }

  // ---------- Ãudio (mÃºsica e efeitos sintetizados) ----------
  function sfx(f, d, tipo, vol, quando) {
    const o = ac.createOscillator(), v = ac.createGain(), s = quando || ac.currentTime;
    o.type = tipo; o.frequency.value = f; v.gain.setValueAtTime(vol, s); v.gain.exponentialRampToValueAtTime(.001, s + d);
    o.connect(v); v.connect(ac.destination); o.start(s); o.stop(s + d);
  }
  function ruido(s, d, vol, filtro) {
    const b = ac.createBuffer(1, ac.sampleRate * d, ac.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), v = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = filtro;
    src.buffer = b; v.gain.setValueAtTime(vol, s); v.gain.exponentialRampToValueAtTime(.001, s + d); src.connect(f); f.connect(v); v.connect(ac.destination); src.start(s);
  }
  const MUSICAS = [{ raiz:[110,110,130.8,98], arp:[1,1.5,2,1.5,1.25,1.5,2,2.5], tipo:'sawtooth', brilho:'square' }, { raiz:[146.8,130.8,110,98], arp:[1,1.25,1.5,2,2.5,2,1.5,1.25], tipo:'triangle', brilho:'sine' }, { raiz:[98,123.5,146.8,123.5], arp:[1,1.5,1.25,2,1.5,2.5,2,1.5], tipo:'sine', brilho:'triangle' }];
  function musica() {   // agenda colcheias com antecedÃªncia
    const passo = SPB / 2, ate = ac.currentTime + .35;
    while (T0 + proxStep * passo < ate) {
      const s = proxStep, quando = T0 + s * passo, beat = Math.floor(s / 2), barra = Math.floor(beat / 4), arranjo = MUSICAS[musicaJogo] || MUSICAS[0];
      if (quando >= ac.currentTime - .05) {
        if (s % 2 === 0) { const o = ac.createOscillator(), v = ac.createGain(); o.frequency.setValueAtTime(150, quando); o.frequency.exponentialRampToValueAtTime(40, quando + .15);
          v.gain.setValueAtTime(.35, quando); v.gain.exponentialRampToValueAtTime(.001, quando + .2); o.connect(v); v.connect(ac.destination); o.start(quando); o.stop(quando + .2); }
        if (s % 4 === 2) ruido(quando, .12, .18, 1500);
        ruido(quando, .04, .05, 7000);
        const raiz = arranjo.raiz[barra % 4]; sfx(raiz, passo * .9, arranjo.tipo, .09, quando);
        if (barra >= 2) sfx(raiz * 4 * arranjo.arp[s % 8], passo * .8, arranjo.brilho, .035, quando);
      }
      proxStep++;
    }
  }

  // ---------- Controle ----------
  function configurar(dificuldade, musica) { dificuldadeJogo = ['facil','normal','dificil'].includes(dificuldade) ? dificuldade : 'normal'; musicaJogo = Math.max(0, Math.min(2, Number(musica) || 0)); JAN = dificuldadeJogo === 'facil' ? 0.19 : dificuldadeJogo === 'dificil' ? 0.10 : 0.14; PERF = dificuldadeJogo === 'facil' ? 0.09 : dificuldadeJogo === 'dificil' ? 0.05 : 0.07; } async function iniciar() {
    if (rodando) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') await ac.resume();
    bgPronto = bgPronto || await carregarFundo(); if (window.gsap) { if (mapaTween) mapaTween.kill(); movimentoMapa.x = 0; mapaTween = gsap.to(movimentoMapa, { x:-110, duration:9, repeat:-1, yoyo:true, ease:'sine.inOut' }); } novoJogo();
    await carregarPoses();
    T0 = ac.currentTime + .4; rodando = true; cancelAnimationFrame(raf); clearTimeout(timer); quadro();
  }
  function parar() { rodando = false; if (mapaTween) { mapaTween.kill(); mapaTween = null; } cancelAnimationFrame(raf); if (ac && ac.state === 'running') ac.suspend().then(() => ac.resume()); proxStep = 1e9; }
  function reiniciar() { rodando = false; cancelAnimationFrame(raf); proxStep = 0; iniciar(); }
  function pausar() { if (fimTela) return; pausado = !pausado; pausado ? ac.suspend() : ac.resume(); }
  function tecla(e) {
    const k = e.key.toLowerCase();
    if (e.repeat) return;
    if (k === 'escape' || k === 'p') { fimTela ? irPara('inicial') : pausar(); }
    else if (k === 'a') auto = !auto;
    else if (k === 'enter' && fimTela) reiniciar();
    else if (['arrowdown', 's', 'f', 'd', ' '].includes(k)) { e.preventDefault(); bater(0); }
    else if (['arrowup', 'w', 'j', 'k'].includes(k)) { e.preventDefault(); bater(1); }
  }
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * CW, y = (e.clientY - r.top) / r.height * CH;
    if (pausado || fimTela) {
      const sel = (y1) => x > 560 && x < 1110 && y > y1 && y < y1 + 90;
      if (pausado) { if (sel(430)) pausar(); else if (sel(550)) { pausado = false; ac.resume(); irPara('inicial'); } }
      else { if (sel(560)) reiniciar(); else if (sel(680)) irPara('inicial'); }
      return;
    }
    if (x > 1500 && y < 110) return pausar();
    bater(y < 500 ? 1 : 0);
  });
  return { iniciar, parar, tecla, configurar };
})();


