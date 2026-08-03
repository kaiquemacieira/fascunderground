-- CRICRI · reação por emoji no MEOW (sem precisar responder)
-- Coluna nullable; só o dono do recado recebido atualiza (policy UPDATE já existente).

alter table public.inbox_anon
  add column if not exists reaction text;

-- restringe ao conjunto fixo (ou null)
alter table public.inbox_anon
  drop constraint if exists inbox_anon_reaction_check;

alter table public.inbox_anon
  add constraint inbox_anon_reaction_check
  check (
    reaction is null
    or reaction in ('🔥', '💛', '🥹')
  );

comment on column public.inbox_anon.reaction is
  'CRICRI: reação rápida do dono da caixinha (🔥 💛 🥹). Alternativa à reply pública.';
