-- ============================================================
-- 036 — Los dos bundles que faltaban: piel grasa e hidratación
-- Proyecto: usfpzlxmmgruydqbymsx  (VERIFICAR antes de ejecutar)
-- ============================================================
--
-- EL HUECO: el quiz tiene 6 rutas de resultado. Cuatro terminaban en un
-- bundle comprable (migración 017) y dos —`acne-graso` e `hidratacion`—
-- en `bundleSlug: null`, o sea en una grilla de productos sueltos. Son
-- las rutas de los perfiles MÁS comunes y, además, las dos salidas del
-- gate de embarazo/lactancia del quiz. Para ese tráfico —el del link de
-- la bio— el embudo pasaba de un clic a un carrito armado a mano, y al
-- precio de lista en vez del precio de rutina.
--
-- Esta migración siembra los dos productos tipo `bundle` con su variante
-- comprable y su composición, espejando exactamente
-- `src/lib/rutinas.ts` (mismos SKUs, mismos precios, mismos textos).
-- El front ya viene con las dos rutinas y con el `bundleSlug` conectado.
--
-- ------------------------------------------------------------
-- ANTES DE APLICAR — una cosa que NO es SQL
-- ------------------------------------------------------------
-- Faltan componer y subir a `productos/rutinas/` los dos JPG:
--     piel-grasa-granitos.jpg
--     hidratacion-profunda.jpg
-- Misma receta que la 024 (packshots reales sobre el color de acento de
-- la card, compuestos con `multiply` porque los PNG del CDN vienen con
-- fondo blanco opaco) y mismo procedimiento de policy temporal +
-- revocación. Las URLs ya están escritas acá y en `src/lib/rutinas.ts`.
-- Si se aplica esto sin subirlas, las cards de /rutinas, de la home y de
-- /productos muestran el alt en lugar de la foto. No rompe nada, pero se
-- ve mal justo en los dos productos de mayor ticket del catálogo.
--
-- ------------------------------------------------------------
-- QUÉ LLEVA CADA UNA Y POR QUÉ
-- ------------------------------------------------------------
-- Los dos se arman SÓLO con productos que ya están activos en el
-- catálogo. Ninguno de los cuatro The Ordinary entra: tienen
-- `meta.nso_pendiente = true` y no se venden hasta que el proveedor
-- exhiba la Notificación Sanitaria (migración 027). El bloque 1 aborta
-- si alguno de los componentes estuviera en esa situación.
--
-- Piel grasa y granitos — 4 pasos, S/328 → S/295
--   MIXSOON-FOAM-150ML    limpieza suave (resecar la piel grasa la hace
--                         producir más sebo)
--   ANUA-NIACIN-TXA-30ML  el activo: niacinamida 10% regula sebo y poro
--   COSRX-SNAIL-100ML     hidratación sin aceites ni película
--   BOJ-SUN-50ML          SPF ligero
--   · Sin exfoliante químico a propósito: el único del catálogo es el
--     AHA 30% + BHA 2% de The Ordinary, que es NSO pendiente.
--   · Sin retinoides, y no es un detalle estético: el gate de embarazo
--     y lactancia del quiz manda aquí a las embarazadas con piel grasa
--     o acné. Si algún día se le suma un paso, tiene que seguir siéndolo.
--   · La crema de Dr.Althea quedó fuera porque su propio `tipo_piel` en
--     la base no incluye `grasa`; la esencia de COSRX sí.
--
-- Hidratación profunda — 4 pasos, S/372 → S/335
--   MIXSOON-FOAM-150ML    limpieza que no reseca
--   ANUA-PDRN-30ML        el activo: PDRN + hialurónico
--   ALTHEA-345-50ML       ceramidas: el SELLO. Sin esta capa el
--                         hialurónico se evapora y deja la piel peor
--   RL-BIRCH-SUN-50ML     SPF hidratante
--   · También retinoid-free: es la otra salida del gate de embarazo.
--   · Es el bundle más caro del catálogo (S/335) y es a propósito: una
--     rutina de hidratación sin el sello es la que no funciona.
--
-- PRECIO: mismo criterio que los cuatro de la 017 — 10% sobre la suma de
-- las partes, redondeado al número terminado en 5 o en 9 más cercano.
-- Se verificó contra los cinco anteriores antes de usarlo: 247→225,
-- 253→229, 289→259, 322→289, 124→109. Acá: 328→295 y 372→335.
--
-- ------------------------------------------------------------
-- TRAMPAS (las dos ya mordieron antes en este repo)
-- ------------------------------------------------------------
-- 1. `bundle_composicion` es
--      (bundle_id → productos.id, componente_variante_id →
--       variantes_producto.id, cantidad, orden)
--    con PK compuesta. NO existe `bundle_variante_id`. Si se le pasa el
--    id de la variante del bundle, el insert no falla y el bundle queda
--    vacío (documentado por la 023).
-- 2. `productos.tipo` sólo acepta individual|bundle|kit. El tipo de
--    producto cosmético va en `categoria` (la 027 rebotó por esto).
--
-- IDEMPOTENTE: los productos y las variantes van con ON CONFLICT DO
-- NOTHING y la composición con DO UPDATE, así que una segunda pasada no
-- duplica ni pisa un precio corregido a mano. Todo dentro de una
-- transacción, con NOTICE de lo que hace cada bloque; el bloque 5
-- verifica y lanza excepción (= rollback) si el precio del bundle no
-- coincide con la suma de sus partes o si `catalogo` —de donde
-- `crear_pedido` toma el precio al cobrar— no quedó sincronizado.
-- ============================================================

