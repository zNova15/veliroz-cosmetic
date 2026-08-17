-- ============================================================
-- 017 — Bundles comprables que espejan src/lib/rutinas.ts
-- Aplicada: 2026-08-17 · project usfpzlxmmgruydqbymsx
-- ============================================================
--
-- CONTEXTO: la 016 creó bundles inventando composiciones y precios,
-- ignorando que el front ya tenía 5 rutinas curadas en
-- src/lib/rutinas.ts. Esta migración deshace eso y crea un bundle
-- comprable por rutina, con el MISMO precio, los MISMOS SKUs y los
-- MISMOS textos que el front ya anunciaba.
--
-- POR QUÉ IMPORTA: antes, "Llevar la rutina completa" agregaba los N
-- productos sueltos y el carrito sumaba precioLista (S/247), aunque
-- la página prometía precioBundle (S/225). El descuento se ajustaba a
-- mano al confirmar por WhatsApp. Con un bundle comprable el carrito
-- lleva UN ítem al precio anunciado y el checkout cobra eso.
--
-- FUENTE DE VERDAD: rutinas.ts manda. Sus precioLista coinciden
-- exacto con la suma de PVP reales (247/253/289/243/124) y los
-- descuentos son 9-12%. El contenido editorial rico (pasos, notas,
-- momento AM/PM, dificultad) sigue viviendo sólo en rutinas.ts; la BD
-- guarda lo mínimo para vender + meta.rutina_slug para linkear.
--
-- SI CAMBIA UN PRECIO: hay que tocar los tres lugares — el PVP de la
-- variante del componente, precioLista/precioBundle/ahorro en
-- rutinas.ts, y precio/precio_antes de la variante del bundle acá.
-- La query de verificación al final detecta el desalineo.
-- ============================================================

-- ---------- 1. Deshacer los 3 bundles de la 016 ----------
-- El trigger tg_variante_sync_catalogo no maneja DELETE: catalogo a mano.
delete from bundle_composicion
where bundle_id in (
  select id from productos
  where slug in ('rutina-primeros-pasos','rutina-manchas-y-marcas','rutina-antiedad')
);

delete from catalogo
where producto_id in ('RUTINA-INICIO','RUTINA-MANCHAS','RUTINA-ANTIEDAD');

delete from variantes_producto
where sku in ('RUTINA-INICIO','RUTINA-MANCHAS','RUTINA-ANTIEDAD');

delete from productos
where slug in ('rutina-primeros-pasos','rutina-manchas-y-marcas','rutina-antiedad');

-- ---------- 2. Un bundle por rutina ----------
insert into productos (
  slug, nombre, descripcion_corta, descripcion_larga, advertencias,
  marca_id, categoria, subcategoria, tipo,
  tipo_piel, preocupacion, activo, destacado, linea_negocio, meta
)
select
  'rutina-' || d.rutina_slug,
  'Rutina ' || d.nombre,
  d.tag,
  d.descripcion,
  d.advertencia,
  (select id from marcas where lower(nombre) = 'veliroz' limit 1),
  'rutina', d.rutina_slug, 'bundle',
  d.piel, d.preoc, true, true, 'cosmetic',
  jsonb_build_object(
    'preventa',    true,
    'es_rutina',   true,
    'rutina_slug', d.rutina_slug,   -- ← link a /rutinas/<slug>
    'dificultad',  d.dificultad,
    'n_pasos',     d.n_pasos
  )
from (values
  (
    'primera-vez', 'Primera vez', 'Para arrancar bien',
    'Para quien nunca hizo skincare y no quiere gastar de más probando. Tres pasos y nada más: limpieza que no reseca, crema que repone la barrera y SPF diario. Es la base sobre la que después se agrega cualquier activo.',
    null::text,
    array['normal','sensible','seca','mixta','grasa'],
    array['limpieza','hidratacion','barrera-cutanea','proteccion-solar'],
    'inicial', 3
  ),
  (
    'manchas-tono-desparejo', 'Manchas y tono desparejo', 'Marcas post-acné',
    'Para piel con marcas oscuras que quedaron después de los granitos, o con el tono desparejo por sol acumulado. Niacinamida al 10% + ácido tranexámico al 4% es la dupla que sí mueve la aguja en 8-12 semanas, y el SPF evita que vuelvan a aparecer.',
    'No usar niacinamida en la misma capa que vitamina C pura (L-AA): separá AM y PM.',
    array['mixta','grasa','normal'],
    array['manchas','marcas-post-acne','luminosidad','proteccion-solar'],
    'intermedia', 3
  ),
  (
    'antiedad-honesta', 'Antiedad honesta', 'Primeras líneas',
    'Para los 30+ que empiezan a ver líneas finas y pérdida de firmeza y quieren resultados sin promesas de cirugía. Retinal (10 veces más potente que el retinol) de noche, PDRN + hialurónico para reparar y rellenar, y un SPF hidratante que sostiene todo lo demás.',
    'Retinal: nunca en embarazo o lactancia. Si arde o descama, bajar a una vez por semana antes de abandonar.',
    array['normal','mixta','seca'],
    array['antiedad','arrugas','firmeza','proteccion-solar'],
    'avanzada', 3
  ),
  (
    'piel-reactiva', 'Piel reactiva', 'Rojeces y barrera dañada',
    'Para cuando exageraste con activos y la piel arde, se pone roja o descama. Reset de 3-4 semanas sin ácidos ni retinoides: limpieza mínima, mucina de caracol para reparar y una crema de ceramidas que sella. Es la rutina de rescate, no la de todos los meses.',
    'Pausar todo activo (retinoides, AHA/BHA, vitamina C) durante 3-4 semanas. En AM sumá tu protector solar habitual: sigue siendo obligatorio.',
    array['sensible','seca','normal'],
    array['rojeces','barrera-cutanea','reparacion','sensibilidad'],
    'inicial', 3
  ),
  (
    'glow-evento', 'Glow para evento', '48 horas antes',
    'Para la semana de la boda, la sesión de fotos o la fiesta. La mascarilla de bio-colágeno se usa la noche anterior y deja la piel jugosa y con el poro cerrado; el gua sha desinflama la mañana del evento. No cambia tu piel, la pone en su mejor día.',
    null::text,
    array['normal','mixta','seca','sensible','grasa'],
    array['luminosidad','firmeza','hidratacion'],
    'inicial', 2
  )
) as d(rutina_slug, nombre, tag, descripcion, advertencia, piel, preoc, dificultad, n_pasos)
on conflict (slug) do nothing;

