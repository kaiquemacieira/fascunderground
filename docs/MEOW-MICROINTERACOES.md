# MEOW · microinterações de envio anônimo

## Mapa de momentos

| Momento | Feedback | Por quê |
|---------|----------|---------|
| **Focus no texto** | Bubble “levanta” + ring suave | Confirma que a cena é o cartaz |
| **Digitando** | Contador tabular + pulse | Progresso sem ansiedade |
| **> 240 chars** | Contador em vermelho | Aviso antes do limite |
| **Toggle anônimo** | Badge 🙈 ↔ 👁 | Deixa o contrato de privacidade visível |
| **Submit vazio** | Shake na bubble | Erro no objeto, não no botão |
| **Press Meow** | Botão afunda (cartaz) + “Miaando…” + pata bounce | Press físico de cartaz colado |
| **Sending** | Cartaz satura e encolhe 1,5% | Algo está saindo da tela |
| **Sucesso** | Stamp “MEOW ✓” + patas voando + botão verde “Enviado” + vibrate curto | Ritual de despedida do scrap |
| **Erro rede** | Shake + msg | Falha honesta, sem confete |
| **Chip no mural** | Press scale | Continuidade do gesto Meow |

## Princípios
1. **Silêncio no load** — nada anima sozinho ao abrir a página.
2. **Anonimato legível** — o estado 🙈/👁 muda na hora do toggle.
3. **Uma mão só** — targets grandes, press imediato, sem modal.
4. **`prefers-reduced-motion`** — remove stamp, patas, shake e bounce; mantém texto de status.
5. **Háptica opt-in do SO** — `vibrate` curto só no sucesso (o browser pede permissão implícita em gestos).

## Copy de status
- Vazio: *Escreve o scrap antes do Meow.*
- Sucesso: *Meow enviado 🐾 — a rua não viu quem foi.*
- Loading: *Miaando…*

## Fase 2 (não implementado)
- Som opt-in (< 8 KB) no stamp
- Cartaz “voa” para o canto e some
- Confetti só se `prefers-reduced-motion: no` e flag de produto
