# BRUMA

Estudo conceitual da **Kyber Tech**: uma marca fictícia de gin apresentada como cena 3D em
tempo real no navegador, em oito capítulos guiados pelo scroll. Frasco com vidro físico,
líquido que muda de violeta para rosé, rótulo com hot stamping e botânicos do cerrado.

**A BRUMA não existe.** Não é cliente, não é produto e nada é vendido aqui. O aviso "estudo
conceitual" aparece no cabeçalho, no índice e no rodapé da própria página.

No ar em **bruma-portfolio.vercel.app**.

## O que tem aqui

HTML e JavaScript, sem build e sem pacote a instalar. Tudo que a página precisa é servido
deste repositório: nenhuma CDN em tempo de execução.

| Caminho | O que é |
| --- | --- |
| `index.html` | A página inteira, oito capítulos, header, índice e fallback |
| `bruma-scene-v2.js` | A cena Three.js: frasco, líquido, rótulo, botânicos, estúdio procedural |
| `support.js` | Runtime do Claude Design, que monta o template da página |
| `vendor/` | Three.js r169, React e ReactDOM 18.3.1, versionados aqui |
| `fonts/` | Italiana, Karla e JetBrains Mono hospedadas aqui (OFL 1.1) |
| `assets/bruma/` | Pôster gerado da cena e as fotografias do capítulo 05 |
| `assets/kyber/` | Logos da Kyber, usados só no capítulo 07 |
| `prototipo/` | Handoff, pranchas, V1 intocada e capturas de referência. **Não vai para o ar** (`.vercelignore`) |

## Como rodar local

Precisa de servidor: os caminhos de asset são absolutos e o `bruma-scene-v2.js` é um módulo
ES, que o `file://` recusa.

```bash
npx serve .
```

## Modo de captura, para gravar vídeo

Parâmetros de URL, todos combináveis:

| Parâmetro | O que faz |
| --- | --- |
| `?capture=1` | Esconde o cursor, desliga a paralaxe de ponteiro, tira a rolagem suave dos saltos e marca `READY` no console, em `html[data-bruma-ready]` e no título da aba |
| `&ui=0` | Esconde header, régua e CTAs, para take de produto |
| `&buffer=1` | Liga `preserveDrawingBuffer`, para gravador que lê o canvas |
| `&quality=alta\|media\|leve\|poster` | Força o perfil de qualidade |
| `&chapter=N` | Abre direto no capítulo N (0 a 7) |
| `&pose=N` | Trava a cena no quadro de repouso do capítulo N, sem conteúdo. Serve para still e take 9:16 |

Teclas: `[` e `]` andam de capítulo, `1` a `8` saltam direto, `F` congela o tempo da cena,
`Esc` fecha o índice. No console, `brumaPose(N)` troca a pose ao vivo.

O storyboard dos dois formatos (16:9 e 9:16) está em `prototipo/Bruma V2 Handoff.dc.html`.

## Regras da casa

- **Nenhuma CDN em tempo de execução.** Three.js, React, ReactDOM e as três fontes são
  servidos daqui. Foi o principal ajuste feito ao sair do protótipo, e não deve ser desfeito:
  a cena inteira ficaria dependendo de o unpkg estar no ar.
- **Todo caminho de asset é absoluto**, a partir da raiz (`/assets/`, `/fonts/`, `/vendor/`).
- **Nada de dizer que a BRUMA é real**, nem de prometer resultado. O texto descreve o que a
  técnica faz, e para. É a mesma regra do site da Kyber.
- **`prototipo/` não vai para o ar.** Está no `.vercelignore` e no `robots.txt`.

## O que ainda está em aberto

- **Autoria das quatro fotografias do capítulo 05.** Ver `CREDITOS.md`: elas vieram da
  Unsplash e o autor ainda não foi confirmado. Resolver antes de tratar a página como final.
- **Vídeo de demonstração.** Ainda não gravado. Quando existir, ele entra em
  `media.somoskyber.com.br/portfolio/bruma/bruma-v1.mp4` e o card no site da Kyber passa a
  ter `publicado: true`.

## Histórico

Nasceu como protótipo do Claude Design (V1, depois V2), fora de qualquer repositório. Virou
repositório e site próprios em 02/09/2026, junto com a Casa Umbra, para o portfólio da Kyber
parar de morar dentro do repositório do site.
