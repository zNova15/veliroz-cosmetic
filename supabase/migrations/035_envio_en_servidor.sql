-- ============================================================
-- ⚠️ ANTES DE APLICAR — comparar la definición viva a mano
--
-- Esta migración reescribe `crear_pedido`, que es el RPC por el que
-- cobran las CUATRO líneas del negocio. Su guarda detecta si la
-- definición viva PERDIÓ dos marcas conocidas, pero NO detecta nada que
-- alguien le haya AÑADIDO desde el Studio: en ese caso pasa en silencio
-- y el create-or-replace revierte ese código sin avisar.
--
-- Correr esto ANTES y comparar contra el cuerpo de acá abajo. El diff
-- tiene que dar exactamente los bloques de envío y nada más:
--     select pg_get_functiondef('crear_pedido(jsonb)'::regprocedure);
--
-- Y guardar esa salida en algún lado antes de aplicar: es el único
-- respaldo de lo que había si algo sale mal.
-- ============================================================

-- ============================================================
-- 035 — El costo de envío lo calcula el SERVIDOR (línea cosmetic)
-- Proyecto: usfpzlxmmgruydqbymsx
-- ============================================================
--
-- QUÉ PASABA: `crear_pedido` guardaba tal cual el `costo_envio` que le
-- mandaba el navegador, con la única validación de que estuviera entre
-- 0 y 200. La regla de envío gratis (S/149) y las dos tarifas (S/12
-- Shalom, S/18 domicilio Lima) vivían SÓLO en src/lib/checkout-store.ts,
-- o sea en el bundle del navegador. Abrir DevTools, interceptar la
-- server action y mandar costoEnvio: 0 alcanzaba para llevarse el envío
-- gratis en cualquier pedido. Con dos ventas al día el abuso es
-- teórico; con pauta corriendo y un ticket promedio de S/150, no.
--
-- DÓNDE SE ARREGLA Y POR QUÉ ACÁ: dentro del RPC, como se hizo con el
-- descuento de referido en la 020. La server action de Next es UNO de
-- los canales; el RPC es por donde cobran los cuatro. Un cálculo en la
-- action se saltea llamando al RPC directo con la anon key, que es
-- pública.
--
-- QUÉ NO CAMBIA — ESTO ES EL CAMINO DE COBRO DE LAS 4 LÍNEAS:
--   · La firma de crear_pedido(jsonb) y la forma del jsonb que devuelve
--     son idénticas: mismas 8 claves, mismos nombres.
--   · Flores, Bienestar y Chocotejas siguen cobrando el envío que manda
--     su checkout (pago.html calcula por geografía: Lima S/10, Cajamarca
--     por zona, gratis según línea). Ese agujero también existe ahí,
--     pero sus reglas son otras y no entran en esta migración.
--   · Sólo se recalcula cuando el pedido lleva al menos un ítem de
--     cosmetic. La detección NO se hace por `envio_meta.linea` ni por
--     `canal` —los dos los escribe el cliente— sino preguntándole a
--     `variantes_producto`, que es la tabla de catálogo que creó la 007
--     para cosmetic y donde ninguna de las otras tres líneas tiene
--     filas.
--
-- FUENTE DE VERDAD DE LAS TARIFAS: la función `costo_envio_cosmetic`
-- de acá abajo. `src/lib/checkout-store.ts` (ENVIO_GRATIS_DESDE,
-- COSTO_SHALOM, COSTO_DOMICILIO_LIMA) queda como ESPEJO: sirve para
-- mostrar el total antes de confirmar, no para cobrarlo. Si cambia una
-- tarifa hay que tocar las dos: si el servidor cobra distinto de lo que
-- la clienta vio en pantalla, el problema es peor que el original. El
-- bloque de verificación del final falla a propósito si los números de
-- la función dejan de ser 149/12/18.
--
-- EL DEFAULT ES COBRAR: si el pedido no dice qué transporte usa
-- (`envio_meta.transporte` ausente, un canal que todavía no lo manda),
-- se cobra S/18, la tarifa más cara. Es exactamente lo que hace hoy el
-- navegador (`metodo === "shalom" ? 12 : 18`), así que no introduce
-- desalineo, y equivocarse para el otro lado sería regalar envíos por
-- omitir un campo.
--
-- LA 021 SIGUE VIGENTE: aquella arregló el 42702 (`item` ambiguo entre
-- la variable local y el alias del INSERT) parchando la definición viva.
-- Acá se reescribe la función ENTERA con create or replace —nunca por
-- parches— y de paso la variable local pasa a llamarse `v_item`, así
-- ese choque de nombres no puede volver por otra reescritura.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0. Respaldo de la definición viva + guardas
--    Antes de pisar la función crítica del negocio se guarda lo que
--    había. Si algún día hay que volver atrás, el texto exacto que
--    corría está en una fila, no en la memoria de nadie.
-- ------------------------------------------------------------
create table if not exists public.respaldo_definiciones_funcion (
  id         bigint generated always as identity primary key,
  funcion    text        not null,
  migracion  text        not null,
  definicion text        not null,
  created_at timestamptz not null default now()
);

