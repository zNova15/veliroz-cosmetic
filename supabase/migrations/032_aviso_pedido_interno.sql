-- ============================================================
-- 032 — aviso interno de pedido nuevo
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- ESTADO PREVIO: entra un pedido y no se entera nadie. La cola de la
-- 029 sólo encola correos PARA LA CLIENTA; del lado nuestro la única
-- señal de una venta es que ella escriba al WhatsApp por su cuenta.
-- Con el stock en 0 y todo en pre-venta eso no es un problema de
-- cortesía: cada pedido es además la orden de compra al proveedor. Si
-- nadie lo ve, no se cumple, y la clienta espera un producto que nunca
-- se pidió.
--
-- QUÉ AGREGA: un séptimo tipo de correo, 'pedido_nuevo_interno', que
-- no va a la clienta sino a nosotros, y el encolado que lo dispara.
--
-- ---------- POR QUÉ EL TRIGGER Y NO LA SERVER ACTION ----------
-- El aviso lo encola `encolar_email_pedido` (el trigger de la 029) y
-- NO `crearPedidoAction`. Tres razones, en orden de peso:
--
--   1. La action es el camino de cobro, y ya estuvo caída 18 días sin
--      que nadie se enterara (42702 de la 021). Todo lo que se le
--      agrega ahí es una forma nueva de romperla. Un insert a
--      email_queue desde la action tendría que ir envuelto en un
--      try/catch que se trague el error para no tumbar la compra —
--      es decir: el aviso fallaría en silencio, que es exactamente el
--      problema que esta migración viene a resolver.
--
--   2. La action cubre UN camino: el checkout web de cosmetic. Los
--      pedidos que entran por el bot de WhatsApp, por el CRM o a mano
--      no pasan por ahí y quedarían sin aviso. El trigger está sobre
--      `pedidos`: cubre todo lo que llegue a esa tabla, venga de donde
--      venga.
--
--   3. El trigger corre DENTRO de la transacción del pedido. No hay
--      pedido sin aviso ni aviso sin pedido. Desde la action, entre el
--      commit del RPC y el insert a la cola hay una ventana en la que
--      el proceso se puede caer y el pedido queda mudo.
--
-- Contra: el trigger dispara para las CUATRO líneas (flores,
-- bienestar, chocotejas, cosmetic), no sólo cosmetic. Se deja así a
-- propósito — el mismo criterio que ya usa 'pedido_creado', que
-- también se encola para todas. Una venta de cualquier línea que nadie
-- ve es igual de cara. La línea viaja en el correo (envio_meta.linea)
-- para que se distinga de un vistazo.
--
-- ---------- DESTINATARIO ----------
-- `email_queue.cliente_email` es NOT NULL y para los otros seis tipos
-- es el destinatario. Para éste NO lo es: se guarda el marcador
-- 'interno@veliroz.com' y el destino real lo resuelve el drainer desde
-- la variable EMAIL_INTERNO (Vercel), con hola@veliroz.com de default.
-- El correo de la clienta va en `payload.cliente_email`, que es de
-- donde el drainer saca el Reply-To. Dos motivos para no guardarlo en
-- la columna: un pedido de WhatsApp puede no tener correo (y el NOT
-- NULL lo rechazaría), y la dirección interna no debe vivir hardcodeada
-- en una función de Postgres que sólo se cambia con otra migración.
--
-- ---------- SIN BACKFILL ----------
-- No se encolan avisos de los pedidos ya existentes. El índice único
-- los aceptaría sin duplicar, pero mandaría correos de pedidos viejos
-- ya atendidos, y un aviso operativo que llega tarde entrena a
-- ignorarlo. Empieza a valer desde el próximo pedido.
--
-- OJO 42P10: el índice de idempotencia es PARCIAL
-- (pedido_id, tipo) WHERE pedido_id IS NOT NULL. Todo ON CONFLICT
-- contra él repite el predicado `where pedido_id is not null` o
-- Postgres no lo encuentra y aborta. Ver 018 y 029.
-- ============================================================

-- ---------- 1. Ampliar el CHECK de tipo ----------
-- Drop + add: un CHECK no se "amplía", se reemplaza. Va guardado para
-- que re-correr la migración no falle.
--
-- SI AGREGÁS OTRO TIPO MÁS ADELANTE: repetí este bloque con la lista
-- COMPLETA. Los siete de acá ya son los válidos; una migración que
-- sólo sume el suyo y olvide 'pedido_nuevo_interno' rompe este aviso
-- en el siguiente pedido, y el trigger falla dentro de la transacción
-- del pedido — es decir, tumba el checkout.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_queue_tipo_check'
  ) then
    raise notice 'email_queue_tipo_check no existía — se crea de cero';
  else
