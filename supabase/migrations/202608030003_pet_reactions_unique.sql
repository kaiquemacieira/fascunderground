-- CRICRI · uma reação por emoji por par (from_user → to_user)
-- Evita spam: cada usuário autenticado só registra 🔥 / 😍 / 🥹 / 👑 uma vez no mesmo bichinho.

create unique index if not exists pet_reactions_from_to_emoji_uidx
  on public.pet_reactions (from_user, to_user, emoji);

comment on index public.pet_reactions_from_to_emoji_uidx is
  'CRICRI: no máximo 1 reação por emoji de um usuário em outro.';
