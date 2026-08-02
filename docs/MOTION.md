# FASC+ Motion

Utilidades de animação **inspiradas no Framer Motion**, em vanilla JS (sem React).

Arquivo: `js/fasc-motion.js` → expõe `window.fascMotion`.

## Por que não Framer Motion?

Framer Motion é biblioteca **React**. O FASC+ é HTML + JS puro.  
`fasc-motion` cobre o essencial da DX do FM: `animate`, `spring`, `stagger`, `inView`, `variants`, `sequence`.

## Uso rápido

```js
// fade up
fascMotion.preset('fadeUp', '#hero', { duration: 0.45 });

// animate genérico
fascMotion.animate('.post-card', { opacity: '1', transform: 'translateY(0)' }, {
  from: { opacity: '0', transform: 'translateY(12px)' },
  duration: 0.4,
  stagger: 0.05,
  ease: fascMotion.ease.outExpo
});

// spring
fascMotion.spring('.auth-chip', { transform: 'scale(1)' }, {
  from: { transform: 'scale(0.9)' }
});

// quando entra na viewport
fascMotion.inView('.map-section', (el) => {
  fascMotion.preset('fadeUp', el);
}, { once: true });

// sequência
fascMotion.sequence([
  () => fascMotion.preset('fadeIn', '.header'),
  () => fascMotion.preset('fadeUp', '.hero'),
  () => fascMotion.stagger('.post-card', { opacity: '1' }, { from: { opacity: '0' }, stagger: 0.06 })
]);

// variants
fascMotion.variants(el, {
  hidden: { opacity: '0', transform: 'translateY(10px)' },
  visible: { opacity: '1', transform: 'translateY(0)' }
}, 'visible', { from: 'hidden', duration: 0.35 });
```

## Presets

| Nome | Efeito |
|------|--------|
| `fadeUp` | sobe + fade |
| `fadeIn` | só fade |
| `scaleIn` | scale 0.94 → 1 |
| `cardEnter` | card cartaz |
| `press` | scale de press |

## Easings

- `fascMotion.ease.outExpo`
- `fascMotion.ease.outQuart`
- `fascMotion.ease.spring`
- `fascMotion.ease.press`
- `fascMotion.ease.soft`

## A11y

`fascMotion.reducedMotion()` — se `true`, aplica estado final sem animar.  
Respeita `prefers-reduced-motion` e `data-a11y-motion="reduce"`.

## Auto

```html
<body data-motion-auto>
  <section data-motion="enter" data-motion-type="fadeUp"></section>
</body>
```
