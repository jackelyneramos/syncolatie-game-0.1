// Carrossel de personagens em artes completas.
const PERSONAGENS_PRONTOS = [
  { id:'kinho', nome:'Kinho', arquivo:'Kinho%20no%20Caf%C3%A9%20das%20Del%C3%ADcias.png', cor:'rgba(55, 45, 119, .74)', descricao:'Estilo g?tico, caf? e companhia felina.' },
  { id:'chocospeed', nome:'ChocoSpeed', arquivo:'ChocoSpeed%20no%20Reino%20dos%20Doces.webp', cor:'rgba(116, 27, 48, .75)', descricao:'Velocidade, chocolate e energia de sobra.' },
  { id:'grapies', nome:'Grapies', arquivo:'GRAPIES%20FULL%20AT.png', cor:'rgba(102, 24, 119, .76)', descricao:'Uma chef de visual roxo em um mundo de doces.' },
  { id:'champie', nome:'Champie', arquivo:'Champie%20no%20Pa%C3%ADs%20dos%20Doces.webp', cor:'rgba(175, 63, 124, .74)', descricao:'Do?ura, morangos e la?os azuis.' }
];
const TELA_ESCOLHA = document.getElementById('tela-personalizar');
const chaveEscolha = 'personagemEscolhido';
let personagemEscolhido = localStorage.getItem(chaveEscolha) || 'kinho';
if (personagemEscolhido === 'jacky') personagemEscolhido = 'kinho';
let indicePersonagem = Math.max(0, PERSONAGENS_PRONTOS.findIndex(p => p.id === personagemEscolhido));
let idTransicao = 0;

