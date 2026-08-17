-- ============================================================
-- 020 — crear_pedido_con_referido: wrapper que aplica el descuento
-- Aplicada: 2026-08-17 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- POR QUÉ UN WRAPPER Y NO EDITAR crear_pedido: ese RPC lo usan las
-- cuatro líneas y es el camino crítico de cobro de todo el negocio.
-- Meterle una rama de referidos es riesgo innecesario. Acá se envuelve:
-- valida, delega, ajusta. Todo en una función plpgsql, así que es
-- atómico.
--
-- EL DESCUENTO SE CALCULA EN EL SERVER. El cliente manda el código,
-- nunca el monto: si mandara el monto, cualquiera abre DevTools y se
-- regala S/200. validar_codigo_referido recalcula sobre el subtotal que
-- devolvió crear_pedido, no sobre lo que dijo el navegador.
--
-- NO ACUMULA con cupón: si el pedido ya salió con descuento, el
-- referido se ignora y NO se registra el uso — el código queda
-- disponible para otra compra en vez de quemarse sin dar beneficio.
--
-- VERIFICADO con simulación (021c, limpiada en la 022), comparando el
-- JSON devuelto contra lo GUARDADO en la tabla:
--   · S/225 con código      → descuento 22.50, total 214.50  ✓
--   · S/777 con código      → descuento 30.00 (tope), total 759.00  ✓
--   · código propio         → sin descuento, motivo codigo_propio  ✓
--   · código inexistente    → pedido creado igual, sin descuento  ✓
-- ============================================================

create or replace function crear_pedido_con_referido(
  payload          jsonb,
  referido_codigo  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res        jsonb;
  v_pedido_id  uuid;
  v_subtotal   numeric(10,2);
  v_descuento  numeric(10,2);
  v_envio      numeric(10,2);
  v_email      text;
  v_val        jsonb;
  v_desc_ref   numeric(10,2);
  v_nuevo_desc numeric(10,2);
  v_nuevo_tot  numeric(10,2);
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
  v_nuevo_tot  := greatest(0, (v_subtotal - v_nuevo_desc) + v_envio);

  update pedidos
  set descuento = v_nuevo_desc,
      total     = v_nuevo_tot,
      cupon     = coalesce(cupon, upper(trim(referido_codigo)))
  where id = v_pedido_id;

  -- 4. Registrar el uso (queda 'pendiente' hasta que el pedido se pague).
  perform registrar_uso_referido(
    referido_codigo, v_pedido_id, v_email, v_desc_ref
  );

  return v_res
    || jsonb_build_object(
         'descuento',         v_nuevo_desc,
         'total',             v_nuevo_tot,
         'referido_aplicado', true,
         'referido_codigo',   v_val->>'codigo',
         'referido_descuento', v_desc_ref
       );
end;
$$;

grant execute on function crear_pedido_con_referido(jsonb, text) to anon, authenticated;