begin;

-- ---------- 1. Los componentes existen, están activos y son vendibles ----------
do $$
declare
  v_problema text;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '1. Componentes: existen, activos y sin NSO pendiente';

  select string_agg(d.sku, ', ' order by d.sku)
    into v_problema
  from (values
    ('MIXSOON-FOAM-150ML'), ('ANUA-NIACIN-TXA-30ML'),
    ('COSRX-SNAIL-100ML'),  ('BOJ-SUN-50ML'),
    ('ANUA-PDRN-30ML'),     ('ALTHEA-345-50ML'),
    ('RL-BIRCH-SUN-50ML')
  ) as d(sku)
  left join public.variantes_producto v on v.sku = d.sku
  left join public.productos p          on p.id  = v.producto_id
  where v.id is null
     or v.activo is not true
     or p.activo is not true
     or coalesce(p.meta->>'nso_pendiente', 'false') = 'true';

  if v_problema is not null then
    raise exception 'Componentes inexistentes, inactivos o con NSO pendiente: %. Un bundle no puede vender lo que el catálogo no puede vender.', v_problema;
  end if;

  raise notice '   ✓ los 7 SKUs componentes están activos y son vendibles';
end $$;

-- ---------- 2. Los dos productos bundle ----------
do $$
declare
  v_base  text := 'https://usfpzlxmmgruydqbymsx.supabase.co/storage/v1/object/public/productos/rutinas/';
  v_marca uuid;
  v_n     int;
  r       record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '2. Productos bundle';

  -- Las rutinas cuelgan de la marca Veliroz: las armamos nosotros.
  select m.id into v_marca
    from public.marcas m
   where lower(m.nombre) = 'veliroz'
   limit 1;

  if v_marca is null then
    raise exception 'No existe la marca Veliroz — las rutinas cuelgan de ella (ver migración 017)';
  end if;

  for r in
    -- Los textos son los MISMOS de src/lib/rutinas.ts. Si cambian allá,
    -- cambian acá: dos redacciones distintas para la misma rutina es
    -- exactamente lo que la 016 dejó y la 017 tuvo que deshacer.
    select * from (values
      (
        'piel-grasa-granitos',
        'Piel grasa y granitos',
        'Limpiador con centella, niacinamida 10% + ácido tranexámico, esencia de mucina y protector ligero. Regula el sebo sin resecar la piel.',
        'Para la piel que brilla a media mañana y no termina de despejarse: granitos que van y vienen, poros marcados en la zona T. La niacinamida al 10% regula el sebo y afina el poro, la esencia de mucina hidrata sin engrasar y el protector es de textura ligera. Nada de resecar la piel para secarle la grasa: así produce más.',
        'Ningún cosmético trata el acné inflamatorio: si hay quistes, dolor o cicatrices, la consulta con dermatología va primero. No sumes exfoliantes ácidos las primeras semanas — la niacinamida sola ya es cambio suficiente.',
        array['grasa','mixta','normal'],
        array['acne','poros','marcas-post-acne','proteccion-solar'],
        'intermedia', 4, 'piel-grasa-granitos.jpg'
      ),
      (
        'hidratacion-profunda',
        'Hidratación profunda',
        'Limpiador suave, PDRN + hialurónico, crema de ceramidas que sella y protector de savia de abedul. Para la piel que tira y se ve apagada.',
        'Para la piel que tira después de lavarse, se ve apagada y se bebe la crema en minutos. El PDRN y el hialurónico atraen el agua, la crema de ceramidas la sella y el protector de savia de abedul sostiene el resultado de día. El paso que casi todas se saltan es el sello: sin crema encima, el hialurónico se evapora y la piel queda peor que antes.',
        'Si además de seca la piel arde, pica o descama en parches, eso ya es barrera dañada: empieza por la rutina de piel reactiva y vuelve a esta cuando se calme.',
        array['seca','normal','mixta','sensible'],
        array['hidratacion','barrera-cutanea','reparacion','proteccion-solar'],
        'inicial', 4, 'hidratacion-profunda.jpg'
      )
    ) as d(rutina_slug, nombre, corta, larga, adv, piel, preoc, dificultad, n_pasos, archivo)
  loop
    insert into public.productos (
      slug, nombre, descripcion_corta, descripcion_larga, advertencias,
      marca_id, categoria, subcategoria, tipo,
      tipo_piel, preocupacion, activo, destacado, linea_negocio,
      imagen_principal, meta
    )
    values (
      'rutina-' || r.rutina_slug,
      'Rutina ' || r.nombre,
      r.corta, r.larga, r.adv,
      v_marca,
      -- `tipo` sólo admite individual|bundle|kit; lo cosmético va en `categoria`.
      'rutina', r.rutina_slug, 'bundle',
      r.piel, r.preoc, true, true, 'cosmetic',
      v_base || r.archivo,
      jsonb_build_object(
        'preventa',    true,
        'es_rutina',   true,
        'rutina_slug', r.rutina_slug,   -- ← link a /rutinas/<slug>
        'dificultad',  r.dificultad,
        'n_pasos',     r.n_pasos
      )
    )
    on conflict (slug) do nothing;

    get diagnostics v_n = row_count;
    if v_n > 0 then
      raise notice '   + rutina-% creada', rpad(r.rutina_slug, 22);
    else
      raise notice '   · rutina-% ya existía — no se toca', rpad(r.rutina_slug, 22);
    end if;
  end loop;
