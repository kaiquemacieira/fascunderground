-- CRICRI · STEP_M — presentear cartão duplicado
-- Rode no SQL Editor (fasc-dev / fasc-prod).
-- Pré-req: migration 202608030001_tama_state_public.sql

create or replace function public.gift_tama_card(
  p_to_user uuid,
  p_card_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid := auth.uid();
  v_card text;
  v_allowed text[] := array[
    'c_ovo','c_pastel','c_banho','c_soneca','c_mapa',
    'r_filhote','r_convento','r_after','r_scrap','r_care',
    'sr_lenda','sr_sergipe','sr_festival','sr_ouro'
  ];
  v_from_row public.tama_state%rowtype;
  v_to_row public.tama_state%rowtype;
  v_from_state jsonb;
  v_to_state jsonb;
  v_from_cards jsonb;
  v_to_cards jsonb;
  v_entry jsonb;
  v_from_cnt int;
  v_to_cnt int;
  v_now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  v_uid_a uuid;
  v_uid_b uuid;
begin
  if v_from is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if p_to_user is null then
    raise exception 'invalid_to_user' using errcode = '22023';
  end if;

  if p_to_user = v_from then
    raise exception 'cannot_gift_self' using errcode = '22023';
  end if;

  v_card := lower(trim(both from coalesce(p_card_id, '')));
  if v_card = '' or not (v_card = any (v_allowed)) then
    raise exception 'invalid_card_id' using errcode = '22023';
  end if;

  if v_from::text < p_to_user::text then
    v_uid_a := v_from;
    v_uid_b := p_to_user;
  else
    v_uid_a := p_to_user;
    v_uid_b := v_from;
  end if;

  perform 1 from public.tama_state where user_id = v_uid_a for update;
  perform 1 from public.tama_state where user_id = v_uid_b for update;

  select * into v_from_row from public.tama_state where user_id = v_from for update;
  if not found then
    raise exception 'donor_no_tama' using errcode = 'P0002';
  end if;

  select * into v_to_row from public.tama_state where user_id = p_to_user for update;
  if not found then
    raise exception 'recipient_no_tama' using errcode = 'P0002';
  end if;

  v_from_state := coalesce(v_from_row.state, '{}'::jsonb);
  v_to_state := coalesce(v_to_row.state, '{}'::jsonb);

  if coalesce((v_from_state->>'started')::boolean, false) is not true then
    raise exception 'donor_no_tama' using errcode = 'P0002';
  end if;
  if coalesce((v_to_state->>'started')::boolean, false) is not true then
    raise exception 'recipient_no_tama' using errcode = 'P0002';
  end if;

  v_from_cards := coalesce(v_from_state->'cards', '{}'::jsonb);
  v_to_cards := coalesce(v_to_state->'cards', '{}'::jsonb);

  v_entry := v_from_cards->v_card;
  if v_entry is null or v_entry = 'null'::jsonb then
    v_from_cnt := 0;
  elsif jsonb_typeof(v_entry) = 'number' then
    v_from_cnt := greatest(0, (v_entry #>> '{}')::int);
  elsif jsonb_typeof(v_entry) = 'boolean' then
    v_from_cnt := case when (v_entry #>> '{}')::boolean then 1 else 0 end;
  elsif jsonb_typeof(v_entry) = 'object' then
    v_from_cnt := greatest(0, coalesce((v_entry->>'count')::int, 1));
  else
    v_from_cnt := 1;
  end if;

  if v_from_cnt < 2 then
    raise exception 'no_duplicate' using errcode = 'P0001';
  end if;

  v_entry := v_to_cards->v_card;
  if v_entry is null or v_entry = 'null'::jsonb then
    v_to_cnt := 0;
  elsif jsonb_typeof(v_entry) = 'number' then
    v_to_cnt := greatest(0, (v_entry #>> '{}')::int);
  elsif jsonb_typeof(v_entry) = 'boolean' then
    v_to_cnt := case when (v_entry #>> '{}')::boolean then 1 else 0 end;
  elsif jsonb_typeof(v_entry) = 'object' then
    v_to_cnt := greatest(0, coalesce((v_entry->>'count')::int, 1));
  else
    v_to_cnt := 1;
  end if;

  v_from_cnt := v_from_cnt - 1;
  v_to_cnt := v_to_cnt + 1;

  v_from_cards := jsonb_set(
    v_from_cards,
    array[v_card],
    jsonb_build_object(
      'count', v_from_cnt,
      'at', coalesce(nullif(v_from_cards->v_card->>'at', '')::bigint, v_now_ms)
    ),
    true
  );

  v_to_cards := jsonb_set(
    v_to_cards,
    array[v_card],
    jsonb_build_object('count', v_to_cnt, 'at', v_now_ms),
    true
  );

  v_from_state := jsonb_set(v_from_state, '{cards}', v_from_cards, true);
  v_to_state := jsonb_set(v_to_state, '{cards}', v_to_cards, true);

  update public.tama_state
  set state = v_from_state, updated_at = now()
  where user_id = v_from;

  update public.tama_state
  set state = v_to_state, updated_at = now()
  where user_id = p_to_user;

  return jsonb_build_object(
    'ok', true,
    'card_id', v_card,
    'from_user', v_from,
    'to_user', p_to_user,
    'from_count', v_from_cnt,
    'to_count', v_to_cnt
  );
end;
$$;

revoke all on function public.gift_tama_card(uuid, text) from public;
grant execute on function public.gift_tama_card(uuid, text) to authenticated;

select 'STEP_M gift_tama_card ok' as status;
