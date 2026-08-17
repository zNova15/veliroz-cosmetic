-- ============================================================
-- 018 — Programa de referidos
-- Aplicada: 2026-08-17 · project usfpzlxmmgruydqbymsx
-- (consolidada: incluye el fix de la 018d ya aplicado)
-- ============================================================
--
-- CÓMO FUNCIONA:
--   · Cada cliente tiene un código propio (VELI-XXXX).
--   · Quien lo usa (el referido) recibe 10% off su PRIMERA compra,
--     con tope de S/30 para que no se coma el margen de un bundle.
--   · Quien refirió gana S/20 de crédito, pero recién cuando el
--     pedido del referido pasa a 'pagado'. Antes queda 'pendiente':
--     si el pedido se cancela, no se paga nada.
--
-- ANTI-ABUSO (verificado con simulación, migs 018b/018c/018e — datos
-- borrados en la 018f):
--   · No se puede usar el propio código — se compara cliente_id Y
--     email, porque el mismo humano puede entrar como invitado.
--   · Sólo aplica si el referido no tiene pedidos pagados previos.
--   · Un cliente puede ser referido UNA sola vez (índice único).
--   · El crédito se acredita una vez por pedido: se probó con cuatro
--     UPDATE de estado seguidos (pagado → pagado → en_reparto →
--     entregado) y el crédito quedó en S/20, no en S/80.
--
-- TRAMPA ENCONTRADA POR LA SIMULACIÓN: `referidos_usos_pedido_unico`
-- es un índice PARCIAL (WHERE pedido_id is not null) y Postgres no lo
-- usa para resolver un ON CONFLICT si no se repite el predicado. La
-- primera versión decía `on conflict (pedido_id) do nothing` y tiraba
-- 42P10 — el primer pedido con referido habría fallado en producción.
-- La forma correcta, ya aplicada abajo:
--     on conflict (pedido_id) where pedido_id is not null do nothing
--
-- La validación va por RPC SECURITY DEFINER: el anon key nunca lee la
-- tabla de códigos (si no, cualquiera enumera los referidos y ve
-- cuánto factura cada cliente).
--
-- PARÁMETROS EN TABLA (referidos_config), no hardcodeados, para
-- cambiar porcentaje/tope/crédito sin deploy.
-- ============================================================

-- ---------- Parámetros del programa ----------
create table if not exists referidos_config (
  id                   boolean primary key default true, -- fila única
  descuento_pct        numeric not null default 10,   -- % off al referido
  descuento_tope       numeric not null default 30,   -- tope S/ del descuento
  credito_por_referido numeric not null default 20,   -- S/ al que refiere
  min_subtotal         numeric not null default 89,   -- piso para que aplique
  activo               boolean not null default true,
  constraint referidos_config_fila_unica check (id = true)
);

insert into referidos_config (id) values (true) on conflict (id) do nothing;

-- ---------- Códigos ----------
create table if not exists referidos (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique,
  cliente_id         uuid not null references clientes(id) on delete cascade,
  usos_confirmados   integer not null default 0,
  credito_generado   numeric not null default 0,
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  constraint referidos_un_codigo_por_cliente unique (cliente_id)
);

create index if not exists referidos_codigo_idx on referidos (upper(codigo));

-- ---------- Usos ----------
create table if not exists referidos_usos (
  id                   uuid primary key default gen_random_uuid(),
  referido_id          uuid not null references referidos(id) on delete cascade,
  cliente_referido_id  uuid references clientes(id) on delete set null,
  email_referido       text not null,
  pedido_id            uuid references pedidos(id) on delete set null,
  descuento_aplicado   numeric not null default 0,
  credito_generado     numeric not null default 0,
  estado               text not null default 'pendiente',
  created_at           timestamptz not null default now(),
  confirmado_at        timestamptz,
  constraint referidos_usos_estado_check
    check (estado in ('pendiente','confirmado','anulado'))
);

create unique index if not exists referidos_usos_cliente_unico
  on referidos_usos (cliente_referido_id)
  where cliente_referido_id is not null and estado <> 'anulado';

create unique index if not exists referidos_usos_pedido_unico
  on referidos_usos (pedido_id)
  where pedido_id is not null;

create index if not exists referidos_usos_referido_idx on referidos_usos (referido_id);

-- ---------- Crédito del cliente ----------
alter table clientes
  add column if not exists credito_disponible numeric not null default 0;

-- ============================================================
-- Funciones (extraídas de la BD con pg_get_functiondef, así que
-- esto es exactamente lo que corre en producción)
-- ============================================================

create or replace function gen_codigo_referido()
returns text
language plpgsql
as $$
declare
  -- Alfabeto sin 0/O/1/I/L: el código se dicta por teléfono y por WhatsApp.
  v_alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_codigo   text;
  v_intento  integer := 0;
begin
  loop
    v_codigo := 'VELI-';
    for i in 1..4 loop
      v_codigo := v_codigo || substr(
        v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1
      );
    end loop;
    exit when not exists (select 1 from referidos where upper(codigo) = v_codigo);
    v_intento := v_intento + 1;
    if v_intento > 50 then
      -- 31^4 ~ 923k combinaciones: si choca 50 veces, algo está mal.
      raise exception 'No se pudo generar un código de referido único';
    end if;
  end loop;
  return v_codigo;
end;
$$;

