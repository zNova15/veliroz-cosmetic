-- ============================================================
-- 030 — Sacar de la base los pedidos de prueba
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- Verificar el checkout después de la migración 021 exigió crear
-- pedidos de verdad: el RPC `crear_pedido` no tiene modo simulación, y
-- ese bug (42702, "item is ambiguous") había dejado la tienda sin
-- cobrar durante 18 días sin que nadie se enterara. La única forma de
-- comprobar el arreglo era comprar.
--
-- Esos pedidos siguen ahí y ensucian todo lo que se mire: ingresos,
-- conversión, cantidad de clientas, el feed de MercadoPago. Peor aún,
-- ahora que existe el trigger de la migración 029, cualquier cambio de
-- estado sobre ellos encolaría correos hacia direcciones que no
-- existen — y los rebotes le bajan reputación al dominio recién
-- verificado en Resend.
--
-- SEGURIDAD DEL FILTRO: sólo toca direcciones que terminan en
-- `.invalid`. Ese dominio de primer nivel está reservado por la RFC
-- 2606 justamente para esto: no puede registrarse ni existir. Ninguna
-- clienta real puede tener una.
--
-- Corre dentro de una transacción y muestra qué encontró ANTES de
-- borrar. Si los números no son los esperados, hacer `rollback`.
-- ============================================================

begin;

-- ---------- 1. Qué hay ----------
do $$
declare
  v_pedidos int;
  v_lineas  int;
  v_refs    int;
  v_cola    int;
  r         record;
begin
  select count(*) into v_pedidos
    from pedidos where cliente_email like '%.invalid';

  select count(*) into v_lineas
    from lineas_pedido lp
   where exists (select 1 from pedidos p
                  where p.id = lp.pedido_id
                    and p.cliente_email like '%.invalid');

  select count(*) into v_refs
    from referidos where email like '%.invalid';

  -- email_queue puede no existir todavía si la 029 no se aplicó.
  if to_regclass('public.email_queue') is not null then
    execute 'select count(*) from email_queue where cliente_email like ''%.invalid'''
       into v_cola;
  else
    v_cola := 0;
  end if;

  raise notice '─────────────────────────────────────────────';
  raise notice 'A borrar:  % pedidos · % líneas · % referidos · % en cola',
    v_pedidos, v_lineas, v_refs, v_cola;
  raise notice '─────────────────────────────────────────────';

  for r in
    select pedido_codigo, cliente_email, estado, total, fecha_pedido
      from pedidos where cliente_email like '%.invalid'
     order by fecha_pedido
  loop
    raise notice '  % · % · % · S/ % · %',
      r.pedido_codigo, r.cliente_email, r.estado, r.total, r.fecha_pedido::date;
  end loop;

  -- Una prueba de checkout no deja veinte pedidos. Si aparecen, algo
  -- distinto está pasando y hay que mirarlo antes de borrar en masa.
  if v_pedidos > 20 then
    raise exception 'Aparecieron % pedidos .invalid — demasiados para un borrado a ciegas', v_pedidos;
  end if;
end $$;

-- ---------- 2. Borrar ----------
-- En orden de dependencia. `lineas_pedido` suele tener ON DELETE
-- CASCADE, pero no se asume: borrarlo explícito funciona igual con o
-- sin cascade, y deja el conteo a la vista.

delete from lineas_pedido lp
 where exists (select 1 from pedidos p
                where p.id = lp.pedido_id
                  and p.cliente_email like '%.invalid');

do $$
begin
  if to_regclass('public.referidos_usos') is not null then
    execute $q$
      delete from referidos_usos ru
       where exists (select 1 from pedidos p
                      where p.id = ru.pedido_id
                        and p.cliente_email like '%.invalid')
          or exists (select 1 from referidos r
                      where r.id = ru.referido_id
                        and r.email like '%.invalid')
    $q$;
  end if;

  if to_regclass('public.email_queue') is not null then
    execute 'delete from email_queue where cliente_email like ''%.invalid''';
  end if;
end $$;

delete from pedidos where cliente_email like '%.invalid';
delete from referidos where email like '%.invalid';

-- ---------- 3. Comprobar ----------
do $$
declare v_quedan int;
begin
  select count(*) into v_quedan
    from pedidos where cliente_email like '%.invalid';
  if v_quedan <> 0 then
    raise exception 'Quedaron % pedidos de prueba sin borrar', v_quedan;
  end if;
  raise notice 'Base limpia. Los pedidos que quedan son todos reales.';
end $$;

-- Revisar los NOTICE de arriba. Si los números cuadran:
commit;
-- Si no:  rollback;
