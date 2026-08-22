-- ============================================================
-- 031 — reclamos: el Libro de Reclamaciones que no guardaba nada
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- ESTADO PREVIO: /libro-reclamaciones tenía el formulario completo,
-- con los tres bloques del Anexo del D.S. 011-2011-PCM, y posteaba a
-- `action="mailto:hola@veliroz.com"` con method="post". Eso NO funciona
-- en Chrome ni en Safari móvil: el navegador ignora el submit o abre un
-- borrador vacío. Como casi todo el tráfico llega desde Instagram, en la
-- práctica el reclamo se perdía entero — y la persona se iba creyendo
-- que lo había presentado.
--
-- El D.S. 011-2011-PCM (reglamento del Libro de Reclamaciones) exige
-- tres cosas que un mailto: no puede dar:
--   1. Registro con CÓDIGO CORRELATIVO por hoja.
--   2. Copia inmediata al consumidor (por eso los dos correos).
--   3. Respuesta del proveedor en un máximo de 30 días calendario
--      contados desde el día siguiente de la presentación (art. 152 de
--      la Ley 29571) — de ahí `fecha_limite`.
--
-- Esta migración crea la tabla, el correlativo y amplía el CHECK de
-- `email_queue.tipo` para que los dos correos nuevos puedan encolarse.
-- ============================================================

-- ---------- 0. Dependencia dura ----------
-- La 029 crea `email_queue`. Sin ella, el punto 4 de esta migración
-- rompería a mitad de camino y quedaría una tabla `reclamos` que sabe
-- guardar pero no sabe avisarle a nadie. Preferimos no empezar.
do $$
begin
  if to_regclass('public.email_queue') is null then
    raise exception
      'Falta public.email_queue — aplicar primero 029_email_queue.sql';
  end if;
end $$;

-- ---------- 1. El correlativo ----------
-- Una fila por año en vez de una `sequence` de Postgres, a propósito.
-- Una sequence NO se revierte con el rollback de la transacción: si un
-- insert falla, ese número se pierde y el libro queda con un hueco
-- (LR-2026-0003 → LR-2026-0005). En un registro que INDECOPI puede
-- pedir, un salto de numeración se lee como una hoja arrancada.
-- Con un contador en tabla, el `update ... returning` toma el row lock:
-- dos reclamos simultáneos se serializan y, si uno aborta, su número
-- vuelve a estar disponible.
create table if not exists public.reclamos_correlativo (
  anio   int  primary key,
  ultimo int  not null default 0
);

-- Guarda cuántos reclamos hay por año: no es dato personal, pero
-- tampoco tiene por qué ser público. Mismo criterio que el resto.
alter table public.reclamos_correlativo enable row level security;

-- ---------- 2. La tabla ----------
create table if not exists public.reclamos (
  id                uuid primary key default gen_random_uuid(),

  -- Formato LR-2026-0001. Lo pone el trigger, NUNCA el cliente:
  -- ver `asignar_datos_reclamo()` más abajo.
  codigo            text not null,

  -- El D.S. distingue los dos y no son intercambiables: un RECLAMO es
  -- disconformidad con el producto o servicio; una QUEJA es malestar
  -- con la atención. INDECOPI mide el plazo de respuesta igual para
  -- ambos, pero la naturaleza del caso cambia quién lo resuelve.
  tipo              text not null,

  /* --- Identificación del consumidor (Anexo, bloque 1) --- */
  nombre            text not null,
  -- El formulario tiene un solo input "DNI / CE", así que el tipo lo
  -- deduce la API (8 dígitos = DNI, cualquier otra cosa = CE) y lo
  -- manda explícito. La columna existe para que el día que el form
  -- tenga un <select> no haya que migrar datos.
  documento_tipo    text not null default 'DNI',
  documento_numero  text not null,
  email             text not null,
  -- Teléfono opcional: el Anexo pide un canal de contacto y el correo
  -- ya lo cubre. Muchas clientas que llegan desde Instagram no dejan
  -- número, y bloquear el reclamo por eso sería peor que no tenerlo.
  telefono          text,
  -- Domicilio NO opcional: el Anexo lo lista como campo de la
  -- identificación del reclamante, y es la dirección a la que se
  -- notifica formalmente si el caso escala.
  domicilio         text not null,

  /* --- Identificación del bien contratado (Anexo, bloque 2) --- */
  bien_contratado   text not null,           -- 'producto' | 'servicio'
  descripcion       text not null,           -- qué producto/servicio es
  comprobante       text,                    -- N° de boleta/factura
  monto_reclamado   numeric(10,2),

  /* --- Detalle de la reclamación (Anexo, bloque 3) --- */
  detalle           text not null,           -- qué pasó
  pedido_concreto   text not null,           -- qué solución espera

  /* --- Gestión --- */
  estado            text not null default 'recibido',
  -- Fecha tope de respuesta. La calcula el trigger; ver ahí por qué no
  -- es una columna generada.
  fecha_limite      date not null,
  respuesta         text,
  respondido_at     timestamptz,
  created_at        timestamptz not null default now()
);

