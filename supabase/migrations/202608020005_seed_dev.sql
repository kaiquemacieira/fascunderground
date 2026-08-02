-- FASC+ · Etapa 7 — seed DEV only (NÃO rodar em prod)
-- Nota: profiles precisam de UUIDs em auth.users. Em dev, use o Dashboard
-- para criar usuários de teste OU comente a parte de profiles e use IDs reais.
-- Este seed foca em spots + afters (não dependem de auth) e posts só se houver profiles.

-- SPOTS (São Cristóvão — coords alinhadas ao mock.js)
insert into public.spots (slug, name, lat, lng, radius_m, status) values
  ('convento-sao-francisco', 'Convento São Francisco', -11.0149, -37.2047, 100, 'rolando agora'),
  ('praca-sao-francisco', 'Praça São Francisco', -11.0152, -37.2052, 120, '62% pronto'),
  ('igreja-matriz', 'Igreja Matriz', -11.0138, -37.2068, 90, 'vai rolar às 23h'),
  ('largo-amparo', 'Largo do Amparo', -11.0165, -37.2075, 85, 'terminou'),
  ('casa-do-sabao', 'Rua da Feira', -11.014, -37.208, 95, 'rolando agora')
on conflict (slug) do update set
  status = excluded.status,
  lat = excluded.lat,
  lng = excluded.lng,
  radius_m = excluded.radius_m,
  updated_at = now();

-- AFTERS (próximas 48h a partir de now() do servidor)
insert into public.afters (title, spot_id, category, starts_at)
select v.title, s.id, v.category, now() + v.offset_h * interval '1 hour'
from (values
  ('After no Bar do Zé',        'bar-do-ze',     'música',  6::int),
  ('Roda fechada na Bica',      'roda-bica',     'música',  10),
  ('Projeção no Largo',         'largo-matriz',  'arte',    26),
  ('Quieta no Quintal',         'quintal-ana',   'encontro',30)
) as v(title, slug, category, offset_h)
join public.spots s on s.slug = v.slug
where not exists (
  select 1 from public.afters a where a.title = v.title
);