-- Sin RLS y en el schema public, PostgREST se la sirve a la anon key.
-- Acá adentro va el código fuente de las funciones de cobro: RLS
-- prendida y CERO policies, igual que email_queue en la 029 — nadie
-- llega desde la API, sólo el service_role y el SQL editor.
alter table public.respaldo_definiciones_funcion enable row level security;
revoke all on public.respaldo_definiciones_funcion from anon, authenticated;

do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('crear_pedido(jsonb)'::regprocedure);

  insert into public.respaldo_definiciones_funcion (funcion, migracion, definicion)
  values ('crear_pedido(jsonb)', '035_envio_en_servidor', v_def);

  if position('costo_envio_cosmetic' in v_def) > 0 then
    raise notice '035 ya estaba aplicada — se vuelve a aplicar (idempotente)';
    return;
  end if;

  -- Marcas de lo que ESPERAMOS encontrar: la 006 (chocotejas) más el
  -- fix de alias de la 021. Si falta alguna, la definición viva no es
  -- la que este archivo cree estar reemplazando —alguien la tocó desde
  -- Studio— y sobrescribirla a ciegas borraría ese cambio.
  if position('mixto_choco_bienestar_incompatible' in v_def) = 0
     or position('jsonb_array_elements(v_items) as li' in v_def) = 0 then
    raise notice '--- definición viva de crear_pedido ---';
    raise notice '%', v_def;
    raise exception
      'crear_pedido no es la esperada (006 + 021): revisar el texto de arriba antes de reemplazarla'
      using hint = 'select pg_get_functiondef(''crear_pedido(jsonb)''::regprocedure);';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1. La tarifa — ÚNICA fuente de verdad
--    Espejo en src/lib/checkout-store.ts (sólo para mostrar).
-- ------------------------------------------------------------
create or replace function public.costo_envio_cosmetic(
  p_subtotal_post_descuento numeric,
  p_transporte              text
)
returns numeric
language sql
immutable
as $$
  -- El umbral se mide sobre el subtotal DESPUÉS del descuento, que es
  -- como lo hace el checkout: un cupón que baja el pedido de S/155 a
  -- S/140 también le saca el envío gratis.
  --
  -- No es `strict` a propósito: con p_transporte null tiene que caer en
  -- el else y cobrar, no devolver null.
  select case
    when coalesce(p_subtotal_post_descuento, 0) >= 149 then 0::numeric  -- ENVIO_GRATIS_DESDE
    when p_transporte = 'shalom'                       then 12::numeric  -- COSTO_SHALOM
    else                                                    18::numeric  -- COSTO_DOMICILIO_LIMA
  end;
$$;

comment on function public.costo_envio_cosmetic(numeric, text) is
  'Tarifa de envío de Veliroz Cosmetic. Fuente de verdad; src/lib/checkout-store.ts es el espejo que muestra el total antes de confirmar.';

