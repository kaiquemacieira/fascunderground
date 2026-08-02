# CRICRI · Media queries (mobile-first)

## Viewport (já no HTML)

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

## Breakpoints do projeto

| Token | Query | Uso |
|-------|--------|-----|
| mobile | base (sem query) | 360–599px |
| sm | `min-width: 600px` | tablet / grid 2 colunas |
| md | `min-width: 900px` | desktop / esconder bottom-nav |
| lg | `min-width: 1200px` | layout largo |

## FABs do topo (direita → esquerda)

```
[auth] [lupa] [engrenagem] [sino] [♿ a11y]
```

### CSS de referência (`style.css`)

```css
/* ♿ acessibilidade — canto direito */
.a11y-wrap {
  position: fixed !important;
  top: max(0.65rem, env(safe-area-inset-top));
  right: max(0.65rem, env(safe-area-inset-right));
  z-index: 5000 !important;
}

/* Sino + engrenagem — à esquerda do ♿ */
.cricri-top-tools {
  position: fixed !important;
  top: max(0.65rem, env(safe-area-inset-top)) !important;
  right: calc(0.65rem + 48px + 0.5rem + env(safe-area-inset-right, 0px)) !important;
  z-index: 4995 !important;
  display: flex;
  flex-direction: row-reverse;
  gap: 0.45rem;
}

/* Lupa — à esquerda dos tools */
button.header-search-btn,
#header-search-btn {
  position: fixed !important;
  top: max(0.65rem, env(safe-area-inset-top)) !important;
  right: calc(
    0.65rem + 48px + 0.5rem +
    44px + 0.45rem + 44px + 0.5rem +
    env(safe-area-inset-right, 0px)
  ) !important;
  z-index: 4990 !important;
}

@media (max-width: 899px) {
  .header-search-btn {
    position: fixed !important;
    top: max(0.65rem, env(safe-area-inset-top));
    right: calc(
      0.65rem + 48px + 0.5rem +
      44px + 0.45rem + 44px + 0.5rem +
      env(safe-area-inset-right, 0px)
    );
    z-index: 4990 !important;
  }
}

/* Auth chip — mais à esquerda ainda */
#fasc-auth-root {
  position: fixed !important;
  top: max(0.65rem, env(safe-area-inset-top)) !important;
  right: calc(
    0.65rem + 48px + 0.5rem +
    44px + 0.45rem + 44px + 0.5rem +
    48px + 0.5rem +
    env(safe-area-inset-right, 0px)
  ) !important;
  z-index: 5100 !important;
}
```

## Utilitários mobile-first

```css
.grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

@media (min-width: 600px) {
  .grid-2 { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 900px) {
  .bottom-nav { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

## Arquivos tocados nesta entrega

- `js/notif-bell.js` — sino + engrenagem
- `js/footer.js` — projeto independente, AcidBurn2026, certificado a11y
- `style.css` — posicionamento FABs + media queries
- `profile.html` — conexões no hero, caixinha UP, sem duplicata de editar
- `index.html` / `programacao.html` / `tamagotchi.html` — script do sino
