# Síntese granular · CRICRI SFX

## O que é
Em vez de um sample contínuo, o som é feito de **muitos grãos** curtos (20–60 ms) tirados de um buffer, com:
- offset aleatório no buffer
- playback rate ± jitter
- envelope Hann
- pan estéreo ± jitter

## Buffers fonte (gerados no client)
| id | Conteúdo |
|----|----------|
| `meow` | formantes + glide (miado sintético) |
| `bell` | parciais harmônicas amortecidas |
| `noise` | ruído rosado |

## Presets
`meow`, `post`, `play`, `evolve`, `sleep`, `ambient`, `error`, `pop`…

## API
```js
CricriSfx.play('meow')

CricriSfx.granular({
  source: 'meow',
  duration: 0.35,
  grainMs: 36,
  density: 60,
  playbackRate: 1.05,
  rateJitter: 0.18,
  posJitter: 0.75,
  gain: 0.07,
  panJitter: 0.55
})
```

## Limites (mobile)
- máx. ~80 grãos por gesto
- sem arquivos externos
- mute + gesto do usuário obrigatório
