-- ============================================================
-- ⚠️ ANTES DE APLICAR ESTA MIGRACIÓN — dos comprobaciones a mano
--
-- No se pudieron hacer desde donde se escribió esto (sin acceso de
-- escritura a la base), y las dos pueden dejar el sistema peor.
--
-- 1. EL TRIGGER DE LA MIGRACIÓN 011 NO ESTÁ VERSIONADO.
--    Asigna el correlativo al pasar el pedido a 'pagado' y escribe en
--    comprobantes_electronicos, pero su código sólo existe en el Studio.
--    Si hace un INSERT plano (sin ON CONFLICT), el índice único que
--    crea esta migración va a hacer que ese trigger REVIENTE la
--    transacción del pedido la segunda vez que corra — y esa
--    transacción es la del cobro.
--    Volcalo antes de aplicar:
--        select p.proname, pg_get_functiondef(p.oid)
--          from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--         where t.tgrelid = 'public.pedidos'::regclass
--           and not t.tgisinternal;
--    Si su INSERT no lleva ON CONFLICT DO NOTHING, agregáselo ANTES
--    de crear el índice.
--
-- 2. ¿EL CORRELATIVO SALE DE UNA SECUENCIA COMPARTIDA?
--    SUNAT espera correlativos consecutivos POR SERIE. Si boletas y
--    facturas comparten una sola secuencia, cada factura deja un hueco
--    en la numeración de boletas y viceversa. El bloque de diagnóstico
--    del final imprime lo necesario para decidirlo con datos.
-- ============================================================

-- ============================================================
-- 034 — comprobantes electrónicos: las dos guardas que faltaban
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- CONTEXTO: el RUC de NOVVX S.A.C.S. (20616401280) se activó en SUNAT el
-- 21-ago-2026. Desde ese momento toda venta a consumidor final exige
-- comprobante electrónico, y el código que los emite —escrito hace días
-- pero nunca alcanzable— recién ahora se conecta al webhook de pago.
--
-- La tabla `comprobantes_electronicos` y su trigger vienen de la
-- migración 011 (aplicada sólo en Studio, ver supabase/MIGRACIONES.md).
-- Esta migración NO la toca: sólo le agrega los índices que impiden lo
-- único que en este dominio no tiene arreglo — emitir dos veces.
--
-- POR QUÉ ÍNDICES Y NO VALIDACIÓN EN LA APP: la emisión ya es idempotente
-- del lado del código (si la fila está en 'emitido' no vuelve a llamar a
-- Nubefact), pero esa comprobación es un SELECT seguido de un POST. Entre
-- los dos hay una ventana, y el webhook de MercadoPago reenvía el mismo
-- evento cuando le parece. Ante SUNAT, dos comprobantes con la misma
-- serie y número no se borran: se anulan con nota de crédito.
--
-- 1. UN COMPROBANTE POR PEDIDO. Además del duplicado ante SUNAT, hoy dos
--    filas para el mismo pedido rompen la lectura: la emisión busca el
--    stub con `.maybeSingle()`, que ante dos filas devuelve error en vez
--    de fila — el pedido quedaría sin poder emitirse nunca.
--
-- 2. UN NÚMERO POR TIPO. El correlativo lo asigna el trigger de la 011.
--    Nada impedía que dos filas quedaran con el mismo número si alguien
--    inserta a mano desde el CRM o repite una carga histórica.
--
-- Las dos son idempotentes (`if not exists`) y abortan antes de crear
-- nada si los datos ya tienen duplicados: un índice único que falla a
-- mitad de la migración deja el resto sin aplicar.
--
-- ---------- LO QUE ESTA MIGRACIÓN NO ARREGLA ----------
-- Si el correlativo de la 011 sale de UNA secuencia compartida entre
-- boletas y facturas, cada factura deja un hueco en la numeración de las
-- boletas (B001-1, B001-3, …) y viceversa. SUNAT espera correlativos
-- consecutivos por serie. No se corrige acá porque exige reescribir el
-- trigger de la 011, cuyo .sql no está versionado en ningún repo. El
-- bloque de diagnóstico del final imprime el estado real para decidirlo
-- con datos, y hoy el riesgo es bajo: prácticamente todo son boletas.
-- ============================================================