-- Los CHECK van aparte y guardados, para que re-ejecutar la migración
-- no falle (mismo criterio que la 029).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reclamos_tipo_check') then
    alter table public.reclamos add constraint reclamos_tipo_check
      check (tipo in ('reclamo','queja'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reclamos_estado_check') then
    alter table public.reclamos add constraint reclamos_estado_check
      check (estado in ('recibido','en_proceso','respondido'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reclamos_bien_check') then
    alter table public.reclamos add constraint reclamos_bien_check
      check (bien_contratado in ('producto','servicio'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reclamos_doc_tipo_check') then
    alter table public.reclamos add constraint reclamos_doc_tipo_check
      check (documento_tipo in ('DNI','CE','PASAPORTE','RUC','OTRO'));
  end if;
end $$;

-- ---------- 3. Índices ----------
-- El código es lo único que la persona conserva: es su comprobante de
-- que presentó el reclamo, y es por donde va a preguntar en WhatsApp.
-- Único además de indexado — un correlativo repetido invalida el libro.
create unique index if not exists reclamos_codigo_uniq
  on public.reclamos (codigo);

-- "Qué está por vencer": sólo interesa lo que todavía no se respondió.
-- El índice parcial deja fuera el histórico, que es lo que crece.
create index if not exists reclamos_por_vencer_idx
  on public.reclamos (fecha_limite)
  where estado <> 'respondido';

-- ---------- 4. RLS ----------
-- Cero policies, igual que `email_queue`. Esta tabla guarda nombre,
-- DNI, domicilio y teléfono: datos personales bajo la Ley 29733, y el
-- domicilio + documento juntos son exactamente el combo que permite
-- suplantar a alguien. La clave anon viaja en el bundle del navegador
-- de veliroz.com — cualquiera puede leerla del devtools. Con RLS activo
-- y ninguna policy, esa clave no lee ni escribe una sola fila: sólo
-- `service_role`, que vive únicamente en el servidor.
--
-- Consecuencia práctica: /api/reclamos EXIGE SUPABASE_SERVICE_ROLE_KEY
-- y falla ruidosamente si no está. Ojo con el modo silencioso que ya
-- nos mordió en la 029: un SELECT con anon acá no da error, devuelve
-- cero filas. Un INSERT sí da error (42501), que es lo que queremos.
alter table public.reclamos enable row level security;

-- ---------- 5. Código correlativo y fecha límite ----------
-- Los dos se calculan en el servidor y se pisan siempre, aunque el
-- cliente los mande. Que el consumidor pueda elegir su propio número
-- de hoja rompe el registro, y que pueda elegir su fecha límite rompe
-- el plazo legal.
create or replace function public.asignar_datos_reclamo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio int;
  v_n    int;
begin
  -- Hora de Lima, no UTC. Un reclamo presentado el 31-dic a las 20:00
  -- de Lima es 01-ene en UTC: con `now()` a secas arrancaría el
  -- correlativo del año siguiente y la fecha del cargo no coincidiría
  -- con la que ve la clienta en su correo.
  v_anio := extract(year from (now() at time zone 'America/Lima'))::int;

  insert into public.reclamos_correlativo (anio, ultimo)
  values (v_anio, 1)
  on conflict (anio) do update
    set ultimo = reclamos_correlativo.ultimo + 1
  returning ultimo into v_n;

  new.codigo := 'LR-' || v_anio::text || '-' || lpad(v_n::text, 4, '0');

  -- Art. 152 de la Ley 29571: 30 días calendario contados desde el día
  -- SIGUIENTE de la presentación. Presentado el día 0, el día 1 del
  -- plazo es el 0+1 y el día 30 cae en 0+30.
  --
  -- Por qué trigger y no columna generada: `(created_at + 30 días)::date`
  -- depende del TimeZone de la sesión, así que Postgres la considera
  -- STABLE, no IMMUTABLE, y rechaza el GENERATED ALWAYS AS.
  new.fecha_limite := (now() at time zone 'America/Lima')::date + 30;

  new.estado := coalesce(new.estado, 'recibido');
  return new;
end $$;

drop trigger if exists trg_asignar_datos_reclamo on public.reclamos;
create trigger trg_asignar_datos_reclamo
  before insert on public.reclamos
  for each row execute function public.asignar_datos_reclamo();

-- ---------- 6. Ampliar el CHECK de email_queue.tipo ----------
-- La 029 dejó el CHECK cerrado en seis valores. Los dos correos del
-- Libro de Reclamaciones (copia al consumidor + aviso interno) no
-- entran, y el INSERT desde /api/reclamos moriría con 23514 DESPUÉS de
-- haber guardado el reclamo: quedaría registrado sin que nadie se
-- entere. Por eso el CHECK se amplía acá y no en otra migración.
--
-- drop + add en vez de intentar modificarlo: Postgres no tiene ALTER
-- CONSTRAINT para CHECK, y el `drop ... if exists` lo deja idempotente.
do $$
begin
-- ⚠️ ESTA LISTA ESTÁ DUPLICADA A PROPÓSITO EN LAS MIGRACIONES 031 Y 032.
-- Postgres no tiene ALTER CONSTRAINT para un CHECK: hay que hacer drop + add,
-- y eso significa que la última migración que corra deja escrita SU lista y
-- borra la de la otra. Las dos se escribieron el mismo día, cada una agregando
-- sus propios tipos, y el resultado era que aplicar 031→032 dejaba fuera los
-- correos del Libro de Reclamaciones (23514 al insertar) y aplicar 032→031
-- dejaba fuera el aviso de pedido nuevo.
-- Con la lista IDÉNTICA en las dos, el orden de aplicación deja de importar.
-- Si alguna vez se agrega un tipo, va en las dos, o vuelve el mismo problema.
  alter table public.email_queue drop constraint if exists email_queue_tipo_check;
  alter table public.email_queue add constraint email_queue_tipo_check
    check (tipo in ('pedido_creado','pedido_pagado','pedido_en_reparto',
                    'pedido_entregado','review_request','bienvenida',
                    'pedido_nuevo_interno','reclamo_recibido','reclamo_interno'));
end $$;

-- ---------- 7. Verificación ----------
do $$
declare
  n int;
  v_ok boolean;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='reclamos';
  raise notice 'reclamos creada con % columnas', n;

  if not exists (select 1 from pg_trigger where tgname='trg_asignar_datos_reclamo') then
    raise exception 'El trigger del correlativo no quedó instalado';
  end if;
  raise notice 'Trigger trg_asignar_datos_reclamo instalado';

  -- ¿El CHECK ampliado acepta de verdad los tipos nuevos? Preguntárselo
  -- a la definición del constraint es más barato que descubrirlo con un
  -- reclamo real de una clienta.
  select pg_get_constraintdef(oid) like '%reclamo_recibido%'
     and pg_get_constraintdef(oid) like '%reclamo_interno%'
    into v_ok
    from pg_constraint where conname = 'email_queue_tipo_check';

  if not coalesce(v_ok, false) then
    raise exception 'email_queue_tipo_check no admite reclamo_recibido/reclamo_interno';
  end if;
  raise notice 'email_queue.tipo admite reclamo_recibido y reclamo_interno';

  if exists (select 1 from pg_policies
              where schemaname='public' and tablename='reclamos') then
    raise warning 'reclamos tiene policies — se esperaba NINGUNA (solo service_role)';
  end if;
end $$;