TELA_ESCOLHA.replaceChildren();
const arte = document.createElement('img');
arte.className = 'arte-personagem arte-visivel'; arte.alt = ''; arte.draggable = false;
const arteProxima = document.createElement('img');
arteProxima.className = 'arte-personagem arte-oculta'; arteProxima.alt = ''; arteProxima.draggable = false;
let arteAtiva = arte, arteReserva = arteProxima;
const voltar = document.createElement('button');
voltar.type = 'button'; voltar.className = 'voltar-carrossel'; voltar.setAttribute('aria-label', 'Voltar ao menu');
const imagemVoltar = document.createElement('img'); imagemVoltar.src = 'img/Bot%C3%A3o%20de%20Retorno%20com%20Morangos.png'; imagemVoltar.alt = ''; voltar.append(imagemVoltar);
const anterior = document.createElement('button');
anterior.type = 'button'; anterior.className = 'seta-carrossel seta-anterior'; anterior.setAttribute('aria-label', 'Personagem anterior');
anterior.innerHTML = '<span class="seta-glyph">\u2039</span><span class="seta-bolo" aria-hidden="true">&#127856;</span>';
const proxima = document.createElement('button');
proxima.type = 'button'; proxima.className = 'seta-carrossel seta-proxima'; proxima.setAttribute('aria-label', 'Pr\u00f3ximo personagem');
proxima.innerHTML = '<span class="seta-glyph">\u203a</span><span class="seta-bolo" aria-hidden="true">&#127856;</span>';
const rodape = document.createElement('div'); rodape.className = 'rodape-personagem'; rodape.setAttribute('aria-live', 'polite');
const info = document.createElement('div'); info.className = 'info-personagem';
const posicao = document.createElement('span'); posicao.className = 'posicao-personagem';
const nome = document.createElement('h1'); nome.className = 'nome-personagem';
const descricao = document.createElement('p'); descricao.className = 'descricao-personagem';
info.append(posicao, nome, descricao);
const selecionar = document.createElement('button'); selecionar.type = 'button'; selecionar.className = 'selecionar-personagem'; selecionar.setAttribute('aria-label', 'Selecionar personagem');
const imagemSelecionar = document.createElement('img'); imagemSelecionar.src = 'img/Bot%C3%A3o%20Selecionar%20de%20Abacaxi.png'; imagemSelecionar.alt = ''; selecionar.append(imagemSelecionar);
rodape.append(info, selecionar);
TELA_ESCOLHA.append(arte, arteProxima, voltar, anterior, proxima, rodape);

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
PERSONAGENS_PRONTOS.forEach(p => { const im = new Image(); im.src = 'img/' + p.arquivo; });
function mostrarPersonagem(indice, direcao = 1, animar = true) {
  indicePersonagem = (indice + PERSONAGENS_PRONTOS.length) % PERSONAGENS_PRONTOS.length;
  const p = PERSONAGENS_PRONTOS[indicePersonagem];
  const chamada = ++idTransicao;
  const srcArte = new URL('img/' + p.arquivo, document.baseURI).href;
  rodape.style.setProperty('--cor-personagem', p.cor);
  posicao.textContent = `PERSONAGEM ${indicePersonagem + 1} / ${PERSONAGENS_PRONTOS.length}`;
  nome.textContent = p.nome;
  descricao.textContent = p.descricao;
  if (animar && window.gsap && !movimentoReduzido) {
    gsap.killTweensOf([arteAtiva, arteReserva, rodape]);
    gsap.set(arteAtiva, { x:0, opacity:1, scale:1, filter:'blur(0px)' });
    arteReserva.onload = () => {
      if (chamada !== idTransicao || !arteReserva.naturalWidth) return;
      gsap.set(arteReserva, { x:direcao * 105, opacity:0, scale:1.035, filter:'blur(8px)' });
      gsap.timeline({ onComplete:() => {
        arteAtiva.classList.remove('arte-visivel'); arteAtiva.classList.add('arte-oculta');
        arteReserva.classList.remove('arte-oculta'); arteReserva.classList.add('arte-visivel');
        gsap.set(arteAtiva, { x:0, opacity:0, scale:1, filter:'blur(0px)' });
        [arteAtiva, arteReserva] = [arteReserva, arteAtiva];
        arteAtiva.onload = null;
      }})
        .to(arteAtiva, { x:direcao * -105, opacity:0, scale:.985, filter:'blur(5px)', duration:.58, ease:'power3.inOut' }, 0)
        .to(arteReserva, { x:0, opacity:1, scale:1, filter:'blur(0px)', duration:.68, ease:'power3.inOut' }, 0);
    };
    arteReserva.onerror = () => { if (chamada === idTransicao) arteReserva.onload = null; };
    arteReserva.src = srcArte;
    if (arteReserva.complete && arteReserva.naturalWidth) arteReserva.onload();
    gsap.fromTo(rodape, { y:14, opacity:.72 }, { y:0, opacity:1, duration:.42, ease:'power2.out', overwrite:'auto' });
  } else {
    arteAtiva.src = srcArte;
    arteReserva.src = srcArte;
    arteAtiva.classList.add('arte-visivel'); arteAtiva.classList.remove('arte-oculta');
    arteReserva.classList.add('arte-oculta'); arteReserva.classList.remove('arte-visivel');
  }
}
function mudarPersonagem(direcao) { bip(820); mostrarPersonagem(indicePersonagem + direcao, direcao, true); }
anterior.addEventListener('click', () => mudarPersonagem(-1));
proxima.addEventListener('click', () => mudarPersonagem(1));
function animarHoverBotao(botao, ativo) {
  const imagem = botao.querySelector('img');
  if (!window.gsap || movimentoReduzido || !imagem) return;
  gsap.to(imagem, { scale:ativo ? 1.045 : 1, y:ativo ? -3 : 0, filter:ativo ? 'brightness(1.08) drop-shadow(0 8px 10px rgba(57,18,39,.28))' : 'brightness(1)', duration:ativo ? .22 : .18, ease:ativo ? 'back.out(2)' : 'power2.out', overwrite:'auto' });
}
function animarCliqueBotao(botao, aoTerminar) {
  const imagem = botao.querySelector('img');
  if (!window.gsap || movimentoReduzido || !imagem) { aoTerminar(); return; }
  gsap.killTweensOf(imagem);
  gsap.timeline({ onComplete:aoTerminar })
    .to(imagem, { scale:.94, duration:.08, ease:'power2.in' })
    .to(imagem, { scale:1.06, duration:.16, ease:'back.out(2)' })
    .to(imagem, { scale:1, duration:.12, ease:'power2.out' });
}
[voltar, selecionar].forEach(botao => {
  botao.addEventListener('pointerenter', () => animarHoverBotao(botao, true));
  botao.addEventListener('pointerleave', () => animarHoverBotao(botao, false));
  botao.addEventListener('focus', () => animarHoverBotao(botao, true));
  botao.addEventListener('blur', () => animarHoverBotao(botao, false));
});
voltar.addEventListener('click', () => { bip(650); animarCliqueBotao(voltar, () => irPara('inicial')); });
selecionar.addEventListener('click', () => animarCliqueBotao(selecionar, () => {
  const escolhido = PERSONAGENS_PRONTOS[indicePersonagem];
  try { localStorage.setItem(chaveEscolha, escolhido.id); } catch (e) {}
  bip(1040); mostrarAviso(`${escolhido.nome} selecionado!`); irPara('inicial');
}));
document.addEventListener('keydown', e => {
  if (atual !== 'personalizar') return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); mudarPersonagem(e.key === 'ArrowRight' ? 1 : -1);
  } else if (e.key === 'Enter') { e.preventDefault(); selecionar.click(); }
});
mostrarPersonagem(indicePersonagem, 1, false);