begin;

-- ---------- 1. Un comprobante por pedido ----------

do $$
declare
  v_dups integer;
begin
  select count(*) into v_dups
  from (
    select pedido_id
    from public.comprobantes_electronicos
    where pedido_id is not null
    group by pedido_id
    having count(*) > 1
  ) d;

  if v_dups > 0 then
    raise exception
      'Hay % pedido(s) con más de un comprobante. Resolver a mano ANTES de crear el índice único (revisar cuál se emitió de verdad ante SUNAT y borrar el stub sobrante).', v_dups;
  end if;
end $$;

create unique index if not exists comprobantes_electronicos_pedido_id_uidx
  on public.comprobantes_electronicos (pedido_id);

comment on index public.comprobantes_electronicos_pedido_id_uidx is
  'Un pedido = un comprobante. Impide el doble stub y que .maybeSingle() de la emisión falle.';

-- ---------- 2. Un correlativo por tipo de comprobante ----------
-- Parcial: los stubs sin número todavía no compiten por nada.

do $$
declare
  v_dups integer;
begin
  select count(*) into v_dups
  from (
    select tipo, correlativo
    from public.comprobantes_electronicos
    where correlativo is not null
    group by tipo, correlativo
    having count(*) > 1
  ) d;

  if v_dups > 0 then
    raise exception
      'Hay % combinación(es) tipo+correlativo repetidas. Un número repetido ante SUNAT se anula con nota de crédito: revisar cuál vale antes de seguir.', v_dups;
  end if;
end $$;

create unique index if not exists comprobantes_electronicos_tipo_correlativo_uidx
  on public.comprobantes_electronicos (tipo, correlativo)
  where correlativo is not null;

comment on index public.comprobantes_electronicos_tipo_correlativo_uidx is
  'Ningún número de boleta o factura se repite. El correlativo ante SUNAT es irreversible.';

-- ---------- 3. Encontrar lo que quedó sin emitir ----------
-- El webhook emite en segundo plano y, si Nubefact está caído, deja la
-- fila en 'error' con el motivo. Alguien (o un cron) tiene que poder
-- listarlas sin escanear la tabla entera.

create index if not exists comprobantes_electronicos_pendientes_idx
  on public.comprobantes_electronicos (estado_emision, created_at)
  where estado_emision is distinct from 'emitido';

comment on index public.comprobantes_electronicos_pendientes_idx is
  'Cola de rescate: comprobantes en pendiente/error para reintentar con POST /api/comprobantes/emitir.';

-- ---------- 4. Diagnóstico (no modifica nada) ----------

do $$
declare
  r record;
begin
  raise notice '--- comprobantes_electronicos: estado actual ---';
  for r in
    select tipo,
           estado_emision,
           count(*)          as filas,
           min(correlativo)  as primer_numero,
           max(correlativo)  as ultimo_numero
    from public.comprobantes_electronicos
    group by tipo, estado_emision
    order by tipo, estado_emision
  loop
    raise notice 'tipo=% estado=% filas=% correlativos %..%',
      r.tipo, r.estado_emision, r.filas, r.primer_numero, r.ultimo_numero;
  end loop;

  -- Si boletas y facturas comparten rango, el correlativo es una sola
  -- secuencia y cada serie va a quedar con huecos.
  if exists (
    select 1
    from public.comprobantes_electronicos b
    join public.comprobantes_electronicos f
      on b.tipo = 'boleta' and f.tipo = 'factura'
    where b.correlativo is not null
      and f.correlativo is not null
  ) then
    raise notice 'OJO: hay boletas y facturas numeradas. Verificar que cada serie lleve su propio correlativo consecutivo.';
  end if;
end $$;

commit;