-- ⚠️ ESTA LISTA ESTÁ DUPLICADA A PROPÓSITO EN LAS MIGRACIONES 031 Y 032.
-- Postgres no tiene ALTER CONSTRAINT para un CHECK: hay que hacer drop + add,
-- y eso significa que la última migración que corra deja escrita SU lista y
-- borra la de la otra. Las dos se escribieron el mismo día, cada una agregando
-- sus propios tipos, y el resultado era que aplicar 031→032 dejaba fuera los
-- correos del Libro de Reclamaciones (23514 al insertar) y aplicar 032→031
-- dejaba fuera el aviso de pedido nuevo.
-- Con la lista IDÉNTICA en las dos, el orden de aplicación deja de importar.
-- Si alguna vez se agrega un tipo, va en las dos, o vuelve el mismo problema.
    alter table public.email_queue drop constraint email_queue_tipo_check;
  end if;

  alter table public.email_queue add constraint email_queue_tipo_check
    check (tipo in ('pedido_creado','pedido_pagado','pedido_en_reparto',
                    'pedido_entregado','review_request','bienvenida',
                    'pedido_nuevo_interno','reclamo_recibido','reclamo_interno'));
end $$;

-- ---------- 2. El trigger, reescrito entero ----------
-- Se reescribe completa (create or replace) en vez de parchearla: la
-- función es corta y una versión parcial en la base es imposible de
-- auditar después. El único cambio real respecto de la 029 es el
-- bloque nuevo del INSERT y el orden en que se evalúa la falta de
-- correo.
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
  -- ---------- Aviso interno ----------
  -- Va PRIMERO y fuera del guard de `v_mail is null` a propósito: un
  -- pedido tomado por WhatsApp puede no tener correo de la clienta, y
  -- ése es justamente el que más urge que alguien vea. Los datos se
  -- leen de `j` con ->> y no de columnas: si alguna no existe en esta
  -- base, jsonb devuelve null en vez de abortar el INSERT del pedido.
  -- El nombre real de la columna del cupón varió entre repos (la crea
  -- el schema de Flores), por eso el coalesce sobre cuatro candidatos:
  -- si ninguna existe el correo simplemente no muestra cupón.
  if tg_op = 'INSERT' then
    insert into public.email_queue (pedido_id, cliente_email, tipo, payload)
    values (
      new.id,
      'interno@veliroz.com',   -- marcador, NO destino: lo pone EMAIL_INTERNO
      'pedido_nuevo_interno',
      jsonb_build_object(
        'cliente_email',    v_mail,
        'cliente_nombre',   j->>'cliente_nombre',
        'cliente_telefono', j->>'cliente_telefono',
        'estado',           v_new,
        'canal',            j->>'canal',
        'direccion',        coalesce(j->>'direccion_envio', j->>'direccion'),
        'cupon',            coalesce(j->>'cupon_codigo', j->>'cupon',
                                     j->>'codigo_cupon', j->>'cupon_aplicado'),
        'tipo_comprobante', j->>'tipo_comprobante',
        'documento',        coalesce(j->>'documento', j->>'cliente_documento'),
        'razon_social',     j->>'razon_social',
        'fecha_pedido',     coalesce(j->>'fecha_pedido', j->>'created_at')
      )
    )
    on conflict (pedido_id, tipo) where pedido_id is not null do nothing;
  end if;

  -- ---------- Correos a la clienta (idéntico a la 029) ----------
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

-- El trigger se re-declara por si esta base todavía tiene el de la
-- 010 (que vive sólo en Studio) apuntando a otra función.
drop trigger if exists trg_encolar_email_pedido on public.pedidos;
create trigger trg_encolar_email_pedido
  after insert or update of estado on public.pedidos
  for each row execute function public.encolar_email_pedido();

-- ---------- 3. Verificación ----------
do $$
declare
  v_check text;
begin
  select pg_get_constraintdef(oid) into v_check
    from pg_constraint where conname = 'email_queue_tipo_check';

  if v_check is null then
    raise exception 'email_queue_tipo_check no quedó instalado';
  end if;
  if position('pedido_nuevo_interno' in v_check) = 0 then
    raise exception 'El CHECK no admite pedido_nuevo_interno: %', v_check;
  end if;

  if not exists (select 1 from pg_trigger where tgname='trg_encolar_email_pedido') then
    raise exception 'El trigger no quedó instalado';
  end if;

  raise notice 'CHECK ampliado y trigger reinstalado. Tipos válidos: %', v_check;
  raise notice 'Falta setear EMAIL_INTERNO en Vercel (default: hola@veliroz.com)';
end $$;