create or replace function obtener_codigo_referido(p_cliente_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  select codigo into v_codigo from referidos where cliente_id = p_cliente_id;
  if v_codigo is not null then
    return v_codigo;
  end if;

  insert into referidos (codigo, cliente_id)
  values (gen_codigo_referido(), p_cliente_id)
  on conflict (cliente_id) do update set codigo = referidos.codigo
  returning codigo into v_codigo;

  return v_codigo;
end;
$$;

create or replace function validar_codigo_referido(
  p_codigo   text,
  p_email    text,
  p_subtotal numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg        referidos_config;
  v_ref        referidos;
  v_cliente_id uuid;
  v_descuento  numeric;
begin
  select * into v_cfg from referidos_config where id = true;
  if v_cfg is null or not v_cfg.activo then
    return jsonb_build_object('ok', false, 'motivo', 'programa_inactivo');
  end if;

  select * into v_ref from referidos
  where upper(codigo) = upper(trim(p_codigo)) and activo = true;

  if v_ref is null then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
  end if;

  if p_subtotal < v_cfg.min_subtotal then
    return jsonb_build_object(
      'ok', false, 'motivo', 'subtotal_bajo',
      'min_subtotal', v_cfg.min_subtotal
    );
  end if;

  -- Es el propio dueño? Se chequea por email además de por id, porque
  -- el mismo humano puede estar comprando como invitado sin cliente_id.
  select id into v_cliente_id from clientes where email = p_email::citext;

  if v_cliente_id is not null and v_cliente_id = v_ref.cliente_id then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_propio');
  end if;

  if exists (
    select 1 from clientes c
    where c.id = v_ref.cliente_id and c.email = p_email::citext
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_propio');
  end if;

  -- Ya fue referido antes?
  if exists (
    select 1 from referidos_usos u
    where u.estado <> 'anulado'
      and (
        (v_cliente_id is not null and u.cliente_referido_id = v_cliente_id)
        or lower(u.email_referido) = lower(p_email)
      )
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_referido');
  end if;

  -- Sólo primera compra: si ya pagó algo antes, no aplica.
  if exists (
    select 1 from pedidos p
    where p.cliente_email = p_email::citext
      and p.estado in ('pagado','en_reparto','entregado')
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'no_es_primera_compra');
  end if;

  v_descuento := least(
    round(p_subtotal * v_cfg.descuento_pct / 100.0, 2),
    v_cfg.descuento_tope
  );

  return jsonb_build_object(
    'ok', true,
    'codigo', v_ref.codigo,
    'descuento', v_descuento,
    'descuento_pct', v_cfg.descuento_pct,
    'tope', v_cfg.descuento_tope
  );
end;
$$;

create or replace function registrar_uso_referido(
  p_codigo    text,
  p_pedido_id uuid,
  p_email     text,
  p_descuento numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref        referidos;
  v_cliente_id uuid;
begin
  if p_pedido_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'pedido_requerido');
  end if;

  select * into v_ref from referidos
  where upper(codigo) = upper(trim(p_codigo)) and activo = true;

  if v_ref is null then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
  end if;

  select id into v_cliente_id from clientes where email = p_email::citext;

  insert into referidos_usos (
    referido_id, cliente_referido_id, email_referido,
    pedido_id, descuento_aplicado, estado
  )
  values (
    v_ref.id, v_cliente_id, lower(p_email),
    p_pedido_id, coalesce(p_descuento, 0), 'pendiente'
  )
  -- El predicado se REPITE a propósito: el índice único es parcial y sin
  -- esto Postgres tira 42P10. Ver la nota del encabezado.
  on conflict (pedido_id) where pedido_id is not null do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function tg_confirmar_referido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg referidos_config;
  v_uso referidos_usos;
begin
  if new.estado not in ('pagado','en_reparto','entregado') then
    return new;
  end if;
  if old.estado = new.estado then
    return new;
  end if;

  -- Sólo hay algo que confirmar si el uso sigue 'pendiente'. Por eso los
  -- avances de estado posteriores (en_reparto, entregado) no re-acreditan.
  select * into v_uso from referidos_usos
  where pedido_id = new.id and estado = 'pendiente'
  for update;

  if v_uso is null then
    return new;
  end if;

  select * into v_cfg from referidos_config where id = true;

  update referidos_usos
  set estado           = 'confirmado',
      credito_generado = v_cfg.credito_por_referido,
      confirmado_at    = now()
  where id = v_uso.id;

  update referidos
  set usos_confirmados = usos_confirmados + 1,
      credito_generado = credito_generado + v_cfg.credito_por_referido
  where id = v_uso.referido_id;

  update clientes c
  set credito_disponible = c.credito_disponible + v_cfg.credito_por_referido
  from referidos r
  where r.id = v_uso.referido_id and c.id = r.cliente_id;

  return new;
end;
$$;

-- ---------- Trigger ----------
drop trigger if exists trg_confirmar_referido on pedidos;
create trigger trg_confirmar_referido
  after update of estado on pedidos
  for each row
  execute function tg_confirmar_referido();

-- ============================================================
-- RLS — el anon key no lee estas tablas; todo pasa por los RPC
-- ============================================================
alter table referidos        enable row level security;
alter table referidos_usos   enable row level security;
alter table referidos_config enable row level security;

drop policy if exists referidos_self_read on referidos;
create policy referidos_self_read on referidos
  for select
  using (
    exists (
      select 1 from clientes c
      where c.id = referidos.cliente_id
        and c.firebase_uid = auth.jwt() ->> 'sub'
    )
  );

drop policy if exists referidos_config_read on referidos_config;
create policy referidos_config_read on referidos_config
  for select using (true);   -- los parámetros del programa son públicos

-- referidos_usos: sin policy de select → nadie lo lee con anon key.
-- Sólo los RPC (SECURITY DEFINER) y el staff vía service_role.

grant execute on function obtener_codigo_referido(uuid)                     to anon, authenticated;
grant execute on function validar_codigo_referido(text, text, numeric)      to anon, authenticated;
grant execute on function registrar_uso_referido(text, uuid, text, numeric) to anon, authenticated;
