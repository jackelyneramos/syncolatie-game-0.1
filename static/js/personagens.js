// Seleção de personagens completos desenhados na tela-personagens-1.png.
const PERSONAGENS_PRONTOS = [
  { id: 'jacky', nome: 'Jacky', area: [128, 146, 600, 802] },
  { id: 'chocospeed', nome: 'ChocoSpeed', area: [620, 135, 1075, 803] },
  { id: 'champie', nome: 'Champie', area: [1090, 145, 1604, 803] }
];
const TELA_ESCOLHA = document.getElementById('tela-personalizar');
let personagemEscolhido = localStorage.getItem('personagemEscolhido') || 'jacky';
if (!PERSONAGENS_PRONTOS.some(p => p.id === personagemEscolhido)) personagemEscolhido = 'jacky';

TELA_ESCOLHA.replaceChildren();
const opcoesPersonagem = PERSONAGENS_PRONTOS.map((p, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'escolha-personagem';
  b.setAttribute('aria-label', `Escolher ${p.nome}`);
  posicionar(b, p.area);
  b.addEventListener('click', () => { personagemEscolhido = p.id; atualizarOpcoes(); bip(900); });
  TELA_ESCOLHA.appendChild(b);
  return b;
});

function atualizarOpcoes() {
  opcoesPersonagem.forEach((b, i) => {
    const escolhido = PERSONAGENS_PRONTOS[i].id === personagemEscolhido;
    b.classList.toggle('selecionado', escolhido);
    b.setAttribute('aria-pressed', String(escolhido));
  });
}

function confirmarPersonagem() {
  try { localStorage.setItem('personagemEscolhido', personagemEscolhido); } catch (e) {}
  mostrarAviso(`${PERSONAGENS_PRONTOS.find(p => p.id === personagemEscolhido).nome} selecionada!`);
  irPara('inicial');
}

const confirmarEscolha = document.createElement('button');
confirmarEscolha.type = 'button'; confirmarEscolha.className = 'confirmar-personagem';
confirmarEscolha.setAttribute('aria-label', 'Confirmar personagem');
confirmarEscolha.addEventListener('click', confirmarPersonagem);
TELA_ESCOLHA.appendChild(confirmarEscolha);
atualizarOpcoes();

document.addEventListener('keydown', e => {
  if (atual !== 'personalizar') return;
  const indice = PERSONAGENS_PRONTOS.findIndex(p => p.id === personagemEscolhido);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    personagemEscolhido = PERSONAGENS_PRONTOS[(indice + delta + PERSONAGENS_PRONTOS.length) % PERSONAGENS_PRONTOS.length].id;
    atualizarOpcoes(); bip(900);
  } else if (e.key === 'Enter') {
    e.preventDefault(); confirmarPersonagem();
  }
});
