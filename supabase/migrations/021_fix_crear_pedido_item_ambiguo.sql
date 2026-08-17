-- ============================================================
-- 021 — CRÍTICO: crear_pedido estaba ROTO, nadie podía comprar
-- Aplicada: 2026-08-17 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- SÍNTOMA: toda llamada a crear_pedido() abortaba con
--     ERROR 42702: column reference "item" is ambiguous
-- en el INSERT a lineas_pedido. El checkout estaba caído en las
-- CUATRO líneas (flores, bienestar, chocotejas, cosmetic): todas
-- cobran por este mismo RPC.
--
-- CAUSA: la función declara `item jsonb` como variable local (la usa un
-- `for item in ...` que valida precios) y el INSERT final hace
-- `from jsonb_array_elements(v_items) as item`. Con variable_conflict
-- en su default (error), `item->>'producto_id'` no se puede resolver:
-- puede ser la variable o el alias.
--
-- CÓMO SE ENCONTRÓ: probando el wrapper de la 020. NO lo introdujo esa
-- migración — se reprodujo llamando crear_pedido() sola. La 003 se
-- llamaba `fix_rpc_ambiguity` y arreglaba un caso igual, así que lo más
-- probable es que una reescritura posterior (la 006, que sumó
-- chocotejas + stock) lo reintrodujo. Pasó inadvertido porque no entró
-- ningún pedido nuevo desde entonces — el último es del 30-jul-2026.
--
-- LECCIÓN: un E2E que sólo mira la UI no habría detectado esto si nadie
-- completa una compra. Vale correr `crear_pedido` con datos SIM después
-- de cada migración que lo reescriba.
--
-- FIX: renombrar el ALIAS a `li`; la variable `item` queda intacta.
-- Se hace por reemplazo sobre la definición viva para no reescribir 9KB
-- de lógica de cobro a mano. Las guardas abortan si el texto no es el
-- esperado, así nunca deja la función a medias.
--
-- VERIFICADO tras aplicar: crear_pedido con 2×BOJ-SUN-50ML devolvió
-- subtotal 158.00 / envío 12.00 / total 170.00 y creó su línea.
-- ============================================================
do $$
declare
  v_def     text;
  v_bloque  text;
  v_nuevo   text;
  v_def_new text;
  v_ini     integer;
  v_fin     integer;
begin
  v_def := pg_get_functiondef('crear_pedido(jsonb)'::regprocedure);

  v_ini := position('insert into public.lineas_pedido' in v_def);
  if v_ini = 0 then
    raise exception 'No se encontró el INSERT a lineas_pedido — abortando sin tocar nada';
  end if;

  v_fin := position('jsonb_array_elements(v_items) as item' in v_def);
  if v_fin = 0 then
    raise exception 'No se encontró el alias "as item" — puede que ya esté arreglado';
  end if;
  if v_fin < v_ini then
    raise exception 'El alias aparece antes del INSERT — estructura inesperada, abortando';
  end if;

  v_fin    := v_fin + length('jsonb_array_elements(v_items) as item');
  v_bloque := substring(v_def from v_ini for (v_fin - v_ini));
  v_nuevo  := regexp_replace(v_bloque, '\mitem\M', 'li', 'g');

  if v_nuevo = v_bloque then
    raise exception 'El reemplazo no cambió nada — abortando';
  end if;
  if v_nuevo ~ '\mitem\M' then
    raise exception 'Quedaron referencias a item en el bloque: %', v_nuevo;
  end if;

  v_def_new := overlay(v_def placing v_nuevo from v_ini for (v_fin - v_ini));

  -- La variable `item` del loop DEBE sobrevivir fuera del bloque
  if v_def_new !~ '\mitem\M' then
    raise exception 'Se borró la variable item del resto de la función — abortando';
  end if;

  execute v_def_new;
  raise notice 'crear_pedido reescrita: alias item → li';
end $$;