-- ------------------------------------------------------------
-- 2. ¿El pedido es de cosmetic?
--    Se pregunta al catálogo, no al payload: `envio_meta.linea` y
--    `canal` los escribe el navegador y son justamente lo que no se
--    puede creer.
-- ------------------------------------------------------------
create or replace function public.items_son_cosmetic(p_items jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_hay boolean := false;
begin
  -- Guarda para un entorno donde sólo corrieron las migraciones de
  -- Flores: sin la tabla de la 007 no hay cosmetic que detectar, y la
  -- consulta de abajo nunca se planifica.
  if to_regclass('public.variantes_producto') is null then
    return false;
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    return false;
  end if;

  -- Alias `el`: NO usar `item` acá ni en ninguna función que declare esa
  -- variable. Ese choque fue el 42702 de la 021, 18 días sin cobrar.
  select exists (
    select 1
      from jsonb_array_elements(p_items) as el
      join public.variantes_producto vp on vp.sku = el->>'producto_id'
  ) into v_hay;

  return coalesce(v_hay, false);
end $$;

-- ------------------------------------------------------------
-- 3. crear_pedido — reescrita ENTERA (006 + fix de la 021 + envío)
-- ------------------------------------------------------------
create or replace function public.crear_pedido(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_codigo         text;
  v_email          citext;
  v_nombre         text;
  v_telefono       text;
  v_uid            text;
  v_session        text;
  v_metodo_entrega text;
  v_zona           text;
  v_metodo_pago    text;
  v_tipo_comp      text;
  v_documento      text;
  v_razon          text;
  v_dir_fiscal     text;
  v_direccion      text;
  v_envio_meta     jsonb;
  v_costo_envio    numeric(10,2);
  v_items          jsonb;
  v_cupon_code     text;
  v_canal          text;

  v_subtotal       numeric(10,2) := 0;
  v_descuento      numeric(10,2) := 0;
  v_total          numeric(10,2) := 0;
  v_linea_negocio  text := 'flores';
  v_has_bien       boolean := false;
  v_has_flor       boolean := false;
  v_has_choco      boolean := false;
  v_es_cosmetic    boolean := false;

  v_pedido_id      uuid;
  v_cliente_id     uuid;
  v_cupon          record;
  v_item           jsonb;   -- se llamaba `item` (ver 021)
  cat              record;
  v_precio         numeric(10,2);
  v_cantidad       integer;
  v_categoria      text;
begin
  v_email          := lower(coalesce(payload->>'email',''))::citext;
  v_nombre         := payload->>'nombre';
  v_telefono       := payload->>'telefono';
  v_uid            := nullif(payload->>'firebase_uid','');
  v_session        := payload->>'session_id';
  v_metodo_entrega := payload->>'metodo_entrega';
  v_zona           := nullif(payload->>'zona_local','');
  v_metodo_pago    := payload->>'metodo_pago';
  v_tipo_comp      := nullif(payload->>'tipo_comprobante','');
  v_documento      := nullif(payload->>'documento','');
  v_razon          := nullif(payload->>'razon_social','');
  v_dir_fiscal     := nullif(payload->>'direccion_fiscal','');
  v_direccion      := payload->>'direccion';
  v_envio_meta     := payload->'envio_meta';
  v_costo_envio    := coalesce((payload->>'costo_envio')::numeric, 0);
  v_items          := payload->'items';
  v_cupon_code     := nullif(upper(coalesce(payload->>'cupon','')),'');
  v_canal          := coalesce(payload->>'canal','web');

  if v_email is null or v_email = '' then
    raise exception 'email_requerido' using errcode='22023';
  end if;
  if v_metodo_entrega not in ('recojo','envio','zona_local') then
    raise exception 'metodo_entrega_invalido' using errcode='22023';
  end if;
  if v_metodo_pago not in ('mercadopago','yape','plin','banco','contra_entrega') then
    raise exception 'metodo_pago_invalido' using errcode='22023';
  end if;
  if v_metodo_entrega = 'zona_local' and (v_zona is null or v_zona not in ('puylucana','banos_inca','cajamarca_ciudad')) then
    raise exception 'zona_local_requerida' using errcode='22023';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'items_requeridos' using errcode='22023';
  end if;
  -- Sigue validando el valor que llega. Para cosmetic ya no se usa (se
  -- recalcula abajo), pero para las otras tres líneas es el que se cobra.
  if v_costo_envio < 0 or v_costo_envio > 200 then
    raise exception 'costo_envio_invalido' using errcode='22023';
  end if;

  -- Iterar items: recalcular precio server-side contra catálogo
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_cantidad := (v_item->>'cantidad')::integer;
    if v_cantidad is null or v_cantidad < 1 or v_cantidad > 99 then
      raise exception 'cantidad_invalida' using errcode='22023';
    end if;
    select * into cat from public.catalogo where producto_id = v_item->>'producto_id' and activo = true;
    if not found then
      raise exception 'producto_no_encontrado: %', v_item->>'producto_id' using errcode='22023';
    end if;
    v_precio    := cat.precio;
    v_categoria := cat.categoria;
    v_subtotal  := v_subtotal + (v_precio * v_cantidad);
    if v_categoria like 'bienestar-%' then v_has_bien := true;
    elsif v_categoria like 'chocoteja-%' then v_has_choco := true;
    else v_has_flor := true; end if;
  end loop;

  -- Bloqueo mixto imposible: Bienestar Cajamarca en persona ≠ Chocotejas Lima envío
  if v_has_bien and v_has_choco then
    raise exception 'mixto_choco_bienestar_incompatible' using errcode='22023';
  end if;

  -- Determinar línea de negocio real
  v_linea_negocio := case
    when v_has_choco and not v_has_bien and not v_has_flor then 'chocotejas'
    when v_has_bien  and not v_has_choco and not v_has_flor then 'bienestar'
    when (v_has_choco and v_has_flor) or (v_has_bien and v_has_flor) then 'mixto'
    else 'flores'
  end;

  -- Aplicar cupón server-side (si mandaron uno)
  if v_cupon_code is not null then
    select * into v_cupon from public.cupones where code = v_cupon_code and activo = true;
    if found then
      if v_cupon.vence is null or v_cupon.vence > pg_catalog.now() then
        if v_cupon.min_subtotal is null or v_subtotal >= v_cupon.min_subtotal then
          if v_cupon.usos_max is null or v_cupon.usos_actual < v_cupon.usos_max then
            if v_cupon.solo_primera_compra and exists(
              select 1 from public.pedidos
              where cliente_email = v_email and estado in ('pagado','preparando','en_reparto','entregado')
            ) then
              null;
            else
              if v_cupon.tipo = 'porcentaje' then
                v_descuento := round((v_subtotal * v_cupon.valor / 100)::numeric, 2);
              else
                v_descuento := least(v_cupon.valor, v_subtotal);
              end if;
              update public.cupones set usos_actual = usos_actual + 1 where code = v_cupon.code;
            end if;
          end if;
        end if;
      end if;
    end if;
  end if;

  -- ---------- Envío de cosmetic: manda el servidor ----------
  -- Va DESPUÉS del cupón porque el umbral de envío gratis se mide sobre
  -- el subtotal ya descontado, igual que en pantalla. Lo que haya
  -- llegado en payload.costo_envio se descarta.
  -- Las otras tres líneas siguen con el valor que mandó su checkout.
  v_es_cosmetic := public.items_son_cosmetic(v_items);
  if v_es_cosmetic then
    v_costo_envio := public.costo_envio_cosmetic(
      v_subtotal - v_descuento,
      v_envio_meta->>'transporte'
    );
  end if;

  v_total  := (v_subtotal - v_descuento) + v_costo_envio;
  v_codigo := 'PED-' || to_char(pg_catalog.now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.pedidos (
    pedido_codigo, cliente_email, cliente_nombre, cliente_telefono,
    firebase_uid, session_id, linea_negocio, canal,
    metodo_entrega, zona_local, direccion, envio_meta,
    metodo_pago, tipo_comprobante, documento, razon_social, direccion_fiscal,
    subtotal, descuento, cupon, costo_envio, total,
    estado, fecha_pedido
  ) values (
    v_codigo, v_email, v_nombre, v_telefono,
    v_uid, v_session, v_linea_negocio, v_canal,
    v_metodo_entrega, v_zona, v_direccion, v_envio_meta,
    v_metodo_pago, v_tipo_comp, v_documento, v_razon, v_dir_fiscal,
    v_subtotal, v_descuento, v_cupon_code, v_costo_envio, v_total,
    'nuevo', pg_catalog.now()
  ) returning id into v_pedido_id;

  -- Alias `li`, no `item`: ver 021.
  insert into public.lineas_pedido (pedido_id, producto_id, nombre, categoria, precio_unit, cantidad, imagen)
  select
    v_pedido_id,
    li->>'producto_id',
    (select nombre from public.catalogo where producto_id = li->>'producto_id'),
    (select categoria from public.catalogo where producto_id = li->>'producto_id'),
    (select precio from public.catalogo where producto_id = li->>'producto_id'),
    (li->>'cantidad')::integer,
    li->>'imagen'
  from jsonb_array_elements(v_items) as li;

  insert into public.clientes (
    email, nombre, telefono, firebase_uid, es_invitado,
    dni, ruc, razon_social, direccion_fiscal,
    primera_compra_at, ultima_compra_at, n_pedidos, total_gastado
  ) values (
    v_email, v_nombre, v_telefono, v_uid, (v_uid is null),
    case when v_tipo_comp = 'boleta'  then v_documento end,
    case when v_tipo_comp = 'factura' then v_documento end,
    case when v_tipo_comp = 'factura' then v_razon    end,
    case when v_tipo_comp = 'factura' then v_dir_fiscal end,
    pg_catalog.now(), pg_catalog.now(), 1, v_total
  )
  on conflict (email) do update set
    nombre           = coalesce(nullif(excluded.nombre, ''), public.clientes.nombre),
    telefono         = coalesce(nullif(excluded.telefono, ''), public.clientes.telefono),
    firebase_uid     = coalesce(public.clientes.firebase_uid, excluded.firebase_uid),
    es_invitado      = public.clientes.es_invitado and (excluded.firebase_uid is null),
    n_pedidos        = public.clientes.n_pedidos + 1,
    total_gastado    = public.clientes.total_gastado + v_total,
    ultima_compra_at = pg_catalog.now(),
    primera_compra_at = coalesce(public.clientes.primera_compra_at, pg_catalog.now()),
    dni              = coalesce(public.clientes.dni, excluded.dni),
    ruc              = coalesce(public.clientes.ruc, excluded.ruc),
    razon_social     = coalesce(nullif(excluded.razon_social,''), public.clientes.razon_social),
    direccion_fiscal = coalesce(nullif(excluded.direccion_fiscal,''), public.clientes.direccion_fiscal),
    updated_at       = pg_catalog.now()
  returning id into v_cliente_id;

  update public.pedidos set cliente_id = v_cliente_id where id = v_pedido_id;

  return jsonb_build_object(
    'pedido_codigo', v_codigo,
    'pedido_id',     v_pedido_id,
    'subtotal',      v_subtotal,
    'descuento',     v_descuento,
    'costo_envio',   v_costo_envio,
    'total',         v_total,
    'linea_negocio', v_linea_negocio,
    'cupon_aplicado', case when v_descuento > 0 then v_cupon_code else null end
  );
end $$;

grant execute on function public.crear_pedido(jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. crear_pedido_con_referido — reescrita ENTERA (020 + envío)
--    El descuento de referido se aplica DESPUÉS de que crear_pedido ya
--    calculó el envío, así que un pedido de S/155 que baja a S/139.50
--    tiene que dejar de tener envío gratis. Es lo que muestra la
--    pantalla (OrderSummary resta el descuento del referido antes de
--    llamar a calcularCostoEnvio); sin este recálculo el servidor
--    cobraba S/12 menos que lo mostrado.
-- ------------------------------------------------------------
create or replace function public.crear_pedido_con_referido(
  payload          jsonb,
  referido_codigo  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res         jsonb;
  v_pedido_id   uuid;
  v_subtotal    numeric(10,2);
  v_descuento   numeric(10,2);
  v_envio       numeric(10,2);
  v_email       text;
  v_val         jsonb;
  v_desc_ref    numeric(10,2);
  v_nuevo_desc  numeric(10,2);
  v_nuevo_envio numeric(10,2);
  v_nuevo_tot   numeric(10,2);
begin
  -- 1. El pedido lo crea siempre el RPC de siempre.
  v_res := crear_pedido(payload);

  if v_res is null or (v_res->>'pedido_id') is null then
    return v_res;   -- que el caller maneje el error tal como hoy
  end if;

  if referido_codigo is null or length(trim(referido_codigo)) = 0 then
    return v_res;
  end if;

  v_pedido_id := (v_res->>'pedido_id')::uuid;
  v_subtotal  := coalesce((v_res->>'subtotal')::numeric, 0);
  v_descuento := coalesce((v_res->>'descuento')::numeric, 0);
  v_envio     := coalesce((v_res->>'costo_envio')::numeric, 0);
  v_email     := lower(coalesce(payload->>'email',''));

  -- 2. Si ya hubo descuento (cupón), el referido no se toca ni se quema.
  if v_descuento > 0 then
    return v_res || jsonb_build_object(
      'referido_aplicado', false,
      'referido_motivo',   'ya_tenia_descuento'
    );
  end if;

  -- 3. Validación server-side sobre el subtotal REAL del pedido.
  v_val := validar_codigo_referido(referido_codigo, v_email, v_subtotal);

  if coalesce((v_val->>'ok')::boolean, false) is not true then
    return v_res || jsonb_build_object(
      'referido_aplicado', false,
      'referido_motivo',   coalesce(v_val->>'motivo', 'invalido')
    );
  end if;

  v_desc_ref := coalesce((v_val->>'descuento')::numeric, 0);

  -- Nunca dejar el total por debajo del envío: el CHECK total >= 0 lo
  -- permitiría, pero regalar el producto y cobrar el envío no tiene sentido.
  v_desc_ref   := least(v_desc_ref, v_subtotal);
  v_nuevo_desc := v_descuento + v_desc_ref;

  -- 4. El envío se recalcula sobre el subtotal ya descontado. Para las
  --    otras líneas queda el que puso crear_pedido.
  v_nuevo_envio := v_envio;
  if items_son_cosmetic(payload->'items') then
    v_nuevo_envio := costo_envio_cosmetic(
      v_subtotal - v_nuevo_desc,
      payload->'envio_meta'->>'transporte'
    );
  end if;

  v_nuevo_tot := greatest(0, (v_subtotal - v_nuevo_desc) + v_nuevo_envio);

  update pedidos
  set descuento   = v_nuevo_desc,
      costo_envio = v_nuevo_envio,
      total       = v_nuevo_tot,
      cupon       = coalesce(cupon, upper(trim(referido_codigo)))
  where id = v_pedido_id;

  -- 5. Registrar el uso (queda 'pendiente' hasta que el pedido se pague).
  perform registrar_uso_referido(
    referido_codigo, v_pedido_id, v_email, v_desc_ref
  );

  return v_res
    || jsonb_build_object(
         'descuento',         v_nuevo_desc,
         'costo_envio',       v_nuevo_envio,
         'total',             v_nuevo_tot,
         'referido_aplicado', true,
         'referido_codigo',   v_val->>'codigo',
         'referido_descuento', v_desc_ref
       );
end;
$$;

grant execute on function public.crear_pedido_con_referido(jsonb, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. VERIFICACIÓN con datos simulados
--    crear_pedido no tiene modo simulación: la única forma de probarlo
--    es crear pedidos de verdad. Se usan direcciones @veliroz-sim.invalid
--    (TLD reservado por la RFC 2606: no existe ni puede registrarse) y
--    se borra todo al final, incluida la cola de correo que dispara el
--    trigger de la 032 — un rebote le baja reputación al dominio.
--
--    Corre DENTRO de la transacción de esta migración: si una
--    comprobación falla, el rollback se lleva también las funciones
--    nuevas y la base queda como estaba.
-- ------------------------------------------------------------
do $$
declare
  v_sku        text;
  v_precio     numeric;
  v_sku_otro   text;
  v_n          integer;
  v_res        jsonb;
  v_fila       record;
  v_sub        numeric;
  v_cfg        record;
  v_ref_ok     boolean := false;
  v_desc_esp   numeric;
  v_env_esp    numeric;
  v_cli_ref    uuid;
  v_sku_flip   text;
  v_n_flip     integer;
  v_quedan     integer;
  v_base       jsonb;
begin
  ------------------------------------------------------------------
  -- (a) La tarifa, sola. Si estos números cambian sin que cambie
  --     src/lib/checkout-store.ts, la clienta ve un total y le cobran
  --     otro.
  ------------------------------------------------------------------
  if public.costo_envio_cosmetic(148.99, 'shalom')         <> 12
  or public.costo_envio_cosmetic(149, 'shalom')            <> 0
  or public.costo_envio_cosmetic(148.99, 'lima_domicilio') <> 18
  or public.costo_envio_cosmetic(149, 'lima_domicilio')    <> 0
  or public.costo_envio_cosmetic(0, null)                  <> 18
  or public.costo_envio_cosmetic(null, 'shalom')           <> 12
  or public.costo_envio_cosmetic(80, 'cualquier-cosa')     <> 18 then
    raise exception
      'costo_envio_cosmetic dejó de valer 149/12/18 — desalineado con src/lib/checkout-store.ts';
  end if;

  -- El caso que motiva el recálculo del wrapper de referidos:
  -- S/155 tiene envío gratis, pero con 10% de descuento no.
  if public.costo_envio_cosmetic(155, 'shalom') <> 0
  or public.costo_envio_cosmetic(155 - 15.50, 'shalom') <> 12 then
    raise exception 'El umbral no se está midiendo sobre el subtotal post-descuento';
  end if;
  raise notice '(a) tarifas OK · gratis desde 149 · shalom 12 · domicilio 18 · default 18';

  ------------------------------------------------------------------
  -- (b) Elegir SKUs reales del catálogo (nada hardcodeado: los precios
  --     cambian y una prueba con SKU fijo envejece mal).
  ------------------------------------------------------------------
  select c.producto_id, c.precio into v_sku, v_precio
    from public.catalogo c
    join public.variantes_producto vp on vp.sku = c.producto_id
   where c.activo and c.precio > 0
   order by c.precio asc, c.producto_id
   limit 1;

  if v_sku is null then
    raise exception 'No hay SKU de cosmetic activo en catalogo — imposible verificar';
  end if;
  if v_precio >= 149 then
    raise exception 'El SKU cosmetic más barato cuesta S/% — no se puede armar un caso bajo el umbral', v_precio;
  end if;

  v_n := ceil(149.0 / v_precio)::integer;
  if v_n > 99 then
    raise exception 'Harían falta % unidades para llegar a S/149 (máximo 99)', v_n;
  end if;

  select c.producto_id into v_sku_otro
    from public.catalogo c
   where c.activo and c.precio > 0
     and not exists (select 1 from public.variantes_producto vp where vp.sku = c.producto_id)
   order by c.precio asc, c.producto_id
   limit 1;

  v_base := jsonb_build_object(
    'nombre',           'SIM Envio 035',
    'telefono',         '999999999',
    'session_id',       'sim-035',
    'canal',            'web',
    'metodo_entrega',   'envio',
    'metodo_pago',      'yape',
    'tipo_comprobante', 'boleta',
    'documento',        '00000000',
    'direccion',        'SIM — migración 035'
  );

  ------------------------------------------------------------------
  -- (c) EL ATAQUE: el navegador manda costo_envio 0 con un pedido que
  --     no llega al envío gratis. Antes se cobraba 0.
  ------------------------------------------------------------------
  v_res := public.crear_pedido(
    v_base
    || jsonb_build_object(
         'email',      'sim-shalom@veliroz-sim.invalid',
         'envio_meta', jsonb_build_object('linea','cosmetic','transporte','shalom'),
         'costo_envio', 0,
         'items', jsonb_build_array(jsonb_build_object('producto_id', v_sku, 'cantidad', 1))
       )
  );
  select subtotal, descuento, costo_envio, total into v_fila
    from public.pedidos where id = (v_res->>'pedido_id')::uuid;

  if v_fila.costo_envio <> 12
  or (v_res->>'costo_envio')::numeric <> 12
  or v_fila.total <> v_fila.subtotal - v_fila.descuento + 12 then
    raise exception 'Shalom bajo el umbral: se esperaba envío 12, quedó % (total %)',
      v_fila.costo_envio, v_fila.total;
  end if;
  raise notice '(c) shalom · subtotal % · el cliente mandó 0 y se cobró 12 · total %',
    v_fila.subtotal, v_fila.total;

  ------------------------------------------------------------------
  -- (d) Mismo ataque con domicilio Lima → 18.
  ------------------------------------------------------------------
  v_res := public.crear_pedido(
    v_base
    || jsonb_build_object(
         'email',      'sim-lima@veliroz-sim.invalid',
         'envio_meta', jsonb_build_object('linea','cosmetic','transporte','lima_domicilio'),
         'costo_envio', 0,
         'items', jsonb_build_array(jsonb_build_object('producto_id', v_sku, 'cantidad', 1))
       )
  );
  select subtotal, descuento, costo_envio, total into v_fila
    from public.pedidos where id = (v_res->>'pedido_id')::uuid;

  if v_fila.costo_envio <> 18 or v_fila.total <> v_fila.subtotal - v_fila.descuento + 18 then
    raise exception 'Domicilio Lima: se esperaba envío 18, quedó %', v_fila.costo_envio;
  end if;
  raise notice '(d) domicilio Lima · se cobró 18 · total %', v_fila.total;

  ------------------------------------------------------------------
  -- (e) Sin `transporte` (un canal que todavía no lo manda) → 18, la
  --     tarifa cara. El default es cobrar.
  ------------------------------------------------------------------
  v_res := public.crear_pedido(
    v_base
    || jsonb_build_object(
         'email',      'sim-sinmetodo@veliroz-sim.invalid',
         'envio_meta', jsonb_build_object('linea','cosmetic'),
         'costo_envio', 0,
         'items', jsonb_build_array(jsonb_build_object('producto_id', v_sku, 'cantidad', 1))
       )
  );
  select costo_envio into v_fila from public.pedidos where id = (v_res->>'pedido_id')::uuid;
  if v_fila.costo_envio <> 18 then
    raise exception 'Sin método de entrega: se esperaba 18 (lo conservador), quedó %', v_fila.costo_envio;
  end if;
  raise notice '(e) sin transporte · se cobró 18';

  ------------------------------------------------------------------
  -- (f) Envío gratis de verdad: sobre el umbral NO se cobra, aunque el
  --     cliente haya mandado 12. El servidor manda para los dos lados.
  ------------------------------------------------------------------
  v_res := public.crear_pedido(
    v_base
    || jsonb_build_object(
         'email',      'sim-gratis@veliroz-sim.invalid',
         'envio_meta', jsonb_build_object('linea','cosmetic','transporte','shalom'),
         'costo_envio', 12,
         'items', jsonb_build_array(jsonb_build_object('producto_id', v_sku, 'cantidad', v_n))
       )
  );
  select subtotal, descuento, costo_envio, total into v_fila
    from public.pedidos where id = (v_res->>'pedido_id')::uuid;

  if v_fila.subtotal < 149 then
    raise exception 'El caso de envío gratis quedó en S/% — no llega al umbral', v_fila.subtotal;
  end if;
  if v_fila.costo_envio <> 0 or v_fila.total <> v_fila.subtotal then
    raise exception 'Sobre el umbral se esperaba envío 0, quedó % (total %)',
      v_fila.costo_envio, v_fila.total;
  end if;
  raise notice '(f) subtotal % ≥ 149 · el cliente mandó 12 y se cobró 0', v_fila.subtotal;

  ------------------------------------------------------------------
  -- (g) LAS OTRAS TRES LÍNEAS NO SE TOCAN: un pedido sin ítems de
  --     cosmetic conserva el costo_envio que mandó su checkout.
  ------------------------------------------------------------------
  if v_sku_otro is null then
    raise notice '(g) omitido: no hay SKU no-cosmetic activo en catalogo';
  else
    v_res := public.crear_pedido(
      v_base
      || jsonb_build_object(
           'email',      'sim-flores@veliroz-sim.invalid',
           'envio_meta', jsonb_build_object('departamento','Lima'),
           'costo_envio', 10,
           'items', jsonb_build_array(jsonb_build_object('producto_id', v_sku_otro, 'cantidad', 1))
         )
    );
    select costo_envio, linea_negocio into v_fila
      from public.pedidos where id = (v_res->>'pedido_id')::uuid;
    if v_fila.costo_envio <> 10 then
      raise exception 'Una línea no-cosmetic (%) cambió de envío: 10 → %',
        v_sku_otro, v_fila.costo_envio;
    end if;
    raise notice '(g) % · línea % · conserva su envío 10', v_sku_otro, v_fila.linea_negocio;
  end if;

  ------------------------------------------------------------------
  -- (h) El wrapper de referidos: el descuento baja el subtotal por
  --     debajo del umbral y el envío tiene que volver a cobrarse.
  ------------------------------------------------------------------
  -- Un booleano aparte y no `v_cfg is null`: un record de plpgsql que
  -- nunca recibió fila no se puede ni mirar ("record is not assigned
  -- yet"), y esta migración también tiene que poder correr en una base
  -- donde la 018 todavía no pasó.
  if to_regclass('public.referidos_config') is not null then
    select * into v_cfg from public.referidos_config where id = true;
    if found then
      v_ref_ok := coalesce(v_cfg.activo, false);
    end if;
  end if;

  -- El caso se busca contra los parámetros VIVOS del programa (la 018
  -- los dejó en tabla justamente para poder cambiarlos sin deploy): con
  -- otro porcentaje o tope, el SKU que cruza el umbral es otro.
  if v_ref_ok then
    select c.producto_id, n into v_sku_flip, v_n_flip
      from public.catalogo c
      join public.variantes_producto vp on vp.sku = c.producto_id
      cross join generate_series(1, 99) as n
     where c.activo and c.precio > 0
       and (c.precio * n) >= 149
       and (c.precio * n) - least(round(c.precio * n * v_cfg.descuento_pct / 100.0, 2), v_cfg.descuento_tope) < 149
     order by n asc, c.precio asc
     limit 1;
  end if;

  if not v_ref_ok then
    raise notice '(h) omitido: el programa de referidos no está disponible';
  elsif v_sku_flip is null then
    raise notice '(h) omitido: ningún SKU permite armar el caso frontera del umbral';
  else
    -- Referente SIM. 'VELI-SIM0' no puede chocar con un código real:
    -- gen_codigo_referido() usa un alfabeto sin 0/O/1/I/L.
    insert into public.clientes (email, nombre)
    values ('sim-referente@veliroz-sim.invalid', 'SIM Referente')
    on conflict (email) do update set nombre = excluded.nombre
    returning id into v_cli_ref;

    insert into public.referidos (codigo, cliente_id)
    values ('VELI-SIM0', v_cli_ref)
    on conflict (cliente_id) do update set codigo = excluded.codigo;

    v_res := public.crear_pedido_con_referido(
      v_base
      || jsonb_build_object(
           'email',      'sim-referido@veliroz-sim.invalid',
           'envio_meta', jsonb_build_object('linea','cosmetic','transporte','shalom'),
           'costo_envio', 0,
           'items', jsonb_build_array(jsonb_build_object('producto_id', v_sku_flip, 'cantidad', v_n_flip))
         ),
      'VELI-SIM0'
    );

    select subtotal, descuento, costo_envio, total into v_fila
      from public.pedidos where id = (v_res->>'pedido_id')::uuid;

    if (v_res->>'referido_aplicado')::boolean is not true then
      raise exception 'El referido SIM no se aplicó: %', coalesce(v_res->>'referido_motivo','sin motivo');
    end if;

    v_sub      := v_fila.subtotal;
    v_desc_esp := least(round(v_sub * v_cfg.descuento_pct / 100.0, 2), v_cfg.descuento_tope);
    v_env_esp  := public.costo_envio_cosmetic(v_sub - v_desc_esp, 'shalom');

    if v_fila.descuento <> v_desc_esp then
      raise exception 'Descuento de referido: esperado %, quedó %', v_desc_esp, v_fila.descuento;
    end if;
    if v_fila.costo_envio <> v_env_esp
    or (v_res->>'costo_envio')::numeric <> v_env_esp
    or v_fila.total <> v_sub - v_desc_esp + v_env_esp then
      raise exception 'Referido: envío esperado % (subtotal % − desc %), quedó % y total %',
        v_env_esp, v_sub, v_desc_esp, v_fila.costo_envio, v_fila.total;
    end if;
    if public.costo_envio_cosmetic(v_sub, 'shalom') = v_env_esp then
      raise exception 'El caso (h) no ejercita el cruce del umbral — la prueba no vale';
    end if;
    raise notice '(h) referido · subtotal % tenía envío gratis; con % de descuento se cobra % · total %',
      v_sub, v_desc_esp, v_fila.costo_envio, v_fila.total;
  end if;

  ------------------------------------------------------------------
  -- (i) Limpieza. Todo lo que se creó acá termina en .invalid.
  ------------------------------------------------------------------
  delete from public.referidos_usos ru
   where ru.email_referido like '%veliroz-sim.invalid'
      or exists (select 1 from public.pedidos p
                  where p.id = ru.pedido_id and p.cliente_email like '%veliroz-sim.invalid');

  if to_regclass('public.email_queue') is not null then
    execute $q$
      delete from public.email_queue eq
       where eq.cliente_email like '%veliroz-sim.invalid'
          or exists (select 1 from public.pedidos p
                      where p.id = eq.pedido_id and p.cliente_email like '%veliroz-sim.invalid')
    $q$;
  end if;

  delete from public.lineas_pedido lp
   where exists (select 1 from public.pedidos p
                  where p.id = lp.pedido_id and p.cliente_email like '%veliroz-sim.invalid');

  delete from public.pedidos where cliente_email like '%veliroz-sim.invalid';

  -- Se lleva por cascade el código de referido del referente SIM.
  delete from public.clientes where email like '%veliroz-sim.invalid';

  select count(*) into v_quedan
    from public.pedidos where cliente_email like '%veliroz-sim.invalid';
  if v_quedan <> 0 then
    raise exception 'Quedaron % pedidos SIM sin borrar', v_quedan;
  end if;

  select count(*) into v_quedan
    from public.clientes where email like '%veliroz-sim.invalid';
  if v_quedan <> 0 then
    raise exception 'Quedaron % clientas SIM sin borrar', v_quedan;
  end if;

  select count(*) into v_quedan from public.referidos where codigo = 'VELI-SIM0';
  if v_quedan <> 0 then
    raise exception 'Quedó el código de referido SIM sin borrar';
  end if;

  raise notice '(i) datos SIM borrados · base limpia';
  raise notice '─────────────────────────────────────────────';
  raise notice '035 verificada: el envío de cosmetic lo calcula el servidor';
end $$;

commit;

-- ============================================================
-- DESPUÉS DE APLICAR (queries sueltas, fuera de la transacción):
--
--   -- (1) Las tarifas vivas
--   select public.costo_envio_cosmetic(100,'shalom')          as debe_ser_12,
--          public.costo_envio_cosmetic(100,'lima_domicilio')  as debe_ser_18,
--          public.costo_envio_cosmetic(149,'shalom')          as debe_ser_0,
--          public.costo_envio_cosmetic(100,null)              as debe_ser_18;
--
--   -- (2) La definición nueva está viva
--   select position('costo_envio_cosmetic' in
--                   pg_get_functiondef('crear_pedido(jsonb)'::regprocedure)) > 0 as tiene_envio_server;
--
--   -- (3) No quedó nada de la simulación
--   select count(*) from pedidos  where cliente_email like '%.invalid';
--   select count(*) from clientes where email         like '%.invalid';
--
--   -- (4) Tampering: pedidos donde el navegador dijo un envío y se
--   --     cobró otro. envio_meta.costo_envio_cliente lo escribe la
--   --     server action (src/lib/actions/pedidos.ts).
--   select pedido_codigo, fecha_pedido, subtotal, descuento, costo_envio,
--          (envio_meta->>'costo_envio_cliente')::numeric as dijo_el_navegador
--     from pedidos
--    where envio_meta ? 'costo_envio_cliente'
--      and (envio_meta->>'costo_envio_cliente')::numeric is distinct from costo_envio
--    order by fecha_pedido desc;
--
--   -- (5) Para volver atrás (sólo si algo salió mal):
--   select definicion from respaldo_definiciones_funcion
--    where funcion = 'crear_pedido(jsonb)' order by created_at desc limit 1;
-- ============================================================
