-- ============================================================
-- 029 — email_queue: la tabla que faltaba debajo del sistema de correo
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- ESTADO PREVIO: el sistema de email transaccional estaba escrito
-- ENTERO y no podía funcionar. Existían el wrapper (src/lib/resend.ts),
-- las cinco plantillas React Email y el drainer
-- (/api/cron/drain-email-queue) — pero NINGUNA migración creaba la
-- tabla `email_queue` que el drainer consulta, y nadie encolaba nada.
-- Un cliente pagaba y no recibía absolutamente nada.
--
-- Esta migración pone las dos piezas que faltan: la cola y el trigger
-- que la llena.
--
-- POR QUÉ UNA COLA Y NO ENVIAR DIRECTO desde el webhook de pago: si
-- Resend está caído o lento, un envío en línea o bien bloquea la
-- confirmación del pago o bien se pierde sin dejar rastro. Con cola, el
-- pedido se confirma siempre y el correo se reintenta hasta 5 veces.
--
-- IDEMPOTENCIA: índice único parcial (pedido_id, tipo) — un correo de
-- cada tipo por pedido, pase lo que pase. Los webhooks de Culqi y
-- MercadoPago pueden reenviar el mismo evento; sin esto, el cliente
-- recibiría la confirmación tres veces.
-- OJO: al ser un índice PARCIAL, todo ON CONFLICT contra él debe
-- repetir el predicado `where pedido_id is not null`, o Postgres tira
-- 42P10 y no lo encuentra.
-- ============================================================

-- ---------- 1. La cola ----------
-- El tipo de pedido_id se descubre en vez de asumirse: `pedidos` la
-- creó el repo de Flores Eternas, no este, y una FK con el tipo
-- equivocado aborta la migración entera.
do $$
declare
  v_tipo_id text;
begin
  select data_type into v_tipo_id
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'pedidos'
     and column_name  = 'id';

  if v_tipo_id is null then
    raise exception 'No existe public.pedidos.id — ¿proyecto equivocado?';
  end if;

  execute format($fmt$
    create table if not exists public.email_queue (
      id             uuid primary key default gen_random_uuid(),
      pedido_id      %s references public.pedidos(id) on delete cascade,
      cliente_email  text not null,
      tipo           text not null,
      payload        jsonb,
      estado         text not null default 'pendiente',
      intentos       int  not null default 0,
      scheduled_at   timestamptz not null default now(),
      sent_at        timestamptz,
      ultimo_error   text,
      created_at     timestamptz not null default now()
    )
  $fmt$, v_tipo_id);
end $$;

-- Los CHECK van aparte para que re-ejecutar la migración no falle.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'email_queue_estado_check') then
    alter table public.email_queue add constraint email_queue_estado_check
      check (estado in ('pendiente','enviado','fallido','omitido'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'email_queue_tipo_check') then
    alter table public.email_queue add constraint email_queue_tipo_check
      check (tipo in ('pedido_creado','pedido_pagado','pedido_en_reparto',
                      'pedido_entregado','review_request','bienvenida'));
  end if;
end $$;

-- ---------- 2. Índices ----------
-- El drainer pide: estado='pendiente' AND scheduled_at<=now(), ordenado
-- por scheduled_at. Este índice cubre exactamente esa consulta.
create index if not exists email_queue_pendientes_idx
  on public.email_queue (scheduled_at)
  where estado = 'pendiente';

create unique index if not exists email_queue_pedido_tipo_uniq
  on public.email_queue (pedido_id, tipo)
  where pedido_id is not null;

-- ---------- 3. RLS ----------
-- La cola guarda nombre y correo de clientes: dato personal bajo la
-- Ley 29733. No lleva NINGUNA policy a propósito — con RLS activo y
-- cero policies, sólo service_role entra. La clave anon, que es
-- pública por diseño y viaja en el bundle del navegador, no puede
-- leer ni un registro.
alter table public.email_queue enable row level security;

-- ---------- 4. Quién encola ----------
create or replace function public.encolar_email_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j      jsonb := to_jsonb(new);
  v_mail text  := nullif(trim(coalesce(j->>'cliente_email','')), '');
  v_ant  text  := case when tg_op = 'UPDATE' then to_jsonb(old)->>'estado' else null end;
  v_new  text  := j->>'estado';
begin
  -- Sin correo no hay nada que encolar. Un pedido tomado por WhatsApp
  -- puede no tenerlo, y eso no debe romper el alta del pedido.
  if v_mail is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.email_queue (pedido_id, cliente_email, tipo)
    values (new.id, v_mail, 'pedido_creado')
    on conflict (pedido_id, tipo) where pedido_id is not null do nothing;

    -- Un pedido que nace ya pagado (Yape confirmado en el acto) no
    -- dispara UPDATE, así que su confirmación se encola acá o nunca.
    if v_new = 'pagado' then
      insert into public.email_queue (pedido_id, cliente_email, tipo)
      values (new.id, v_mail, 'pedido_pagado')
      on conflict (pedido_id, tipo) where pedido_id is not null do nothing;
    end if;

    return new;
  end if;

  -- UPDATE: sólo interesa el cambio de estado, no cualquier edición.
  if v_ant is not distinct from v_new then
    return new;
  end if;

  if v_new = 'pagado' then
    insert into public.email_queue (pedido_id, cliente_email, tipo)
    values (new.id, v_mail, 'pedido_pagado')
    on conflict (pedido_id, tipo) where pedido_id is not null do nothing;

  elsif v_new = 'enviado' then
    insert into public.email_queue (pedido_id, cliente_email, tipo)
    values (new.id, v_mail, 'pedido_en_reparto')
    on conflict (pedido_id, tipo) where pedido_id is not null do nothing;

  elsif v_new = 'entregado' then
    insert into public.email_queue (pedido_id, cliente_email, tipo)
    values (new.id, v_mail, 'pedido_entregado')
    on conflict (pedido_id, tipo) where pedido_id is not null do nothing;

    -- La reseña se pide 7 días después de la entrega, no el mismo día:
    -- todavía no probó el producto. El drainer respeta scheduled_at.
    insert into public.email_queue (pedido_id, cliente_email, tipo, scheduled_at)
    values (new.id, v_mail, 'review_request', now() + interval '7 days')
    on conflict (pedido_id, tipo) where pedido_id is not null do nothing;
  end if;

  return new;
end $$;

drop trigger if exists trg_encolar_email_pedido on public.pedidos;
create trigger trg_encolar_email_pedido
  after insert or update of estado on public.pedidos
  for each row execute function public.encolar_email_pedido();

-- ---------- 5. Verificación ----------
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='email_queue';
  raise notice 'email_queue creada con % columnas', n;
  if not exists (select 1 from pg_trigger where tgname='trg_encolar_email_pedido') then
    raise exception 'El trigger no quedó instalado';
  end if;
  raise notice 'Trigger trg_encolar_email_pedido instalado sobre pedidos';
end $$;
