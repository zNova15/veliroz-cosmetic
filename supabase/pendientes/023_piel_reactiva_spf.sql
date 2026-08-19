-- ============================================================
-- 023 — Protector solar en el bundle de piel reactiva  [PENDIENTE]
--
-- Ver supabase/pendientes/README.md por el razonamiento completo.
-- Resumen: piel-reactiva era la única rutina de cuidado diario sin SPF,
-- justo la de barrera comprometida —la más fotosensible—, y la home
-- promete "limpieza, activo y protección" para todas.
--
-- Suma S1004-SUNSERUM-50ML como 4º paso (sólo AM) y reprecia el bundle:
--   lista  243 → 322   (79 + 75 + 89 + 79)
--   bundle 219 → 289   (mantiene el ~10% de descuento de las otras)
--
-- APLICAR JUNTO CON 023_piel_reactiva_spf.patch. Por separado, la página
-- muestra un precio y el carrito cobra otro.
-- ============================================================

begin;

-- 1. Reprecio de la variante del bundle. El trigger tg_variante_sync_catalogo
--    propaga a `catalogo`, que es de donde el RPC crear_pedido toma el precio.
update variantes_producto v
set precio       = 289,
    precio_antes = 322
where v.sku = 'RUTINA-PIEL-REACTIVA';

-- 2. Sumar el protector a la composición del bundle.
--    ON CONFLICT por si se reaplica: la tabla tiene único (bundle_variante_id,
--    componente_variante_id) — verificar el nombre real del constraint antes
--    de correr, que en este proyecto ya hubo un 42P10 por un índice parcial.
insert into bundle_composicion (bundle_variante_id, componente_variante_id, cantidad)
select
  (select id from variantes_producto where sku = 'RUTINA-PIEL-REACTIVA'),
  (select id from variantes_producto where sku = 'S1004-SUNSERUM-50ML'),
  1
where not exists (
  select 1 from bundle_composicion bc
  where bc.bundle_variante_id  = (select id from variantes_producto where sku = 'RUTINA-PIEL-REACTIVA')
    and bc.componente_variante_id = (select id from variantes_producto where sku = 'S1004-SUNSERUM-50ML')
);

-- 3. Reflejarlo en el texto del producto bundle.
update productos p
set descripcion_corta = 'Limpiador suave, esencia de mucina, crema de ceramidas y protector de centella. Para calmar la piel reactiva sin dejarla sin protección.'
where p.slug = 'rutina-piel-reactiva';

commit;

-- ---------- Verificación (correr después) ----------
-- Debe devolver 4 componentes y precio 289:
--
-- select p.nombre, v.sku, v.precio, v.precio_antes,
--        (select count(*) from bundle_composicion bc
--          where bc.bundle_variante_id = v.id) as componentes
-- from variantes_producto v
-- join productos p on p.id = v.producto_id
-- where v.sku = 'RUTINA-PIEL-REACTIVA';
--
-- Y que el catálogo (fuente del RPC de cobro) quedó sincronizado:
-- select producto_id, precio from catalogo where producto_id = 'RUTINA-PIEL-REACTIVA';