end $$;

-- ---------- 3. La variante comprable ----------
do $$
declare
  v_n int;
  r   record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '3. Variante comprable (precio de rutinas.ts)';

  for r in
    select * from (values
      ('piel-grasa-granitos',  'RUTINA-PIEL-GRASA',  295.00, 328.00),
      ('hidratacion-profunda', 'RUTINA-HIDRATACION', 335.00, 372.00)
    ) as d(rutina_slug, sku, precio_bundle, precio_lista)
  loop
    insert into public.variantes_producto (
      producto_id, sku, variante_label, precio, precio_antes, stock, activo
    )
    select p.id, r.sku, 'Rutina completa', r.precio_bundle, r.precio_lista, 0, true
      from public.productos p
     where p.slug = 'rutina-' || r.rutina_slug
    on conflict (sku) do nothing;

    get diagnostics v_n = row_count;
    if v_n > 0 then
      raise notice '   + % · S/% (antes S/%)', rpad(r.sku, 20), r.precio_bundle, r.precio_lista;
    else
      raise notice '   · % ya existía — no se toca', rpad(r.sku, 20);
    end if;
  end loop;
end $$;

-- ---------- 4. La composición ----------
do $$
declare
  v_n     int;
  v_total int := 0;
  r       record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '4. Composición de los bundles';

  for r in
    select * from (values
      ('piel-grasa-granitos',  'MIXSOON-FOAM-150ML',   1),
      ('piel-grasa-granitos',  'ANUA-NIACIN-TXA-30ML', 2),
      ('piel-grasa-granitos',  'COSRX-SNAIL-100ML',    3),
      ('piel-grasa-granitos',  'BOJ-SUN-50ML',         4),

      ('hidratacion-profunda', 'MIXSOON-FOAM-150ML',   1),
      ('hidratacion-profunda', 'ANUA-PDRN-30ML',       2),
      ('hidratacion-profunda', 'ALTHEA-345-50ML',      3),
      ('hidratacion-profunda', 'RL-BIRCH-SUN-50ML',    4)
    ) as d(rutina_slug, comp_sku, orden)
  loop
    -- OJO: `bundle_id` es productos.id del BUNDLE (p.id), no el id de su
    -- variante. Con el id equivocado el insert pasa y el bundle queda vacío.
    insert into public.bundle_composicion (bundle_id, componente_variante_id, cantidad, orden)
    select p.id, cv.id, 1, r.orden
      from public.productos p
      join public.variantes_producto cv on cv.sku = r.comp_sku
     where p.slug = 'rutina-' || r.rutina_slug
    on conflict (bundle_id, componente_variante_id) do update
      set cantidad = excluded.cantidad,
          orden    = excluded.orden;

    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    raise notice '   % ← % (paso %)', rpad(r.rutina_slug, 22), rpad(r.comp_sku, 22), r.orden;
  end loop;

  raise notice '   → % fila(s) de composición escritas', v_total;
