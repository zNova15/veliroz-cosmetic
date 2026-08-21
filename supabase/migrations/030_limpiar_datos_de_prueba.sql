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
-- conversión, cantidad de clientas. Peor aún, ahora que existe el
-- trigger de la migración 029, cualquier cambio de estado sobre ellos
-- encolaría correos hacia direcciones que no existen — y los rebotes le
-- bajan reputación al dominio recién verificado en Resend.
--
-- SEGURIDAD DEL FILTRO: sólo toca direcciones que terminan en
-- `.invalid`. Ese dominio de primer nivel está reservado por la RFC
-- 2606 justamente para esto: no puede registrarse ni existir. Ninguna
-- clienta real puede tener una.
--
-- ORDEN DE BORRADO: `referidos` no guarda email — cuelga de
-- `clientes.id` con ON DELETE CASCADE. Por eso las clientas van al
-- final: borrarlas se lleva sus códigos de referido sola.
--
-- Corre dentro de una transacción y muestra qué encontró ANTES de
-- borrar. Si los números no son los esperados, hacer `rollback`.
-- ============================================================

begin;

-- ---------- 1. Qué hay ----------
do $$
declare
  v_pedidos int; v_lineas int; v_clientes int; v_refs int; v_usos int; v_cola int := 0;
  r record;
begin
  select count(*) into v_pedidos  from pedidos  where cliente_email like '%.invalid';
  select count(*) into v_clientes from clientes where email         like '%.invalid';

  select count(*) into v_lineas from lineas_pedido lp
   where exists (select 1 from pedidos p
                  where p.id = lp.pedido_id and p.cliente_email like '%.invalid');

  select count(*) into v_refs from referidos rf
   where exists (select 1 from clientes c
                  where c.id = rf.cliente_id and c.email like '%.invalid');

  select count(*) into v_usos from referidos_usos ru
   where ru.email_referido like '%.invalid'
      or exists (select 1 from pedidos p
                  where p.id = ru.pedido_id and p.cliente_email like '%.invalid')
      or exists (select 1 from referidos rf join clientes c on c.id = rf.cliente_id
                  where rf.id = ru.referido_id and c.email like '%.invalid');

  if to_regclass('public.email_queue') is not null then
    execute 'select count(*) from email_queue where cliente_email like ''%.invalid''' into v_cola;
  end if;

  raise notice '─────────────────────────────────────────────────────';
  raise notice 'A borrar: % pedidos · % líneas · % clientas', v_pedidos, v_lineas, v_clientes;
  raise notice '          % referidos · % usos · % en cola',  v_refs, v_usos, v_cola;
  raise notice '─────────────────────────────────────────────────────';

  for r in
    select pedido_codigo, cliente_email, estado, total, fecha_pedido
      from pedidos where cliente_email like '%.invalid' order by fecha_pedido
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

delete from referidos_usos ru
 where ru.email_referido like '%.invalid'
    or exists (select 1 from pedidos p
                where p.id = ru.pedido_id and p.cliente_email like '%.invalid')
    or exists (select 1 from referidos rf join clientes c on c.id = rf.cliente_id
                where rf.id = ru.referido_id and c.email like '%.invalid');

-- email_queue puede no existir si la 029 todavía no se aplicó.
do $$
begin
  if to_regclass('public.email_queue') is not null then
    execute 'delete from email_queue where cliente_email like ''%.invalid''';
  end if;
end $$;

delete from lineas_pedido lp
 where exists (select 1 from pedidos p
                where p.id = lp.pedido_id and p.cliente_email like '%.invalid');

delete from pedidos where cliente_email like '%.invalid';

-- Se lleva por cascade los códigos de referido de esas clientas.
delete from clientes where email like '%.invalid';

-- ---------- 3. Comprobar ----------
do $$
declare v_p int; v_c int;
begin
  select count(*) into v_p from pedidos  where cliente_email like '%.invalid';
  select count(*) into v_c from clientes where email         like '%.invalid';
  if v_p <> 0 or v_c <> 0 then
    raise exception 'Quedaron % pedidos y % clientas de prueba sin borrar', v_p, v_c;
  end if;
  raise notice 'Base limpia. Lo que queda es todo real.';
end $$;

-- Revisar los NOTICE de arriba. Si los números cuadran:
commit;
-- Si no:  rollback;
