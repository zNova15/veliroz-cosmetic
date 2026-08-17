-- ============================================================
-- 019 — obtener_mi_codigo_referido: el propio código, por email
-- Aplicada: 2026-08-17 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- Este sitio no tiene auth cableada (/cuenta es un stub, Firebase no
-- está instalado acá) y los clientes son invitados identificados por
-- email. La página /referidos trabaja con eso.
--
-- POR QUÉ EXIGE UN PEDIDO PREVIO: un RPC que cree cliente + código
-- para cualquier email es un generador de basura — llena `clientes` de
-- direcciones inventadas, cada una con código válido para regalar
-- descuentos. Exigiendo al menos un pedido (cualquier estado, así la
-- reserva de pre-venta ya habilita) el código sólo existe para gente
-- que pasó por el checkout. Y comercialmente: quien no compró no tiene
-- mucho que recomendar.
-- ============================================================

create or replace function obtener_mi_codigo_referido(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_codigo     text;
  v_cfg        referidos_config;
  v_usos       integer;
  v_credito    numeric;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'email_requerido');
  end if;

  select * into v_cfg from referidos_config where id = true;
  if v_cfg is null or not v_cfg.activo then
    return jsonb_build_object('ok', false, 'motivo', 'programa_inactivo');
  end if;

  select id into v_cliente_id from clientes where email = p_email::citext;

  -- Sin pedidos no hay código. Se mira por email y no por cliente_id
  -- porque un pedido de invitado puede no tener cliente_id asociado.
  if not exists (
    select 1 from pedidos where cliente_email = p_email::citext
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'sin_pedidos');
  end if;

  -- Hay pedidos pero todavía no existe la fila de cliente: la creamos
  -- a partir de los datos del pedido más reciente.
  if v_cliente_id is null then
    insert into clientes (email, nombre, telefono, es_invitado)
    select p.cliente_email, p.cliente_nombre, p.cliente_telefono, true
    from pedidos p
    where p.cliente_email = p_email::citext
    order by p.created_at desc
    limit 1
    on conflict (email) do nothing;

    select id into v_cliente_id from clientes where email = p_email::citext;
  end if;

  if v_cliente_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'cliente_no_resuelto');
  end if;

  v_codigo := obtener_codigo_referido(v_cliente_id);

  select r.usos_confirmados, r.credito_generado
    into v_usos, v_credito
  from referidos r where r.cliente_id = v_cliente_id;

  return jsonb_build_object(
    'ok',                   true,
    'codigo',               v_codigo,
    'usos_confirmados',     coalesce(v_usos, 0),
    'credito_generado',     coalesce(v_credito, 0),
    'credito_disponible',   (select credito_disponible from clientes where id = v_cliente_id),
    'descuento_pct',        v_cfg.descuento_pct,
    'descuento_tope',       v_cfg.descuento_tope,
    'credito_por_referido', v_cfg.credito_por_referido,
    'min_subtotal',         v_cfg.min_subtotal
  );
end;
$$;

grant execute on function obtener_mi_codigo_referido(text) to anon, authenticated;