end $$;

-- ---------- 5. Verificación: si algo no cuadra, rollback ----------
do $$
declare
  v_n       int;
  v_suma    numeric;
  v_precio  numeric;
  v_antes   numeric;
  v_cat     numeric;
  r         record;
begin
  raise notice '─────────────────────────────────────────────────────';
  raise notice '5. Verificación';

  for r in
    select * from (values
      ('piel-grasa-granitos',  'RUTINA-PIEL-GRASA',  295.00, 328.00, 4),
      ('hidratacion-profunda', 'RUTINA-HIDRATACION', 335.00, 372.00, 4)
    ) as d(rutina_slug, sku, precio, antes, n_comp)
  loop
    -- 5a. La composición: cuántos componentes y cuánto suman sueltos.
    select count(*), coalesce(sum(cv.precio * bc.cantidad), 0)
      into v_n, v_suma
      from public.productos p
      join public.bundle_composicion bc on bc.bundle_id = p.id
      join public.variantes_producto cv on cv.id = bc.componente_variante_id
     where p.slug = 'rutina-' || r.rutina_slug;

    if v_n <> r.n_comp then
      raise exception 'El bundle % quedó con % componente(s) y esperábamos %. Revisar el bloque 4 (¿bundle_id apuntando a la variante en vez de al producto?)', r.sku, v_n, r.n_comp;
    end if;

    -- 5b. Si un PVP cambió desde que se escribió esto, se ve acá y no en
    -- la página anunciando un ahorro que no existe.
    if v_suma <> r.antes then
      raise exception 'Los componentes de % suman % y esta migración se escribió con %. Cambió un PVP: actualizar precioLista/precioBundle/ahorro en src/lib/rutinas.ts y los precios de esta migración antes de aplicarla.', r.sku, v_suma, r.antes;
    end if;

    -- 5c. El precio tachado tiene que ser la suma real de las partes.
    select v.precio, v.precio_antes
      into v_precio, v_antes
      from public.variantes_producto v
     where v.sku = r.sku;

    if v_antes is distinct from v_suma then
      raise exception 'DESALINEADO en %: precio_antes = % pero sus componentes suman %. La página anunciaría un ahorro que no existe.', r.sku, v_antes, v_suma;
    end if;

    if v_precio is distinct from r.precio then
      raise exception 'El precio de % es % y src/lib/rutinas.ts anuncia %. Alinear las dos capas antes de commitear.', r.sku, v_precio, r.precio;
    end if;

    -- 5d. `catalogo` es de donde `crear_pedido` toma el precio al cobrar.
    -- Lo llena el trigger tg_variante_sync_catalogo; si no llegó, el bundle
    -- se puede agregar al carrito pero el checkout no lo puede cobrar.
    select c.precio into v_cat
      from public.catalogo c
     where c.producto_id = r.sku;

    if v_cat is null then
      raise exception '% no llegó a `catalogo` — el trigger de sync no corrió y el checkout no podría cobrarlo', r.sku;
    end if;

    if v_cat <> r.precio then
      raise exception '`catalogo` tiene S/% para % y la variante dice S/%. El checkout cobraría el precio equivocado.', v_cat, r.sku, r.precio;
    end if;

    raise notice '   ✓ % · % pasos · suelto S/% · rutina S/% · catalogo S/%',
      rpad(r.sku, 20), v_n, v_suma, v_precio, v_cat;
  end loop;

  raise notice '   ✓ los dos bundles quedaron coherentes en las tres capas';
  raise notice '─────────────────────────────────────────────────────';
  raise notice 'RECORDATORIO: faltan los dos JPG en productos/rutinas/';
  raise notice '  · piel-grasa-granitos.jpg';
  raise notice '  · hidratacion-profunda.jpg';
  raise notice '─────────────────────────────────────────────────────';
end $$;

-- Revisar los NOTICE de arriba. Si todo salió en ✓:
commit;
-- Si no:  rollback;