-- ---------- 3. Variante comprable, precio de rutinas.ts ----------
insert into variantes_producto (producto_id, sku, variante_label, precio, precio_antes, stock, activo)
select p.id, d.sku, 'Rutina completa', d.precio_bundle, d.precio_lista, 0, true
from (values
  ('primera-vez',            'RUTINA-PRIMERA-VEZ',   225.00, 247.00),
  ('manchas-tono-desparejo', 'RUTINA-MANCHAS-TONO',  229.00, 253.00),
  ('antiedad-honesta',       'RUTINA-ANTIEDAD-HON',  259.00, 289.00),
  ('piel-reactiva',          'RUTINA-PIEL-REACTIVA', 219.00, 243.00),
  ('glow-evento',            'RUTINA-GLOW-EVENTO',   109.00, 124.00)
) as d(rutina_slug, sku, precio_bundle, precio_lista)
join productos p on p.slug = 'rutina-' || d.rutina_slug
on conflict (sku) do nothing;

-- ---------- 4. Composición por SKU ----------
insert into bundle_composicion (bundle_id, componente_variante_id, cantidad, orden)
select bv.producto_id, cv.id, 1, d.orden
from (values
  ('RUTINA-PRIMERA-VEZ',   'MIXSOON-FOAM-150ML',   1),
  ('RUTINA-PRIMERA-VEZ',   'ALTHEA-345-50ML',      2),
  ('RUTINA-PRIMERA-VEZ',   'BOJ-SUN-50ML',         3),

  ('RUTINA-MANCHAS-TONO',  'MIXSOON-FOAM-150ML',   1),
  ('RUTINA-MANCHAS-TONO',  'ANUA-NIACIN-TXA-30ML', 2),
  ('RUTINA-MANCHAS-TONO',  'S1004-SUNSERUM-50ML',  3),

  ('RUTINA-ANTIEDAD-HON',  'CELIMAX-RETINAL-15ML', 1),
  ('RUTINA-ANTIEDAD-HON',  'ANUA-PDRN-30ML',       2),
  ('RUTINA-ANTIEDAD-HON',  'RL-BIRCH-SUN-50ML',    3),

  ('RUTINA-PIEL-REACTIVA', 'MIXSOON-FOAM-150ML',   1),
  ('RUTINA-PIEL-REACTIVA', 'COSRX-SNAIL-100ML',    2),
  ('RUTINA-PIEL-REACTIVA', 'ALTHEA-345-50ML',      3),

  ('RUTINA-GLOW-EVENTO',   'BIODANCE-MASK-4PK',    1),
  ('RUTINA-GLOW-EVENTO',   'VLRZ-GUASHA-SET',      2)
) as d(bundle_sku, comp_sku, orden)
join variantes_producto bv on bv.sku = d.bundle_sku
join variantes_producto cv on cv.sku = d.comp_sku
on conflict do nothing;

-- ============================================================
-- VERIFICACIÓN — 'DESALINEADO' si precio_antes ≠ suma de componentes.
-- Correrla después de cambiar cualquier PVP.
--
--   select v.sku, v.precio, v.precio_antes, sum(cv.precio) as suma_real,
--          case when v.precio_antes = sum(cv.precio)
--               then 'ok' else 'DESALINEADO' end as coherencia
--   from productos p
--   join variantes_producto v  on v.producto_id = p.id
--   join bundle_composicion bc on bc.bundle_id = p.id
--   join variantes_producto cv on cv.id = bc.componente_variante_id
--   where p.tipo = 'bundle'
--   group by v.sku, v.precio, v.precio_antes;
--
-- Resultado al aplicar (2026-08-17): los 5 en 'ok'.
-- ============================================================
