# Jogo (inspirado em Muse Dash)

Tela inicial + tela de personalizar personagem montada por camadas.

## Como rodar
1. Instale o Python 3 (não precisa instalar mais nada).
2. Na pasta do projeto:  `python app.py`
3. Abra http://localhost:8000 no navegador.

## Estrutura
- `app.py` – servidor em Python (serve o jogo e salva o personagem em `dados/personagem.json`)
- `static/index.html` – página do jogo
- `static/css/style.css` – estilos
- `static/js/jogo.js` – telas, painel de personalização e desenho do personagem por camadas
- `static/img/tela-inicial.png`, `tela-personalizar.png` – fundos das telas
- `static/img/partes/` (mulher) e `static/img/partes-m/` (homem) – peças separadas (corpo, rosto, cabelo, top, bottom, calcado, acess) + `manifest.json` com os ajustes de posição (`cfg`)

## Como funciona o personagem
Camadas, de trás para frente: corpo, calçado, parte de baixo, parte de cima, rosto, cabelo, acessório.
Cabelo e roupas são recoloridos pelas cores escolhidas; a pele recolore corpo e rosto.
Os ajustes de posição ficam no início da função `desenhar()` em `static/js/jogo.js`.

## Jogo (botão JOGAR)
- Escolha uma dificuldade para ver seu mapa; use INICIAR para jogar no mapa padrão ou ESCOLHER MÚSICA para selecionar a trilha antes. Há botões VOLTAR nas telas de configuração.
- As telas têm brilhos flutuantes; os mapas passeiam suavemente e os botões usam cores e brilho inspirados na arte do jogo.
- Inimigos chegam da direita em duas pistas: chão e ar. A música e o mapa são gerados em código.
- Chão: ↓, S, F, D ou Espaço (ou toque na metade de baixo). Ar: ↑, W, J ou K (ou toque na metade de cima).
- P ou Esc pausa. A liga o modo automático (demonstração).
- O jogador é o personagem montado na tela de personalizar.

## Animações do jogador
Poses em `static/img/personagem/` (run0–run3, idle, kick, hurt, jump).
Correr = ciclo de 4 quadros; pista do chão = chute; pista do ar = pulo; erro = pose de dano com piscada, tremor e flash vermelho.

## Personalização
Personagem padrão: careca, com roupa básica. Escolha MULHER ou HOMEM no topo do painel; use 🚫 para tirar cabelo, roupa ou acessório (há também o botão TIRAR TODA A ROUPA na aba Roupa).

## Peças (folha nova)
As peças de mulher (`static/img/partes/`) e homem (`static/img/partes-m/`) vêm da folha organizada: 12/20 cabelos, 16 camisetas, 20/16 roupas de baixo, 20 calçados, 16 rostos, 11 acessórios e paletas de pele (30) e cores (72). Os ajustes de posição ficam em `manifest.json` (campo `cfg`).
